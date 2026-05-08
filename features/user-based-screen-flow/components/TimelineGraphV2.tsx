import { useMemo } from "react";
import { buildGraphV2, EVENT_CATEGORY_LEGEND_ORDER, renderLegendMarker } from "@/features/user-based-screen-flow/graphs";
import { EVENT_CATEGORY_META } from "@/features/user-based-screen-flow/constants";
import type { EventPoint, UserFlowRecord } from "@/features/user-based-screen-flow/types";
import styles from "@/features/user-based-screen-flow/user-based-screen-flow.module.css";

interface TimelineGraphV2Props {
  record: UserFlowRecord | null;
  zoom: number;
  onSelectPoint: (point: EventPoint) => void;
  title?: string;
  subtitle?: string;
}

export function TimelineGraphV2({
  record,
  zoom,
  onSelectPoint,
  title = "Timeline Graph V2",
  subtitle = "Session quality colors plus category-based event shapes and colors.",
}: TimelineGraphV2Props) {
  const graph = useMemo(() => buildGraphV2(record), [record]);

  return (
    <section className="section-card">
      <div className={styles.headerRow}>
        <div>
          <h2>{title}</h2>
          <p className="section-subtitle">{subtitle}</p>
        </div>
      </div>
      <div className={styles.v2Legend}>
        {EVENT_CATEGORY_LEGEND_ORDER.map((category) => (
          <div key={category} className={styles.legendItem}>
            <svg className={styles.legendIcon} viewBox="0 0 18 18" aria-hidden="true">
              {renderLegendMarker(category)}
            </svg>
            <span>{EVENT_CATEGORY_META[category].label}</span>
          </div>
        ))}
      </div>
      <div className={styles.timelineViewport}>
        <div
          className={styles.timelineCanvas}
          style={{
            width: `${Math.round(graph.width * zoom)}px`,
            height: `${Math.round(graph.height * zoom)}px`,
          }}
        >
          <svg
            width={graph.width}
            height={graph.height}
            viewBox={`0 0 ${graph.width} ${graph.height}`}
            className={styles.timelineSvg}
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: "top left",
            }}
          >
            <g>{graph.elements}</g>
            {graph.points.map((point) => (
              <circle
                key={`event-hit-v2-${point.sessionId}-${point.eventIndex}`}
                cx={point.x}
                cy={point.y}
                r="14"
                fill="transparent"
                onClick={() => onSelectPoint(point)}
                style={{ cursor: "pointer" }}
              />
            ))}
          </svg>
        </div>
      </div>
    </section>
  );
}
