"use client";

import { useCallback, useEffect, useState } from "react";
import EmptyState from "@/components/EmptyState";
import ErrorState from "@/components/ErrorState";
import LoadingState from "@/components/LoadingState";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import { api, getErrorMessage, isUnauthorizedError } from "@/lib/api";
import { clearAccessToken } from "@/lib/auth";
import type { BillingHealthSummary, SharedPurchase } from "@/lib/types";
import { useRouter } from "next/navigation";

/**
 * Billing Health.
 *
 * Not a revenue page — there are better places for that. This answers three questions that only
 * appear when two records are compared: who is being shown premium without paying for it, who paid
 * and is not being shown it, and who paid on an account they can permanently lose.
 *
 * The last one is not fraud. It is people who bought as guests: no email, no password, and a
 * purchase that disappears with the device. They can be reached before that happens, which is the
 * only reason to count them.
 */
export default function BillingHealthPage() {
  const router = useRouter();

  const [summary, setSummary] = useState<BillingHealthSummary | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [resetNote, setResetNote] = useState("");

  const load = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      setSummary(await api.getBillingHealth());
    } catch (err) {
      if (isUnauthorizedError(err)) {
        clearAccessToken({ sessionExpired: true });
        router.replace("/login");
        return;
      }
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  // Decision 0143: a purchase may move to another account 3 times in 12 months. Support can start the count
  // again for a real person stuck behind it; the reason is required and kept in the binding log with who did it.
  const resetMoves = useCallback(
    async (row: SharedPurchase) => {
      const why = window.prompt(
        `Reset the move count of ${row.providerPurchaseId}?\n\nIt can then move to another account ` +
          `${summary?.moveLimit ?? 3} more times in 12 months. Nothing changes at Google or Apple, and ` +
          "nobody loses premium.\n\nWhy (kept in the binding log):",
      );
      if (why === null) return;
      if (why.trim().length < 5) {
        setResetNote("Not reset — say why in a few words.");
        return;
      }
      try {
        const done = await api.resetPurchaseMoves(row.provider ?? "GOOGLE_PLAY", row.providerPurchaseId, why.trim());
        setResetNote(`Reset ${done.providerPurchaseId}: ${done.movesBefore} moves counted before, 0 now.`);
        await load();
      } catch (err) {
        if (isUnauthorizedError(err)) {
          clearAccessToken({ sessionExpired: true });
          router.replace("/login");
          return;
        }
        setResetNote(`Not reset: ${getErrorMessage(err)}`);
      }
    },
    [load, router, summary?.moveLimit],
  );

  return (
    <main className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Navbar title="Billing Health" backHref="/health" backLabel="Health Centre" />
        <section className="content-wrap">
          <div style={{ marginBottom: 20 }}>
            <button type="button" onClick={() => void load()} disabled={isLoading}>
              Refresh
            </button>
          </div>

          {isLoading && <LoadingState />}
          {!isLoading && error && <ErrorState message={error} onRetry={() => void load()} />}

          {!isLoading && !error && summary && (
            <>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 28 }}>
                <Stat label="Paid, live now" value={summary.activeEntitlements} />
                <Stat label="Shown premium in app" value={summary.premiumEnabledInApp} />
                <Stat
                  label="Premium without payment"
                  value={summary.enabledWithoutPayment}
                  tone={summary.enabledWithoutPayment > 0 ? "warn" : undefined}
                  note="A bug, a stale cache, or a modified build."
                />
                <Stat
                  label="Paid but not honoured"
                  value={summary.paidButNotEnabled}
                  tone={summary.paidButNotEnabled > 0 ? "bad" : undefined}
                  note="These people were charged and are not getting it."
                />
                <Stat
                  label="Held by guest accounts"
                  value={summary.heldByGuests}
                  tone={summary.heldByGuests > 0 ? "warn" : undefined}
                  note="No email, no password — one wiped device and the purchase is gone."
                />
                {summary.movesRefused !== undefined && (
                  <Stat
                    label="Refused a 4th move (30 days)"
                    value={summary.movesRefused}
                    tone={summary.movesRefused > 0 ? "warn" : undefined}
                    note={`A purchase moves to another account at most ${summary.moveLimit ?? 3} times in 12 months. Their phone stays premium.`}
                  />
                )}
              </div>

              {resetNote && (
                <p role="status" style={{ marginBottom: 16, fontSize: 14 }}>
                  {resetNote}
                </p>
              )}

              {(summary.refusedAMove?.length ?? 0) > 0 && (
                <>
                  <h3 style={{ marginBottom: 8 }}>Refused a 4th move</h3>
                  <p style={{ opacity: 0.7, marginBottom: 12, fontSize: 14 }}>
                    Somebody asked for this purchase on a new account and was told it has already moved{" "}
                    {summary.moveLimit ?? 3} times in 12 months. If it is one person (a new phone, a reinstall),
                    reset the count and say why. Decision 0143.
                  </p>
                  <PurchaseTable rows={summary.refusedAMove ?? []} onReset={resetMoves} />
                  <div style={{ height: 28 }} />
                </>
              )}

              <h3 style={{ marginBottom: 8 }}>Purchases used across several accounts</h3>
              <p style={{ opacity: 0.7, marginBottom: 12, fontSize: 14 }}>
                A real user rebinds once or twice in a lifetime — registering after buying as a
                guest, or being restored after a reinstall. Listed rather than blocked, because a
                rule strict enough to stop resale eventually catches someone honest.
              </p>

              {summary.widelyShared.length === 0 ? (
                <EmptyState message="No purchase is spread across more accounts than expected." />
              ) : (
                <PurchaseTable rows={summary.widelyShared} onReset={resetMoves} />
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}

/** A purchase per row, with its moves in the last 12 months and the reset (decision 0143). */
function PurchaseTable({
  rows,
  onReset,
}: {
  rows: SharedPurchase[];
  onReset: (row: SharedPurchase) => void;
}) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table className="data-table">
        <thead>
          <tr>
            <th>Purchase</th>
            <th>Product</th>
            <th>Accounts</th>
            <th>Moves (12 months)</th>
            <th>First seen</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.provider ?? "GOOGLE_PLAY"}:${row.providerPurchaseId}`}>
              <td>{row.providerPurchaseId}</td>
              <td>{row.productId}</td>
              <td><strong>{row.accountBindingCount}</strong></td>
              <td>{row.movesInWindow === undefined || row.movesInWindow < 0 ? "—" : row.movesInWindow}</td>
              <td title={row.firstSeenAt}>{row.firstSeenAt.slice(0, 10)}</td>
              <td>
                {row.movesInWindow !== undefined && (
                  <button type="button" onClick={() => onReset(row)} disabled={row.movesInWindow === 0}>
                    Reset moves
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Stat({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: number;
  note?: string;
  tone?: "warn" | "bad";
}) {
  // -1 is how the API reports a count it could not take, so it is shown as unknown rather than as
  // a number that would be read as real.
  const display = value < 0 ? "—" : value.toLocaleString();
  const color = tone === "bad" ? "var(--md-sys-color-error)" : tone === "warn" ? "var(--md-sys-color-warning)" : undefined;

  return (
    <div style={{ minWidth: 200, flex: "1 1 200px", padding: 16, border: "1px solid rgba(128,128,128,0.25)", borderRadius: 10 }}>
      <div style={{ fontSize: 13, opacity: 0.75 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 600, color }}>{display}</div>
      {note && <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>{note}</div>}
    </div>
  );
}
