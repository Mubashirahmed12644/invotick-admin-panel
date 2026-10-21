"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { getErrorMessage, isUnauthorizedError } from "@/lib/api";
import { clearAccessToken } from "@/lib/auth";
import { releaseImpactApi, unavailableReason } from "../api";
import type { RangeChoice, ReleaseImpactResponse, ScoreRow, Unavailable, Win } from "../types";
import {
  HOW_COUNTED,
  RELEASE_STATUS,
  balanceWords,
  breachWords,
  cellCount,
  cellValue,
  comparisonWords,
  day,
  dayTime,
  fmt,
  pct,
  recommendationWords,
  resultLine,
  rowWords,
  unavailableText,
} from "../words";
import { BalanceChart, CohortChart, DailyChart, FunnelChart, TimelineChart, seriesColour } from "./Charts";
import { KpiTable } from "./KpiTable";
import FirstInvoiceGateSection from "./FirstInvoiceGateSection";
import SecondInvoiceSection from "./SecondInvoiceSection";
import SignupAtExitSection from "./SignupAtExitSection";
import { Icon, StatusPill, cx } from "./shared";

const RANGES: { r: RangeChoice; label: string }[] = [
  { r: "since", label: "Release shuru se" },
  { r: 7, label: "Pichhle 7 din" },
  { r: 14, label: "Pichhle 14 din" },
  { r: 30, label: "Pichhle 30 din" },
];

const AUTO_RETRIES = 3;

type Load =
  | { rk: string; kind: "ok"; data: ReleaseImpactResponse }
  | { rk: string; kind: "unavailable"; reason: Unavailable }
  | { rk: string; kind: "error"; message: string };

/**
 * The Release Impact page (decisions 0228 round one and 0229; the approved mockup of 2026-10-19). Read only: the
 * timeline of releases, the scorecard of the same guardrails and four goals for every release, and the current release
 * against the one before it. One request per range; the 24 ghante / 7 din chips only choose which G1 reading is shown.
 */
