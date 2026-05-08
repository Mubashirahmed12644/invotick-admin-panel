import styles from "@/features/user-based-screen-flow/user-based-screen-flow.module.css";

interface TimelineStatsGridProps {
  identity: string;
  totalEvents: number;
  totalSessions: number;
  splashOnlySessions: number;
}

export function TimelineStatsGrid({
  identity,
  totalEvents,
  totalSessions,
  splashOnlySessions,
}: TimelineStatsGridProps) {
  return (
    <section className={styles.statsGrid}>
      <article className={`stat-card ${styles.equalStatCard}`}>
        <p>Identity</p>
        <h3 className={styles.fullUserIdValue}>{identity}</h3>
      </article>
      <article className={`stat-card ${styles.equalStatCard}`}>
        <p>Total Events</p>
        <h3>{totalEvents}</h3>
      </article>
      <article className={`stat-card ${styles.equalStatCard}`}>
        <p>Sessions</p>
        <h3>{totalSessions}</h3>
      </article>
      <article className={`stat-card ${styles.equalStatCard}`}>
        <p>Splash Only</p>
        <h3>{splashOnlySessions}</h3>
      </article>
    </section>
  );
}
