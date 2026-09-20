"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { stickyOneOf, useStickyState } from "@/lib/stickyFilters";
import { useRouter } from "next/navigation";
import EmptyState from "@/components/EmptyState";
import ErrorState from "@/components/ErrorState";
import LoadingState from "@/components/LoadingState";
import Navbar from "@/components/Navbar";
import SearchBar from "@/components/SearchBar";
import Sidebar from "@/components/Sidebar";
import { api, getErrorMessage, isUnauthorizedError } from "@/lib/api";
import { clearAccessToken, isLoggedIn } from "@/lib/auth";
import { fallbackText, formatCurrency, formatDateTime } from "@/lib/format";
import type { WebpanelInventoryItemResponse } from "@/lib/types";

type SortKey =
  | "updatedAt"
  | "createdAt"
  | "name"
  | "userId"
  | "unitPrice"
  | "netPrice"
  | "discount"
  | "discountType";

type SortDirection = "asc" | "desc";

interface NumericRange {
  min: string;
  max: string;
}

interface PriceRanges {
  unitPrice: NumericRange;
  netPrice: NumericRange;
  discount: NumericRange;
}

interface InventoryRow {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  unitPrice: number;
  netPrice: number;
  discount: number;
  discountType: string | null;
  taxId: string | null;
  unitTypeId: string | null;
  itemCategoryId: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  createdAtTs: number | null;
  updatedAtTs: number | null;
  searchText: string;
}

const createInitialRanges = (): PriceRanges => ({
  unitPrice: { min: "", max: "" },
  netPrice: { min: "", max: "" },
  discount: { min: "", max: "" },
});

function toTimestamp(value: string | null | undefined): number | null {
  if (!value) return null;
  const ts = Date.parse(value);
  return Number.isNaN(ts) ? null : ts;
}

function parseDateStart(value: string): number | null {
  if (!value) return null;
  const ts = Date.parse(`${value}T00:00:00`);
  return Number.isNaN(ts) ? null : ts;
}

function parseDateEnd(value: string): number | null {
  if (!value) return null;
  const ts = Date.parse(`${value}T23:59:59.999`);
  return Number.isNaN(ts) ? null : ts;
}

