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

/**
 * What each rejection means, in words that do not require reading the sync service to understand.
 *
 * The error type is the server's vocabulary, not an operator's: knowing a push came back
 * STALE_CONFLICT says nothing about whether a customer lost an invoice. These sentences are the
 * translation, so triage can start on this page instead of in the backend source.
 */
const ERROR_MEANINGS: Record<string, string> = {
  STALE_CONFLICT:
    "The server already holds this record and considers its copy newer, so the push was refused. If the operation is CREATE this repeats forever — the device resends, the server refuses, and the record never lands.",
  INVALID_REFERENCE:
    "The record points at a parent the server does not have. Usually a knock-on effect: the parent failed first, and everything hanging off it fails with it.",
  INVALID_UUID: "The device sent a malformed id. Fixed in the app, not yet released.",
  NOT_FOUND: "The record was updated or deleted on the server, but no such record exists there.",
  VALIDATION: "The payload was rejected before it reached the sync service.",
  CURRENCY_FILLED_FROM_CLIENT:
    "The invoice arrived with no currency and the server filled it from the client. Nothing failed — the record saved, and filling it beats storing a blank, which every server-rendered surface reads as USD. It is listed because it should fall to almost nothing once the app fix ships; a device still sending blank currencies is a real defect. Worth knowing when reading the count: a client's currency defaults to USD, so a client who never chose one is indistinguishable from one who chose dollars.",
};

/** A defect where a handful of records account for the occurrences is a retry loop, not a spike. */
function isRetryLoop(records: number | undefined, occurrences: number): boolean {
  return records !== undefined && records > 0 && occurrences >= records * 5;
}

/**
 * Error types where the server accepted the record and merely reported something about it.
 *
 * Everything else on this page is a refusal, so the loop wording was written for refusals — and then
 * applied to every row, which put "record … refused 40 times" directly above CURRENCY_FILLED_FROM_
 * CLIENT's own sentence saying "Nothing failed — the record saved". Both cannot be true, and the
 * false one is the alarming one: it reads as a customer's invoice bouncing off the server forever.
 *
 * The repetition is still worth showing — the same record arriving 40 times with no currency is a
 * real defect — it is just not a refusal, so it does not get a refusal's words.
 */
const NON_REFUSAL_ERRORS = new Set(["CURRENCY_FILLED_FROM_CLIENT"]);

function loopSentence(row: SyncHealthSignature): string {
  return NON_REFUSAL_ERRORS.has(row.errorType)
    ? `Same record repeatedly: ${row.worstRecordId} arrived ${row.worstRecordOccurrences} times with the same defect (each one saved).`
    : `Stuck in a loop: record ${row.worstRecordId} refused ${row.worstRecordOccurrences} times on its own.`;
}

/**
 * The whole table as plain text, for pasting into a chat with whoever is going to fix it.
 *
 * Screenshots were how this page left the building, and a screenshot loses exactly what a fix needs:
 * the full record ids (truncated to `35064b3d…63f74e68` on screen), the exact timestamps behind
 * "1m ago", and any row below the fold. So this writes the values, not the rendering — full ids,
 * absolute ISO times alongside the relative ones, and every row regardless of scroll position.
 *
 * The filters are stamped at the top because the same defect list means different things over 24
 * hours and over 90 days, and a pasted block with no window is unreadable a day later.
 */
