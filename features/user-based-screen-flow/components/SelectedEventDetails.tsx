import styles from "@/features/user-based-screen-flow/user-based-screen-flow.module.css";
import type { EventPoint } from "@/features/user-based-screen-flow/types";
import { formatDuration, getEventLabel } from "@/features/user-based-screen-flow/utils";

interface SelectedEventDetailsProps {
  selectedPoint: EventPoint | null;
}

export function SelectedEventDetails({ selectedPoint }: SelectedEventDetailsProps) {
  return (
    <section className="section-card">
      <div className={styles.detailGrid}>
        <div>
          <h2>Selected Event</h2>
          <p className="section-subtitle">Click any event node in the timeline to inspect its details.</p>
        </div>

        {selectedPoint ? (
          <div className={styles.eventDetailCard}>
            <div>
              <p className={styles.detailLabel}>Session</p>
              <p className={styles.detailValue}>{selectedPoint.sessionId}</p>
            </div>
            <div>
              <p className={styles.detailLabel}>Event #</p>
              <p className={styles.detailValue}>{selectedPoint.eventIndex + 1}</p>
            </div>
            <div>
              <p className={styles.detailLabel}>Name</p>
              <p className={styles.detailValue}>{getEventLabel(selectedPoint.event)}</p>
            </div>
            <div>
              <p className={styles.detailLabel}>Gap</p>
              <p className={styles.detailValue}>{formatDuration(selectedPoint.event.gapSec || 0)}</p>
            </div>
            <div>
              <p className={styles.detailLabel}>Time</p>
              <p className={styles.detailValue}>{selectedPoint.event.timestamp}</p>
            </div>
          </div>
        ) : (
          <p className={styles.emptyNote}>No event selected yet.</p>
        )}
      </div>
    </section>
  );
}
