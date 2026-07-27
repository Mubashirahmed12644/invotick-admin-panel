"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import type { ExchangeRatesHealth as Health } from "@/lib/types";
import LoadingState from "@/components/LoadingState";
import ErrorState from "@/components/ErrorState";

/**
 * The rates service, on a screen.
 *
 * It reported all of this on its own healthcheck for sixteen days in July 2026 — stale rates, keys
 * it believed were exhausted, a fetch failing every hour — while every converted figure in the
 * product used a fortnight-old number. Nothing was broken enough to notice: the endpoint answered
 * 200 with a full set of 172 currencies the whole time.
 *
 * So this page is not a dashboard so much as a place for that to be seen. The count on the sidebar
 * comes from `issues`.
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

  if (loading && !health) return <LoadingState />;
  if (error && !health) return <ErrorState message={error} onRetry={load} />;
  if (!health) return null;

  const spare =
    health.monthlyDemand != null ? health.monthlyCapacity - health.monthlyDemand : null;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Exchange rates</h1>
          <p className="page-subtitle">
            {health.provider ?? "—"} · every converted figure in the product comes from here
          </p>
        </div>
        <button type="button" className="btn btn-outline" onClick={load}>
          Refresh
        </button>
      </div>

      {/* Issues first. If this list is empty there is genuinely nothing to do here. */}
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
        <Card label="Schedule" value={health.frequency ?? "—"} note={`${health.monthlyDemand ?? "?"} requests/month`} />
        <Card
          label="Quota this month"
          value={`${health.monthlyUsed ?? 0} / ${health.monthlyCapacity}`}
          note={
            spare == null
              ? undefined
              : spare >= 0
                ? `${spare} spare after the schedule`
                : `${Math.abs(spare)} SHORT of what the schedule needs`
          }
          bad={spare != null && spare < 0}
        />
        <Card label="Currencies" value={health.currencies?.toString() ?? "—"} note="172 is the usual number" />
      </div>

      <div className="xr-cards">
        <Card
          label="Quota resets"
          value={health.quotaResetsAt ? formatDateTime(health.quotaResetsAt) : "—"}
          note="provider windows are calendar months"
        />
        <Card
          label="Keys run out"
          value={health.projectedExhaustionAt ? formatDateTime(health.projectedExhaustionAt) : "not before the reset"}
          note="at the current schedule"
          bad={!!health.projectedExhaustionAt}
        />
      </div>

      {health.lastError && (
        <div className="xr-panel">
          <h2>Last refusal from the provider</h2>
          <p className="xr-error-text">{health.lastError}</p>
          <p className="xr-muted">
            {health.lastErrorAt ? formatDateTime(health.lastErrorAt) : "—"} · this is the most recent
            failure, not necessarily a current one
          </p>
        </div>
      )}

      <div className="xr-panel">
        <h2>API keys</h2>
        <table className="xr-table">
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
              <tr key={k.id ?? Math.random()} className={(k.usagePercent ?? 0) >= 80 ? "xr-row-warn" : undefined}>
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
        <p className="xr-muted">
          Set a key&apos;s quota to the provider&apos;s real monthly limit. These were entered as 100
          each against a real limit of 1,000, and the service stopped itself at a tenth of what it had.
        </p>
      </div>

      {Object.keys(health.sampleRates).length > 0 && (
        <div className="xr-panel">
          <h2>Spot check</h2>
          <div className="xr-rates">
            {Object.entries(health.sampleRates).map(([code, rate]) => (
              <span key={code} className="xr-rate">
                <span className="xr-rate-code">1 USD =</span>
                <strong>{rate}</strong> {code}
              </span>
            ))}
          </div>
          <p className="xr-muted">If one of these looks wrong, the rates are wrong — check before trusting a total.</p>
        </div>
      )}
    </div>
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
