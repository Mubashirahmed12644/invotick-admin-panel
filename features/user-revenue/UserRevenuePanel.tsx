"use client";

import { useEffect, useState } from "react";
import { api, getErrorMessage } from "@/lib/api";
import type { RevenueDetail, RevenueMoney } from "@/lib/types";
import { BANNER_NOTE, countedThrough, usd } from "./format";

const ROWS: Array<{ key: keyof RevenueMoney; label: string; title?: string }> = [
  { key: "appOpenMicros", label: "App-open ads" },
  { key: "interstitialMicros", label: "Interstitial ads" },
  { key: "bannerMicros", label: "Banner ads", title: BANNER_NOTE },
  { key: "otherMicros", label: "Other ads" },
  { key: "adMicros", label: "All ads" },
  { key: "premiumMicros", label: "Premium (net of tax and store fee)" },
  { key: "totalMicros", label: "Total" },
];

/**
 * What this account has earned us, lifetime and in the last 30 days, by ad type and premium (decision 0182).
 * Every figure is the backend's, in USD; a guest's money is shown under the account it joined, and the
 * split by who earned it is listed underneath.
 */
export function UserRevenuePanel({ userId }: { userId: string }) {
  // Keyed by the account it answers for, so a new account reads as loading without resetting state in the effect.
  const [answer, setAnswer] = useState<{ userId: string; detail: RevenueDetail | null; error: string } | null>(null);
  const loading = answer?.userId !== userId;
  const detail = loading ? null : answer?.detail ?? null;
  const error = loading ? "" : answer?.error ?? "";

  useEffect(() => {
    let cancelled = false;
    api.getRevenueDetail(userId)
      .then((found) => {
        if (!cancelled) setAnswer({ userId, detail: found, error: "" });
      })
      .catch((loadError) => {
        if (!cancelled) setAnswer({ userId, detail: null, error: getErrorMessage(loadError, "Could not load revenue.") });
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const through = countedThrough(detail?.asOf);

  return (
    <section className="section-card user-revenue-panel">
      <div className="section-header">
        <h2>Revenue (USD)</h2>
        <span className="results-meta">
          Ads + premium net of tax and store fee{through ? ` · counted through ${through}` : ""}
        </span>
      </div>
      {loading ? <p className="results-meta">Loading revenue…</p> : null}
      {!loading && error ? <p className="users-toolbar-error">{error}</p> : null}
      {!loading && !error && detail ? (
        <>
          <table className="user-revenue-table">
            <thead>
              <tr>
                <th />
                <th>Lifetime</th>
                <th>Last 30 days</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.key} className={row.key === "totalMicros" || row.key === "adMicros" ? "user-revenue-strong" : ""}>
                  <td title={row.title}>{row.label}{row.title ? " *" : ""}</td>
                  <td>{usd(detail.lifetime[row.key])}</td>
                  <td>{usd(detail.last30Days[row.key])}</td>
                </tr>
              ))}
              <tr>
                <td>Ad impressions</td>
                <td>{detail.lifetime.adImpressions.toLocaleString()}</td>
                <td>{detail.last30Days.adImpressions.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
          <p className="results-meta">* {BANNER_NOTE}</p>

          {detail.earners.length > 1 || detail.fromGuestsMicros > 0 ? (
            <div className="user-revenue-sub">
              <p className="range-title">
                Who earned it — {usd(detail.fromGuestsMicros)} of the lifetime total was earned as a guest before joining
              </p>
              <ul className="user-revenue-list">
                {detail.earners.map((earner) => (
                  <li key={earner.earnedAsUserId}>
                    <code>{earner.earnedAsUserId.slice(0, 8)}</code> ({earner.kind}): {usd(earner.lifetime.totalMicros)} lifetime,{" "}
                    {usd(earner.last30Days.totalMicros)} in 30 days
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {detail.charges.length > 0 ? (
            <div className="user-revenue-sub">
              <p className="range-title">Store orders behind premium</p>
              <ul className="user-revenue-list">
                {detail.charges.map((charge) => (
                  <li key={charge.orderId} title={`net: ${charge.netSource ?? "unknown"} · rate date ${charge.rateDate ?? "-"}`}>
                    {charge.chargedAt ? new Date(charge.chargedAt).toLocaleDateString("en-GB") : "-"} · {charge.productId ?? "?"} ·{" "}
                    {charge.counted ? usd(charge.usdNetMicros) : "not counted"}
                    {charge.refundedAt ? " · refunded" : ""}
                    {charge.testPurchase ? " · test purchase" : ""}
                    {charge.waitingForStore ? " · waiting for the store" : ""}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
