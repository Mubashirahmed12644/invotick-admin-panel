import type { RevenueMoney, RevenueState } from "@/lib/types";

/**
 * What each user has earned us (decision 0182). The backend keeps every amount in USD micros and does all
 * the arithmetic; the panel only divides by a million to print it.
 */
export function usd(micros: number | null | undefined): string {
  if (micros === null || micros === undefined || Number.isNaN(micros)) return "-";
  const dollars = micros / 1_000_000;
  // Ad revenue per user is often a few cents, so small amounts keep their cents and a little more.
  const digits = Math.abs(dollars) > 0 && Math.abs(dollars) < 1 ? 3 : 2;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: digits,
  }).format(dollars);
}

/** Banner revenue is reported only from app 1.4.9 (checked 2026-09-29), so it is under-counted until then. */
export const BANNER_NOTE =
  "Banner revenue is reported only from app 1.4.9 (on a 20% rollout), so banner is under-counted until it reaches everyone. App-open and interstitial matched AdMob at 97% (checked 2026-09-29).";

/** The one-line breakdown behind a revenue figure: ads by type, then premium. */
export function revenueBreakdown(money: RevenueMoney, fromGuestsMicros?: number): string {
  const lines = [
    `Ads ${usd(money.adMicros)} (${money.adImpressions.toLocaleString()} impressions)`,
    `  app-open ${usd(money.appOpenMicros)} · interstitial ${usd(money.interstitialMicros)} · banner ${usd(money.bannerMicros)}` +
      (money.otherMicros ? ` · other ${usd(money.otherMicros)}` : ""),
    `Premium, net of tax and store fee ${usd(money.premiumMicros)}`,
  ];
  if (fromGuestsMicros) lines.push(`Of the total, earned as a guest before joining this account: ${usd(fromGuestsMicros)}`);
  lines.push("", BANNER_NOTE);
  return lines.join("\n");
}

/** The revenue job's "counted through" time, in the reader's own clock. The backend sends UTC without a zone. */
export function countedThrough(state: RevenueState | null | undefined): string | null {
  const raw = state?.adsThrough;
  if (!raw) return null;
  const at = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(raw) ? raw : `${raw}Z`);
  if (Number.isNaN(at.getTime())) return null;
  return at.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}
