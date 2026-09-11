"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import EmptyState from "@/components/EmptyState";
import ErrorState from "@/components/ErrorState";
import LoadingState from "@/components/LoadingState";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import { copyText } from "@/lib/clipboard";
import { ApiError, api, getErrorMessage, isUnauthorizedError } from "@/lib/api";
import { clearAccessToken } from "@/lib/auth";
import type {
  SyncHealthOccurrence,
  SyncHealthSignature,
  SyncHealthTrace,
  SyncHealthVersion,
} from "@/lib/types";
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
 *
 * The drill-down is where one failure is read in full (decision 0050): per occurrence, the build,
 * the request id, what the server answered and the record versions on both sides — and, one click
 * away, the server's own log lines for that request, so a defect is fixed from evidence rather than
 * from a guess about what probably happened.
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

/** Columns of the defect table and of the drill-down, for the rows that span them. */
const DEFECT_COLUMNS = 12;
const OCCURRENCE_COLUMNS = 12;

const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";

/** The backend's name for a row that reported no version (`UNKNOWN_VERSION` in SyncHealthController). */
const UNKNOWN_VERSION = "unknown";

/**
 * A defect row's identity.
 *
 * The signature alone is not one. The list is grouped by signature and source, and decision 0050
 * builds a device-reported row's signature the same way as the server's, so one refusal seen from
 * both sides arrives as two rows sharing a signature. Keyed on the signature, that is two React
 * children with one key, and one click opening both drill-downs.
 */
function rowKey(row: SyncHealthSignature): string {
  return [row.signature, row.source, row.entityType, row.field ?? "", row.errorType].join("|");
}

/**
 * A count of distinct ids, or "—" when no row in the group recorded that id at all.
 *
 * Every failure happens on some device to some record, so 0 devices beside 40 occurrences does not
 * mean nobody: it means the source kept no id. Device-reported rows kept neither before decision
 * 0050, and printed a bold 0 in the very column the list is ranked by.
 */
function knownCount(count: number | undefined, occurrences: number): number | "—" {
  if (count === undefined) return "—";
  return count === 0 && occurrences > 0 ? "—" : count;
}

interface VersionOption {
  value: string;
  label: string;
}

function nameChoiceLabel(name: string): string {
  return name === UNKNOWN_VERSION ? "No version reported" : `${name} · every build of this name`;
}

/**
 * The version filter's choices, from what `/app-versions` reports for the same window as the list.
 *
 * A build number wherever there is one, because names repeat: the internal 91 and the released 92
 * both call themselves 1.4.1. A name only for rows that reported no number — and then the choice
 * says what the backend's name filter actually does, which is every build of that name.
 */
function versionOptions(versions: SyncHealthVersion[]): VersionOption[] {
  const seen = new Set<string>();
  const options: VersionOption[] = [];
  for (const v of versions) {
    const option: VersionOption =
      v.appVersionCode != null
        ? { value: `code:${v.appVersionCode}`, label: `${v.appVersion} (${v.appVersionCode})` }
        : { value: `name:${v.appVersion}`, label: nameChoiceLabel(v.appVersion) };
    if (seen.has(option.value)) continue;
    seen.add(option.value);
    options.push(option);
  }
  return options;
}

function versionChoiceLabel(choice: string, options: VersionOption[]): string {
  if (!choice) return "all versions";
  const known = options.find((option) => option.value === choice);
  if (known) return known.label;
  return choice.startsWith("code:") ? `build ${choice.slice(5)}` : nameChoiceLabel(choice.slice(5));
}

/** One of the two, never both: given both, the backend keeps only rows matching both. */
function versionFilter(choice: string): { appVersion?: string; appVersionCode?: number } {
  if (choice.startsWith("code:")) return { appVersionCode: Number(choice.slice(5)) };
  if (choice.startsWith("name:")) return { appVersion: choice.slice(5) };
  return {};
}

