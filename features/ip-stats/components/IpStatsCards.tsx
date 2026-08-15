"use client";

import styles from "../styles/ip-stats.module.css";
import { useIpStats } from "../hooks/useIpStats";
import { DonutChart } from "./DonutChart";

const CYAN = "var(--md-sys-color-tertiary)";
const GREEN = "var(--md-sys-color-success)";
const AMBER = "var(--md-sys-color-warning)";
const RED = "var(--md-sys-color-error)";

export function IpStatsCards() {
    const { data, loading, error } = useIpStats();

    if (loading) {
        return (
            <div className={styles.statsGrid}>
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className={styles.statsSkeleton} />
                ))}
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className={styles.statsErrorBox}>
                <p className={styles.statsErrorText}>
                    ⚠ Failed to load IP stats: {error ?? "Unknown error"}
                </p>
            </div>
        );
    }

    const safe = (n: number = 0, d: number = 0) =>
        d > 0 ? (n / d) * 100 : 0;

    const cards = [
        {
            title: "Total Users",
            value: data.totalUsers ?? 0,
            pct: 100,
            label: "Registered users",
            color: GREEN,
        },
        {
            title: "Total IPs",
            value: data.totalIps ?? 0,
            pct: 100,
            label: "Unique IPs tracked",
            color: CYAN,
        },
        {
            title: "Null IPs",
            value: data.nullIps ?? 0,
            pct: safe(data.nullIps ?? 0, data.totalUsers ?? 0),
            label: "% of total users",
            color: CYAN,
        },
        {
            title: "1-User / 1-IP",
            value: data.singleUserSingleIpCount ?? 0,
            pct: safe(data.singleUserSingleIpCount ?? 0, data.totalIps ?? 0),
            label: "% of total IPs",
            color: CYAN,
        },
        {
            title: "Shared IPs",
            value: data.singleIpMultiUsersCount ?? 0,
            pct: safe(data.singleIpMultiUsersCount ?? 0, data.totalIps ?? 0),
            label: "% of total IPs",
            color: AMBER,
        },
        {
            title: "Above Threshold",
            value: data.ipGreaterThanThresholdCount ?? 0,
            pct: safe(data.ipGreaterThanThresholdCount ?? 0, data.totalIps ?? 0),
            label: "% of total IPs — threat",
            color: RED,
        },
    ];

    return (
        <div className={styles.statsGrid}>
            {cards.map((card) => (
                <div key={card.title} className={styles.statsCard}>
                    <p className={styles.statsTitle}>{card.title}</p>

                    <p
                        className={styles.statsValue}
                        style={{ color: card.color }}
                    >
                        {card.value.toLocaleString()}
                    </p>

                    <DonutChart percentage={card.pct} color={card.color} />

                    <p className={styles.statsLabel}>{card.label}</p>
                </div>
            ))}
        </div>
    );
}