import { Fragment } from "react";
import type { Kpi } from "../types";
import { GROUPS, cellCount, cellValue, diffText, intervalText, minText, pendingNote, rowWords, type RowWords } from "../words";
import { StatusPill, cx } from "./shared";

/**
 * The 95 % interval of the difference on its own axis, with the zero line and, for a guardrail, its tolerance line
 * (mockup frame 2, "c"). Dashed and hollow below the minimum n.
 */
export function Whisker({ k, w = 168 }: { k: Kpi; w?: number }) {
  if (k.diff == null || k.lo == null || k.hi == null) return <span className={cx("mut", "small")}>—</span>;
  const bad = k.tol == null ? null : k.dir > 0 ? -Math.abs(k.tol) : Math.abs(k.tol);
  const ext = Math.max(Math.abs(k.lo), Math.abs(k.hi), Math.abs(k.tol ?? 0)) * 1.25 || 1;
  const x = (v: number) => w / 2 + (v / ext) * (w / 2 - 6);
  const col = k.status === "red" ? "var(--bad)" : k.status === "amber" ? "var(--warn)" : k.status === "thin" ? "var(--muted)" : "var(--ink)";
  const dash = k.status === "thin" ? "3 3" : undefined;
  return (
    <svg viewBox={`0 0 ${w} 28`} width={w} height={28} role="img" aria-label={`farq ${diffText(k)}, hadd ${intervalText(k)}`}>
      <line className={cx("axLine")} x1={4} x2={w - 4} y1={14} y2={14} />
      <line x1={x(0)} x2={x(0)} y1={4} y2={24} style={{ stroke: "var(--ink-2)", strokeWidth: 1.5 }} />
      {bad != null && <line x1={x(bad)} x2={x(bad)} y1={3} y2={25} style={{ stroke: "var(--bad)", strokeWidth: 1.5, strokeDasharray: "3 2" }} />}
      <line x1={x(k.lo)} x2={x(k.hi)} y1={14} y2={14} style={{ stroke: col, strokeWidth: 2.4, strokeDasharray: dash }} />
      <line x1={x(k.lo)} x2={x(k.lo)} y1={9} y2={19} style={{ stroke: col, strokeWidth: 2 }} />
      <line x1={x(k.hi)} x2={x(k.hi)} y1={9} y2={19} style={{ stroke: col, strokeWidth: 2 }} />
      <circle cx={x(k.diff)} cy={14} r={4.2} style={{ fill: k.status === "thin" ? "var(--card)" : col, stroke: col, strokeWidth: 1.8 }} />
    </svg>
  );
}

function Value({ k, side }: { k: Kpi; side: "a" | "b" }) {
  if (k.status === "pending") {
    return (
      <>
        <span className={cx("v", "mut")}>—</span>
        <span className={cx("nn")}>{pendingNote(k)}</span>
      </>
    );
  }
  const c = k[side];
  return (
    <>
      <span className={cx("v")}>{cellValue(k.unit, c)}</span>
      <span className={cx("nn")}>{cellCount(k, c)}</span>
    </>
  );
}

export function KpiRow({ k, nameA, nameB, wordsFor = rowWords }: { k: Kpi; nameA: string; nameB: string; wordsFor?: (id: string) => RowWords }) {
  const w = wordsFor(k.id);
  return (
    <tr className={cx(`k-${k.status}`)}>
      <th scope="row">
        {w.name}
        <small>{w.mean}</small>
      </th>
      <td className={cx("cur")} data-l={nameA}>
        <Value k={k} side="a" />
      </td>
      <td data-l={nameB}>
        <Value k={k} side="b" />
      </td>
      <td data-l="Farq · 95 % hadd">
        <span className={cx("diffcell")}>
          <span className={cx("v")} style={{ fontSize: 13 }}>
            {diffText(k)}
          </span>
          <Whisker k={k} />
          <span className={cx("nn")}>{intervalText(k)}</span>
        </span>
      </td>
      <td data-l="Ginti (n)">
        {k.status === "pending" ? (
          <span className={cx("nn")}>{minText(k)}</span>
        ) : (
          <>
            <span className={cx("v")} style={{ fontSize: 12.5 }}>{`n ${k.a?.n?.toLocaleString("en-US") ?? "—"} / ${k.b?.n?.toLocaleString("en-US") ?? "—"}`}</span>
            <span className={cx("nn")}>{minText(k)}</span>
          </>
        )}
      </td>
      <td data-l="Halat">
        <StatusPill s={k.status} />
        {k.status === "thin" && k.daysToMin != null && <span className={cx("nn")}>{`takreeban ${k.daysToMin} din aur`}</span>}
        {k.id === "sync_defects" && <span className={cx("nn")}>had tay nahi (plan mein nahi)</span>}
        {k.status === "pending" && <span className={cx("nn")}>chhota naya table + aap ki ijazat</span>}
      </td>
    </tr>
  );
}

/** The section's KPI table, grouped as 0229 asks: G1, the four goals, then the guardrails left. */
export function KpiTable({ kpis, nameA, nameB, only, wordsFor, subFor }: { kpis: Kpi[]; nameA: string; nameB: string; only?: string[]; wordsFor?: (id: string) => RowWords; subFor?: (group: string) => string | undefined }) {
  const groups = GROUPS.filter((g) => !only || only.includes(g.key));
  return (
    <div className={cx("tblwrap")}>
      <table className={cx("tbl", "stack")}>
        <thead>
          <tr>
            <th>KPI</th>
            <th className={cx("cur")}>{nameA}</th>
            <th>{nameB}</th>
            <th>Farq · 95 % hadd</th>
            <th>Ginti (n)</th>
            <th>Halat</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((g) => {
            const rows = kpis.filter((k) => k.group === g.key);
            if (!rows.length) return null;
            return (
              <Fragment key={g.key}>
                <tr className={cx("grp")}>
                  <th colSpan={6}>
                    {g.title}
                    {(subFor?.(g.key) ?? g.sub) && <span>{subFor?.(g.key) ?? g.sub}</span>}
                  </th>
                </tr>
                {rows.map((k) => (
                  <KpiRow key={k.id} k={k} nameA={nameA} nameB={nameB} wordsFor={wordsFor} />
                ))}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
