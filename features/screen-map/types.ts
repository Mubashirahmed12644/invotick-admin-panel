/** Shapes of `/v1/webpanel/screen-map/*` (backend `ScreenMapReads` / `ScreenMapController`). */

export type Mode = "tour" | "normal";

export interface ModeCount {
  mode: Mode;
  viewers: number;
  visits: number;
  createdDevices: number;
}

export interface Quantiles {
  median: number | null;
  p75: number | null;
}

export interface Headline {
  viewers: number;
  visits: number;
  visitsEndedSaved: number;
  complete: number;
  saveDevices: number;
  gateDevices: number;
  createdDevices: number;
  sharedDevices: number;
  g1Devices: number;
  saveNoCreateDevices: number;
  watchDevices: number;
  premiumDevices: number;
  dismissDevices: number;
  dismissOnlyDevices: number;
  /** Milliseconds. */
  stay: Quantiles;
  /** Milliseconds, visits that ended on the saved invoice. */
  toInvoice: Quantiles;
}

export interface Exit {
  kind: string;
  visits: number;
  afterAd30s: number;
  adClicked30s: number;
}

export interface Lost {
  finalExits: Exit[];
  nothing: number;
  businessOnly: number;
  businessClient: number;
  allThree: number;
}

export interface Idle {
  devices: number;
  landingAd: number;
  duration: Quantiles;
  exits: Exit[];
}

export interface Completeness {
  completeNotMade: number;
  completeNoSave: number;
  completeNoSavePreviewed: number;
}

export interface Overlay {
  business: number;
  client: number;
  items: number;
  bursts: number;
  burstLeave: number;
}

export interface Revenue {
  appOpenMicros: number;
  appOpenN: number;
  interstitialMicros: number;
  interstitialN: number;
  bannerMicros: number;
  bannerN: number;
  purchases: number;
  adClicks: number;
  visitsWithAdClick: number;
}

export interface ElementStat {
  key: string;
  elements: string[];
  devices: number;
  reachPct: number | null;
  reachCompletePct: number | null;
  taps: number;
  perViewer: number | null;
  repeatPct: number | null;
  rageDevices: number;
  leadsTo: string | null;
  leadsToPct: number | null;
}

export interface Cell {
  cell: string;
  taps: number;
  devices: number;
}

export interface ScreenView {
  screen: string;
  mode: Mode | null;
  from: string;
  to: string;
  modes: ModeCount[];
  modeSources: Record<string, number>;
  headline: Headline;
  exits: Exit[];
  lost: Lost | null;
  idle: Idle | null;
  completeness: Completeness | null;
  overlay: Overlay | null;
  revenue: Revenue;
  flags: { errorShown: number; validationFailed: number };
  elements: ElementStat[];
  elementsTotal: number;
  deadTaps: Cell[];
  page: number;
  size: number;
}

export interface ScreenSummary {
  screen: string;
  viewers: number;
  tourViewers: number;
  normalViewers: number;
  visits: number;
}

export interface Dimension {
  value: string;
  devices: number;
}

export interface Dimensions {
  versions: Dimension[];
  countries: Dimension[];
  platforms: Dimension[];
}

export interface Arm {
  variant: string;
  devices: number;
  created: number;
  g1: number;
  createdPct: number | null;
  g1Pct: number | null;
}

export interface Comparison {
  metric: "created" | "g1";
  diffPts: number | null;
  z: number | null;
  significant: boolean;
  verdict: string;
}

export interface Holdout {
  from: string;
  to: string;
  arms: Arm[];
  comparisons: Comparison[];
  minPerArm: number;
}

export interface ScreenMapStatus {
  countedThrough: string | null;
  running: boolean;
}

export interface Filters {
  days: 7 | 14 | 30;
  platform: string;
  /** Comma list of version codes, or "" for all. */
  versions: string;
  country: string;
  source: "" | "meta" | "organic";
  user: "" | "new" | "returning";
}
