/** Verdict of one cell against the baseline group (backend decisions 0114, 0116). */
export type ComparisonVerdict = "baseline" | "behind" | "ahead" | "within_noise" | "too_few";

/**
 * Hold everything fixed, vary one thing (backend decision 0116,
 * `GET /v1/webpanel/analytics/journey-compare`).
 */
export type CompareBy = "version" | "country" | "tier" | "source" | "campaign" | "platform";

export interface CompareGroup {
  /** `106`, `PK`, `T1`, `apps.facebook.com`, `meta:<campaign id>`, `Android`, `unknown`, … */
  key: string;
  label: string;
  cohort: number;
  notYetJudged: number;
  firstOpenFrom: string | null;
  firstOpenTo: string | null;
  /** 0..1 of the cohort inside the stretch every shown group shares; null when none. */
  inCommonWindow: number | null;
  /**
   * When the first of `notYetJudged` will have had its whole window (decision 0141). Absent from a
   * backend older than 0141, null when nobody is waiting.
   */
  nextReadyAt?: string | null;
  /**
   * Window in hours ("1", "24", "72", "168") → how many of this group's devices have already had all
   * of it (0141). Absent from a backend older than 0141.
   */
  readyByWindow?: Record<string, number>;
}

export interface CompareCell {
  group: string;
  reached: number;
  share: number;
  ciLow: number;
  ciHigh: number;
  diffPoints: number | null;
  z: number | null;
  verdict: ComparisonVerdict;
}

export interface CompareStep {
  key: string;
  step: number;
  label: string;
  cells: CompareCell[];
}

export interface JourneyCompare {
  by: CompareBy;
  from: string;
  to: string;
  windowHours: number;
  buildType: string | null;
  fixed: Record<string, string>;
  baseline: string;
  groups: CompareGroup[];
  others: CompareGroup[];
  steps: CompareStep[];
  calendar: { commonFrom: string | null; commonTo: string | null; warning: "apart" | "partly" | null };
  truncated: boolean;
  metaCampaigns: "readable" | "key_missing";
  tiers: Record<string, string[]>;
}
