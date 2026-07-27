"use client";

import { useRef, useState } from "react";
import { formatCurrency } from "@/lib/format";
import type { WebpanelCurrencyTotal } from "@/lib/types";

/**
 * A user's invoice total, with the per-currency truth a hover away.
 *
 * The headline number adds every invoice together whatever currency it is in. For the ~1,050 users
 * who bill in one currency that is exactly right. For the 120 who bill in more than one it is PKR
 * plus ZWL plus INR — not a wrong figure so much as a meaningless one, and printing "$" in front of
 * it claims it is dollars.
 *
 * So: when there is only one currency, the cell simply shows it, correctly labelled. When there is
 * more than one, it says how many and the breakdown appears on hover — each currency's own exact
 * total, unconverted. No exchange rate is involved, so nothing here can go stale.
 */
export function CurrencyTotalCell({
  total,
  byCurrency,
}: {
  total: number;
  byCurrency?: WebpanelCurrencyTotal[];
}) {
  const [open, setOpen] = useState(false);
  // Deliberate: the breakdown is for someone who paused on the number, not for anyone whose pointer
  // crossed the column on its way elsewhere.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const rows = (byCurrency ?? []).filter((r) => r.currency);
  const single = rows.length === 1 ? rows[0] : null;
  const mixed = rows.length > 1;

  const show = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(true), 500);
  };
  const hide = () => {
    if (timer.current) clearTimeout(timer.current);
    setOpen(false);
  };

  return (
    <span
      className="users-cell currency-total-cell"
      onMouseEnter={mixed ? show : undefined}
      onMouseLeave={mixed ? hide : undefined}
    >
      {single ? (
        // One currency: no ambiguity, so label it properly rather than defaulting to dollars.
        formatCurrency(Number(single.amount), single.currency)
      ) : mixed ? (
        <span className="currency-total-mixed">
          {rows.length} currencies
          <span className="currency-total-hint">?</span>
        </span>
      ) : (
        // No breakdown available (a date-filtered view, or no invoices) — show the raw figure with
        // no currency symbol rather than inventing one.
        <span className="currency-total-plain">{total ? total.toLocaleString() : "-"}</span>
      )}

      {open && mixed && (
        <span className="currency-total-popover" role="tooltip">
          {rows.map((r) => (
            <span key={r.currency} className="currency-total-row">
              <span className="currency-total-code">{r.currency}</span>
              <span className="currency-total-amount">
                {formatCurrency(Number(r.amount), r.currency)}
              </span>
              <span className="currency-total-count">
                {r.invoices} {r.invoices === 1 ? "invoice" : "invoices"}
              </span>
            </span>
          ))}
          <span className="currency-total-note">Not converted — each currency&apos;s own total.</span>
        </span>
      )}
    </span>
  );
}
