"use client";

export default function UserMapLegend() {
  return (
    <div className="users-map-legend">
      <p className="users-map-legend-title">Heatmap Density</p>
      <div className="users-map-legend-items">
        <span className="users-map-legend-item">
          <span className="users-map-legend-dot users-map-legend-dot-low" />
          Low
        </span>
        <span className="users-map-legend-item">
          <span className="users-map-legend-dot users-map-legend-dot-medium" />
          Medium
        </span>
        <span className="users-map-legend-item">
          <span className="users-map-legend-dot users-map-legend-dot-high" />
          High
        </span>
      </div>
      <div className="users-map-legend-sep" />
      <p className="users-map-legend-title">Clusters</p>
      <div className="users-map-legend-items">
        <span className="users-map-legend-item">
          <span className="users-map-legend-cluster users-map-legend-cluster-above">A</span>
          ≥ Threshold
        </span>
        <span className="users-map-legend-item">
          <span className="users-map-legend-cluster users-map-legend-cluster-below">B</span>
          &lt; Threshold
        </span>
        <span className="users-map-legend-item">
          <span className="users-map-legend-single-dot" />
          Single
        </span>
      </div>
    </div>
  );
}
