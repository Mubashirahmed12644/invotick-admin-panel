"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, getErrorMessage } from "@/lib/api";
import { downloadText, fileStamp } from "@/lib/clipboard";
import { DateRangePicker, defaultRange, toRangeIso, type DayRange } from "@/components/DateRangePicker";
import type { AppVersion, JourneyReport } from "@/lib/types";

/**
 * Where first-time users stop on the way to a first invoice.
 *
 * Every figure is grouped on the server. The same answer assembled from the per-user event feed
 * took 218 requests, hit a 500-event cap on four of them, and had to be corrected three times —
 * twice because a background wake-up's events folded into a real session and once because the feed
 * carried no user id. None of those failure modes exist here.
 */
/**
 * Rung ke naam yahan hain, backend par nahi.
 *
 * Backend ka data layer angrezi mein rehta hai — usay panel ki zaban se bandhna ka matlab hai ke
 * kal koi doosra caller wahi alfaz dekhega jo sirf is screen ke liye chune gaye the. Yahan rakhne
 * se export bhi wahi alfaz uthata hai jo screen par likhe hain.
 */
const RUNG: Record<number, string> = {
  1: "Pehli baar app kholi",
  2: "Splash screen paar ki",
  3: "Invoice wali screen kholi",
  4: "Business ka form shuru kiya",
  5: "Business save kar liya",
  6: "Client save kar liya",
  7: "Item add kiya",
  8: "Invoice ban gayi",
};

/**
 * Stop reasons, in the panel's language. Keys come from the server's ordered rules
 * (JourneyStopReasons.kt); an unknown key is shown raw rather than dropped, so a new rule appears
 * on the page before anyone has translated it.
 */
/** Sub-grouping dimensions inside a bucket, and the values that need a word. */
const FACET_LABELS: Record<string, string> = {
  time_on_splash: "Splash par kitni der ruka, phir gaya",
  network: "Network (cold start par)",
  install_source: "Install kahan se aaya",
  install_to_open: "Install se pehli baar kholne tak",
  came_back: "Baad mein wapas aaya",
  country: "Mulk",
  webview: "WebView",
};
const FACET_VALUE_LABELS: Record<string, string> = {
  no_background: "app band hui, background event nahi",
  no_referrer: "referrer nahi aaya",
  organic: "organic (Play, bina campaign)",
  facebook: "Facebook campaign",
  google_play: "Google Play campaign",
  offline: "offline",
  unknown: "pata nahi",
  yes: "haan",
  no: "nahi",
  available: "mojood",
  missing: "ghaib",
};

const REASON_LABELS: Record<string, string> = {
  guest_login_failed: "Guest login fail hua",
  died_after_ad_dismissed: "Ad band hui, phir app chup — aage gaya hi nahi (bug shape)",
  died_during_ad: "Ad chal rahi thi, app band ho gayi",
  died_after_ad_failed: "Ad fail hui, phir app chup — aage gaya hi nahi",
  died_waiting_for_ad: "Ad ka intezaar, app band ho gayi (background nahi)",
  died_on_splash: "Splash par hi app band ho gayi (background nahi)",
  left_after_gate_released: "Ad gate khul chuka tha, phir bhi chala gaya",
  left_during_ad: "Ad ke dauran chala gaya",
  left_waiting_for_ad: "Ad ka intezaar karte hue chala gaya",
  left_after_splash_ready: "Splash ready ke baad chala gaya (ad request nahi)",
  left_after_guest_login: "Guest login ke baad, splash ready se pehle chala gaya",
  left_before_guest_login: "Guest login se pehle hi chala gaya",
  exit_confirmed: "Back → exit dialog → app band ki",
  back_pressed: "Back daba kar dashboard par gaya",
  exit_dialog_shown: "Exit dialog dikha, band nahi ki, phir gaya",
  tapped_around: "Idhar udhar tap kiya, kuch add nahi kiya",
  process_died: "App band ho gayi (background nahi)",
  left_untouched: "Kuch chhuay bina chala gaya",
  save_validation_failed: "Save dabaya, validation fail",
  save_ad_show_failed: "Save → ad dikhni thi, fail hui, invoice nahi",
  save_watch_ad_no_invoice: "Save → Watch ad chuna, invoice phir bhi nahi",
  save_gate_dismissed: "Save → ad/premium dialog band kar diya",
  save_then_nothing: "Save dabaya, uske baad kuch nahi",
  discard_confirmed: "Discard kar diya",
  discard_dialog_closed: "Discard dialog dikha, band kiya, phir gaya",
  saved_as_draft: "Draft mein rakha",
  preview_only: "Sirf preview dekha, save nahi",
  left_without_save: "Save dabaye bina chala gaya",
  no_signals: "Is device ke events nahi mile",
  completed: "Invoice ban gayi",
};

