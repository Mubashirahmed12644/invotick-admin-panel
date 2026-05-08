"use client";

interface UserMapStatsProps {
  total: number;
  countries: number;
  cities: number;
}

export default function UserMapStats({ total, countries, cities }: UserMapStatsProps) {
  return (
    <div className="users-map-stats-panel">
      <div className="users-map-stat-item">
        <span className="users-map-stat-value">{total.toLocaleString()}</span>
        <span className="users-map-stat-label">Locations</span>
      </div>
      {countries > 0 ? (
        <>
          <div className="users-map-stat-divider" />
          <div className="users-map-stat-item">
            <span className="users-map-stat-value">{countries}</span>
            <span className="users-map-stat-label">Countries</span>
          </div>
        </>
      ) : null}
      {cities > 0 ? (
        <>
          <div className="users-map-stat-divider" />
          <div className="users-map-stat-item">
            <span className="users-map-stat-value">{cities}</span>
            <span className="users-map-stat-label">Cities</span>
          </div>
        </>
      ) : null}
    </div>
  );
}
