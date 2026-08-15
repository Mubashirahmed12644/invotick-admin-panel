import styles from "../styles/ip-stats.module.css";
import { countryCodeToFlag, formatRelativeTime } from "@/lib/format";
import type { IpRecordResponse } from "../types";

interface IpLookupResultProps {
    record: IpRecordResponse;
}

interface FlagBadgeProps {
    label: string;
    active: boolean | null;
    activeColor: string;
}

function FlagBadge({ label, active, activeColor }: FlagBadgeProps) {
    return (
        <span
            className={styles.flagBadge}
            style={
                active
                    ? {
                        color: activeColor,
                        borderColor: activeColor + "44",
                        backgroundColor: activeColor + "15",
                    }
                    : {
                        color: "var(--md-sys-color-outline)",
                        borderColor: "#3d4a6b44",
                        backgroundColor: "transparent",
                    }
            }
        >
            {label}
        </span>
    );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className={styles.ipRow}>
            <span className={styles.ipLabel}>{label}</span>
            <span className={styles.ipValue}>{value ?? "—"}</span>
        </div>
    );
}

export function IpLookupResult({ record }: IpLookupResultProps) {
    const flag = countryCodeToFlag(record.countryCode);

    return (
        <div className={styles.ipCard}>
            {/* Grid */}
            <div className={styles.ipGrid}>
                {/* Left */}
                <div className={styles.ipCol}>
                    <p className={styles.ipAddress}>{record.ip}</p>

                    <Row
                        label="Country"
                        value={record.country ? `${flag} ${record.country}` : "—"}
                    />
                    <Row label="Region" value={record.region} />
                    <Row label="City" value={record.city} />
                    <Row label="ZIP" value={record.zip} />
                    <Row
                        label="Coordinates"
                        value={
                            record.latitude != null && record.longitude != null
                                ? `${record.latitude.toFixed(4)}, ${record.longitude.toFixed(4)}`
                                : null
                        }
                    />
                    <Row label="Timezone" value={record.timezone} />
                    <Row label="Hostname" value={record.hostname} />
                </div>

                {/* Right */}
                <div className={styles.ipCol}>
                    <Row label="ISP" value={record.isp} />
                    <Row label="Organization" value={record.org} />
                    <Row label="ASN" value={record.asn} />
                    <Row label="Domain" value={record.domain} />

                    <div className={styles.flagContainer}>
                        <FlagBadge label="PROXY" active={record.isProxy} activeColor="var(--md-sys-color-error)" />
                        <FlagBadge label="VPN" active={record.isVpn} activeColor="var(--md-sys-color-error)" />
                        <FlagBadge label="MOBILE" active={record.isMobile} activeColor="var(--md-sys-color-warning)" />
                        <FlagBadge label="HOSTING" active={record.isHosting} activeColor="var(--md-sys-color-warning)" />
                        <FlagBadge label="EU" active={record.isEu} activeColor="var(--md-sys-color-tertiary)" />
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className={styles.ipFooter}>
                <Row label="Calling Code" value={record.callingCode} />
                <Row label="Language" value={record.language} />
                <Row label="Currency" value={record.currency} />

                <div className={styles.metaRight}>
                    <span className={styles.metaText}>Served from:</span>

                    <span
                        className={styles.servedBadge}
                        style={
                            record.servedFrom === "database"
                                ? {
                                    color: "var(--md-sys-color-tertiary)",
                                    borderColor: "#00f0ff44",
                                    backgroundColor: "#00f0ff15",
                                }
                                : {
                                    color: "var(--md-sys-color-warning)",
                                    borderColor: "#ffb54744",
                                    backgroundColor: "#ffb54715",
                                }
                        }
                    >
                        {record.servedFrom}
                    </span>

                    <span className={styles.metaText}>
                        Last fetched:
                        <span className={styles.metaHighlight}>
                            {" "}
                            {formatRelativeTime(record.lastFetchedAt)}
                        </span>
                    </span>
                </div>
            </div>
        </div>
    );
}