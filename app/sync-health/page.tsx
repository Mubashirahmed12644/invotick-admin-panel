"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import EmptyState from "@/components/EmptyState";
import ErrorState from "@/components/ErrorState";
import LoadingState from "@/components/LoadingState";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import { api, getErrorMessage, isUnauthorizedError } from "@/lib/api";
import { clearAccessToken } from "@/lib/auth";
import type { SyncHealthOccurrence, SyncHealthSignature } from "@/lib/types";
import { useRouter } from "next/navigation";

/**
 * Sync Health.
 *
 * Sync problems used to be invisible: a rejected push left its reason in a log file on the server,
 * a rejected record was seen only by the device that sent it, and users never report either — they
 * uninstall. This is where those failures surface.
 *
 * It is a triage screen, not a log viewer. Rows are distinct defects ranked by how many devices they
 * affect, so "what is breaking the most users right now" is the first thing on the page.
 */

function formatWhen(iso: string): string {
  const then = new Date(iso).getTime();
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function shortId(value: string | null, keep = 8): string {
  if (!value) return "—";
  return value.length <= keep * 2 + 1 ? value : `${value.slice(0, keep)}…${value.slice(-keep)}`;
}

export default function SyncHealthPage() {
  const router = useRouter();

  const [signatures, setSignatures] = useState<SyncHealthSignature[]>([]);
  const [unresolvedOnly, setUnresolvedOnly] = useState(true);
  const [days, setDays] = useState(30);

  const [expanded, setExpanded] = useState<string | null>(null);
  const [occurrences, setOccurrences] = useState<SyncHealthOccurrence[]>([]);
  const [isLoadingOccurrences, setIsLoadingOccurrences] = useState(false);

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [busySignature, setBusySignature] = useState<string | null>(null);

  const handleUnauthorized = useCallback(() => {
    clearAccessToken({ sessionExpired: true });
    router.replace("/login");
  }, [router]);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      setSignatures(await api.getSyncHealthSignatures({ unresolvedOnly, days }));
    } catch (err) {
      if (isUnauthorizedError(err)) {
        handleUnauthorized();
        return;
      }
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [unresolvedOnly, days, handleUnauthorized]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleExpanded = useCallback(
    async (signature: string) => {
      if (expanded === signature) {
        setExpanded(null);
        setOccurrences([]);
        return;
      }
      setExpanded(signature);
      setOccurrences([]);
      setIsLoadingOccurrences(true);
      try {
        setOccurrences(await api.getSyncHealthOccurrences(signature));
      } catch (err) {
        if (isUnauthorizedError(err)) {
          handleUnauthorized();
          return;
        }
        setError(getErrorMessage(err));
      } finally {
        setIsLoadingOccurrences(false);
      }
    },
    [expanded, handleUnauthorized],
  );

  const toggleResolved = useCallback(
    async (signature: string, resolved: boolean) => {
      setBusySignature(signature);
      try {
        await api.resolveSyncHealthSignature(signature, resolved);
        await load();
      } catch (err) {
        if (isUnauthorizedError(err)) {
          handleUnauthorized();
          return;
        }
        setError(getErrorMessage(err));
      } finally {
        setBusySignature(null);
      }
    },
    [load, handleUnauthorized],
  );

  const totalDevices = signatures.reduce((sum, s) => sum + s.deviceCount, 0);

  return (
    <main className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Navbar title="Sync Health" />
        <section className="content-wrap">
          <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", marginBottom: 20 }}>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={unresolvedOnly}
                onChange={(event) => setUnresolvedOnly(event.target.checked)}
              />
              Unresolved only
            </label>

            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              Last
              <select value={days} onChange={(event) => setDays(Number(event.target.value))}>
                <option value={1}>24 hours</option>
                <option value={7}>7 days</option>
                <option value={30}>30 days</option>
                <option value={90}>90 days</option>
              </select>
            </label>

            <button type="button" onClick={() => void load()} disabled={isLoading}>
              Refresh
            </button>

            {!isLoading && signatures.length > 0 && (
              <span style={{ marginInlineStart: "auto", opacity: 0.75 }}>
                {signatures.length} distinct {signatures.length === 1 ? "defect" : "defects"} ·{" "}
                {totalDevices} affected {totalDevices === 1 ? "device" : "devices"}
              </span>
            )}
          </div>

          {isLoading && <LoadingState />}
          {!isLoading && error && <ErrorState message={error} onRetry={() => void load()} />}

          {!isLoading && !error && signatures.length === 0 && (
            <EmptyState message="No sync failures recorded in this window — every push is landing." />
          )}

          {!isLoading && !error && signatures.length > 0 && (
            <div style={{ overflowX: "auto" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>What is failing</th>
                    <th>Error</th>
                    <th>Devices</th>
                    <th>Users</th>
                    <th>Occurrences</th>
                    <th>Last seen</th>
                    <th>Source</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {signatures.map((row) => (
                    <Fragment key={row.signature}>
                      <tr>
                        <td>
                          <button
                            type="button"
                            onClick={() => void toggleExpanded(row.signature)}
                            style={{ background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}
                          >
                            <strong>{row.entityType}</strong>
                            {row.field ? <span style={{ opacity: 0.8 }}> · {row.field}</span> : null}
                          </button>
                        </td>
                        <td>{row.errorType}</td>
                        {/* Distinct devices is the impact number: one defect across many devices
                            outranks one device retrying the same broken record all day. */}
                        <td><strong>{row.deviceCount}</strong></td>
                        <td>{row.userCount}</td>
                        <td>{row.occurrences}</td>
                        <td title={row.lastSeenAt}>{formatWhen(row.lastSeenAt)}</td>
                        <td>{row.source}</td>
                        <td>
                          <button
                            type="button"
                            disabled={busySignature === row.signature}
                            onClick={() => void toggleResolved(row.signature, true)}
                          >
                            Mark fixed
                          </button>
                        </td>
                      </tr>

                      {expanded === row.signature && (
                        <tr>
                          <td colSpan={8}>
                            {isLoadingOccurrences && <LoadingState />}
                            {!isLoadingOccurrences && occurrences.length === 0 && (
                              <EmptyState message="No occurrence detail." />
                            )}
                            {!isLoadingOccurrences && occurrences.length > 0 && (
                              <table className="data-table">
                                <thead>
                                  <tr>
                                    <th>User</th>
                                    <th>Device</th>
                                    <th>App</th>
                                    <th>Op</th>
                                    <th>Record</th>
                                    <th>Reason</th>
                                    <th>Count</th>
                                    <th>Last seen</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {occurrences.map((occurrence, index) => (
                                    <tr key={`${occurrence.deviceId ?? "d"}-${occurrence.recordId ?? index}`}>
                                      <td title={occurrence.userId ?? ""}>{shortId(occurrence.userId)}</td>
                                      <td title={occurrence.deviceId ?? ""}>{shortId(occurrence.deviceId)}</td>
                                      <td>{occurrence.appVersion ?? "—"}</td>
                                      <td>{occurrence.operation ?? "—"}</td>
                                      <td title={occurrence.recordId ?? ""}>{shortId(occurrence.recordId)}</td>
                                      <td>{occurrence.reason ?? "—"}</td>
                                      <td>{occurrence.occurrenceCount}</td>
                                      <td title={occurrence.lastSeenAt}>{formatWhen(occurrence.lastSeenAt)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
