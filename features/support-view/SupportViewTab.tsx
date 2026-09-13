"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import EmptyState from "@/components/EmptyState";
import ErrorState from "@/components/ErrorState";
import LoadingState from "@/components/LoadingState";
import { api, getErrorMessage, isUnauthorizedError } from "@/lib/api";
import { clearAccessToken } from "@/lib/auth";
import { formatDateTime, formatRelativeTime } from "@/lib/format";
import type {
  SupportDevices,
  SupportPremium,
  SupportRevealField,
  SupportSummary,
  SupportSyncFailures,
  SupportViewLogPage,
} from "@/lib/types";
import styles from "./support-view.module.css";

/** The plan's page size, and the server's ceiling. */
const PAGE_SIZE = 50;
const FAILURE_WINDOWS = [7, 30, 90] as const;

const SECTION_LABELS: Record<string, string> = {
  summary: "Account",
  devices: "Devices",
  sync_failures: "Sync failures",
  premium: "Premium",
  access_log: "Who looked",
  reveal: "Reveal",
  unknown: "Other",
};

const OUTCOME_LABELS: Record<string, string> = {
  ok: "Shown",
  not_found: "No such account",
  bad_request: "Refused (bad request)",
  rate_limited: "Refused (too many)",
  refused: "Refused",
  error: "Failed",
};

function shortId(id: string | null | undefined): string {
  if (!id) return "—";
  return id.length > 12 ? `${id.slice(0, 8)}…` : id;
}

function when(value: string | null | undefined): string {
  return value ? `${formatRelativeTime(value)} · ${formatDateTime(value)}` : "—";
}

function later(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return new Date(a).getTime() >= new Date(b).getTime() ? a : b;
}

function formatBuild(version: string | null, code: number | null): string {
  if (version && code != null) return `${version} (${code})`;
  if (version) return version;
  if (code != null) return `build ${code}`;
  return "—";
}

/**
 * Loads one section and keeps its answer under [key]. Loading is read from whether an answer for the
 * current key has arrived, so nothing sets state before the request is back.
 */
function useSection<T>(key: string, load: () => Promise<T>, onUnauthorized: () => void) {
  const [answer, setAnswer] = useState<{ key: string; data: T | null; error: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    load().then(
      (data) => {
        if (!cancelled) setAnswer({ key, data, error: "" });
      },
      (error: unknown) => {
        if (cancelled) return;
        if (isUnauthorizedError(error)) {
          onUnauthorized();
          return;
        }
        setAnswer({ key, data: null, error: getErrorMessage(error, "Could not load this section.") });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [key, load, onUnauthorized]);

  const current = answer && answer.key === key ? answer : null;
  return { data: current?.data ?? null, error: current?.error ?? "", loading: current === null };
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.fact}>
      <span className={styles.factLabel}>{label}</span>
      <span className={styles.factValue}>{children}</span>
    </div>
  );
}

function Pager({
  page,
  size,
  total,
  onPage,
}: {
  page: number;
  size: number;
  total: number;
  onPage: (page: number) => void;
}) {
  if (total <= size) return null;
  const first = page * size + 1;
  const last = Math.min(total, (page + 1) * size);
  return (
    <div className={styles.pager}>
      <span className="muted-line">
        {first}–{last} of {total}
      </span>
      <button type="button" className="btn btn-outline" disabled={page === 0} onClick={() => onPage(page - 1)}>
        Newer
      </button>
      <button type="button" className="btn btn-outline" disabled={last >= total} onClick={() => onPage(page + 1)}>
        Older
      </button>
    </div>
  );
}

/**
 * The read-only support view of one account (decision 0075): what support needs to see to help a user,
 * without ever holding the user's token or changing their data.
 *
 * Every section is its own recorded read, and every reveal is recorded by field (who, which field,
 * when), never by value. Emails and phone numbers arrive masked; names are shown as they are, because
 * support needs them to recognise the user (the owner, 2026-09-14).
 */
