// features/ip-stats/types.ts
// All TypeScript types for the IP Intelligence Dashboard feature

export interface IpStatsResponse {
    totalUsers: number;
    totalIps: number;
    nullIps: number;
    singleUserSingleIpCount: number;
    singleIpMultiUsersCount: number;
    ipGreaterThanThresholdCount: number;
}

export interface IpRecordResponse {
    id: string;
    ip: string;
    hostname: string | null;
    country: string | null;
    countryCode: string | null;
    region: string | null;
    city: string | null;
    zip: string | null;
    latitude: number | null;
    longitude: number | null;
    timezone: string | null;
    isp: string | null;
    org: string | null;
    asn: string | null;
    domain: string | null;
    isProxy: boolean | null;
    isVpn: boolean | null;
    isMobile: boolean | null;
    isHosting: boolean | null;
    isEu: boolean | null;
    callingCode: string | null;
    language: string | null;
    currency: string | null;
    fetchedFromSources: string | null;
    lastFetchedAt: string | null;
    servedFrom: string;
    createdAt: string;
    updatedAt: string;
}

export interface User {
    id: string;
    /** Masked by the server (the owner, 2026-09-14). The support view's reveal shows it whole. */
    email: string;
    username: string;
    role?: string;
    createdAt?: string;
    [key: string]: unknown;
}

export interface SuspiciousIpFullResponse {
    /** The shared login IP, masked by the server (the owner, 2026-09-14): `203.0.*.*`. */
    ip: string;
    userCount: number;
    users: User[];
    /** Its record; the address in it is masked too. */
    ipDetails: IpRecordResponse | null;
    /** The card's key, now that two masked IPs can look alike. Optional until the backend sends it. */
    recordId?: string | null;
}

export interface ExclusionRules {
    ips: string[];
    countries: string[];
    cities: string[];
    isps: string[];
    orgs: string[];
}