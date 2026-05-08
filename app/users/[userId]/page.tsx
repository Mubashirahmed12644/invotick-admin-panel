"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import EmptyState from "@/components/EmptyState";
import ErrorState from "@/components/ErrorState";
import InvoiceTable from "@/components/InvoiceTable";
import LoadingState from "@/components/LoadingState";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import { SelectedEventDetails } from "@/features/user-based-screen-flow/components/SelectedEventDetails";
import { TimelineGraphV2 } from "@/features/user-based-screen-flow/components/TimelineGraphV2";
import type { EventPoint, UserFlowRecord } from "@/features/user-based-screen-flow/types";
import { mapTimelineResponseToRecord } from "@/features/user-based-screen-flow/utils";
import {
  fallbackNumber,
  fallbackText,
  formatCurrency,
  formatDateTime,
  formatRelativeTime,
} from "@/lib/format";
import { api, getErrorMessage, isUnauthorizedError } from "@/lib/api";
import { clearAccessToken, isLoggedIn } from "@/lib/auth";
import type {
  AppFlowTimelineResponse,
  WebpanelInvoiceSummaryResponse,
  WebpanelUserAnalyticsLocation,
  WebpanelUserStatsResponse,
  WebpanelUserStatsSection,
  WebpanelUserStatsSummary,
  WebpanelUserStatsAndAnalyticsByUserIdResponse,
} from "@/lib/types";

