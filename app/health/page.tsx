"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import LoadingState from "@/components/LoadingState";
import ErrorState from "@/components/ErrorState";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import type { HealthAction, HealthCentreOverview, HealthCheckEntry } from "@/lib/types";

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

  // Outside `body` because the card may be a Link, and a button inside an anchor is neither
  // clickable on its own nor valid markup.
  const action = wrong && check.action ? <ActionButton action={check.action} /> : null;

  const className = `section-card hc-card hc-card-${tone}${check.detailPath ? " hc-card-link" : ""}`;

  // The card keeps its link; the action sits beside it in a wrapper so both are reachable.
  return (
    <div className="hc-card-wrap">
      {check.detailPath ? (
        <Link href={check.detailPath} className={className}>
          {body}
        </Link>
      ) : (
        <article className={className}>{body}</article>
      )}
      {action}
    </div>
  );
}

/**
 * The fix, ready to paste.
 *
 * Copies rather than runs. Executing it would mean this backend — a container — running privileged
 * commands on the host, which turns an admin panel into remote root on the VPS: a larger problem
 * than any certificate it would renew. The command arrives with the affected names already filled
 * in, which is the part that was actually missing. Nobody failed to renew because `clpctl` was hard
 * to type; they failed because nothing said which domains needed it.
 */
function ActionButton({ action }: { action: HealthAction }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(action.command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard needs a secure context and permission. Showing the command beats a dead button.
      setCopied(false);
    }
  }

  return (
    <div className="hc-action">
      <button type="button" className="btn btn-outline hc-action-btn" onClick={() => void copy()}>
        {copied ? "Copied ✓" : `Copy: ${action.label}`}
      </button>
      {/* So nobody pastes a VPS command into their laptop. */}
      <span className="hc-action-where">run on {action.runOn}</span>
      <pre className="hc-action-cmd">{action.command}</pre>
    </div>
  );
}

/** Enough to judge a green card by, few enough that it stays a card. */
const TOP_FACTS = 3;
