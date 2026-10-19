import type { ReactNode } from "react";
import type { Balance, CurvePoint, DailyPoint, Ladder, Release, Timeline } from "../types";
import { day, fmt, pct, usd } from "../words";
import { cx, wilson } from "./shared";

/**
 * The charts of the approved mockup (frame 3), hand-written SVG like the A/B Tests page: one idea each, n on every
 * chart, the new build blue and the previous orange, hollow or dashed marks below the minimum, and a table view under
 * every chart so nothing depends on colour.
 */

const lin = (d0: number, d1: number, r0: number, r1: number) => (v: number) => r0 + ((v - d0) / (d1 - d0 || 1)) * (r1 - r0);
const MUTED = { fill: "var(--muted)", fontSize: 11 };

function Figure(p: { title: string; idea: string; children: ReactNode; legend?: ReactNode; note?: string; table?: ReactNode }) {
  return (
    <figure className={cx("cc")}>
      <header>
        <h4>{p.title}</h4>
      </header>
      <div className={cx("idea")}>{p.idea}</div>
      {p.children}
      {p.legend}
      {p.note && <div className={cx("idea")}>{p.note}</div>}
      {p.table}
    </figure>
  );
}

function Legend({ items }: { items: { c: string; t: string; line?: boolean }[] }) {
  return (
    <div className={cx("lg")}>
      {items.map((i) => (
        <span key={i.t}>
          <span className={cx(i.line ? "swLine" : "sw")} style={{ background: i.c }} />
          {i.t}
        </span>
      ))}
    </div>
  );
}

