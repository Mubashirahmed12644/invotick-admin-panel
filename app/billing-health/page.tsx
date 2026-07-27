"use client";

import { useCallback, useEffect, useState } from "react";
import EmptyState from "@/components/EmptyState";
import ErrorState from "@/components/ErrorState";
import LoadingState from "@/components/LoadingState";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import { api, getErrorMessage, isUnauthorizedError } from "@/lib/api";
import { clearAccessToken } from "@/lib/auth";
import type { BillingHealthSummary } from "@/lib/types";
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
              </div>

              <h3 style={{ marginBottom: 8 }}>Purchases used across several accounts</h3>
              <p style={{ opacity: 0.7, marginBottom: 12, fontSize: 14 }}>
                A real user rebinds once or twice in a lifetime — registering after buying as a
                guest, or being restored after a reinstall. Listed rather than blocked, because a
                rule strict enough to stop resale eventually catches someone honest.
              </p>

              {summary.widelyShared.length === 0 ? (
                <EmptyState message="No purchase is spread across more accounts than expected." />
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Purchase</th>
                        <th>Product</th>
                        <th>Accounts</th>
                        <th>First seen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.widelyShared.map((row) => (
                        <tr key={row.providerPurchaseId}>
                          <td>{row.providerPurchaseId}</td>
                          <td>{row.productId}</td>
                          <td><strong>{row.accountBindingCount}</strong></td>
                          <td title={row.firstSeenAt}>{row.firstSeenAt.slice(0, 10)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </main>
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
  const color = tone === "bad" ? "#b42318" : tone === "warn" ? "#b54708" : undefined;

  return (
    <div style={{ minWidth: 200, flex: "1 1 200px", padding: 16, border: "1px solid rgba(128,128,128,0.25)", borderRadius: 10 }}>
      <div style={{ fontSize: 13, opacity: 0.75 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 600, color }}>{display}</div>
      {note && <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>{note}</div>}
    </div>
  );
}
