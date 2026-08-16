import React from "react";

/**
 * A wall-clock time for one event, to the millisecond.
 *
 * Seconds are not enough resolution for an event feed. A single tap emits several events at once —
 * a screen view, the action, and whatever outcome follows — and at second granularity they all read
 * `15:14:43`, so the one question these lists are used to answer, *what fired before what*, has no
 * answer on screen. `toLocaleTimeString()` cannot show fractions, hence the manual assembly.
 *
 * 24-hour and fixed-width on purpose: these are read as a column, and a 12-hour clock puts a
 * variable-width "PM" where the eye is scanning for a digit.
 */
export function timeWithMillis(iso: string): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "—";
  const hh = String(at.getHours()).padStart(2, "0");
  const mm = String(at.getMinutes()).padStart(2, "0");
  const ss = String(at.getSeconds()).padStart(2, "0");
  const ms = String(at.getMilliseconds()).padStart(3, "0");
  return `${hh}:${mm}:${ss}.${ms}`;
}

/**
 * The time one event fired, built to be compared against the row above it.
 *
 * That comparison is the whole reason the time is on screen, and the first version made it hard in
 * three ways at once. The digits sat in the page's proportional font, so `17:05:52.375` and
 * `17:05:52.353` did not line up column-for-column and the eye had to read both numbers instead of
 * spotting the one that differed. Everything was #a1a1aa on white — about 2.5:1, under the 4.5:1
 * that small text needs — and the milliseconds, the only part that actually differs between events
 * from the same tap, were the smallest, faintest thing in the row. And a leading "—" was printed
 * for every event with no screen name, so the line usually opened with a placeholder.
 *
 * So: a monospace stack (guaranteed tabular figures — `font-variant-numeric` only helps if the font
 * happens to carry them), readable contrast, and the fraction kept one step lighter than the clock
 * rather than hidden. Alignment does most of the work; once the digits stack, the one that changed
 * is the one that moves.
 *
 * It lives here, and not in the page that first needed it, because the same comparison is made on
 * Live Events and on Event Discovery. A second copy is how one of them gets a fix and the other
 * quietly keeps the bug.
 */
export function EventTime({ iso }: { iso: string }) {
  const full = timeWithMillis(iso);
  if (full === "—") return <span style={{ color: "var(--md-sys-color-on-surface-variant)" }}>—</span>;
  const [clock, fraction] = full.split(".");
  return (
    <span
      title={new Date(iso).toISOString()}
      style={{
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
        fontVariantNumeric: "tabular-nums",
        letterSpacing: "-0.01em",
        color: "var(--md-sys-color-on-surface)",
        whiteSpace: "nowrap",
      }}
    >
      {clock}
      {/* One step lighter than the clock, but still 4.83:1 — measured. The obvious choice here is a
          soft grey around #8e8e97, which comes out at 3.25:1 and would have left the milliseconds,
          the only part that differs between events from one tap, as the least legible thing on the
          row. Lighter must not mean unreadable. */}
      <span style={{ color: "var(--md-sys-color-on-surface-variant)" }}>.{fraction}</span>
    </span>
  );
}
