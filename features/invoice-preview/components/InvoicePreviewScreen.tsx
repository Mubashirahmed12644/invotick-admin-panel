"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import InvoiceItemsTable from "@/features/invoice-preview/components/InvoiceItemsTable";
import InvoicePage from "@/features/invoice-preview/components/InvoicePage";
import TemplateVisibilityPanel from "@/features/invoice-preview/components/TemplateVisibilityPanel";
import styles from "@/features/invoice-preview/styles/invoice-preview.module.css";
import type { InvoicePreviewDocument, InvoicePreviewLineItem } from "@/features/invoice-preview/types/invoice-preview.types";

interface InvoicePreviewScreenProps {
  data: InvoicePreviewDocument;
  pdfMode?: boolean;
  assetAuthKey?: string | null;
  assetBearerToken?: string | null;
}

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;
const PAGE_GAP = 18;
const TABLE_HEADER_HEIGHT = 23;
const TABLE_ROW_HEIGHT = 20;
const ITEMS_WRAP_BORDER = 2;
const ITEMS_ONLY_BOTTOM_GAP = 56;
const LAYOUT_EPSILON = 0.5;
const PDF_LAYOUT_SCALE = 4 / 3;
const MIN_ITEM_ROWS = 9;

interface TableMeasurements {
  headerHeight: number;
  rowHeights: number[];
}

interface RowBudgets {
  single: number;
  first: number;
  middle: number;
  last: number;
}

interface PaginationMeasurements extends TableMeasurements {
  budgets: RowBudgets;
  summaryRowHeight: number;
}

const FALLBACK_CALIBRATION_ITEM: InvoicePreviewLineItem = {
  id: "00000000-0000-0000-0000-000000000001",
  invoiceId: "00000000-0000-0000-0000-000000000000",
  productId: "00000000-0000-0000-0000-000000000002",
  position: 1,
  quantity: 1,
  name: "Calibration Item",
  unitPrice: 100,
  netPrice: 100,
  description: "Layout calibration row",
  categoryId: null,
  unitTypeId: null,
  discountValue: null,
  discountAmount: 0,
  discountType: null,
  taxAmount: null,
  subtotal: null,
  total: 100,
  taxId: null,
  dateCreated: null,
  dateUpdated: null,
  dateDeleted: null,
  isDeleted: false,
  isSynced: true,
  tax: null,
  unitType: null,
  category: null,
};

