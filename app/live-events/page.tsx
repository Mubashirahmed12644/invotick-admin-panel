"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import { api, getErrorMessage, isUnauthorizedError, ApiError } from "@/lib/api";
import { clearAccessToken, isLoggedIn } from "@/lib/auth";
import type { ActiveUser, LiveEvent } from "@/lib/types";
import { EventTime, timeWithMillis } from "@/lib/eventTime";
import { copyText, downloadText, fileStamp } from "@/lib/clipboard";

const EVENT_POLL_MS = 1200;
const USERS_POLL_MS = 5000;
// Names and the ignored set change when a person decides they do, not on a stream's schedule — but
// they DO change while a stream is open, which is the normal way to work: Discovery in one window,
// this in another. Re-read on a slow beat rather than once at mount.
const CONFIG_POLL_MS = 60000;

// Lifecycle / attribution pings that are recorded app-side (SessionTraceRecorder) but are noise for
// funnel understanding — hidden from the live stream to keep the webpanel meaningful. The cursor +
// seen-set still advance on them so they are not re-fetched, and they keep the live dot green.
/**
 * The events that keep presence alive without being rows in it.
 *
 * `nav_screen_view` cannot be configured in Event Discovery: that page rewrites it into
 * `screen: <route>` per screen, so the raw name never appears there to be judged. On this stream it
 * would sit beside screen_view saying the same thing with worse names.
 *
 * `app_heartbeat` is the other, and it took three attempts to place correctly. It is a 25-second
 * presence ping — the thing that keeps the live light on while somebody sits reading a screen. It
 * is not something the user did, so it does not belong in a feed of things the user did; but it was
 * also, for a while, the only carrier of how long a pause had lasted, so hiding it hid real
 * information and the owner rightly turned it back on. Removing the ping instead took the live
 * light out with it.
 *
 * Both jobs exist now and neither is the other: this keeps the light on, and `session_break` — one
 * row, when a pause ends, carrying `break_ms` — carries the meaning into the feed and is displayed
 * like any other event.
 *
 * Everything else is decided in Event Discovery, not here. A hard-coded list in this file used to
 * hide app_cold_start, app_background, app_paused, app_foreground, app_resumed and install_referrer
 * as "lifecycle noise", which was fair when they carried nothing but build_type. They carry the
 * screen and the elapsed time now, which makes app_background the single most useful row on the
 * page — it is the only record of somebody giving up, and where. Two places deciding what is worth
 * seeing is how a list like that outlives its reason.
 */
/**
 * Kept out of the stream because they say "still here", not "something happened".
 *
 * `nav_screen_view` used to be in here and was removed on 2026-08-22: the app stopped sending that
 * name when the two screen events were unified, so the entry had quietly matched nothing since —
 * measured at 3,334 screen firings across 37 identities, every one of them arriving as `screen_view`
 * and none as `nav_screen_view`. The app's own comment on that unification names the trap exactly:
 * a check "keeps working right up until the event it names stops being sent". It kept working here
 * too, in the sense that it never failed — it simply stopped doing anything, and nothing said so.
 *
 * Screen views are deliberately NOT in this set. A screen the user landed on is something that
 * happened, it carries the display name typed against it in Event Discovery, and it is what gives
 * every tap after it a location.
 */
const PRESENCE_ONLY = new Set(["app_heartbeat"]);

/**
 * The whole stream as text, for pasting somewhere it can be read by someone who is not looking at
 * this screen.
 *
 * Every event, oldest first — reading order, not the newest-first order the page shows — with the
 * millisecond, the identity as the app sent it, the display name only when one differs from it, the
 * screen, and the full params. The params are the point: they carry `method`, `break_ms`,
 * `had_input` and the rest, and they are exactly what is behind the "params" toggle nobody can
 * paste.
 */
