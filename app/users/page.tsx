"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import EmptyState from "@/components/EmptyState";
import ErrorState from "@/components/ErrorState";
import LoadingState from "@/components/LoadingState";
import Navbar from "@/components/Navbar";
import SearchBar from "@/components/SearchBar";
import Sidebar from "@/components/Sidebar";
import UserCard from "@/components/UserCard";
import { api, getErrorMessage, isUnauthorizedError } from "@/lib/api";
import { clearAccessToken, isLoggedIn } from "@/lib/auth";
import { formatCurrency } from "@/lib/format";
import type {
  WebpanelTestingDeviceResponse,
  WebpanelUserWithStatsAndAnalyticsResponse,
} from "@/lib/types";

type SortKey =
  | "lastActivity"
  | "createdAt"
  | "email"
  | "role"
  | "country"
  | "invoicesAll"
  | "invoices30"
  | "overdue"
  | "paymentsAll"
  | "expensesAll"
  | "invoiceTotalAll";

type SortDirection = "asc" | "desc";
type ActivityFilter = "ALL" | "ACTIVE_30D" | "INACTIVE_30D";

interface NumericRange {
  min: string;
  max: string;
}

interface RangeFilters {
  invoices: NumericRange;
  payments: NumericRange;
  expenses: NumericRange;
  clients: NumericRange;
  businesses: NumericRange;
  invoiceTotal: NumericRange;
  paymentTotal: NumericRange;
  expenseTotal: NumericRange;
  sessions: NumericRange;
  events: NumericRange;
}

interface UserListRow {
  id: string;
  email: string;
  role: string;
  primaryCountry: string | null;
  createdAt: string | null;
  createdAtTs: number | null;
  lastActivityAt: string | null;
  lastActivityTs: number | null;
  hasActivity30: boolean;
  invoicesAll: number;
  invoices30: number;
  overdue: number;
  cancelled: number;
  refunded: number;
  uncollectible: number;
  paymentsAll: number;
  expensesAll: number;
  clientsAll: number;
  businessesAll: number;
  templatesAll: number;
  taxesAll: number;
  paymentInstructionsAll: number;
  invoiceTotalAll: number;
  paymentTotalAll: number;
  expenseTotalAll: number;
  invoiceStatusCounts: Record<string, number>;
  analyticsFirstSeenAt: string | null;
  analyticsFirstSeenTs: number | null;
  analyticsLastSeenAt: string | null;
  analyticsLastSeenTs: number | null;
  totalSessions: number;
  totalEvents: number;
  countries: string[];
  cities: string[];
  platforms: string[];
  appVersions: string[];
  eventNames: string[];
  deviceIds: string[];
  searchText: string;
}

function uniqueSorted(values: Array<string | null | undefined>): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  ).sort((a, b) => a.localeCompare(b));
}

