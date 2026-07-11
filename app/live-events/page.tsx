"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import { api, getErrorMessage, isUnauthorizedError } from "@/lib/api";
import { clearAccessToken, isLoggedIn } from "@/lib/auth";
import type { ActiveUser, LiveEvent } from "@/lib/types";

const EVENT_POLL_MS = 1200;
const USERS_POLL_MS = 5000;

// Lifecycle / attribution pings that are recorded app-side (SessionTraceRecorder) but are noise for
// funnel understanding — hidden from the live stream to keep the webpanel meaningful. The cursor +
// seen-set still advance on them so they are not re-fetched, and they keep the live dot green.
const HIDDEN_STREAM_EVENTS = new Set([
  "app_heartbeat",
  "app_cold_start",
  "app_foreground",
  "app_resumed",
  "app_background",
  "app_paused",
  "install_referrer",
  // nav_screen_view is the app-side auto screen-tracker (kept in the recording for coverage), but on
  // the panel it just duplicates screen_view with worse names — hide it so each screen shows once.
  "nav_screen_view",
]);

type SortKey = "recent" | "email" | "count";

function eventKind(name: string): "screen" | "click" | "lifecycle" | "other" {
  if (name === "screen_view") return "screen";
  if (name.startsWith("app_")) return "lifecycle";
  if (name.endsWith("_clicked") || name.endsWith("_add") || name.endsWith("_added") || name.includes("click"))
    return "click";
  return "other";
}

function secondsAgo(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
}