function TableView({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <details>
      <summary>Jadwal dekhein (table view)</summary>
      <table>
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

const A = "var(--arm-a)";
const B = "var(--arm-b)";

/** Is Play giving the new build about its rollout share of new installs? (plan A.3 design 2, T10) */
export function BalanceChart({ b, nameA, nameB }: { b: Balance; nameA: string; nameB: string }) {
  const W = 560, H = 230, l = 40, r = 84, t = 18, bot = 32, pw = W - l - r, ph = H - t - bot;
  const shares = b.days.map((d) => (d.a + d.b > 0 ? (d.a / (d.a + d.b)) * 100 : 0));
  // A share axis: 0-30 % while the shares are near a staged rollout, else 0-100 %, always round ticks.
  const top = Math.max(b.rolloutPercent ?? 0, ...shares) + 5 <= 30 ? 30 : 100;
  const y = lin(0, top, t + ph, t);
  const bw = pw / Math.max(1, b.days.length);
  const ticks = top === 30 ? [0, 10, 20, 30] : [0, 25, 50, 75, 100];
  const total = b.a + b.b;
  return (
    <Figure
      title={`Balance: naye installs mein ${nameA} ka hissa roz`}
      idea="Sawal: kya Play naye phone usi hisaab se baant raha hai jis hisaab se rollout hai? Haan, to muqabla jaiz."
      legend={<Legend items={[{ c: A, t: `${nameA} ka hissa · ${fmt(b.a)} / ${fmt(total)} pehli baar khulne = ${pct(b.share)}` }]} />}
      note={
        b.state === "thin"
          ? `Abhi sirf ${fmt(total)} pehli baar khulne: balance parhne ke liye kam az kam 50 chahiye.`
          : b.state === "failed"
            ? "Hissa rollout se bohat door: section ne apna label 'pehle / baad, jura hua' kar liya."
            : `Hissa ${b.rolloutPercent ?? "?"} % ke qareeb: staged muqabla chalta hai. Bohat door ho to section apna label 'pehle / baad, jura hua' kar leta hai.`
      }
      table={
        <TableView
          head={["Din", `${nameA} pehli baar khulne`, `${nameB} pehli baar khulne`, `${nameA} ka hissa`]}
          rows={b.days.map((d, i) => [day(d.day), fmt(d.a), fmt(d.b), pct(shares[i])])}
        />
      }
    >
      {b.days.length === 0 ? (
        <div className={cx("empty")}>Is waqt mein abhi koi naya install nahi.</div>
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Naye installs mein ${nameA} ka hissa roz, rollout ${b.rolloutPercent ?? "?"} %`}>
          {ticks.map((v) => (
            <g key={v}>
              <line className={cx("gl")} x1={l} x2={W - r} y1={y(v)} y2={y(v)} />
              <text x={l - 6} y={y(v) + 4} textAnchor="end" style={MUTED}>{`${v} %`}</text>
            </g>
          ))}
          {shares.map((v, i) => {
            const x = l + i * bw + bw * 0.2, w = bw * 0.6;
            return (
              <g key={b.days[i].day}>
                <rect className={cx("fA")} x={x} y={y(v)} width={w} height={y(0) - y(v)} rx={3} />
                <text x={x + w / 2} y={H - 14} textAnchor="middle" style={MUTED}>{day(b.days[i].day).split(" ")[0]}</text>
                {(i === 0 || i === shares.length - 1) && (
                  <text className={cx("tInk")} x={x + w / 2} y={y(v) - 5} textAnchor="middle">{`${v.toFixed(1)} %`}</text>
                )}
              </g>
            );
          })}
          {b.rolloutPercent != null && (
            <>
              <line x1={l} x2={W - r} y1={y(b.rolloutPercent)} y2={y(b.rolloutPercent)} style={{ stroke: "var(--ink)", strokeWidth: 1.6, strokeDasharray: "5 4" }} />
              <text className={cx("tInk")} x={W - r + 6} y={y(b.rolloutPercent) + 4}>{`rollout ${b.rolloutPercent} %`}</text>
            </>
          )}
        </svg>
      )}
    </Figure>
  );
}

const STEP_NAMES: Record<string, string> = {
  first_open: "Pehli baar khola",
  started: "Invoice shuru ki",
  saved: "Invoice save ki",
  g1: "ASLI invoice (share ya payment)",
};

/** New installs, first 24 hours: on which step did each build lose people? Whisker = 95 % Wilson. */
export function FunnelChart({ ladder, nameA, nameB }: { ladder: Ladder; nameA: string; nameB: string }) {
  const W = 560, l = 12, r = 112, pw = W - l - r, bh = 15, blk = 62, H = ladder.steps.length * blk + 26;
  const x = lin(0, 100, l, l + pw);
  const ns = [ladder.firstOpensA, ladder.firstOpensB];
  const names = [nameA, nameB];
  const rows: (string | number)[][] = ladder.steps.flatMap((st, i) =>
    [st.a, st.b].map((cnt, k) => {
      const tot = ns[k];
      const [lo, hi] = wilson(cnt, tot);
      return [STEP_NAMES[st.key], names[k], `${fmt(cnt)} / ${fmt(tot)}`, pct(tot > 0 ? (cnt / tot) * 100 : 0), i > 0 ? `${(lo * 100).toFixed(1)} – ${(hi * 100).toFixed(1)} %` : "—"];
    }),
  );
  return (
    <Figure
      title="Seedhi: naye installs, 24 ghante mein"
      idea="Sawal: pehli baar khulne wale kis qadam par zyada ruk gaye? Whisker = 95 % hadd."
      legend={<Legend items={[{ c: A, t: nameA }, { c: B, t: nameB }]} />}
      note="Sirf wo phone jin ke 24 ghante poore hue. 'ASLI invoice' = share ya payment, G1."
      table={<TableView head={["Qadam", "Build", "Phones", "Hissa", "95 % hadd"]} rows={rows} />}
    >
      {ladder.firstOpensA + ladder.firstOpensB === 0 ? (
        <div className={cx("empty")}>Abhi kisi naye install ke 24 ghante poore nahi hue.</div>
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Naye installs ki seedhi, ${nameA} aur ${nameB}`}>
          {[0, 25, 50, 75, 100].map((v) => (
            <g key={v}>
              <line className={cx("gl")} x1={x(v)} x2={x(v)} y1={14} y2={H - 12} />
              <text x={x(v)} y={H - 1} textAnchor={v === 0 ? "start" : v === 100 ? "end" : "middle"} style={MUTED}>{`${v} %`}</text>
            </g>
          ))}
          {ladder.steps.map((st, i) => {
            const y0 = 16 + i * blk;
            return (
              <g key={st.key}>
                <text className={cx("tInk")} x={l} y={y0 + 11}>{STEP_NAMES[st.key]}</text>
                <text x={x(100)} y={y0 + 11} textAnchor="end" style={MUTED}>{`n ${fmt(ladder.firstOpensA)} · ${fmt(ladder.firstOpensB)}`}</text>
                {[
                  [st.a, ns[0], "fA", nameA],
                  [st.b, ns[1], "fB", nameB],
                ].map(([c, n, cls, nm], k) => {
                  const cnt = c as number, tot = n as number;
                  const p = tot > 0 ? (cnt / tot) * 100 : 0;
                  const [lo, hi] = wilson(cnt, tot);
                  const yy = y0 + 18 + k * (bh + 4);
                  return (
                    <g key={k}>
                      <rect className={cx(cls as string)} x={x(0)} y={yy} width={Math.max(1, x(p) - x(0))} height={bh} />
                      {i > 0 && tot > 0 && (
                        <>
                          <line className={cx("wk")} x1={x(lo * 100)} x2={x(hi * 100)} y1={yy + bh / 2} y2={yy + bh / 2} />
                          <line className={cx("wk")} x1={x(lo * 100)} x2={x(lo * 100)} y1={yy + 3} y2={yy + bh - 3} />
                          <line className={cx("wk")} x1={x(hi * 100)} x2={x(hi * 100)} y1={yy + 3} y2={yy + bh - 3} />
                        </>
                      )}
                      <text className={cx("tInk")} x={(i > 0 ? x(hi * 100) : x(p)) + 6} y={yy + bh - 3}>
                        {`${p.toFixed(1)} %${i === 0 ? ` · ${(nm as string).split(" ")[0]}` : ""}`}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>
      )}
    </Figure>
  );
}

/** Of the new installs whose first week finished, how many had come back by day N? Shaded band = 95 %. */
export function CohortChart({ points, nameA, nameB }: { points: CurvePoint[]; nameA: string; nameB: string }) {
  const W = 560, H = 250, l = 44, r = 150, t = 24, bot = 38, pw = W - l - r, ph = H - t - bot;
  const nA = points[0]?.a.n ?? 0, nB = points[0]?.b.n ?? 0;
  const max = Math.max(10, ...points.flatMap((p) => [p.a.hi ?? 0, p.b.hi ?? 0]));
  const ymax = Math.ceil(max / 10) * 10;
  const x = lin(2, 7, l + 8, l + pw), y = lin(0, ymax, t + ph, t);
  const band = (side: "a" | "b") =>
    points.map((p) => `${x(p.day)},${y(p[side].hi ?? 0)}`).concat(points.slice().reverse().map((p) => `${x(p.day)},${y(p[side].lo ?? 0)}`)).join(" ");
  const line = (side: "a" | "b") => points.map((p, i) => `${i ? "L" : "M"}${x(p.day)},${y(p[side].value ?? 0)}`).join(" ");
  const last = points[points.length - 1];
  const thinA = nA < 200, thinB = nB < 200;
  return (
    <Figure
      title="Wapas aane ka silsila (naye installs)"
      idea="Sawal: install ke baad din 2 se 7 tak kitne phone dobara aaye? Shaded patti = 95 % hadd."
      legend={<Legend items={[{ c: A, t: `${nameA} · n ${fmt(nA)}`, line: true }, { c: B, t: `${nameB} · n ${fmt(nB)}`, line: true }]} />}
      note={`Sirf wo phone gine gaye jin ke 7 din poore hue; baqi 'intezar' mein.${thinA || thinB ? " 200 phones se kam wali taraf dhundli (data kam)." : ""}`}
      table={
        <TableView
          head={["Din", nameA, "n", nameB, "n"]}
          rows={points.map((p) => [p.day, pct(p.a.value), fmt(p.a.n), pct(p.b.value), fmt(p.b.n)])}
        />
      }
    >
      {nA + nB === 0 ? (
        <div className={cx("empty")}>Abhi kisi naye install ke 7 din poore nahi hue.</div>
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Naye installs jo din 2 se 7 mein wapas aaye, cumulative">
          {[0, ymax / 2, ymax].map((v) => (
            <g key={v}>
              <line className={cx("gl")} x1={l} x2={W - r} y1={y(v)} y2={y(v)} />
              <text x={l - 6} y={y(v) + 4} textAnchor="end" style={MUTED}>{`${v} %`}</text>
            </g>
          ))}
          {nB > 0 && <polygon points={band("b")} style={{ fill: B, opacity: 0.16 }} />}
          {nA > 0 && <polygon points={band("a")} style={{ fill: A, opacity: 0.16 }} />}
          {nB > 0 && <path d={line("b")} fill="none" style={{ stroke: B, strokeWidth: 2.4, strokeDasharray: thinB ? "4 3" : undefined }} />}
          {nA > 0 && <path d={line("a")} fill="none" style={{ stroke: A, strokeWidth: 2.4, strokeDasharray: thinA ? "4 3" : undefined }} />}
          {points.map((p) => (
            <text key={p.day} x={x(p.day)} y={H - 20} textAnchor="middle" style={MUTED}>{`din ${p.day}`}</text>
          ))}
          {last && nA > 0 && <text className={cx("tInk")} x={x(7) + 10} y={y(last.a.value ?? 0) + 4}>{`${nameA.split(" ")[0]} ${pct(last.a.value)}`}</text>}
          {last && nB > 0 && <text className={cx("tInk")} x={x(7) + 10} y={y(last.b.value ?? 0) + 18}>{`${nameB.split(" ")[0]} ${pct(last.b.value)}`}</text>}
        </svg>
      )}
    </Figure>
  );
}

/** Ad money per phone-day, daily; hollow = under 500 phone-days that day. */
export function DailyChart({ points, nameA, nameB, releaseDay }: { points: DailyPoint[]; nameA: string; nameB: string; releaseDay: string | null }) {
  const W = 560, H = 262, l = 60, r = 96, t = 34, bot = 34, pw = W - l - r, ph = H - t - bot, N = points.length;
  const vals = points.flatMap((p) => [p.aUsd, p.bUsd]).filter((v): v is number => v != null);
  const lo = vals.length ? Math.min(...vals) * 0.8 : 0, hi = vals.length ? Math.max(...vals) * 1.15 : 1;
  const x = lin(0, Math.max(1, N - 1), l, l + pw), y = lin(lo, hi || 1, t + ph, t);
  const ri = releaseDay ? points.findIndex((p) => p.day >= releaseDay.slice(0, 10)) : -1;
  const path = (k: "aUsd" | "bUsd") =>
    points.map((p, i) => (p[k] == null ? null : `${x(i)},${y(p[k] as number)}`)).filter(Boolean).map((s, i) => `${i ? "L" : "M"}${s}`).join(" ");
  return (
    <Figure
      title="Ad ki kamai fi phone-din, roz"
      idea="Sawal: release ke baad kamai neeche gayi? Khokhla nishan = us din 500 phone-din se kam, gina nahi jata."
      legend={<Legend items={[{ c: A, t: nameA, line: true }, { c: B, t: nameB, line: true }]} />}
      note="Sab formats milakar, USD, hamare apne ad_impression_value se (AdMob ki apni kamai: source baqi). Y-axis 0 se shuru nahi (line chart)."
      table={
        <TableView
          head={["Din", `${nameA} USD`, "phone-din", `${nameB} USD`, "phone-din"]}
          rows={points.map((p) => [day(p.day), usd(p.aUsd), fmt(p.aPhoneDays), usd(p.bUsd), fmt(p.bPhoneDays)])}
        />
      }
    >
      {vals.length === 0 ? (
        <div className={cx("empty")}>Is waqt mein ad ki kamai ki koi row nahi.</div>
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Ad ki kamai fi phone-din, roz, ${nameA} aur ${nameB}`}>
          {[lo, (lo + hi) / 2, hi].map((v, i) => (
            <g key={i}>
              <line className={cx("gl")} x1={l} x2={W - r} y1={y(v)} y2={y(v)} />
              <text x={l - 6} y={y(v) + 4} textAnchor="end" style={MUTED}>{`$${v.toFixed(4)}`}</text>
            </g>
          ))}
          {ri >= 0 && (
            <>
              <rect x={x(ri)} y={t - 8} width={Math.max(0, x(N - 1) - x(ri))} height={ph + 8} style={{ fill: A, opacity: 0.09 }} />
              <line x1={x(ri)} x2={x(ri)} y1={t - 8} y2={t + ph} style={{ stroke: "var(--ink)", strokeWidth: 1.6, strokeDasharray: "4 3" }} />
              <text className={cx("tInk")} x={x(ri) - 6} y={t + 6} textAnchor="end">{`${nameA.split(" ")[0]} aaya`}</text>
            </>
          )}
          <path d={path("bUsd")} fill="none" style={{ stroke: B, strokeWidth: 2.4 }} />
          <path d={path("aUsd")} fill="none" style={{ stroke: A, strokeWidth: 2.4 }} />
          {points.map((p, i) => (
            <g key={p.day}>
              {p.bUsd != null && <circle cx={x(i)} cy={y(p.bUsd)} r={p.bPhoneDays < 500 ? 4 : 3} style={{ fill: p.bPhoneDays < 500 ? "var(--card)" : B, stroke: B, strokeWidth: 1.8 }} />}
              {p.aUsd != null && <circle cx={x(i)} cy={y(p.aUsd)} r={p.aPhoneDays < 500 ? 4 : 3} style={{ fill: p.aPhoneDays < 500 ? "var(--card)" : A, stroke: A, strokeWidth: 1.8 }} />}
              {i % 2 === 0 && <text x={x(i)} y={H - 14} textAnchor="middle" style={MUTED}>{day(p.day).split(" ")[0]}</text>}
            </g>
          ))}
        </svg>
      )}
    </Figure>
  );
}

const SERIES_COLOURS: Record<string, string> = {
  older: "var(--ser0)",
  "1.5.0": "var(--ser4)",
  "1.5.1": "var(--ser3)",
  "1.5.2": "var(--arm-b)",
  "1.5.3": "var(--arm-a)",
};
export const seriesColour = (key: string) => SERIES_COLOURS[key] ?? "var(--ser0)";

/** Phones with an open per day, stacked by release, release days flagged. */
export function TimelineChart({ tl, releases }: { tl: Timeline; releases: Release[] }) {
  const W = 1160, H = 262, l = 46, r = 130, t = 56, bot = 26, pw = W - l - r, ph = H - t - bot;
  const N = tl.days.length;
  const maxTotal = Math.max(1, ...tl.totals);
  const ymax = Math.ceil(maxTotal / 100) * 100;
  const x = lin(0, Math.max(1, N - 1), l, l + pw), y = lin(0, ymax, t + ph, t);
  const cum = tl.days.map((_, i) => {
    let s = 0;
    return tl.series.map((se) => (s += se.byDay[i]));
  });
  const last = N - 1;
  // Labels only for builds on today's phones; pushed apart, then pulled back up if they ran past the axis.
  const labels = tl.series
    .map((se, k) => ({ k, key: se.key, y: (y(cum[last]?.[k] ?? 0) + y(k ? cum[last]?.[k - 1] ?? 0 : 0)) / 2, share: tl.totals[last] ? (se.byDay[last] / tl.totals[last]) * 100 : 0 }))
    .filter((lb) => lb.share >= 0.5)
    .sort((a, b) => a.y - b.y);
  for (let i = 1; i < labels.length; i++) if (labels[i].y - labels[i - 1].y < 15) labels[i].y = labels[i - 1].y + 15;
  const over = labels.length ? labels[labels.length - 1].y - (t + ph - 4) : 0;
  if (over > 0) labels.forEach((lb) => (lb.y -= over));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Roz kitne phone kis version par, ${day(tl.days[0])} se ${day(tl.days[last])}`}>
      {[0, ymax / 2, ymax].map((v) => (
        <g key={v}>
          <line className={cx("gl")} x1={l} x2={l + pw} y1={y(v)} y2={y(v)} />
          <text x={l - 6} y={y(v) + 4} textAnchor="end" style={MUTED}>{fmt(v)}</text>
        </g>
      ))}
      {tl.series
        .map((se, k) => {
          const topPts = tl.days.map((_, i) => `${x(i)},${y(cum[i][k])}`);
          const botPts = tl.days.map((_, i) => `${x(i)},${y(k ? cum[i][k - 1] : 0)}`).reverse();
          return <polygon key={se.key} points={topPts.concat(botPts).join(" ")} style={{ fill: seriesColour(se.key), stroke: "var(--card)", strokeWidth: 1.5 }} />;
        })
        .reverse()}
      {labels.map((lb) => (
        <g key={lb.key}>
          <rect x={x(last) + 8} y={lb.y - 4} width={9} height={9} rx={2} style={{ fill: seriesColour(lb.key) }} />
          <text className={cx("tInk")} x={x(last) + 22} y={lb.y + 5}>{`${lb.key === "older" ? "pichli" : lb.key} · ${lb.share.toFixed(0)} %`}</text>
        </g>
      ))}
      {releases.map((rel, i) => {
        const at = rel.productionAt?.slice(0, 10);
        const idx = at ? tl.days.findIndex((d) => d >= at) : -1;
        if (idx < 0) return null;
        const fx = x(idx), ty = i % 2 ? 22 : 8;
        const roll = rel.rollout.length ? rel.rollout[rel.rollout.length - 1].percent : null;
        return (
          <g key={rel.code}>
            <line x1={fx} x2={fx} y1={ty + 14} y2={t + ph} style={{ stroke: "var(--ink)", strokeWidth: rel.current ? 2 : 1, strokeDasharray: rel.dateUncertain ? "2 3" : undefined }} />
            <text x={fx + 4} y={ty + 10} style={{ fill: "var(--ink)", fontSize: 11.5, fontWeight: rel.current ? 800 : 700 }}>
              {`${rel.name} · ${roll == null ? "?" : `${roll} %`}${rel.dateUncertain ? " ?" : ""}`}
            </text>
          </g>
        );
      })}
      {tl.days.map((d, i) => (i % 7 === 0 && last - i >= 3 ? <text key={d} x={x(i)} y={H - 10} textAnchor="middle" style={MUTED}>{day(d)}</text> : null))}
      <text x={x(last)} y={H - 10} textAnchor="end" style={{ fill: "var(--ink-2)", fontSize: 11, fontWeight: 700 }}>{`aaj ${day(tl.days[last])}`}</text>
    </svg>
  );
}