function formatBuild(name: string | null | undefined, code: number | null | undefined): string {
  const label = name && name.trim() ? name : "—";
  return code == null ? label : `${label} (${code})`;
}

/** The record's version on the device and on the server, or "—" when neither was reported. */
function formatRecordVersions(occurrence: SyncHealthOccurrence): string {
  const { localVersion, serverVersion } = occurrence;
  if (localVersion == null && serverVersion == null) return "—";
  return `${localVersion ?? "—"} / ${serverVersion ?? "—"}`;
}

function occurrenceKey(occurrence: SyncHealthOccurrence, index: number): string {
  return [occurrence.source ?? "", occurrence.userId ?? "", occurrence.deviceId ?? "", index].join("|");
}

/**
 * A log line's time as an ISO instant, whichever form the server sent.
 *
 * Loki counts in nanoseconds and a Kotlin Instant serialises as ISO text, and the contract names the
 * field without fixing its form. Anything unreadable is shown as it was sent rather than guessed at —
 * and so is text with no zone, which the browser would otherwise read as the viewer's local time and
 * shift by their offset, while the server writes UTC.
 */
function formatTraceTs(ts: string | number): string {
  const text = String(ts);
  const numeric = typeof ts === "number" ? ts : /^\d+$/.test(text) ? Number(ts) : Number.NaN;
  let ms: number;
  if (Number.isNaN(numeric)) {
    if (!/(?:Z|[+-]\d{2}:?\d{2})$/i.test(text)) return text;
    ms = Date.parse(text);
  } else if (numeric > 1e17) ms = numeric / 1e6; // nanoseconds, Loki's own unit
  else if (numeric > 1e14) ms = numeric / 1e3; // microseconds
  else if (numeric > 1e11) ms = numeric; // milliseconds
  else ms = numeric * 1000; // seconds
  const date = new Date(ms);
  return Number.isNaN(date.getTime()) ? String(ts) : date.toISOString();
}

/** A failed log read in words. 404 and 503 are answers the endpoint gives on purpose. */
function traceFailure(err: unknown): string {
  if (err instanceof ApiError && err.status === 404) {
    return "The server has no log lines under this request id. The request may never have reached it — a timeout or a dropped connection fails on the device — or its lines are no longer kept.";
  }
  if (err instanceof ApiError && err.status === 503) {
    return "The server could not search its logs just now: the log store did not answer (503). Try again in a minute.";
  }
  return getErrorMessage(err, "Could not read the server log.");
}

type TraceState =
  | { kind: "loading" }
  | { kind: "ready"; trace: SyncHealthTrace }
  | { kind: "failed"; message: string };

/**
 * The server's own log lines for one request, read when somebody asks for them.
 *
 * Mounted only while open. Every read is a query against the log store, so a drill-down of forty
 * occurrences costs nothing until one of them is wanted (decision 0034: a page costs what it shows).
 */
