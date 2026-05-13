import type { CSSProperties } from "react";
import styles from "@/features/invoice-preview/styles/invoice-preview.module.css";
import type {
  InvoicePreviewCurrency,
  InvoicePreviewTemplate,
  InvoicePreviewTotals,
  InvoicePreviewTranslations,
} from "@/features/invoice-preview/types/invoice-preview.types";

interface InvoiceTotalsProps {
  totals: InvoicePreviewTotals;
  currency: InvoicePreviewCurrency;
  template: InvoicePreviewTemplate;
  translations: InvoicePreviewTranslations;
  shouldRender?: boolean;
}

function formatAmount(value: number, currency: InvoicePreviewCurrency): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.code,
      maximumFractionDigits: currency.decimals,
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency.code}`;
  }
}

export default function InvoiceTotals({ totals, currency, template, translations, shouldRender = true }: InvoiceTotalsProps) {
  if (!shouldRender) return null;

  const primaryColorVars = {
    "--invoice-table-primary": template.color || "#DC2626",
  } as CSSProperties;

  return (
    <article className={styles.totals} style={primaryColorVars}>
      <div className={styles.totalsRow}>
        <span>{translations.subtotalLabel}</span>
        <strong>{formatAmount(totals.subtotal, currency)}</strong>
      </div>
      <div className={styles.totalsRow}>
        <span>{translations.discountLabel}</span>
        <strong>{formatAmount(totals.discountAmount, currency)}</strong>
      </div>
      <div className={styles.totalsRow}>
        <span>{translations.taxLabel}</span>
        <strong>{formatAmount(totals.taxAmount, currency)}</strong>
      </div>
      <div className={styles.totalsRow}>
        <span>{translations.shippingLabel}</span>
        <strong>{formatAmount(totals.shippingCost, currency)}</strong>
      </div>
      <div
        className={`${styles.totalsRow} ${styles.finalTotal}`}
        style={{ background: template.color || "#DC2626" }}
      >
        <span>{translations.totalLabel}</span>
        <strong>{formatAmount(totals.total, currency)}</strong>
      </div>
    </article>
  );
}
