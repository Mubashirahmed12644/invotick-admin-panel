import { getAccessToken } from "@/lib/auth";
import type {
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

  // Live Event Config — the curation catalog (kept separate from the live-events stream).
  getEventCatalog() {
    return apiRequest<EventCatalogItem[]>("/v2/admin/analytics/event-catalog");
  },

  saveEventConfig(body: EventConfigUpsert) {
    return apiRequest<EventConfigUpsert>("/v2/admin/analytics/event-config", {
      method: "PUT",
      body: JSON.stringify(body),
    });
  },
};

export interface EventCatalogItem {
  eventName: string;
  count: number;
  lastSeen: string | null;
  kept: boolean;
  displayName: string | null;
  description: string | null;
}

export interface EventConfigUpsert {
  eventName: string;
  kept: boolean;
  displayName: string | null;
  description: string | null;
}
