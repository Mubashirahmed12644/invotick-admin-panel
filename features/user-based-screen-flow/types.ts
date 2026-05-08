import type { ReactNode } from "react";

export interface UserFlowEvent {
  eventName?: string | null;
  screenName?: string | null;
  gapSec?: number | null;
  timestamp: string;
}

export interface UserFlowSession {
  sessionId: string;
  startTime: string;
  events: UserFlowEvent[];
}

export interface UserFlowRecord {
  userId: string;
  totalEvents: number;
  sessions: UserFlowSession[];
}

export interface TimelineFilters {
  userId: string;
  deviceId: string;
  appVersion: string;
  from: string;
  to: string;
}

export interface EventPoint {
  event: UserFlowEvent;
  sessionId: string;
  eventIndex: number;
  x: number;
  y: number;
  color: string;
}

export type EventCategory = "lifecycle" | "navigation" | "action" | "data_commit" | "screen";

export type SessionQuality =
  | "badest"
  | "bader"
  | "bad"
  | "normal"
  | "good"
  | "batter"
  | "best";

export interface LabelBox {
  x1: number;
  x2: number;
  y1: number;
  y2: number;
}

export interface TimelineGraphResult {
  elements: ReactNode[];
  points: EventPoint[];
  width: number;
  height: number;
}
