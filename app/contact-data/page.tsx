"use client";

import { useCallback, useEffect, useState } from "react";
import ErrorState from "@/components/ErrorState";
import LoadingState from "@/components/LoadingState";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import { api, getErrorMessage, isUnauthorizedError } from "@/lib/api";
import { clearAccessToken } from "@/lib/auth";
import type { ContactDataStats } from "@/lib/types";
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
      <div style={{ fontSize: 30, fontWeight: 700, color: emphasis ? "#c2410c" : undefined }}>
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

  useEffect(() => {
    void load();
  }, [load]);

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
                  hint={`${matchedShare.toFixed(1)}% of the numbers held belong to a registered user.`}
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

              <div style={{ marginTop: 20 }}>
                <button type="button" onClick={() => void load()}>
                  Refresh
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
