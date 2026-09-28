"use client";

import type { RevenueLifetime, RevenueSummary, WebpanelCurrencyTotal } from "@/lib/types";
import { stickyOneOf, useStickyState } from "@/lib/stickyFilters";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import EmptyState from "@/components/EmptyState";
import ErrorState from "@/components/ErrorState";
import LoadingState from "@/components/LoadingState";
import Navbar from "@/components/Navbar";
import SearchBar from "@/components/SearchBar";
import Sidebar from "@/components/Sidebar";
import UserCard from "@/components/UserCard";
import { SupportLookup } from "@/features/support-view/SupportLookup";
import { BANNER_NOTE, countedThrough, usd } from "@/features/user-revenue/format";
import { api, getErrorMessage, isUnauthorizedError } from "@/lib/api";
import { clearAccessToken, isLoggedIn } from "@/lib/auth";
import type {
  WebpanelTestingDeviceResponse,
  WebpanelUserListItem,
} from "@/lib/types";

type SortKey =
  | "lastActivity"
  | "createdAt"
  | "email"
  | "role"
  | "country"
  | "invoicesAll"
  | "invoices30"
  | "pastDue"
  | "paymentsAll"
  | "expensesAll"
  | "invoiceTotal"
  | "revenue"
  | "appVersion";

type SortDirection = "asc" | "desc";
type ActivityFilter = "ALL" | "ACTIVE_30D" | "INACTIVE_30D";

interface NumericRange {
  min: string;
  max: string;
}

/**
 * Payment and expense **amounts** have no filter: a payment row carries no currency in the database, so
 * "payments over 1,000" would compare rupees with dollars. Their counts stay.
 */
interface RangeFilters {
  invoices: NumericRange;
  payments: NumericRange;
  expenses: NumericRange;
  clients: NumericRange;
  businesses: NumericRange;
  invoiceTotal: NumericRange;
  sessions: NumericRange;
  events: NumericRange;
}

const RANGE_CARDS: Array<{ key: keyof RangeFilters; title: string }> = [
  { key: "invoices", title: "Invoices" },
  { key: "payments", title: "Payments (count)" },
  { key: "expenses", title: "Expenses (count)" },
  { key: "clients", title: "Clients" },
  { key: "businesses", title: "Businesses" },
  { key: "sessions", title: "Sessions" },
  { key: "events", title: "Events" },
];

const ZERO_ID = "00000000-0000-0000-0000-000000000000";
const DAY_MS = 24 * 60 * 60 * 1000;

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
  pastDue: number;
  paymentsAll: number;
  expensesAll: number;
  clientsAll: number;
  businessesAll: number;
  templatesAll: number;
  taxesAll: number;
  paymentInstructionsAll: number;
  invoiceTotalsByCurrency: WebpanelCurrencyTotal[];
  invoiceStatusCounts: Record<string, number>;
  analyticsLastSeenTs: number | null;
  totalSessions: number;
  totalEvents: number;
  countries: string[];
  cities: string[];
  platforms: string[];
  appVersions: string[];
  eventNames: string[];
  deviceIds: string[];
  /** A retired guest (joined an account), a closed account, the admin, or the all-zero id. */
  systemRow: boolean;
  retired: boolean;
  ours: boolean;
  searchText: string;
}

/**
 * The app's invoice statuses, named for what they mean. `SENT` is what the app stores when an invoice is
 * saved and finished; it does not say the client ever received it (the audit of 2026-09-28).
 */
const STATUS_LABELS: Record<string, { label: string; title: string }> = {
  SENT: {
    label: "Saved",
    title: "Stored as SENT: saved and finished in the app. It does not mean the invoice reached the client.",
  },
  DRAFT: { label: "Draft", title: "Stored as DRAFT." },
  PAID: { label: "Paid", title: "Stored as PAID." },
  PARTIAL: { label: "Part-paid", title: "Stored as PARTIAL." },
  OVERDUE: {
    label: "Marked overdue",
    title: "Only what the app happened to mark OVERDUE. \"Past due date\" below counts from the due date itself.",
  },
  VIEWED: { label: "Viewed", title: "Stored as VIEWED." },
};

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

/** A user's total in one currency, exactly as the backend summed it; null when they have none in it. */
function amountIn(row: UserListRow, currency: string): number | null {
  const hit = row.invoiceTotalsByCurrency.find((entry) => entry.currency === currency);
  return hit ? Number(hit.amount) : null;
}

