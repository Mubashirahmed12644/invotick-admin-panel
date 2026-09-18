/**
 * Version-wise comparison of the first-invoice journey (backend decision 0114,
 * `GET /v1/webpanel/analytics/journey-comparison`).
 */
export type ComparisonVerdict = "baseline" | "behind" | "ahead" | "within_noise" | "too_few";

export interface ComparisonCell {
  versionCode: number;
  reached: number;
  /** Percent of the build's cohort. */
  share: number;
  /** 95 % Wilson interval, percent. */
  ciLow: number;
  ciHigh: number;
  /** Percentage points against the baseline build; null on the baseline. */
  diffPoints: number | null;
  z: number | null;
  verdict: ComparisonVerdict;
}

export interface ComparisonStep {
  /** `step_1` .. `step_8`, then `shared`. Stable; the words live in the panel. */
  key: string;
  step: number;
  label: string;
  cells: ComparisonCell[];
}

export interface ComparisonVersion {
  versionCode: number;
  versionName: string | null;
  /** First-time devices whose whole window has passed. */
  cohort: number;
  /** First-time devices too recent to judge yet — not in the cohort, not a loss. */
  notYetJudged: number;
  firstOpenFrom: string | null;
  firstOpenTo: string | null;
}

export interface JourneyComparison {
  from: string;
  to: string;
  windowHours: number;
  buildType: string | null;
  country: string | null;
  excludeCountry: boolean;
  baselineVersionCode: number;
  versions: ComparisonVersion[];
  steps: ComparisonStep[];
}
