"use client";

import Link from "next/link";
import type { SelectedUser } from "@/features/users-map/types";

interface UserMapInfoCardProps {
  user: SelectedUser;
  onClose: () => void;
}

export default function UserMapInfoCard({ user, onClose }: UserMapInfoCardProps) {
  return (
    <div className="users-map-info-card">
      <div className="users-map-info-card-header">
        <div className="users-map-info-card-avatar">
          {user.username.charAt(0).toUpperCase()}
        </div>
        <div className="users-map-info-card-title">
          <p className="users-map-info-card-username">{user.username}</p>
          <p className="users-map-info-card-email">{user.email}</p>
        </div>
        <button
          type="button"
          className="users-map-info-card-close"
          onClick={onClose}
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      <div className="users-map-info-card-body">
        {user.city ?? user.country ? (
          <div className="users-map-info-row">
            <span className="users-map-info-label">
              <svg width="10" height="12" viewBox="0 0 10 12" fill="none" style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }}>
                <path d="M5 0C2.79 0 1 1.79 1 4c0 3 4 8 4 8s4-5 4-8c0-2.21-1.79-4-4-4zm0 5.5A1.5 1.5 0 1 1 5 2.5a1.5 1.5 0 0 1 0 3z" fill="rgba(255,255,255,0.35)" />
              </svg>
              Location
            </span>
            <span className="users-map-info-value">
              {[user.city, user.country].filter(Boolean).join(", ")}
            </span>
          </div>
        ) : null}

        <div className="users-map-info-coords">
          <div className="users-map-info-coord-box">
            <span className="users-map-info-coord-label">Latitude</span>
            <span className="users-map-info-coord-value">{user.latitude.toFixed(5)}</span>
          </div>
          <div className="users-map-info-coord-box">
            <span className="users-map-info-coord-label">Longitude</span>
            <span className="users-map-info-coord-value">{user.longitude.toFixed(5)}</span>
          </div>
        </div>

        <Link href={`/users/${user.id}`} className="users-map-info-view-btn">
          View Profile →
        </Link>
      </div>
    </div>
  );
}