export default function ReleaseImpactPage() {
  const router = useRouter();
  const [range, setRange] = useState<RangeChoice>("since");
  const [win, setWin] = useState<Win>("24h");
  const [attempt, setAttempt] = useState(0);
  const [load, setLoad] = useState<Load | null>(null);
  const [silence, setSilence] = useState<{ status: string; summary: string } | null>(null);
  const rk = String(range);

  const onFail = useCallback(
    (e: unknown): boolean => {
      if (isUnauthorizedError(e)) {
        clearAccessToken({ sessionExpired: true });
        router.replace("/login");
        return true;
      }
      return false;
    },
    [router],
  );

  useEffect(() => {
    let cancelled = false;
    releaseImpactApi
      .get(range)
      .then((data) => !cancelled && setLoad({ rk, kind: "ok", data }))
      .catch((e) => {
        if (cancelled || onFail(e)) return;
        const reason = unavailableReason(e);
        setLoad(reason ? { rk, kind: "unavailable", reason } : { rk, kind: "error", message: getErrorMessage(e, "Release Impact load nahi hua.") });
      });
    return () => {
      cancelled = true;
    };
  }, [rk, range, attempt, onFail]);

  // The silence check lives in the Health Centre; this page shows only one strip and the way there (mockup frame 5).
  useEffect(() => {
    let cancelled = false;
    releaseImpactApi
      .silence()
      .then((s) => !cancelled && setSilence(s))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const current = load?.rk === rk ? load : null;
  const computing = current?.kind === "unavailable" && current.reason === "computing" && attempt < AUTO_RETRIES;
  useEffect(() => {
    if (!computing) return;
    const t = window.setTimeout(() => setAttempt((a) => a + 1), 15_000);
    return () => window.clearTimeout(t);
  }, [computing, attempt]);

  const retry = () => {
    if (current?.kind !== "ok") setLoad(null);
    setAttempt((a) => a + 1);
  };
  const data = current?.kind === "ok" ? current.data : null;

  return (
    <main className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Navbar title="Release Impact" />
        <section className="content-wrap">
          <div className={cx("root")}>
            <header className={cx("top")}>
              <h1>Release Impact</h1>
              <p className={cx("lead")}>
                Har release ne kya badla: behtar ya bura, kis ke liye, kitna, aur ab kya karein. Sab number is panel ke apne data se; hamare apne phones
                nikle hue.
              </p>
              <Meta data={data} />
            </header>

            <div className={cx("filters")} role="toolbar" aria-label="Filters">
              <div className={cx("fgrp")} role="group" aria-label="Platform">
                <button type="button" className={cx("chip")} aria-pressed="true">
                  <Icon name="phone" />
                  Android
                </button>
                <button type="button" className={cx("chip")} disabled aria-pressed="false" title="iOS alag qatar: abhi naye iPhone bohat kam">
                  iOS <small>n kam</small>
                </button>
              </div>
              <div className={cx("fgrp")} role="group" aria-label="Waqt: ASLI invoice ki kaunsi reading">
                {(["24h", "7d"] as Win[]).map((w) => (
                  <button key={w} type="button" className={cx("chip")} aria-pressed={win === w} onClick={() => setWin(w)}>
                    {w === "24h" ? "24 ghante" : "7 din"}
                  </button>
                ))}
              </div>
              <div className={cx("fgrp")}>
                <label className={cx("chip")} title="Kis dauran ke phones">
                  <Icon name="cal" />
                  {data ? `${day(data.range.from)} – ${day(data.range.to)}` : "Tarikh"}
                  <select
                    className={cx("rangesel")}
                    aria-label="Kis dauran ke phones"
                    value={String(range)}
                    onChange={(e) => {
                      setRange(e.target.value === "since" ? "since" : (Number(e.target.value) as RangeChoice));
                      setAttempt(0);
                    }}
                  >
                    {RANGES.map((r) => (
                      <option key={String(r.r)} value={String(r.r)}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            {silence && (silence.status === "WARNING" || silence.status === "CRITICAL") && (
              <div className={cx("strip", silence.status === "CRITICAL" ? "bad" : "warn")}>
                <Icon name="warn" />
                <span>
                  <b className={cx("t")}>Kisi feature ka event nahi aa raha: {silence.summary}</b>
                  Ye check Health Centre ki hai (<code>feature-events-arriving</code>); yahan sirf wahan ka rasta.{" "}
                  <Link href="/health">Health Centre dekhein</Link>. 0 rows ka matlab &quot;data nahi&quot;, &quot;theek&quot; nahi.
                </span>
              </div>
            )}

            {!current && <Waiting />}
            {current?.kind === "error" && (
              <div className={cx("card", "statebox")}>
                <span className={cx("badge", "worse")}>
                  <Icon name="x" />
                  <span>
                    HISAAB NAHI HO SAKA<small>{current.message}</small>
                  </span>
                </span>
                <p>
                  Server ne waqt par jawab nahi diya. <b>Koi adhura ya purana number nahi dikhaya gaya.</b> Dobara koshish karein; phir bhi na ho to Health
                  Centre dekhein.
                </p>
                <button type="button" className={cx("btn", "fill")} onClick={retry}>
                  <Icon name="refresh" />
                  Dobara koshish
                </button>
              </div>
            )}
            {current?.kind === "unavailable" && (
              <>
                <div className={cx("strip", current.reason === "computing" || current.reason === "busy" ? "info" : "warn")} role="status" aria-live="polite">
                  {current.reason === "computing" ? <span className={cx("spin")} aria-hidden="true" /> : <Icon name="warn" />}
                  <span>{unavailableText(current.reason)}</span>
                  <button type="button" className={cx("btn")} onClick={retry}>
                    Dobara dekhein
                  </button>
                </div>
                {current.reason === "computing" && <Skeleton />}
              </>
            )}
            {data && <Answer data={data} win={win} onRetry={retry} range={range} onFail={onFail} />}

            <details className={cx("howbox")}>
              <summary>
                <Icon name="chev" />
                Ye numbers kaise gine gaye
              </summary>
              <ul>
                {HOW_COUNTED.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </details>
          </div>
        </section>
      </div>
    </main>
  );
}

function Waiting() {
  return (
    <>
      <div className={cx("strip", "info")} role="status">
        <span className={cx("spin")} aria-hidden="true" />
        <span>
          <b className={cx("t")}>Hisaab ho raha hai…</b> Ye bhaari hisaab hai: server 15 second tak le sakta hai. Adhura number kabhi nahi dikhaya jata.
        </span>
      </div>
      <Skeleton />
    </>
  );
}

function Skeleton() {
  return (
    <div className={cx("skel")} aria-hidden="true">
      <div className={cx("sk", "skTile")} />
      <div className={cx("sk", "skLine")} style={{ width: "60%" }} />
      <div className={cx("sk", "skLine")} style={{ width: "90%" }} />
      <div className={cx("sk", "skBlock")} />
    </div>
  );
}

function Meta({ data }: { data: ReleaseImpactResponse | null }) {
  if (!data) return <div className={cx("meta")}>Android · naye installs · release</div>;
  const ex = data.section.excluded;
  return (
    <div className={cx("meta")}>
      <span>
        <Icon name="phone" />
        Android
      </span>
      <span>Naye installs</span>
      <span>{`${fmt(ex.cohortPhones)} naye aur ${fmt(ex.activePhones)} active hamare apne phones nikale (list: ${fmt(ex.ourOwnListSize)}, test devices: ${fmt(ex.testingDevicesTable)})`}</span>
      <span className={cx("num")}>Hisaab {dayTime(data.computedAt)}</span>
      <span>20 min ka cache</span>
    </div>
  );
}

const label = (name: string, code: number) => `${name} (${code})`;

function Answer({ data, win, onRetry, range, onFail }: { data: ReleaseImpactResponse; win: Win; onRetry: () => void; range: RangeChoice; onFail: (e: unknown) => boolean }) {
  if (data.truncated) {
    return (
      <div className={cx("strip", "warn")} role="alert">
        <Icon name="warn" />
        <span>Is waqt mein rows itni zyada hain ke server ne gin-na rok diya. Adhoore numbers nahi dikhaye ja rahe: chhota waqt chunein.</span>
      </div>
    );
  }
  return (
    <>
      {data.stale && (
        <div className={cx("strip", "warn")} role="status">
          <Icon name="clock" />
          <span>
            <b className={cx("t")}>Ye pichhla hisaab hai ({dayTime(data.computedAt)}).</b> Naya hisaab chal raha hai.
          </span>
          <button type="button" className={cx("btn")} onClick={onRetry}>
            Dobara dekhein
          </button>
        </div>
      )}
      <TimelineCard data={data} />
      <ScorecardCard data={data} win={win} />
      <SectionCard data={data} win={win} />
      <SecondInvoiceSection range={range} onFail={onFail} />
      <SignupAtExitSection range={range} onFail={onFail} />
      <FirstInvoiceGateSection range={range} onFail={onFail} />
      <OtherSections />
    </>
  );
}

// ── the timeline ──

function TimelineCard({ data }: { data: ReleaseImpactResponse }) {
  const tl = data.timeline;
  const last = tl.days.length - 1;
  const total = tl.totals[last] ?? 0;
  const chips = [...data.releases, data.planned];
  return (
    <section className={cx("card")} aria-labelledby="ri-tl">
      <div className={cx("hd")}>
        <h2 id="ri-tl">Releases ki timeline</h2>
        <span className={cx("small", "mut")}>{`Roz kitne phone ne app khola, kis version par · aaj ${fmt(total)} phones`}</span>
      </div>
      <div className={cx("tlwrap")}>
        <div className={cx("tlWide")}>
          <TimelineChart tl={tl} releases={data.releases} />
        </div>
        <div className={cx("tlList")}>
          {[...tl.series].reverse().map((se) => {
            const rel = data.releases.find((r) => r.name === se.key);
            const share = total ? (se.byDay[last] / total) * 100 : 0;
            return (
              <div key={se.key} className={cx("tlistRow")}>
                <span className={cx("bar")} style={{ background: seriesColour(se.key) }} />
                <div>
                  <b>{rel ? label(rel.name, rel.code) : se.key === "older" ? "Pichli (1.4.9 aur pehle)" : se.key === "other" ? "Naye build (list mein abhi nahi)" : se.key}</b>
                  {rel && <div className={cx("small", "mut")}>{`${day(rel.productionAt)}${rel.dateUncertain ? " ?" : ""} · ${rolloutText(rel)}`}</div>}
                </div>
                <span className={cx("num", "small")}>
                  <b>{`${share.toFixed(0)} %`}</b>
                  <div className={cx("mut")}>aaj ke phones</div>
                </span>
              </div>
            );
          })}
          <p className={cx("small", "mut")} style={{ paddingTop: 6 }}>
            Roz kitne phone kis version par (list shakal).
          </p>
        </div>
        <div className={cx("rels")}>
          {chips.map((r) => {
            const staged = r.comparison === "staged";
            const planned = r.comparison === "planned";
            return (
              <div key={r.code} className={cx("rel", r.current && "sel", planned && "plan")}>
                <span className={cx("rn")}>
                  {r.current && <Icon name="flag" />}
                  {r.name} <small>({planned ? `${r.code}+` : r.code})</small>
                </span>
                <span className={cx("rd")}>{planned ? "abhi cut nahi" : `${day(r.productionAt)}${r.dateUncertain ? " ?" : ""}`}</span>
                <span className={cx("rd")}>
                  <Icon name="pencil" />
                  {planned ? "taiyari" : rolloutText(r)} <span title="haath se likha, jab tak Play se parhna nahi banta">(haath se)</span>
                </span>
                <span className={cx("rc", staged || planned ? "ok" : "hmm")}>
                  <Icon name={staged || planned ? "check" : "warn"} />
                  {planned ? "random holdout (taiyari)" : staged ? `saath saath: ${r.code} bamuqabla ${r.previous}` : "sirf pehle / baad"}
                </span>
              </div>
            );
          })}
        </div>
        <div className={cx("iosRow")}>
          <b>iOS (alag qatar, Android ke saath kabhi nahi milta):</b>
          {data.ios.map((r) => (
            <span key={r.name}>
              {`${r.name} · App Store ${day(r.productionAt)} · ${fmt(r.firstOpens)} asli naye iPhone → `}
              <StatusPill s="thin" />
            </span>
          ))}
          <span>1.0.2 · sirf TestFlight</span>
        </div>
      </div>
      <p className={cx("small", "mut")}>
        Pehle/baad wale releases mein version aur calendar alag nahi ho sakte: wahan har number &quot;jura hua&quot; likha jata hai. Sirf staged release (aaj 1.5.3)
        saath saath parhi ja sakti hai.
      </p>
    </section>
  );
}

function rolloutText(r: ReleaseImpactResponse["releases"][number]): string {
  if (!r.rollout.length) return "—";
  const parts = r.rollout.map((x) => (x.percent == null ? "pehla % maloom nahi" : `${x.percent} %`));
  if (r.rollout.length > 1) return `${parts[0]} → ${parts[parts.length - 1]} (${day(r.rollout[r.rollout.length - 1].at)})`;
  return `${parts[0]}${r.comparison === "staged" ? " staged" : ""}`;
}

// ── the scorecard ──

function ScorecardCard({ data, win }: { data: ReleaseImpactResponse; win: Win }) {
  const sc = data.scorecard;
  const hide = win === "24h" ? "g1_7d" : "g1_24h";
  const rows = sc.rows.filter((r) => r.id !== hide);
  const st = RELEASE_STATUS[sc.status];
  const n = (s: string) => rows.filter((r) => r.compare.status === s).length;
  const cur = sc.columns[sc.columns.length - 1];
  const prev = sc.columns[sc.columns.length - 2];
  return (
    <section className={cx("card")} aria-labelledby="ri-sc">
      <div className={cx("hd")}>
        <h2 id="ri-sc">Hifazati numbers: har release ke wahi aath, aur chaar maqsad</h2>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 14px", alignItems: "center" }}>
        <span className={cx("badge", st.cls)}>
          <Icon name={st.icon} />
          <span>
            {st.word}
            <small>{`${cur?.name ?? ""} ki hifazat ki halat`}</small>
          </span>
        </span>
        <span className={cx("small")} style={{ maxWidth: "62ch" }}>
          <b>{n("red")} toota</b> · <b>{n("amber")} dekhte rahein</b> · {n("plain") + n("better")} mein koi saaf farq nahi · {n("thin")} mein data kam ·{" "}
          {n("pending")} ka source baqi. Laal sirf tab jab poori 95 % hadd hifazati had ke buri taraf ho.
        </span>
      </div>
      <div className={cx("tblwrap")}>
        <table className={cx("tbl", "stack")}>
          <thead>
            <tr>
              <th>Number</th>
              {sc.columns.map((c, i) => (
                <th key={c.code} className={cx(i === sc.columns.length - 1 && "cur")}>
                  {label(c.name, c.code)}
                </th>
              ))}
              <th>{cur && prev ? `${cur.name} bamuqabla ${prev.name}` : "Muqabla"}</th>
            </tr>
          </thead>
          <tbody>
            <tr className={cx("grp")}>
              <th colSpan={sc.columns.length + 2}>
                Hifazat: wahi aath<span>bharosa, paisa, pehli invoice, raftaar</span>
              </th>
            </tr>
            {rows.filter((r) => r.group === "guardrail").map((r) => (
              <ScoreLine key={r.id} r={r} data={data} />
            ))}
            <tr className={cx("grp")}>
              <th colSpan={sc.columns.length + 2}>
                Chaar maqsad (0229)<span>engagement, uninstall, retention, LTV</span>
              </th>
            </tr>
            {rows.filter((r) => r.group === "goal").map((r) => (
              <ScoreLine key={r.id} r={r} data={data} />
            ))}
          </tbody>
        </table>
      </div>
      <p className={cx("small", "mut")}>
        Purane column ({sc.columns.filter((c) => c.kind === "before_after").map((c) => c.code).join(", ") || "—"}) apne pehle 7 din ke hain, pehle/baad,
        &quot;jura hua&quot;. Dhaaridar qatar = jis ka source abhi nahi (Play ke ANR aur crash version-wise: chhota naya table aur aap ki ijazat chahiye).
      </p>
    </section>
  );
}

function ScoreLine({ r, data }: { r: ScoreRow; data: ReleaseImpactResponse }) {
  const w = rowWords(r.id);
  const cols = data.scorecard.columns;
  const pending = r.compare.status === "pending";
  return (
    <tr className={cx(`k-${r.compare.status}`)}>
      <th scope="row">
        {w.name}
        <small>{w.mean}</small>
      </th>
      {cols.map((c, i) => {
        const cell = r.cells[String(c.code)];
        const isCur = i === cols.length - 1;
        return (
          <td key={c.code} className={cx(isCur ? "cur" : "old", c.kind === "before_after" && "oldcol")} data-l={label(c.name, c.code)}>
            {pending ? (
              <>
                <span className={cx("v", "mut")}>—</span>
                <span className={cx("nn")}>Play: source baqi</span>
              </>
            ) : (
              <>
                <span className={cx("v")}>{cellValue(r.unit, cell)}</span>
                <span className={cx("nn")}>{cell ? `n ${cellCount(r.compare, cell)}` : "—"}</span>
              </>
            )}
          </td>
        );
      })}
      <td data-l="Muqabla">
        <StatusPill s={r.compare.status} />
      </td>
    </tr>
  );
}

// ── the section ──

function SectionCard({ data, win }: { data: ReleaseImpactResponse; win: Win }) {
  const s = data.section;
  const nameA = label(s.currentName, s.current);
  const nameB = label(s.previousName, s.previous);
  const cur = data.releases.find((r) => r.code === s.current);
  const st = RELEASE_STATUS[s.status];
  const rec = recommendationWords(data);
  const balance = balanceWords(data);
  const red = s.kpis.filter((k) => k.status === "red");
  const g1Id = win === "24h" ? "g1_24h" : "g1_7d";
  const errorsRow = s.kpis.find((k) => k.id === "errors_seen");
  const empty = s.balance.a === 0 && (errorsRow?.a?.n ?? 0) === 0;
  return (
    <section className={cx("card", "sec", s.status === "broken" && "broken")} aria-labelledby="ri-sec">
      <div className={cx("secHead")}>
        <div className={cx("secTop")}>
          <div>
            <h2 id="ri-sec">{`${nameA} bamuqabla ${nameB}`}</h2>
            <div className={cx("facts")}>
              <span>
                <Icon name="phone" />
                Android
              </span>
              <span>
                <Icon name="cal" />
                <b>{day(cur?.productionAt)}</b>
              </span>
              <span>
                <Icon name="pencil" />
                <b>{cur ? rolloutText(cur) : "—"}</b> (haath se likha)
              </span>
              <span>
                Badlav: <b>release overview</b> (support icon, paywall ka sawal, sync, ANR…)
              </span>
            </div>
          </div>
          <div style={{ display: "grid", gap: 6, justifyItems: "end" }}>
            <span className={cx("badge", st.cls)}>
              <Icon name={st.icon} />
              <span>
                {st.word}
                <small>{st.small}</small>
              </span>
            </span>
          </div>
        </div>
        <div className={cx("kinds")}>
          <span className={cx("kind", s.comparison === "staged" ? "stage" : "assoc")}>
            <Icon name={s.comparison === "staged" ? "users" : "cal"} />
            {comparisonWords(s.comparison)}
          </span>
          <span className={cx("kind")}>
            <Icon name="lock" />
            Release ka ek maqsad nahi, is liye Behtar/Bura nahi
          </span>
        </div>
        {balance && (
          <div className={cx("strip", "warn")}>
            <Icon name="warn" />
            <span>{balance}</span>
          </div>
        )}
        <div className={cx("exp")}>
          <p>
            <span className={cx("k")}>Umeed</span>
            <span>
              <i className={cx("recon")}>(baad mein likhi, &quot;reconstructed&quot;: is se jeet ka daawa nahi ho sakta)</i> Hifazati aath number {s.previousName} se na
              bigren; chaar maqsad (engagement, uninstall, retention, LTV) neeche na jayen; har feature ka apna number apne section mein.
            </span>
          </p>
          <p>
            <span className={cx("k")}>Nateeja</span>
            <span>{resultLine(data, g1Id)}</span>
          </p>
        </div>
        <div className={cx("reads")}>
          <span className={cx("lab")}>Parhne ki tareekhein</span>
          {s.readDates.map((d) => (
            <span key={d.label} className={cx("rdChip", d.state)}>
              <Icon name={d.state === "done" ? "check" : d.state === "now" ? "clock" : "cal"} />
              {`${d.label === "24h" ? "24 ghante" : d.label === "7d" ? "din 7" : "din 30"} · ${d.state === "now" ? "aaj" : day(d.at)}`}
            </span>
          ))}
        </div>
        {red.map((k) => (
          <div key={k.id} className={cx("strip", "bad")}>
            <Icon name="x" />
            <span>
              <b className={cx("t")}>{`Hifazati number toot gaya: ${rowWords(k.id).name} ${k.diff != null ? `${k.diff > 0 ? "+" : "−"}${Math.abs(k.diff).toFixed(1)}${k.diffUnit === "pp" ? " pt" : " %"}` : ""}.`}</b>
              {`Poori 95 % hadd (${k.lo} se ${k.hi}) had ke buri taraf; n ${fmt(k.a?.n)} · ${fmt(k.b?.n)}. Is liye pura section bura. `}
              {breachWords(k.onBreach)}
            </span>
          </div>
        ))}
        {rec && (
          <div className={cx("strip", rec.tone)}>
            <Icon name={rec.tone === "bad" ? "x" : rec.tone === "warn" ? "warn" : "info"} />
            <span>
              <b className={cx("t")}>{rec.title}</b>
              {rec.body}
            </span>
          </div>
        )}
        {!rec && (
          <div className={cx("strip", "neu")}>
            <Icon name="info" />
            <span>
              <b className={cx("t")}>Sifarish abhi nahi.</b> Sifarish sirf parhne ki tareekhon par (24 ghante, din 7, din 30); beech mein sirf number.
            </span>
          </div>
        )}
      </div>
      <div className={cx("secBody")}>
        {empty ? (
          <div className={cx("statebox")}>
            <StatusPill s="thin" label="abhi data nahi" />
            <h3>{`${nameA} ki release-build ki koi row abhi nahi aayi`}</h3>
            <p>
              Hamare apne aur test phones ki rows gini nahi jaati. Pehle asli phone ki row aate hi section khud bhar jata hai. <b>Zero ko &quot;theek&quot; nahi likha jata.</b>
            </p>
          </div>
        ) : (
          <>
            <div className={cx("charts")}>
              <BalanceChart b={s.balance} nameA={nameA} nameB={nameB} />
              <FunnelChart ladder={s.ladder} nameA={nameA} nameB={nameB} />
            </div>
            <KpiTable kpis={s.kpis} nameA={nameA} nameB={nameB} />
            <div className={cx("charts")}>
              <CohortChart points={s.retentionCurve} nameA={nameA} nameB={nameB} />
              <DailyChart points={s.daily} nameA={nameA} nameB={nameB} releaseDay={cur?.productionAt ?? null} />
            </div>
            <Segments data={data} nameA={nameA} nameB={nameB} />
          </>
        )}
        <div className={cx("foot")}>
          <b>Hudood (jo naapa nahi ja sakta):</b>
          <ul>
            <li>Play ke ANR, crash aur uninstall version-wise: source baqi (chhota naya table aur aap ki ijazat). Uninstall ki jagah andaza: &quot;aaye aur 14 din mein phir nahi aaye&quot;.</li>
            <li>Ad ki kamai hamare apne ad_impression_value se; AdMob ki apni kamai abhi nahi milai.</li>
            <li>Premium ke kharidar bohat kam: paywall aur LTV ka premium hissa mahino &quot;data kam&quot; rahega.</li>
            <li>Staged rollout mein Play chunta hai kis ko naya build mile: &quot;jura hua (mazboot)&quot;, &quot;is ne kiya&quot; nahi.</li>
          </ul>
        </div>
      </div>
    </section>
  );
}

function Segments({ data, nameA, nameB }: { data: ReleaseImpactResponse; nameA: string; nameB: string }) {
  const s = data.section;
  return (
    <details className={cx("fold")}>
      <summary>
        Mulk (top 8): ASLI invoice 24 ghante <span className={cx("pill")}>ishara, saboot nahi</span>
      </summary>
      <p className={cx("small", "mut")} style={{ padding: "6px 0" }}>
        Zyada hisse = zyada ittefaqi nateeje, is liye sirf &quot;ishara&quot;; koi rang nahi. Android aur iOS kabhi milaye nahi.
      </p>
      <table className={cx("tbl")}>
        <thead>
          <tr>
            <th>Mulk</th>
            <th className={cx("cur")}>{nameA}</th>
            <th>{nameB}</th>
          </tr>
        </thead>
        <tbody>
          {s.countries.map((c) => (
            <tr key={c.key}>
              <th scope="row">{c.key === "unknown" ? "maloom nahi" : c.key}</th>
              <td className={cx("cur")}>{`${pct(c.a.value)} · ${fmt(c.a.x)} / ${fmt(c.a.n)}`}</td>
              <td>{`${pct(c.b.value)} · ${fmt(c.b.x)} / ${fmt(c.b.n)}`}</td>
            </tr>
          ))}
          <tr>
            <th scope="row">
              Mulk maloom nahi<small>unknown: har release mein ghatna chahiye</small>
            </th>
            <td className={cx("cur")}>{`${fmt(s.unknownCountry.a)} naye phones`}</td>
            <td>{`${fmt(s.unknownCountry.b)} naye phones`}</td>
          </tr>
        </tbody>
      </table>
    </details>
  );
}

// ── the other sections (mockup frame 4): closed cards until each is built ──

const OTHER: { rel: string; name: string; state: "notbuilt" | "source" | "waits"; why: string; will: string; cmp: string }[] = [
  {
    rel: "1.5.0",
    name: "Ads, consent aur splash",
    state: "notbuilt",
    why: "Ads ki kamai version-wise ka read nahi bana (data maujood hai). AdMob ki apni kamai: data source baqi, aap ka credential chahiye.",
    will: "Ad ka safar: request → load → show → paid, har format alag; splash par ad dikhne ka hissa USD fi 1,000 ke saath; kamai fi phone-din; kyun fail hue ki fehrist.",
    cmp: "pehle / baad (113 bamuqabla 114), jura hua; EEA bamuqabla baqi duniya control",
  },
  {
    rel: "1.5.0 · 1.5.3",
    name: "Rating aur feedback",
    state: "source",
    why: "Play ki rating aur uninstall version-wise: aap ki ijazat baqi (bulk reports). Hamare apne events maujood.",
    will: "Darwaze ki seedhi (opens → rate dabaya → store flow), stars ka hissa, 1 star ka hissa, madad ke paighaam, 1,500 ms wala nateeja.",
    cmp: "staged 117 bamuqabla 116, active phones par",
  },
  {
    rel: "1.5.1 · 1.5.3",
    name: "Paywall: Continue aur exit sawal",
    state: "notbuilt",
    why: "Events maujood (premium_purchase_result, paywall_exit_reason); read nahi bana. Kharidar bohat kam: kamai ka faisla mahino 'data kam' rahega.",
    will: "Darwaze ki seedhi (views → Continue → store sheet → kharid), jawab ki wajah, mulk-war jadwal, net kamai fi dekhne wala hadd ke saath.",
    cmp: "1.5.1: pehle/baad; 1.5.3: staged",
  },
  {
    rel: "1.5.1 · 1.5.3",
    name: "Bharosa: crash, ANR, sync, PDF",
    state: "source",
    why: "Play ke crash/ANR version-wise: chhota naya table aur aap ki ijazat chahiye. Jab tak nahi, hamare apne prev_exit aur galti ke clusters.",
    will: "Version-wise crash aur ANR ki lakeer, naye / gaye clusters ki fehrist, 'theek hua' wale qadam jo 7 din baad bhi report ho to laal.",
    cmp: "staged 117 bamuqabla 116 (Play ke rates version-wise hain)",
  },
  {
    rel: "1.5.0 · 1.5.1",
    name: "Growth loop aur speed",
    state: "notbuilt",
    why: "Sab se aakhir mein bante hain. Pehle upar ke sections.",
    will: "Share → receiver ne khola → faisla → 'apna banayein' → install; update ki apnayi; splash ke intezar ka taqseem; iOS alag qatar.",
    cmp: "pehle / baad; iOS apni qatar mein",
  },
];

function OtherSections() {
  const chip = (s: (typeof OTHER)[number]["state"]) =>
    s === "source" ? (
      <span className={cx("st", "pending")}>
        <Icon name="plug" />
        Data source baqi
      </span>
    ) : s === "waits" ? (
      <span className={cx("st", "pending")}>
        <Icon name="cal" />
        Feature ke saath banega
      </span>
    ) : (
      <span className={cx("st", "pending")}>
        <Icon name="clock" />
        Abhi bana nahi
      </span>
    );
  return (
    <section aria-labelledby="ri-other" style={{ display: "grid", gap: 10 }}>
      <h2 id="ri-other" className={cx("lab")}>
        Baqi sections (1.5.3 ke neeche)
      </h2>
      <div className={cx("cols")}>
        {OTHER.map((c) => (
          <div key={c.name} className={cx("col", c.state === "waits" && "dashed")}>
            <div>
              <h3>
                {c.name} <small>{c.rel}</small>
              </h3>
              <p>{c.why}</p>
            </div>
            <div>{chip(c.state)}</div>
            <div className={cx("will")}>
              <span>
                <b>Kholne par:</b> {c.will}
              </span>
              <span>
                <b>Muqabla:</b> {c.cmp}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

