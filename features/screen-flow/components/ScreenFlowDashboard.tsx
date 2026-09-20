"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { stickyOneOf, useStickyState } from "@/lib/stickyFilters";
import EmptyState from "@/components/EmptyState";
import ErrorState from "@/components/ErrorState";
import LoadingState from "@/components/LoadingState";
import Navbar from "@/components/Navbar";
import { clearAccessToken, isLoggedIn } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useScreenFlow } from "@/features/screen-flow/hooks/useScreenFlow";
import { ScreenFlowSummaryCards } from "@/features/screen-flow/components/ScreenFlowSummaryCards";
import { ScreenFlowSankeyGraph } from "@/features/screen-flow/components/ScreenFlowSankeyGraph";
import { ScreenFlowTreeCard } from "@/features/screen-flow/components/ScreenFlowTreeCard";
import styles from "@/features/screen-flow/styles/screen-flow.module.css";
import type { ScreenFlowPlatform, ScreenFlowQuery } from "@/features/screen-flow/types";

const PLATFORM_OPTIONS: Array<{ label: string; value: "" | ScreenFlowPlatform }> = [
  { label: "All Platforms", value: "" },
  { label: "Android", value: "Android" },
  { label: "iOS", value: "iOS" },
  { label: "Web", value: "Web" },
  { label: "Unknown", value: "Unknown" },
];

function toDateTimeLocalValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function createInitialQuery(): ScreenFlowQuery {
  const to = new Date();
  const from = new Date(to.getTime() - (24 * 60 * 60 * 1000));

  return {
    from: toDateTimeLocalValue(from),
    to: toDateTimeLocalValue(to),
    appVersion: "",
    platform: "",
  };
}

function toUtcIso(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

/** One key for this page's remembered filters (decision 0123). */
const PAGE = "screen-flow";
const viewCodec = stickyOneOf(["list", "graph"] as const);

export function ScreenFlowDashboard() {
  const router = useRouter();
  const [initialQuery] = useState<ScreenFlowQuery>(createInitialQuery);
  const [draftQuery, setDraftQuery] = useState<ScreenFlowQuery>(initialQuery);
  const [submittedQuery, setSubmittedQuery] = useState<ScreenFlowQuery>(initialQuery);
  const [validationError, setValidationError] = useState("");
  const [viewMode, setViewMode] = useStickyState<"list" | "graph">(PAGE, "view", "list", viewCodec);

  const requestQuery = useMemo(
    () => ({
      from: toUtcIso(submittedQuery.from) || "",
      to: toUtcIso(submittedQuery.to) || "",
      appVersion: submittedQuery.appVersion.trim(),
      platform: submittedQuery.platform,
    }),
    [submittedQuery],
  );

  const { data, loading, error, unauthorized, refetch } = useScreenFlow(requestQuery);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace("/login");
    }
  }, [router]);

  useEffect(() => {
    if (!unauthorized) return;
    clearAccessToken({ sessionExpired: true });
    router.replace("/login");
  }, [router, unauthorized]);

  const handleFieldChange = useCallback(
    <K extends keyof ScreenFlowQuery>(key: K, value: ScreenFlowQuery[K]) => {
      setDraftQuery((current) => ({
        ...current,
        [key]: value,
      }));
    },
    [],
  );

  const handleApply = useCallback(async () => {
    const fromIso = toUtcIso(draftQuery.from);
    const toIso = toUtcIso(draftQuery.to);

    if (!fromIso || !toIso) {
      setValidationError("Both From and To must be valid timestamps.");
      return;
    }

    if (new Date(toIso).getTime() < new Date(fromIso).getTime()) {
      setValidationError("'To' must be after 'From'.");
      return;
    }

    setValidationError("");
    setSubmittedQuery(draftQuery);
  }, [draftQuery]);

  const handleReset = useCallback(() => {
    const next = createInitialQuery();
    setDraftQuery(next);
    setValidationError("");
    setSubmittedQuery(next);
  }, []);

  return (
    <>
      <Navbar title="Screen Flow Analytics" />
      <section className="content-wrap">
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>Screen Flow</h1>
            <p className={styles.pageSubtitle}>
              Explore how sessions move between normalized screens, grouped by first screen and merged into reusable flow trees.
            </p>
          </div>
          <div className={styles.viewToggle}>
            <button
              type="button"
              className={`btn btn-outline ${viewMode === "list" ? styles.viewToggleActive : ""}`}
              onClick={() => setViewMode("list")}
            >
              Detail View
            </button>
            <button
              type="button"
              className={`btn btn-outline ${viewMode === "graph" ? styles.viewToggleActive : ""}`}
              onClick={() => setViewMode("graph")}
            >
              View Graph
            </button>
          </div>
        </div>

        <section className="filters-panel">
          <div className="filters-header">
            <p className="results-meta">Send explicit UTC-backed filters for stable reporting windows.</p>
            <div className={styles.filterActions}>
              <button type="button" className="btn btn-outline" onClick={() => void handleReset()}>
                Reset
              </button>
              <button type="button" className="btn" onClick={() => void handleApply()}>
                Apply Filters
              </button>
            </div>
          </div>

          <div className="filters-grid">
            <label className="filter-control">
              <span>From</span>
              <input
                className="input"
                type="datetime-local"
                value={draftQuery.from}
                onChange={(event) => handleFieldChange("from", event.target.value)}
              />
            </label>

            <label className="filter-control">
              <span>To</span>
              <input
                className="input"
                type="datetime-local"
                value={draftQuery.to}
                onChange={(event) => handleFieldChange("to", event.target.value)}
              />
            </label>

            <label className="filter-control">
              <span>Platform</span>
              <select
                className="input"
                value={draftQuery.platform}
                onChange={(event) => handleFieldChange("platform", event.target.value as ScreenFlowQuery["platform"])}
              >
                {PLATFORM_OPTIONS.map((option) => (
                  <option key={option.label} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="filter-control">
              <span>App Version</span>
              <input
                className="input"
                type="text"
                value={draftQuery.appVersion}
                onChange={(event) => handleFieldChange("appVersion", event.target.value)}
                placeholder="e.g. 1.3.0"
              />
            </label>
          </div>

          {validationError ? <p className="error-text">{validationError}</p> : null}
          {data ? (
            <div className={styles.resolvedFilters}>
              <span className={styles.filterChip}>Resolved From: {data.filters.from}</span>
              <span className={styles.filterChip}>Resolved To: {data.filters.to}</span>
              <span className={styles.filterChip}>Platform: {data.filters.platform || "All"}</span>
              <span className={styles.filterChip}>App Version: {data.filters.appVersion || "All"}</span>
            </div>
          ) : null}
        </section>

        {loading ? <LoadingState message="Loading screen flow analytics..." /> : null}
        {!loading && error ? <ErrorState message={error} onRetry={() => void refetch(requestQuery)} /> : null}

        {!loading && !error && data ? (
          <>
            <ScreenFlowSummaryCards data={data} />

            {data.trees.length === 0 ? (
              <EmptyState message="No matching sessions were found for the selected filters." />
            ) : viewMode === "graph" ? (
              <ScreenFlowSankeyGraph data={data} />
            ) : (
              <section className={styles.treeStack}>
                {data.trees.map((tree) => (
                  <ScreenFlowTreeCard key={tree.rootScreen} tree={tree} />
                ))}
              </section>
            )}
          </>
        ) : null}
      </section>
    </>
  );
}
