"use client";

import { useMemo, useState } from "react";
import SearchBar from "@/components/SearchBar";
import EmptyState from "@/components/EmptyState";
import { filterByQuery } from "@/lib/search";
import { fallbackText, formatCurrency, formatDate } from "@/lib/format";
import type { WebpanelInvoiceSummaryResponse } from "@/lib/types";

interface InvoiceTableProps {
  invoices: WebpanelInvoiceSummaryResponse[];
  onSelect: (invoiceId: string) => void;
}

type SortKey =
  | "invoiceNumber"
  | "clientName"
  | "invoiceDate"
  | "dueDate"
  | "totalAmount"
  | "currency"
  | "status";

type SortDirection = "asc" | "desc" | null;

const SORT_COLUMNS: Array<{ key: SortKey; label: string }> = [
  { key: "invoiceNumber", label: "Invoice Number" },
  { key: "clientName", label: "Client Name" },
  { key: "invoiceDate", label: "Invoice Date" },
  { key: "dueDate", label: "Due Date" },
  { key: "totalAmount", label: "Total Amount" },
  { key: "currency", label: "Currency" },
  { key: "status", label: "Status" },
];

function toDateValue(value: string | null): number {
  if (!value) return Number.NEGATIVE_INFINITY;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed;
}

function compareInvoices(
  a: WebpanelInvoiceSummaryResponse,
  b: WebpanelInvoiceSummaryResponse,
  sortKey: SortKey,
  sortDirection: Exclude<SortDirection, null>,
): number {
  const direction = sortDirection === "asc" ? 1 : -1;

  switch (sortKey) {
    case "invoiceNumber":
      return fallbackText(a.invoiceNumber, "").localeCompare(fallbackText(b.invoiceNumber, "")) * direction;
    case "clientName":
      return fallbackText(a.clientName, "").localeCompare(fallbackText(b.clientName, "")) * direction;
    case "invoiceDate":
      return (toDateValue(a.invoiceDate) - toDateValue(b.invoiceDate)) * direction;
    case "dueDate":
      return (toDateValue(a.dueDate) - toDateValue(b.dueDate)) * direction;
    case "totalAmount":
      return ((a.totalAmount ?? Number.NEGATIVE_INFINITY) - (b.totalAmount ?? Number.NEGATIVE_INFINITY)) * direction;
    case "currency":
      return fallbackText(a.currency, "").localeCompare(fallbackText(b.currency, "")) * direction;
    case "status":
      return fallbackText(a.status, "").localeCompare(fallbackText(b.status, "")) * direction;
    default:
      return 0;
  }
}

export default function InvoiceTable({ invoices, onSelect }: InvoiceTableProps) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  const filteredInvoices = useMemo(
    () => filterByQuery(invoices, query),
    [invoices, query],
  );

  const sortedInvoices = useMemo(() => {
    if (!sortKey || !sortDirection) {
      return filteredInvoices;
    }

    return [...filteredInvoices].sort((a, b) => compareInvoices(a, b, sortKey, sortDirection));
  }, [filteredInvoices, sortDirection, sortKey]);

  function handleSort(columnKey: SortKey) {
    if (sortKey !== columnKey) {
      setSortKey(columnKey);
      setSortDirection("asc");
      return;
    }

    if (sortDirection === "asc") {
      setSortDirection("desc");
      return;
    }

    if (sortDirection === "desc") {
      setSortKey(null);
      setSortDirection(null);
      return;
    }

    setSortDirection("asc");
  }

  return (
    <section className="section-card">
      <h2>Invoices</h2>
      <SearchBar
        value={query}
        onChange={setQuery}
        label="Search Invoices"
        placeholder="Search invoices by any field"
      />
      {filteredInvoices.length === 0 ? (
        <EmptyState message={query ? "No invoices match your search." : "No invoices found."} />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {SORT_COLUMNS.map((column) => {
                  const isActive = sortKey === column.key;
                  const arrow = !isActive || !sortDirection ? "↕" : sortDirection === "asc" ? "↑" : "↓";

                  return (
                    <th key={column.key}>
                      <button
                        type="button"
                        className={`table-sort-button ${isActive ? "table-sort-button-active" : ""}`}
                        onClick={() => handleSort(column.key)}
                      >
                        <span>{column.label}</span>
                        <span className="table-sort-arrow" aria-hidden="true">{arrow}</span>
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {sortedInvoices.map((invoice) => (
                <tr key={invoice.id} onClick={() => onSelect(invoice.id)} className="click-row">
                  <td>{fallbackText(invoice.invoiceNumber)}</td>
                  <td>{fallbackText(invoice.clientName)}</td>
                  <td>{formatDate(invoice.invoiceDate)}</td>
                  <td>{formatDate(invoice.dueDate)}</td>
                  <td>{formatCurrency(invoice.totalAmount, invoice.currency)}</td>
                  <td>{fallbackText(invoice.currency)}</td>
                  <td>{fallbackText(invoice.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