function parseNumber(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function withinRange(value: number, range: NumericRange): boolean {
  const min = parseNumber(range.min);
  const max = parseNumber(range.max);

  if (min !== null && value < min) return false;
  if (max !== null && value > max) return false;
  return true;
}

function compactId(value: string, keepStart = 8, keepEnd = 6): string {
  if (!value || value.length <= keepStart + keepEnd + 1) {
    return value;
  }

  return `${value.slice(0, keepStart)}...${value.slice(-keepEnd)}`;
}

/** One key for this page's remembered filters (decision 0123). */
const PAGE = "inventory-items";
type StickyOf<T> = import("@/lib/stickyFilters").StickyCodec<T>;
const sortCodec = stickyOneOf([
  "updatedAt", "createdAt", "name", "price", "quantity", "user",
] as const) as unknown as StickyOf<SortKey>;
const dirCodec = stickyOneOf(["asc", "desc"] as const) as unknown as StickyOf<SortDirection>;

export default function InventoryItemsPage() {
  const router = useRouter();

  const [items, setItems] = useState<WebpanelInventoryItemResponse[]>([]);
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [userIdFilter, setUserIdFilter] = useState("");
  const [discountTypeFilter, setDiscountTypeFilter] = useState("ALL");
  const [updatedFrom, setUpdatedFrom] = useState("");
  const [updatedTo, setUpdatedTo] = useState("");
  const [ranges, setRanges] = useState<PriceRanges>(createInitialRanges);

  const [hasDiscountOnly, setHasDiscountOnly] = useState(false);
  const [missingTaxOnly, setMissingTaxOnly] = useState(false);
  const [missingUnitTypeOnly, setMissingUnitTypeOnly] = useState(false);
  const [missingCategoryOnly, setMissingCategoryOnly] = useState(false);

  const [sortKey, setSortKey] = useStickyState<SortKey>(PAGE, "sort", "updatedAt", sortCodec);
  const [sortDirection, setSortDirection] = useStickyState<SortDirection>(PAGE, "dir", "desc", dirCodec);
  const [pageSize, setPageSize] = useState(200);
  const [currentPage, setCurrentPage] = useState(1);

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const handleUnauthorized = useCallback(() => {
    clearAccessToken({ sessionExpired: true });
    router.replace("/login");
  }, [router]);

  const loadItems = useCallback(async () => {
    if (!isLoggedIn()) {
      router.replace("/login");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await api.getInventoryItems();
      setItems(response ?? []);
    } catch (loadError) {
      if (isUnauthorizedError(loadError)) {
        handleUnauthorized();
        return;
      }

      setError(getErrorMessage(loadError, "Failed to load inventory items."));
    } finally {
      setIsLoading(false);
    }
  }, [handleUnauthorized, router]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQuery(queryInput.trim().toLowerCase());
    }, 220);
    return () => window.clearTimeout(timer);
  }, [queryInput]);

  const rows = useMemo<InventoryRow[]>(() => {
    return items.map((item) => ({
      id: item.id,
      userId: item.userId,
      name: item.name,
      description: item.description,
      unitPrice: item.unitPrice ?? 0,
      netPrice: item.netPrice ?? 0,
      discount: item.discount ?? 0,
      discountType: item.discountType,
      taxId: item.taxId,
      unitTypeId: item.unitTypeId,
      itemCategoryId: item.itemCategoryId,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      createdAtTs: toTimestamp(item.createdAt),
      updatedAtTs: toTimestamp(item.updatedAt),
      searchText:
        `${item.name} ${item.description ?? ""} ${item.userId} ${item.id} ${item.discountType ?? ""}`.toLowerCase(),
    }));
  }, [items]);

  const discountTypeOptions = useMemo(
    () =>
      Array.from(
        new Set(rows.map((row) => row.discountType).filter((value): value is string => Boolean(value))),
      ).sort((a, b) => a.localeCompare(b)),
    [rows],
  );

  const processedRows = useMemo(() => {
    const updatedFromTs = parseDateStart(updatedFrom);
    const updatedToTs = parseDateEnd(updatedTo);
    const normalizedUserId = userIdFilter.trim().toLowerCase();

    const filtered = rows.filter((row) => {
      if (query && !row.searchText.includes(query)) return false;
      if (normalizedUserId && !row.userId.toLowerCase().includes(normalizedUserId)) return false;
      if (discountTypeFilter !== "ALL" && row.discountType !== discountTypeFilter) return false;

      if (updatedFromTs !== null && (row.updatedAtTs === null || row.updatedAtTs < updatedFromTs)) {
        return false;
      }

      if (updatedToTs !== null && (row.updatedAtTs === null || row.updatedAtTs > updatedToTs)) {
        return false;
      }

      if (!withinRange(row.unitPrice, ranges.unitPrice)) return false;
      if (!withinRange(row.netPrice, ranges.netPrice)) return false;
      if (!withinRange(row.discount, ranges.discount)) return false;

      if (hasDiscountOnly && row.discount <= 0) return false;
      if (missingTaxOnly && row.taxId) return false;
      if (missingUnitTypeOnly && row.unitTypeId) return false;
      if (missingCategoryOnly && row.itemCategoryId) return false;

      return true;
    });

    const direction = sortDirection === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case "name":
          return a.name.localeCompare(b.name) * direction;
        case "userId":
          return a.userId.localeCompare(b.userId) * direction;
        case "discountType":
          return fallbackText(a.discountType).localeCompare(fallbackText(b.discountType)) * direction;
        case "createdAt":
          return ((a.createdAtTs ?? 0) - (b.createdAtTs ?? 0)) * direction;
        case "updatedAt":
          return ((a.updatedAtTs ?? 0) - (b.updatedAtTs ?? 0)) * direction;
        case "unitPrice":
          return (a.unitPrice - b.unitPrice) * direction;
        case "netPrice":
          return (a.netPrice - b.netPrice) * direction;
        case "discount":
          return (a.discount - b.discount) * direction;
        default:
          return 0;
      }
    });
  }, [
    discountTypeFilter,
    hasDiscountOnly,
    missingCategoryOnly,
    missingTaxOnly,
    missingUnitTypeOnly,
    query,
    ranges,
    rows,
    sortDirection,
    sortKey,
    updatedFrom,
    updatedTo,
    userIdFilter,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    discountTypeFilter,
    hasDiscountOnly,
    missingCategoryOnly,
    missingTaxOnly,
    missingUnitTypeOnly,
    pageSize,
    query,
    ranges,
    sortDirection,
    sortKey,
    updatedFrom,
    updatedTo,
    userIdFilter,
  ]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(processedRows.length / pageSize)),
    [pageSize, processedRows.length],
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const pagedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return processedRows.slice(start, start + pageSize);
  }, [currentPage, pageSize, processedRows]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (queryInput.trim()) count += 1;
    if (userIdFilter.trim()) count += 1;
    if (discountTypeFilter !== "ALL") count += 1;
    if (updatedFrom) count += 1;
    if (updatedTo) count += 1;
    if (ranges.unitPrice.min) count += 1;
    if (ranges.unitPrice.max) count += 1;
    if (ranges.netPrice.min) count += 1;
    if (ranges.netPrice.max) count += 1;
    if (ranges.discount.min) count += 1;
    if (ranges.discount.max) count += 1;
    if (hasDiscountOnly) count += 1;
    if (missingTaxOnly) count += 1;
    if (missingUnitTypeOnly) count += 1;
    if (missingCategoryOnly) count += 1;
    return count;
  }, [
    discountTypeFilter,
    hasDiscountOnly,
    missingCategoryOnly,
    missingTaxOnly,
    missingUnitTypeOnly,
    queryInput,
    ranges.discount.max,
    ranges.discount.min,
    ranges.netPrice.max,
    ranges.netPrice.min,
    ranges.unitPrice.max,
    ranges.unitPrice.min,
    updatedFrom,
    updatedTo,
    userIdFilter,
  ]);

  const updateRange = useCallback(
    (key: keyof PriceRanges, bound: keyof NumericRange, value: string) => {
      setRanges((prev) => ({
        ...prev,
        [key]: { ...prev[key], [bound]: value },
      }));
    },
    [],
  );

  const clearAllFilters = useCallback(() => {
    setQueryInput("");
    setUserIdFilter("");
    setDiscountTypeFilter("ALL");
    setUpdatedFrom("");
    setUpdatedTo("");
    setRanges(createInitialRanges());
    setHasDiscountOnly(false);
    setMissingTaxOnly(false);
    setMissingUnitTypeOnly(false);
    setMissingCategoryOnly(false);
    setSortKey("updatedAt");
    setSortDirection("desc");
    setPageSize(200);
  }, [setSortKey, setSortDirection]);

  return (
    <main className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Navbar title="Inventory Items" />
        <section className="content-wrap">
          <SearchBar
            value={queryInput}
            onChange={setQueryInput}
            label="Search Inventory Items"
            placeholder="Search by name, description, item id, user id, or discount type"
          />

          <section className="filters-panel">
            <div className="filters-header">
              <p className="results-meta">Active filters: {activeFilterCount}</p>
              <button type="button" className="btn btn-outline" onClick={clearAllFilters}>
                Clear All
              </button>
            </div>

            <div className="filters-grid">
              <label className="filter-control">
                <span>User ID</span>
                <input
                  className="input"
                  type="text"
                  value={userIdFilter}
                  onChange={(event) => setUserIdFilter(event.target.value)}
                  placeholder="Filter by userId"
                />
              </label>

              <label className="filter-control">
                <span>Discount Type</span>
                <select
                  className="input"
                  value={discountTypeFilter}
                  onChange={(event) => setDiscountTypeFilter(event.target.value)}
                >
                  <option value="ALL">All</option>
                  {discountTypeOptions.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>

              <label className="filter-control">
                <span>Updated From</span>
                <input
                  className="input"
                  type="date"
                  value={updatedFrom}
                  onChange={(event) => setUpdatedFrom(event.target.value)}
                />
              </label>

              <label className="filter-control">
                <span>Updated To</span>
                <input
                  className="input"
                  type="date"
                  value={updatedTo}
                  onChange={(event) => setUpdatedTo(event.target.value)}
                />
              </label>
            </div>

            <div className="range-grid">
              <div className="range-card">
                <p className="range-title">Unit Price</p>
                <div className="range-inputs">
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={ranges.unitPrice.min}
                    onChange={(event) => updateRange("unitPrice", "min", event.target.value)}
                    placeholder="Min"
                  />
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={ranges.unitPrice.max}
                    onChange={(event) => updateRange("unitPrice", "max", event.target.value)}
                    placeholder="Max"
                  />
                </div>
              </div>

              <div className="range-card">
                <p className="range-title">Net Price</p>
                <div className="range-inputs">
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={ranges.netPrice.min}
                    onChange={(event) => updateRange("netPrice", "min", event.target.value)}
                    placeholder="Min"
                  />
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={ranges.netPrice.max}
                    onChange={(event) => updateRange("netPrice", "max", event.target.value)}
                    placeholder="Max"
                  />
                </div>
              </div>

              <div className="range-card">
                <p className="range-title">Discount</p>
                <div className="range-inputs">
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={ranges.discount.min}
                    onChange={(event) => updateRange("discount", "min", event.target.value)}
                    placeholder="Min"
                  />
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={ranges.discount.max}
                    onChange={(event) => updateRange("discount", "max", event.target.value)}
                    placeholder="Max"
                  />
                </div>
              </div>
            </div>

            <div className="toggle-grid">
              <label className="toggle-item">
                <input
                  type="checkbox"
                  checked={hasDiscountOnly}
                  onChange={(event) => setHasDiscountOnly(event.target.checked)}
                />
                Discount {">"} 0
              </label>
              <label className="toggle-item">
                <input
                  type="checkbox"
                  checked={missingTaxOnly}
                  onChange={(event) => setMissingTaxOnly(event.target.checked)}
                />
                Missing Tax ID
              </label>
              <label className="toggle-item">
                <input
                  type="checkbox"
                  checked={missingUnitTypeOnly}
                  onChange={(event) => setMissingUnitTypeOnly(event.target.checked)}
                />
                Missing Unit Type ID
              </label>
              <label className="toggle-item">
                <input
                  type="checkbox"
                  checked={missingCategoryOnly}
                  onChange={(event) => setMissingCategoryOnly(event.target.checked)}
                />
                Missing Category ID
              </label>
            </div>
          </section>

          {isLoading ? <LoadingState message="Loading inventory items..." /> : null}
          {!isLoading && error ? <ErrorState message={error} onRetry={loadItems} /> : null}
          {!isLoading && !error && items.length === 0 ? (
            <EmptyState message="No inventory items found." />
          ) : null}

          {!isLoading && !error && items.length > 0 ? (
            processedRows.length > 0 ? (
              <section className="section-card">
                <div className="users-toolbar">
                  <p className="results-meta">
                    Showing {pagedRows.length} of {processedRows.length} filtered items (total {items.length})
                  </p>
                  <div className="users-toolbar-controls">
                    <label className="filter-control-inline">
                      <span>Sort By</span>
                      <select
                        className="input"
                        value={sortKey}
                        onChange={(event) => setSortKey(event.target.value as SortKey)}
                      >
                        <option value="updatedAt">Updated</option>
                        <option value="createdAt">Created</option>
                        <option value="name">Name</option>
                        <option value="userId">User ID</option>
                        <option value="unitPrice">Unit Price</option>
                        <option value="netPrice">Net Price</option>
                        <option value="discount">Discount</option>
                        <option value="discountType">Discount Type</option>
                      </select>
                    </label>

                    <button
                      type="button"
                      className="btn btn-outline sort-dir-btn"
                      onClick={() => setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))}
                    >
                      {sortDirection === "asc" ? "Asc" : "Desc"}
                    </button>

                    <label className="filter-control-inline">
                      <span>Rows</span>
                      <select
                        className="input"
                        value={pageSize}
                        onChange={(event) => setPageSize(Number(event.target.value))}
                      >
                        <option value={100}>100</option>
                        <option value={200}>200</option>
                        <option value={500}>500</option>
                      </select>
                    </label>
                  </div>
                </div>

                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>User ID</th>
                        <th>Unit Price</th>
                        <th>Net Price</th>
                        <th>Discount</th>
                        <th>Discount Type</th>
                        <th>Tax ID</th>
                        <th>Unit Type ID</th>
                        <th>Category ID</th>
                        <th>Updated</th>
                        <th>Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedRows.map((row) => (
                        <tr
                          key={row.id}
                          className="click-row"
                          onClick={() => router.push(`/users/${row.userId}`)}
                          title={`Open user ${row.userId}`}
                        >
                          <td title={`${row.name}${row.description ? ` - ${row.description}` : ""}`}>
                            {row.name}
                          </td>
                          <td title={row.userId}>{compactId(row.userId)}</td>
                          <td>{formatCurrency(row.unitPrice)}</td>
                          <td>{formatCurrency(row.netPrice)}</td>
                          <td>{formatCurrency(row.discount)}</td>
                          <td>{fallbackText(row.discountType)}</td>
                          <td title={fallbackText(row.taxId)}>{fallbackText(row.taxId && compactId(row.taxId))}</td>
                          <td title={fallbackText(row.unitTypeId)}>
                            {fallbackText(row.unitTypeId && compactId(row.unitTypeId))}
                          </td>
                          <td title={fallbackText(row.itemCategoryId)}>
                            {fallbackText(row.itemCategoryId && compactId(row.itemCategoryId))}
                          </td>
                          <td>{formatDateTime(row.updatedAt)}</td>
                          <td>{formatDateTime(row.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="pagination-bar">
                  <button
                    type="button"
                    className="btn btn-outline"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  >
                    Previous
                  </button>
                  <p className="results-meta">
                    Page {currentPage} of {totalPages}
                  </p>
                  <button
                    type="button"
                    className="btn btn-outline"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  >
                    Next
                  </button>
                </div>
              </section>
            ) : (
              <EmptyState message="No inventory items match your filters." />
            )
          ) : null}
        </section>
      </div>
    </main>
  );
}
