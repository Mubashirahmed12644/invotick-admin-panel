/**
 * The store-published releases — the ONLY builds the Funnel Analysis version pickers offer.
 *
 * Why this list exists
 * --------------------
 * `analytics_events` carries a row for every build that ever reported: internal test tracks, debug
 * builds on our own phones, staged rollouts that were pulled, and the real Play / App Store
 * releases — all mixed together. The version pickers on Funnel Analysis ("Pehli invoice ka safar"
 * and "Muqabla") used to list every one of them. An internal build (1.4.9, codes 108-112) is not a
 * version any real user is on, so a funnel read off it describes our own testing, not the product.
 *
 * How it filters
 * --------------
 * A version code that is NOT in this list is hidden from every picker on that page, and the journey
 * defaults to the newest PUBLISHED code — never an internal build. The test is "is this versionCode
 * published", full stop: we do NOT decide it from a per-event installer field, because a debug build
 * side-loaded after a Play install would pass that test and a real release handed round for review
 * would fail it.
 *
 * How to edit it (once per release)
 * ---------------------------------
 * When a build goes LIVE on a public store, add one line to `PUBLISHED_RELEASES` below with its
 * platform, its version name and its version code. That is the whole change — nothing else to touch.
 * Remove a line only if a release was pulled and should never be counted again.
 *
 * Version codes are unique per platform. Android uses 90+, iOS uses build numbers (<= 26), so they
 * do not collide today; the platform is kept on each row for clarity and for the day they would.
 */

export interface PublishedRelease {
  platform: "Android" | "iOS";
  /** The store version name, e.g. "1.4.8". Shown to the reader. */
  versionName: string;
  /** Android versionCode / iOS build number — what the funnel query actually filters on. */
  versionCode: number;
}

/**
 * Source of truth confirmed 2026-09-23 via the Play Developer API (play-uploader service account),
 * reading the production and internal tracks — authoritative, not inferred from event volumes.
 *
 *   Play on that date: production = 107 (1.4.8, rollout in progress) and 106 (1.4.7, completed);
 *   internal = 112 (1.4.9). So 1.4.9 / codes 108-112 is INTERNAL and never reached production.
 *
 * DO NOT enable a line on a guess — an internal build wrongly marked published pulls our own test
 * traffic back into the funnel, and a real release wrongly left out hides current users. Confirm
 * against the store track, not against event volume.
 */
export const PUBLISHED_RELEASES: PublishedRelease[] = [
  // ── Android · Google Play production (API-confirmed 2026-09-23) ──────────────
  { platform: "Android", versionName: "1.4.8", versionCode: 107 }, // newest published — the default
  { platform: "Android", versionName: "1.4.7", versionCode: 106 },
  { platform: "Android", versionName: "1.4.6", versionCode: 105 },
  { platform: "Android", versionName: "1.4.5", versionCode: 101 },
  { platform: "Android", versionName: "1.4.4", versionCode: 97 },
  { platform: "Android", versionName: "1.4.2", versionCode: 94 },
  { platform: "Android", versionName: "1.4.1", versionCode: 92 },

  // ── Excluded on purpose (do NOT add one without a store-track confirmation) ──
  // 108-112         → 1.4.9, INTERNAL track only (API-confirmed) — never production.
  // 100/96/95/93/91 → pre-release duplicate codes of the same version names; never went wide.
  // 90              → 1.4.0, below the analytics ingestion floor (AGENTS.md 5b).
  // iOS (all)       → App Store presence not confirmed yet. Add iOS lines only once confirmed,
  //                   one line each, the same way.
];

/** Fast membership set of published version codes — what the picker filter checks against. */
export const PUBLISHED_VERSION_CODES: ReadonlySet<number> = new Set(
  PUBLISHED_RELEASES.map((r) => r.versionCode),
);

/** True when this version code is a store-published release. Null/undefined is never published. */
export function isPublishedVersion(code?: number | null): boolean {
  return code != null && PUBLISHED_VERSION_CODES.has(code);
}

/** The newest published version code — where a version picker lands when nothing is chosen. */
export const NEWEST_PUBLISHED_VERSION_CODE: number | null = PUBLISHED_RELEASES.length
  ? Math.max(...PUBLISHED_RELEASES.map((r) => r.versionCode))
  : null;
