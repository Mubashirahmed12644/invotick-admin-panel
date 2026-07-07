import { apiRequest } from "@/lib/api";

/** Mirrors the backend ShortLinkResponse (dev.backend.infotick.dto.shortlink). */
export type ShortLinkResponse = {
  code: string;
  shortUrl: string;
  webUrl: string;
  androidUrl: string | null;
  iosUrl: string | null;
  label: string | null;
  campaign: string | null;
  clickCount: number;
  active: boolean;
  createdAt: string;
};

export type CreateShortLinkPayload = {
  webUrl: string;
  androidUrl?: string;
  iosUrl?: string;
  label?: string;
  campaign?: string;
  code?: string;
};

/** POST /v1/webpanel/links — mint a short code for the built links. */
export function createShortLink(payload: CreateShortLinkPayload) {
  return apiRequest<ShortLinkResponse>("/v1/webpanel/links", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** GET /v1/webpanel/links — registry (newest first) with click counts. */
export function listShortLinks() {
  return apiRequest<ShortLinkResponse[]>("/v1/webpanel/links");
}