function relTime(iso: string): string {
  const s = secondsAgo(iso);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

function liveState(iso: string): "live" | "recent" | "idle" {
  const s = secondsAgo(iso);
  if (s < 60) return "live";
  if (s < 300) return "recent";
  return "idle";
}

// ISO 3166-1 alpha-2 (e.g. "PK") → 🇵🇰 via regional-indicator symbols.
function flagEmoji(code: string | null): string {
  if (!code || code.length !== 2 || !/^[a-zA-Z]{2}$/.test(code)) return "";
  const cc = code.toUpperCase();
  return String.fromCodePoint(
    0x1f1e6 + (cc.charCodeAt(0) - 65),
    0x1f1e6 + (cc.charCodeAt(1) - 65),
  );
}

export default function LiveEventsPage() {
  const router = useRouter();

  const [navOpen, setNavOpen] = useState(false);

  // left: active users
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [liveOnly, setLiveOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>("recent");
  const [usersError, setUsersError] = useState("");

  // right: selected user debug stream
  const [selectedId, setSelectedId] = useState("");
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [paused, setPaused] = useState(false);
  const [streamError, setStreamError] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [copiedIid, setCopiedIid] = useState<string | null>(null);
  const [, forceTick] = useState(0);

  const copyInvotickId = useCallback((id: string) => {
    navigator.clipboard?.writeText(id).then(() => {
      setCopiedIid(id);
      setTimeout(() => setCopiedIid((c) => (c === id ? null : c)), 1200);
    });
  }, []);

  const sinceRef = useRef<string | null>(null);
  const seenRef = useRef<Set<string>>(new Set());
  const pausedRef = useRef(false);
  const selectedRef = useRef("");

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  // re-render every 5s so relative times refresh
  useEffect(() => {
    const t = setInterval(() => forceTick((n) => n + 1), 5000);
    return () => clearInterval(t);
  }, []);

  const handleUnauthorized = useCallback(
    (err: unknown): boolean => {
      if (isUnauthorizedError(err)) {
        clearAccessToken();
        router.replace("/login");
        return true;
      }
      return false;
    },
    [router],
  );

  // poll active users
  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace("/login");
      return;
    }
    let cancelled = false;
    async function poll() {
      try {
        const list = await api.getActiveUsers(30, 200);
        if (!cancelled) {
          setActiveUsers(list);
          setUsersError("");
        }
      } catch (err) {
        if (!cancelled && !handleUnauthorized(err))
          setUsersError(getErrorMessage(err, "Could not load active users."));
      }
    }
    poll();
    const t = setInterval(poll, USERS_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [router, handleUnauthorized]);

  // poll selected user's events
  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    async function poll() {
      if (pausedRef.current || cancelled) return;
      try {
        const batch = await api.getLiveEvents(selectedRef.current, sinceRef.current ?? undefined, 100);
        if (cancelled) return;
        const fresh = batch.filter((e) => e.id && !seenRef.current.has(e.id));
        if (fresh.length > 0) {
          fresh.forEach((e) => e.id && seenRef.current.add(e.id));
          const maxCreated = fresh.reduce(
            (acc, e) => (e.createdAt > acc ? e.createdAt : acc),
            sinceRef.current ?? "",
          );
          if (maxCreated) sinceRef.current = maxCreated;
          // Hide lifecycle/attribution noise from the stream (see HIDDEN_STREAM_EVENTS) — kept in the
          // app-side recording, just not shown here. The cursor + seen set above already advanced.
          const visible = fresh.filter((e) => !HIDDEN_STREAM_EVENTS.has(e.eventName));
          if (visible.length > 0) {
            // Keep the stream ordered by CLIENT eventTimestamp (true fire order) so late-arriving
            // early events (e.g. app_cold_start, flushed in a later batch) slot into their real
            // position instead of jumping to the top. The poll cursor stays on createdAt so none
            // are missed.
            setEvents((prev) =>
              [...visible, ...prev]
                .sort((a, b) =>
                  a.eventTimestamp < b.eventTimestamp ? 1 : a.eventTimestamp > b.eventTimestamp ? -1 : 0,
                )
                .slice(0, 1000),
            );
          }
        }
        setStreamError("");
      } catch (err) {
        if (!handleUnauthorized(err)) setStreamError(getErrorMessage(err, "Poll failed — retrying…"));
      }
    }
    poll();
    const t = setInterval(poll, EVENT_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [selectedId, handleUnauthorized]);

  function selectUser(id: string) {
    setSelectedId(id);
    selectedRef.current = id;
    setEvents([]);
    setStreamError("");
    setPaused(false);
    sinceRef.current = null;
    seenRef.current = new Set();
  }

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = activeUsers.filter((u) => {
      if (roleFilter !== "all" && (u.role ?? "").toLowerCase() !== roleFilter) return false;
      if (liveOnly && liveState(u.lastEventAt) !== "live") return false;
      if (q) {
        return (
          (u.email ?? "").toLowerCase().includes(q) ||
          u.userId.toLowerCase().includes(q) ||
          (u.invotickId ?? "").includes(q)
        );
      }
      return true;
    });
    list = [...list].sort((a, b) => {
      if (sortBy === "email") return (a.email ?? a.userId).localeCompare(b.email ?? b.userId);
      if (sortBy === "count") return b.recentEventCount - a.recentEventCount;
      return b.lastEventAt.localeCompare(a.lastEventAt);
    });
    return list;
  }, [activeUsers, search, roleFilter, liveOnly, sortBy]);

  const liveCount = activeUsers.filter((u) => liveState(u.lastEventAt) === "live").length;
  const selectedUser = activeUsers.find((u) => u.userId === selectedId);

  return (
    <main className={`app-shell ${navOpen ? "" : "le-nonav"}`}>
      {navOpen ? <Sidebar /> : null}
      <div className="app-main">
        <Navbar title="Live Events (DebugView)" />
        <div style={{ padding: "2px 16px", fontSize: 11, color: "#94a3b8", textAlign: "right" }}>
          build {process.env.NEXT_PUBLIC_BUILD_ID ?? "?"}
        </div>
        <section className="content-wrap le-split">
          {/* LEFT: active users */}
          <div className="le-left section-card">
            <div className="le-left-head">
              <button className="le-menu-btn" onClick={() => setNavOpen((v) => !v)} title="Toggle menu">
                ☰
              </button>
              <h2>
                Live users <span className="le-livecount">{liveCount} live</span> · {activeUsers.length} active
              </h2>
            </div>

            <input
              className="input"
              placeholder="Search email / user id…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="le-filters">
              <select className="input" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                <option value="all">All roles</option>
                <option value="guest">Guest</option>
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
              <select className="input" value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)}>
                <option value="recent">Sort: recent</option>
                <option value="count">Sort: events</option>
                <option value="email">Sort: email</option>
              </select>
              <label className="le-check">
                <input type="checkbox" checked={liveOnly} onChange={(e) => setLiveOnly(e.target.checked)} />
                Live only
              </label>
            </div>

            {usersError ? <p className="error-text">{usersError}</p> : null}

            <div className="le-userlist">
              <div className="le-user-headrow">
                <span>User</span>
                <span>Role</span>
                <span>Country</span>
                <span>Last</span>
                <span>Ev</span>
              </div>
              {rows.map((u) => (
                <button
                  key={u.userId}
                  className={`le-userrow ${selectedId === u.userId ? "le-userrow-active" : ""}`}
                  onClick={() => selectUser(u.userId)}
                >
                  <span className="le-user-id">
                    <span className={`le-dot le-${liveState(u.lastEventAt)}`} />
                    {u.invotickId ? (
                      <span
                        className="le-iid"
                        title="Click to copy Invotick ID"
                        onClick={(e) => { e.stopPropagation(); copyInvotickId(u.invotickId!); }}
                      >
                        {copiedIid === u.invotickId ? "✓ copied" : u.invotickId}
                      </span>
                    ) : (
                      <span className="le-uid-fallback">
                        {u.email && !u.email.endsWith("@guest.com") ? u.email : `${u.userId.slice(0, 8)}…`}
                      </span>
                    )}
                  </span>
                  <span className="le-role">{u.role ?? "—"}</span>
                  <span className="le-country" title={u.country ?? undefined}>
                    {u.countryCode ? (
                      <>
                        <span className="le-flag">{flagEmoji(u.countryCode)}</span>
                        {u.countryCode.toUpperCase()}
                      </>
                    ) : (
                      "—"
                    )}
                  </span>
                  <span className="le-last">{relTime(u.lastEventAt)}</span>
                  <span className="le-count">{u.recentEventCount}</span>
                </button>
              ))}
              {rows.length === 0 ? <p className="api-access-desc">No matching active users.</p> : null}
            </div>
          </div>

          {/* RIGHT: debug stream */}
          <div className="le-right section-card">
            {!selectedId ? (
              <div className="le-empty">
                <p className="api-access-desc">
                  ← Select a live user to stream their events in real time (like GA4 DebugView).
                </p>
              </div>
            ) : (
              <>
                <div className="le-right-head">
                  <div>
                    <h2>{selectedUser?.email && !selectedUser.email.endsWith("@guest.com") ? selectedUser.email : selectedUser?.invotickId ? `#${selectedUser.invotickId}` : selectedId.slice(0, 12) + "…"}</h2>
                    <span className="api-access-desc">
                      {selectedUser?.invotickId ? `Invotick ID ${selectedUser.invotickId} · ` : ""}{events.length} events streamed
                    </span>
                  </div>
                  <div className="api-access-controls" style={{ marginTop: 0 }}>
                    <button className="btn btn-outline" onClick={() => setPaused((p) => !p)}>
                      {paused ? "Resume" : "Pause"}
                    </button>
                    <button
                      className="btn btn-outline"
                      onClick={async () => {
                        if (!selectedRef.current) return;
                        if (!confirm("Permanently delete ALL of this user's events? They will NOT reappear."))
                          return;
                        try {
                          await api.clearLiveEvents(selectedRef.current);
                          setEvents([]);
                          seenRef.current = new Set();
                          sinceRef.current = null;
                        } catch (err) {
                          if (!handleUnauthorized(err)) setStreamError(getErrorMessage(err, "Clear failed."));
                        }
                      }}
                    >
                      Clear
                    </button>
                    <span className="le-dot-label" data-live={!paused}>
                      {paused ? "paused" : "live"}
                    </span>
                  </div>
                </div>
                {streamError ? <p className="error-text">{streamError}</p> : null}
                {events.length === 0 ? (
                  <p className="api-access-desc">
                    Waiting for events… interact in the app as this user — events appear within ~{EVENT_POLL_MS / 1000}s.
                  </p>
                ) : (
                  <div className="live-stream">
                    {events.map((e, i) => {
                      // Keep all meaningful names in ONE column (2nd): for a screen_view row show the
                      // screen name in the name column and the literal "screen_view" in the detail column.
                      const isScreenView = e.eventName === "screen_view";
                      const screenLabel =
                        e.screenName ?? (e.params?.screen as string | undefined) ?? "";
                      const nameCol = isScreenView ? screenLabel || "screen_view" : e.eventName;
                      const detailCol = isScreenView ? "screen_view" : screenLabel;
                      return (
                      <div key={`${e.id}-${i}`} className={`live-row live-${eventKind(e.eventName)}`}>
                        <span className="live-time">{new Date(e.eventTimestamp).toLocaleTimeString()}</span>
                        <span className="live-name">{nameCol}</span>
                        <span className="live-screen">
                          {detailCol}
                          {e.previousScreen ? ` ← ${e.previousScreen}` : ""}
                          {e.sessionId ? "" : " · ⚠️no-session"}
                        </span>
                        {e.params && Object.keys(e.params).length > 0 ? (
                          <button
                            className="live-params-btn"
                            onClick={() => setExpanded(expanded === `${e.id}-${i}` ? null : `${e.id}-${i}`)}
                          >
                            {expanded === `${e.id}-${i}` ? "hide" : "params"}
                          </button>
                        ) : (
                          <span />
                        )}
                        {expanded === `${e.id}-${i}` && e.params ? (
                          <pre className="live-params">{JSON.stringify(e.params, null, 2)}</pre>
                        ) : null}
                      </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