/**
 * The names a screen view arrives under. Android sends `nav_screen_view`; `screen_view` is the iOS
 * spelling.
 *
 * This page tested `=== "screen_view"` in three places, so on Android it never matched. Every screen
 * row was therefore keyed by the literal `nav_screen_view` instead of `screen: <route>`, and two
 * things followed silently: a display name typed against a screen row in Event Discovery was looked
 * up under a key nothing here produced and never appeared, and "mark tested" filed every screen in
 * the app under one shared identity, so ticking one screen ticked all of them.
 *
 * Kept identical to the backend's `event_name IN ('nav_screen_view', 'screen_view')`. The two
 * derivations have to agree exactly — that is the whole contract — so they belong in one place each.
 */
const SCREEN_VIEW_EVENTS = new Set(["nav_screen_view", "screen_view"]);

/** Event Discovery's identity for a row — `screen: <route>` for a screen view, the name otherwise. */
function identityOf(e: LiveEvent): string {
  return SCREEN_VIEW_EVENTS.has(e.eventName)
    ? `screen: ${(e.params?.screen as string | undefined) || e.screenName || "?"}`
    : e.eventName;
}

function buildStreamReport(
  events: LiveEvent[],
  ctx: {
    userId: string;
    invotickId?: string | null;
    names: Map<string, string>;
  },
): string {
  const head = [
    `# Live Events — ${ctx.invotickId ? `Invotick ID ${ctx.invotickId}, ` : ""}user ${ctx.userId}`,
    `# ${events.length} events, oldest first, copied ${new Date().toISOString()}`,
    "",
  ];
  const body = [...events].reverse().map((e, i) => {
    const isScreen = SCREEN_VIEW_EVENTS.has(e.eventName);
    const screen = e.screenName ?? (e.params?.screen as string | undefined) ?? "";
    const ident = identityOf(e);
    const shown = ctx.names.get(ident);
    const label = shown && shown !== ident ? `${ident}  [shown as ${shown}]` : ident;
    const params = e.params && Object.keys(e.params).length ? JSON.stringify(e.params) : "-";
    return `${String(i + 1).padStart(3)}  ${timeWithMillis(e.eventTimestamp)}  ${label}\n      screen=${screen || "-"}  params=${params}`;
  });
  return [...head, ...body].join("\n");
}


type SortKey = "recent" | "email" | "count";

