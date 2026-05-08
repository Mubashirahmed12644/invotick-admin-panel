import type { EventCategory, SessionQuality, TimelineFilters } from "@/features/user-based-screen-flow/types";

export const FLOW_COLORS = [
  "#2563EB",
  "#059669",
  "#D97706",
  "#DC2626",
  "#7C3AED",
  "#0891B2",
] as const;

export const BASE_Y = 230;
export const START_X = 56;
export const SESSION_GAP = 56;
export const EVENT_PIXEL_FACTOR = 5;
export const MIN_EVENT_LENGTH = 18;
export const MAX_EVENT_LENGTH = 220;
export const MIN_SESSION_GAP_LENGTH = 24;
export const MAX_SESSION_GAP_LENGTH = 220;
export const GRAPH_MIN_HEIGHT = 320;
export const GRAPH_MIN_WIDTH = 1200;
export const EVENT_LABEL_MIN_SPACING = 18;
export const EVENT_LABEL_CHAR_WIDTH = 6.6;
export const EVENT_LABEL_MIN_WIDTH = 72;
export const EVENT_LABEL_MAX_WIDTH = 220;
export const LABEL_HEIGHT = 16;
export const LABEL_VERTICAL_STEP = 34;
export const UPPER_LABEL_START_OFFSET = 24;
export const LOWER_LABEL_START_OFFSET = 34;
export const SESSION_GAP_LABEL_Y = BASE_Y + 26;
export const LABEL_MAX_LEVEL_SEARCH = 24;

export const EMPTY_FILTERS: TimelineFilters = {
  userId: "",
  deviceId: "",
  appVersion: "",
  from: "",
  to: "",
};

export const LIFECYCLE_EVENTS = new Set([
  "app_foreground",
  "app_resumed",
  "app_paused",
  "app_background",
]);

export const EVENT_CATEGORY_META: Record<EventCategory, { color: string; label: string }> = {
  lifecycle: { color: "#6b7280", label: "Lifecycle" },
  navigation: { color: "#2563eb", label: "Navigation" },
  action: { color: "#0ea5e9", label: "Action" },
  data_commit: { color: "#e11d48", label: "Data Commit" },
  screen: { color: "#7c3aed", label: "Screen" },
};

export const EVENT_CATEGORY_LEGEND_ORDER: EventCategory[] = [
  "lifecycle",
  "screen",
  "navigation",
  "action",
  "data_commit",
];

export const SESSION_QUALITY_META: Record<
  SessionQuality,
  { color: string; label: string; subtitle: string }
> = {
  badest: { color: "#b91c1c", label: "Badest", subtitle: "Zero events" },
  bader: { color: "#dc2626", label: "Bader", subtitle: "Lifecycle only" },
  bad: { color: "#ea580c", label: "Bad", subtitle: "Quit on Splash" },
  normal: { color: "#f59e0b", label: "Normal", subtitle: "Quit after Splash" },
  good: { color: "#16a34a", label: "Good", subtitle: "Has activity" },
  batter: { color: "#0f766e", label: "Batter", subtitle: "10 to 20 events" },
  best: { color: "#1d4ed8", label: "Best", subtitle: "More than 20 events" },
};