function buildClipboardReport(
  rows: SyncHealthSignature[],
  filters: { unresolvedOnly: boolean; days: number },
): string {
  const lines: string[] = [];
  const totalDevices = rows.reduce((sum, r) => sum + r.deviceCount, 0);

  lines.push("SYNC HEALTH");
  lines.push(`Captured: ${new Date().toISOString()}`);
  lines.push(`Window: last ${filters.days} days · ${filters.unresolvedOnly ? "unresolved only" : "all, including resolved"}`);
  lines.push(`${rows.length} distinct defect(s) · ${totalDevices} affected device(s)`);
  lines.push("");

  rows.forEach((row, index) => {
    const what = row.field ? `${row.entityType} · ${row.field}` : row.entityType;
    lines.push(`── ${index + 1}. ${what} — ${row.errorType}`);
    lines.push(`   op=${row.operations?.length ? row.operations.join(",") : "—"} source=${row.source}`);
    lines.push(
      `   devices=${row.deviceCount} users=${row.userCount} records=${row.recordCount ?? "?"} occurrences=${row.occurrences}`,
    );
    lines.push(`   first seen: ${row.firstSeenAt}  (${formatWhen(row.firstSeenAt)})`);
    lines.push(`   last seen:  ${row.lastSeenAt}  (${formatWhen(row.lastSeenAt)})`);

    // Full id, deliberately: the short form on screen cannot be looked up in a database.
    if (isRetryLoop(row.recordCount, row.occurrences) && row.worstRecordId) {
      lines.push(`   ${loopSentence(row)}`);
    }
    if (row.latestReason) lines.push(`   server said: ${row.latestReason}`);
    const meaning = ERROR_MEANINGS[row.errorType];
    if (meaning) lines.push(`   what it means: ${meaning}`);
    lines.push(`   signature: ${row.signature}`);
    lines.push("");
  });

  return lines.join("\n");
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
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

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

  const copyReport = useCallback(async () => {
    const report = buildClipboardReport(signatures, { unresolvedOnly, days });
    try {
      await navigator.clipboard.writeText(report);
      setCopyState("copied");
    } catch {
      // navigator.clipboard needs a secure context, and admin.invotick.com over plain HTTP or an
      // IP-address preview would not have one. Falling back to the textarea+execCommand route keeps
      // the button working there rather than failing silently on the one page whose whole job is
      // handing this text to someone else.
      try {
        const scratch = document.createElement("textarea");
        scratch.value = report;
        scratch.setAttribute("readonly", "");
        scratch.style.position = "fixed";
        scratch.style.opacity = "0";
        document.body.appendChild(scratch);
        scratch.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(scratch);
        setCopyState(ok ? "copied" : "failed");
      } catch {
        setCopyState("failed");
      }
    }
    setTimeout(() => setCopyState("idle"), 2500);
  }, [signatures, unresolvedOnly, days]);

  const totalDevices = signatures.reduce((sum, s) => sum + s.deviceCount, 0);

  return (
    <main className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Navbar title="Sync Health" backHref="/health" backLabel="Health Centre" />
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

            {/* Copies the values rather than the view: full record ids, absolute timestamps, and
                every row — the three things a screenshot of this table loses. */}
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => void copyReport()}
              disabled={isLoading || signatures.length === 0}
              title="Copy every defect as text, ready to paste to whoever is fixing it"
            >
              {copyState === "copied"
                ? "Copied ✓"
                : copyState === "failed"
                  ? "Copy failed — select the table instead"
                  : `Copy all ${signatures.length || ""} as text`}
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
                    <th>Op</th>
                    <th>Devices</th>
                    <th>Users</th>
                    <th>Records</th>
                    <th>Occurrences</th>
                    <th>First seen</th>
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
                        <td>{row.operations?.length ? row.operations.join(", ") : "—"}</td>
                        {/* Distinct devices is the impact number: one defect across many devices
                            outranks one device retrying the same broken record all day. */}
                        <td><strong>{row.deviceCount}</strong></td>
                        <td>{row.userCount}</td>
                        <td><strong>{row.recordCount ?? "—"}</strong></td>
                        <td>
                          {row.occurrences}
                          {isRetryLoop(row.recordCount, row.occurrences) && (
                            <span title={`Worst: ${row.worstRecordId ?? "?"} refused ${row.worstRecordOccurrences}x`}
                                  style={{ marginInlineStart: 6, color: "#b42318", fontWeight: 600 }}>
                              loop
                            </span>
                          )}
                        </td>
                        <td title={row.firstSeenAt}>{formatWhen(row.firstSeenAt)}</td>
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

                      {/* The reason sits under its own row rather than in a cell: it is a sentence,
                          and squeezing it into a column would truncate the one field that explains
                          the defect. */}
                      {row.latestReason && (
                        <tr>
                          <td colSpan={11} style={{ paddingTop: 0, fontSize: 13 }}>
                            <div style={{ opacity: 0.8 }}>{row.latestReason}</div>
                            {ERROR_MEANINGS[row.errorType] && (
                              <div style={{ opacity: 0.6, marginTop: 2 }}>
                                {ERROR_MEANINGS[row.errorType]}
                              </div>
                            )}
                            {isRetryLoop(row.recordCount, row.occurrences) && row.worstRecordId && (
                              <div
                                style={{
                                  // A refusal is red because a record is not landing. A repeat that
                                  // saved every time is not an emergency and must not borrow the
                                  // colour of one.
                                  color: NON_REFUSAL_ERRORS.has(row.errorType) ? undefined : "#b42318",
                                  opacity: NON_REFUSAL_ERRORS.has(row.errorType) ? 0.85 : undefined,
                                  marginTop: 2,
                                }}
                                title={row.worstRecordId}
                              >
                                {NON_REFUSAL_ERRORS.has(row.errorType)
                                  ? `Same record repeatedly: ${shortId(row.worstRecordId)} arrived ${row.worstRecordOccurrences} times with the same defect (each one saved).`
                                  : `Stuck in a loop: record ${shortId(row.worstRecordId)} refused ${row.worstRecordOccurrences} times on its own.`}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}

                      {expanded === row.signature && (
                        <tr>
                          <td colSpan={11}>
                            {isLoadingOccurrences && <LoadingState />}
                            {!isLoadingOccurrences && occurrences.length === 0 && (
                              <EmptyState message="No occurrence detail." />
                            )}
                            {!isLoadingOccurrences && occurrences.length > 0 && (
                              <table className="data-table">
                                <thead>
                                  <tr>
                                    <th>User</th>
                                    <th>Account</th>
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
                                      <td title={occurrence.userId ?? ""}>
                                        {occurrence.userEmail ?? shortId(occurrence.userId)}
                                      </td>
                                      <td>{occurrence.userRole ?? "—"}</td>
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