const numberFormatter = new Intl.NumberFormat("en-US");
const STATUS_COLORS = ["#2563eb", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#7c3aed", "#14b8a6", "#f97316"] as const;
const COMPARISON_METRICS = [
  { key: "inventoryItems", label: "Inventory Items" },
  { key: "expenses", label: "Expenses" },
  { key: "payments", label: "Payments" },
  { key: "invoices", label: "Invoices" },
  { key: "clients", label: "Clients" },
  { key: "businesses", label: "Businesses" },
] as const;
const ENTITY_COUNT_METRICS = [
  { key: "businesses", label: "Businesses" },
  { key: "clients", label: "Clients" },
  { key: "invoices", label: "Invoices" },
  { key: "invoiceSynced", label: "Invoice Synced" },
  { key: "payments", label: "Payments" },
  { key: "expenses", label: "Expenses" },
  { key: "expenseSynced", label: "Expense Synced" },
  { key: "inventoryItems", label: "Inventory Items" },
  { key: "merchants", label: "Merchants" },
  { key: "templates", label: "Templates" },
  { key: "templatesSaved", label: "Templates Saved" },
  { key: "templatesCustom", label: "Templates Custom" },
  { key: "paymentInstructions", label: "Payment Instructions" },
  { key: "taxes", label: "Taxes" },
  { key: "terms", label: "Terms" },
  { key: "headers", label: "Headers" },
  { key: "backgrounds", label: "Backgrounds" },
  { key: "signatures", label: "Signatures" },
  { key: "stamps", label: "Stamps" },
  { key: "itemCategories", label: "Item Categories" },
  { key: "unitTypes", label: "Unit Types" },
] as const;
const INVOICE_STATUS_ORDER = [
  "SENT",
  "DRAFT",
  "VIEWED",
  "PARTIAL",
  "PAID",
  "OVERDUE",
  "CANCELLED",
  "UNCOLLECTIBLE",
  "REFUNDED",
] as const;

function formatInt(value: number | null | undefined): string {
  return numberFormatter.format(fallbackNumber(value, 0));
}

function formatRelativeTimeCompact(value: string | null | undefined): string {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";

  let diffMs = Date.now() - parsed.getTime();
  const isFuture = diffMs < 0;
  diffMs = Math.abs(diffMs);

  const units = [
    { label: "y", ms: 365 * 24 * 60 * 60 * 1000 },
    { label: "mo", ms: 30 * 24 * 60 * 60 * 1000 },
    { label: "d", ms: 24 * 60 * 60 * 1000 },
    { label: "h", ms: 60 * 60 * 1000 },
    { label: "m", ms: 60 * 1000 },
    { label: "s", ms: 1000 },
  ] as const;

  const parts: string[] = [];
  let remainder = diffMs;

  for (const unit of units) {
    if (parts.length === 2) break;
    const amount = Math.floor(remainder / unit.ms);
    if (amount > 0) {
      parts.push(`${amount}${unit.label}`);
      remainder -= amount * unit.ms;
    }
  }

  if (parts.length === 0) {
    return "just now";
  }

  return `${parts.join(" ")} ${isFuture ? "from now" : "ago"}`;
}

function pickPrimaryLocation(locations: WebpanelUserAnalyticsLocation[] | undefined) {
  return [...(locations ?? [])].sort((a, b) => b.sessionCount - a.sessionCount)[0] ?? null;
}

const EMPTY_STATS_SECTION: WebpanelUserStatsSection = {
  activity: {
    overallLastActivityAt: null,
  },
  counts: {
    businesses: 0,
    clients: 0,
    invoices: 0,
    invoicesByStatus: {},
    invoiceSynced: 0,
    payments: 0,
    expenses: 0,
    expenseSynced: 0,
    inventoryItems: 0,
    merchants: 0,
    templates: 0,
    templatesSaved: 0,
    templatesCustom: 0,
    paymentInstructions: 0,
    taxes: 0,
    terms: 0,
    headers: 0,
    backgrounds: 0,
    signatures: 0,
    stamps: 0,
    itemCategories: 0,
    unitTypes: 0,
  },
  totals: {
    invoiceTotalAmount: 0,
    paymentTotalAmount: 0,
    expenseTotalAmount: 0,
  },
  lastUpdatedAt: {
    businesses: null,
    clients: null,
    invoices: null,
    payments: null,
    expenses: null,
    inventoryItems: null,
    merchants: null,
    templates: null,
    paymentInstructions: null,
    taxes: null,
    terms: null,
    headers: null,
    backgrounds: null,
    signatures: null,
    stamps: null,
    itemCategories: null,
    unitTypes: null,
  },
};

type UserProfileResponse = WebpanelUserStatsAndAnalyticsByUserIdResponse &
  Partial<WebpanelUserStatsResponse> & {
    stats?: WebpanelUserStatsSummary;
  };

function getProfileStats(profile: UserProfileResponse): WebpanelUserStatsSummary {
  if (profile.stats?.allTime && profile.stats?.last30Days) {
    return profile.stats;
  }

  return {
    lastLoginAt: profile.lastLoginAt ?? null,
    allTime: profile.allTime ?? EMPTY_STATS_SECTION,
    last30Days: profile.last30Days ?? EMPTY_STATS_SECTION,
  };
}

function describeArcSegment(radius: number, startRatio: number, endRatio: number): string {
  const startAngle = (startRatio * Math.PI * 2) - (Math.PI / 2);
  const endAngle = (endRatio * Math.PI * 2) - (Math.PI / 2);
  const startX = 110 + (radius * Math.cos(startAngle));
  const startY = 110 + (radius * Math.sin(startAngle));
  const endX = 110 + (radius * Math.cos(endAngle));
  const endY = 110 + (radius * Math.sin(endAngle));
  const largeArcFlag = endRatio - startRatio > 0.5 ? 1 : 0;
  return `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`;
}

export default function UserDetailPage() {
  const router = useRouter();
  const params = useParams<{ userId: string }>();
  const userId = Array.isArray(params.userId) ? params.userId[0] : params.userId;

  const [profile, setProfile] = useState<UserProfileResponse | null>(null);
  const [invoices, setInvoices] = useState<WebpanelInvoiceSummaryResponse[]>([]);
  const [timeline, setTimeline] = useState<AppFlowTimelineResponse | null>(null);
  const [timelineRecord, setTimelineRecord] = useState<UserFlowRecord | null>(null);
  const [selectedTimelinePoint, setSelectedTimelinePoint] = useState<EventPoint | null>(null);
  const [hoveredMetricKey, setHoveredMetricKey] = useState<string | null>(null);
  const [selectedMetricKey, setSelectedMetricKey] = useState<string | null>(null);
  const [hoveredStatusKey, setHoveredStatusKey] = useState<string | null>(null);
  const [selectedStatusKey, setSelectedStatusKey] = useState<string | null>(null);

  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [isInvoicesLoading, setIsInvoicesLoading] = useState(true);
  const [isTimelineLoading, setIsTimelineLoading] = useState(true);

  const [profileError, setProfileError] = useState("");
  const [invoicesError, setInvoicesError] = useState("");
  const [timelineError, setTimelineError] = useState("");

  const handleUnauthorized = useCallback(() => {
    clearAccessToken({ sessionExpired: true });
    router.replace("/login");
  }, [router]);

  const loadProfile = useCallback(async () => {
    if (!isLoggedIn()) {
      router.replace("/login");
      return;
    }

    setIsProfileLoading(true);
    setProfileError("");

    try {
      const response = await api.getUserStatsAndAnalytics(userId);
      setProfile(response as UserProfileResponse);
    } catch (profileLoadError) {
      if (isUnauthorizedError(profileLoadError)) {
        handleUnauthorized();
        return;
      }

      setProfileError(getErrorMessage(profileLoadError, "Failed to load user profile."));
    } finally {
      setIsProfileLoading(false);
    }
  }, [handleUnauthorized, router, userId]);

  const loadInvoices = useCallback(async () => {
    if (!isLoggedIn()) {
      router.replace("/login");
      return;
    }

    setIsInvoicesLoading(true);
    setInvoicesError("");

    try {
      const response = await api.getInvoices(userId);
      setInvoices(response ?? []);
    } catch (invoicesLoadError) {
      if (isUnauthorizedError(invoicesLoadError)) {
        handleUnauthorized();
        return;
      }

      setInvoicesError(getErrorMessage(invoicesLoadError, "Failed to load invoices."));
    } finally {
      setIsInvoicesLoading(false);
    }
  }, [handleUnauthorized, router, userId]);

  const loadTimeline = useCallback(async () => {
    if (!isLoggedIn()) {
      router.replace("/login");
      return;
    }

    setIsTimelineLoading(true);
    setTimelineError("");

    try {
      const response = await api.getAppFlowTimeline({ userId });
      setTimeline(response);
      setTimelineRecord(mapTimelineResponseToRecord(response));
    } catch (timelineLoadError) {
      if (isUnauthorizedError(timelineLoadError)) {
        handleUnauthorized();
        return;
      }

      setTimeline(null);
      setTimelineRecord(null);
      setTimelineError(getErrorMessage(timelineLoadError, "Failed to load timeline graph."));
    } finally {
      setIsTimelineLoading(false);
    }
  }, [handleUnauthorized, router, userId]);

  useEffect(() => {
    void Promise.all([loadProfile(), loadInvoices(), loadTimeline()]);
  }, [loadInvoices, loadProfile, loadTimeline]);

  const derived = useMemo(() => {
    if (!profile) {
      return null;
    }

    const stats = getProfileStats(profile);
    const allTime = stats.allTime;
    const last30 = stats.last30Days;
    const analytics = profile.analytics;
    const ip = profile.ip;
    const primaryLocation = pickPrimaryLocation(analytics?.locations);
    const locations = analytics?.locations ?? [];
    const devices = analytics?.devices ?? [];
    const appVersions = analytics?.appVersions ?? [];
    const topPlatforms = Array.from(
      new Set([
        ...locations.flatMap((location) => location.platforms),
        ...devices.flatMap((device) => device.platforms),
      ].filter(Boolean)),
    );
    const topVersion = appVersions
      .map((version) => version.appVersion)
      .find((value): value is string => Boolean(value?.trim()));
    const allInvoiceTotal = fallbackNumber(allTime.totals.invoiceTotalAmount, 0);
    const allPaymentTotal = fallbackNumber(allTime.totals.paymentTotalAmount, 0);
    const allExpenseTotal = fallbackNumber(allTime.totals.expenseTotalAmount, 0);
    const last30InvoiceTotal = fallbackNumber(last30.totals.invoiceTotalAmount, 0);
    const last30PaymentTotal = fallbackNumber(last30.totals.paymentTotalAmount, 0);
    const last30ExpenseTotal = fallbackNumber(last30.totals.expenseTotalAmount, 0);
    const totalSessions = fallbackNumber(analytics?.totalSessions, 0);
    const totalEvents = fallbackNumber(analytics?.totalEvents, 0);
    const totalDevices = fallbackNumber(analytics?.totalDistinctDevices, 0);
    const totalLocations = fallbackNumber(analytics?.totalDistinctLocations, 0);
    const totalVersions = fallbackNumber(analytics?.totalDistinctAppVersions, 0);
    const collectionRate = allInvoiceTotal > 0 ? (allPaymentTotal / allInvoiceTotal) * 100 : 0;
    const recentBusinessActivity =
      fallbackNumber(last30.counts.invoices, 0) +
      fallbackNumber(last30.counts.payments, 0) +
      fallbackNumber(last30.counts.expenses, 0);
    const lastActivityAt =
      allTime.activity.overallLastActivityAt ??
      last30.activity.overallLastActivityAt ??
      stats.lastLoginAt ??
      analytics?.lastSeenAt ??
      null;
    const geoCountry = primaryLocation?.country ?? ip?.countryCode ?? ip?.country ?? null;
    const geoCity = primaryLocation?.city ?? ip?.city ?? null;
    const comparisonStats = COMPARISON_METRICS.map((metric) => ({
      ...metric,
      allTime: fallbackNumber(allTime.counts[metric.key], 0),
      last30: fallbackNumber(last30.counts[metric.key], 0),
    }));
    const comparisonMax = Math.max(
      1,
      ...comparisonStats.flatMap((metric) => [metric.allTime, metric.last30]),
    );
    const statusRows = INVOICE_STATUS_ORDER.map((status, index) => ({
      status,
      color: STATUS_COLORS[index % STATUS_COLORS.length],
      allTime: fallbackNumber(allTime.counts.invoicesByStatus?.[status], 0),
      last30: fallbackNumber(last30.counts.invoicesByStatus?.[status], 0),
    }));
    const donutOuter = statusRows.filter((row) => row.allTime > 0);
    const donutInner = statusRows.filter((row) => row.last30 > 0);
    const donutOuterTotal = donutOuter.reduce((sum, row) => sum + row.allTime, 0);
    const donutInnerTotal = donutInner.reduce((sum, row) => sum + row.last30, 0);
    return {
      stats,
      analytics,
      ip,
      primaryLocation,
      topPlatforms,
      topVersion,
      allInvoiceTotal,
      allPaymentTotal,
      allExpenseTotal,
      last30InvoiceTotal,
      last30PaymentTotal,
      last30ExpenseTotal,
      totalSessions,
      totalEvents,
      totalDevices,
      totalLocations,
      totalVersions,
      collectionRate,
      recentBusinessActivity,
      lastActivityAt,
      geoCountry,
      geoCity,
      comparisonStats,
      comparisonMax,
      statusRows,
      donutOuter,
      donutInner,
      donutOuterTotal,
      donutInnerTotal,
    };
  }, [profile]);

  const locationCode = profile?.ip?.countryCode?.trim().toUpperCase() ?? null;
  const locationFlagUrl =
    locationCode && /^[A-Z]{2}$/.test(locationCode)
      ? `https://flagcdn.com/w40/${locationCode.toLowerCase()}.png`
      : null;
  const activeMetricKey = hoveredMetricKey ?? selectedMetricKey;
  const activeStatusKey = hoveredStatusKey ?? selectedStatusKey;

  return (
    <main className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Navbar title="User Detail" />
        <section className="content-wrap">
          {isProfileLoading ? <LoadingState message="Loading user profile..." /> : null}
          {!isProfileLoading && profileError ? (
            <ErrorState message={profileError} onRetry={loadProfile} />
          ) : null}
          {!isProfileLoading && !profileError && !profile ? (
            <EmptyState message="No user profile available." />
          ) : null}

          {!isProfileLoading && !profileError && profile && derived ? (
            <>
              <section className="user-insight-hero">
                <div className="user-insight-main">
                  <p className="user-detail-label">User Profile</p>
                  <h1>{fallbackText(profile.email, userId)}</h1>
                  <div className="user-detail-badges">
                    <span className="user-pill">{fallbackText(profile.role, "No Role")}</span>
                    <span className={`user-pill ${profile.isActive ? "user-pill-ok" : "user-pill-bad"}`}>
                      {profile.isActive ? "Active" : "Inactive"}
                    </span>
                    <span
                      className={`user-pill ${
                        profile.isEmailVerified ? "user-pill-info" : "user-pill-neutral"
                      }`}
                    >
                      {profile.isEmailVerified ? "Email Verified" : "Email Unverified"}
                    </span>
                    {derived.geoCountry ? (
                      <span className="user-pill user-pill-location">
                        {locationFlagUrl ? (
                          <Image
                            src={locationFlagUrl}
                            alt=""
                            className="user-pill-location-flag-image"
                            loading="lazy"
                            width={16}
                            height={12}
                          />
                        ) : null}
                        <span>{profile.ip?.countryCode ?? derived.geoCountry}</span>
                      </span>
                    ) : null}
                    {profile.ip?.address ? <span className="user-pill">IP {profile.ip.address}</span> : null}
                  </div>
                </div>

                <div className="user-insight-hero-side">
                  <div className="user-insight-stat">
                    <span>Last activity</span>
                    <strong>{formatRelativeTime(derived.lastActivityAt)}</strong>
                    <small>{formatDateTime(derived.lastActivityAt)}</small>
                  </div>
                  <div className="user-insight-stat">
                    <span>Last 30d invoices</span>
                    <strong>{formatInt(derived.stats.last30Days.counts.invoices)}</strong>
                    <small>{formatCurrency(derived.last30InvoiceTotal)}</small>
                  </div>
                  <div className="user-insight-stat">
                    <span>Sessions</span>
                    <strong>{formatInt(derived.totalSessions)}</strong>
                    <small>{formatInt(derived.totalDevices)} devices</small>
                  </div>
                  <div className="user-insight-stat">
                    <span>Location</span>
                    <strong>{derived.geoCountry ?? "-"}</strong>
                    <small>{fallbackText(derived.geoCity)}</small>
                  </div>
                </div>

                <div className="user-detail-actions">
                  <Link className="btn btn-outline" href="/users">
                    Back to Users
                  </Link>
                </div>
              </section>

              <section className="section-card">
                <div className="section-header">
                  <h2>Timeline Card</h2>
                </div>
                <div className="user-kpi-grid">
                  <article className="user-kpi-card">
                    <span>Last Activity</span>
                    <strong>{formatRelativeTimeCompact(derived.lastActivityAt)}</strong>
                    <small>{formatDateTime(derived.lastActivityAt)}</small>
                  </article>
                  <article className="user-kpi-card">
                    <span>Last Login</span>
                    <strong>{formatRelativeTimeCompact(derived.stats.lastLoginAt)}</strong>
                    <small>{formatDateTime(derived.stats.lastLoginAt)}</small>
                  </article>
                  <article className="user-kpi-card">
                    <span>Created</span>
                    <strong>{formatRelativeTimeCompact(profile.createdAt)}</strong>
                    <small>{formatDateTime(profile.createdAt)}</small>
                  </article>
                </div>
              </section>

              <section className="section-card">
                <div className="section-header">
                  <h2>Entity Counts</h2>
                </div>
                <div className="user-kpi-grid">
                  {ENTITY_COUNT_METRICS.map((entity) => (
                    <article key={entity.label} className="user-kpi-card">
                      <span>{entity.label}</span>
                      <strong>
                        {formatInt(derived.stats.allTime.counts[entity.key])}
                        <small className="user-kpi-inline-accent">
                          {formatInt(derived.stats.last30Days.counts[entity.key])}
                        </small>
                      </strong>
                      <small>{formatRelativeTimeCompact(derived.stats.allTime.lastUpdatedAt[entity.key])}</small>
                    </article>
                  ))}
                </div>
              </section>

              <section className="section-card">
                <div className="section-header">
                  <h2>All-Time vs Last 30d</h2>
                </div>
                <div className="user-bar-chart">
                  <div className="user-compare-chart-legend">
                    <span><i className="user-legend-swatch user-legend-swatch-all" />All-Time</span>
                    <span><i className="user-legend-swatch user-legend-swatch-30d" />Last 30d</span>
                  </div>
                  <div className="user-bar-chart-stage">
                    <div className="user-bar-chart-axis">
                      {[1, 0.75, 0.5, 0.25, 0].map((ratio) => (
                        <div key={ratio} className="user-bar-chart-axis-row">
                          <span>{Math.round(derived.comparisonMax * ratio)}</span>
                          <div className="user-bar-chart-axis-line" />
                        </div>
                      ))}
                    </div>
                    <div className="user-bar-chart-columns">
                      {derived.comparisonStats.map((metric) => (
                        <article
                          key={metric.key}
                          className={`user-bar-chart-group ${activeMetricKey && activeMetricKey !== metric.key ? "user-chart-item-dim" : ""} ${activeMetricKey === metric.key ? "user-chart-item-active" : ""}`}
                          onMouseEnter={() => setHoveredMetricKey(metric.key)}
                          onMouseLeave={() => setHoveredMetricKey(null)}
                          onClick={() => setSelectedMetricKey((current) => (current === metric.key ? null : metric.key))}
                        >
                          <div className="user-bar-chart-bars">
                            <div className="user-bar-chart-pair">
                              <div
                                className="user-bar-chart-bar user-bar-chart-bar-all"
                                style={{ height: `${(metric.allTime / derived.comparisonMax) * 220}px` }}
                                title={`All-Time: ${metric.allTime}`}
                              />
                              <div
                                className="user-bar-chart-bar user-bar-chart-bar-30d"
                                style={{ height: `${(metric.last30 / derived.comparisonMax) * 220}px` }}
                                title={`Last 30d: ${metric.last30}`}
                              />
                            </div>
                          </div>
                          <strong className="user-bar-chart-value">{formatInt(metric.allTime)} / {formatInt(metric.last30)}</strong>
                          <span className="user-bar-chart-label">{metric.label}</span>
                        </article>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              <section className="section-card">
                <div className="section-header">
                  <h2>Invoice Status Breakdown</h2>
                </div>
                <div className="user-donut-layout">
                  <div className="user-donut-wrap">
                    <svg viewBox="0 0 220 220" className="user-donut-svg" aria-label="Invoice status donut chart">
                      <circle cx="110" cy="110" r="74" className="user-donut-ring-bg" />
                      <circle cx="110" cy="110" r="46" className="user-donut-ring-bg" />
                      {(() => {
                        let outerStart = 0;
                        return derived.donutOuter.map((row) => {
                          const next = outerStart + (row.allTime / Math.max(derived.donutOuterTotal, 1));
                          const path = describeArcSegment(74, outerStart, next);
                          outerStart = next;
                          return (
                            <path
                              key={`outer-${row.status}`}
                              d={path}
                              stroke={row.color}
                              strokeWidth="20"
                              strokeLinecap="butt"
                              fill="none"
                              className={`${activeStatusKey && activeStatusKey !== row.status ? "user-chart-item-dim" : ""} ${activeStatusKey === row.status ? "user-chart-item-active" : ""}`}
                              onMouseEnter={() => setHoveredStatusKey(row.status)}
                              onMouseLeave={() => setHoveredStatusKey(null)}
                              onClick={() => setSelectedStatusKey((current) => (current === row.status ? null : row.status))}
                            >
                              <title>{`${row.status}: ${formatInt(row.allTime)} (All-Time)`}</title>
                            </path>
                          );
                        });
                      })()}
                      {(() => {
                        let innerStart = 0;
                        return derived.donutInner.map((row) => {
                          const next = innerStart + (row.last30 / Math.max(derived.donutInnerTotal, 1));
                          const path = describeArcSegment(46, innerStart, next);
                          innerStart = next;
                          return (
                            <path
                              key={`inner-${row.status}`}
                              d={path}
                              stroke={row.color}
                              strokeWidth="20"
                              strokeLinecap="butt"
                              fill="none"
                              className={`${activeStatusKey && activeStatusKey !== row.status ? "user-chart-item-dim" : ""} ${activeStatusKey === row.status ? "user-chart-item-active" : ""}`}
                              onMouseEnter={() => setHoveredStatusKey(row.status)}
                              onMouseLeave={() => setHoveredStatusKey(null)}
                              onClick={() => setSelectedStatusKey((current) => (current === row.status ? null : row.status))}
                            >
                              <title>{`${row.status}: ${formatInt(row.last30)} (Last 30d)`}</title>
                            </path>
                          );
                        });
                      })()}
                      <circle cx="110" cy="110" r="24" fill="#fff" />
                      <text x="110" y="104" textAnchor="middle" className="user-donut-center-label">A / 30d</text>
                      <text x="110" y="124" textAnchor="middle" className="user-donut-center-value">
                        {derived.donutOuterTotal}/{derived.donutInnerTotal}
                      </text>
                    </svg>
                    <div className="user-donut-key">
                      <span><i className="user-donut-key-dot user-donut-key-dot-outer" />Outer = All-Time</span>
                      <span><i className="user-donut-key-dot user-donut-key-dot-inner" />Inner = Last 30d</span>
                      <span>Zero values are hidden from the donut.</span>
                    </div>
                  </div>

                  <div className="user-status-table">
                    <div className="user-status-table-head">
                      <span>Status</span>
                      <span>All-Time</span>
                      <span>Last 30d</span>
                    </div>
                    {derived.statusRows.map((row) => (
                      <div
                        key={row.status}
                        className={`user-status-table-row ${activeStatusKey && activeStatusKey !== row.status ? "user-chart-item-dim" : ""} ${activeStatusKey === row.status ? "user-chart-item-active" : ""}`}
                        onMouseEnter={() => setHoveredStatusKey(row.status)}
                        onMouseLeave={() => setHoveredStatusKey(null)}
                        onClick={() => setSelectedStatusKey((current) => (current === row.status ? null : row.status))}
                      >
                        <span className="user-status-label">
                          <i className="user-status-dot" style={{ backgroundColor: row.color }} />
                          {row.status}
                        </span>
                        <strong>{formatInt(row.allTime)}</strong>
                        <strong>{formatInt(row.last30)}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </section>


              <section className="section-card user-timeline-panel">
                <div className="section-header">
                  <h2>Timeline Graph V2</h2>
                </div>
                {isTimelineLoading ? <LoadingState message="Loading timeline graph..." /> : null}
                {!isTimelineLoading && timelineError ? (
                  <ErrorState message={timelineError} onRetry={loadTimeline} />
                ) : null}
                {!isTimelineLoading && !timelineError && (!timeline || !timelineRecord || timelineRecord.sessions.length === 0) ? (
                  <EmptyState message="No timeline sessions available." />
                ) : null}
                {!isTimelineLoading && !timelineError && timeline && timelineRecord && timelineRecord.sessions.length > 0 ? (
                  <>
                    <div className="timeline-v2">
                      <div className="timeline-v2-summary">
                        <article className="timeline-v2-stat">
                          <span>Total Sessions</span>
                          <strong>{formatInt(timeline.totalSessions)}</strong>
                        </article>
                        <article className="timeline-v2-stat">
                          <span>Total Events</span>
                          <strong>{formatInt(timeline.totalEvents)}</strong>
                        </article>
                        <article className="timeline-v2-stat">
                          <span>App Version</span>
                          <strong>{fallbackText(timeline.appVersion)}</strong>
                        </article>
                      </div>
                    </div>
                    <TimelineGraphV2
                      record={timelineRecord}
                      zoom={1}
                      onSelectPoint={setSelectedTimelinePoint}
                      title="Timeline Graph V2"
                      subtitle="Session quality colors plus category-based event shapes and colors."
                    />
                    <SelectedEventDetails selectedPoint={selectedTimelinePoint} />
                  </>
                ) : null}
              </section>
            </>
          ) : null}

          {isInvoicesLoading ? <LoadingState message="Loading invoices..." /> : null}
          {!isInvoicesLoading && invoicesError ? (
            <ErrorState message={invoicesError} onRetry={loadInvoices} />
          ) : null}
          {!isInvoicesLoading && !invoicesError ? (
            <InvoiceTable
              invoices={invoices}
              onSelect={(invoiceId) => router.push(`/users/${userId}/invoices/${invoiceId}/v2`)}
            />
          ) : null}
        </section>
      </div>
    </main>
  );
}
