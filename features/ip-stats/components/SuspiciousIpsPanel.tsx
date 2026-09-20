"use client";

import { useState, useMemo } from "react";
import { stickyNumberRequired, stickyOneOf, useStickyState } from "@/lib/stickyFilters";
import styles from "../styles/ip-stats.module.css";
import { useSuspiciousIps } from "../hooks/useSuspiciousIps";
import { SuspiciousIpCard } from "./SuspiciousIpCard";
import type { ExclusionRules } from "../types";

interface SuspiciousIpsPanelProps {
    exclusionRules: ExclusionRules;
}

function matchesExclusion(
    value: string | null | undefined,
    rules: string[]
): boolean {
    if (!value || rules.length === 0) return false;
    const lower = value.toLowerCase();
    return rules.some((r) => r.trim() && lower.includes(r.toLowerCase()));
}

/** One key for this page's remembered filters (decision 0123). */
const PAGE = "ip-stats";
const dirCodec = stickyOneOf(["asc", "desc"] as const);

export function SuspiciousIpsPanel({ exclusionRules }: SuspiciousIpsPanelProps) {
    const [thresholdInput, setThresholdInput] = useState("10");
    const [appliedThreshold, setAppliedThreshold] = useStickyState(PAGE, "minUsers", 10, stickyNumberRequired);

    // 🔥 NEW: sorting state
    const [sortOrder, setSortOrder] = useStickyState<"asc" | "desc">(PAGE, "dir", "desc", dirCodec);

    const { data, loading, error, refetch } =
        useSuspiciousIps(appliedThreshold);

    const handleApply = () => {
        const parsed = parseInt(thresholdInput, 10);
        if (!isNaN(parsed) && parsed > 0) {
            setAppliedThreshold(parsed);
            refetch(parsed);
        }
    };

    const hasExclusions =
        exclusionRules.ips.length +
        exclusionRules.countries.length +
        exclusionRules.cities.length +
        exclusionRules.isps.length +
        exclusionRules.orgs.length >
        0;

    // 🔥 filter
    const filteredData = useMemo(() => {
        if (!data) return [];
        return data.filter((record) => {
            if (matchesExclusion(record.ip, exclusionRules.ips)) return false;
            if (matchesExclusion(record.ipDetails?.country, exclusionRules.countries)) return false;
            if (matchesExclusion(record.ipDetails?.city, exclusionRules.cities)) return false;
            if (matchesExclusion(record.ipDetails?.isp, exclusionRules.isps)) return false;
            if (matchesExclusion(record.ipDetails?.org, exclusionRules.orgs)) return false;
            return true;
        });
    }, [data, exclusionRules]);

    // 🔥 NEW: sorted data
    const sortedData = useMemo(() => {
        return [...filteredData].sort((a, b) => {
            return sortOrder === "asc"
                ? a.userCount - b.userCount
                : b.userCount - a.userCount;
        });
    }, [filteredData, sortOrder]);

    return (
        <section className={styles.suspiciousSection}>
            {/* Header */}
            <div className={styles.suspiciousHeaderRow}>
                <h2 className={styles.suspiciousTitle}>
                    Suspicious IPs
                </h2>

                <div className={styles.suspiciousControls}>
                    <span className={styles.suspiciousLabel}>Threshold:</span>

                    <input
                        type="number"
                        min={1}
                        value={thresholdInput}
                        onChange={(e) => setThresholdInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleApply()}
                        className={styles.suspiciousInput}
                    />

                    <button
                        onClick={handleApply}
                        className={styles.suspiciousBtn}
                    >
                        Apply
                    </button>

                    {/* 🔥 NEW: Sort button */}
                    <button
                        onClick={() =>
                            setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))
                        }
                        className={styles.sortBtn}
                    >
                        Sort: {sortOrder === "asc" ? "↑ Asc" : "↓ Desc"}
                    </button>
                </div>
            </div>

            {/* Result text */}
            {!loading && !error && (
                <p className={styles.suspiciousResultText}>
                    {hasExclusions ? (
                        <>
                            <span className={styles.resultHighlightWarn}>
                                {sortedData.length}
                            </span>
                            {" shown after exclusions "}
                            <span className={styles.resultMuted}>
                                ({data.length} total)
                            </span>
                        </>
                    ) : (
                        <>
                            <span className={styles.resultHighlightDanger}>
                                {sortedData.length}
                            </span>
                            {" suspicious IPs found"}
                        </>
                    )}
                </p>
            )}

            {/* Loading */}
            {loading && (
                <div className={styles.suspiciousSkeletonWrap}>
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className={styles.suspiciousSkeleton} />
                    ))}
                </div>
            )}

            {/* Error */}
            {!loading && error && (
                <div className={styles.suspiciousErrorBox}>
                    <p className={styles.suspiciousErrorText}>⚠ {error}</p>
                </div>
            )}

            {/* Empty */}
            {!loading && !error && sortedData.length === 0 && (
                <div className={styles.suspiciousEmpty}>
                    <p className={styles.suspiciousEmptyText}>
                        No suspicious IPs found for threshold &gt;{appliedThreshold}
                    </p>
                </div>
            )}

            {/* Cards */}
            {!loading && !error && sortedData.length > 0 && (
                <div className={styles.suspiciousCards}>
                    {/* Keyed by the record, not the IP: the IP arrives masked, and two can look alike. */}
                    {sortedData.map((record, index) => (
                        <SuspiciousIpCard key={record.recordId ?? `${record.ip}-${index}`} record={record} />
                    ))}
                </div>
            )}
        </section>
    );
}