"use client";

import { useRef, useState } from "react";
import { formatCurrency } from "@/lib/format";
import type { WebpanelCurrencyTotal } from "@/lib/types";

/**
 * A user's invoice totals, one per currency, exactly as the backend summed them.
 *
 * Nothing here adds one currency to another. The list used to show one number per user made of PKR plus
 * MMK plus USD, sort by it and filter on it, and its footer added 103 currencies into one "$58 quadrillion"
 * (the audit of 2026-09-28). Now:
 * - with a currency picked above the list, the cell shows the user's total in that currency, or "-";
 * - otherwise it shows the currency the user bills in most (by invoices), and "+n" when there are others;
 * - the whole breakdown appears on hover, each currency's own exact total, unconverted.
 */
export function CurrencyTotalCell({
  byCurrency,
  focus,
}: {
  byCurrency?: WebpanelCurrencyTotal[];
  /** The currency picked above the list, if any. */
  focus?: string;
}) {
  const [open, setOpen] = useState(false);
  // Deliberate: the breakdown is for someone who paused on the number, not for anyone whose pointer
  // crossed the column on its way elsewhere.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const rows = (byCurrency ?? []).filter((r) => r.currency);
  const shown = focus ? rows.find((r) => r.currency === focus) ?? null : rows[0] ?? null;
  const others = focus ? rows.length - (shown ? 1 : 0) : rows.length - 1;

  const show = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(true), 400);
  };
  const hide = () => {
    if (timer.current) clearTimeout(timer.current);
    setOpen(false);
  };

  return (
    <span
      className="users-cell currency-total-cell"
      onMouseEnter={rows.length > 0 ? show : undefined}
      onMouseLeave={rows.length > 0 ? hide : undefined}
    >
      {shown ? (
        <span>{formatCurrency(Number(shown.amount), shown.currency)}</span>
      ) : (
        <span className="currency-total-plain">-</span>
      )}
      {others > 0 ? <span className="currency-total-hint">+{others}</span> : null}

      {open && rows.length > 0 && (
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
          <span className="currency-total-note">Not converted and never added together — each currency&apos;s own total.</span>
        </span>
      )}
    </span>
  );
}
