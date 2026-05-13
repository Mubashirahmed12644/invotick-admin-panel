import type { CSSProperties } from "react";
import styles from "@/features/invoice-preview/styles/invoice-preview.module.css";
import type {
  InvoicePreviewCurrency,
  InvoicePreviewLineItem,
  InvoicePreviewTemplate,
  InvoicePreviewTranslations,
} from "@/features/invoice-preview/types/invoice-preview.types";

interface InvoiceItemsTableProps {
  items: InvoicePreviewLineItem[];
  currency: InvoicePreviewCurrency;
  template: InvoicePreviewTemplate;
  translations: InvoicePreviewTranslations;
  minRows?: number;
  serialStart?: number;
  shouldRender?: boolean;
}

function toRgba(hexColor: string, alpha: number): string {
  const normalized = hexColor.trim().replace("#", "");
  const valid =
    /^[0-9a-fA-F]{6}$/.test(normalized) ||
    /^[0-9a-fA-F]{3}$/.test(normalized);

  if (!valid) {
    return `rgba(37, 99, 235, ${alpha})`;
  }

  const full = normalized.length === 3
    ? normalized.split("").map((char) => `${char}${char}`).join("")
    : normalized;

  const r = Number.parseInt(full.slice(0, 2), 16);
  const g = Number.parseInt(full.slice(2, 4), 16);
  const b = Number.parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getHeaderTextColor(hexColor: string): "#000000" | "#FFFFFF" {
  const normalized = hexColor.trim().replace("#", "");
  const valid =
    /^[0-9a-fA-F]{6}$/.test(normalized) ||
    /^[0-9a-fA-F]{3}$/.test(normalized);

  if (!valid) {
    return "#FFFFFF";
  }

  const full = normalized.length === 3
    ? normalized.split("").map((char) => `${char}${char}`).join("")
    : normalized;

  const r = Number.parseInt(full.slice(0, 2), 16);
  const g = Number.parseInt(full.slice(2, 4), 16);
  const b = Number.parseInt(full.slice(4, 6), 16);

  // YIQ contrast formula: higher value means lighter background.
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return yiq >= 150 ? "#000000" : "#FFFFFF";
}

function formatAmount(value: number | null | undefined, currency: InvoicePreviewCurrency): string {
  if (value === null || value === undefined) return " ";
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

function renderCellValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return "\u00A0";
  }

  return String(value);
}

function CellText({ value }: { value: string | number | null | undefined }) {
  return <span className={styles.itemsCellText}>{renderCellValue(value)}</span>;
}

export default function InvoiceItemsTable({
  items,
  currency,
  template,
  translations,
  minRows = 0,
  serialStart = 1,
  shouldRender = true,
}: InvoiceItemsTableProps) {
  if (!shouldRender) return null;
  if (items.length === 0) return null;

  const displayRows: Array<InvoicePreviewLineItem | null> = [...items];
  while (displayRows.length < minRows) {
    displayRows.push(null);
  }

  const headerAlign = (template.itemTableHeaderAlignment?.toLowerCase() || "left") as "left" | "center" | "right";
  const bodyAlign = (template.itemTableBodyAlignment?.toLowerCase() || "left") as "left" | "center" | "right";
  const amountAlign = "right" as const;
  const primaryColor = template.color || "#DC2626";
  const headerTextColor = getHeaderTextColor(primaryColor);
  const tableThemeVars = {
    "--invoice-table-primary": primaryColor,
    "--invoice-table-primary-soft": toRgba(primaryColor, 0.12),
    "--invoice-table-primary-contrast": headerTextColor,
  } as CSSProperties;
  const columnWidths = {
    serial: "6%",
    // Requested set was 98%; keep proportions and normalize to 100%.
    description: "36%",
    qty: "10%",
    price: "14%",
    discount: "10%",
    tax: "8%",
    amount: "16%",
  };

  return (
    <section
      className={styles.itemsWrap}
      data-invoice-items-wrap="true"
      style={tableThemeVars}
    >
      <table className={styles.itemsTable} data-invoice-items-table="true">
        <thead data-invoice-items-head="true">
          <tr>
            <th style={{ width: columnWidths.serial, textAlign: headerAlign }}>S#</th>
            <th style={{ width: columnWidths.description, textAlign: headerAlign }}>{translations.itemDescriptionHeader}</th>
            <th style={{ width: columnWidths.qty, textAlign: headerAlign }}>{translations.itemQtyHeader}</th>
            <th style={{ width: columnWidths.price, textAlign: headerAlign }}>{translations.itemPriceHeader}</th>
            <th style={{ width: columnWidths.discount, textAlign: headerAlign }}>{translations.itemDiscountHeader}</th>
            <th style={{ width: columnWidths.tax, textAlign: headerAlign }}>{translations.itemTaxHeader}</th>
            <th style={{ width: columnWidths.amount, textAlign: amountAlign }}>{translations.itemAmountHeader}</th>
          </tr>
        </thead>
        <tbody>
          {displayRows.map((item, index) => (
            <tr key={item?.id || `blank-${index}`}>
              <td style={{ textAlign: bodyAlign }}>
                <CellText value={item ? serialStart + index : ""} />
              </td>
              <td style={{ textAlign: bodyAlign }}>
                <CellText
                  value={item ? `${item.name}${item.description ? ` - ${item.description}` : ""}` : ""}
                />
              </td>
              <td style={{ textAlign: bodyAlign }}>
                <CellText value={item ? item.quantity.toFixed(2) : ""} />
              </td>
              <td style={{ textAlign: bodyAlign }}>
                <CellText value={item ? formatAmount(item.unitPrice, currency) : ""} />
              </td>
              <td style={{ textAlign: bodyAlign }}>
                <CellText value={item ? formatAmount(item.discountAmount, currency) : ""} />
              </td>
              <td style={{ textAlign: bodyAlign }}>
                <CellText value={item ? formatAmount(item.taxAmount, currency) : ""} />
              </td>
              <td style={{ textAlign: amountAlign }}>
                <CellText value={item ? formatAmount(item.total, currency) : ""} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
