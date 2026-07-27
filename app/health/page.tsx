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
 * This is the landing page for all of it: one card per check, each carrying enough of its own answer
 * to be judged without opening anything, and each opening the page with the rows behind it. Sync
 * Health and Billing Health were nav items of their own until they became two of these cards — a
 * page you have to decide to visit is a page nobody visits on the ordinary day when something
 * starts going wrong.
 */
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

              {/* Already ordered worst-first by the server, so the thing to act on is the thing
                  nearest the top of the screen. */}
              <div className="hc-grid">
                {data.checks.map((check) => (
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

/**
 * One check, summarised.
 *
 * Shows the verdict, the two or three numbers behind it, and — only when something is wrong — what
 * to do. A green card stays quiet: an overview that explains itself at length when everything is
 * fine trains people to skim past the one day it isn't.
 */
function CheckCard({ check }: { check: HealthCheckEntry }) {
  const facts = Object.entries(check.facts ?? {});
  const tone = check.status.toLowerCase();
  const wrong = check.status !== "OK";

  const body = (
    <>
      <header className="hc-card-head">
        <span className={`hc-pill hc-pill-${tone}`}>{check.status}</span>
        {/* Not decoration. A check with a twelve-hour interval can be showing an answer from this
            morning, and "when was this last true" is the first thing to ask of a green tick. */}
        <span className="hc-checked">{formatDateTime(check.checkedAt)}</span>
      </header>

      <h2 className="hc-card-title">{check.name}</h2>
      <p className="hc-purpose">{check.purpose}</p>
      <p className="hc-summary">{check.summary}</p>

      {/* The verdict can be right while the reason is surprising: "3 keys × 100 = 300 available,
          744 needed" is the sentence that would have prevented a month of failure, and no status
          colour carries it. Capped, because a card that lists everything is read as nothing. */}
      {facts.length > 0 && (
        <dl className="hc-facts">
          {facts.slice(0, wrong ? facts.length : TOP_FACTS).map(([k, v]) => (
            <div key={k} className="hc-fact">
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      )}

      {wrong && check.detail && <p className="hc-detail">{check.detail}</p>}

      {check.detailPath && <span className="hc-open">Open {check.name.toLowerCase()} →</span>}
    </>
  );

  const className = `section-card hc-card hc-card-${tone}${check.detailPath ? " hc-card-link" : ""}`;

  return check.detailPath ? (
    <Link href={check.detailPath} className={className}>
      {body}
    </Link>
  ) : (
    <article className={className}>{body}</article>
  );
}

/** Enough to judge a green card by, few enough that it stays a card. */
const TOP_FACTS = 3;
