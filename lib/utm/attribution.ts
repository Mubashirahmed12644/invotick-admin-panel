import { apiRequest } from "@/lib/api";

/**
 * Click → install → first invoice for every campaign link, from the backend.
 *
 * ## Read this before adding a number to the Reporting tab
 *
 * There are **two denominators on this page and they are not interchangeable.**
 *
 *  - **Clicks** belong to a link. `short_link.clickCount` is a running total kept by the redirect,
 *    all time, not windowed.
 *  - **Installs** belong to a *tag* — the `utm_source` / `utm_medium` / `utm_campaign` triple that
 *    the link hands to Play and that the Play Install Referrer API hands back to the app. The short
 *    code never travels with it, so nothing in an install says which link was clicked. Seven of the
 *    eleven links in the registry carry a byte-identical triple; adding their install counts up
 *    would report one install seven times.
 *
 * Which is why every breakdown here is computed on the server, over distinct tags, and arrives
 * ready to render. Do not re-derive an install total by summing `links[]` in this file.
 *
 * ## `0` is a number, not a gap
 *
 * Most links will show `0` installs and that is the finding, not a failure to measure: nobody
 * installed from them. Render the zero. A blank or an em dash puts the page back to claiming
 * something it cannot see, which is what this endpoint was built to end. `null` is the one other
 * case — a link with no Android destination, which never had an install path — and it is the only
 * thing allowed to print as not-applicable.
 */
export type UtmAttributionReport = {
  /** Start of the install window, inclusive, ISO-8601. */
  windowFrom: string;
  /** End of the install window, exclusive. */
  windowTo: string;
  buildType: string | null;
  totals: UtmTotals;
  links: UtmLinkRow[];
  bySource: UtmBreakdownRow[];
  byMedium: UtmBreakdownRow[];
  byCampaign: UtmBreakdownRow[];
  /** Installs matching no link of ours — Facebook's own referrer, Play organic, `(not set)`. */
  untagged: UtmTagRow[];
  /** The tag aggregation hit its row cap; the tail was dropped rather than shown. */
  truncated: boolean;
};

export type UtmTotals = {
  links: number;
  clicks: number;
  /** Devices that installed in the window carrying a tag one of our links declares. */
  installs: number;
  madeInvoice: number;
  /** The G1 half — a confirmed share (decision 0006). */
  sharedInvoice: number;
  /** Every install in the window, ours and not, so the tagged share is readable. */
  installsAllSources: number;
};

export type UtmLinkRow = {
  code: string;
  shortUrl: string;
  label: string | null;
  campaign: string | null;
  clicks: number;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  /** `null` only when the link has no Android URL, so no install could ever be attributed to it. */
  installs: number | null;
  madeInvoice: number | null;
  sharedInvoice: number | null;
  /** Other link codes carrying the identical tag. Non-empty means the count above is the tag's, not this link's. */
  ambiguousWith: string[];
};

export type UtmBreakdownRow = {
  value: string;
  /** Summed over links. */
  clicks: number;
  /** Summed over distinct tags, so a tag shared by seven links is counted once. */
  installs: number;
  madeInvoice: number;
  sharedInvoice: number;
  /** How many registry links carry this value. */
  links: number;
};

export type UtmTagRow = {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  installs: number;
  madeInvoice: number;
  sharedInvoice: number;
};

/** GET /v1/webpanel/analytics/utm-attribution — installs beside the clicks, over one window. */
export function getUtmAttribution(opts: { from?: string; to?: string; withinMinutes?: number; buildType?: string } = {}) {
  const params = new URLSearchParams();
  if (opts.from) params.set("from", opts.from);
  if (opts.to) params.set("to", opts.to);
  if (opts.withinMinutes != null) params.set("withinMinutes", String(opts.withinMinutes));
  if (opts.buildType && opts.buildType !== "all") params.set("buildType", opts.buildType);
  const qs = params.toString();
  return apiRequest<UtmAttributionReport>(`/v1/webpanel/analytics/utm-attribution${qs ? `?${qs}` : ""}`);
}
