// ─────────────────────────────────────────────────────────────────────────────
// Invotick UTM Taxonomy — the single source of truth for campaign tagging.
//
// RULE: every marketing link is built from THESE values (via the Link Builder),
// never hand-typed. Values are lowercase snake_case so reporting never splits
// on "FB" vs "facebook" vs "fb".
// ─────────────────────────────────────────────────────────────────────────────

export type Option = { value: string; label: string; hint?: string };

/** Where the traffic comes from. */
export const UTM_SOURCES: Option[] = [
  { value: "google_ads", label: "Google Ads", hint: "Paid app-install / search campaigns" },
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "youtube", label: "YouTube" },
  { value: "twitter", label: "X / Twitter" },
  { value: "blog", label: "Blog / Content", hint: "Articles, SEO content" },
  { value: "invoice_share", label: "Invoice Share", hint: "Viral — a user shared an invoice" },
  { value: "invoice_pdf", label: "Invoice PDF", hint: "QR / link inside a generated PDF" },
  { value: "email", label: "Email" },
];

/** How the traffic arrives (marketing medium). */
export const UTM_MEDIUMS: Option[] = [
  { value: "cpc", label: "CPC (paid search)" },
  { value: "paid_social", label: "Paid Social" },
  { value: "social", label: "Organic Social" },
  { value: "referral", label: "Referral (viral)", hint: "Invoice share / user-to-user" },
  { value: "qr", label: "QR Code" },
  { value: "content", label: "Content / Blog" },
  { value: "email", label: "Email" },
];

/**
 * Campaigns are free-form but should follow: <theme>_<yyyy>q<n>, e.g.
 * android_installs_2026q3. A few canonical ones are pre-listed; the builder
 * still allows a custom (validated) value.
 */
export const UTM_CAMPAIGNS: Option[] = [
  { value: "android_installs_2026q3", label: "Android Installs — 2026 Q3" },
  { value: "viral_invoice_share", label: "Viral — Invoice Share" },
  { value: "pdf_distribution", label: "PDF Distribution (QR)" },
  { value: "evergreen_blog", label: "Evergreen Blog" },
  { value: "summer_promo_2026", label: "Summer Promo 2026" },
];

// Invotick-specific params (viral loop + deferred deep-linking). Not standard UTM.
export const CUSTOM_PARAM_KEYS = {
  /** Id of the user who shared the link (referral credit + rewards). */
  refUser: "iv_ref_uid",
  /** Shared invoice/estimate id → deferred deep-link on first open. */
  doc: "iv_doc",
  /** Business id context. */
  business: "iv_biz",
} as const;

// Fixed platform + domain constants used by the Link Builder.
export const TARGETS = {
  androidPackage: "invotick.invoicemaker",
  webBaseUrl: "https://invotick.com",
  playBaseUrl: "https://play.google.com/store/apps/details",
  appStoreUrl: "https://apps.apple.com/app/invotick", // TODO: real App Store id when iOS ships
  shortLinkBase: "https://go.invotick.com/r", // smart, device-aware redirector (Nginx→backend /r/{code})
} as const;

/** snake_case + no spaces validator for campaign values. */
export function isValidTaxonomyValue(v: string): boolean {
  return /^[a-z0-9]+(?:_[a-z0-9]+)*$/.test(v);
}
