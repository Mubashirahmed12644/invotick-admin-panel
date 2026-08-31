import { getAccessToken } from "@/lib/auth";
import type {
  ExchangeRatesHealth,
  HealthCentreOverview,
  AdminLoginResponse,
  AdminVerifyOtpRequest,
  ActiveUser,
  ActiveUsersPage,
  EventSummaryPage,
  AppVersion,
  ApiResponse,
  ApiTokenResponse,
  AuthResponse,
  LiveEvent,
  LoginRequest,
  UserMapLocation,
  WebpanelInventoryItemResponse,
  WebpanelInvoiceFullResponse,
  WebpanelInvoiceSummaryResponse,
  WebpanelTestingDeviceLookupResponse,
  ContactDataStats,
  ContactPage,
  SyncHealthOccurrence,
  BillingHealthSummary,
  SyncHealthSignature,
  WebpanelTestingDeviceResponse,
  WebpanelUserStatsAndAnalyticsByUserIdResponse,
  WebpanelUserWithStatsAndAnalyticsResponse,
  WebpanelUserWithStatsResponse,
  WebpanelUserStatsResponse,
  AppFlowTimelineResponse,
  FunnelBy,
  FunnelDimensions,
  FunnelQueryRequest,
  FunnelQueryResponse,
} from "@/lib/types";
import type {
  IpStatsResponse,
  IpRecordResponse,
  SuspiciousIpFullResponse,
} from "@/features/ip-stats/types";
import { noteApiSuccess, recordApiFailure } from "./diagnostics";

// In the browser, call same-origin "/backend" (proxied to the backend by the
// next.config rewrite) so the panel works even where the backend origin isn't
// directly reachable. Server-side keeps calling the backend origin directly.
const API_BASE_URL =
  typeof window !== "undefined"
    ? "/backend"
    : (process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "");
const IS_NGROK_BASE_URL = /https?:\/\/[^/]*ngrok[^/]*/i.test(API_BASE_URL);

/**
 * One retry for a request that never got an answer — and only for a GET.
 *
 * A deployment replacing the app under an open tab kills whatever it had in flight. Nothing is
 * broken, the next attempt succeeds, and the page was showing an error and filing a fault for it: on
 * 2026-08-22 that produced seventeen recorded failures across six moments, every one of them within
 * six minutes of a deploy, and the report was carried over as evidence of an outage.
 *
 * GET only, deliberately. A POST or PUT that never answered may still have been applied — retrying it
 * risks doing the thing twice, and a duplicate write is worse than an error message.
 *
 * A single retry, and a short one. This exists to absorb a switchover, not to paper over a server
 * that is actually down: the second failure is recorded and surfaced exactly as before.
 */
async function fetchWithOneRetry(url: string, init: RequestInit, method: string): Promise<Response> {
  // 502, 503 and 504 are the gateway saying the server did not answer it — the shape a restart takes
  // from out here. They are not the application refusing anything, so they are worth one more try in
  // exactly the way a dropped connection is.
  const GATEWAY = new Set([502, 503, 504]);
  try {
    const first = await fetch(url, init);
    if (!GATEWAY.has(first.status) || method !== "GET") return first;
    await new Promise((r) => setTimeout(r, 800));
    return await fetch(url, init);
  } catch (err) {
    if (method !== "GET") throw err;
    await new Promise((r) => setTimeout(r, 600));
    return await fetch(url, init);
  }
}

export class ApiError extends Error {
  status: number;
  data: unknown;
  isNetworkError: boolean;
  /**
   * Which request this was.
   *
   * Without it an error is a status and a sentence, and every diagnosis starts by working out what
   * was even being asked for — which is the question a sign-out makes hardest, because the request
   * has left the screen by the time anybody reads the message.
   */
  url?: string;

  constructor(
    message: string,
    options?: { status?: number; data?: unknown; isNetworkError?: boolean; url?: string },
  ) {
    super(message);
    this.name = "ApiError";
    this.status = options?.status ?? 500;
    this.data = options?.data ?? null;
    this.isNetworkError = options?.isNetworkError ?? false;
    this.url = options?.url;
  }
}

function buildUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  return `${API_BASE_URL}${path}`;
}

async function parseResponseBody<T>(response: Response): Promise<ApiResponse<T> | null> {
  try {
    return (await response.json()) as ApiResponse<T>;
  } catch {
    return null;
  }
}

interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
}

async function requestWithAuth(path: string, options: RequestOptions = {}): Promise<Response> {
  const headers = new Headers(options.headers ?? {});
  const requiresAuth = options.requiresAuth ?? true;

  headers.set("Content-Type", "application/json");
  if (IS_NGROK_BASE_URL) {
    headers.set("ngrok-skip-browser-warning", "true");
  }

  if (requiresAuth) {
    const token = getAccessToken();

    if (!token) {
      throw new ApiError("Unauthorized", { status: 401 });
    }

    headers.set("Authorization", `Bearer ${token}`);
  }

  // Recorded here because this is the one place every request in the panel passes through. Doing it
  // at the call sites would mean the diagnostics were only as complete as whoever remembered.
  const method = (options.method ?? "GET").toUpperCase();
  try {
    const response = await fetchWithOneRetry(buildUrl(path), { ...options, headers }, method);
    if (response.ok) {
      // Something answered, so whatever was still waiting to be called a failure was a blip.
      noteApiSuccess();
    }
    if (!response.ok) {
      recordApiFailure({
        at: new Date().toISOString(),
        hidden: typeof document !== "undefined" && document.visibilityState !== "visible",
        method,
        url: path,
        status: response.status,
        message: response.statusText || `HTTP ${response.status}`,
      });
    }
    return response;
  } catch (error) {
    // Status 0: the request never got an answer, and the one retry above did not either. A refused
    // connection and a 502 from the proxy look the same from here, and both are worth keeping —
    // they are what "the errors flash past" is.
    recordApiFailure({
      at: new Date().toISOString(),
      hidden: typeof document !== "undefined" && document.visibilityState !== "visible",
      method,
      url: path,
      status: 0,
      message: error instanceof Error ? error.message : String(error),
    });
    throw new ApiError("Network error. Please check your connection and retry.", {
      status: 0,
      data: error,
      isNetworkError: true,
    });
  }
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await requestWithAuth(path, options);

  const body = await parseResponseBody<T>(response);

  if (!response.ok) {
    throw new ApiError(body?.message || `Request failed with status ${response.status}`, {
      status: response.status,
      data: body?.data,
      url: path,
    });
  }

  if (!body) {
    throw new ApiError("Invalid server response.", {
      status: response.status,
    });
  }

  if (!body.success) {
    throw new ApiError(body.message || "Request failed.", {
      status: response.status,
      data: body.data,
    });
  }

  return body.data as T;
}

export async function apiRequestRaw<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await requestWithAuth(path, options);
  const rawBody = (await response.json().catch(() => null)) as
    | T
    | { message?: string; data?: unknown }
    | null;

  if (!response.ok) {
    const message =
      rawBody && typeof rawBody === "object" && "message" in rawBody && typeof rawBody.message === "string"
        ? rawBody.message
        : `Request failed with status ${response.status}`;

    throw new ApiError(message, {
      status: response.status,
      data: rawBody && typeof rawBody === "object" && "data" in rawBody ? rawBody.data : rawBody,
      url: path,
    });
  }

  if (rawBody === null) {
    throw new ApiError("Invalid server response.", {
      status: response.status,
    });
  }

  return rawBody as T;
}