function parsePx(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function almostEqual(a: number, b: number, epsilon = 0.1): boolean {
  return Math.abs(a - b) <= epsilon;
}

function measurementsEqual(
  current: PaginationMeasurements | null,
  next: PaginationMeasurements,
): boolean {
  if (!current) return false;

  if (!almostEqual(current.headerHeight, next.headerHeight)) return false;
  if (!almostEqual(current.budgets.single, next.budgets.single)) return false;
  if (!almostEqual(current.budgets.first, next.budgets.first)) return false;
  if (!almostEqual(current.budgets.middle, next.budgets.middle)) return false;
  if (!almostEqual(current.budgets.last, next.budgets.last)) return false;
  if (!almostEqual(current.summaryRowHeight, next.summaryRowHeight)) return false;

  if (current.rowHeights.length !== next.rowHeights.length) return false;
  for (let index = 0; index < current.rowHeights.length; index += 1) {
    if (!almostEqual(current.rowHeights[index]!, next.rowHeights[index]!)) {
      return false;
    }
  }

  return true;
}

function outerHeightWithMargins(element: HTMLElement): number {
  const style = window.getComputedStyle(element);
  return (
    element.getBoundingClientRect().height +
    parsePx(style.marginTop) +
    parsePx(style.marginBottom)
  );
}

function getTableMaxHeightForPage(pageElement: HTMLElement): number | null {
  const pageRect = pageElement.getBoundingClientRect();
  const borderTop = parsePx(window.getComputedStyle(pageElement).borderTopWidth);

  const footer = pageElement.querySelector('[data-invoice-footer="true"]') as HTMLElement | null;
  const itemsWrap = pageElement.querySelector('[data-invoice-items-wrap="true"]') as HTMLElement | null;
  if (!footer || !itemsWrap) return null;

  const footerTop = footer.getBoundingClientRect().top - pageRect.top - borderTop;
  const itemsTop = itemsWrap.getBoundingClientRect().top - pageRect.top - borderTop;
  const availableHeight = footerTop - itemsTop - 10;

  const minimumTableHeight = TABLE_HEADER_HEIGHT + TABLE_ROW_HEIGHT + ITEMS_WRAP_BORDER;
  return Math.max(minimumTableHeight, availableHeight);
}

function toRowBudget(maxTableHeight: number, headerHeight: number): number {
  const rowsHeight = maxTableHeight - headerHeight - ITEMS_WRAP_BORDER;
  return Math.max(TABLE_ROW_HEIGHT, rowsHeight);
}

function measureTableRows(
  tableMeasureRoot: HTMLElement,
  expectedItemCount: number,
): TableMeasurements | null {
  if (expectedItemCount === 0) {
    return { headerHeight: TABLE_HEADER_HEIGHT, rowHeights: [] };
  }

  const headerRow = tableMeasureRoot.querySelector("thead tr");
  const bodyRows = Array.from(tableMeasureRoot.querySelectorAll("tbody tr"));

  if (!headerRow || bodyRows.length < expectedItemCount) {
    return null;
  }

  return {
    headerHeight: Math.max(TABLE_HEADER_HEIGHT, headerRow.getBoundingClientRect().height),
    rowHeights: bodyRows.slice(0, expectedItemCount).map((row) =>
      Math.max(TABLE_ROW_HEIGHT, row.getBoundingClientRect().height),
    ),
  };
}

function measureLayoutBudgets(
  layoutMeasureRoot: HTMLElement,
  headerHeight: number,
): RowBudgets | null {
  const readBudget = (kind: "single" | "first" | "middle" | "last"): number | null => {
    const wrapper = layoutMeasureRoot.querySelector(
      `[data-calibration-kind="${kind}"]`,
    ) as HTMLElement | null;
    if (!wrapper) return null;

    const page = wrapper.querySelector('[data-invoice-page="true"]') as HTMLElement | null;
    if (!page) return null;

    const maxTableHeight = getTableMaxHeightForPage(page);
    if (maxTableHeight == null) return null;

    return toRowBudget(maxTableHeight, headerHeight);
  };

  const single = readBudget("single");
  const first = readBudget("first");
  const middle = readBudget("middle");
  const last = readBudget("last");

  if (single == null || first == null || middle == null || last == null) {
    return null;
  }

  return { single, first, middle, last };
}

function measureSummaryRowHeight(layoutMeasureRoot: HTMLElement): number {
  const lastCalib = layoutMeasureRoot.querySelector('[data-calibration-kind="last"]') as HTMLElement | null;
  if (!lastCalib) return 0;
  const summaryRow = lastCalib.querySelector('[data-invoice-summary-row="true"]') as HTMLElement | null;
  if (!summaryRow) return 0;
  return outerHeightWithMargins(summaryRow);
}

function fallbackBudgets(hasTerms: boolean, headerHeight: number): RowBudgets {
  const first = toRowBudget(A4_HEIGHT - 194 - ITEMS_ONLY_BOTTOM_GAP, headerHeight);
  const middle = toRowBudget(A4_HEIGHT - 14 - ITEMS_ONLY_BOTTOM_GAP, headerHeight);
  const last = toRowBudget(A4_HEIGHT - 130 - (hasTerms ? 168 : 0), headerHeight);
  const single = toRowBudget(A4_HEIGHT - 194 - 130 - (hasTerms ? 168 : 0), headerHeight);
  return { single, first, middle, last };
}

function paginateItems(
  items: InvoicePreviewLineItem[],
  showItemTable: boolean,
  hasTerms: boolean,
  measurements: PaginationMeasurements | null,
): InvoicePreviewLineItem[][] {
  if (!showItemTable || items.length === 0) {
    return [items];
  }

  const headerHeight = measurements?.headerHeight ?? TABLE_HEADER_HEIGHT;
  const rowHeights =
    measurements?.rowHeights.length === items.length
      ? measurements.rowHeights
      : Array.from({ length: items.length }, () => TABLE_ROW_HEIGHT);
  const budgets = measurements?.budgets ?? fallbackBudgets(hasTerms, headerHeight);

  const prefixSums = rowHeights.reduce<number[]>((acc, rowHeight) => {
    const last = acc[acc.length - 1] ?? 0;
    acc.push(last + rowHeight);
    return acc;
  }, [0]);

  const sumHeights = (start: number, end: number): number => prefixSums[end]! - prefixSums[start]!;

  if (sumHeights(0, items.length) <= budgets.first) {
    return [items];
  }

  const takeUntilBudget = (start: number, budget: number): number => {
    let cursor = start;

    while (cursor < items.length) {
      const nextHeight = sumHeights(start, cursor + 1);
      if (nextHeight > budget) {
        break;
      }
      cursor += 1;
    }

    // Always move at least one row to avoid deadlocks on oversized rows.
    if (cursor === start) {
      return Math.min(items.length, start + 1);
    }

    return cursor;
  };

  const pages: InvoicePreviewLineItem[][] = [];
  let cursor = 0;

  const firstSliceEnd = takeUntilBudget(cursor, budgets.first);
  pages.push(items.slice(cursor, firstSliceEnd));
  cursor = firstSliceEnd;

  const remainingHeight = (start: number): number => sumHeights(start, items.length);

  while (remainingHeight(cursor) > budgets.middle && cursor < items.length - 1) {
    const middleSliceEnd = takeUntilBudget(cursor, budgets.middle);
    pages.push(items.slice(cursor, middleSliceEnd));
    cursor = middleSliceEnd;
  }

  pages.push(items.slice(cursor));

  return pages;
}

interface VisibilityState {
  showBusinessLogo: boolean;
  showInvoiceMeta: boolean;
  showTitle: boolean;
  showSender: boolean;
  showReceiver: boolean;
  showPayment: boolean;
  showNotes: boolean;
  showSignature: boolean;
  showStamp: boolean;
  showTerms: boolean;
  showTotal: boolean;
  showItemTable: boolean;
}

export default function InvoicePreviewScreen({
  data,
  pdfMode = false,
  assetAuthKey = null,
  assetBearerToken = null,
}: InvoicePreviewScreenProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const tableMeasureRef = useRef<HTMLDivElement | null>(null);
  const layoutMeasureRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);
  const [isDownloading, setIsDownloading] = useState(false);
  const [paginationMeasurements, setPaginationMeasurements] =
    useState<PaginationMeasurements | null>(null);
  const [visibility, setVisibility] = useState<VisibilityState>(() => ({
    showBusinessLogo: data.template?.showBusinessLogo ?? true,
    showInvoiceMeta: data.template?.showInvoiceMeta ?? true,
    showTitle: data.template?.showTitle ?? true,
    showSender: data.template?.showSender ?? true,
    showReceiver: data.template?.showReceiver ?? true,
    showPayment: data.template?.showPayment ?? true,
    showNotes: data.template?.showNotes ?? true,
    showSignature: data.template?.showSignature ?? true,
    showStamp: data.template?.showStamp ?? true,
    showTerms: data.template?.showTerms ?? true,
    showTotal: data.template?.showTotal ?? true,
    showItemTable: data.template?.showItemTable ?? true,
  }));

  const handleToggleVisibility = useCallback((key: keyof VisibilityState, value: boolean) => {
    setVisibility((prev) => ({ ...prev, [key]: value }));
  }, []);

  const hasTerms = Boolean(visibility.showTerms && data.terms?.description?.trim());
  const calibrationItem = useMemo(
    () => data.lineItems[0] ?? FALLBACK_CALIBRATION_ITEM,
    [data.lineItems],
  );

  const itemPages = useMemo(
    () =>
      paginateItems(
        data.lineItems,
        visibility.showItemTable,
        hasTerms,
        paginationMeasurements,
      ),
    [data.lineItems, visibility.showItemTable, hasTerms, paginationMeasurements],
  );

  const paginationReady = useMemo(() => {
    if (!visibility.showItemTable || data.lineItems.length === 0) {
      return true;
    }
    return paginationMeasurements !== null;
  }, [data.lineItems.length, visibility.showItemTable, paginationMeasurements]);

  const summaryFitsOnLastPage = useMemo(() => {
    if (!visibility.showTotal) return false;
    if (!paginationMeasurements || paginationMeasurements.summaryRowHeight <= 0) return true;

    const { rowHeights, headerHeight, budgets, summaryRowHeight } = paginationMeasurements;
    const lastPageItems = itemPages[itemPages.length - 1] ?? [];
    const itemsBefore = itemPages.slice(0, -1).reduce((c, p) => c + p.length, 0);

    const lastPageRowsHeight = lastPageItems.reduce((sum, _, i) => {
      return sum + (rowHeights[itemsBefore + i] ?? TABLE_ROW_HEIGHT);
    }, 0);

    const budget = itemPages.length === 1 ? budgets.first : budgets.middle;
    const remaining = budget - lastPageRowsHeight - headerHeight - ITEMS_WRAP_BORDER;
    return summaryRowHeight <= remaining;
  }, [itemPages, paginationMeasurements, visibility.showTotal]);

  const handleDownloadPdf = useCallback(async () => {
    if (typeof window === "undefined") return;
    if (isDownloading) return;

    setIsDownloading(true);

    try {
      const invoiceNumber = data.invoice.invoiceNumber || "invoice-preview";
      const safeName = invoiceNumber.replace(/[\\/:*?"<>|]/g, "_");
      const response = await fetch("/api/invoice-preview/pdf", {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filename: safeName,
          data,
          assetAuthKey,
          assetBearerToken,
        }),
      });

      if (!response.ok) {
        throw new Error(`PDF generation failed with status ${response.status}`);
      }

      const pdfBlob = await response.blob();
      const objectUrl = URL.createObjectURL(pdfBlob);
      const downloadAnchor = document.createElement("a");
      downloadAnchor.href = objectUrl;
      downloadAnchor.download = `${safeName}.pdf`;
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      // Keep UI silent for now; button state resets below.
    } finally {
      setIsDownloading(false);
    }
  }, [assetAuthKey, assetBearerToken, data, isDownloading]);

  useEffect(() => {
    if (pdfMode) {
      setScale(1);
      return;
    }

    const element = viewportRef.current;
    if (!element) return;

    const observer = new ResizeObserver((entries) => {
      const target = entries[0];
      if (!target) return;
      const available = target.contentRect.width - 32;
      const nextScale = Math.min(1, Math.max(0.45, available / A4_WIDTH));
      setScale(nextScale);
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [pdfMode]);

  useEffect(() => {
    const tableElement = tableMeasureRef.current;
    const layoutElement = layoutMeasureRef.current;
    if (!tableElement || !layoutElement) return;

    const frame = window.requestAnimationFrame(() => {
      const tableMeasurements = measureTableRows(tableElement, data.lineItems.length);
      if (!tableMeasurements) {
        setPaginationMeasurements(null);
        return;
      }

      const measurementScale = pdfMode ? PDF_LAYOUT_SCALE : 1;
      const normalizedHeaderHeight = tableMeasurements.headerHeight * measurementScale;
      const normalizedRowHeights = tableMeasurements.rowHeights.map(
        (rowHeight) => rowHeight * measurementScale,
      );

      const budgets = measureLayoutBudgets(layoutElement, normalizedHeaderHeight);
      // rawSummaryHeight is measured from inside .pageInner which already carries the
      // print transform (scale 4/3 in PDF mode), so no further scaling is needed.
      const rawSummaryHeight = measureSummaryRowHeight(layoutElement);
      const nextMeasurements: PaginationMeasurements = {
        headerHeight: normalizedHeaderHeight,
        rowHeights: normalizedRowHeights,
        budgets: budgets ?? fallbackBudgets(hasTerms, normalizedHeaderHeight),
        summaryRowHeight: rawSummaryHeight,
      };

      setPaginationMeasurements((previous) =>
        measurementsEqual(previous, nextMeasurements) ? previous : nextMeasurements,
      );
    });

    return () => window.cancelAnimationFrame(frame);
  }, [
    data,
    hasTerms,
    data.lineItems,
    pdfMode,
  ]);

  const effectiveScale = pdfMode ? 1 : scale;

  const totalPageCount = useMemo(
    () => itemPages.length + (visibility.showTotal && !summaryFitsOnLastPage ? 1 : 0),
    [itemPages.length, summaryFitsOnLastPage, visibility.showTotal],
  );

  const scaledHeight = useMemo(() => {
    const totalBaseHeight = (A4_HEIGHT * totalPageCount) + (PAGE_GAP * Math.max(0, totalPageCount - 1));
    return totalBaseHeight * effectiveScale;
  }, [effectiveScale, totalPageCount]);

  const renderPages = useCallback(
    (isSinglePageMode: boolean) => {
      const pages = itemPages.map((items, index) => {
        const isFirstPage = index === 0;
        const isLastItemsPage = index === itemPages.length - 1;
        const isVisuallyLastPage = isLastItemsPage && summaryFitsOnLastPage;
        const serialStart =
          itemPages.slice(0, index).reduce((count, pageItems) => count + pageItems.length, 0) + 1;

        const showHeader = isFirstPage && (visibility.showTitle || visibility.showInvoiceMeta || visibility.showBusinessLogo);
        const showSenderReceiver = isFirstPage && (visibility.showSender || visibility.showReceiver || visibility.showInvoiceMeta);
        const showTotals = isLastItemsPage && summaryFitsOnLastPage && visibility.showTotal;
        const showTermsBottom = isVisuallyLastPage && visibility.showTerms;
        const showOverlays = isVisuallyLastPage && (visibility.showSignature || visibility.showStamp);

        return (
          <InvoicePage
            key={`${isSinglePageMode ? "pdf" : "screen"}-invoice-page-${index + 1}`}
            data={data}
            items={items}
            serialStart={serialStart}
            showHeader={showHeader}
            showSenderReceiver={showSenderReceiver}
            showTotals={showTotals}
            showTermsBottom={showTermsBottom}
            showOverlays={showOverlays}
            showItemTable={visibility.showItemTable}
            showTitle={visibility.showTitle}
            showBusinessLogo={visibility.showBusinessLogo}
            showInvoiceMeta={visibility.showInvoiceMeta}
            showSender={visibility.showSender}
            showReceiver={visibility.showReceiver}
            showPayment={visibility.showPayment}
            showNotes={visibility.showNotes}
            showTerms={visibility.showTerms}
            showSignature={visibility.showSignature}
            showStamp={visibility.showStamp}
            assetAuthKey={assetAuthKey}
            minRows={MIN_ITEM_ROWS}
          />
        );
      });

      if (visibility.showTotal && !summaryFitsOnLastPage) {
        const serialStart = itemPages.reduce((c, p) => c + p.length, 0) + 1;
        pages.push(
          <InvoicePage
            key={`${isSinglePageMode ? "pdf" : "screen"}-invoice-page-totals`}
            data={data}
            items={[]}
            serialStart={serialStart}
            showHeader={false}
            showSenderReceiver={false}
            showTotals
            showTermsBottom={hasTerms}
            showOverlays={visibility.showSignature || visibility.showStamp}
            showItemTable={false}
            showTitle={false}
            showBusinessLogo={false}
            showInvoiceMeta={false}
            showSender={false}
            showReceiver={false}
            showPayment={visibility.showPayment}
            showNotes={visibility.showNotes}
            showTerms={visibility.showTerms}
            showSignature={visibility.showSignature}
            showStamp={visibility.showStamp}
            assetAuthKey={assetAuthKey}
            minRows={0}
          />,
        );
      }

      return pages;
    },
    [assetAuthKey, data, hasTerms, itemPages, summaryFitsOnLastPage, visibility],
  );

  return (
    <section
      className={`${styles.screen} invoice-print-root`}
      data-invoice-pagination-ready={paginationReady ? "1" : "0"}
      data-invoice-page-count={String(totalPageCount)}
    >
      {!pdfMode ? (
        <div className={styles.toolbar}>
          <p className={styles.toolbarMeta}>
            Pixel-focused mobile parity preview using hardcoded dummy data (no API).
          </p>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => void handleDownloadPdf()}
            disabled={isDownloading}
          >
            {isDownloading ? "Preparing PDF..." : "Download PDF"}
          </button>
        </div>
      ) : null}

      {!pdfMode ? (
        <div className={styles.screenContent}>
          <div className={styles.invoiceContainer}>
            <div className={styles.paperViewport} ref={viewportRef}>
              <div className={styles.paperScaleHeight} style={{ height: `${scaledHeight}px` }}>
                <div
                  className={styles.paperScaleWrap}
                  style={{ transform: `scale(${effectiveScale})` }}
                >
                  <div className={styles.pagesStack}>{renderPages(false)}</div>
                </div>
              </div>
            </div>
          </div>
          <div className={styles.sidebarContainer}>
            <TemplateVisibilityPanel visibility={visibility} onToggle={handleToggleVisibility} />
          </div>
        </div>
      ) : (
        <div className={styles.pdfDocumentRoot}>
          <div className={styles.pagesStackPdf}>{renderPages(true)}</div>
        </div>
      )}

      <div ref={tableMeasureRef} className={styles.measureHost} aria-hidden>
        <InvoiceItemsTable
          items={data.lineItems}
          currency={data.currency}
          template={data.template}
          translations={data.translations}
          minRows={MIN_ITEM_ROWS}
          serialStart={1}
        />
      </div>

      <div ref={layoutMeasureRef} className={styles.measureHost} aria-hidden>
        <div data-calibration-kind="single">
          <InvoicePage
            data={data}
            items={[calibrationItem]}
            serialStart={1}
            showHeader
            showSenderReceiver
            showTotals
            showTermsBottom={hasTerms}
            showOverlays={false}
            showItemTable
            showTitle
            showBusinessLogo
            showInvoiceMeta
            assetAuthKey={assetAuthKey}
            minRows={MIN_ITEM_ROWS}
          />
        </div>
        <div data-calibration-kind="first">
          <InvoicePage
            data={data}
            items={[calibrationItem]}
            serialStart={1}
            showHeader
            showSenderReceiver
            showTotals={false}
            showTermsBottom={false}
            showOverlays={false}
            showItemTable
            showTitle
            showBusinessLogo
            showInvoiceMeta
            assetAuthKey={assetAuthKey}
            minRows={MIN_ITEM_ROWS}
          />
        </div>
        <div data-calibration-kind="middle">
          <InvoicePage
            data={data}
            items={[calibrationItem]}
            serialStart={1}
            showHeader={false}
            showSenderReceiver={false}
            showTotals={false}
            showTermsBottom={false}
            showOverlays={false}
            showItemTable
            showTitle
            showBusinessLogo
            showInvoiceMeta
            assetAuthKey={assetAuthKey}
            minRows={MIN_ITEM_ROWS}
          />
        </div>
        <div data-calibration-kind="last">
          <InvoicePage
            data={data}
            items={[calibrationItem]}
            serialStart={1}
            showHeader={false}
            showSenderReceiver={false}
            showTotals
            showTermsBottom={hasTerms}
            showOverlays={false}
            showItemTable
            showTitle
            showBusinessLogo
            showInvoiceMeta
            assetAuthKey={assetAuthKey}
            minRows={MIN_ITEM_ROWS}
          />
        </div>
      </div>

    </section>
  );
}