function timeOfDay(iso: string | null): string | null {
  if (!iso) return null;
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return null;
  return at.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

interface UserSortColumn {
  key: SortKey;
  label: string;
  align?: "left" | "right";
  title?: string;
}

const USER_SORT_COLUMNS: UserSortColumn[] = [
  { key: "email", label: "Email" },
  { key: "role", label: "Role" },
  { key: "country", label: "Country" },
  { key: "invoicesAll", label: "Invo-All", align: "right" },
  { key: "invoices30", label: "Invo-30d", align: "right" },
  {
    key: "pastDue",
    label: "Past due",
    align: "right",
    title: "Invoices saved, part-paid or marked overdue whose due date has passed (UTC), counted by the server",
  },
  { key: "paymentsAll", label: "Payments", align: "right" },
  { key: "expensesAll", label: "Expenses", align: "right" },
  {
    key: "invoiceTotal",
    label: "Invo-Totals",
    title: "Each currency's own total, never added together. Pick a currency above the list to sort or filter by it.",
  },
  {
    key: "revenue",
    label: "Revenue (USD)",
    align: "right",
    title: "What the account has earned us, lifetime: ads + premium net of tax and store fee (decision 0182). Sorting asks the server for accounts by revenue.",
  },
  {
    key: "lastActivity",
    label: "Last-Activity",
    title: "The latest of: a sign-in, a change to their data, or the app in use",
  },
  { key: "createdAt", label: "Created" },
  { key: "appVersion", label: "App-Version" },
];

/** A date box that looks empty when it is empty. Safari draws today's date in an empty one. */
function DateFilter({ label, value, onChange }: { label: string; value: string; onChange: (next: string) => void }) {
  return (
    <label className="filter-control">
      <span>{label}</span>
      <span className={`date-filter ${value ? "" : "date-filter-empty"}`}>
        <input className="input" type="date" value={value} onChange={(event) => onChange(event.target.value)} />
        {value ? (
          <button type="button" className="date-filter-clear" onClick={() => onChange("")} aria-label={`Clear ${label}`}>
            ×
          </button>
        ) : (
          <span className="date-filter-placeholder" aria-hidden="true">
            Any date
          </span>
        )}
      </span>
    </label>
  );
}

/** One key for this page's remembered filters (decision 0123). */
const PAGE = "users";
type StickyOf<T> = import("@/lib/stickyFilters").StickyCodec<T>;
const activityCodec = stickyOneOf(["ALL", "ACTIVE_30D", "INACTIVE_30D"] as const) as unknown as StickyOf<ActivityFilter>;
const sortCodec = stickyOneOf([
  "lastActivity", "createdAt", "email", "role", "country", "invoicesAll", "invoices30", "pastDue",
  "paymentsAll", "expensesAll", "invoiceTotal", "revenue", "appVersion",
] as const) as unknown as StickyOf<SortKey>;
const dirCodec = stickyOneOf(["asc", "desc"] as const) as unknown as StickyOf<SortDirection>;

export default function UsersPage() {
  const router = useRouter();

  const [users, setUsers] = useState<WebpanelUserListItem[]>([]);
  const [listAsOf, setListAsOf] = useState<string | null>(null);
  const [testingDevices, setTestingDevices] = useState<WebpanelTestingDeviceResponse[]>([]);
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [activityFilter, setActivityFilter] = useStickyState<ActivityFilter>(PAGE, "activity", "ALL", activityCodec);
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
  /** The currency the invoice-total column shows, sorts and filters by; "" = none picked. */
  const [totalCurrency, setTotalCurrency] = useState("");

  const [pastDueOnly, setPastDueOnly] = useState(false);
  const [noBusinessOnly, setNoBusinessOnly] = useState(false);
  const [noClientsOnly, setNoClientsOnly] = useState(false);
  const [noTemplatesOnly, setNoTemplatesOnly] = useState(false);
  const [noTaxesOnly, setNoTaxesOnly] = useState(false);
  const [noPaymentInstructionsOnly, setNoPaymentInstructionsOnly] = useState(false);
  const [excludeTestingDevices, setExcludeTestingDevices] = useState(true);
  const [showSystemRows, setShowSystemRows] = useState(false);

  const [sortKey, setSortKey] = useStickyState<SortKey>(PAGE, "sort", "lastActivity", sortCodec);
  const [sortDirection, setSortDirection] = useStickyState<SortDirection>(PAGE, "dir", "desc", dirCodec);
  const [pageSize, setPageSize] = useState(200);
  const [currentPage, setCurrentPage] = useState(1);

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Revenue (decision 0182): looked up for the rows on screen, so the list query stays as it was.
  const [revenueById, setRevenueById] = useState<Record<string, RevenueLifetime | null>>({});
  const [revenueError, setRevenueError] = useState("");
  const [revenueSummary, setRevenueSummary] = useState<RevenueSummary | null>(null);
  const [rankedRevenue, setRankedRevenue] = useState<RevenueLifetime[]>([]);
  const [rankedLoading, setRankedLoading] = useState(false);

  const revenueMode = sortKey === "revenue";
  const effectivePageSize = revenueMode ? Math.min(pageSize, 200) : pageSize;

  const handleSortChange = useCallback((nextKey: SortKey) => {
    if (nextKey === "revenue") {
      // The server ranks accounts by revenue, highest first; there is no other order to toggle to.
      setSortKey("revenue");
      setSortDirection("desc");
      return;
    }
    if (nextKey === "invoiceTotal" && !totalCurrency) return;
    if (sortKey === nextKey) {
      setSortDirection((currentDirection) => (currentDirection === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextKey);
    setSortDirection("desc");
  }, [sortKey, setSortKey, setSortDirection, totalCurrency]);

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
        // The compact shape: the six filter sets arrive already reduced (decision 0034). The full
        // one sent a per-event breakdown for every user only for this page to throw it away.
        api.getUsersList(),
        api.getTestingDevices(),
      ]);
      setUsers(usersResponse.users ?? []);
      setListAsOf(usersResponse.asOf);
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
    // Not part of the list: a missing summary only hides the "counted through" line.
    api.getRevenueSummary().then(setRevenueSummary).catch(() => setRevenueSummary(null));
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

  const testingDeviceIdSet = useMemo(
    () => new Set(testingDevices.map((device) => device.deviceId.trim().toLowerCase()).filter(Boolean)),
    [testingDevices],
  );

  const rows = useMemo<UserListRow[]>(() => {
    const now = Date.now();
    return users.map((user) => {
      const allTime = user.stats.allTime;
      const last30 = user.stats.last30Days;
      const allCounts = allTime.counts;
      const last30Counts = last30.counts;
      const statusCounts = allCounts.invoicesByStatus ?? {};
      const analytics = user.analytics;
      const ipCountry = user.ip?.countryCode?.trim() || user.ip?.country?.trim() || null;
      // Checked against the full shape for all 20,251 users on production (2026-09-28): the same
      // six sets for every user but the handful whose activity arrived between the two reads.
      const countries = uniqueSorted([...(analytics?.countries ?? []), ipCountry]);
      const cities = uniqueSorted(analytics?.cities ?? []);
      const platforms = uniqueSorted(analytics?.platforms ?? []);
      const appVersions = uniqueSorted(analytics?.appVersions ?? []);
      const eventNames = uniqueSorted(analytics?.eventNames ?? []);
      const deviceIds = uniqueSorted(analytics?.deviceIds ?? []);

      // The last thing the user did: a sign-in, a change to their data, or the app in use. A phone's
      // clock can run ahead, so an app time in the future is not taken as "now".
      const dataActivityTs = toTimestamp(allTime.activity.overallLastActivityAt ?? user.stats.lastLoginAt);
      const seenTs = toTimestamp(analytics?.lastSeenAt);
      const seenUsable = seenTs !== null && seenTs <= now + 5 * 60 * 1000 ? seenTs : null;
      const lastActivityTs =
        dataActivityTs === null ? seenUsable : seenUsable === null ? dataActivityTs : Math.max(dataActivityTs, seenUsable);
      const lastActivityAt = lastActivityTs === null ? null : new Date(lastActivityTs).toISOString();

      const retired = Boolean(user.isDeleted);
      const systemRow = retired || Boolean(user.closedAt) || user.role === "ADMIN" || user.id === ZERO_ID;
      const ours =
        Boolean(user.ours) || deviceIds.some((deviceId) => testingDeviceIdSet.has(deviceId.toLowerCase()));

      return {
        id: user.id,
        email: user.email,
        role: user.role,
        primaryCountry: countries[0] ?? null,
        createdAt: user.createdAt,
        createdAtTs: toTimestamp(user.createdAt),
        lastActivityAt,
        lastActivityTs,
        // Until 2026-09-29 this read "the server has any date in the 30-day slot", and the server put
        // every sign-in there whatever its age: 20,214 of 20,434 users were "active".
        hasActivity30: lastActivityTs !== null && lastActivityTs >= now - 30 * DAY_MS,
        invoicesAll: allCounts.invoices,
        invoices30: last30Counts.invoices,
        pastDue: allCounts.invoicesPastDue ?? statusCounts.OVERDUE ?? 0,
        paymentsAll: allCounts.payments,
        expensesAll: allCounts.expenses,
        clientsAll: allCounts.clients,
        businessesAll: allCounts.businesses,
        templatesAll: allCounts.templates,
        taxesAll: allCounts.taxes,
        paymentInstructionsAll: allCounts.paymentInstructions,
        invoiceTotalsByCurrency: allTime.totals.invoiceTotalsByCurrency ?? [],
        invoiceStatusCounts: statusCounts,
        analyticsLastSeenTs: seenTs,
        totalSessions: analytics?.totalSessions ?? 0,
        totalEvents: analytics?.totalEvents ?? 0,
        countries,
        cities,
        platforms,
        appVersions,
        eventNames,
        deviceIds,
        systemRow,
        retired,
        ours,
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
  }, [users, testingDeviceIdSet]);

  const rowsById = useMemo(() => new Map(rows.map((row) => [row.id, row])), [rows]);

  const roles = useMemo(
    () => Array.from(new Set(rows.map((row) => row.role))).sort((a, b) => a.localeCompare(b)),
    [rows],
  );

  const countryOptions = useMemo(() => uniqueSorted(rows.flatMap((row) => row.countries)), [rows]);
  const cityOptions = useMemo(() => uniqueSorted(rows.flatMap((row) => row.cities)), [rows]);
  const platformOptions = useMemo(() => uniqueSorted(rows.flatMap((row) => row.platforms)), [rows]);
  const appVersionOptions = useMemo(() => uniqueSorted(rows.flatMap((row) => row.appVersions)), [rows]);
  const eventNameOptions = useMemo(() => uniqueSorted(rows.flatMap((row) => row.eventNames)), [rows]);

  /** Currencies users bill in, most users first: the choices for the invoice-total column. */
  const currencyOptions = useMemo(() => {
    const users: Record<string, number> = {};
    rows.forEach((row) => row.invoiceTotalsByCurrency.forEach((entry) => {
      users[entry.currency] = (users[entry.currency] ?? 0) + 1;
    }));
    return Object.entries(users).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [rows]);

  /** Every filter but the status chips, so each chip can say how many users it would leave. */
  const baseRows = useMemo(() => {
    const createdFromTs = parseDateStart(createdFrom);
    const createdToTs = parseDateEnd(createdTo);
    const lastActivityFromTs = parseDateStart(lastActivityFrom);
    const lastActivityToTs = parseDateEnd(lastActivityTo);
    const analyticsLastSeenFromTs = parseDateStart(analyticsLastSeenFrom);
    const analyticsLastSeenToTs = parseDateEnd(analyticsLastSeenTo);
    const totalRangeSet = Boolean(totalCurrency) && (ranges.invoiceTotal.min !== "" || ranges.invoiceTotal.max !== "");

    return rows.filter((row) => {
      if (!showSystemRows && row.systemRow) return false;
      if (excludeTestingDevices && row.ours) return false;
      if (query && !row.searchText.includes(query)) return false;
      if (roleFilter !== "ALL" && row.role !== roleFilter) return false;
      if (activityFilter === "ACTIVE_30D" && !row.hasActivity30) return false;
      if (activityFilter === "INACTIVE_30D" && row.hasActivity30) return false;

      if (createdFromTs !== null && (row.createdAtTs === null || row.createdAtTs < createdFromTs)) return false;
      if (createdToTs !== null && (row.createdAtTs === null || row.createdAtTs > createdToTs)) return false;
      if (lastActivityFromTs !== null && (row.lastActivityTs === null || row.lastActivityTs < lastActivityFromTs)) return false;
      if (lastActivityToTs !== null && (row.lastActivityTs === null || row.lastActivityTs > lastActivityToTs)) return false;
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
      if (!withinRange(row.totalSessions, ranges.sessions)) return false;
      if (!withinRange(row.totalEvents, ranges.events)) return false;
      if (totalRangeSet) {
        // Within the picked currency only: a user with nothing in it is outside any range of it.
        const amount = amountIn(row, totalCurrency);
        if (amount === null || !withinRange(amount, ranges.invoiceTotal)) return false;
      }

      if (pastDueOnly && row.pastDue <= 0) return false;
      if (noBusinessOnly && row.businessesAll > 0) return false;
      if (noClientsOnly && row.clientsAll > 0) return false;
      if (noTemplatesOnly && row.templatesAll > 0) return false;
      if (noTaxesOnly && row.taxesAll > 0) return false;
      if (noPaymentInstructionsOnly && row.paymentInstructionsAll > 0) return false;
      if (countryFilter !== "ALL" && !row.countries.includes(countryFilter)) return false;
      if (cityFilter !== "ALL" && !row.cities.includes(cityFilter)) return false;
      if (platformFilter !== "ALL" && !row.platforms.includes(platformFilter)) return false;
      if (appVersionFilter !== "ALL" && !row.appVersions.includes(appVersionFilter)) return false;
      if (eventNameFilter !== "ALL" && !row.eventNames.includes(eventNameFilter)) return false;

      return true;
    });
  }, [
    activityFilter,
    analyticsLastSeenFrom,
    analyticsLastSeenTo,
    appVersionFilter,
    cityFilter,
    countryFilter,
    createdFrom,
    createdTo,
    excludeTestingDevices,
    eventNameFilter,
    lastActivityFrom,
    lastActivityTo,
    noBusinessOnly,
    noClientsOnly,
    noPaymentInstructionsOnly,
    noTaxesOnly,
    noTemplatesOnly,
    pastDueOnly,
    platformFilter,
    query,
    ranges,
    roleFilter,
    rows,
    showSystemRows,
    totalCurrency,
  ]);

  /** The status chips: how many of the users the other filters leave have at least one such invoice. */
  const invoiceStatusOptions = useMemo(() => {
    const byStatus: Record<string, { users: number; invoices: number }> = {};
    baseRows.forEach((row) => {
      Object.entries(row.invoiceStatusCounts).forEach(([status, count]) => {
        if (count > 0) {
          const entry = (byStatus[status] ??= { users: 0, invoices: 0 });
          entry.users += 1;
          entry.invoices += count;
        }
      });
    });
    return Object.entries(byStatus)
      .sort((a, b) => b[1].users - a[1].users || a[0].localeCompare(b[0]))
      .map(([status, counts]) => ({ status, ...counts }));
  }, [baseRows]);

  const pastDueUsers = useMemo(() => baseRows.filter((row) => row.pastDue > 0).length, [baseRows]);

  const processedRows = useMemo(() => {
    const filtered = invoiceStatusFilters.length === 0
      ? baseRows
      : baseRows.filter((row) => invoiceStatusFilters.some((status) => (row.invoiceStatusCounts[status] ?? 0) > 0));

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
        case "pastDue":
          return (a.pastDue - b.pastDue) * direction;
        case "paymentsAll":
          return (a.paymentsAll - b.paymentsAll) * direction;
        case "expensesAll":
          return (a.expensesAll - b.expensesAll) * direction;
        case "invoiceTotal": {
          if (!totalCurrency) return 0;
          // Compared within one currency only; a user with nothing in it goes last either way.
          const aAmount = amountIn(a, totalCurrency);
          const bAmount = amountIn(b, totalCurrency);
          if (aAmount === null && bAmount === null) return 0;
          if (aAmount === null) return 1;
          if (bAmount === null) return -1;
          return (aAmount - bAmount) * direction;
        }
        case "appVersion": {
          const aV = a.appVersions[a.appVersions.length - 1] ?? "";
          const bV = b.appVersions[b.appVersions.length - 1] ?? "";
          return aV.localeCompare(bV, undefined, { numeric: true, sensitivity: "base" }) * direction;
        }
        default:
          return 0;
      }
    });
  }, [baseRows, invoiceStatusFilters, sortDirection, sortKey, totalCurrency]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    activityFilter,
    analyticsLastSeenFrom,
    analyticsLastSeenTo,
    appVersionFilter,
    cityFilter,
    countryFilter,
    createdFrom,
    createdTo,
    eventNameFilter,
    excludeTestingDevices,
    invoiceStatusFilters,
    lastActivityFrom,
    lastActivityTo,
    noBusinessOnly,
    noClientsOnly,
    noPaymentInstructionsOnly,
    noTaxesOnly,
    noTemplatesOnly,
    pageSize,
    pastDueOnly,
    platformFilter,
    query,
    ranges,
    roleFilter,
    showSystemRows,
    sortDirection,
    sortKey,
    totalCurrency,
  ]);

  // Sorted by revenue: the server pages the accounts by lifetime revenue (decision 0182), in SQL.
  useEffect(() => {
    if (!revenueMode || isLoading) return;
    let cancelled = false;
    setRankedLoading(true);
    setRevenueError("");
    api.getRevenueRanked(currentPage - 1, effectivePageSize)
      .then((ranked) => {
        if (cancelled) return;
        setRankedRevenue(ranked ?? []);
        setRevenueById((prev) => {
          const next = { ...prev };
          (ranked ?? []).forEach((entry) => { next[entry.userId] = entry; });
          return next;
        });
      })
      .catch((rankError) => {
        if (cancelled) return;
        if (isUnauthorizedError(rankError)) {
          handleUnauthorized();
          return;
        }
        setRankedRevenue([]);
        setRevenueError(getErrorMessage(rankError, "Could not load accounts by revenue."));
      })
      .finally(() => {
        if (!cancelled) setRankedLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [revenueMode, currentPage, effectivePageSize, isLoading, handleUnauthorized]);

  const rankedRows = useMemo(
    () => rankedRevenue.map((entry) => rowsById.get(entry.userId)).filter((row): row is UserListRow => Boolean(row)),
    [rankedRevenue, rowsById],
  );
  const rankedMissing = rankedRevenue.length - rankedRows.length;

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(processedRows.length / effectivePageSize)),
    [effectivePageSize, processedRows.length],
  );

  useEffect(() => {
    if (!revenueMode && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages, revenueMode]);

  const pagedRows = useMemo(() => {
    if (revenueMode) return rankedRows;
    const start = (currentPage - 1) * effectivePageSize;
    return processedRows.slice(start, start + effectivePageSize);
  }, [currentPage, effectivePageSize, processedRows, rankedRows, revenueMode]);

  // The revenue of the rows on screen, 200 ids a request, each id asked once.
  const pagedIdsKey = pagedRows.map((row) => row.id).join(",");
  useEffect(() => {
    if (revenueMode || !pagedIdsKey) return;
    const missing = pagedIdsKey.split(",").filter((id) => !(id in revenueById));
    if (missing.length === 0) return;
    let cancelled = false;
    const chunks: string[][] = [];
    for (let i = 0; i < missing.length; i += 200) chunks.push(missing.slice(i, i + 200));
    Promise.all(chunks.map((chunk) => api.getRevenueLookup(chunk)))
      .then((answers) => {
        if (cancelled) return;
        setRevenueError("");
        setRevenueById((prev) => {
          const next = { ...prev };
          // No row = earned nothing (decision 0182).
          missing.forEach((id) => { next[id] = null; });
          answers.forEach((answer) => Object.entries(answer ?? {}).forEach(([id, lifetime]) => { next[id] = lifetime; }));
          return next;
        });
      })
      .catch((lookupError) => {
        if (cancelled) return;
        if (isUnauthorizedError(lookupError)) {
          handleUnauthorized();
          return;
        }
        setRevenueError(getErrorMessage(lookupError, "Could not load revenue."));
      });
    return () => {
      cancelled = true;
    };
    // revenueById is read, not watched: watching it would ask again for every answer that arrives.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagedIdsKey, revenueMode, handleUnauthorized]);

  const tableTotals = useMemo(() => {
    const totals = { invoicesAll: 0, invoices30: 0, pastDue: 0, paymentsAll: 0, expensesAll: 0, lastActivityCount: 0, createdAtCount: 0 };
    processedRows.forEach((row) => {
      totals.invoicesAll += row.invoicesAll;
      totals.invoices30 += row.invoices30;
      totals.pastDue += row.pastDue;
      totals.paymentsAll += row.paymentsAll;
      totals.expensesAll += row.expensesAll;
      if (row.lastActivityAt) totals.lastActivityCount += 1;
      if (row.createdAt) totals.createdAtCount += 1;
    });
    return {
      ...totals,
      users: processedRows.length,
      distinctRoles: new Set(processedRows.map((row) => row.role).filter(Boolean)).size,
      uniqueCountries: new Set(processedRows.map((row) => row.primaryCountry).filter(Boolean)).size,
    };
  }, [processedRows]);

  /**
   * The footer's money cell: no money at all. Adding 103 currencies gave "$58,255,723,345,089,406", and four
   * junk invoices of 9,999,999,999,999,999 were most of it. So it says how many of the listed users bill in
   * each currency — a count no single invoice can inflate — top three, then "+n more".
   */
  const currencyUsers = useMemo(() => {
    const byCurrency: Record<string, number> = {};
    processedRows.forEach((row) => row.invoiceTotalsByCurrency.forEach((entry) => {
      byCurrency[entry.currency] = (byCurrency[entry.currency] ?? 0) + 1;
    }));
    return Object.entries(byCurrency).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [processedRows]);

  const coverage = useMemo(() => {
    const total = processedRows.length;
    const cell = (count: number) => ({ count, percentage: total > 0 ? (count / total) * 100 : 0 });
    return {
      all: cell(total),
      role: cell(processedRows.filter((row) => row.role.trim().toUpperCase() === "USER").length),
      country: cell(processedRows.filter((row) => Boolean(row.primaryCountry?.trim())).length),
      invoicesAll: cell(processedRows.filter((row) => row.invoicesAll > 0).length),
      invoices30: cell(processedRows.filter((row) => row.invoices30 > 0).length),
      pastDue: cell(processedRows.filter((row) => row.pastDue > 0).length),
      paymentsAll: cell(processedRows.filter((row) => row.paymentsAll > 0).length),
      expensesAll: cell(processedRows.filter((row) => row.expensesAll > 0).length),
      invoiceTotal: cell(processedRows.filter((row) => row.invoiceTotalsByCurrency.length > 0).length),
      lastActivity: cell(processedRows.filter((row) => Boolean(row.lastActivityAt)).length),
      active30: cell(processedRows.filter((row) => row.hasActivity30).length),
      createdAt: cell(processedRows.filter((row) => Boolean(row.createdAt)).length),
      appVersion: cell(processedRows.filter((row) => row.appVersions.length > 0).length),
    };
  }, [processedRows]);

  const renderCoverage = (cell: { count: number; percentage: number }) => (
    <>
      <span>{cell.count}</span>
      <span className="users-table-summary-percentage">{cell.percentage.toFixed(0)}%</span>
    </>
  );

  const hiddenCounts = useMemo(() => ({
    system: rows.filter((row) => row.systemRow).length,
    ours: rows.filter((row) => row.ours && (showSystemRows || !row.systemRow)).length,
  }), [rows, showSystemRows]);

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
      if (key === "invoiceTotal" && !totalCurrency) return;
      if (ranges[key].min) count += 1;
      if (ranges[key].max) count += 1;
    });

    if (pastDueOnly) count += 1;
    count += invoiceStatusFilters.length;
    if (noBusinessOnly) count += 1;
    if (noClientsOnly) count += 1;
    if (noTemplatesOnly) count += 1;
    if (noTaxesOnly) count += 1;
    if (noPaymentInstructionsOnly) count += 1;
    if (excludeTestingDevices) count += 1;
    if (!showSystemRows) count += 1;
    return count;
  }, [
    activityFilter,
    analyticsLastSeenFrom,
    analyticsLastSeenTo,
    appVersionFilter,
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
    pastDueOnly,
    platformFilter,
    queryInput,
    ranges,
    roleFilter,
    showSystemRows,
    totalCurrency,
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

  const pickCurrency = useCallback((currency: string) => {
    setTotalCurrency(currency);
    if (!currency) {
      setRanges((prev) => ({ ...prev, invoiceTotal: { min: "", max: "" } }));
      if (sortKey === "invoiceTotal") setSortKey("lastActivity");
    }
  }, [setSortKey, sortKey]);

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
    setTotalCurrency("");
    setPastDueOnly(false);
    setNoBusinessOnly(false);
    setNoClientsOnly(false);
    setNoTemplatesOnly(false);
    setNoTaxesOnly(false);
    setNoPaymentInstructionsOnly(false);
    setExcludeTestingDevices(true);
    setShowSystemRows(false);
    setSortKey("lastActivity");
    setSortDirection("desc");
    setPageSize(200);
  }, [setActivityFilter, setSortKey, setSortDirection]);

  const asOfLabel = timeOfDay(listAsOf);
  const revenueThrough = countedThrough(revenueSummary?.state);

  return (
    <main className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Navbar title="Users" />
        <section className="content-wrap">
        {/* Emails and phone numbers in this list are masked (the owner, 2026-09-14), so a person is
            found here, on the server, where the lookup is recorded. */}
        <SupportLookup />

        <SearchBar
          value={queryInput}
          onChange={setQueryInput}
          label="Filter this list"
          placeholder="Filter by role, user id, country or app version (emails are masked: use Find a user above)"
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
              <select className="input" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
                <option value="ALL">All roles</option>
                {roles.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </label>

            <label className="filter-control" title="Active = a sign-in, a change to their data, or the app in use within the last 30 days">
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

            <DateFilter label="Created From" value={createdFrom} onChange={setCreatedFrom} />
            <DateFilter label="Created To" value={createdTo} onChange={setCreatedTo} />
            <DateFilter label="Last Activity From" value={lastActivityFrom} onChange={setLastActivityFrom} />
            <DateFilter label="Last Activity To" value={lastActivityTo} onChange={setLastActivityTo} />
            <DateFilter label="Analytics Last Seen From" value={analyticsLastSeenFrom} onChange={setAnalyticsLastSeenFrom} />
            <DateFilter label="Analytics Last Seen To" value={analyticsLastSeenTo} onChange={setAnalyticsLastSeenTo} />

            <label className="filter-control">
              <span>Country</span>
              <select className="input" value={countryFilter} onChange={(event) => setCountryFilter(event.target.value)}>
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
              <select className="input" value={cityFilter} onChange={(event) => setCityFilter(event.target.value)}>
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
              <select className="input" value={platformFilter} onChange={(event) => setPlatformFilter(event.target.value)}>
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
              <select className="input" value={appVersionFilter} onChange={(event) => setAppVersionFilter(event.target.value)}>
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
              <select className="input" value={eventNameFilter} onChange={(event) => setEventNameFilter(event.target.value)}>
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
            {RANGE_CARDS.map((card) => (
              <div className="range-card" key={card.key}>
                <p className="range-title">{card.title}</p>
                <div className="range-inputs">
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="1"
                    value={ranges[card.key].min}
                    onChange={(event) => updateRange(card.key, "min", event.target.value)}
                    placeholder="Min"
                  />
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="1"
                    value={ranges[card.key].max}
                    onChange={(event) => updateRange(card.key, "max", event.target.value)}
                    placeholder="Max"
                  />
                </div>
              </div>
            ))}

            <div className="range-card" title="Totals are compared within one currency only; they are never added across currencies.">
              <p className="range-title">Invoice total, in</p>
              <select className="input" value={totalCurrency} onChange={(event) => pickCurrency(event.target.value)}>
                <option value="">Pick a currency…</option>
                {currencyOptions.map(([currency, count]) => (
                  <option key={currency} value={currency}>
                    {currency} ({count} users)
                  </option>
                ))}
              </select>
              <div className="range-inputs">
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="0.01"
                  disabled={!totalCurrency}
                  value={ranges.invoiceTotal.min}
                  onChange={(event) => updateRange("invoiceTotal", "min", event.target.value)}
                  placeholder="Min"
                />
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="0.01"
                  disabled={!totalCurrency}
                  value={ranges.invoiceTotal.max}
                  onChange={(event) => updateRange("invoiceTotal", "max", event.target.value)}
                  placeholder="Max"
                />
              </div>
            </div>

            <div
              className="range-card range-card-disabled"
              title="A payment or an expense row carries no currency in the database, so an amount filter would compare rupees with dollars. The counts above still filter."
            >
              <p className="range-title">Payment / expense amounts</p>
              <p className="results-meta">No filter: payments and expenses store no currency, so their amounts cannot be compared.</p>
            </div>
          </div>

          <div className="status-filter-wrap">
            <div className="status-filter-head">
              <p className="range-title" title="How many of the users the other filters leave have at least one invoice in that state, and how many such invoices they have">
                Invoice states — users (invoices)
              </p>
              {invoiceStatusFilters.length > 0 ? (
                <button type="button" className="btn btn-outline status-clear-btn" onClick={() => setInvoiceStatusFilters([])}>
                  Clear Statuses
                </button>
              ) : null}
            </div>

            {invoiceStatusOptions.length === 0 ? (
              <p className="results-meta">No invoices among these users.</p>
            ) : (
              <div className="status-filter-grid">
                {invoiceStatusOptions.map((option) => (
                  <label key={option.status} className="status-filter-item" title={STATUS_LABELS[option.status]?.title ?? option.status}>
                    <input
                      type="checkbox"
                      checked={invoiceStatusFilters.includes(option.status)}
                      onChange={() => toggleInvoiceStatusFilter(option.status)}
                    />
                    <span className="status-filter-name">{STATUS_LABELS[option.status]?.label ?? option.status}</span>
                    <span className="status-filter-count">
                      {option.users.toLocaleString()} ({option.invoices.toLocaleString()})
                    </span>
                  </label>
                ))}
                <label
                  className="status-filter-item"
                  title="Saved, part-paid or marked-overdue invoices whose due date has passed (UTC), counted by the server from the due date"
                >
                  <input type="checkbox" checked={pastDueOnly} onChange={(event) => setPastDueOnly(event.target.checked)} />
                  <span className="status-filter-name">Past due date</span>
                  <span className="status-filter-count">{pastDueUsers.toLocaleString()}</span>
                </label>
              </div>
            )}
          </div>

          <div className="toggle-grid">
            <label className="toggle-item">
              <input type="checkbox" checked={noBusinessOnly} onChange={(event) => setNoBusinessOnly(event.target.checked)} />
              No Business
            </label>
            <label className="toggle-item">
              <input type="checkbox" checked={noClientsOnly} onChange={(event) => setNoClientsOnly(event.target.checked)} />
              No Clients
            </label>
            <label className="toggle-item">
              <input type="checkbox" checked={noTemplatesOnly} onChange={(event) => setNoTemplatesOnly(event.target.checked)} />
              No Templates
            </label>
            <label className="toggle-item">
              <input type="checkbox" checked={noTaxesOnly} onChange={(event) => setNoTaxesOnly(event.target.checked)} />
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
            <label
              className="toggle-item"
              title="Our test accounts, every account seen on one of our phones (the list the Health Centre uses) and the Testing Devices page"
            >
              <input
                type="checkbox"
                checked={excludeTestingDevices}
                onChange={(event) => setExcludeTestingDevices(event.target.checked)}
              />
              Hide our own accounts &amp; phones ({hiddenCounts.ours})
            </label>
            <label
              className="toggle-item"
              title="Guests that joined an account (their data moved there), closed accounts, the admin and the all-zero id"
            >
              <input type="checkbox" checked={showSystemRows} onChange={(event) => setShowSystemRows(event.target.checked)} />
              Show retired, closed &amp; admin rows ({hiddenCounts.system})
            </label>
          </div>
        </section>

        {isLoading ? <LoadingState message="Loading users..." /> : null}

        {!isLoading && error ? <ErrorState message={error} onRetry={loadUsers} /> : null}

        {!isLoading && !error && users.length === 0 ? <EmptyState message="No users found." /> : null}

        {!isLoading && !error && users.length > 0 ? (
          processedRows.length > 0 || revenueMode ? (
            <div className="users-table-wrap">
              <div className="users-toolbar">
                <p className="results-meta">
                  {revenueMode
                    ? `Accounts by revenue, highest first — page ${currentPage}, ${pagedRows.length} shown`
                    : `Showing ${pagedRows.length} of ${processedRows.length} filtered users (total ${users.length})`}
                  {asOfLabel ? (
                    <span title="The server keeps this list for up to 20 minutes; reload the page for a fresher one">
                      {" "}· list as of {asOfLabel}
                    </span>
                  ) : null}
                  {revenueThrough ? (
                    <span title={BANNER_NOTE}> · revenue counted through {revenueThrough}</span>
                  ) : null}
                  {revenueError ? <span className="users-toolbar-error"> · {revenueError}</span> : null}
                </p>
                <div className="users-toolbar-controls">
                  <label className="filter-control-inline">
                    <span>Rows</span>
                    <select className="input" value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>
                      <option value={100}>100</option>
                      <option value={200}>200</option>
                      <option value={500} disabled={revenueMode}>500</option>
                    </select>
                  </label>
                </div>
              </div>

              {revenueMode ? (
                <p className="users-revenue-banner">
                  Sorted by revenue on the server (decision 0182). The filters above do not apply in this order,
                  and accounts that have earned nothing are not listed. Click another column to go back.
                  {rankedMissing > 0 ? ` ${rankedMissing} account(s) on this page are newer than the list and not shown.` : ""}
                </p>
              ) : null}

              <div className="users-table">
                <div className="users-table-head-wrap">
                  <div className="users-table-head">
                    {USER_SORT_COLUMNS.map((column) => {
                      const isActive = sortKey === column.key;
                      const disabled = column.key === "invoiceTotal" && !totalCurrency;
                      const arrow = disabled ? "" : !isActive ? "↕" : sortDirection === "asc" ? "↑" : "↓";
                      const label = column.key === "invoiceTotal" && totalCurrency ? `Invo-Total ${totalCurrency}` : column.label;

                      return (
                        <button
                          key={column.key}
                          type="button"
                          className={`users-table-head-button ${column.align === "right" ? "users-table-head-button-right" : ""} ${isActive ? "users-table-head-button-active" : ""}`}
                          onClick={() => handleSortChange(column.key)}
                          disabled={disabled}
                          title={
                            disabled
                              ? "Pick a currency above the list to sort by it: totals in different currencies cannot be compared"
                              : column.title ?? `Sort by ${column.label}`
                          }
                        >
                          <span>{label}</span>
                          <span className="users-table-head-arrow" aria-hidden="true">{arrow}</span>
                        </button>
                      );
                    })}
                  </div>
                  {!revenueMode ? (
                    <>
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
                          <span className="users-table-summary-value">{tableTotals.pastDue}</span>
                        </span>
                        <span className="users-table-summary-cell users-table-summary-cell-right">
                          <span className="users-table-summary-label">Total</span>
                          <span className="users-table-summary-value">{tableTotals.paymentsAll}</span>
                        </span>
                        <span className="users-table-summary-cell users-table-summary-cell-right">
                          <span className="users-table-summary-label">Total</span>
                          <span className="users-table-summary-value">{tableTotals.expensesAll}</span>
                        </span>
                        <span
                          className="users-table-summary-cell"
                          title={`Users billing in each currency (no amounts are added across currencies):\n${currencyUsers.map(([c, n]) => `${c} ${n}`).join("\n")}`}
                        >
                          <span className="users-table-summary-label">Users by currency</span>
                          <span className="users-table-summary-value">
                            {currencyUsers.slice(0, 3).map(([c, n]) => `${c} ${n}`).join(" · ") || "-"}
                            {currencyUsers.length > 3 ? ` +${currencyUsers.length - 3} more` : ""}
                          </span>
                        </span>
                        <span
                          className="users-table-summary-cell users-table-summary-cell-right"
                          title={`Every account, lifetime, as the revenue job has counted it. ${BANNER_NOTE}`}
                        >
                          <span className="users-table-summary-label">All accounts</span>
                          <span className="users-table-summary-value">{revenueSummary ? usd(revenueSummary.money.totalMicros) : "-"}</span>
                        </span>
                        <span className="users-table-summary-cell">
                          <span className="users-table-summary-label">Active 30d</span>
                          <span className="users-table-summary-value">{coverage.active30.count}</span>
                        </span>
                        <span className="users-table-summary-cell">
                          <span className="users-table-summary-label">Available</span>
                          <span className="users-table-summary-value">{tableTotals.createdAtCount}</span>
                        </span>
                        <span className="users-table-summary-cell">
                          <span className="users-table-summary-label">With Data</span>
                          <span className="users-table-summary-value">{coverage.appVersion.count}</span>
                        </span>
                      </div>
                      <div className="users-table-summary users-table-summary-secondary">
                        <span className="users-table-summary-cell">
                          <span className="users-table-summary-label">Coverage</span>
                          <span className="users-table-summary-value">{renderCoverage(coverage.all)}</span>
                        </span>
                        <span className="users-table-summary-cell">
                          <span className="users-table-summary-label">User</span>
                          <span className="users-table-summary-value">{renderCoverage(coverage.role)}</span>
                        </span>
                        <span className="users-table-summary-cell">
                          <span className="users-table-summary-label">Non-Null</span>
                          <span className="users-table-summary-value">{renderCoverage(coverage.country)}</span>
                        </span>
                        <span className="users-table-summary-cell users-table-summary-cell-right">
                          <span className="users-table-summary-label">&gt; 0</span>
                          <span className="users-table-summary-value">{renderCoverage(coverage.invoicesAll)}</span>
                        </span>
                        <span className="users-table-summary-cell users-table-summary-cell-right">
                          <span className="users-table-summary-label">&gt; 0</span>
                          <span className="users-table-summary-value">{renderCoverage(coverage.invoices30)}</span>
                        </span>
                        <span className="users-table-summary-cell users-table-summary-cell-right">
                          <span className="users-table-summary-label">&gt; 0</span>
                          <span className="users-table-summary-value">{renderCoverage(coverage.pastDue)}</span>
                        </span>
                        <span className="users-table-summary-cell users-table-summary-cell-right">
                          <span className="users-table-summary-label">&gt; 0</span>
                          <span className="users-table-summary-value">{renderCoverage(coverage.paymentsAll)}</span>
                        </span>
                        <span className="users-table-summary-cell users-table-summary-cell-right">
                          <span className="users-table-summary-label">&gt; 0</span>
                          <span className="users-table-summary-value">{renderCoverage(coverage.expensesAll)}</span>
                        </span>
                        <span className="users-table-summary-cell">
                          <span className="users-table-summary-label">Any invoice</span>
                          <span className="users-table-summary-value">{renderCoverage(coverage.invoiceTotal)}</span>
                        </span>
                        <span className="users-table-summary-cell users-table-summary-cell-right">
                          <span className="users-table-summary-label">Accounts</span>
                          <span className="users-table-summary-value">{revenueSummary ? revenueSummary.accounts.toLocaleString() : "-"}</span>
                        </span>
                        <span className="users-table-summary-cell">
                          <span className="users-table-summary-label">Active 30d</span>
                          <span className="users-table-summary-value">{renderCoverage(coverage.active30)}</span>
                        </span>
                        <span className="users-table-summary-cell">
                          <span className="users-table-summary-label">Non-Null</span>
                          <span className="users-table-summary-value">{renderCoverage(coverage.createdAt)}</span>
                        </span>
                        <span className="users-table-summary-cell">
                          <span className="users-table-summary-label">&gt; 0</span>
                          <span className="users-table-summary-value">{renderCoverage(coverage.appVersion)}</span>
                        </span>
                      </div>
                    </>
                  ) : null}
                </div>
                <div className="users-table-body">
                  {revenueMode && rankedLoading ? <LoadingState message="Loading accounts by revenue..." /> : null}
                  {pagedRows.map((row) => (
                    <UserCard
                      key={row.id}
                      totalCurrency={totalCurrency || undefined}
                      row={{
                        email: row.email,
                        role: row.role,
                        country: row.primaryCountry,
                        invoicesAll: row.invoicesAll,
                        invoices30: row.invoices30,
                        pastDue: row.pastDue,
                        paymentsAll: row.paymentsAll,
                        expensesAll: row.expensesAll,
                        invoiceTotalsByCurrency: row.invoiceTotalsByCurrency,
                        revenue: revenueById[row.id],
                        retired: row.retired,
                        lastActivityAt: row.lastActivityAt,
                        createdAt: row.createdAt,
                        appVersions: row.appVersions,
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
                  {revenueMode ? `Page ${currentPage}` : `Page ${currentPage} of ${totalPages}`}
                </p>
                <button
                  type="button"
                  className="btn btn-outline"
                  disabled={revenueMode ? rankedRevenue.length < effectivePageSize : currentPage >= totalPages}
                  onClick={() => setCurrentPage((prev) => (revenueMode ? prev + 1 : Math.min(totalPages, prev + 1)))}
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
