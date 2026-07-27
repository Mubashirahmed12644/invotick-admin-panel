"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import LoadingState from "@/components/LoadingState";
import ErrorState from "@/components/ErrorState";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import type { ExchangeRatesHealth as Health } from "@/lib/types";

/**
 * The rates service in detail — the drill-down behind the Health Centre's "Exchange rates" check.
 *
 * It reported every one of these facts on its own healthcheck for sixteen days in July 2026 while
 * the rates sat frozen: stale, keys it believed exhausted, a fetch failing hourly. Nothing looked
 * broken from outside, because the endpoint answered 200 with a full set of 172 currencies
 * throughout. So this is less a dashboard than somewhere for that to be visible.
 */
export default function ExchangeRatesPage() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setHealth(await api.getExchangeRatesHealth());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // How much slack the schedule leaves. This one number is the whole story of the July failure:
  // three keys at 100 a month is 300, and fetching hourly needs 744.
  const spare =
    health?.monthlyDemand != null ? health.monthlyCapacity - health.monthlyDemand : null;

  return (
    <main className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Navbar title="Exchange Rates" />
        <section className="content-wrap">
          {loading && <LoadingState />}
          {!loading && error && <ErrorState message={error} onRetry={() => void load()} />}

          {!loading && !error && health && (
            <>
              <div className="hc-top">
                <div className="hc-verdict">
                  <span className={`hc-dot hc-dot-${health.issues.length === 0 ? "ok" : "bad"}`} />
                  <div>
                    <h2 className="hc-verdict-title">
                      {health.provider ?? "Rates provider"}
                    </h2>
                    <p className="hc-verdict-note">
                      Every converted figure in the product comes from here
                    </p>
                  </div>
                </div>
                <div className="hc-actions">
                  <button type="button" className="btn btn-outline" onClick={() => void load()}>
                    Refresh
                  </button>
                  <Link className="btn btn-outline" href="/health">
                    Back to Health Centre
                  </Link>
                </div>
              </div>

              {health.issues.length > 0 && (
                <div className="xr-issues">
                  {health.issues.map((issue, i) => (
                    <div key={i} className={`xr-issue xr-issue-${issue.severity}`}>
                      <strong>{issue.title}</strong>
                      <span>{issue.detail}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="xr-cards">
                <Card
                  label="Rates last fetched"
                  value={health.lastFetchAt ? formatDateTime(health.lastFetchAt) : "never"}
                  note={
                    health.rateAgeDays == null
                      ? undefined
                      : health.rateAgeDays === 0
                        ? "today"
                        : `${health.rateAgeDays} day${health.rateAgeDays === 1 ? "" : "s"} old`
                  }
                  bad={health.stale}
                />
                <Card
                  label="Schedule"
                  value={health.frequency ?? "—"}
                  note={`${health.monthlyDemand ?? "?"} requests/month`}
                />
                <Card
                  label="Quota this month"
                  value={`${health.monthlyUsed ?? 0} / ${health.monthlyCapacity}`}
                  note={
                    spare == null
                      ? undefined
                      : spare >= 0
                        ? `${spare} spare after the schedule`
                        : `${Math.abs(spare)} short of what the schedule needs`
                  }
                  bad={spare != null && spare < 0}
                />
                <Card
                  label="Currencies"
                  value={health.currencies?.toString() ?? "—"}
                  note="172 is the usual number"
                />
                <Card
                  label="Quota resets"
                  value={health.quotaResetsAt ? formatDateTime(health.quotaResetsAt) : "—"}
                  note="provider windows are calendar months"
                />
                <Card
                  label="Keys run out"
                  value={
                    health.projectedExhaustionAt
                      ? formatDateTime(health.projectedExhaustionAt)
                      : "not before the reset"
                  }
                  note="at the current schedule"
                  bad={!!health.projectedExhaustionAt}
                />
              </div>

              {health.lastError && (
                <article className="section-card">
                  <h2>Last refusal from the provider</h2>
                  <p className="xr-error-text">{health.lastError}</p>
                  {/* Said explicitly because a stale error reads as a live one, and this field kept
                      saying "All API keys exhausted" for hours after the quota was fixed. */}
                  <p className="xr-muted">
                    {health.lastErrorAt ? formatDateTime(health.lastErrorAt) : "—"} · the most recent
                    failure, not necessarily a current one
                  </p>
                </article>
              )}

              <article className="section-card">
                <h2>API keys</h2>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Provider</th>
                        <th>Status</th>
                        <th>Used</th>
                        <th>Quota</th>
                        <th>%</th>
                        <th>Last used</th>
                      </tr>
                    </thead>
                    <tbody>
                      {health.keys.map((k) => (
                        <tr
                          key={k.id ?? k.provider}
                          className={(k.usagePercent ?? 0) >= 80 ? "xr-row-warn" : undefined}
                        >
                          <td>{k.id}</td>
                          <td>{k.provider}</td>
                          <td>{k.status}</td>
                          <td>{k.requestCount}</td>
                          <td>{k.monthlyQuota}</td>
                          <td>{k.usagePercent}%</td>
                          <td>{k.lastUsedAt ? formatDateTime(k.lastUsedAt) : "—"}</td>
                        </tr>
                      ))}
                      {health.keys.length === 0 && (
                        <tr>
                          <td colSpan={7}>No keys — nothing can be fetched.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <p className="xr-muted">
                  Set a key&apos;s quota to the provider&apos;s real monthly limit. These were entered
                  as 100 each against a real limit of 1,000, so the service stopped itself at a tenth
                  of what it had and called it exhausted.
                </p>
              </article>

              {Object.keys(health.sampleRates).length > 0 && (
                <article className="section-card">
                  <h2>Spot check</h2>
                  <div className="xr-rates">
                    {Object.entries(health.sampleRates).map(([code, rate]) => (
                      <span key={code} className="xr-rate">
                        <span className="xr-rate-code">1 USD =</span> <strong>{rate}</strong> {code}
                      </span>
                    ))}
                  </div>
                  <p className="xr-muted">
                    If one of these looks wrong, the rates are wrong — check before trusting a total.
                  </p>
                </article>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}

function Card({
  label,
  value,
  note,
  bad,
}: {
  label: string;
  value: string;
  note?: string;
  bad?: boolean;
}) {
  return (
    <div className={`xr-card${bad ? " xr-card-bad" : ""}`}>
      <span className="xr-card-label">{label}</span>
      <span className="xr-card-value">{value}</span>
      {note && <span className="xr-card-note">{note}</span>}
    </div>
  );
}
