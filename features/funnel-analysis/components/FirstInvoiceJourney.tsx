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
    const head = "userId\tinvotickId\tcountry\tstep\tstoppedAt\tevents\tfirstAt\tlastAt";
    const body = report.users
      .map((u) =>
        [u.userId, u.invotickId ?? "", u.country ?? "", u.step, u.stoppedAt, u.events, u.firstAt, u.lastAt].join("\t"),
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
          <h2>First invoice journey</h2>
          <p className="muted-line">
            Every person who opened the app for the first time in this range, and the furthest step
            they reached. Grouped on the server, so no user is sampled or cut short.
          </p>
        </div>
        {report && (
          <div className="fij-headline">
            <span className="fij-big">
              {made}
              <span className="fij-of">/{total}</span>
            </span>
            <span className="muted">
              created an invoice{total > 0 ? ` · ${Math.round((made / total) * 100)}%` : ""}
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
          {versions.map((v) => (
            <option key={v.appVersionCode} value={v.appVersionCode}>
              {v.appVersion ?? "—"} ({v.appVersionCode})
            </option>
          ))}
        </select>
        <DateRangePicker value={range} onChange={setRange} />
        <button className="ga4-clear" onClick={exportTsv} disabled={!report}>
          Download rows
        </button>
        <button className="ga4-clear" onClick={() => setShowUsers((v) => !v)} disabled={!report}>
          {showUsers ? "Hide users" : "Show users"}
        </button>
      </div>

      {error ? (
        <p className="error-text">{error}</p>
      ) : loading && !report ? (
        <p className="muted-line">Loading…</p>
      ) : !report || total === 0 ? (
        <p className="muted-line">No first-time users in this range.</p>
      ) : (
        <>
          <div className="fij-ladder">
            {report.steps.map((s) => (
              <div className="fij-rung" key={s.step}>
                <div className="fij-rung-label">
                  <span className="fij-name">{s.label}</span>
                  <div className="fij-bar">
                    <span style={{ width: `${s.share}%` }} />
                  </div>
                  {s.stoppedHere > 0 ? (
                    <span className="fij-lost">
                      {s.stoppedHere} stopped here — went no further
                    </span>
                  ) : (
                    <span className="fij-lost none">nobody stopped here</span>
                  )}
                </div>
                <div className="fij-nums">
                  <span className="fij-n">{s.reached}</span>
                  <span className="fij-pct">{Math.round(s.share)}%</span>
                </div>
              </div>
            ))}
          </div>

          <p className="muted-line">
            Showing {build} · {versionLabel}. The bar is who was still walking; the number on the
            right is how many got at least this far.
          </p>

          {showUsers && (
            <div className="live-table-wrap">
              <table className="live-table sum-table">
                <thead>
                  <tr>
                    <th className="live-th">User</th>
                    <th className="live-th">Invotick ID</th>
                    <th className="live-th">Country</th>
                    <th className="live-th">Stopped at</th>
                    <th className="live-th">Events</th>
                    <th className="live-th">Last seen</th>
                  </tr>
                </thead>
                <tbody>
                  {report.users.map((u) => (
                    <tr key={u.userId} className="live-row">
                      <td><code>{u.userId.slice(0, 8)}</code></td>
                      <td>{u.invotickId ?? "—"}</td>
                      <td>{u.country ?? "—"}</td>
                      <td>{u.stoppedAt}</td>
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