const createInitialRanges = (): RangeFilters => ({
  invoices: { min: "", max: "" },
  payments: { min: "", max: "" },
  expenses: { min: "", max: "" },
  clients: { min: "", max: "" },
  businesses: { min: "", max: "" },
  invoiceTotal: { min: "", max: "" },
  paymentTotal: { min: "", max: "" },
  expenseTotal: { min: "", max: "" },
  sessions: { min: "", max: "" },
  events: { min: "", max: "" },
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

interface UserSortColumn {
  key: SortKey;
  label: string;
  align?: "left" | "right";
}

const USER_SORT_COLUMNS: UserSortColumn[] = [
  { key: "email", label: "Email" },
  { key: "role", label: "Role" },
  { key: "country", label: "Country" },
  { key: "invoicesAll", label: "Invo-All", align: "right" },
  { key: "invoices30", label: "Invo-30d", align: "right" },
  { key: "overdue", label: "Overdue", align: "right" },
  { key: "paymentsAll", label: "Payments", align: "right" },
  { key: "expensesAll", label: "Expenses", align: "right" },
  { key: "invoiceTotalAll", label: "Invo-Total" },
  { key: "lastActivity", label: "Last-Activity" },
  { key: "createdAt", label: "Created" },
];

interface UserTableTotals {
  users: number;
  distinctRoles: number;
  uniqueCountries: number;
  invoicesAll: number;
  invoices30: number;
  overdue: number;
  paymentsAll: number;
  expensesAll: number;
  invoiceTotalAll: number;
  lastActivityCount: number;
  createdAtCount: number;
}

interface UserTableCoverageCell {
  count: number;
  percentage: number;
}

interface UserTableCoverage {
  role: UserTableCoverageCell;
  country: UserTableCoverageCell;
  invoicesAll: UserTableCoverageCell;
  invoices30: UserTableCoverageCell;
  overdue: UserTableCoverageCell;
  paymentsAll: UserTableCoverageCell;
  expensesAll: UserTableCoverageCell;
  invoiceTotalAll: UserTableCoverageCell;
  lastActivity: UserTableCoverageCell;
  createdAt: UserTableCoverageCell;
}

function createCoverageCell(count: number, total: number): UserTableCoverageCell {
  return {
    count,
    percentage: total > 0 ? (count / total) * 100 : 0,
  };
}

function renderCoverage(cell: UserTableCoverageCell) {
  return (
    <>
      <span>{cell.count}</span>
      <span className="users-table-summary-percentage">{cell.percentage.toFixed(0)}%</span>
    </>
  );
}

export default function UsersPage() {
  const router = useRouter();

  const [users, setUsers] = useState<WebpanelUserWithStatsAndAnalyticsResponse[]>([]);
  const [testingDevices, setTestingDevices] = useState<WebpanelTestingDeviceResponse[]>([]);
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("ALL");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [lastActivityFrom, setLastActivityFrom] = useState("");
  const [lastActivityTo, setLastActivityTo] = useState("");
  const [analyticsLastSeenFrom, setAnalyticsLastSeenFrom] = useState("");
  const [analyticsLastSeenTo, setAnalyticsLastSeenTo] = useState("");
  const [countryFilter, setCountryFilter] = useState("ALL");
  const [cityFilter, setCityFilter] = useState("ALL");
  const [platformFilter, setPlatformFilter] = useState("ALL");
  const [appVersionFilter, setAppVersionFilter] = useState("ALL");
  const [eventNameFilter, setEventNameFilter] = useState("ALL");
  const [ranges, setRanges] = useState<RangeFilters>(createInitialRanges);
  const [invoiceStatusFilters, setInvoiceStatusFilters] = useState<string[]>([]);

  const [overdueOnly, setOverdueOnly] = useState(false);
  const [cancelledOnly, setCancelledOnly] = useState(false);
  const [refundedOnly, setRefundedOnly] = useState(false);
  const [uncollectibleOnly, setUncollectibleOnly] = useState(false);
  const [noBusinessOnly, setNoBusinessOnly] = useState(false);
  const [noClientsOnly, setNoClientsOnly] = useState(false);
  const [noTemplatesOnly, setNoTemplatesOnly] = useState(false);
  const [noTaxesOnly, setNoTaxesOnly] = useState(false);
  const [noPaymentInstructionsOnly, setNoPaymentInstructionsOnly] = useState(false);
  const [excludeTestingDevices, setExcludeTestingDevices] = useState(false);

  const [sortKey, setSortKey] = useState<SortKey>("lastActivity");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [pageSize, setPageSize] = useState(200);
  const [currentPage, setCurrentPage] = useState(1);

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const handleSortChange = useCallback((nextKey: SortKey) => {
    if (sortKey === nextKey) {
      setSortDirection((currentDirection) => (currentDirection === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextKey);
    setSortDirection("desc");
  }, [sortKey]);

  const handleUnauthorized = useCallback(() => {
    clearAccessToken({ sessionExpired: true });
    router.replace("/login");
  }, [router]);

  const loadUsers = useCallback(async () => {
    if (!isLoggedIn()) {
      router.replace("/login");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const [usersResponse, testingDevicesResponse] = await Promise.all([
        api.getAllUsersWithStatAndAnalytics(),
        api.getTestingDevices(),
      ]);
      setUsers(usersResponse ?? []);
      setTestingDevices(testingDevicesResponse ?? []);
    } catch (loadError) {
      if (isUnauthorizedError(loadError)) {
        handleUnauthorized();
        return;
      }

      setError(getErrorMessage(loadError, "Failed to load users."));
    } finally {
      setIsLoading(false);
    }
  }, [handleUnauthorized, router]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQuery(queryInput.trim().toLowerCase());
    }, 220);
    return () => window.clearTimeout(timer);
  }, [queryInput]);

  const rows = useMemo<UserListRow[]>(() => {
    return users.map((user) => {
      const allTime = user.stats.allTime;
      const last30 = user.stats.last30Days;
      const allCounts = allTime.counts;
      const last30Counts = last30.counts;
      const statusCounts = allCounts.invoicesByStatus ?? {};
      const analytics = user.analytics;
      const ipCountry = user.ip?.countryCode?.trim() || user.ip?.country?.trim() || null;
      const countries = uniqueSorted([
        ...(analytics?.locations.map((location) => location.country) ?? []),
        ipCountry,
      ]);
      const cities = uniqueSorted(analytics?.locations.map((location) => location.city) ?? []);
      const platforms = uniqueSorted([
        ...(analytics?.locations.flatMap((location) => location.platforms) ?? []),
        ...(analytics?.devices.flatMap((device) => device.platforms) ?? []),
        ...(analytics?.appVersions.flatMap((version) => version.platforms) ?? []),
      ]);
      const appVersions = uniqueSorted([
        ...(analytics?.appVersions.map((version) => version.appVersion) ?? []),
        ...(analytics?.locations.flatMap((location) => location.appVersions) ?? []),
        ...(analytics?.devices.flatMap((device) => device.appVersions) ?? []),
      ]);
      const eventNames = uniqueSorted(analytics?.events.map((event) => event.eventName) ?? []);
      const deviceIds = uniqueSorted([
        ...(analytics?.devices.map((device) => device.deviceId) ?? []),
        ...(analytics?.locations.flatMap((location) => location.deviceIds) ?? []),
        ...(analytics?.appVersions.flatMap((version) => version.deviceIds) ?? []),
      ]);

      const lastActivityAt =
        allTime.activity.overallLastActivityAt ??
        last30.activity.overallLastActivityAt ??
        user.stats.lastLoginAt ??
        null;

      return {
        id: user.id,
        email: user.email,
        role: user.role,
        primaryCountry: countries[0] ?? null,
        createdAt: user.createdAt,
        createdAtTs: toTimestamp(user.createdAt),
        lastActivityAt,
        lastActivityTs: toTimestamp(lastActivityAt),
        hasActivity30: Boolean(last30.activity.overallLastActivityAt),
        invoicesAll: allCounts.invoices,
        invoices30: last30Counts.invoices,
        overdue: statusCounts.OVERDUE ?? 0,
        cancelled: statusCounts.CANCELLED ?? 0,
        refunded: statusCounts.REFUNDED ?? 0,
        uncollectible: statusCounts.UNCOLLECTIBLE ?? 0,
        paymentsAll: allCounts.payments,
        expensesAll: allCounts.expenses,
        clientsAll: allCounts.clients,
        businessesAll: allCounts.businesses,
        templatesAll: allCounts.templates,
        taxesAll: allCounts.taxes,
        paymentInstructionsAll: allCounts.paymentInstructions,
        invoiceTotalAll: allTime.totals.invoiceTotalAmount,
        paymentTotalAll: allTime.totals.paymentTotalAmount,
        expenseTotalAll: allTime.totals.expenseTotalAmount,
        invoiceStatusCounts: statusCounts,
        analyticsFirstSeenAt: analytics?.firstSeenAt ?? null,
        analyticsFirstSeenTs: toTimestamp(analytics?.firstSeenAt),
        analyticsLastSeenAt: analytics?.lastSeenAt ?? null,
        analyticsLastSeenTs: toTimestamp(analytics?.lastSeenAt),
        totalSessions: analytics?.totalSessions ?? 0,
        totalEvents: analytics?.totalEvents ?? 0,
        countries,
        cities,
        platforms,
        appVersions,
        eventNames,
        deviceIds,
        searchText: [
          user.email,
          user.role,
          user.id,
          ...countries,
          ...cities,
          ...platforms,
          ...appVersions,
          ...eventNames,
        ].join(" ").toLowerCase(),
      };
    });
  }, [users]);

  const roles = useMemo(
    () => Array.from(new Set(rows.map((row) => row.role))).sort((a, b) => a.localeCompare(b)),
    [rows],
  );

  const invoiceStatusOptions = useMemo(() => {
    const totals: Record<string, number> = {};

    rows.forEach((row) => {
      Object.entries(row.invoiceStatusCounts).forEach(([status, count]) => {
        if (count > 0) {
          totals[status] = (totals[status] ?? 0) + count;
        }
      });
    });

    return Object.entries(totals)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([status, count]) => ({ status, count }));
  }, [rows]);

  const countryOptions = useMemo(
    () => uniqueSorted(rows.flatMap((row) => row.countries)),
    [rows],
  );
  const cityOptions = useMemo(
    () => uniqueSorted(rows.flatMap((row) => row.cities)),
    [rows],
  );
  const platformOptions = useMemo(
    () => uniqueSorted(rows.flatMap((row) => row.platforms)),
    [rows],
  );
  const appVersionOptions = useMemo(
    () => uniqueSorted(rows.flatMap((row) => row.appVersions)),
    [rows],
  );
  const eventNameOptions = useMemo(
    () => uniqueSorted(rows.flatMap((row) => row.eventNames)),
    [rows],
  );
  const testingDeviceIdSet = useMemo(
    () => new Set(testingDevices.map((device) => device.deviceId.trim()).filter(Boolean)),
    [testingDevices],
  );

  const processedRows = useMemo(() => {
    const createdFromTs = parseDateStart(createdFrom);
    const createdToTs = parseDateEnd(createdTo);
    const lastActivityFromTs = parseDateStart(lastActivityFrom);
    const lastActivityToTs = parseDateEnd(lastActivityTo);
    const analyticsLastSeenFromTs = parseDateStart(analyticsLastSeenFrom);
    const analyticsLastSeenToTs = parseDateEnd(analyticsLastSeenTo);

    const filtered = rows.filter((row) => {
      if (query && !row.searchText.includes(query)) return false;
      if (roleFilter !== "ALL" && row.role !== roleFilter) return false;
      if (activityFilter === "ACTIVE_30D" && !row.hasActivity30) return false;
      if (activityFilter === "INACTIVE_30D" && row.hasActivity30) return false;

      if (createdFromTs !== null && (row.createdAtTs === null || row.createdAtTs < createdFromTs)) {
        return false;
      }
      if (createdToTs !== null && (row.createdAtTs === null || row.createdAtTs > createdToTs)) {
        return false;
      }
      if (
        lastActivityFromTs !== null &&
        (row.lastActivityTs === null || row.lastActivityTs < lastActivityFromTs)
      ) {
        return false;
      }
      if (
        lastActivityToTs !== null &&
        (row.lastActivityTs === null || row.lastActivityTs > lastActivityToTs)
      ) {
        return false;
      }
      if (
        analyticsLastSeenFromTs !== null &&
        (row.analyticsLastSeenTs === null || row.analyticsLastSeenTs < analyticsLastSeenFromTs)
      ) {
        return false;
      }
      if (
        analyticsLastSeenToTs !== null &&
        (row.analyticsLastSeenTs === null || row.analyticsLastSeenTs > analyticsLastSeenToTs)
      ) {
        return false;
      }

      if (!withinRange(row.invoicesAll, ranges.invoices)) return false;
      if (!withinRange(row.paymentsAll, ranges.payments)) return false;
      if (!withinRange(row.expensesAll, ranges.expenses)) return false;
      if (!withinRange(row.clientsAll, ranges.clients)) return false;
      if (!withinRange(row.businessesAll, ranges.businesses)) return false;
      if (!withinRange(row.invoiceTotalAll, ranges.invoiceTotal)) return false;
      if (!withinRange(row.paymentTotalAll, ranges.paymentTotal)) return false;
      if (!withinRange(row.expenseTotalAll, ranges.expenseTotal)) return false;
      if (!withinRange(row.totalSessions, ranges.sessions)) return false;
      if (!withinRange(row.totalEvents, ranges.events)) return false;

      if (overdueOnly && row.overdue <= 0) return false;
      if (cancelledOnly && row.cancelled <= 0) return false;
      if (refundedOnly && row.refunded <= 0) return false;
      if (uncollectibleOnly && row.uncollectible <= 0) return false;
      if (
        invoiceStatusFilters.length > 0 &&
        !invoiceStatusFilters.some((status) => (row.invoiceStatusCounts[status] ?? 0) > 0)
      ) {
        return false;
      }

      if (noBusinessOnly && row.businessesAll > 0) return false;
      if (noClientsOnly && row.clientsAll > 0) return false;
      if (noTemplatesOnly && row.templatesAll > 0) return false;
      if (noTaxesOnly && row.taxesAll > 0) return false;
      if (noPaymentInstructionsOnly && row.paymentInstructionsAll > 0) return false;
      if (excludeTestingDevices && row.deviceIds.some((deviceId) => testingDeviceIdSet.has(deviceId))) {
        return false;
      }
      if (countryFilter !== "ALL" && !row.countries.includes(countryFilter)) return false;
      if (cityFilter !== "ALL" && !row.cities.includes(cityFilter)) return false;
      if (platformFilter !== "ALL" && !row.platforms.includes(platformFilter)) return false;
      if (appVersionFilter !== "ALL" && !row.appVersions.includes(appVersionFilter)) return false;
      if (eventNameFilter !== "ALL" && !row.eventNames.includes(eventNameFilter)) return false;

      return true;
    });

    const direction = sortDirection === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case "email":
          return a.email.localeCompare(b.email) * direction;
        case "role":
          return a.role.localeCompare(b.role) * direction;
        case "country":
          return (a.primaryCountry ?? "").localeCompare(b.primaryCountry ?? "") * direction;
        case "createdAt":
          return ((a.createdAtTs ?? 0) - (b.createdAtTs ?? 0)) * direction;
        case "lastActivity":
          return ((a.lastActivityTs ?? 0) - (b.lastActivityTs ?? 0)) * direction;
        case "invoicesAll":
          return (a.invoicesAll - b.invoicesAll) * direction;
        case "invoices30":
          return (a.invoices30 - b.invoices30) * direction;
        case "overdue":
          return (a.overdue - b.overdue) * direction;
        case "paymentsAll":
          return (a.paymentsAll - b.paymentsAll) * direction;
        case "expensesAll":
          return (a.expensesAll - b.expensesAll) * direction;
        case "invoiceTotalAll":
          return (a.invoiceTotalAll - b.invoiceTotalAll) * direction;
        default:
          return 0;
      }
    });
  }, [
    activityFilter,
    analyticsLastSeenFrom,
    analyticsLastSeenTo,
    appVersionFilter,
    cancelledOnly,
    cityFilter,
    countryFilter,
    createdFrom,
    createdTo,
    excludeTestingDevices,
    eventNameFilter,
    invoiceStatusFilters,
    lastActivityFrom,
    lastActivityTo,
    noBusinessOnly,
    noClientsOnly,
    noPaymentInstructionsOnly,
    noTaxesOnly,
    noTemplatesOnly,
    overdueOnly,
    platformFilter,
    query,
    ranges,
    refundedOnly,
    roleFilter,
    rows,
    sortDirection,
    sortKey,
    testingDeviceIdSet,
    uncollectibleOnly,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    activityFilter,
    analyticsLastSeenFrom,
    analyticsLastSeenTo,
    appVersionFilter,
    cancelledOnly,
    cityFilter,
    countryFilter,
    createdFrom,
    createdTo,
    eventNameFilter,
    invoiceStatusFilters,
    lastActivityFrom,
    lastActivityTo,
    noBusinessOnly,
    noClientsOnly,
    noPaymentInstructionsOnly,
    noTaxesOnly,
    noTemplatesOnly,
    overdueOnly,
    pageSize,
    platformFilter,
    query,
    ranges,
    refundedOnly,
    roleFilter,
    sortDirection,
    sortKey,
    uncollectibleOnly,
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

  const tableTotals = useMemo<UserTableTotals>(() => {
    const totals = processedRows.reduce<UserTableTotals>(
      (acc, row) => {
        acc.invoicesAll += row.invoicesAll;
        acc.invoices30 += row.invoices30;
        acc.overdue += row.overdue;
        acc.paymentsAll += row.paymentsAll;
        acc.expensesAll += row.expensesAll;
        acc.invoiceTotalAll += row.invoiceTotalAll;
        if (row.lastActivityAt) acc.lastActivityCount += 1;
        if (row.createdAt) acc.createdAtCount += 1;
        return acc;
      },
      {
        users: processedRows.length,
        distinctRoles: new Set(processedRows.map((row) => row.role).filter(Boolean)).size,
        uniqueCountries: new Set(
          processedRows.map((row) => row.primaryCountry).filter(Boolean),
        ).size,
        invoicesAll: 0,
        invoices30: 0,
        overdue: 0,
        paymentsAll: 0,
        expensesAll: 0,
        invoiceTotalAll: 0,
        lastActivityCount: 0,
        createdAtCount: 0,
      },
    );

    totals.users = processedRows.length;
    totals.distinctRoles = new Set(processedRows.map((row) => row.role).filter(Boolean)).size;
    totals.uniqueCountries = new Set(
      processedRows.map((row) => row.primaryCountry).filter(Boolean),
    ).size;

    return totals;
  }, [processedRows]);

  const tableCoverage = useMemo<UserTableCoverage>(() => {
    const totalUsers = processedRows.length;

    return {
      role: createCoverageCell(
        processedRows.filter((row) => row.role.trim().toUpperCase() === "USER").length,
        totalUsers,
      ),
      country: createCoverageCell(
        processedRows.filter((row) => Boolean(row.primaryCountry?.trim())).length,
        totalUsers,
      ),
      invoicesAll: createCoverageCell(
        processedRows.filter((row) => row.invoicesAll > 0).length,
        totalUsers,
      ),
      invoices30: createCoverageCell(
        processedRows.filter((row) => row.invoices30 > 0).length,
        totalUsers,
      ),
      overdue: createCoverageCell(
        processedRows.filter((row) => row.overdue > 0).length,
        totalUsers,
      ),
      paymentsAll: createCoverageCell(
        processedRows.filter((row) => row.paymentsAll > 0).length,
        totalUsers,
      ),
      expensesAll: createCoverageCell(
        processedRows.filter((row) => row.expensesAll > 0).length,
        totalUsers,
      ),
      invoiceTotalAll: createCoverageCell(
        processedRows.filter((row) => row.invoiceTotalAll > 0).length,
        totalUsers,
      ),
      lastActivity: createCoverageCell(
        processedRows.filter((row) => Boolean(row.lastActivityAt)).length,
        totalUsers,
      ),
      createdAt: createCoverageCell(
        processedRows.filter((row) => Boolean(row.createdAt)).length,
        totalUsers,
      ),
    };
  }, [processedRows]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (queryInput.trim()) count += 1;
    if (roleFilter !== "ALL") count += 1;
    if (activityFilter !== "ALL") count += 1;
    if (createdFrom) count += 1;
    if (createdTo) count += 1;
    if (lastActivityFrom) count += 1;
    if (lastActivityTo) count += 1;
    if (analyticsLastSeenFrom) count += 1;
    if (analyticsLastSeenTo) count += 1;
    if (countryFilter !== "ALL") count += 1;
    if (cityFilter !== "ALL") count += 1;
    if (platformFilter !== "ALL") count += 1;
    if (appVersionFilter !== "ALL") count += 1;
    if (eventNameFilter !== "ALL") count += 1;

    (Object.keys(ranges) as Array<keyof RangeFilters>).forEach((key) => {
      if (ranges[key].min) count += 1;
      if (ranges[key].max) count += 1;
    });

    if (overdueOnly) count += 1;
    if (cancelledOnly) count += 1;
    if (refundedOnly) count += 1;
    if (uncollectibleOnly) count += 1;
    count += invoiceStatusFilters.length;
    if (noBusinessOnly) count += 1;
    if (noClientsOnly) count += 1;
    if (noTemplatesOnly) count += 1;
    if (noTaxesOnly) count += 1;
    if (noPaymentInstructionsOnly) count += 1;
    if (excludeTestingDevices) count += 1;
    return count;
  }, [
    activityFilter,
    analyticsLastSeenFrom,
    analyticsLastSeenTo,
    appVersionFilter,
    cancelledOnly,
    cityFilter,
    countryFilter,
    createdFrom,
    createdTo,
    excludeTestingDevices,
    eventNameFilter,
    invoiceStatusFilters,
    lastActivityFrom,
    lastActivityTo,
    noBusinessOnly,
    noClientsOnly,
    noPaymentInstructionsOnly,
    noTaxesOnly,
    noTemplatesOnly,
    overdueOnly,
    platformFilter,
    queryInput,
    ranges,
    refundedOnly,
    roleFilter,
    uncollectibleOnly,
  ]);

  const updateRange = useCallback(
    (key: keyof RangeFilters, bound: keyof NumericRange, value: string) => {
      setRanges((prev) => ({
        ...prev,
        [key]: { ...prev[key], [bound]: value },
      }));
    },
    [],
  );

  const toggleInvoiceStatusFilter = useCallback((status: string) => {
    setInvoiceStatusFilters((prev) =>
      prev.includes(status) ? prev.filter((item) => item !== status) : [...prev, status],
    );
  }, []);

  const clearAllFilters = useCallback(() => {
    setQueryInput("");
    setRoleFilter("ALL");
    setActivityFilter("ALL");
    setCreatedFrom("");
    setCreatedTo("");
    setLastActivityFrom("");
    setLastActivityTo("");
    setAnalyticsLastSeenFrom("");
    setAnalyticsLastSeenTo("");
    setCountryFilter("ALL");
    setCityFilter("ALL");
    setPlatformFilter("ALL");
    setAppVersionFilter("ALL");
    setEventNameFilter("ALL");
    setRanges(createInitialRanges());
    setInvoiceStatusFilters([]);
    setOverdueOnly(false);
    setCancelledOnly(false);
    setRefundedOnly(false);
    setUncollectibleOnly(false);
    setNoBusinessOnly(false);
    setNoClientsOnly(false);
    setNoTemplatesOnly(false);
    setNoTaxesOnly(false);
    setNoPaymentInstructionsOnly(false);
    setExcludeTestingDevices(false);
    setSortKey("lastActivity");
    setSortDirection("desc");
    setPageSize(200);
  }, []);

  return (
    <main className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Navbar title="Users" />
        <section className="content-wrap">
        <SearchBar
          value={queryInput}
          onChange={setQueryInput}
          label="Search Users"
          placeholder="Search by email, role, or user id"
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
              <span>Role</span>
              <select
                className="input"
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value)}
              >
                <option value="ALL">All roles</option>
                {roles.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </label>

            <label className="filter-control">
              <span>Activity</span>
              <select
                className="input"
                value={activityFilter}
                onChange={(event) => setActivityFilter(event.target.value as ActivityFilter)}
              >
                <option value="ALL">All</option>
                <option value="ACTIVE_30D">Active in last 30d</option>
                <option value="INACTIVE_30D">Inactive in last 30d</option>
              </select>
            </label>

            <label className="filter-control">
              <span>Created From</span>
              <input
                className="input"
                type="date"
                value={createdFrom}
                onChange={(event) => setCreatedFrom(event.target.value)}
              />
            </label>

            <label className="filter-control">
              <span>Created To</span>
              <input
                className="input"
                type="date"
                value={createdTo}
                onChange={(event) => setCreatedTo(event.target.value)}
              />
            </label>

            <label className="filter-control">
              <span>Last Activity From</span>
              <input
                className="input"
                type="date"
                value={lastActivityFrom}
                onChange={(event) => setLastActivityFrom(event.target.value)}
              />
            </label>

            <label className="filter-control">
              <span>Last Activity To</span>
              <input
                className="input"
                type="date"
                value={lastActivityTo}
                onChange={(event) => setLastActivityTo(event.target.value)}
              />
            </label>

            <label className="filter-control">
              <span>Analytics Last Seen From</span>
              <input
                className="input"
                type="date"
                value={analyticsLastSeenFrom}
                onChange={(event) => setAnalyticsLastSeenFrom(event.target.value)}
              />
            </label>

            <label className="filter-control">
              <span>Analytics Last Seen To</span>
              <input
                className="input"
                type="date"
                value={analyticsLastSeenTo}
                onChange={(event) => setAnalyticsLastSeenTo(event.target.value)}
              />
            </label>

            <label className="filter-control">
              <span>Country</span>
              <select
                className="input"
                value={countryFilter}
                onChange={(event) => setCountryFilter(event.target.value)}
              >
                <option value="ALL">All countries</option>
                {countryOptions.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
            </label>

            <label className="filter-control">
              <span>City</span>
              <select
                className="input"
                value={cityFilter}
                onChange={(event) => setCityFilter(event.target.value)}
              >
                <option value="ALL">All cities</option>
                {cityOptions.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </label>

            <label className="filter-control">
              <span>Platform</span>
              <select
                className="input"
                value={platformFilter}
                onChange={(event) => setPlatformFilter(event.target.value)}
              >
                <option value="ALL">All platforms</option>
                {platformOptions.map((platform) => (
                  <option key={platform} value={platform}>
                    {platform}
                  </option>
                ))}
              </select>
            </label>

            <label className="filter-control">
              <span>App Version</span>
              <select
                className="input"
                value={appVersionFilter}
                onChange={(event) => setAppVersionFilter(event.target.value)}
              >
                <option value="ALL">All app versions</option>
                {appVersionOptions.map((appVersion) => (
                  <option key={appVersion} value={appVersion}>
                    {appVersion}
                  </option>
                ))}
              </select>
            </label>

            <label className="filter-control">
              <span>Event Name</span>
              <select
                className="input"
                value={eventNameFilter}
                onChange={(event) => setEventNameFilter(event.target.value)}
              >
                <option value="ALL">All event names</option>
                {eventNameOptions.map((eventName) => (
                  <option key={eventName} value={eventName}>
                    {eventName}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="range-grid">
            <div className="range-card">
              <p className="range-title">Invoices</p>
              <div className="range-inputs">
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="1"
                  value={ranges.invoices.min}
                  onChange={(event) => updateRange("invoices", "min", event.target.value)}
                  placeholder="Min"
                />
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="1"
                  value={ranges.invoices.max}
                  onChange={(event) => updateRange("invoices", "max", event.target.value)}
                  placeholder="Max"
                />
              </div>
            </div>

            <div className="range-card">
              <p className="range-title">Payments</p>
              <div className="range-inputs">
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="1"
                  value={ranges.payments.min}
                  onChange={(event) => updateRange("payments", "min", event.target.value)}
                  placeholder="Min"
                />
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="1"
                  value={ranges.payments.max}
                  onChange={(event) => updateRange("payments", "max", event.target.value)}
                  placeholder="Max"
                />
              </div>
            </div>

            <div className="range-card">
              <p className="range-title">Expenses</p>
              <div className="range-inputs">
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="1"
                  value={ranges.expenses.min}
                  onChange={(event) => updateRange("expenses", "min", event.target.value)}
                  placeholder="Min"
                />
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="1"
                  value={ranges.expenses.max}
                  onChange={(event) => updateRange("expenses", "max", event.target.value)}
                  placeholder="Max"
                />
              </div>
            </div>

            <div className="range-card">
              <p className="range-title">Clients</p>
              <div className="range-inputs">
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="1"
                  value={ranges.clients.min}
                  onChange={(event) => updateRange("clients", "min", event.target.value)}
                  placeholder="Min"
                />
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="1"
                  value={ranges.clients.max}
                  onChange={(event) => updateRange("clients", "max", event.target.value)}
                  placeholder="Max"
                />
              </div>
            </div>

            <div className="range-card">
              <p className="range-title">Businesses</p>
              <div className="range-inputs">
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="1"
                  value={ranges.businesses.min}
                  onChange={(event) => updateRange("businesses", "min", event.target.value)}
                  placeholder="Min"
                />
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="1"
                  value={ranges.businesses.max}
                  onChange={(event) => updateRange("businesses", "max", event.target.value)}
                  placeholder="Max"
                />
              </div>
            </div>

            <div className="range-card">
              <p className="range-title">Invoice Total</p>
              <div className="range-inputs">
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={ranges.invoiceTotal.min}
                  onChange={(event) => updateRange("invoiceTotal", "min", event.target.value)}
                  placeholder="Min"
                />
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={ranges.invoiceTotal.max}
                  onChange={(event) => updateRange("invoiceTotal", "max", event.target.value)}
                  placeholder="Max"
                />
              </div>
            </div>

            <div className="range-card">
              <p className="range-title">Payment Total</p>
              <div className="range-inputs">
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={ranges.paymentTotal.min}
                  onChange={(event) => updateRange("paymentTotal", "min", event.target.value)}
                  placeholder="Min"
                />
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={ranges.paymentTotal.max}
                  onChange={(event) => updateRange("paymentTotal", "max", event.target.value)}
                  placeholder="Max"
                />
              </div>
            </div>

            <div className="range-card">
              <p className="range-title">Expense Total</p>
              <div className="range-inputs">
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={ranges.expenseTotal.min}
                  onChange={(event) => updateRange("expenseTotal", "min", event.target.value)}
                  placeholder="Min"
                />
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={ranges.expenseTotal.max}
                  onChange={(event) => updateRange("expenseTotal", "max", event.target.value)}
                  placeholder="Max"
                />
              </div>
            </div>

            <div className="range-card">
              <p className="range-title">Sessions</p>
              <div className="range-inputs">
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="1"
                  value={ranges.sessions.min}
                  onChange={(event) => updateRange("sessions", "min", event.target.value)}
                  placeholder="Min"
                />
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="1"
                  value={ranges.sessions.max}
                  onChange={(event) => updateRange("sessions", "max", event.target.value)}
                  placeholder="Max"
                />
              </div>
            </div>

            <div className="range-card">
              <p className="range-title">Events</p>
              <div className="range-inputs">
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="1"
                  value={ranges.events.min}
                  onChange={(event) => updateRange("events", "min", event.target.value)}
                  placeholder="Min"
                />
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="1"
                  value={ranges.events.max}
                  onChange={(event) => updateRange("events", "max", event.target.value)}
                  placeholder="Max"
                />
              </div>
            </div>
          </div>

          <div className="status-filter-wrap">
            <div className="status-filter-head">
              <p className="range-title">Invoice Statuses</p>
              {invoiceStatusFilters.length > 0 ? (
                <button
                  type="button"
                  className="btn btn-outline status-clear-btn"
                  onClick={() => setInvoiceStatusFilters([])}
                >
                  Clear Statuses
                </button>
              ) : null}
            </div>

            {invoiceStatusOptions.length === 0 ? (
              <p className="results-meta">No invoice status data available.</p>
            ) : (
              <div className="status-filter-grid">
                {invoiceStatusOptions.map((option) => (
                  <label key={option.status} className="status-filter-item">
                    <input
                      type="checkbox"
                      checked={invoiceStatusFilters.includes(option.status)}
                      onChange={() => toggleInvoiceStatusFilter(option.status)}
                    />
                    <span className="status-filter-name">{option.status}</span>
                    <span className="status-filter-count">{option.count}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="toggle-grid">
            <label className="toggle-item">
              <input
                type="checkbox"
                checked={overdueOnly}
                onChange={(event) => setOverdueOnly(event.target.checked)}
              />
              Overdue {">"} 0
            </label>
            <label className="toggle-item">
              <input
                type="checkbox"
                checked={cancelledOnly}
                onChange={(event) => setCancelledOnly(event.target.checked)}
              />
              Cancelled {">"} 0
            </label>
            <label className="toggle-item">
              <input
                type="checkbox"
                checked={refundedOnly}
                onChange={(event) => setRefundedOnly(event.target.checked)}
              />
              Refunded {">"} 0
            </label>
            <label className="toggle-item">
              <input
                type="checkbox"
                checked={uncollectibleOnly}
                onChange={(event) => setUncollectibleOnly(event.target.checked)}
              />
              Uncollectible {">"} 0
            </label>
            <label className="toggle-item">
              <input
                type="checkbox"
                checked={noBusinessOnly}
                onChange={(event) => setNoBusinessOnly(event.target.checked)}
              />
              No Business
            </label>
            <label className="toggle-item">
              <input
                type="checkbox"
                checked={noClientsOnly}
                onChange={(event) => setNoClientsOnly(event.target.checked)}
              />
              No Clients
            </label>
            <label className="toggle-item">
              <input
                type="checkbox"
                checked={noTemplatesOnly}
                onChange={(event) => setNoTemplatesOnly(event.target.checked)}
              />
              No Templates
            </label>
            <label className="toggle-item">
              <input
                type="checkbox"
                checked={noTaxesOnly}
                onChange={(event) => setNoTaxesOnly(event.target.checked)}
              />
              No Taxes
            </label>
            <label className="toggle-item">
              <input
                type="checkbox"
                checked={noPaymentInstructionsOnly}
                onChange={(event) => setNoPaymentInstructionsOnly(event.target.checked)}
              />
              No Payment Instructions
            </label>
            <label className="toggle-item">
              <input
                type="checkbox"
                checked={excludeTestingDevices}
                onChange={(event) => setExcludeTestingDevices(event.target.checked)}
              />
              Exclude Testing Devices
            </label>
          </div>
        </section>

        {isLoading ? <LoadingState message="Loading users..." /> : null}

        {!isLoading && error ? <ErrorState message={error} onRetry={loadUsers} /> : null}

        {!isLoading && !error && users.length === 0 ? (
          <EmptyState message="No users found." />
        ) : null}

        {!isLoading && !error && users.length > 0 ? (
          processedRows.length > 0 ? (
            <div className="users-table-wrap">
              <div className="users-toolbar">
                <p className="results-meta">
                  Showing {pagedRows.length} of {processedRows.length} filtered users (total {users.length})
                </p>
                <div className="users-toolbar-controls">
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

              <div className="users-table">
                <div className="users-table-head-wrap">
                  <div className="users-table-head">
                    {USER_SORT_COLUMNS.map((column) => {
                      const isActive = sortKey === column.key;
                      const arrow = !isActive ? "↕" : sortDirection === "asc" ? "↑" : "↓";

                      return (
                        <button
                          key={column.key}
                          type="button"
                          className={`users-table-head-button ${column.align === "right" ? "users-table-head-button-right" : ""} ${isActive ? "users-table-head-button-active" : ""}`}
                          onClick={() => handleSortChange(column.key)}
                          title={`Sort by ${column.label}`}
                        >
                          <span>{column.label}</span>
                          <span className="users-table-head-arrow" aria-hidden="true">{arrow}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="users-table-summary users-table-summary-primary">
                    <span className="users-table-summary-cell">
                      <span className="users-table-summary-label">Total</span>
                      <span className="users-table-summary-value">{tableTotals.users}</span>
                    </span>
                    <span className="users-table-summary-cell">
                      <span className="users-table-summary-label">Distinct</span>
                      <span className="users-table-summary-value">{tableTotals.distinctRoles}</span>
                    </span>
                    <span className="users-table-summary-cell">
                      <span className="users-table-summary-label">Distinct</span>
                      <span className="users-table-summary-value">{tableTotals.uniqueCountries}</span>
                    </span>
                    <span className="users-table-summary-cell users-table-summary-cell-right">
                      <span className="users-table-summary-label">Total</span>
                      <span className="users-table-summary-value">{tableTotals.invoicesAll}</span>
                    </span>
                    <span className="users-table-summary-cell users-table-summary-cell-right">
                      <span className="users-table-summary-label">Total</span>
                      <span className="users-table-summary-value">{tableTotals.invoices30}</span>
                    </span>
                    <span className="users-table-summary-cell users-table-summary-cell-right">
                      <span className="users-table-summary-label">Total</span>
                      <span className="users-table-summary-value">{tableTotals.overdue}</span>
                    </span>
                    <span className="users-table-summary-cell users-table-summary-cell-right">
                      <span className="users-table-summary-label">Total</span>
                      <span className="users-table-summary-value">{tableTotals.paymentsAll}</span>
                    </span>
                    <span className="users-table-summary-cell users-table-summary-cell-right">
                      <span className="users-table-summary-label">Total</span>
                      <span className="users-table-summary-value">{tableTotals.expensesAll}</span>
                    </span>
                    <span className="users-table-summary-cell users-table-summary-cell-right">
                      <span className="users-table-summary-label">Total</span>
                      <span className="users-table-summary-value">{formatCurrency(tableTotals.invoiceTotalAll, "USD")}</span>
                    </span>
                    <span className="users-table-summary-cell">
                      <span className="users-table-summary-label">Available</span>
                      <span className="users-table-summary-value">{tableTotals.lastActivityCount}</span>
                    </span>
                    <span className="users-table-summary-cell">
                      <span className="users-table-summary-label">Available</span>
                      <span className="users-table-summary-value">{tableTotals.createdAtCount}</span>
                    </span>
                  </div>
                  <div className="users-table-summary users-table-summary-secondary">
                    <span className="users-table-summary-cell">
                      <span className="users-table-summary-label">Coverage</span>
                      <span className="users-table-summary-value">{renderCoverage(createCoverageCell(tableTotals.users, tableTotals.users))}</span>
                    </span>
                    <span className="users-table-summary-cell">
                      <span className="users-table-summary-label">User</span>
                      <span className="users-table-summary-value">{renderCoverage(tableCoverage.role)}</span>
                    </span>
                    <span className="users-table-summary-cell">
                      <span className="users-table-summary-label">Non-Null</span>
                      <span className="users-table-summary-value">{renderCoverage(tableCoverage.country)}</span>
                    </span>
                    <span className="users-table-summary-cell users-table-summary-cell-right">
                      <span className="users-table-summary-label">&gt; 0</span>
                      <span className="users-table-summary-value">{renderCoverage(tableCoverage.invoicesAll)}</span>
                    </span>
                    <span className="users-table-summary-cell users-table-summary-cell-right">
                      <span className="users-table-summary-label">&gt; 0</span>
                      <span className="users-table-summary-value">{renderCoverage(tableCoverage.invoices30)}</span>
                    </span>
                    <span className="users-table-summary-cell users-table-summary-cell-right">
                      <span className="users-table-summary-label">&gt; 0</span>
                      <span className="users-table-summary-value">{renderCoverage(tableCoverage.overdue)}</span>
                    </span>
                    <span className="users-table-summary-cell users-table-summary-cell-right">
                      <span className="users-table-summary-label">&gt; 0</span>
                      <span className="users-table-summary-value">{renderCoverage(tableCoverage.paymentsAll)}</span>
                    </span>
                    <span className="users-table-summary-cell users-table-summary-cell-right">
                      <span className="users-table-summary-label">&gt; 0</span>
                      <span className="users-table-summary-value">{renderCoverage(tableCoverage.expensesAll)}</span>
                    </span>
                    <span className="users-table-summary-cell users-table-summary-cell-right">
                      <span className="users-table-summary-label">&gt; 0</span>
                      <span className="users-table-summary-value">{renderCoverage(tableCoverage.invoiceTotalAll)}</span>
                    </span>
                    <span className="users-table-summary-cell">
                      <span className="users-table-summary-label">Non-Null</span>
                      <span className="users-table-summary-value">{renderCoverage(tableCoverage.lastActivity)}</span>
                    </span>
                    <span className="users-table-summary-cell">
                      <span className="users-table-summary-label">Non-Null</span>
                      <span className="users-table-summary-value">{renderCoverage(tableCoverage.createdAt)}</span>
                    </span>
                  </div>
                </div>
                <div className="users-table-body">
                  {pagedRows.map((row) => (
                    <UserCard
                      key={row.id}
                      row={{
                        email: row.email,
                        role: row.role,
                        country: row.primaryCountry,
                        invoicesAll: row.invoicesAll,
                        invoices30: row.invoices30,
                        overdue: row.overdue,
                        paymentsAll: row.paymentsAll,
                        expensesAll: row.expensesAll,
                        invoiceTotalAll: row.invoiceTotalAll,
                        lastActivityAt: row.lastActivityAt,
                        createdAt: row.createdAt,
                      }}
                      onClick={() => router.push(`/users/${row.id}`)}
                    />
                  ))}
                </div>
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
            </div>
          ) : (
            <EmptyState message="No users match your filters." />
          )
        ) : null}
        </section>
      </div>
    </main>
  );
}
