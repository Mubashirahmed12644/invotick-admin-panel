"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import EmptyState from "@/components/EmptyState";
import ErrorState from "@/components/ErrorState";
import LoadingState from "@/components/LoadingState";
import { api, getErrorMessage, isUnauthorizedError } from "@/lib/api";
import { clearAccessToken, isLoggedIn } from "@/lib/auth";
import type { AppFlowTimelineResponse } from "@/lib/types";
import { EMPTY_FILTERS } from "@/features/user-based-screen-flow/constants";
import { buildGraph } from "@/features/user-based-screen-flow/graphs";
import { SelectedEventDetails } from "@/features/user-based-screen-flow/components/SelectedEventDetails";
import { TimelineFiltersForm } from "@/features/user-based-screen-flow/components/TimelineFiltersForm";
import { TimelineGraphSection } from "@/features/user-based-screen-flow/components/TimelineGraphSection";
import { TimelineGraphV2 } from "@/features/user-based-screen-flow/components/TimelineGraphV2";
import { TimelineStatsGrid } from "@/features/user-based-screen-flow/components/TimelineStatsGrid";
import type { EventPoint, TimelineFilters, UserFlowRecord } from "@/features/user-based-screen-flow/types";
import {
  getSplashOnlySessionCount,
  mapTimelineResponseToRecord,
  toUtcIso,
} from "@/features/user-based-screen-flow/utils";
import styles from "@/features/user-based-screen-flow/user-based-screen-flow.module.css";

function getTimelineRequest(filters: TimelineFilters) {
  const normalizedUserId = filters.userId.trim();
  const normalizedDeviceId = filters.deviceId.trim();
  const normalizedVersion = filters.appVersion.trim();
  const normalizedFrom = filters.from.trim();
  const normalizedTo = filters.to.trim();

  if (!normalizedUserId && !normalizedDeviceId) {
    return { error: "Provide at least one of User ID or Device ID." };
  }

  if (!normalizedFrom && normalizedTo) {
    return { error: "Both From and To must be provided together." };
  }

  const fromIso = normalizedFrom ? toUtcIso(normalizedFrom) : null;
  const resolvedToValue = normalizedTo || (normalizedFrom ? new Date().toISOString() : "");
  const toIso = resolvedToValue ? toUtcIso(resolvedToValue) ?? resolvedToValue : null;

  if ((normalizedFrom && !fromIso) || (normalizedTo && !toIso)) {
    return { error: "From and To must be valid timestamps." };
  }

  if (fromIso && toIso && new Date(toIso).getTime() < new Date(fromIso).getTime()) {
    return { error: "'To' must be after 'From'." };
  }

  return {
    request: {
      userId: normalizedUserId || undefined,
      deviceId: normalizedDeviceId || undefined,
      appVersion: normalizedVersion || undefined,
      from: fromIso || undefined,
      to: toIso || undefined,
    },
  };
}

export function UserBasedScreenFlowDashboard() {
  const router = useRouter();
  const [filters, setFilters] = useState<TimelineFilters>(EMPTY_FILTERS);
  const [timeline, setTimeline] = useState<AppFlowTimelineResponse | null>(null);
  const [record, setRecord] = useState<UserFlowRecord | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<EventPoint | null>(null);
  const [zoom, setZoom] = useState(1);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace("/login");
    }
  }, [router]);

  const selectedUser = record;

  const splashOnlySessions = useMemo(
    () => (selectedUser ? getSplashOnlySessionCount(selectedUser) : 0),
    [selectedUser],
  );

  useEffect(() => {
    setSelectedPoint(null);
  }, [record]);

  const graph = useMemo(() => buildGraph(selectedUser), [selectedUser]);

  function updateFilter<K extends keyof TimelineFilters>(key: K, value: TimelineFilters[K]) {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handleLoadTimeline() {
    const prepared = getTimelineRequest(filters);

    if ("error" in prepared) {
      setValidationError(prepared.error ?? "");
      return;
    }

    setValidationError("");
    setError("");
    setIsLoading(true);

    try {
      const response = await api.getAppFlowTimeline(prepared.request);
      setTimeline(response);
      setRecord(mapTimelineResponseToRecord(response));
      setHasLoaded(true);
    } catch (loadError) {
      if (isUnauthorizedError(loadError)) {
        clearAccessToken({ sessionExpired: true });
        router.replace("/login");
        return;
      }

      setTimeline(null);
      setRecord(null);
      setHasLoaded(true);
      setError(getErrorMessage(loadError, "Failed to load timeline."));
    } finally {
      setIsLoading(false);
    }
  }

  function handleReset() {
    setFilters(EMPTY_FILTERS);
    setTimeline(null);
    setRecord(null);
    setSelectedPoint(null);
    setValidationError("");
    setError("");
    setHasLoaded(false);
  }

  return (
    <>
      <Navbar title="User Based Screen Flow" />
      <div className="content-wrap">
        <section className="section-card">
          <div className={styles.headerRow}>
            <div>
              <h2>User Timeline Graph</h2>
              <p className="section-subtitle">
                Load a single activity timeline by user ID, device ID, or both. The graph stays
                the same; only the data source now comes from the timeline API.
              </p>
            </div>
          </div>
        </section>

        <TimelineFiltersForm
          filters={filters}
          zoom={zoom}
          validationError={validationError}
          onUpdateFilter={updateFilter}
          onSetZoom={setZoom}
          onReset={handleReset}
          onLoadTimeline={() => void handleLoadTimeline()}
        />

        {isLoading ? <LoadingState message="Loading timeline..." /> : null}
        {!isLoading && error ? <ErrorState message={error} /> : null}

        {!isLoading && !selectedUser && hasLoaded ? (
          <EmptyState message="No matching sessions were found for the supplied user/device filters." />
        ) : null}

        {selectedUser && timeline ? (
          <>
            <TimelineStatsGrid
              identity={timeline.userId || timeline.deviceId || "Unknown"}
              totalEvents={timeline.totalEvents}
              totalSessions={timeline.totalSessions}
              splashOnlySessions={splashOnlySessions}
            />

            <TimelineGraphSection
              title="Timeline Graph V1"
              subtitle="Current session-colored timeline."
              graph={graph}
              zoom={zoom}
              selectedPoint={selectedPoint}
              onSelectPoint={setSelectedPoint}
            />

            <TimelineGraphV2
              record={selectedUser}
              zoom={zoom}
              onSelectPoint={setSelectedPoint}
            />

            <SelectedEventDetails selectedPoint={selectedPoint} />
          </>
        ) : !hasLoaded && !isLoading ? (
          <section className="section-card">
            <p className={styles.emptyNote}>Provide a `User ID` or `Device ID`, then load the timeline.</p>
          </section>
        ) : null}
      </div>
    </>
  );
}
