/**
 * The answer of `GET /v1/webpanel/ab-tests` (backend `AbTestsReport.Response`, decision 0222).
 * Codes and numbers only: every sentence on the page is written here in the panel (`words.ts`).
 */

export type VerdictState = "PROVEN" | "LEANING" | "NOT_ENOUGH_DATA";
export type Direction = "A" | "B" | "EVEN";
export type TestStatus = "RUNNING" | "NOT_STARTED" | "ENDED";
export type PercentMeans = "ARM_A" | "ARM_B";
export type RemoteState = "set" | "absent" | "conditional" | "unknown";

export interface Prop {
  n: number;
  x: number;
  rate: number | null;
  lo: number | null;
  hi: number | null;
}

export interface Metric {
  metric: "g1" | "saved" | "return";
  window: "24h" | "7d" | "d2_7";
  primary: boolean;
  a: Prop;
  b: Prop;
  diffPts: number | null;
  diffLo: number | null;
  diffHi: number | null;
  z: number | null;
  p: number | null;
  valid: boolean;
}

export interface Verdict {
  state: VerdictState;
  direction: Direction | null;
  basis: string;
  moreDays: number | null;
  moreDaysReason: string | null;
  neededPerArm: number | null;
  daysBasis: string | null;
  perDayA: number;
  perDayB: number;
}

export interface Arm {
  key: string;
  role: "A" | "B";
  assigned: number;
  assignedNewInstalls: number;
  observedShare: number | null;
  pending24: number;
  pending7: number;
  values: { value: string; phones: number }[];
}

export interface Percent {
  means: PercentMeans;
  remoteKey: string;
  remoteState: RemoteState;
  remoteValue: string | null;
  appDefaultSeen: { appVersionCode: number | null; percent: string | null; rows: number }[];
  sources: Record<string, number> | null;
  sourceRows: Record<string, number> | null;
}

export interface Leak {
  since: string;
  sinceSource: "phones" | "template" | "range";
  armPhones: number;
  perDay: number;
  shareOfNewInstalls: number | null;
}

export interface LangRow {
  lang: string;
  aPhones: number;
  bPhones: number;
  enough: boolean;
  metrics: Metric[];
}

export interface AbTest {
  id: string;
  status: TestStatus;
  intendedOff: boolean;
  touchesAds: boolean;
  newInstallsOnly: boolean;
  metricsBuilt: boolean;
  startedAt: string | null;
  lastAssignmentAt: string | null;
  percent: Percent;
  leak: Leak | null;
  arms: Arm[];
  unknownArm: number;
  notNewInstall: number;
  metrics: Metric[];
  verdict: Verdict;
  breakdown: LangRow[] | null;
  released: number;
  ourOwnSetAside: number;
}

export interface AbTestsResponse {
  computedAt: string;
  cacheMinutes: number;
  range: { from: string; to: string };
  platform: string;
  population: {
    buildType: string;
    excludedTestingDevices: number;
    ourOwnListSize: number;
    ourOwnPhonesSetAside: number;
    newInstallsOnly: boolean;
  };
  remoteConfig: {
    state: "ok" | "unknown";
    reason: string | null;
    templateVersion: string | null;
    templateUpdatedAt: string | null;
  };
  tests: AbTest[];
  notTests: string[];
  truncated: boolean;
  stale: boolean;
}

/** Why there is no answer to show yet (the backend's 503 body). */
export type Unavailable = "computing" | "busy" | "too_slow" | "error";

/** The time window chips: since the earliest test started, or the last N days. */
export type WindowChoice = "since" | 7 | 14 | 30;
