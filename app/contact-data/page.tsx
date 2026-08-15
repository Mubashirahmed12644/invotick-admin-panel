"use client";

import { useCallback, useEffect, useState } from "react";
import EmptyState from "@/components/EmptyState";
import ErrorState from "@/components/ErrorState";
import LoadingState from "@/components/LoadingState";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import { api, getErrorMessage, isUnauthorizedError } from "@/lib/api";
import { clearAccessToken } from "@/lib/auth";
import type { ContactDataStats, ContactRow } from "@/lib/types";
import { useRouter } from "next/navigation";

/**
 * Contact data footprint.
 *
 * Contacts are uploaded from users' address books and kept indefinitely — there is no retention or
 * deletion path today. Most of what is held describes people who never installed the app and never
 * agreed to anything, so the size of this store is a standing decision rather than a detail, and
 * this page exists so it can be looked at rather than guessed at.
 */

function formatCount(n: number): string {
  return n.toLocaleString();
}

function Stat({
  label,
  value,
  hint,
  emphasis,
}: {
  label: string;
  value: number;
  hint: string;
  emphasis?: boolean;
}) {
  return (
    <div
      style={{
        border: "1px solid rgba(128,128,128,0.25)",
        borderRadius: 10,
        padding: "18px 20px",
        minWidth: 220,
        flex: "1 1 220px",
      }}
    >
      <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 700, color: emphasis ? "var(--md-sys-color-error)" : undefined }}>
        {formatCount(value)}
      </div>
      <div style={{ fontSize: 12, opacity: 0.65, marginTop: 8, lineHeight: 1.45 }}>{hint}</div>
    </div>
  );
}

export default function ContactDataPage() {
  const router = useRouter();

  const [stats, setStats] = useState<ContactDataStats | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [rows, setRows] = useState<ContactRow[]>([]);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("known");
  const [search, setSearch] = useState("");
  const [isLoadingRows, setIsLoadingRows] = useState(true);

  const handleUnauthorized = useCallback(() => {
    clearAccessToken({ sessionExpired: true });
    router.replace("/login");
  }, [router]);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      setStats(await api.getContactDataStats());
    } catch (err) {
      if (isUnauthorizedError(err)) {
        handleUnauthorized();
        return;
      }
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [handleUnauthorized]);

  const loadRows = useCallback(async () => {
    setIsLoadingRows(true);
    try {
      const page = await api.getHeldContacts({ filter, sort, search, limit: 200 });
      setRows(page.rows);
      setTotal(page.total);
    } catch (err) {
      if (isUnauthorizedError(err)) {
        handleUnauthorized();
        return;
      }
      setError(getErrorMessage(err));
    } finally {
      setIsLoadingRows(false);
    }
  }, [filter, sort, search, handleUnauthorized]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const matchedShare =
    stats && stats.uniquePhoneNumbers > 0
      ? (stats.registeredPhones / stats.uniquePhoneNumbers) * 100
      : 0;

  return (
    <main className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Navbar title="Contact Data" />
        <section className="content-wrap">
          {isLoading && <LoadingState />}
          {!isLoading && error && <ErrorState message={error} onRetry={() => void load()} />}

          {!isLoading && !error && stats && (
            <>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 28 }}>
                <Stat
                  label="Unique phone numbers"
                  value={stats.uniquePhoneNumbers}
                  hint="Distinct people held across every user's address book."
                />
                <Stat
                  label="On Invotick"
                  value={stats.registeredPhones}
                  // A share this small rounds to "0.0%", which reads like a broken stat rather than
                  // the finding it actually is — that almost nobody we hold data on is a user.
                  hint={`${
                    matchedShare > 0 && matchedShare < 0.1 ? "<0.1" : matchedShare.toFixed(1)
                  }% of the numbers held belong to a registered user.`}
                />
                {/* The number that matters: people whose details we hold who never installed the
                    app and never agreed to anything. */}
                <Stat
                  label="Not on Invotick"
                  value={stats.unmatchedPhoneNumbers}
                  hint="People we hold details for who never installed the app."
                  emphasis
                />
              </div>

              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 28 }}>
                <Stat
                  label="User ↔ contact links"
                  value={stats.userContactLinks}
                  hint="One per (user, contact) pair — carries the contact's name and email."
                />
                <Stat
                  label="Raw uploaded rows"
                  value={stats.rawContactRows}
                  hint="Verbatim payloads kept from every ingest. Nothing prunes these."
                />
                <Stat
                  label="Ingest batches"
                  value={stats.ingestBatches}
                  hint="One per device upload."
                />
              </div>

              <div
                style={{
                  border: "1px solid rgba(194,65,12,0.35)",
                  background: "rgba(194,65,12,0.06)",
                  borderRadius: 10,
                  padding: "16px 20px",
                  fontSize: 13,
                  lineHeight: 1.6,
                  maxWidth: 760,
                }}
              >
                <strong>No retention or deletion exists for this data yet.</strong> Nothing prunes
                old ingests, and deleting an account does not remove the contacts it uploaded. Most
                of what is counted above describes people who are not users and were never asked.
              </div>

              <div style={{ marginTop: 32 }}>
                <h2 style={{ fontSize: 18, marginBottom: 4 }}>Who is being held</h2>
                <p style={{ fontSize: 13, opacity: 0.7, marginBottom: 16 }}>
                  Ordered by how many separate address books each person appears in.
                </p>

                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
                  <select value={filter} onChange={(e) => setFilter(e.target.value)}>
                    <option value="all">Everyone</option>
                    <option value="unregistered">Not on Invotick</option>
                    <option value="registered">On Invotick</option>
                  </select>

                  <select value={sort} onChange={(e) => setSort(e.target.value)}>
                    <option value="known">Most address books</option>
                    <option value="recent">Most recently seen</option>
                  </select>

                  <input
                    type="search"
                    placeholder="Search number, name or email…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ padding: "6px 10px", minWidth: 260 }}
                  />

                  <button type="button" onClick={() => { void load(); void loadRows(); }}>
                    Refresh
                  </button>

                  {!isLoadingRows && (
                    <span style={{ marginInlineStart: "auto", opacity: 0.7, fontSize: 13 }}>
                      Showing {rows.length.toLocaleString()} of {total.toLocaleString()}
                    </span>
                  )}
                </div>

                {isLoadingRows && <LoadingState />}

                {!isLoadingRows && rows.length === 0 && (
                  <EmptyState message="No contacts match this filter." />
                )}

                {!isLoadingRows && rows.length > 0 && (
                  <div style={{ overflowX: "auto" }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Phone</th>
                          <th>Saved as</th>
                          <th>Email</th>
                          <th>Address books</th>
                          <th>On Invotick</th>
                          <th>First seen</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row) => (
                          <tr key={row.phone}>
                            <td style={{ whiteSpace: "nowrap" }}>{row.phone}</td>
                            {/* The same person is often saved under different names by different
                                users — showing them together is the clearest picture of what we hold. */}
                            <td>{row.names.length > 0 ? row.names.join(", ") : "—"}</td>
                            <td>{row.emails.length > 0 ? row.emails.join(", ") : "—"}</td>
                            <td><strong>{row.knownByUsers}</strong></td>
                            <td>{row.onInvotick ? "Yes" : "No"}</td>
                            <td style={{ whiteSpace: "nowrap" }} title={row.firstSeenAt}>
                              {new Date(row.firstSeenAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
