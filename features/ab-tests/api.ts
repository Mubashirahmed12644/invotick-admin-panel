import { ApiError, apiRequest } from "@/lib/api";
import type { AbTestsResponse, Unavailable, WindowChoice } from "./types";

const BASE = "/v1/webpanel/ab-tests";

/** The query for a window: full ISO instants only (a bare date is refused by the backend, AGENTS-EVENTS 3.13). */
export function rangeQuery(platform: string, w: WindowChoice, now: Date = new Date()): string {
  const q = new URLSearchParams({ platform });
  if (w !== "since") q.set("from", new Date(now.getTime() - w * 24 * 3600 * 1000).toISOString());
  return `?${q.toString()}`;
}

export const abTestsApi = {
  /**
   * One read. A 503 is this endpoint's own answer ("still computing", "busy", "too slow"), not a fault, so it is
   * declared expected and not filed in the panel's failure log.
   */
  get(platform: string, w: WindowChoice) {
    return apiRequest<AbTestsResponse>(`${BASE}${rangeQuery(platform, w)}`, { expectedStatuses: [503] });
  },
};

/** The backend's reason when it had no answer to show yet; null for any other failure. */
export function unavailableReason(e: unknown): Unavailable | null {
  if (!(e instanceof ApiError) || e.status !== 503) return null;
  const data = e.data as { reason?: string } | undefined;
  const r = data?.reason;
  return r === "computing" || r === "busy" || r === "too_slow" || r === "error" ? r : null;
}
