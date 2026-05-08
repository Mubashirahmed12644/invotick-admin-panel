"use client";

import Link from "next/link";
import type { SelectedCluster } from "@/features/users-map/types";

interface UserMapClusterCardProps {
  cluster: SelectedCluster;
  onClose: () => void;
}

function formatCoord(val: number, posLabel: string, negLabel: string) {
  return `${Math.abs(val).toFixed(5)}° ${val >= 0 ? posLabel : negLabel}`;
}

export default function UserMapClusterCard({ cluster, onClose }: UserMapClusterCardProps) {
  const city = cluster.city ?? null;
  const country = cluster.country ?? null;
  const locationLabel = [city, country].filter(Boolean).join(", ") || "Unknown location";
  const isSingle = cluster.count === 1;

  return (
    <div className="users-map-info-card umc-card">
      {/* Header */}
      <div className="umc-header">
        <div className="umc-header-left">
          <div className="umc-pin-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </div>
          <div>
            <p className="umc-location-name">{locationLabel}</p>
            <p className="umc-coords-main">
              {formatCoord(cluster.latitude, "N", "S")} &nbsp;/&nbsp; {formatCoord(cluster.longitude, "E", "W")}
            </p>
          </div>
        </div>
        <button type="button" className="users-map-info-card-close" onClick={onClose} aria-label="Close">✕</button>
      </div>

      {/* Meta strip */}
      <div className="umc-meta-strip">
        <span className="umc-meta-badge umc-meta-badge-count">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          {cluster.count} {isSingle ? "user" : "users"}
        </span>
        {city ? (
          <span className="umc-meta-badge">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
            {city}
          </span>
        ) : null}
        {country ? (
          <span className="umc-meta-badge">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
            {country}
          </span>
        ) : null}
      </div>

      {/* User list */}
      <div className="users-map-cluster-list umc-list">
        {cluster.users.map((user) => (
          <div key={user.id} className="umc-row">
            <span className="users-map-cluster-row-avatar">
              {user.username.charAt(0).toUpperCase()}
            </span>

            <div className="umc-row-body">
              <span className="users-map-cluster-row-name">{user.username}</span>
              <span className="users-map-cluster-row-email">{user.email}</span>
            </div>

            <Link href={`/users/${user.id}`} className="umc-view-btn" title="View profile">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15 3 21 3 21 9"/>
                <line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
