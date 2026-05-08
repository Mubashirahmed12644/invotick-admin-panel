"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import ErrorState from "@/components/ErrorState";
import EmptyState from "@/components/EmptyState";
import { api, getErrorMessage, isUnauthorizedError } from "@/lib/api";
import { clearAccessToken, isLoggedIn } from "@/lib/auth";
import type { UserMapLocation } from "@/lib/types";
import { groupByLocation, CLUSTER_RADIUS_M, MAP_STYLES, type MapStyleKey } from "@/features/users-map/utils";
import "@/features/users-map/styles/users-map.css";

const UsersMapView = dynamic(
  () => import("@/features/users-map/components/UsersMapView"),
  { ssr: false },
);

function isValidCoord(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

export type ViewMode = { above: boolean; below: boolean };

export default function UsersMapDashboard() {
  const router = useRouter();
  const [users, setUsers] = useState<UserMapLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [pendingThreshold, setPendingThreshold] = useState(2);
  const [clusterThreshold, setClusterThreshold] = useState(2);
  const [isApplying, setIsApplying] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>({ above: true, below: false });
  const [mapStyle, setMapStyle] = useState<MapStyleKey>("voyager");

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
      const data = await api.getUsersForMap();
      setUsers(data ?? []);
    } catch (loadError) {
      if (isUnauthorizedError(loadError)) {
        handleUnauthorized();
        return;
      }
      setError(getErrorMessage(loadError, "Unable to load user map. Please try again."));
    } finally {
      setIsLoading(false);
    }
  }, [handleUnauthorized, router]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const validUsers = useMemo(
    () => users.filter((u) => isValidCoord(u.latitude, u.longitude)),
    [users],
  );

  const groups = useMemo(
    () => groupByLocation(validUsers, CLUSTER_RADIUS_M),
    [validUsers],
  );

  const aboveCount = groups.filter((g) => g.users.length >= clusterThreshold).length;
  const belowCount = groups.filter((g) => g.users.length < clusterThreshold).length;

  const toggleAbove = () => setViewMode((v) => ({ ...v, above: !v.above }));
  const toggleBelow = () => setViewMode((v) => ({ ...v, below: !v.below }));

  const handleApply = () => {
    setIsApplying(true);
    setClusterThreshold(pendingThreshold);
    // groupByLocation is synchronous but runs next tick after re-render
    setTimeout(() => setIsApplying(false), 300);
  };

  return (
    <main className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Navbar title="Users Map" />
        <div className="users-map-page-wrap">
          <div className="users-map-header-card">
            <div className="users-map-header-left">
              <p className="users-map-header-title">
                <span className="users-map-header-title-dot" />
                Live User Map
              </p>
              <p className="users-map-header-desc">
                Heatmap density based on latest user coordinates
              </p>
            </div>

            <div className="users-map-controls">
              {/* Map style dropdown */}
              <select
                value={mapStyle}
                onChange={(e) => setMapStyle(e.target.value as MapStyleKey)}
                className="users-map-style-select"
              >
                {(Object.keys(MAP_STYLES) as MapStyleKey[]).map((key) => (
                  <option key={key} value={key}>{MAP_STYLES[key].label}</option>
                ))}
              </select>

              {/* Multi-select toggle with counts */}
              <div className="users-map-toggle">
                <button
                  type="button"
                  className={`users-map-toggle-btn ${viewMode.above ? "users-map-toggle-btn-active" : ""}`}
                  onClick={toggleAbove}
                >
                  ≥ Threshold
                  {viewMode.above && !isLoading && !error ? (
                    <span className="users-map-toggle-count">{aboveCount}</span>
                  ) : null}
                </button>
                <button
                  type="button"
                  className={`users-map-toggle-btn ${viewMode.below ? "users-map-toggle-btn-active" : ""}`}
                  onClick={toggleBelow}
                >
                  &lt; Threshold
                  {viewMode.below && !isLoading && !error ? (
                    <span className="users-map-toggle-count">{belowCount}</span>
                  ) : null}
                </button>
              </div>

              {/* Threshold input + apply */}
              <div className="users-map-control-group">
                <span className="users-map-control-label">Threshold</span>
                <input
                  type="number"
                  min={2}
                  max={9999}
                  value={pendingThreshold}
                  onChange={(e) => setPendingThreshold(Math.max(2, Number(e.target.value)))}
                  onKeyDown={(e) => { if (e.key === "Enter") handleApply(); }}
                  className="users-map-control-input"
                />
              </div>
              <button
                type="button"
                className={`users-map-apply-btn${isApplying ? " users-map-apply-btn-loading" : ""}`}
                onClick={handleApply}
                disabled={isApplying}
              >
                {isApplying ? <span className="users-map-apply-spinner" /> : null}
                {isApplying ? "Applying…" : "Apply"}
              </button>

              {!isLoading && !error ? (
                <div className="users-map-header-badge">
                  <span className="users-map-badge-count">{validUsers.length}</span>
                  {validUsers.length === 1 ? "user location" : "user locations"}
                </div>
              ) : null}
            </div>
          </div>

          {isLoading ? (
            <div style={{ position: "relative", height: "calc(100vh - 200px)", minHeight: 420, borderRadius: 18, overflow: "hidden", background: "#050a18" }}>
              <div className="users-map-loading-overlay">
                <div className="users-map-loading-spinner" />
                <p className="users-map-loading-text">Loading user map...</p>
              </div>
            </div>
          ) : error ? (
            <ErrorState message={error} onRetry={loadUsers} />
          ) : users.length > 0 && validUsers.length === 0 ? (
            <EmptyState message="No user locations available." />
          ) : users.length === 0 ? (
            <EmptyState message="No user locations available." />
          ) : (
            <UsersMapView
              users={users}
              clusterThreshold={clusterThreshold}
              viewMode={viewMode}
              mapStyle={mapStyle}
            />
          )}
        </div>
      </div>
    </main>
  );
}