function ServerLog({ requestId, onUnauthorized }: { requestId: string; onUnauthorized: () => void }) {
  const [state, setState] = useState<TraceState>({ kind: "loading" });

  useEffect(() => {
    let dead = false;
    api.getSyncHealthTrace(requestId).then(
      (trace) => {
        if (!dead) setState({ kind: "ready", trace });
      },
      (err: unknown) => {
        if (dead) return;
        if (isUnauthorizedError(err)) {
          onUnauthorized();
          return;
        }
        setState({ kind: "failed", message: traceFailure(err) });
      },
    );
    return () => {
      dead = true;
    };
  }, [requestId, onUnauthorized]);

  if (state.kind === "loading") {
    return <div style={{ marginTop: 6, opacity: 0.7 }}>Reading the server log for this request…</div>;
  }
  if (state.kind === "failed") {
    return (
      <div role="alert" style={{ marginTop: 6, color: "var(--md-sys-color-error)" }}>
        {state.message}
      </div>
    );
  }

  const { trace } = state;
  if (trace.lines.length === 0) {
    return (
      <div style={{ marginTop: 6, opacity: 0.7 }}>
        The server logged nothing under this request id in the 15 minutes either side of its latest attempt.
      </div>
    );
  }
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ marginBottom: 4, opacity: 0.7 }}>
        {trace.lines.length} {trace.lines.length === 1 ? "line" : "lines"} logged under{" "}
        <span style={{ fontFamily: MONO }}>{trace.requestId}</span>
        {/* Said, because a log that stops mid-story reads as a request that stopped there. */}
        {trace.truncated ? ` — the server cut the answer at ${trace.lines.length}; there are more` : null}
      </div>
      <pre className="json-block" style={{ maxHeight: 360, overflow: "auto" }}>
        {trace.lines.map((line, index) => {
          const level = String(line.level ?? "");
          return (
            <span
              key={index}
              style={{
                display: "block",
                color: level.toUpperCase() === "ERROR" ? "var(--md-sys-color-error)" : undefined,
              }}
            >
              {`${formatTraceTs(line.ts)}  ${level.padEnd(5)}  ${String(line.message ?? "")}`}
            </span>
          );
        })}
      </pre>
    </div>
  );
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
  filters: { unresolvedOnly: boolean; days: number; version: string },
): string {
  const lines: string[] = [];
  const totalDevices = rows.reduce((sum, r) => sum + r.deviceCount, 0);

  lines.push("SYNC HEALTH");
  lines.push(`Captured: ${new Date().toISOString()}`);
  lines.push(
    `Window: last ${filters.days} days · ${filters.unresolvedOnly ? "unresolved only" : "all, including resolved"} · ${filters.version}`,
  );
  lines.push(`${rows.length} distinct defect(s) · ${totalDevices} affected device(s)`);
  lines.push("");

  rows.forEach((row, index) => {
    const what = row.field ? `${row.entityType} · ${row.field}` : row.entityType;
    lines.push(`── ${index + 1}. ${what} — ${row.errorType}`);
    lines.push(`   op=${row.operations?.length ? row.operations.join(",") : "—"} source=${row.source}`);
    lines.push(
      `   devices=${knownCount(row.deviceCount, row.occurrences)} users=${row.userCount} records=${knownCount(row.recordCount, row.occurrences)} occurrences=${row.occurrences}`,
    );
    lines.push(
      `   versions=${row.appVersions?.length ? row.appVersions.join(",") : "—"} builds=${row.appVersionCodes?.length ? row.appVersionCodes.join(",") : "—"}`,
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
  /** "" for every version, `code:<n>` for one build, `name:<v>` for every build of one name. */
  const [version, setVersion] = useState("");
  const [versions, setVersions] = useState<SyncHealthVersion[]>([]);

  /** The open defect, by `rowKey`. */
  const [expanded, setExpanded] = useState<string | null>(null);
  const [occurrences, setOccurrences] = useState<SyncHealthOccurrence[]>([]);
  const [isLoadingOccurrences, setIsLoadingOccurrences] = useState(false);
  /** Occurrences whose server log is open, by `occurrenceKey`. */
  const [openLogs, setOpenLogs] = useState<ReadonlySet<string>>(() => new Set());

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
    // The picker's choices come from the same window as the list, so a build with rows in the list
    // is never missing from the picker. Not awaited, and its failure is left alone: the list reads
    // fine without the picker, and an error banner there would be about a control.
    void api.getSyncHealthVersions({ unresolvedOnly, days }).then(setVersions, () => {
      // The picker keeps the choices it already had.
    });
    try {
      setSignatures(await api.getSyncHealthSignatures({ unresolvedOnly, days, ...versionFilter(version) }));
    } catch (err) {
      if (isUnauthorizedError(err)) {
        handleUnauthorized();
        return;
      }
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [unresolvedOnly, days, version, handleUnauthorized]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleExpanded = useCallback(
    async (row: SyncHealthSignature) => {
      const key = rowKey(row);
      setOpenLogs(new Set());
      if (expanded === key) {
        setExpanded(null);
        setOccurrences([]);
        return;
      }
      setExpanded(key);
      setOccurrences([]);
      setIsLoadingOccurrences(true);
      try {
        setOccurrences(await api.getSyncHealthOccurrences(row.signature));
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

  const toggleLog = useCallback((key: string) => {
    setOpenLogs((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

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

  const options = useMemo(() => versionOptions(versions), [versions]);

  const copyReport = useCallback(async () => {
    const report = buildClipboardReport(signatures, {
      unresolvedOnly,
      days,
      version: versionChoiceLabel(version, options),
    });
    setCopyState(await copyText(report));
    setTimeout(() => setCopyState("idle"), 2500);
  }, [signatures, unresolvedOnly, days, version, options]);

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

            {/* A defect fixed two releases ago keeps its rows for the whole window, so without this
                a solved problem looks as urgent as one on the build people are running. */}
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              Version
              <select value={version} onChange={(event) => setVersion(event.target.value)}>
                <option value="">All versions</option>
                {/* The chosen build stays listed even when this window has no rows for it. Without
                    it the control would fall back to reading "All versions" over a list that is
                    still filtered to that build. */}
                {version !== "" && !options.some((option) => option.value === version) ? (
                  <option value={version}>{versionChoiceLabel(version, options)} — none in this window</option>
                ) : null}
                {options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
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
                    <th>Versions</th>
                    <th>Source</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {signatures.map((row) => {
                    const key = rowKey(row);
                    const devices = knownCount(row.deviceCount, row.occurrences);
                    const records = knownCount(row.recordCount, row.occurrences);
                    return (
                      <Fragment key={key}>
                        <tr>
                          <td>
                            <button
                              type="button"
                              aria-expanded={expanded === key}
                              onClick={() => void toggleExpanded(row)}
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
                          <td title={devices === "—" ? "No row in this group recorded a device id" : undefined}>
                            <strong>{devices}</strong>
                          </td>
                          <td>{row.userCount}</td>
                          <td title={records === "—" ? "No row in this group recorded a record id" : undefined}>
                            <strong>{records}</strong>
                          </td>
                          <td>
                            {row.occurrences}
                            {isRetryLoop(row.recordCount, row.occurrences) && (
                              <span title={`Worst: ${row.worstRecordId ?? "?"} refused ${row.worstRecordOccurrences}x`}
                                    style={{ marginInlineStart: 6, color: "var(--md-sys-color-error)", fontWeight: 600 }}>
                                loop
                              </span>
                            )}
                          </td>
                          <td title={row.firstSeenAt}>{formatWhen(row.firstSeenAt)}</td>
                          <td title={row.lastSeenAt}>{formatWhen(row.lastSeenAt)}</td>
                          {/* Which builds report it: a defect on the released build alone is a
                              different job from one that has been there for three releases. */}
                          <td>
                            {row.appVersions?.length ? row.appVersions.join(", ") : "—"}
                            {row.appVersionCodes?.length ? (
                              <div style={{ fontSize: 12, opacity: 0.6 }}>builds {row.appVersionCodes.join(", ")}</div>
                            ) : null}
                          </td>
                          <td>{row.source}</td>
                          <td>
                            {/* By signature, so it marks every source's rows of this defect at once. */}
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
                            <td colSpan={DEFECT_COLUMNS} style={{ paddingTop: 0, fontSize: 13 }}>
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
                                    color: NON_REFUSAL_ERRORS.has(row.errorType) ? undefined : "var(--md-sys-color-error)",
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

                        {expanded === key && (
                          <tr>
                            <td colSpan={DEFECT_COLUMNS}>
                              {isLoadingOccurrences && <LoadingState />}
                              {!isLoadingOccurrences && occurrences.length === 0 && (
                                <EmptyState message="No occurrence detail." />
                              )}
                              {!isLoadingOccurrences && occurrences.length > 0 && (
                                <>
                                  {/* Said on the page, because "40 occurrences" beside one request id
                                      reads as forty attempts sharing it. */}
                                  <p className="muted-line" style={{ margin: "0 0 8px" }}>
                                    One row per user and device. A row keeps one set of evidence that every
                                    repeat overwrites, so its request, HTTP status, exception and record
                                    versions are from its latest attempt.
                                    {version !== ""
                                      ? " The version filter narrows the defects above, not this detail: every build is listed."
                                      : null}
                                  </p>
                                  <table className="data-table">
                                    <thead>
                                      <tr>
                                        <th>User</th>
                                        <th>Account</th>
                                        <th>Device</th>
                                        <th>App</th>
                                        <th>Entity · op</th>
                                        <th>Record</th>
                                        <th>HTTP</th>
                                        <th>Error</th>
                                        <th title="The record's version on the device / on the server, at the latest attempt">
                                          Version local / server
                                        </th>
                                        <th>Count</th>
                                        <th>First seen</th>
                                        <th>Last seen</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {occurrences.map((occurrence, index) => {
                                        const itemKey = occurrenceKey(occurrence, index);
                                        const logOpen = openLogs.has(itemKey);
                                        return (
                                          <Fragment key={itemKey}>
                                            <tr>
                                              <td title={occurrence.userId ?? ""}>
                                                {occurrence.userEmail ?? shortId(occurrence.userId)}
                                              </td>
                                              <td>{occurrence.userRole ?? "—"}</td>
                                              <td title={occurrence.deviceId ?? ""}>{shortId(occurrence.deviceId)}</td>
                                              <td>{formatBuild(occurrence.appVersion, occurrence.appVersionCode)}</td>
                                              <td>
                                                {occurrence.entityType ?? row.entityType} · {occurrence.operation ?? "—"}
                                              </td>
                                              <td title={occurrence.recordId ?? ""}>{shortId(occurrence.recordId)}</td>
                                              <td>{occurrence.httpStatus ?? "—"}</td>
                                              <td>{occurrence.errorType ?? row.errorType}</td>
                                              <td>{formatRecordVersions(occurrence)}</td>
                                              <td>{occurrence.occurrenceCount}</td>
                                              <td title={occurrence.firstSeenAt}>{formatWhen(occurrence.firstSeenAt)}</td>
                                              <td title={occurrence.lastSeenAt}>{formatWhen(occurrence.lastSeenAt)}</td>
                                            </tr>
                                            <tr>
                                              <td colSpan={OCCURRENCE_COLUMNS} style={{ paddingTop: 0, fontSize: 13 }}>
                                                <div style={{ opacity: 0.8 }}>{occurrence.reason ?? "—"}</div>
                                                <div
                                                  style={{
                                                    display: "flex",
                                                    gap: 16,
                                                    flexWrap: "wrap",
                                                    alignItems: "center",
                                                    marginTop: 2,
                                                  }}
                                                >
                                                  {/* In full: this is the id the server's log lines
                                                      carry, and a shortened one finds nothing. */}
                                                  <span>
                                                    Latest request:{" "}
                                                    <span style={{ fontFamily: MONO }}>{occurrence.requestId ?? "—"}</span>
                                                  </span>
                                                  {occurrence.requestId ? (
                                                    <button
                                                      type="button"
                                                      aria-expanded={logOpen}
                                                      onClick={() => toggleLog(itemKey)}
                                                    >
                                                      {logOpen ? "Hide server log" : "Server log"}
                                                    </button>
                                                  ) : null}
                                                  <span>
                                                    Exception:{" "}
                                                    <span style={{ fontFamily: MONO }}>{occurrence.exception ?? "—"}</span>
                                                  </span>
                                                  {occurrence.source ? <span>Recorded by: {occurrence.source}</span> : null}
                                                </div>
                                                {logOpen && occurrence.requestId ? (
                                                  <ServerLog
                                                    key={occurrence.requestId}
                                                    requestId={occurrence.requestId}
                                                    onUnauthorized={handleUnauthorized}
                                                  />
                                                ) : null}
                                              </td>
                                            </tr>
                                          </Fragment>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
