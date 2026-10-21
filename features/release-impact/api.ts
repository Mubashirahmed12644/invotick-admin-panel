import { ApiError, api, apiRequest } from "@/lib/api";
import type { RangeChoice, ReleaseImpactResponse, SecondInvoiceResponse, Unavailable } from "./types";

const BASE = "/v1/webpanel/release-impact";

/** The query for a range: full ISO instants only (a bare date is refused by the backend, AGENTS-EVENTS 3.13). */
export function rangeQuery(r: RangeChoice, now: Date = new Date()): string {
  const q = new URLSearchParams({ platform: "Android" });
  if (r !== "since") q.set("from", new Date(now.getTime() - r * 24 * 3600 * 1000).toISOString());
  return `?${q.toString()}`;
}

export const releaseImpactApi = {
  /** One read. A 503 is this endpoint's own answer ("computing", "busy", "too slow"), not a fault. */
  get(r: RangeChoice) {
    return apiRequest<ReleaseImpactResponse>(`${BASE}${rangeQuery(r)}`, { expectedStatuses: [503] });
  },

  /** The "Doosri invoice" section (decision 0227): its own read and cache; the last 30 days unless a range is picked. */
  secondInvoice(r: RangeChoice) {
    const q = r === "since" ? "?platform=Android" : rangeQuery(r);
    return apiRequest<SecondInvoiceResponse>(`${BASE}/second-invoice${q}`, { expectedStatuses: [503] });
  },

  /** The Health Centre's silence check for feature events, for the one strip this page shows (never a copy of the card). */
  async silence(): Promise<{ status: string; summary: string } | null> {
    const o = await api.getHealthCentre(false);
    const c = o.checks.find((x) => x.id === "feature-events-arriving");
    return c ? { status: c.status, summary: c.summary } : null;
  },
};

export function unavailableReason(e: unknown): Unavailable | null {
  if (!(e instanceof ApiError) || e.status !== 503) return null;
  const r = (e.data as { reason?: string } | undefined)?.reason;
  return r === "computing" || r === "busy" || r === "too_slow" || r === "error" ? r : null;
}
