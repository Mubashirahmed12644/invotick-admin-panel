/**
 * The store-published releases — the ONLY builds the funnel dropdowns should offer.
 *
 * Why this list exists
 * --------------------
 * `analytics_events` carries a row for every build that ever reported: internal test tracks,
 * debug builds on our own phones, staged rollouts that were pulled, and the real Play/App-Store
 * releases — all mixed together. The version pickers on Funnel Analysis ("Pehli invoice ka safar"
 * and the step-by-step funnel) used to list every one of them. An internal build (e.g. 1.4.9
 * builds 108-112) is not a version any real user is on, so a funnel read off it describes our own
 * testing, not the product.
 *
 * How it filters
 * --------------
 * A version code that is NOT in this list is hidden from the dropdown, and the default lands on the
 * newest PUBLISHED code — never an internal build. This is a maintained allowlist, on purpose: it
 * changes only when a release actually goes live on a store, and that is the owner's call. We do NOT
 * decide "published" from a per-event installer field — a debug build side-loaded from Play would
 * pass that test, and a real release shared for review would fail it.
 *
 * How to edit it (once per release)
 * ---------------------------------
 * When a build goes LIVE on a public store, add one line to `PUBLISHED_RELEASES` below with its
 * platform, its version name and its version code. That is the whole change — nothing else to touch.
 * Remove a line only if a release was pulled and should never be counted again.
 *
 * Version codes are unique per platform. Android currently uses 91+, iOS uses build numbers (<=26),
 * so they do not collide today; the platform is kept on each row for clarity and future safety.
 */

export interface PublishedRelease {
  platform: "Android" | "iOS";
  /** The store version name, e.g. "1.4.5". Shown to the reader. */
  versionName: string;
  /** Android versionCode / iOS build number — what the funnel query actually filters on. */
  versionCode: number;
}

/**
 * SEED LIST — confirm with the owner before this goes live.
 *
 * Only the two codes the project memory is confident about are enabled below. Every other candidate
 * that appears in `analytics_events` is listed as a commented line with its release-build event
 * volume (measured 2026-09-23, 90-day window) so the owner can tick the ones that were really
 * published to a store. DO NOT enable a line on a guess — an internal build wrongly marked published
 * pulls test traffic back into the funnel; a real release wrongly left out hides most current users.
 */
export const PUBLISHED_RELEASES: PublishedRelease[] = [
  // ── Android · Google Play production (CONFIDENT) ────────────────────────────
  { platform: "Android", versionName: "1.4.5", versionCode: 101 }, // live 100% Pakistan since 2026-09-11
  { platform: "Android", versionName: "1.4.4", versionCode: 97 },  // live for everyone else

  // ── Android · CONFIRM: these have large release-build volumes and LOOK published ──
  // Leaving them out will hide most recent Android traffic from the funnel. Enable the ones
  // that actually reached Play production.
  // { platform: "Android", versionName: "1.4.7", versionCode: 106 }, // 207,438 release events, last 2026-09-23  <-- looks like a full production release
  // { platform: "Android", versionName: "1.4.6", versionCode: 105 }, //  65,285 release events, last 2026-09-23
  // { platform: "Android", versionName: "1.4.8", versionCode: 107 }, //   2,875 release events
  // { platform: "Android", versionName: "1.4.9", versionCode: 112 }, //     916 release events (staged?)

  // ── Android · CONFIRM: historical names, exact published code UNCERTAIN ──
  // { platform: "Android", versionName: "1.4.2", versionCode: 94 }, // 300,424 release events  <-- almost certainly the published 1.4.2
  // { platform: "Android", versionName: "1.4.1", versionCode: 92 }, //  48,053 release events  <-- almost certainly the published 1.4.1
  // { platform: "Android", versionName: "1.4.1", versionCode: 91 }, //   1,097 release events (earlier code, same name)
  // { platform: "Android", versionName: "1.4.2", versionCode: 93 }, //   1,518 release events (earlier code, same name)
  // { platform: "Android", versionName: "1.4.3", versionCode: 95 }, //     875 release events (staged/limited?)
  // { platform: "Android", versionName: "1.4.3", versionCode: 96 }, //   1,263 release events (staged/limited?)

  // ── iOS · App Store ──
  // 1.0.1 is meant to be the first App Store version, but only DEBUG rows exist so far
  // (build 25: 1,107 debug; build 26: 227 debug) — no release rows yet, so the store listing
  // does not look live. Enable the correct build once it is actually on the App Store.
  // { platform: "iOS", versionName: "1.0.1", versionCode: 25 },
  // { platform: "iOS", versionName: "1.0.1", versionCode: 26 },
];

/** Fast membership set of published version codes — what the dropdown filter checks against. */
export const PUBLISHED_VERSION_CODES: ReadonlySet<number> = new Set(
  PUBLISHED_RELEASES.map((r) => r.versionCode),
);

/** True when this version code is a store-published release. Null/undefined is never published. */
export function isPublishedVersion(code?: number | null): boolean {
  return code != null && PUBLISHED_VERSION_CODES.has(code);
}