export function SupportViewTab({ userId }: { userId: string }) {
  const router = useRouter();
  const onUnauthorized = useCallback(() => {
    clearAccessToken({ sessionExpired: true });
    router.replace("/login");
  }, [router]);

  const [refresh, setRefresh] = useState(0);
  const [days, setDays] = useState<number>(30);
  const [failurePage, setFailurePage] = useState(0);
  const [viewsPage, setViewsPage] = useState(0);

  const loadSummary = useCallback(() => api.getSupportSummary(userId), [userId]);
  const loadDevices = useCallback(() => api.getSupportDevices(userId), [userId]);
  const loadFailures = useCallback(
    () => api.getSupportSyncFailures(userId, { days, page: failurePage, size: PAGE_SIZE }),
    [days, failurePage, userId],
  );
  const loadPremium = useCallback(() => api.getSupportPremium(userId), [userId]);
  const loadViews = useCallback(() => api.getSupportViews(userId, { page: viewsPage, size: PAGE_SIZE }), [userId, viewsPage]);

  const summary = useSection<SupportSummary>(`${userId}|${refresh}`, loadSummary, onUnauthorized);
  const devices = useSection<SupportDevices>(`${userId}|${refresh}`, loadDevices, onUnauthorized);
  const failures = useSection<SupportSyncFailures>(`${userId}|${days}|${failurePage}|${refresh}`, loadFailures, onUnauthorized);
  const premium = useSection<SupportPremium>(`${userId}|${refresh}`, loadPremium, onUnauthorized);
  const views = useSection<SupportViewLogPage>(`${userId}|${viewsPage}|${refresh}`, loadViews, onUnauthorized);

  const [revealed, setRevealed] = useState<Partial<Record<SupportRevealField, string | null>>>({});
  const [revealing, setRevealing] = useState<SupportRevealField | null>(null);
  const [revealError, setRevealError] = useState("");

  async function reveal(field: SupportRevealField) {
    setRevealing(field);
    setRevealError("");
    try {
      const answer = await api.revealSupportField(userId, field);
      setRevealed((current) => ({ ...current, [field]: answer.value }));
    } catch (error) {
      if (isUnauthorizedError(error)) {
        onUnauthorized();
        return;
      }
      setRevealError(getErrorMessage(error, "Could not reveal the value."));
    } finally {
      setRevealing(null);
    }
  }

  function hide(field: SupportRevealField) {
    setRevealed((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  const reload = () => setRefresh((value) => value + 1);

  function revealable(field: SupportRevealField, masked: string | null, canReveal: boolean) {
    if (field in revealed) {
      return (
        <span className={styles.revealRow}>
          <span>{revealed[field] ?? "none on the account"}</span>
          <button type="button" className={styles.linkButton} onClick={() => hide(field)}>
            Hide
          </button>
        </span>
      );
    }
    return (
      <span className={styles.revealRow}>
        <span>{masked ?? "—"}</span>
        {canReveal ? (
          <button
            type="button"
            className={styles.linkButton}
            disabled={revealing !== null}
            onClick={() => void reveal(field)}
          >
            {revealing === field ? "Revealing…" : "Reveal"}
          </button>
        ) : null}
      </span>
    );
  }

  return (
    <>
      <div className={styles.pager}>
        <span className="muted-line">
          Read-only. Every section opened here is recorded (who looked, and when), and so is every reveal.
        </span>
        <button type="button" className="btn btn-outline" onClick={reload}>
          Refresh
        </button>
      </div>

      {/* ── The account ─────────────────────────────────────────────────── */}
      <section className="section-card">
        {summary.loading ? <LoadingState message="Loading the account..." /> : null}
        {!summary.loading && summary.error ? <ErrorState message={summary.error} onRetry={reload} /> : null}
        {summary.data ? (
          <>
            <div className={styles.headerTitle}>
              <h2>{summary.data.username || "No name"}</h2>
              <span className={styles.mono}>
                {summary.data.invotickId ? `Invotick ID ${summary.data.invotickId}` : "No Invotick ID"}
              </span>
            </div>
            <div className="user-detail-badges">
              <span className="user-pill">
                {summary.data.accountKind === "GUEST"
                  ? "Guest"
                  : summary.data.accountKind === "REGISTERED"
                    ? "Registered"
                    : "Admin"}
              </span>
              <span className={`user-pill ${summary.data.premiumNow ? "user-pill-ok" : "user-pill-neutral"}`}>
                {summary.data.premiumNow ? "Premium (server)" : "Not premium (server)"}
              </span>
              {summary.data.isDeleted ? <span className="user-pill user-pill-bad">Deleted</span> : null}
              {!summary.data.isActive ? <span className="user-pill user-pill-bad">Inactive</span> : null}
              {summary.data.accountKind !== "GUEST" ? (
                <span className={`user-pill ${summary.data.isEmailVerified ? "user-pill-info" : "user-pill-neutral"}`}>
                  {summary.data.isEmailVerified ? "Email verified" : "Email not verified"}
                </span>
              ) : null}
              {summary.data.hasPendingEmailChange ? (
                <span className="user-pill user-pill-neutral">Email change waiting for its code</span>
              ) : null}
            </div>
            <div className={styles.facts}>
              <Fact label="Email">
                {revealable("email", summary.data.emailMasked, Boolean(summary.data.emailMasked) && !summary.data.emailIsGuestAddress)}
              </Fact>
              <Fact label="Phone">{revealable("phone", summary.data.phoneMasked, summary.data.hasPhone)}</Fact>
              <Fact label="User id">
                <span className={styles.mono}>{summary.data.userId}</span>
              </Fact>
              <Fact label="Created">{when(summary.data.createdAt)}</Fact>
              <Fact label="Last sign-in">{when(summary.data.lastLoginAt)}</Fact>
              <Fact label="Last changed">{when(summary.data.updatedAt)}</Fact>
              {summary.data.deletedAt ? <Fact label="Deleted">{when(summary.data.deletedAt)}</Fact> : null}
            </div>
            {revealError ? (
              <p className={styles.error} role="alert">
                {revealError}
              </p>
            ) : null}
            {summary.data.retiredTo ? (
              <p>
                This guest account was retired: its data moved to{" "}
                <Link href={`/users/${summary.data.retiredTo.userId}?tab=support`}>
                  {summary.data.retiredTo.invotickId
                    ? `Invotick ID ${summary.data.retiredTo.invotickId}`
                    : shortId(summary.data.retiredTo.userId)}
                </Link>
                .
              </p>
            ) : null}
            {summary.data.previousGuests.length > 0 ? (
              <div className={styles.fact}>
                <span className={styles.factLabel}>Earlier guest accounts whose data moved here</span>
                <span className={styles.revealRow}>
                  {summary.data.previousGuests.map((guest) => (
                    <Link key={guest.userId} href={`/users/${guest.userId}?tab=support`} className={styles.mono}>
                      {guest.invotickId ?? shortId(guest.userId)}
                    </Link>
                  ))}
                  {summary.data.previousGuestCount > summary.data.previousGuests.length ? (
                    <span className={styles.note}>
                      and {summary.data.previousGuestCount - summary.data.previousGuests.length} more
                    </span>
                  ) : null}
                </span>
              </div>
            ) : null}
          </>
        ) : null}
      </section>

      {/* ── Devices ─────────────────────────────────────────────────────── */}
      <section className="section-card">
        <div className="section-header">
          <h2>Devices</h2>
        </div>
        {devices.loading ? <LoadingState message="Loading devices..." /> : null}
        {!devices.loading && devices.error ? <ErrorState message={devices.error} onRetry={reload} /> : null}
        {devices.data && devices.data.devices.length === 0 ? (
          <EmptyState
            message={`No device has signed into this account, and no session in the last ${devices.data.sessionWindowDays} days named one.`}
          />
        ) : null}
        {devices.data && devices.data.devices.length > 0 ? (
          <>
            <div className={styles.tableWrap}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Device id</th>
                    <th>Name</th>
                    <th>Signed in</th>
                    <th>App build</th>
                    <th>Model</th>
                    <th>System</th>
                    <th>Last seen</th>
                    <th>Sessions ({devices.data.sessionWindowDays} d)</th>
                    <th title="Other accounts this device id has signed into">Other accounts</th>
                  </tr>
                </thead>
                <tbody>
                  {devices.data.devices.map((device) => (
                    <tr key={device.deviceId}>
                      <td className={styles.mono}>
                        {device.isSharedIosId ? "iPhone (the id every iPhone shares)" : device.deviceId}
                      </td>
                      <td>{device.deviceName ?? "—"}</td>
                      <td>
                        {device.linked ? (device.revokedAt ? `Removed ${formatDateTime(device.revokedAt)}` : "Yes") : "No"}
                      </td>
                      <td>{formatBuild(device.appVersion ?? device.linkedAppVersion, device.appVersionCode)}</td>
                      <td>{[device.manufacturer, device.deviceModel].filter(Boolean).join(" ") || "—"}</td>
                      <td>{[device.platform ?? device.linkedPlatform, device.osVersion].filter(Boolean).join(" ") || "—"}</td>
                      <td>{when(later(device.lastSeenAt, device.lastSessionAt))}</td>
                      <td>{device.sessions}</td>
                      <td>{device.otherAccounts ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {devices.data.devices.some((device) => (device.otherAccounts ?? 0) > 0) ? (
              <p className="muted-line">
                A device that has signed into other accounts usually means the app was reinstalled or its data
                cleared: an earlier guest account may still hold this user&apos;s invoices. Paste the device id into
                Find a user, on the Users page, to see those accounts.
              </p>
            ) : null}
            {devices.data.sessionsWithoutDevice > 0 ? (
              <p className="muted-line">
                {devices.data.sessionsWithoutDevice} session(s) in the window carried no device id.
              </p>
            ) : null}
            {devices.data.truncated ? <p className="muted-line">More devices than the twenty shown.</p> : null}
          </>
        ) : null}
      </section>

      {/* ── Sync failures ───────────────────────────────────────────────── */}
      <section className="section-card">
        <div className="section-header">
          <h2>Sync failures</h2>
          <label className={styles.revealRow}>
            <span className="muted-line">Last</span>
            <select
              value={days}
              onChange={(event) => {
                setDays(Number(event.target.value));
                setFailurePage(0);
              }}
            >
              {FAILURE_WINDOWS.map((window) => (
                <option key={window} value={window}>
                  {window} days
                </option>
              ))}
            </select>
          </label>
        </div>
        {failures.loading ? <LoadingState message="Loading sync failures..." /> : null}
        {!failures.loading && failures.error ? <ErrorState message={failures.error} onRetry={reload} /> : null}
        {failures.data && failures.data.items.length === 0 ? (
          <EmptyState message={`No sync failure in the last ${failures.data.days} days.`} />
        ) : null}
        {failures.data && failures.data.items.length > 0 ? (
          <>
            <p className="muted-line">
              One row per defect, device and account. A row keeps its latest attempt&apos;s evidence; the request
              id opens that attempt&apos;s server log on the Sync Health page.
            </p>
            <div className={styles.tableWrap}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Last seen</th>
                    <th>What failed</th>
                    <th>Error</th>
                    <th>Record</th>
                    <th>Device</th>
                    <th>App build</th>
                    <th>Times</th>
                    <th>Request id</th>
                  </tr>
                </thead>
                <tbody>
                  {failures.data.items.map((failure) => (
                    <FailureRows key={`${failure.signature}|${failure.deviceId}|${failure.userId}|${failure.recordId}`} failure={failure} />
                  ))}
                </tbody>
              </table>
            </div>
            <Pager page={failures.data.page} size={failures.data.size} total={failures.data.total} onPage={setFailurePage} />
          </>
        ) : null}
      </section>

      {/* ── Premium ─────────────────────────────────────────────────────── */}
      <section className="section-card">
        <div className="section-header">
          <h2>Premium</h2>
        </div>
        {premium.loading ? <LoadingState message="Loading premium..." /> : null}
        {!premium.loading && premium.error ? <ErrorState message={premium.error} onRetry={reload} /> : null}
        {premium.data ? <PremiumSection premium={premium.data} /> : null}
      </section>

      {/* ── Who looked ──────────────────────────────────────────────────── */}
      <section className="section-card">
        <div className="section-header">
          <h2>Who looked at this account</h2>
        </div>
        <p className="muted-line">
          Every section opened in this view and every reveal, newest first. Opening this list is recorded too;
          it appears here from the next load on.
        </p>
        {views.loading ? <LoadingState message="Loading the record..." /> : null}
        {!views.loading && views.error ? <ErrorState message={views.error} onRetry={reload} /> : null}
        {views.data && views.data.items.length === 0 ? <EmptyState message="Nobody has looked at this account yet." /> : null}
        {views.data && views.data.items.length > 0 ? (
          <>
            <div className={styles.tableWrap}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Admin</th>
                    <th>What</th>
                    <th>Outcome</th>
                    <th>Account</th>
                  </tr>
                </thead>
                <tbody>
                  {views.data.items.map((entry, index) => (
                    <tr key={`${entry.viewedAt}|${entry.section}|${index}`}>
                      <td>{when(entry.viewedAt)}</td>
                      <td title={entry.adminUserId ?? ""}>{entry.adminName ?? shortId(entry.adminUserId)}</td>
                      <td>
                        {SECTION_LABELS[entry.section] ?? entry.section}
                        {entry.action === "reveal" && entry.field ? `: ${entry.field}` : ""}
                      </td>
                      <td>{OUTCOME_LABELS[entry.outcome] ?? entry.outcome}</td>
                      <td>{entry.viewedUserId === userId ? "This account" : `Earlier guest ${shortId(entry.viewedUserId)}`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pager page={views.data.page} size={views.data.size} total={views.data.total} onPage={setViewsPage} />
          </>
        ) : null}
      </section>

      {/* ── Limits ──────────────────────────────────────────────────────── */}
      <details className={`section-card ${styles.cannotShow}`}>
        <summary>What this view cannot show</summary>
        <ul>
          <li>Anything still only on the phone: what has not synced yet, drafts, and a guest that never got a session.</li>
          <li>What the phone decides by itself: premium on Play&apos;s word alone, and the ads it shows.</li>
          <li>Which version of the invoice renderer the phone draws with.</li>
          <li>Invoices and estimates drawn as the app draws them: they come in the next phase.</li>
          <li>One iPhone apart from another: every iPhone sends the same device id for now.</li>
          <li>Gaps in the analytics journey.</li>
        </ul>
      </details>
    </>
  );
}

function FailureRows({ failure }: { failure: SupportSyncFailures["items"][number] }) {
  const what = [failure.entityType, failure.operation, failure.field].filter(Boolean).join(" · ");
  const evidence = [
    failure.source,
    failure.appStage,
    failure.exception,
    failure.localVersion != null || failure.serverVersion != null
      ? `version ${failure.localVersion ?? "?"} / ${failure.serverVersion ?? "?"}`
      : null,
    failure.fromPreviousGuest ? `under earlier guest ${shortId(failure.userId)}` : null,
    failure.resolved ? "marked fixed" : null,
  ].filter(Boolean);
  return (
    <>
      <tr>
        <td title={failure.lastSeenAt}>{when(failure.lastSeenAt)}</td>
        <td>{what || "—"}</td>
        <td>
          {failure.errorType}
          {failure.httpStatus != null ? ` · HTTP ${failure.httpStatus}` : ""}
        </td>
        <td className={styles.mono} title={failure.recordId ?? ""}>
          {shortId(failure.recordId)}
        </td>
        <td className={styles.mono} title={failure.deviceId ?? ""}>
          {shortId(failure.deviceId)}
        </td>
        <td>{formatBuild(failure.appVersion, failure.appVersionCode)}</td>
        <td>{failure.occurrenceCount}</td>
        <td className={styles.mono}>{failure.requestId ?? "—"}</td>
      </tr>
      <tr className={styles.reasonRow}>
        <td colSpan={8}>
          {failure.reason ?? "—"}
          {evidence.length > 0 ? ` (${evidence.join(", ")})` : ""}
        </td>
      </tr>
    </>
  );
}

function PremiumSection({ premium }: { premium: SupportPremium }) {
  return (
    <>
      <div className="user-detail-badges">
        <span className={`user-pill ${premium.premiumNow ? "user-pill-ok" : "user-pill-neutral"}`}>
          {premium.premiumNow ? "Premium now, on the server's record" : "Not premium on the server's record"}
        </span>
        {premium.appReport ? (
          <span className={`user-pill ${premium.appReport.premiumEnabled ? "user-pill-info" : "user-pill-neutral"}`}>
            The app said {premium.appReport.premiumEnabled ? "premium" : "not premium"},{" "}
            {formatRelativeTime(premium.appReport.reportedAt)}
            {premium.appReport.appVersion ? ` (build ${premium.appReport.appVersion})` : ""}
          </span>
        ) : (
          <span className="user-pill user-pill-neutral">The app has not reported its premium state</span>
        )}
      </div>

      {premium.entitlements.length === 0 ? (
        <EmptyState message="No purchase is recorded for this account." />
      ) : (
        <div className={styles.tableWrap}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Plan</th>
                <th>Live now</th>
                <th>Expires</th>
                <th>Order id</th>
                <th>Product</th>
                <th>Accounts it moved through</th>
                <th>Granted</th>
                <th>Ended</th>
              </tr>
            </thead>
            <tbody>
              {premium.entitlements.map((entitlement) => (
                <tr key={`${entitlement.orderId}|${entitlement.heldByUserId}`}>
                  <td>{entitlement.status}</td>
                  <td>{entitlement.plan}</td>
                  <td>{entitlement.currentlyActive ? "Yes" : "No"}</td>
                  <td>{entitlement.expiresAt ? formatDateTime(entitlement.expiresAt) : "Never (lifetime)"}</td>
                  <td className={styles.mono}>{entitlement.orderId ?? "—"}</td>
                  <td>{entitlement.productId ?? "—"}</td>
                  <td>{entitlement.accountBindingCount ?? "—"}</td>
                  <td>{formatDateTime(entitlement.grantedAt)}</td>
                  <td>
                    {entitlement.revokedAt
                      ? `${formatDateTime(entitlement.revokedAt)}${entitlement.revokedReason ? ` (${entitlement.revokedReason})` : ""}`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {premium.bindings.length > 0 ? (
        <div className={styles.tableWrap}>
          <table className="data-table">
            <thead>
              <tr>
                <th>When the purchase moved</th>
                <th>Why</th>
                <th>From</th>
                <th>To</th>
                <th>Device</th>
                <th>Order id</th>
              </tr>
            </thead>
            <tbody>
              {premium.bindings.map((binding, index) => (
                <tr key={`${binding.createdAt}|${index}`}>
                  <td>{formatDateTime(binding.createdAt)}</td>
                  <td>{binding.reason}</td>
                  <td className={styles.mono}>{shortId(binding.fromUserId)}</td>
                  <td className={styles.mono}>{shortId(binding.toUserId)}</td>
                  <td className={styles.mono}>{shortId(binding.deviceId)}</td>
                  <td className={styles.mono}>{binding.orderId ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {premium.restoreAnswers.length > 0 ? (
        <div className={styles.tableWrap}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Restore last asked</th>
                <th>Answer</th>
                <th>Asked by</th>
                <th>Held by</th>
                <th>Device</th>
                <th>Times</th>
                <th>Order id</th>
              </tr>
            </thead>
            <tbody>
              {premium.restoreAnswers.map((answer, index) => (
                <tr key={`${answer.lastSeenAt}|${index}`}>
                  <td>{formatDateTime(answer.lastSeenAt)}</td>
                  <td>{answer.outcome}</td>
                  <td className={styles.mono}>{shortId(answer.askedByUserId)}</td>
                  <td className={styles.mono}>{shortId(answer.ownerUserId)}</td>
                  <td className={styles.mono}>{shortId(answer.deviceId)}</td>
                  <td>{answer.times}</td>
                  <td className={styles.mono}>{answer.orderId ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <p className="muted-line">
        This is the server&apos;s record. A phone can also be premium on Google Play&apos;s word alone (decision 0047),
        which is not stored, so it is not shown here.
      </p>
    </>
  );
}