export function getErrorMessage(error: unknown, fallback = "Something went wrong."): string {
  if (error instanceof ApiError && error.message) {
    return error.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

/**
 * Is this the session being over — as opposed to this one thing being off limits?
 *
 * 403 used to count, and it is not the same claim. The backend says 403 "Insufficient permissions"
 * when the token is perfectly good and the account simply may not call that endpoint; treating it as
 * a dead session logs a working login out, and does it again on the next poll. Only 401 means the
 * token itself was not accepted.
 */
export function isUnauthorizedError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

export const api = {
  login(payload: LoginRequest) {
    return apiRequest<AdminLoginResponse>("/v2/auth/admin-login", {
      method: "POST",
      body: JSON.stringify(payload),
      requiresAuth: false,
    });
  },

  verifyAdminOtp(payload: AdminVerifyOtpRequest) {
    return apiRequest<AuthResponse>("/v2/auth/admin-verify-otp", {
      method: "POST",
      body: JSON.stringify(payload),
      requiresAuth: false,
    });
  },

  generateApiToken(expiryDays?: number) {
    return apiRequest<ApiTokenResponse>("/v1/webpanel/api-token", {
      method: "POST",
      body: JSON.stringify({ expiryDays: expiryDays ?? 30 }),
    });
  },

  revokeApiToken(jti: string) {
    return apiRequest<null>(`/v1/webpanel/api-token/${encodeURIComponent(jti)}`, {
      method: "DELETE",
    });
  },

  /**
   * @param buildType "release" or "debug" to narrow to one kind of build; omit for both.
   * @param appVersionCode narrow to one build number; omit for every version.
   * @param from ISO instant, inclusive. @param to ISO instant, exclusive.
   *
   * Every one of these is sent to the server rather than applied to the result, because the result
   * is already capped at `limit`. Filtering after that cap is what produced a header reading
   * "3 live" above "No matching active users" — the count and the list answering different
   * questions.
   */
  getActiveUsers(
    limit = 200,
    buildType?: string,
    appVersionCode?: number,
    from?: string,
    to?: string,
  ) {
    const params = new URLSearchParams({ limit: String(limit) });
    if (buildType && buildType !== "all") params.set("buildType", buildType);
    if (appVersionCode != null) params.set("appVersionCode", String(appVersionCode));
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    return apiRequest<ActiveUsersPage>(`/v1/webpanel/analytics/active-users?${params.toString()}`);
  },

  /**
   * Every event name this build sent in range, with volume and reach.
   *
   * The live feed shows one person's stream, which cannot separate "this user did not do it" from
   * "this event never ships at all". This can, and it is the check to run before trusting any
   * funnel built on top of an event.
   */
  getEventSummary(from?: string, to?: string, appVersionCode?: number, buildType?: string) {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (appVersionCode != null) params.set("appVersionCode", String(appVersionCode));
    if (buildType && buildType !== "all") params.set("buildType", buildType);
    return apiRequest<EventSummaryPage>(`/v1/webpanel/analytics/event-summary?${params.toString()}`);
  },

  /**
   * Versions seen reporting inside the same range the list is showing, newest first.
   *
   * The same range, not a window of its own. These were separate — options from the last 24 hours,
   * list over 30 days — so a version with rows in the list was missing from the picker, which reads
   * as "no such version" rather than "not asked for".
   */
  getAppVersions(from: string, to: string) {
    const params = new URLSearchParams({ from, to });
    return apiRequest<AppVersion[]>(`/v1/webpanel/analytics/app-versions?${params.toString()}`);
  },

  /**
   * @param appVersionCode narrow the stream to one build; omit for the user's whole journey.
   *
   * Filtering the user list alone was not enough: the list decides who can be opened, this decides
   * what is then seen. Asking for 1.4.1 and opening somebody returned months of their old build.
   */
  getLiveEvents(userId: string, since?: string, limit = 100, appVersionCode?: number) {
    const params = new URLSearchParams({ userId, limit: String(limit) });
    if (appVersionCode != null) params.set("appVersionCode", String(appVersionCode));
    if (since) params.set("since", since);
    return apiRequest<LiveEvent[]>(`/v1/webpanel/analytics/live-events?${params.toString()}`);
  },

  // PERMANENTLY deletes a user's stream events (they won't reappear). Returns the deleted count.
  /**
   * @param appVersionCode delete only this build's events; omit to delete the whole stream.
   *
   * A destructive action has to remove what the screen is showing. Filtered to one version this
   * deleted the user's entire history while twenty rows were displayed.
   */
  clearLiveEvents(userId: string, appVersionCode?: number) {
    const params = new URLSearchParams({ userId });
    if (appVersionCode != null) params.set("appVersionCode", String(appVersionCode));
    return apiRequest<number>(
      `/v1/webpanel/analytics/live-events?${params.toString()}`,
      { method: "DELETE" },
    );
  },

  getAllUsersWithStats() {
    return apiRequest<WebpanelUserWithStatsResponse[]>("/v1/webpanel/getAllUsersWithStats");
  },

  getAllUsersWithStatAndAnalytics() {
    return apiRequest<WebpanelUserWithStatsAndAnalyticsResponse[]>(
      "/v1/webpanel/getAllUsersWithStatAndAnalytics",
    );
  },

  getUserStatsAndAnalytics(userId: string) {
    return apiRequest<WebpanelUserStatsAndAnalyticsByUserIdResponse>(
      `/v1/webpanel/statsAndAnalyticsByUserId?userId=${encodeURIComponent(userId)}`,
    );
  },

  getTestingDevices() {
    return apiRequest<WebpanelTestingDeviceResponse[]>("/v1/webpanel/testing-devices");
  },

  createTestingDevice(deviceId: string) {
    return apiRequest<WebpanelTestingDeviceResponse>("/v1/webpanel/testing-devices", {
      method: "POST",
      body: JSON.stringify({ deviceId }),
    });
  },

  updateTestingDevice(currentDeviceId: string, nextDeviceId: string) {
    return apiRequest<WebpanelTestingDeviceResponse>(
      `/v1/webpanel/testing-devices/${encodeURIComponent(currentDeviceId)}`,
      {
        method: "PUT",
        body: JSON.stringify({ deviceId: nextDeviceId }),
      },
    );
  },

  deleteTestingDevice(deviceId: string) {
    return apiRequest<null>(`/v1/webpanel/testing-devices/${encodeURIComponent(deviceId)}`, {
      method: "DELETE",
    });
  },

  lookupTestingDevice(deviceId: string) {
    return apiRequest<WebpanelTestingDeviceLookupResponse>(
      `/v1/webpanel/testing-devices/lookup?deviceId=${encodeURIComponent(deviceId)}`,
    );
  },

  /**
   * Every health check, worst first.
   *
   * @param force skip the per-check cache — for the Re-check button. A check with a twelve-hour
   * interval is otherwise unhelpful to someone who has just fixed what it reported.
   */
  getHealthCentre(force = false) {
    return apiRequest<HealthCentreOverview>(`/v1/webpanel/health-centre?force=${force}`);
  },

  /** The rates service's status, already judged into an `issues` list — see ExchangeRatesAdminService. */
  getExchangeRatesHealth() {
    return apiRequest<ExchangeRatesHealth>("/v1/webpanel/exchange-rates/health");
  },

  addExchangeRateKey(body: { providerName: string; apiKey: string; monthlyQuota: number; status?: string }) {
    return apiRequest<unknown>("/v1/webpanel/exchange-rates/api-keys", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  getContactDataStats() {
    return apiRequest<ContactDataStats>("/v1/webpanel/contact-data/stats");
  },

  getHeldContacts(options?: { filter?: string; sort?: string; search?: string; limit?: number }) {
    const params = new URLSearchParams();
    if (options?.filter) params.set("filter", options.filter);
    if (options?.sort) params.set("sort", options.sort);
    if (options?.search) params.set("search", options.search);
    if (options?.limit !== undefined) params.set("limit", String(options.limit));
    const query = params.toString();
    return apiRequest<ContactPage>(`/v1/webpanel/contact-data/contacts${query ? `?${query}` : ""}`);
  },

  getBillingHealth(sharingThreshold = 2) {
    return apiRequest<BillingHealthSummary>(
      `/v1/webpanel/billing-health/summary?sharingThreshold=${sharingThreshold}`,
    );
  },

  getSyncHealthSignatures(options?: { unresolvedOnly?: boolean; days?: number }) {
    const params = new URLSearchParams();
    if (options?.unresolvedOnly !== undefined) params.set("unresolvedOnly", String(options.unresolvedOnly));
    if (options?.days !== undefined) params.set("days", String(options.days));
    const query = params.toString();
    return apiRequest<SyncHealthSignature[]>(
      `/v1/webpanel/sync-health/signatures${query ? `?${query}` : ""}`,
    );
  },

  getSyncHealthOccurrences(signature: string) {
    return apiRequest<SyncHealthOccurrence[]>(
      `/v1/webpanel/sync-health/occurrences?signature=${encodeURIComponent(signature)}`,
    );
  },

  resolveSyncHealthSignature(signature: string, resolved: boolean) {
    return apiRequest<number>(
      `/v1/webpanel/sync-health/resolve?signature=${encodeURIComponent(signature)}&resolved=${resolved}`,
      { method: "POST" },
    );
  },

  getScreenFlow(filters?: {
    from?: string;
    to?: string;
    appVersion?: string;
    platform?: string;
  }) {
    const params = new URLSearchParams();

    if (filters?.from) {
      params.set("from", filters.from);
    }
    if (filters?.to) {
      params.set("to", filters.to);
    }
    if (filters?.appVersion) {
      params.set("appVersion", filters.appVersion);
    }
    if (filters?.platform) {
      params.set("platform", filters.platform);
    }

    const query = params.toString();
    return apiRequestRaw<unknown>(`/v2/admin/analytics/screen-flow${query ? `?${query}` : ""}`);
  },

  getAppFlowTimeline(filters: {
    deviceId?: string;
    userId?: string;
    appVersion?: string;
    from?: string;
    to?: string;
  }) {
    const params = new URLSearchParams();

    if (filters.deviceId) {
      params.set("deviceId", filters.deviceId);
    }
    if (filters.userId) {
      params.set("userId", filters.userId);
    }
    if (filters.appVersion) {
      params.set("appVersion", filters.appVersion);
    }
    if (filters.from) {
      params.set("from", filters.from);
    }
    if (filters.to) {
      params.set("to", filters.to);
    }

    const query = params.toString();
    return apiRequestRaw<AppFlowTimelineResponse>(
      `/v2/admin/analytics/timeline${query ? `?${query}` : ""}`,
    );
  },

  async getUserStats(userId: string) {
    try {
      return await apiRequest<WebpanelUserStatsResponse>(
        `/v1/webpanel/statsByUserId?userId=${encodeURIComponent(userId)}`,
      );
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return apiRequest<WebpanelUserStatsResponse>(
          `/v1/webpanel/statsbyuserId?userId=${encodeURIComponent(userId)}`,
        );
      }

      throw error;
    }
  },

  getInvoices(userId?: string) {
    const query = userId ? `?userId=${encodeURIComponent(userId)}` : "";
    return apiRequest<WebpanelInvoiceSummaryResponse[]>(`/v1/webpanel/invoices${query}`);
  },

  getInvoiceById(invoiceId: string) {
    return apiRequest<WebpanelInvoiceFullResponse>(
      `/v1/webpanel/invoices/${encodeURIComponent(invoiceId)}`,
    );
  },


  getInventoryItems(userId?: string) {
    const query = userId ? `?userId=${encodeURIComponent(userId)}` : "";
    return apiRequest<WebpanelInventoryItemResponse[]>(`/v1/webpanel/inventory-items${query}`);
  },

  getIpStats(threshold: number = 10) {
    return apiRequest<IpStatsResponse>(`/v1/ip/stats?threshold=${threshold}`);
  },

  getIpRecord(ip: string) {
    return apiRequest<IpRecordResponse>(`/v1/ip/${encodeURIComponent(ip)}`);
  },

  getSuspiciousIps(threshold: number = 10) {
    return apiRequest<SuspiciousIpFullResponse[]>(
      `/v1/ip/suspicious/full?threshold=${threshold}`,
    );
  },

  getUsersForMap() {
    return apiRequest<UserMapLocation[]>("/v1/webpanel/getUsersForMap");
  },

  getFunnelNames(params?: { type?: FunnelBy; search?: string }) {
    const query = new URLSearchParams();
    if (params?.type) query.set("type", params.type);
    if (params?.search) query.set("search", params.search);
    const qs = query.toString();
    return apiRequest<string[]>(`/v2/admin/analytics/funnel/names${qs ? `?${qs}` : ""}`);
  },

  /**
   * The version and country values present in a window, for the funnel's filter dropdowns.
   *
   * Same window the funnel itself will use — a list built over all time can offer a release that
   * shipped and died before the selected range, and a funnel returning zero for it reads as a
   * product failure rather than an empty filter.
   */
  getFunnelDimensions(params?: { from?: string; to?: string }) {
    const query = new URLSearchParams();
    if (params?.from) query.set("from", params.from);
    if (params?.to) query.set("to", params.to);
    const qs = query.toString();
    return apiRequest<FunnelDimensions>(
      `/v2/admin/analytics/funnel/dimensions${qs ? `?${qs}` : ""}`,
    );
  },

  queryFunnel(request: FunnelQueryRequest) {
    return apiRequest<FunnelQueryResponse>("/v2/admin/analytics/funnel/query", {
      method: "POST",
      body: JSON.stringify(request),
    });
  },

  // Live Event Discovery — the live feed of events/UI-actions the debug app emits.
  /** Devices on debug builds seen recently — the list a test round is picked from. */
  getDebugDevices(withinMinutes = 720, limit = 50) {
    return apiRequest<DebugDevice[]>(
      `/v2/admin/analytics/debug-devices?withinMinutes=${withinMinutes}&limit=${limit}`,
    );
  },

  /**
   * Accept an event as correct, recording the shape it had — or withdraw that.
   *
   * The baseline is sent from the page because only the page has both halves: the firing count comes
   * from the discovery feed and the parameter keys from the live stream.
   */
  setEventTested(eventName: string, tested: boolean, baseline?: { firings?: number; paramKeys?: string[]; screen?: string }) {
    return apiRequest<unknown>(
      `/v2/admin/analytics/event-config/${encodeURIComponent(eventName)}/tested?tested=${tested}`,
      { method: "POST", body: JSON.stringify(baseline ?? {}) },
    );
  },

  /**
   * The rename has shipped — move this row to the identity the code now uses.
   *
   * Renaming an event in the app creates a NEW identity, and the config table is keyed by event
   * name, so without this everything recorded against the old one is orphaned.
   *
   * No longer reachable from the page, and deliberately kept. Renaming identities one row at a time
   * was the wrong shape: a person typed the new name, and then had to remember to press a second
   * button after the release actually shipped it — 550 chances to forget, each one silently losing a
   * row's name, layer and tested mark. The operation belongs in a bulk migration that rewrites the
   * ids in code and calls this for every key in the same run, with `to` passed explicitly.
   */
  applyEventRename(eventName: string, to?: string) {
    const q = to ? `?to=${encodeURIComponent(to)}` : "";
    return apiRequest<unknown>(
      `/v2/admin/analytics/event-config/${encodeURIComponent(eventName)}/rename-applied${q}`,
      { method: "POST" },
    );
  },

  getEventDiscovery(debugOnly = true, showIgnored = false, userId?: string, appVersionCode?: number) {
    const params = new URLSearchParams({ debugOnly: String(debugOnly), showIgnored: String(showIgnored) });
    // Same narrowing as the stream these counts are compared against — counted over every version
    // they disagreed with it, and the disagreement read as a bug in whichever was trusted less.
    if (appVersionCode != null) params.set("appVersionCode", String(appVersionCode));
    // Scoping to a user is what makes the firing count comparable to that user's live stream.
    // Unscoped it counts the whole install base, which for a presence ping is tens of thousands.
    if (userId) params.set("userId", userId);
    return apiRequest<EventDiscoveryItem[]>(`/v2/admin/analytics/event-discovery?${params.toString()}`);
  },

  // The full bundled default allowlist the app should ship (every tracked event).
  getDefaultList() {
    return apiRequest<DefaultListTask[]>("/v2/admin/analytics/default-list");
  },

  // Reset the default list: untrack all events so a fresh list can be built.
  resetDefaultList() {
    return apiRequest<number>("/v2/admin/analytics/default-list/reset", { method: "POST" });
  },

  // Remove a planned event. The server refuses this for events that have actually fired — those
  // are evidence, and hiding them is what Ignore is for.
  deletePlannedEvent(eventName: string) {
    return apiRequest<string>(
      `/v2/admin/analytics/event-config/${encodeURIComponent(eventName)}`,
      { method: "DELETE" },
    );
  },

  // Ask the app to stop emitting this event. Queues a source change for a developer — unlike
  // ignoreEvent, which only hides the row and leaves the app sending it forever.
  suppressEvent(eventName: string, suppress: boolean) {
    return apiRequest<DefaultListTask>(
      `/v2/admin/analytics/event-config/${encodeURIComponent(eventName)}/suppress?suppress=${suppress}`,
      { method: "POST" },
    );
  },

  // Ignore ("never show again") an event, or restore it.
  ignoreEvent(eventName: string, ignored: boolean) {
    return apiRequest<DefaultListTask>(
      `/v2/admin/analytics/event-config/${encodeURIComponent(eventName)}/ignore?ignored=${ignored}`,
      { method: "POST" },
    );
  },

  // Save a Track toggle: adds to the backend override allowlist + maps a name + queues a
  // "bake into the app's bundled default list" task for a developer.
  saveEventConfig(body: EventConfigUpsert) {
    return apiRequest<DefaultListTask>("/v2/admin/analytics/event-config", {
      method: "PUT",
      body: JSON.stringify(body),
    });
  },
};

export type DefaultListStatus = "NONE" | "PENDING" | "APPLIED";

/**
 * One device sending debug builds. Version is deliberately absent: a debug build of 1.4.0 reports
 * the same `1.4.0` every real user reports, so it would distinguish nothing.
 */
export interface DebugDevice {
  userId: string;
  invotickId: string | null;
  email: string | null;
  lastEventAt: string;
  recentEventCount: number;
}

export interface EventDiscoveryItem {
  eventName: string;
  /**
   * Client-side only: this row is showing what was just saved, and the discovery feed has not
   * returned that value yet. The server never sends it.
   *
   * It exists because a disagreement between the write and the read used to be invisible. The
   * editor read straight from the 4-second poll, so a saved value was replaced by whatever
   * discovery returned — and when discovery returned nothing, the field simply went blank, which
   * reads as "the save did nothing" rather than "the read is not finding what the write stored".
   */
  unconfirmed?: boolean;
  screenName: string | null;
  lastSeen: string | null;
  tracked: boolean;
  /**
   * Somebody deliberately switched this event off, so release builds no longer send it.
   *
   * Not the inverse of `tracked`: most rows are neither, which means sending. A row is created the
   * first time anyone touches an event, and `tracked` is false on a fresh one — so reading the
   * inverse would mean that naming an event switches it off.
   */
  denied: boolean;
  ignored: boolean;
  inList: boolean;
  /**
   * True for the auto-captured tap firehose, false for a deliberately-coded event.
   *
   * Decides which lever the row may offer. An auto tap is gated by the send-allowlist, so it reaches
   * production only if somebody adds it — there is nothing to remove from source. A coded event
   * bypasses the allowlist and always sends, so deleting the call is the only thing that stops it.
   */
  autoCaptured?: boolean;
  /**
   * Times this event fired, as opposed to the one row it occupies here.
   *
   * This page groups by identity; the live stream has a row per firing. Comparing the two meant
   * subtracting one list from the other by eye and guessing which rows had been folded together.
   */
  firings?: number;
  /** When this event was accepted as correct. Null means never tested. */
  testedAt?: string | null;
  /**
   * What it looked like then. Compared against the current run so "tested" can mean "and still
   * behaving" rather than "and no longer being looked at".
   */
  baseline?: { firings?: number; paramKeys?: string[]; screen?: string } | null;
  displayName: string | null;
  replaceName: string | null;
  /**
   * No longer edited anywhere. The column and the API field stay — dropping a column is not
   * reversible under Flyway, and nothing is served by removing storage that costs nothing — but the
   * page stopped offering it: nothing in the product ever read a description back, while the
   * display name travels to Live Events and is what every other page shows.
   */
  description?: string | null;
  defaultListStatus: DefaultListStatus;
  /** Authored here; the app has never emitted it. Cleared by the server once it fires. */
  planned: boolean;
  /** "action" | "screen" — stated by the author on a planned row. */
  identityType: string | null;
  /** Which layer caused it. Null = nobody has categorised it yet. */
  layer: string | null;
  /** NONE / PENDING / APPLIED — whether the app should stop emitting this at all. */
  suppressStatus: "NONE" | "PENDING" | "APPLIED";
  /** Marked removed in code and still arriving: the removal did not work. */
  stillFiringAfterRemoval: boolean;
}

export interface EventConfigUpsert {
  eventName: string;
  tracked: boolean;
  /** Null leaves it unchanged, so editing a name cannot switch an event on or off by accident. */
  denied?: boolean | null;
  displayName: string | null;
  /**
   * The identity a future release should send instead. No longer edited on the page — see
   * `applyEventRename` for why renaming belongs in a bulk migration rather than a per-row field.
   */
  replaceName?: string | null;
  /**
   * No longer edited anywhere. The column and the field stay — dropping a column is not reversible
   * under Flyway, and storage that costs nothing is not worth a migration — but the page stopped
   * offering it: nothing in the product ever read a description back, while the display name
   * travels to Live Events and is what every other page shows.
   */
  description?: string | null;
  screenName?: string | null;
  planned?: boolean;
  identityType?: string | null;
  layer?: string | null;
}

export interface DefaultListTask {
  eventName: string;
  displayName: string | null;
  replaceName: string | null;
  description: string | null;
  screenName: string | null;
  status: DefaultListStatus;
  updatedAt: string;
}