export function FirstInvoiceJourney() {
  const [range, setRange] = useState<DayRange>(defaultRange);
  const [build, setBuild] = useState("release");
  const [versionCode, setVersionCode] = useState<number | null>(null);
  const [touched, setTouched] = useState(false);
  const [versions, setVersions] = useState<AppVersion[]>([]);
  const [report, setReport] = useState<JourneyReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showUsers, setShowUsers] = useState(false);
  /** The rung whose reasons are open — on hover, or pinned by a click. */
  const [openStep, setOpenStep] = useState<number | null>(null);
  const [pinnedStep, setPinnedStep] = useState<number | null>(null);
  /** A chosen reason narrows the table below to the devices behind it. */
  const [reasonFilter, setReasonFilter] = useState<{ step: number; key: string } | null>(null);
  /** The bucket whose breakup is open — the sub-section inside the sub-section. */
  const [openBucket, setOpenBucket] = useState<{ step: number; key: string } | null>(null);

  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const iso = toRangeIso(range);
        const v = await api.getAppVersions(iso.from, iso.to);
        if (!dead) setVersions(v);
      } catch {
        // The report is readable without the picker; an error banner here would be about a control.
      }
    })();
    return () => {
      dead = true;
    };
  }, [range]);

  // Land on the newest build. "All versions" averages a build being rolled out with the one it
  // replaced, and a funnel read off that mixture describes neither.
  useEffect(() => {
    if (touched || versionCode != null) return;
    const newest = versions.find((v) => v.appVersionCode != null)?.appVersionCode;
    if (newest != null) setVersionCode(newest);
  }, [versions, touched, versionCode]);

  useEffect(() => {
    let dead = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const iso = toRangeIso(range);
        const r = await api.getFirstInvoiceJourney(iso.from, iso.to, versionCode ?? undefined, build);
        if (!dead) setReport(r);
      } catch (err) {
        if (!dead) setError(getErrorMessage(err, "Could not load the journey."));
      } finally {
        if (!dead) setLoading(false);
      }
    })();
    return () => {
      dead = true;
    };
  }, [range, build, versionCode]);

  const versionLabel = useMemo(() => {
    if (versionCode == null) return "all versions";
    const v = versions.find((x) => x.appVersionCode === versionCode);
    return v ? `${v.appVersion ?? "—"} (${v.appVersionCode})` : String(versionCode);
  }, [versions, versionCode]);

  const exportTsv = useCallback(() => {
    if (!report) return;
    const head = "deviceId\tuserId\tinvotickId\tmulk\tstep\tkahan_ruka\twajah\tevents\tfirstAt\tlastAt";
    const body = report.users
      .map((u) =>
        [u.deviceId, u.userId ?? "", u.invotickId ?? "", u.country ?? "", u.step, RUNG[u.step] ?? u.stoppedAt, REASON_LABELS[u.stopReason] ?? u.stopReason, u.events, u.firstAt, u.lastAt].join("\t"),
      )
      .join("\n");
    downloadText(`first-invoice-journey-${fileStamp()}.tsv`, `${head}\n${body}`);
  }, [report]);

  const total = report?.firstTimeUsers ?? 0;
  const made = report?.createdInvoice ?? 0;

  return (
    <section className="section-card fij">
      <div className="fij-head">
        <div>
          <h2>Pehli invoice ka safar</h2>
          <p className="muted-line">
            Sirf wo log jinhon ne is arse mein <strong>pehli baar</strong> app kholi — jo pehle se
            aate hain wo is ginti mein hain hi nahi. Har shakhs ka sab se aage wala qadam dikhaya gaya
            hai. Ye adad server par gine gaye hain, is liye na koi namoona hai na kisi ka data kata.
          </p>
        </div>
        {report && (
          <div className="fij-headline">
            <span className="fij-big">
              {made}
              <span className="fij-of">/{total}</span>
            </span>
            <span className="muted">
              naye users mein se itnon ne invoice banai{total > 0 ? ` · ${Math.round((made / total) * 100)}%` : ""}
            </span>
          </div>
        )}
      </div>

      <div className="le-filters">
        <select className="input" value={build} onChange={(e) => setBuild(e.target.value)}>
          <option value="release">Build: release</option>
          <option value="debug">Build: debug</option>
          <option value="all">Build: all</option>
        </select>
        <select
          className="input"
          value={versionCode == null ? "all" : String(versionCode)}
          onChange={(e) => {
            setTouched(true);
            setVersionCode(e.target.value === "all" ? null : Number(e.target.value));
          }}
        >
          <option value="all">All versions</option>
          {/* The chosen build stays in the list even when the range has no rows for it. Without
              this, picking a week from before 1.4.2 shipped made the control fall back to reading
              "All versions" while the query underneath was still filtered to 94 — a label saying
              one thing and the numbers meaning another. */}
          {versionCode != null && !versions.some((v) => v.appVersionCode === versionCode) ? (
            <option value={versionCode}>{versionLabel} — is arse mein koi nahi</option>
          ) : null}
          {versions.map((v) => (
            <option key={v.appVersionCode} value={v.appVersionCode}>
              {v.appVersion ?? "—"} ({v.appVersionCode})
            </option>
          ))}
        </select>
        <DateRangePicker value={range} onChange={setRange} />
        <button className="ga4-clear" onClick={exportTsv} disabled={!report}>
          Rows download karein
        </button>
        <button className="ga4-clear" onClick={() => setShowUsers((v) => !v)} disabled={!report}>
          {showUsers ? "Users chhupayein" : "Users dikhayein"}
        </button>
      </div>

      {error ? (
        <p className="error-text">{error}</p>
      ) : loading && !report ? (
        <p className="muted-line">Load ho raha hai…</p>
      ) : !report || total === 0 ? (
        <p className="muted-line">Is arse mein koi pehli baar aane wala user nahi.</p>
      ) : (
        <>
          <div className="fij-ladder">
            {report.steps.map((s) => (
              <div
                className="fij-rung"
                key={s.step}
                onMouseEnter={() => setOpenStep(s.step)}
                onMouseLeave={() => setOpenStep(null)}
              >
                <div className="fij-rung-label">
                  <span className="fij-name">{RUNG[s.step] ?? s.label}</span>
                  <div className="fij-bar">
                    <span style={{ width: `${s.share}%` }} />
                  </div>
                  {/* The last rung is not a place anyone got stuck: stopping there is finishing. */}
                  {s.step === report.steps.length ? (
                    <span className="fij-lost none">{s.stoppedHere} ne invoice bana li — yahi manzil hai</span>
                  ) : s.stoppedHere > 0 ? (
                    <button
                      type="button"
                      className={`fij-lost fij-lost-btn${pinnedStep === s.step ? " on" : ""}`}
                      onClick={() => setPinnedStep((p) => (p === s.step ? null : s.step))}
                    >
                      {s.stoppedHere} yahin ruk gaye — aage aik qadam bhi nahi · wajah ▾
                    </button>
                  ) : (
                    <span className="fij-lost none">yahan koi nahi ruka</span>
                  )}
                  {/* Every one of the stopped is in exactly one bucket, so the counts add up to the
                      line above — a breakdown that does not is the first thing anyone checks. */}
                  {s.step !== report.steps.length && s.stoppedHere > 0 && (openStep === s.step || pinnedStep === s.step) && (
                    <div className="fij-reasons">
                      {(s.reasons ?? []).map((r) => {
                        const on = reasonFilter?.step === s.step && reasonFilter.key === r.key;
                        const open = openBucket?.step === s.step && openBucket.key === r.key;
                        return (
                          <div key={r.key} className="fij-reason-wrap">
                            <div className={`fij-reason${on ? " on" : ""}`} title={r.key}>
                              <span className="fij-reason-bar" style={{ width: `${(r.count * 100) / s.stoppedHere}%` }} />
                              <button
                                type="button"
                                className="fij-reason-main"
                                onClick={() => {
                                  setReasonFilter(on ? null : { step: s.step, key: r.key });
                                  if (!on) setShowUsers(true);
                                }}
                              >
                                <span className="fij-reason-label">{REASON_LABELS[r.key] ?? r.key}</span>
                                <span className="fij-reason-n">{r.count}</span>
                              </button>
                              {/* The reason is the state at the stop; the breakup is where the cause is.
                                  Blaming the visible thing is easy — the owner asked for the split. */}
                              <button
                                type="button"
                                className={`fij-reason-more${open ? " on" : ""}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenBucket(open ? null : { step: s.step, key: r.key });
                                }}
                              >
                                breakup {open ? "▴" : "▾"}
                              </button>
                            </div>
                            {open && (r.facets ?? []).length > 0 && (
                              <div className="fij-facets">
                                {(r.facets ?? []).map((f) => (
                                  <div key={f.dimension} className="fij-facet">
                                    <div className="fij-facet-name">{FACET_LABELS[f.dimension] ?? f.dimension}</div>
                                    {f.values.map((v) => (
                                      <div key={v.value} className="fij-facet-row">
                                        <span className="fij-facet-bar" style={{ width: `${(v.count * 100) / r.count}%` }} />
                                        <span className="fij-facet-label">{FACET_VALUE_LABELS[v.value] ?? v.value}</span>
                                        <span className="fij-facet-n">{v.count}</span>
                                      </div>
                                    ))}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="fij-nums">
                  <span className="fij-n">{s.reached}</span>
                  <span className="fij-pct">{Math.round(s.share)}%</span>
                </div>
              </div>
            ))}
          </div>

          {/* Pehli rung tak na pohanchne wale: flag kehta hai pehla open, magar us ka cold_start
              is arse mein aaya hi nahi. Inhein chupana matlab seerhi ka jama total se kam rehna,
              jise koe bhi ginne wala pakar lega — aur phir poori report par shak karega. */}
          {report.steps.length > 0 && total > report.steps[0].reached && (
            <p className="muted-line">
              <strong>{total - report.steps[0].reached}</strong> aise bhi hain jinhein app ne pehla
              open to kaha, magar un ka cold start is arse mein pohancha hi nahi — na to wo kisi rung
              par hain, na hi bhulaye gaye. Ye aksar der se pohanchne wale events hote hain.
            </p>
          )}

          <p className="muted-line">
            {build} · {versionLabel} ka hisaab. Bar dikhata hai ke itne log abhi tak chal rahe the;
            daayen taraf ka adad ye ke kam az kam itne yahan tak pohanche.
          </p>

          {showUsers && (
            <div className="live-table-wrap">
              <table className="live-table sum-table">
                <thead>
                  <tr>
                    <th className="live-th">User</th>
                    <th className="live-th">Invotick ID</th>
                    <th className="live-th">Mulk</th>
                    <th className="live-th">Kahan ruka</th>
                    <th className="live-th">Wajah</th>
                    <th className="live-th">Events</th>
                    <th className="live-th">Aakhri baar</th>
                  </tr>
                </thead>
                <tbody>
                  {report.users
                    .filter((u) => !reasonFilter || (u.step === reasonFilter.step && u.stopReason === reasonFilter.key))
                    .map((u) => (
                    <tr key={u.deviceId} className="live-row">
                      <td><code>{(u.userId ?? u.deviceId).slice(0, 8)}</code></td>
                      <td>{u.invotickId ?? "—"}</td>
                      <td>{u.country ?? "—"}</td>
                      <td>{RUNG[u.step] ?? u.stoppedAt}</td>
                      <td>{REASON_LABELS[u.stopReason] ?? u.stopReason}</td>
                      <td>{u.events}</td>
                      <td className="muted">{new Date(u.lastAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}