function eventKind(name: string): "screen" | "click" | "lifecycle" | "other" {
  if (SCREEN_VIEW_EVENTS.has(name)) return "screen";
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
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
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
  /** Event names Event Discovery has marked ignored — the only thing this stream hides by choice. */
  const ignoredRef = useRef<Set<string>>(new Set());
  // ident -> chosen name. Keyed by Event Discovery's ident, which for a screen is `screen: <route>`
  // and not `screen_view` — looking it up by the raw event name would find nothing for every screen
  // in the app, and look exactly like "renaming screens does not work".
  const displayNamesRef = useRef<Map<string, string>>(new Map());
  // Identities already accepted as correct. Hidden while walking a flow, so what is on screen is
  // what still needs checking — the reason this exists is that a run from cleared data reprints
  // everything verified so far and the eye stops working.
  const testedRef = useRef<Set<string>>(new Set());
  /**
   * Identities with Track switched on in Event Discovery, and whether that answer has arrived yet.
   *
   * `loaded` matters more than the set. Config is fetched after the first events land, so filtering
   * on an empty set would blank the stream for a second and read as "nothing is happening" — the
   * one thing a live view must never say when it simply does not know yet.
   */
  const trackedRef = useRef<{ set: Set<string>; loaded: boolean }>({ set: new Set(), loaded: false });
  const [hideTested, setHideTested] = useState(true);


  const pausedRef = useRef(false);
  const selectedRef = useRef("");

  // Whatever Event Discovery marks "ignored" is what this stream hides, and whatever it names is
  // what this stream shows.
  //
  // This used to run once, at mount, and that is exactly the case it fails: Discovery in one window
  // and this in another, which is how the page is actually used. A name typed there never reached a
  // stream that was already open, so the rename looked like it had not worked at all — the page it
  // was typed on changed and nothing else did.
  useEffect(() => {
    let cancelled = false;
    // Guarded like the rest. Sixty seconds is slow enough that overlap is unlikely — but "unlikely"
    // is what the 1.2s poll was assumed to be too, and each of these reads is two unscoped queries.
    let configInFlight = false;
    const load = async () => {
      if (configInFlight) return;
      configInFlight = true;
      try {
        const [ignored, named] = await Promise.all([
          api.getEventDiscovery(false, true),
          api.getEventDiscovery(false, false),
        ]);
        if (cancelled) return;
        ignoredRef.current = new Set(ignored.map((i) => i.eventName));
        const tested = new Set<string>();
        for (const i of [...named, ...ignored]) if (i.testedAt) tested.add(i.eventName);
        testedRef.current = tested;
        const names = new Map<string, string>();
        const tracked = new Set<string>();
        for (const i of [...named, ...ignored]) {
          if (i.displayName) names.set(i.eventName, i.displayName);
          if (i.tracked) tracked.add(i.eventName);
        }
        // Only redraw when something actually changed. The rows are rendered from refs, so without
        // this a new name would sit in the map until some unrelated thing forced a render.
        //
        // Compared before the refs are overwritten. Assigning first and comparing after is a check
        // that can never be true — it would end up comparing each new value against itself.
        const changed =
          names.size !== displayNamesRef.current.size ||
          [...names].some(([k, v]) => displayNamesRef.current.get(k) !== v) ||
          !trackedRef.current.loaded ||
          tracked.size !== trackedRef.current.set.size ||
          [...tracked].some((k) => !trackedRef.current.set.has(k));
        displayNamesRef.current = names;
        trackedRef.current = { set: tracked, loaded: true };
        if (changed) forceTick((n) => n + 1);
      } catch {
        // A stream showing too much beats a stream that silently shows nothing.
      } finally {
        configInFlight = false;
      }
    };
    void load();
    // Refreshed on focus rather than by polling hard. The case this exists for is Discovery in one
    // window and this in another: coming back to this window is exactly the moment a name typed
    // over there needs to arrive, and it costs one read instead of four a minute. These are two
    // unscoped aggregate queries against an admin endpoint, and the beat behind them is the slow
    // backstop, not the mechanism.
    const onFocus = () => {
      if (document.visibilityState === "visible") void load();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    const t = setInterval(() => {
      // A hidden tab is not being read. Polling one only spends requests on an endpoint that is
      // already the one failing.
      if (document.visibilityState === "visible") void load();
    }, CONFIG_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(t);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, []);

  // re-render every 5s so relative times refresh
  useEffect(() => {
    const t = setInterval(() => forceTick((n) => n + 1), 5000);
    return () => clearInterval(t);
  }, []);

  const handleUnauthorized = useCallback(
    (err: unknown): boolean => {
      if (isUnauthorizedError(err)) {
        clearAccessToken({
          reason: {
            at: new Date().toISOString(),
            status: err instanceof ApiError ? err.status : undefined,
            url: err instanceof ApiError ? err.url : undefined,
            message: err instanceof Error ? err.message : String(err),
          },
        });
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
    // Same guard, same reason. This one polls every 5s and was stacking alongside the events poll.
    let usersInFlight = false;
    let usersNextAt = 0;
    let usersFailures = 0;
    async function poll() {
      if (usersInFlight || Date.now() < usersNextAt) return;
      usersInFlight = true;
      try {
        const list = await api.getActiveUsers(30, 200);
        if (!cancelled) {
          setActiveUsers(list);
          setUsersError("");
        }
        usersFailures = 0;
        usersNextAt = 0;
      } catch (err) {
        usersFailures += 1;
        usersNextAt = Date.now() + Math.min(30_000, USERS_POLL_MS * 2 ** usersFailures);
        if (!cancelled && !handleUnauthorized(err))
          setUsersError(getErrorMessage(err, "Could not load active users."));
      } finally {
        usersInFlight = false;
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
    // A poll must never overtake the one before it — the same rule the Discovery page needed, and
    // this page was left without it.
    //
    // 128 failures in six minutes came from here. The interval is 1.2 seconds; once the request
    // started taking longer than that, every tick added another in-flight request holding another
    // database connection, and `since` never advanced because nothing ever succeeded — so the same
    // query was re-sent, over and over, against a server it was itself preventing from answering.
    let inFlight = false;
    let nextAttemptAt = 0;
    let failures = 0;
    async function poll() {
      if (pausedRef.current || cancelled) return;
      if (inFlight || Date.now() < nextAttemptAt) return;
      inFlight = true;
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
          // What to hide is decided in Event Discovery (see ALWAYS_HIDDEN) — kept in the
          // app-side recording, just not shown here. The cursor + seen set above already advanced.
          const visible = fresh.filter(
            (e) => !PRESENCE_ONLY.has(e.eventName) && !ignoredRef.current.has(e.eventName),
          );
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
        failures = 0;
        nextAttemptAt = 0;
      } catch (err) {
        failures += 1;
        // Back off instead of leaning harder on a server that is already struggling. Without this,
        // a failing poll is re-sent every 1.2s for as long as the failure lasts.
        const wait = Math.min(30_000, EVENT_POLL_MS * 2 ** failures);
        nextAttemptAt = Date.now() + wait;
        if (!handleUnauthorized(err)) {
          setStreamError(`${getErrorMessage(err, "Poll failed")} — retrying in ${Math.round(wait / 1000)}s`);
        }
      } finally {
        inFlight = false;
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
        {/* The sidebar on this page is collapsible, and with it hidden there was no way out at all —
            no nav, no back. A link in the Navbar is unaffected by that toggle. */}
        <Navbar title="Live Events (DebugView)" backHref="/" backLabel="Home" />
        <div style={{ padding: "2px 16px", fontSize: 11, color: "var(--md-sys-color-on-surface-variant)", textAlign: "right" }}>
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
                      {/* Since when, because without it this number invites a comparison it cannot
                          win. Event Discovery counts a week of history and says so; this counts only
                          what arrived while the page was open and used to say nothing — so 112 there
                          against 72 here read as events going missing, when the 40 between them had
                          simply fired before anyone opened this page. */}
                      {events.length > 0 ? (
                        <> · since <EventTime iso={events[events.length - 1].eventTimestamp} /></>
                      ) : null}
                      {selectedId ? (
                        <>
                          {" · "}
                          {/* Carries the user across, because the counts on that page are only
                              comparable to this stream when they describe the same person. */}
                          <a
                            href={`/live-event-config?userId=${encodeURIComponent(selectedId)}`}
                            style={{ color: "var(--md-sys-color-primary)" }}
                          >
                            Discovery for this user →
                          </a>
                        </>
                      ) : null}
                    </span>
                  </div>
                  <div className="api-access-controls" style={{ marginTop: 0 }}>
                    <button
                      className="btn btn-outline"
                      disabled={!events.length}
                      onClick={async () => {
                        const r = await copyText(
                          buildStreamReport(events, {
                            userId: selectedId,
                            invotickId: selectedUser?.invotickId,
                            names: displayNamesRef.current,
                          }),
                        );
                        setCopyState(r);
                        setTimeout(() => setCopyState("idle"), 2500);
                      }}
                    >
                      {copyState === "copied" ? "Copied ✓" : copyState === "failed" ? "Copy failed" : "Copy stream"}
                    </button>
                    <button
                      className="btn btn-outline"
                      disabled={!events.length}
                      title="Same report as a .txt file — easier to hand over than a wall of pasted text"
                      onClick={() =>
                        downloadText(
                          `live-events-${selectedUser?.invotickId || selectedId.slice(0, 8)}-${fileStamp()}.txt`,
                          buildStreamReport(events, {
                            userId: selectedId,
                            invotickId: selectedUser?.invotickId,
                            names: displayNamesRef.current,
                          }),
                        )
                      }
                    >
                      Download
                    </button>
                    <label
                      className="le-check"
                      title="Hide events already accepted as correct, so a run from cleared data shows only what still needs checking"
                      style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}
                    >
                      <input type="checkbox" checked={hideTested} onChange={(e) => setHideTested(e.target.checked)} />
                      Hide tested
                    </label>
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
                    {(hideTested ? events.filter((e) => !testedRef.current.has(identityOf(e))) : events).map((e, i) => {
                      // Keep all meaningful names in ONE column (2nd): for a screen_view row show the
                      // screen name in the name column and the literal "screen_view" in the detail column.
                      const isScreenView = SCREEN_VIEW_EVENTS.has(e.eventName);
                      const screenLabel =
                        e.screenName ?? (e.params?.screen as string | undefined) ?? "";
                      // Same derivation the backend uses to key the config, so a name typed against
                      // a screen row is found by the row it was typed against.
                      const ident = identityOf(e);
                      const chosen = displayNamesRef.current.get(ident);
                      const nameCol =
                        chosen ?? (isScreenView ? screenLabel || "screen_view" : e.eventName);
                      const detailCol = isScreenView ? "screen_view" : screenLabel;
                      return (
                      <div key={`${e.id}-${i}`} className={`live-row live-${eventKind(e.eventName)}`}>
                        {/* The newest event gets the HIGHEST number, so a row keeps the number it
                            was given. Numbering from the top instead meant every row was renumbered
                            each time an event arrived, which makes the number useless for the one
                            thing it is for — pointing at a row. */}
                        <span className="live-idx">{events.length - i}</span>
                        <span className="live-time"><EventTime iso={e.eventTimestamp} /></span>
                        <span className="live-name">{nameCol}</span>
                        <span className="live-screen">
                          {detailCol}
                          {e.previousScreen ? ` ← ${e.previousScreen}` : ""}
                          {e.sessionId ? "" : " · ⚠️no-session"}
                        </span>
                        {/* Track's answer, shown where the events are — the switch stays in Event
                            Discovery. Showing it here and deciding it there is deliberate: one place
                            to change a thing and every place to see it, so the stream can be read
                            without holding the other window's state in your head. Nothing is
                            filtered out for being off; a row nobody has catalogued yet is exactly
                            the row worth noticing, and this page is where it first appears. */}
                        <span
                          className="live-track"
                          data-on={trackedRef.current.set.has(ident)}
                          data-loaded={trackedRef.current.loaded}
                          title={
                            !trackedRef.current.loaded
                              ? "Loading Track settings…"
                              : trackedRef.current.set.has(ident)
                                ? "Track is ON — this event will send from release builds too. Change it in Event Discovery."
                                : "Track is OFF — debug builds only. Change it in Event Discovery."
                          }
                        >
                          {trackedRef.current.set.has(ident) ? "● track on" : "○ track off"}
                        </span>
                        <span style={{ display: "inline-flex", gap: 10, alignItems: "center" }}>
                          {/* Accepting from here, rather than only from Discovery, because this is
                              the page that has the parameters — the richer half of the baseline. */}
                          <button
                            className="live-params-btn"
                            title={
                              testedRef.current.has(identityOf(e))
                                ? "Accepted. Click to withdraw."
                                : "Accept this event as correct, recording its parameter keys and how many times it fired in this run"
                            }
                            onClick={async () => {
                              const ident = identityOf(e);
                              const already = testedRef.current.has(ident);
                              try {
                                await api.setEventTested(
                                  ident,
                                  !already,
                                  already
                                    ? undefined
                                    : {
                                        firings: events.filter((x) => identityOf(x) === ident).length,
                                        paramKeys: Object.keys(e.params ?? {}),
                                        screen: e.screenName ?? undefined,
                                      },
                                );
                                const next = new Set(testedRef.current);
                                if (already) next.delete(ident);
                                else next.add(ident);
                                testedRef.current = next;
                                forceTick((n) => n + 1);
                              } catch (err) {
                                if (!handleUnauthorized(err)) setStreamError(getErrorMessage(err, "Could not save."));
                              }
                            }}
                          >
                            {testedRef.current.has(identityOf(e)) ? "✓ tested" : "mark tested"}
                          </button>
                          {e.params && Object.keys(e.params).length > 0 ? (
                            <button
                              className="live-params-btn"
                              onClick={() => setExpanded(expanded === `${e.id}-${i}` ? null : `${e.id}-${i}`)}
                            >
                              {expanded === `${e.id}-${i}` ? "hide" : "params"}
                            </button>
                          ) : null}
                        </span>
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
