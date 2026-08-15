"use client";

import { useState, type KeyboardEvent } from "react";
import styles from "../styles/ip-stats.module.css";
import type { ExclusionRules } from "../types";

interface ExclusionSidebarProps {
    rules: ExclusionRules;
    onChange: (rules: ExclusionRules) => void;
}

type RuleField = keyof ExclusionRules;

const FIELDS: { field: RuleField; label: string; placeholder: string }[] = [
    { field: "ips", label: "Exclude IP", placeholder: "e.g. 192.168.1.1" },
    { field: "countries", label: "Exclude Country", placeholder: "e.g. United States" },
    { field: "cities", label: "Exclude City", placeholder: "e.g. Moscow" },
    { field: "isps", label: "Exclude ISP", placeholder: "e.g. DigitalOcean" },
    { field: "orgs", label: "Exclude Org", placeholder: "e.g. Cloudflare" },
];

export function ExclusionSidebar({ rules, onChange }: ExclusionSidebarProps) {
    const [open, setOpen] = useState(false);
    const [inputs, setInputs] = useState<Record<RuleField, string>>({
        ips: "",
        countries: "",
        cities: "",
        isps: "",
        orgs: "",
    });

    const totalRules = Object.values(rules).reduce(
        (sum, arr) => sum + arr.length,
        0
    );

    const addRule = (field: RuleField) => {
        const value = inputs[field].trim();
        if (!value || rules[field].includes(value)) return;

        onChange({ ...rules, [field]: [...rules[field], value] });
        setInputs((prev) => ({ ...prev, [field]: "" }));
    };

    const removeRule = (field: RuleField, value: string) => {
        onChange({
            ...rules,
            [field]: rules[field].filter((v) => v !== value),
        });
    };

    const handleKeyDown = (
        e: KeyboardEvent<HTMLInputElement>,
        field: RuleField
    ) => {
        if (e.key === "Enter") addRule(field);
    };

    return (
        <>
            {/* Toggle Button */}
            <button
                onClick={() => setOpen((v) => !v)}
                className={styles.exclusionToggle}
                title="Exclusion Rules"
            >
                <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--md-sys-color-on-surface-variant)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <line x1="4" y1="6" x2="20" y2="6" />
                    <line x1="8" y1="12" x2="20" y2="12" />
                    <line x1="12" y1="18" x2="20" y2="18" />
                </svg>

                {totalRules > 0 && (
                    <span className={styles.exclusionBadge}>
                        {totalRules}
                    </span>
                )}
            </button>

            {/* Overlay */}
            {open && (
                <div
                    className={styles.exclusionOverlay}
                    onClick={() => setOpen(false)}
                />
            )}

            {/* Panel */}
            <aside
                className={`${styles.exclusionPanel} ${open ? styles.panelOpen : styles.panelClosed
                    }`}
            >
                <div className={styles.exclusionContent}>
                    {/* Header */}
                    <div className={styles.exclusionHeader}>
                        <div>
                            <h3 className={styles.exclusionTitle}>
                                Exclusion Rules
                            </h3>
                            <p className={styles.exclusionSubtitle}>
                                Session only — resets on refresh
                            </p>
                        </div>

                        <button
                            onClick={() => setOpen(false)}
                            className={styles.closeBtn}
                        >
                            ✕
                        </button>
                    </div>

                    {/* Sections */}
                    {FIELDS.map(({ field, label, placeholder }) => (
                        <div key={field} className={styles.exclusionSection}>
                            <label className={styles.sectionLabel}>
                                {label}
                            </label>

                            <div className={styles.inputRow}>
                                <input
                                    type="text"
                                    value={inputs[field]}
                                    onChange={(e) =>
                                        setInputs((prev) => ({
                                            ...prev,
                                            [field]: e.target.value,
                                        }))
                                    }
                                    onKeyDown={(e) => handleKeyDown(e, field)}
                                    placeholder={placeholder}
                                    className={styles.inputField}
                                />

                                <button
                                    onClick={() => addRule(field)}
                                    className={styles.addBtn}
                                >
                                    + ADD
                                </button>
                            </div>

                            {/* Pills */}
                            {rules[field].length > 0 && (
                                <div className={styles.pills}>
                                    {rules[field].map((val) => (
                                        <span key={val} className={styles.pill}>
                                            {val}
                                            <button
                                                onClick={() => removeRule(field, val)}
                                                className={styles.pillRemove}
                                            >
                                                ×
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </aside>
        </>
    );
}