import { TARGETS, CUSTOM_PARAM_KEYS } from "./taxonomy";

export type UtmInput = {
  source: string;
  medium: string;
  campaign: string;
  content?: string;
  term?: string;
  // Invotick custom (viral / deferred deep-link)
  refUser?: string;
  doc?: string;
  business?: string;
};

export type BuiltLinks = {
  /** Ordered UTM params (also used to show a preview). */
  params: Record<string, string>;
  /** invotick.com landing with the UTM query. */
  webUrl: string;
  /** Play Store deep link carrying the tagged install referrer. */
  playUrl: string;
  /** Raw (decoded) install-referrer string the app will receive. */
  playReferrer: string;
  /** Smart, device-aware short/QR link (resolved by go.invotick.com). */
  shortUrl: (code: string) => string;
};

function orderedParams(input: UtmInput): Record<string, string> {
  const p: Record<string, string> = {};
  if (input.source) p.utm_source = input.source.trim();
  if (input.medium) p.utm_medium = input.medium.trim();
  if (input.campaign) p.utm_campaign = input.campaign.trim();
  if (input.content?.trim()) p.utm_content = input.content.trim();
  if (input.term?.trim()) p.utm_term = input.term.trim();
  if (input.refUser?.trim()) p[CUSTOM_PARAM_KEYS.refUser] = input.refUser.trim();
  if (input.doc?.trim()) p[CUSTOM_PARAM_KEYS.doc] = input.doc.trim();
  if (input.business?.trim()) p[CUSTOM_PARAM_KEYS.business] = input.business.trim();
  return p;
}

function toQuery(p: Record<string, string>): string {
  return Object.entries(p)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join("&");
}

export function buildLinks(input: UtmInput): BuiltLinks {
  const params = orderedParams(input);

  // Web: plain query string on the landing page.
  const webUrl = `${TARGETS.webBaseUrl}/?${toQuery(params)}`;

  // Play: the whole UTM string becomes ONE url-encoded `referrer` value, which
  // the Android Install Referrer API delivers to the app on first install.
  const playReferrer = toQuery(params); // decoded form (what the app parses)
  const playUrl =
    `${TARGETS.playBaseUrl}?id=${TARGETS.androidPackage}` +
    `&referrer=${encodeURIComponent(playReferrer)}`;

  const shortUrl = (code: string) => `${TARGETS.shortLinkBase}/${code}`;

  return { params, webUrl, playUrl, playReferrer, shortUrl };
}
