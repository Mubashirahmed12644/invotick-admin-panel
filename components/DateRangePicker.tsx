"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/**
 * A date range, held as local calendar days rather than instants.
 *
 * Days, because that is what is being chosen. An instant would carry a time nobody picked, and the
 * first thing anyone would notice is "1 August" quietly meaning 00:00 and therefore excluding most
 * of the first of August. The conversion to instants happens once, at the edge, in [toRangeIso].
 */
export interface DayRange {
  /** Inclusive first day. */
  from: Date;
  /** Inclusive last day — the whole of it, not its midnight. */
  to: Date;
}

/** Local midnight for a day, with the time part discarded. */
function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, n: number): Date {
  const x = startOfDay(d);
  x.setDate(x.getDate() + n);
  return x;
}

function addMonths(d: Date, n: number): Date {
  const x = new Date(d.getFullYear(), d.getMonth() + n, 1);
  return x;
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  );
}

/** `31 Jul 2026` — unambiguous, unlike anything with two numbers in front. */
export function formatDay(d: Date): string {
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

/**
 * The range as the two instants the API wants: `[from, to)`.
 *
 * `to` is the midnight *after* the chosen last day, so picking 1 to 14 August includes all of the
 * 14th. Half-open, so two adjacent ranges neither overlap on the boundary nor leave a second
 * between them — closed-at-both-ends is where a report double-counts a day and nobody notices.
 */
export function toRangeIso(r: DayRange): { from: string; to: string } {
  return { from: startOfDay(r.from).toISOString(), to: addDays(r.to, 1).toISOString() };
}

interface Preset {
  label: string;
  build: (today: Date) => DayRange;
}

/**
 * Deliberately no "All time".
 *
 * analytics_events is the busiest table in the product and shares the connection pool that serves
 * sync and auth; an indexed range over it is cheap and an open-ended scan is not. A year answers
 * every question this page is for, and past that the honest answer is pre-aggregated counts rather
 * than an option that quietly takes the pool with it.
 */
const PRESETS: Preset[] = [
  { label: "Today", build: (t) => ({ from: t, to: t }) },
  { label: "Yesterday", build: (t) => ({ from: addDays(t, -1), to: addDays(t, -1) }) },
  { label: "Last 7 days", build: (t) => ({ from: addDays(t, -6), to: t }) },
  { label: "Last 14 days", build: (t) => ({ from: addDays(t, -13), to: t }) },
  { label: "Last 30 days", build: (t) => ({ from: addDays(t, -29), to: t }) },
  {
    label: "This month",
    build: (t) => ({ from: new Date(t.getFullYear(), t.getMonth(), 1), to: t }),
  },
  {
    label: "Last month",
    build: (t) => ({
      from: new Date(t.getFullYear(), t.getMonth() - 1, 1),
      to: new Date(t.getFullYear(), t.getMonth(), 0),
    }),
  },
  { label: "Last 90 days", build: (t) => ({ from: addDays(t, -89), to: t }) },
];

/** The default, and the one the page opens on. */
export function defaultRange(): DayRange {
  const today = startOfDay(new Date());
  return { from: addDays(today, -29), to: today };
}

/** Which preset, if any, a range currently equals — so reopening the picker shows it selected. */
function matchingPreset(r: DayRange): string | null {
  const today = startOfDay(new Date());
  const hit = PRESETS.find((p) => {
    const b = p.build(today);
    return sameDay(b.from, r.from) && sameDay(b.to, r.to);
  });
  return hit?.label ?? null;
}

function MonthGrid({
  month,
  range,
  pending,
  onPick,
}: {
  month: Date;
  range: DayRange;
  pending: Date | null;
  onPick: (d: Date) => void;
}) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  // Monday-first, matching the rest of the panel and most of the world.
  const lead = (first.getDay() + 6) % 7;
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const today = startOfDay(new Date());

  const cells: (Date | null)[] = [
    ...Array<null>(lead).fill(null),
    ...Array.from({ length: days }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1)),
  ];

  return (
    <div className="drp-month">
      <div className="drp-month-name">
        {month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
      </div>
      <div className="drp-grid">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <span key={`${d}${i}`} className="drp-dow">
            {d}
          </span>
        ))}
        {cells.map((d, i) => {
          if (!d) return <span key={`e${i}`} />;
          // While a start has been clicked and an end has not, the highlight follows the click
          // rather than the committed range — otherwise the first click appears to do nothing.
          const lo = pending ?? range.from;
          const hi = pending ?? range.to;
          const inRange = pending
            ? false
            : d >= startOfDay(range.from) && d <= startOfDay(range.to);
          const isEdge = sameDay(d, lo) || sameDay(d, hi);
          const future = d > today;
          return (
            <button
              key={d.toISOString()}
              type="button"
              disabled={future}
              className={`drp-day${inRange ? " drp-in" : ""}${isEdge ? " drp-edge" : ""}${future ? " drp-off" : ""}`}
              onClick={() => onPick(d)}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Presets on the left, two months on the right, Apply to commit.
 *
 * Nothing is applied until Apply. A picker that reloads on every click reloads twice for one range
 * — once on a half-made selection that was never asked for — and on a table this size that is a
 * query nobody wanted.
 */
export function DateRangePicker({
  value,
  onChange,
}: {
  value: DayRange;
  onChange: (r: DayRange) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DayRange>(value);
  const [pending, setPending] = useState<Date | null>(null);
  const [leftMonth, setLeftMonth] = useState<Date>(addMonths(value.to, -1));
  const boxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setDraft(value);
    setPending(null);
    setLeftMonth(addMonths(value.to, -1));
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const activePreset = useMemo(() => matchingPreset(value), [value]);
  const label = activePreset ?? `${formatDay(value.from)} – ${formatDay(value.to)}`;

  function pick(d: Date) {
    if (!pending) {
      setPending(d);
      return;
    }
    // Clicks in either order make the same range. Requiring start-before-end is a rule the person
    // clicking does not know they are breaking until nothing happens.
    const from = d < pending ? d : pending;
    const to = d < pending ? pending : d;
    setDraft({ from, to });
    setPending(null);
  }

  return (
    <div className="drp" ref={boxRef}>
      <button type="button" className="input drp-trigger" onClick={() => setOpen((v) => !v)}>
        {label}
        <span className="drp-caret">▾</span>
      </button>

      {open ? (
        <div className="drp-pop">
          <div className="drp-presets">
            {PRESETS.map((p) => {
              const b = p.build(startOfDay(new Date()));
              const on = sameDay(b.from, draft.from) && sameDay(b.to, draft.to);
              return (
                <button
                  key={p.label}
                  type="button"
                  className={`drp-preset${on ? " drp-preset-on" : ""}`}
                  onClick={() => {
                    setDraft(b);
                    setPending(null);
                    setLeftMonth(addMonths(b.to, -1));
                  }}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          <div className="drp-right">
            <div className="drp-inputs">
              <label>
                Start
                <input className="input" readOnly value={formatDay(draft.from)} />
              </label>
              <span className="drp-dash">–</span>
              <label>
                End
                <input className="input" readOnly value={formatDay(draft.to)} />
              </label>
            </div>

            <div className="drp-nav">
              <button type="button" className="drp-navbtn" onClick={() => setLeftMonth(addMonths(leftMonth, -1))}>
                ‹
              </button>
              <button
                type="button"
                className="drp-navbtn"
                disabled={addMonths(leftMonth, 1) >= addMonths(new Date(), 0)}
                onClick={() => setLeftMonth(addMonths(leftMonth, 1))}
              >
                ›
              </button>
            </div>

            <div className="drp-months">
              <MonthGrid month={leftMonth} range={draft} pending={pending} onPick={pick} />
              <MonthGrid month={addMonths(leftMonth, 1)} range={draft} pending={pending} onPick={pick} />
            </div>

            <div className="drp-actions">
              <button type="button" className="btn btn-outline" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  onChange(draft);
                  setOpen(false);
                }}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
