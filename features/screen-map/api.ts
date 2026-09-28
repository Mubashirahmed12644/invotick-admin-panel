import { apiRequest } from "@/lib/api";
import type { Dimensions, Filters, Holdout, Mode, ScreenMapStatus, ScreenSummary, ScreenView } from "./types";

const BASE = "/v1/webpanel/screen-map";

function query(params: Record<string, string | number | null | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === null || v === undefined || v === "") continue;
    q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}

function filterParams(f: Filters) {
  return {
    days: f.days,
    platform: f.platform,
    versions: f.versions,
    country: f.country,
    source: f.source,
    user: f.user,
  };
}

export const screenMapApi = {
  screens(days: number, platform: string) {
    return apiRequest<ScreenSummary[]>(`${BASE}/screens${query({ days, platform, size: 200 })}`);
  },
  screen(screen: string, mode: Mode, f: Filters, size = 100) {
    return apiRequest<ScreenView>(`${BASE}/screen${query({ screen, mode, ...filterParams(f), page: 0, size })}`);
  },
  dimensions(screen: string, days: number) {
    return apiRequest<Dimensions>(`${BASE}/dimensions${query({ screen, days })}`);
  },
  holdout(f: Filters) {
    const { user: _user, ...rest } = filterParams(f);
    void _user;
    return apiRequest<Holdout>(`${BASE}/holdout${query({ ...rest, days: 30 })}`);
  },
  status() {
    return apiRequest<ScreenMapStatus>(`${BASE}/status`);
  },
};
