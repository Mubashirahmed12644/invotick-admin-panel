import type { AppFlowTimelineResponse } from "@/lib/types";
import { EVENT_CATEGORY_META, EVENT_LABEL_CHAR_WIDTH, EVENT_LABEL_MAX_WIDTH, EVENT_LABEL_MIN_WIDTH, LIFECYCLE_EVENTS } from "@/features/user-based-screen-flow/constants";
import type {
  EventCategory,
  LabelBox,
  SessionQuality,
  UserFlowEvent,
  UserFlowRecord,
  UserFlowSession,
} from "@/features/user-based-screen-flow/types";
import { SESSION_QUALITY_META } from "@/features/user-based-screen-flow/constants";

export function getEventLabel(event: UserFlowEvent): string {
  const screenName = event.screenName?.trim();
  if (screenName) {
    return screenName;
  }

  const eventName = event.eventName?.trim();
  if (eventName) {
    return eventName;
  }

  return "MISSING_NAME";
}

export function getSplashOnlySessionCount(user: UserFlowRecord): number {
  return user.sessions.filter((session) => {
    if (session.events.length !== 1) {
      return false;
    }

    const firstLabel = getEventLabel(session.events[0]).trim().toLowerCase();
    return firstLabel === "splash" || firstLabel === "splash_screen";
  }).length;
}

export function getEventCategory(event: UserFlowEvent): EventCategory {
  const normalized = getEventLabel(event).trim().toLowerCase();

  if (LIFECYCLE_EVENTS.has(normalized)) {
    return "lifecycle";
  }

  if (normalized.includes("navigate")) {
    return "navigation";
  }

  if (normalized.includes("click")) {
    return "action";
  }

  if (normalized.includes("add")) {
    return "data_commit";
  }

  return "screen";
}

function sessionHasActivity(session: UserFlowSession): boolean {
  return session.events.some((event) => {
    const category = getEventCategory(event);
    return category === "navigation" || category === "action" || category === "data_commit";
  });
}

export function getSessionQuality(session: UserFlowSession): SessionQuality {
  if (session.events.length === 0) {
    return "badest";
  }

  if (session.events.every((event) => getEventCategory(event) === "lifecycle")) {
    return "bader";
  }

  const nonLifecycleEvents = session.events.filter((event) => getEventCategory(event) !== "lifecycle");
  const firstNonLifecycleLabel = nonLifecycleEvents[0]
    ? getEventLabel(nonLifecycleEvents[0]).trim().toLowerCase()
    : "";

  if (
    nonLifecycleEvents.length === 1 &&
    (firstNonLifecycleLabel === "splash" || firstNonLifecycleLabel === "splash_screen")
  ) {
    return "bad";
  }

  if (session.events.length > 20) {
    return "best";
  }

  if (session.events.length >= 10) {
    return "batter";
  }

  if (sessionHasActivity(session)) {
    return "good";
  }

  return "normal";
}

export function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime())
    ? timestamp
    : date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
        timeZone: "Asia/Karachi",
      });
}

export function formatDateNormalized(timestamp: string): string {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime())
    ? timestamp
    : date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        timeZone: "Asia/Karachi",
      });
}

export function formatDuration(seconds: number): string {
  const absoluteSeconds = Math.abs(seconds);
  const wholeSeconds = Math.round(absoluteSeconds);
  const days = Math.floor(wholeSeconds / 86400);
  const hours = Math.floor((wholeSeconds % 86400) / 3600);
  const minutes = Math.floor((wholeSeconds % 3600) / 60);
  const secs = wholeSeconds % 60;
  const prefix = seconds < 0 ? "-" : "";
  const parts: string[] = [];

  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return `${prefix}${parts.slice(0, 3).join(" ")}`;
}

export function compactId(value: string, keepStart = 8, keepEnd = 6): string {
  if (value.length <= keepStart + keepEnd + 3) {
    return value;
  }

  return `${value.slice(0, keepStart)}...${value.slice(-keepEnd)}`;
}

export function toUtcIso(value: string): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

export function mapTimelineResponseToRecord(response: AppFlowTimelineResponse): UserFlowRecord {
  return {
    userId: response.userId || response.deviceId || "UNKNOWN_IDENTITY",
    totalEvents: response.totalEvents,
    sessions: response.sessions.map((session) => ({
      sessionId: session.sessionId,
      startTime: session.startTime,
      events: session.events.map((event) => ({
        eventName: event.eventName,
        screenName: event.screenName,
        timestamp: event.timestamp,
        gapSec: event.gapSec,
      })),
    })),
  };
}

export function clampDistance(seconds: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, seconds * 5));
}

export function estimateLabelWidth(label: string): number {
  return Math.min(
    EVENT_LABEL_MAX_WIDTH,
    Math.max(EVENT_LABEL_MIN_WIDTH, label.length * EVENT_LABEL_CHAR_WIDTH),
  );
}

export function boxesOverlap(a: LabelBox, b: LabelBox): boolean {
  return !(a.x2 < b.x1 || a.x1 > b.x2 || a.y2 < b.y1 || a.y1 > b.y2);
}

export function buildEventPointTitle(sessionId: string, eventIndex: number, event: UserFlowEvent): string {
  const meta = EVENT_CATEGORY_META[getEventCategory(event)];
  return `Session: ${sessionId}
Event #: ${eventIndex + 1}
Name: ${getEventLabel(event)}
Category: ${meta.label}
Gap: ${formatDuration(event.gapSec || 0)}
Time: ${event.timestamp}`;
}

export { SESSION_QUALITY_META };
