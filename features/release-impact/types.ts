/**
 * The answer of `GET /v1/webpanel/release-impact` (backend `ReleaseImpactReport.Response`, decision 0228 round one,
 * 0229). Codes and numbers only; every sentence is in `words.ts`.
 */

export type RowStatus = "better" | "worse" | "plain" | "amber" | "red" | "thin" | "pending" | "none";
export type ReleaseStatus = "clear" | "watch" | "broken" | "thin";
export type Unavailable = "computing" | "busy" | "too_slow" | "error";

export interface Rollout {
  at: string;
  percent: number | null;
}

export interface Release {
  platform: string;
  name: string;
  code: number;
  codes: number[];
  productionAt: string | null;
  dateUncertain: boolean;
  rollout: Rollout[];
  comparison: "staged" | "before_after" | "planned";
  previous: number | null;
  current: boolean;
  shareToday: number | null;
}

export interface TimelineSeries {
  key: string;
  codes: number[];
  byDay: number[];
}

export interface Timeline {
  days: string[];
  series: TimelineSeries[];
  totals: number[];
}

export interface IosRow {
  name: string;
  productionAt: string | null;
  firstOpens: number;
}

/** One arm's value: a percent, a rate per 1,000, days, or US dollars, by the row's `unit`. */
export interface Cell {
  value: number | null;
  lo: number | null;
  hi: number | null;
  x: number | null;
  n: number | null;
  extra: Record<string, number>;
}

export interface Kpi {
  id: string;
  group: string;
  kind: "prop" | "rate" | "mean" | "money" | "pending";
  dir: number;
  tol: number | null;
  diffUnit: "pp" | "pct" | "days";
  unit: "percent" | "per1000" | "days" | "usd" | "count";
  a: Cell | null;
  b: Cell | null;
  diff: number | null;
  lo: number | null;
  hi: number | null;
  min: number | null;
  status: RowStatus;
  pending: string | null;
  onBreach: string | null;
  daysToMin: number | null;
  cap: number | null;
}

export interface ScoreColumn {
  code: number;
  name: string;
  kind: "before_after" | "same_days";
  from: string;
  to: string;
}

export interface ScoreRow {
  id: string;
  group: "guardrail" | "goal";
  unit: Kpi["unit"];
  cells: Record<string, Cell | null>;
  compare: Kpi;
}

export interface Scorecard {
  columns: ScoreColumn[];
  rows: ScoreRow[];
  status: ReleaseStatus;
  counts: Record<string, number>;
}

export interface BalanceDay {
  day: string;
  a: number;
  b: number;
}

export interface Balance {
  days: BalanceDay[];
  a: number;
  b: number;
  share: number | null;
  lo: number | null;
  hi: number | null;
  rolloutPercent: number | null;
  state: "ok" | "failed" | "thin" | "no_rollout";
}

export interface LadderStep {
  key: "first_open" | "started" | "saved" | "g1";
  a: number;
  b: number;
}

export interface Ladder {
  firstOpensA: number;
  firstOpensB: number;
  steps: LadderStep[];
}

export interface DailyPoint {
  day: string;
  aUsd: number | null;
  aPhoneDays: number;
  bUsd: number | null;
  bPhoneDays: number;
}

export interface CurvePoint {
  day: number;
  a: Cell;
  b: Cell;
}

export interface SegmentRow {
  key: string;
  a: Cell;
  b: Cell;
}

export interface ReadDate {
  label: "24h" | "7d" | "30d";
  at: string;
  state: "done" | "now" | "next";
}

export interface Recommendation {
  code: "KEEP" | "ITERATE" | "ROLL_BACK" | "WAIT";
  at: ReadDate["label"];
  rows: string[];
  switches: string[];
  days: number | null;
}

export interface Excluded {
  cohortPhones: number;
  activePhones: number;
  testingDevicesTable: number;
  ourOwnListSize: number;
}

export interface Section {
  current: number;
  previous: number;
  currentName: string;
  previousName: string;
  comparison: "staged" | "before_after";
  balance: Balance;
  ladder: Ladder;
  kpis: Kpi[];
  status: ReleaseStatus;
  readDates: ReadDate[];
  recommendation: Recommendation | null;
  g1DaysToDetect: number | null;
  newPerDay: Record<"a" | "b", number>;
  daily: DailyPoint[];
  retentionCurve: CurvePoint[];
  countries: SegmentRow[];
  unknownCountry: Record<"a" | "b", number>;
  excluded: Excluded;
}

export interface ReleaseImpactResponse {
  platform: string;
  range: { from: string; to: string };
  computedAt: string;
  stale: boolean;
  truncated: boolean;
  releases: Release[];
  planned: Release;
  timeline: Timeline;
  ios: IosRow[];
  scorecard: Scorecard;
  section: Section;
}

/** The range asked for: since the current release, or the last N days. */
export type RangeChoice = "since" | 7 | 14 | 30;

/** Which G1 reading the scorecard and the "Nateeja" line use. */
export type Win = "24h" | "7d";

// ── round 2: the "Doosri invoice" section (decision 0227; backend SecondInvoiceReport.Response) ──

export interface SecondInvoiceStep {
  key: "first_invoice" | "first_share_24h" | "second_24h" | "second_7d";
  on: number;
  off: number;
}

export interface SecondInvoiceCurvePoint {
  day: number;
  on: Cell;
  off: Cell;
}

export interface MechanismStep {
  key: string;
  x: number;
  n: number;
}

export interface Hours {
  median: number | null;
  p75: number | null;
  n: number;
}

export interface SecondInvoiceResponse {
  state: "not_started" | "running";
  platform: string;
  range: { from: string; to: string };
  computedAt: string;
  stale: boolean;
  truncated: boolean;
  holdout: { on: number; off: number; percentSources: Record<string, number>; holdoutPercents: Record<string, number>; firstDealAt: string | null };
  population: { firstInvoices: number; assigned: number; unassigned: number; ours: number; pending7: number };
  verdict: { badge: "not_started" | "thin" | "better" | "worse" | "plain"; breached: string[]; switches: string[] };
  recommendation: Recommendation | null;
  readDates: ReadDate[];
  plan: { neededPerArm: number | null; perWeekOn: number; perWeekOff: number; weeksMore: number | null };
  kpis: Kpi[];
  funnel: { firstInvoiceOn: number; firstInvoiceOff: number; steps: SecondInvoiceStep[] };
  curve: SecondInvoiceCurvePoint[];
  mechanism: MechanismStep[];
  offArmNudgePhones: number;
  shareToSecond: Record<"on" | "off", Hours>;
  repeatAmountsUnchanged: MechanismStep;
}

// ── round 3: the "Signup at exit" section (decision 0232; backend SignupInviteReport.Response) ──

export interface SignupInviteResponse {
  state: "not_started" | "running";
  platform: string;
  range: { from: string; to: string };
  computedAt: string;
  stale: boolean;
  truncated: boolean;
  population: { dealt: number; invited: number; holdout: number; paying: number; ours: number; olderBuild: number; dealtTwice: number; pending14: number };
  verdict: { badge: "not_started" | "thin" | "better" | "worse" | "plain"; breached: string[]; switches: string[] };
  recommendation: Recommendation | null;
  readDates: ReadDate[];
  plan: { neededHoldout: number | null; neededInvited: number | null; perWeekInvited: number; perWeekHoldout: number; weeksMore: number | null };
  kpis: Kpi[];
  mechanism: MechanismStep[];
  shownByLevel: Record<string, number>;
  capViolations: MechanismStep;
  holdoutShownPhones: number;
  paying: MechanismStep;
  signupsGone7: MechanismStep;
}
