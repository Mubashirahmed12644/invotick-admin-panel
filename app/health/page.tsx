"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import LoadingState from "@/components/LoadingState";
import ErrorState from "@/components/ErrorState";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import type { HealthCentreOverview, HealthCheckEntry } from "@/lib/types";

/**
 * Everything that can quietly stop working, in one place.
 *
 * On 27 July 2026 four separate faults were found in a single day, all by accident: a TLS
 * certificate five weeks expired, exchange rates frozen for sixteen days, an API quota set to a
 * tenth of its real limit, and 2,717 invoices carrying a currency their own client disagreed with.
 * Nothing crashed; every endpoint answered 200. The information existed in all four cases.
 *
 * So the page leads with what is wrong and says nothing decorative when nothing is.
 */

const ORDER = ["CRITICAL", "UNKNOWN", "WARNING", "OK"] as const;

export default function HealthCentrePage() {
  const [data, setData] = useState<HealthCentreOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (force = false) => {
    if (force) setRefreshing(true);
    else setLoading(true);
    try {
      setData(await api.getHealthCentre(force));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const sorted = data
    ? [...data.checks].sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status))
    : [];

  return (
    <main className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Navbar title="Health Centre" />
        <section className="content-wrap">
          {loading && <LoadingState />}
          {!loading && error && <ErrorState message={error} onRetry={() => void load()} />}

          {!loading && !error && data && (
            <>
              <div className="hc-top">
                <div className="hc-verdict">
                  <span className={`hc-dot hc-dot-${data.needsAttention === 0 ? "ok" : "bad"}`} />
                  <div>
                    <h2 className="hc-verdict-title">
                      {data.needsAttention === 0
                        ? "Nothing needs attention"
                        : `${data.needsAttention} ${data.needsAttention === 1 ? "thing needs" : "things need"} attention`}
                    </h2>
                    <p className="hc-verdict-note">
                      {data.checks.length} checks · last run {formatDateTime(data.generatedAt)}
                    </p>
                  </div>
                </div>
                <div className="hc-actions">
                  <button
                    type="button"
                    className="btn btn-outline"
                    disabled={refreshing}
                    onClick={() => void load(true)}
                  >
                    {refreshing ? "Re-checking…" : "Re-check now"}
                  </button>
                  <Link className="btn btn-outline" href="/users">
                    Back to Users
                  </Link>
                </div>
              </div>

              <div className="hc-list">
                {sorted.map((check) => (
                  <CheckCard key={check.id} check={check} />
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}

function CheckCard({ check }: { check: HealthCheckEntry }) {
  const facts = Object.entries(check.facts ?? {});
  return (
    <article className={`section-card hc-card hc-card-${check.status.toLowerCase()}`}>
      <header className="hc-card-head">
        <span className={`hc-pill hc-pill-${check.status.toLowerCase()}`}>{check.status}</span>
        <div className="hc-card-heading">
          <h2>{check.name}</h2>
          <p className="hc-summary">{check.summary}</p>
        </div>
        {/* Not decoration. A check with a twelve-hour interval can be showing an answer from this
            morning, and "when was this last true" is the first thing to ask of a green tick. */}
        <span className="hc-checked">{formatDateTime(check.checkedAt)}</span>
      </header>

      {check.detail && <p className="hc-detail">{check.detail}</p>}

      {facts.length > 0 && (
        <dl className="hc-facts">
          {facts.map(([k, v]) => (
            <div key={k} className="hc-fact">
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      )}
    </article>
  );
}
