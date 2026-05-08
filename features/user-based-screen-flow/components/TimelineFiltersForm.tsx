import styles from "@/features/user-based-screen-flow/user-based-screen-flow.module.css";
import type { TimelineFilters } from "@/features/user-based-screen-flow/types";

interface TimelineFiltersFormProps {
  filters: TimelineFilters;
  zoom: number;
  validationError: string;
  onUpdateFilter: <K extends keyof TimelineFilters>(key: K, value: TimelineFilters[K]) => void;
  onSetZoom: (zoom: number) => void;
  onReset: () => void;
  onLoadTimeline: () => void;
}

export function TimelineFiltersForm({
  filters,
  zoom,
  validationError,
  onUpdateFilter,
  onSetZoom,
  onReset,
  onLoadTimeline,
}: TimelineFiltersFormProps) {
  return (
    <section className="section-card">
      <div className={styles.controlRow}>
        <label className={styles.controlBlock}>
          <span>User ID</span>
          <input className="input" type="text" value={filters.userId} onChange={(event) => onUpdateFilter("userId", event.target.value)} placeholder="UUID" />
        </label>

        <label className={styles.controlBlock}>
          <span>Device ID</span>
          <input className="input" type="text" value={filters.deviceId} onChange={(event) => onUpdateFilter("deviceId", event.target.value)} placeholder="device-123" />
        </label>

        <label className={styles.controlBlock}>
          <span>App Version</span>
          <input className="input" type="text" value={filters.appVersion} onChange={(event) => onUpdateFilter("appVersion", event.target.value)} placeholder="e.g. 1.3.0" />
        </label>

        <label className={styles.controlBlock}>
          <span>From</span>
          <input className="input" type="datetime-local" value={filters.from} onChange={(event) => onUpdateFilter("from", event.target.value)} />
        </label>

        <label className={styles.controlBlock}>
          <span>To</span>
          <input className="input" type="datetime-local" value={filters.to} onChange={(event) => onUpdateFilter("to", event.target.value)} />
        </label>

        <label className={styles.controlBlock}>
          <span>Zoom</span>
          <input className={styles.rangeInput} type="range" min="0.5" max="3" step="0.1" value={zoom} onChange={(event) => onSetZoom(Number(event.target.value))} />
        </label>

        <div className={styles.zoomValue}>{`${Math.round(zoom * 100)}%`}</div>
      </div>

      <div className={styles.actionRow}>
        <button type="button" className="btn btn-outline" onClick={onReset}>
          Reset
        </button>
        <button type="button" className="btn" onClick={onLoadTimeline}>
          Load Timeline
        </button>
      </div>

      {validationError ? <p className="error-text">{validationError}</p> : null}
    </section>
  );
}
