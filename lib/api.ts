import { getAccessToken } from "@/lib/auth";
import type {
  ExchangeRatesHealth,
  HealthCentreOverview,
  AdminLoginResponse,
  AdminVerifyOtpRequest,
  ActiveUser,
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
  FunnelQueryRequest,
  FunnelQueryResponse,
} from "@/lib/types";
import type {
  IpStatsResponse,
  IpRecordResponse,
  SuspiciousIpFullResponse,
} from "@/features/ip-stats/types";

// In the browser, call same-origin "/backend" (proxied to the backend by the
// next.config rewrite) so the panel works even where the backend origin isn't
// directly reachable. Server-side keeps calling the backend origin directly.
const API_BASE_URL =
  typeof window !== "undefined"
    ? "/backend"
    : (process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "");
const IS_NGROK_BASE_URL = /https?:\/\/[^/]*ngrok[^/]*/i.test(API_BASE_URL);

export class ApiError extends Error {
  status: number;
  data: unknown;
  isNetworkError: boolean;

  constructor(
    message: string,
    options?: { status?: number; data?: unknown; isNetworkError?: boolean },
  ) {
    super(message);
    this.name = "ApiError";
    this.status = options?.status ?? 500;
    this.data = options?.data ?? null;
    this.isNetworkError = options?.isNetworkError ?? false;
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

  try {
    return await fetch(buildUrl(path), {
      ...options,
      headers,
    });
  } catch (error) {
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

export function isUnauthorizedError(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 401 || error.status === 403);
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

  getActiveUsers(withinMinutes = 30, limit = 200) {
    const params = new URLSearchParams({
      withinMinutes: String(withinMinutes),
      limit: String(limit),
    });
    return apiRequest<ActiveUser[]>(`/v1/webpanel/analytics/active-users?${params.toString()}`);
  },

  getLiveEvents(userId: string, since?: string, limit = 100) {
    const params = new URLSearchParams({ userId, limit: String(limit) });
    if (since) params.set("since", since);
    return apiRequest<LiveEvent[]>(`/v1/webpanel/analytics/live-events?${params.toString()}`);
  },

  // PERMANENTLY deletes a user's stream events (they won't reappear). Returns the deleted count.
  clearLiveEvents(userId: string) {
    return apiRequest<number>(
      `/v1/webpanel/analytics/live-events?userId=${encodeURIComponent(userId)}`,
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

  getEventDiscovery(debugOnly = true, showIgnored = false, userId?: string) {
    const params = new URLSearchParams({ debugOnly: String(debugOnly), showIgnored: String(showIgnored) });
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
  screenName: string | null;
  lastSeen: string | null;
  tracked: boolean;
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
  displayName: string | null;
  replaceName: string | null;
  description: string | null;
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
  displayName: string | null;
  replaceName: string | null;
  description: string | null;
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
