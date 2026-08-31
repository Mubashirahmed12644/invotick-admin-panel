"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RESIZE_HANDLE_CLASS, useColumnWidths } from "@/lib/useColumnWidths";
import { ColumnsMenu } from "@/components/ColumnsMenu";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import { api, getErrorMessage, isUnauthorizedError, ApiError } from "@/lib/api";
import { clearAccessToken, isLoggedIn } from "@/lib/auth";
import type { ActiveUser, AppVersion, EventDetail, EventSummaryPage, EventSummaryRow, LiveEvent } from "@/lib/types";
import { EventTime, dateTimeWithMillis, timeWithMillis } from "@/lib/eventTime";
import { copyText, downloadText, fileStamp } from "@/lib/clipboard";
import { DateRangePicker, defaultRange, formatDay, toRangeIso, type DayRange } from "@/components/DateRangePicker";

const EVENT_POLL_MS = 1200;
const USERS_POLL_MS = 5000;
// Names and the ignored set change when a person decides they do, not on a stream's schedule — but
// they DO change while a stream is open, which is the normal way to work: Discovery in one window,
// this in another. Re-read on a slow beat rather than once at mount.
const CONFIG_POLL_MS = 60000;

/** Column keys in the order they are rendered — how a key becomes a cell position. */
const COLUMN_ORDER_LIVE_EVENTS = ["idx", "event", "track", "tested"];

/** What each column is called — in the header and in the Columns menu. One source, so they agree. */
const COLUMN_LABELS_LIVE_EVENTS: Record<string, string> = {
  idx: "#",
  event: "Event / identity",
  track: "Track",
  tested: "Tested",
};

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
/**
 * Columns of the events table, in their default order.
 *
 * The GA4 pair sits immediately after ours because that is the comparison — a column of theirs at
 * the far right of a scrolling table is a number nobody puts next to anything.
 */
const COLUMN_ORDER_SUMMARY = ["idx", "event", "ours", "ga4", "diff", "share", "users", "devices", "perDevice", "lastAt"];
const COLUMN_LABELS_SUMMARY: Record<string, string> = {
  idx: "#",
  event: "Event name (raw)",
  ours: "Ours",
  ga4: "GA4",
  diff: "Difference",
  share: "Share",
  users: "Users",
  devices: "Devices",
  perDevice: "Per device",
  lastAt: "Last seen",
};

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
    /** What the page was narrowed to when this was copied. */
    filter?: string;
  },
): string {
  const head = [
    `# Live Events — ${ctx.invotickId ? `Invotick ID ${ctx.invotickId}, ` : ""}user ${ctx.userId}`,
    // A report that does not say what it was filtered to gets read as everything. This one was:
    // copied while the page showed one version, and taken as the user's whole history.
    `# filter: ${ctx.filter ?? "all versions"}`,
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
    return `${String(i + 1).padStart(3)}  ${dateTimeWithMillis(e.eventTimestamp)}  ${label}\n      screen=${screen || "-"}  params=${params}`;
  });
  return [...head, ...body].join("\n");
}


type SortKey = "recent" | "email" | "count";

/** Which build the list is narrowed to. Applied by the server, not here. */
type BuildFilter = "debug" | "release" | "all";


/**
 * Names that exist in GA4 and can never be in ours, so their absence is not a fault.
 *
 * The ad-mediation wrapper (`core/ads/AdsAnalytics`) talks to Firebase directly and never touches
 * our gateway, and Firebase mints its own lifecycle events. Both show up in a GA4 export. Reading
 * either as "an event we are losing" sends someone hunting for a bug that is a channel boundary.
 */
const GA4_ONLY = new Set([
  "session_start", "first_open", "user_engagement", "app_update", "app_remove",
  "app_exception", "notification_receive", "notification_foreground", "ad_impression",
  "install_referrer",
]);
const isGa4Only = (n: string) => n.startsWith("All_") || n.startsWith("ASE_") || GA4_ONLY.has(n);

/**
 * Reads a GA4 "Events" export into name → count.
 *
 * The export is not a plain CSV: it opens with `#` comment lines carrying the account, property and
 * date range, then a header row, then the data. Feeding the whole file to a naive split puts
 * "# Events" in the table as an event with zero count, so the comments are dropped and the header
 * is found rather than assumed to be line 1.
 */
function parseGa4Csv(text: string): {
  counts: Map<string, number>;
  label: string | null;
  appVersion: string | null;
  from: Date | null;
  to: Date | null;
} {
  const counts = new Map<string, number>();
  let label: string | null = null;
  let appVersion: string | null = null;
  let from: Date | null = null;
  let to: Date | null = null;
  let started = false;
  // GA4 writes the dates as YYYYMMDD with no separators, and they are the filter the numbers below
  // were produced under. Reading them means the table can match the export instead of asking
  // somebody to line up three controls by hand — which is the one mistake that makes every row
  // disagree for a reason that has nothing to do with the app.
  const day = (v: string): Date | null => {
    const m = v.match(/^(\d{4})(\d{2})(\d{2})$/);
    return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
  };
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("#")) {
      const v = line.match(/App version[^,]*?matches\s+(\S+)/i);
      if (v) { appVersion = v[1]; label = line.replace(/^#\s*/, ""); }
      const sd = line.match(/Start date:\s*(\d{8})/i);
      if (sd) from = day(sd[1]);
      const ed = line.match(/End date:\s*(\d{8})/i);
      if (ed) to = day(ed[1]);
      continue;
    }
    if (!started) {
      // The header row, whatever its exact column set — everything after it is data.
      if (/^event name/i.test(line)) { started = true; continue; }
      // Some exports have no header at all; fall through and treat this as data.
    }
    const parts = line.split(",");
    if (parts.length < 2) continue;
    const name = parts[0].trim();
    const count = Number(parts[1]);
    if (!name || !Number.isFinite(count)) continue;
    counts.set(name, (counts.get(name) ?? 0) + count);
    started = true;
  }
  return { counts, label, appVersion, from, to };
}

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
  /**
   * On by default: a user who stopped sending is not what this page is for.
   *
   * The list is already capped at thirty minutes, which is long enough to fill with runs that ended.
   * The box is right there for the moment somebody wants one of them back.
   */
  const [liveOnly, setLiveOnly] = useState(true);
  /**
   * Which build to show: "debug" for the phones doing the testing, "release" for the people using
   * the product, "all" for both. Defaults to debug — this page exists to watch a test run, and four
   * thousand real users in the same list only make that one phone harder to find.
   *
   * This was a checkbox, and a checkbox can only say debug-or-everyone. Watching what a *release*
   * build does — the reason the page was opened at all after 1.4.1 shipped — was not expressible.
   *
   * Both this and [versionFilter] are now applied by the **server**. They were client-side, over a
   * list the server had already capped at 200, and that produced a header reading "3 live" directly
   * above "No matching active users": the count came from the whole list and the rows from the
   * filtered one. The page looked broken while it was merely answering two questions at once.
   */
  /**
   * The range the user list covers. Thirty days by default.
   *
   * It was hard-coded to thirty minutes, which was right while this page only ever watched a phone
   * on the desk and useless for watching a rollout: "who is on 1.4.1" is not a half-hour question.
   * A rolling window could not express "1 to 14 August" either, which is most of what a date
   * control is wanted for.
   */
  const [range, setRange] = useState<DayRange>(defaultRange);
  /**
   * How many rows to ask for. The list was fixed at 200 and silently cut: 199 rows out of at least
   * 999, under a header that read like a population.
   */
  const [pageSize, setPageSize] = useState(200);
  /** What the page is a part of — total, whether it was cut, and what the build filter is hiding. */
  const [meta, setMeta] = useState<{ total: number; truncated: boolean; hiddenNoBuild: number | null }>({
    total: 0,
    truncated: false,
    hiddenNoBuild: null,
  });
  /**
   * The reporting table under the feed: every event name this build sent, not one person's stream.
   *
   * Kept on the same filters as the list above it deliberately. Two controls that look like one
   * control and answer different ranges is the fault this page already had once — the version
   * picker offered less than the list behind it, and the missing option read as "no such version".
   */
  const [summary, setSummary] = useState<EventSummaryPage | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryQuery, setSummaryQuery] = useState("");

  /**
   * The table's own filters, deliberately not the list's.
   *
   * They were shared, and sharing them made one question impossible to ask: the list is normally
   * pinned to a single debug device being tested, while this table is read as a population — "what
   * is the released build sending". One set of controls forced those two into the same answer.
   *
   * Defaulted to release for that reason, which is not the list's default. The section says out
   * loud that its filters are its own, because two tables on one page showing different numbers is
   * alarming until you know why.
   */
  /**
   * The table's own controls, shaped for what it is — a population, not a live feed.
   *
   * Version is held as a NAME, not a build number, because that is the unit GA4 reports in: an
   * export filtered to "1.4.2" covers build 93 and 94 together, and comparing it against one code
   * would show every row short by whatever the other code sent. The codes behind a name are fetched
   * and summed.
   *
   * Defaults are release and the newest version, because that is the question this table is opened
   * to answer. [versionTouched] exists so that default cannot overwrite a choice the user has
   * already made when the version list refreshes underneath them.
   */
  const [sumBuild, setSumBuild] = useState<BuildFilter>("release");
  const [sumVersionNames, setSumVersionNames] = useState<string[]>([]);
  const [versionTouched, setVersionTouched] = useState(false);
  const [sumRange, setSumRange] = useState<DayRange>(defaultRange);
  const [sumSort, setSumSort] = useState<"ours" | "diff" | "name">("ours");
  const [onlyDiff, setOnlyDiff] = useState(false);



  /**
   * A GA4 "Events" export, held in the browser so the two numbers can be read on one row.
   *
   * Kept client-side on purpose: GA4 is a second measurement system, not a second source of truth,
   * and storing its numbers on our server would make them look like ours the moment somebody
   * queried them a month later. Persisted to localStorage so a reload does not throw the file away.
   */
  const [ga4, setGa4] = useState<Map<string, number> | null>(null);
  const [ga4Label, setGa4Label] = useState<string | null>(null);
  const [ga4Error, setGa4Error] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("ga4-events");
      if (!raw) return;
      const saved = JSON.parse(raw) as { label: string | null; counts: [string, number][] };
      setGa4(new Map(saved.counts));
      setGa4Label(saved.label);
    } catch {
      // A corrupt or unreadable entry is not worth a broken page — start without it.
    }
  }, []);

  /**
   * Our rows, plus any name GA4 saw that we did not.
   *
   * Without the union an event we never received simply is not in the table, which reads as "no
   * such event" — the one outcome the comparison exists to make visible. A GA4-only name is drawn
   * with zeros on our side so the gap is a row you can see rather than an absence you must notice.
   */
  const mergedRows = useMemo(() => {
    const rows = summary?.rows ?? [];
    if (!ga4) return rows;
    const have = new Set(rows.map((r) => r.eventName));
    const missing: EventSummaryRow[] = [];
    for (const [name] of ga4) {
      if (have.has(name)) continue;
      missing.push({ eventName: name, events: 0, users: 0, devices: 0, perDevice: 0, lastAt: "" });
    }
    // Sorted by GA4 volume so the biggest thing we are missing is at the top of its group, not
    // buried under a hundred one-off names.
    missing.sort((a, b) => (ga4.get(b.eventName) ?? 0) - (ga4.get(a.eventName) ?? 0));
    return [...rows, ...missing];
  }, [summary, ga4]);
  /**
   * What the table actually draws: merged, searched, optionally narrowed to disagreements, sorted.
   *
   * Kept in one place because the Copy button must hand over exactly what is on screen. Copying an
   * unfiltered table from a filtered view is how a number ends up in a message meaning something
   * other than what the sender was looking at.
   */
  const visibleSummaryRows = useMemo(() => {
    const q = summaryQuery.trim().toLowerCase();
    let rows = mergedRows.filter((r) => r.eventName.toLowerCase().includes(q));
    if (ga4 && onlyDiff) {
      rows = rows.filter((r) => {
        // A GA4-only name has no comparison to fail, so it is not a difference — it is a channel
        // boundary, and leaving it in would fill the list with rows nobody can act on.
        if (isGa4Only(r.eventName)) return false;
        const g = ga4.get(r.eventName);
        if (g == null) return false;
        const d = Math.abs(r.events - g);
        return d >= 3 && (d * 100) / Math.max(g, 1) >= 10;
      });
    }
    const sorted = [...rows];
    if (sumSort === "name") sorted.sort((a, b) => a.eventName.localeCompare(b.eventName));
    else if (sumSort === "diff" && ga4) {
      const gap = (r: EventSummaryRow) => {
        const g = ga4.get(r.eventName);
        return g == null ? -1 : Math.abs(r.events - g);
      };
      sorted.sort((a, b) => gap(b) - gap(a));
    } else sorted.sort((a, b) => b.events - a.events);
    return sorted;
  }, [mergedRows, summaryQuery, ga4, onlyDiff, sumSort]);



  const [buildFilter, setBuildFilter] = useState<BuildFilter>("debug");
  /** null = every version. A versionCode, not a name: names repeat across builds, codes do not. */
  const [versionFilter, setVersionFilter] = useState<number | null>(null);
  const [appVersions, setAppVersions] = useState<AppVersion[]>([]);
  /** True once the user list has arrived — the signal the slower, decorative reads wait for. */
  const [usersLoaded, setUsersLoaded] = useState(false);
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
  const [tick, forceTick] = useState(0);

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
  /**
   * Off by default, on the owner's instruction (2026-08-22) — the same call as on Event Discovery.
   *
   * It shipped on so a re-run showed only what still needed checking. That is right in the middle of
   * a round and wrong on arrival: the page opened holding a fraction of the stream while the header
   * counted all of it, and a list that hides most of itself before being asked is a list nobody
   * trusts.
   */
  const [hideTested, setHideTested] = useState(false);
  /**
   * How many rows the tick-box is holding back.
   *
   * Recomputed on `tick` as well as on the events, because `testedRef` is a ref the config poll
   * fills — without that this number would be right only until somebody ticked something.
   */
  /**
   * Show only what Track is on for. Off by default, so nothing is withheld until it is asked for.
   *
   * This existed once as a filter that hid rows with no way to tell it was doing so, and was removed
   * the same day because the numbers then disagreed with Event Discovery and looked like loss. It is
   * safe now for reasons that had to be built first: the Track column states each row's answer, the
   * row number is taken before filtering so it still means a position in the stream, and the header
   * says how many rows are being held back.
   */
  const [trackedOnly, setTrackedOnly] = useState(false);

  /**
   * The events table has its own column state, under its own key.
   *
   * Sharing the list's would put one table's hidden column on the other, which is the same fault as
   * sharing filters was: two tables that look independent and are not.
   */
  const sumCols = useColumnWidths(
    "events-summary",
    { idx: 44, event: 320, ours: 96, ga4: 96, diff: 140, share: 78, users: 84, devices: 90, perDevice: 100, lastAt: 120 },
    COLUMN_ORDER_SUMMARY,
  );


  /** Column widths, dragged from the header edges and kept across reloads. */
  const { widths: colW, startResize, reset: resetWidths, autoFit, tableRef, order: colOrder, hidden: colHidden, visibleOrder, toggleColumn, moveColumnTo } = useColumnWidths("live-events", {
    idx: 44,
    event: 420,
    track: 96,
    tested: 104,
  }, COLUMN_ORDER_LIVE_EVENTS);

  /**
   * The rows drawn, numbered before anything is filtered.
   *
   * Recomputed on `tick` as well, because `testedRef` and `trackedRef` are refs the config poll
   * fills — without it these lists would be right only until somebody changed something elsewhere.
   */
  const visibleRows = useMemo(
    () =>
      events
        .map((e, idx) => ({ e, n: events.length - idx }))
        .filter(({ e }) => !hideTested || !testedRef.current.has(identityOf(e)))
        .filter(({ e }) => !trackedOnly || trackedRef.current.set.has(identityOf(e))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [events, hideTested, trackedOnly, tick],
  );

  const hiddenCount = events.length - visibleRows.length;


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
    // Held back until the list is on screen. These two decorate rows that do not exist yet — display
    // names for a stream nobody has selected — and on a cold load they were leaving at the same
    // moment as the two aggregates the page is actually waiting for, taking server time from them.
    // Measured with all four together: 6.1s and 6.7s. Measured out of their way: under a second.
    if (!usersLoaded) return;
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
  }, [usersLoaded]);

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
        // One request. The build filter used to need a second one — a separate list of debug
        // devices, fetched on its own schedule and intersected here — and every problem that
        // arrangement had came from the two lists disagreeing: a phone that started sending after
        // the set was captured stayed invisible until the set refreshed, while the header, which
        // counted the unfiltered list, cheerfully reported it as live. The server applies the
        // filter now, so there is one list and it cannot disagree with itself.
        //
        // The two config reads are deliberately still not in here: they decorate rows that do not
        // exist yet.
        const iso = toRangeIso(range);
        const page = await api.getActiveUsers(
          pageSize,
          buildFilter,
          versionFilter ?? undefined,
          iso.from,
          iso.to,
        );
        if (!cancelled) {
          setActiveUsers(page.users);
          setMeta({
            total: page.total,
            truncated: page.truncated,
            hiddenNoBuild: page.hiddenWithoutBuildType,
          });
          setUsersError("");
          setUsersLoaded(true);
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
    // The filters belong here: changing one changes what the server is being asked for, so the
    // poll has to restart rather than keep fetching the previous question until the next tick.
  }, [router, handleUnauthorized, buildFilter, versionFilter, range, pageSize]);
  /**
   * Version names available in the table's own range, newest first, each carrying its build numbers.
   *
   * Fetched from this range and not the list's: a picker offering fewer versions than the view
   * behind it makes the missing option read as "no such version", and with the two ranges now
   * independent that gap could open up again.
   */
  const [sumVersions, setSumVersions] = useState<AppVersion[]>([]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const iso = toRangeIso(sumRange);
        const versions = await api.getAppVersions(iso.from, iso.to);
        if (!cancelled) setSumVersions(versions);
      } catch {
        // The numbers below are still readable without the picker.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sumRange]);

  /** name -> the build numbers reporting under it, newest first. */
  const versionGroups = useMemo(() => {
    const m = new Map<string, number[]>();
    for (const v of sumVersions) {
      if (!v.appVersion) continue;
      const list = m.get(v.appVersion) ?? [];
      list.push(v.appVersionCode);
      m.set(v.appVersion, list);
    }
    return m;
  }, [sumVersions]);

  // Land on the newest version rather than on everything: "all versions" mixes a build being
  // rolled out with the one it replaced, and every rate read off that mixture is an average of two
  // different apps. Only until the user picks something.
  useEffect(() => {
    if (versionTouched || sumVersionNames.length > 0) return;
    const newest = sumVersions.find((v) => v.appVersion)?.appVersion;
    if (newest) setSumVersionNames([newest]);
  }, [sumVersions, versionTouched, sumVersionNames]);

  // Reporting table. One request per build number behind the chosen name, summed — see the note on
  // sumVersionName for why a name and not a number.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setSummaryLoading(true);
      setSummaryError(null);
      try {
        const iso = toRangeIso(sumRange);
        // Several names can be on at once, so the codes behind them are unioned. Deduped because
        // two names could in principle report the same build number, and asking for it twice would
        // double every count under it.
        const codes = [
          ...new Set(sumVersionNames.flatMap((n) => versionGroups.get(n) ?? [])),
        ];
        const pages = codes.length
          ? await Promise.all(codes.map((c) => api.getEventSummary(iso.from, iso.to, c, sumBuild)))
          : [await api.getEventSummary(iso.from, iso.to, undefined, sumBuild)];

        const byName = new Map<string, EventSummaryRow>();
        for (const page of pages) {
          for (const r of page.rows) {
            const prev = byName.get(r.eventName);
            if (!prev) { byName.set(r.eventName, { ...r }); continue; }
            prev.events += r.events;
            // Users and devices are distinct counts per build, so adding them can double-count
            // anyone who upgraded mid-range. Max is the honest floor: never fewer than the largest
            // build saw, never a sum that claims more people than exist.
            prev.users = Math.max(prev.users, r.users);
            prev.devices = Math.max(prev.devices, r.devices);
            prev.perDevice = prev.devices > 0 ? prev.events / prev.devices : 0;
            if (r.lastAt > prev.lastAt) prev.lastAt = r.lastAt;
          }
        }
        const rows = [...byName.values()].sort((a, b) => b.events - a.events);
        if (!cancelled) {
          setSummary({
            rows,
            totalEvents: rows.reduce((n, r) => n + r.events, 0),
            distinctNames: rows.length,
          });
        }
      } catch (err) {
        if (!cancelled && !handleUnauthorized(err)) {
          setSummaryError(getErrorMessage(err, "Could not load the event summary."));
        }
      } finally {
        if (!cancelled) setSummaryLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [handleUnauthorized, sumBuild, sumVersionNames, versionGroups, sumRange]);

  /** The event whose breakdown is open, and what came back for it. */
  const [detailFor, setDetailFor] = useState<string | null>(null);
  const [detail, setDetail] = useState<EventDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    if (!detailFor) return;
    let cancelled = false;
    (async () => {
      setDetailLoading(true);
      setDetailError(null);
      setDetail(null);
      try {
        const iso = toRangeIso(sumRange);
        // One build number at a time. The dialog says which one it is showing, because a breakdown
        // summed across two builds cannot answer "did the new version change this", which is the
        // reason to open it.
        const codes = [...new Set(sumVersionNames.flatMap((n) => versionGroups.get(n) ?? []))];
        const d = await api.getEventDetail(detailFor, iso.from, iso.to, codes[0], sumBuild);
        if (!cancelled) setDetail(d);
      } catch (err) {
        if (!cancelled && !handleUnauthorized(err)) {
          setDetailError(getErrorMessage(err, "Could not load that event."));
        }
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [detailFor, sumRange, sumVersionNames, versionGroups, sumBuild, handleUnauthorized]);

  // Escape closes it. A dialog that can only be dismissed by finding its button is a dialog people
  // reload the page to get out of.
  useEffect(() => {
    if (!detailFor) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setDetailFor(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [detailFor]);



  /**
   * The version picker's options, refreshed far more slowly than the user list.
   *
   * A day-long window rather than the list's thirty minutes: a version that stopped reporting an
   * hour ago is still one somebody may want to look back at, and an option list that empties itself
   * while being read is worse than one that is slightly generous.
   */
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const iso = toRangeIso(range);
        const versions = await api.getAppVersions(iso.from, iso.to);
        if (!cancelled) setAppVersions(versions);
      } catch {
        // A missing picker is not worth an error banner over the list it sits above; the list is
        // what the page is for, and it is unaffected.
      }
    }
    load();
    const t = setInterval(load, 5 * 60_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
    // The range belongs here: change it and the set of versions worth offering changes with it.
  }, [range]);

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
        // The first fetch asks for the cap, every one after it for a page.
        //
        // Heartbeats dominate the raw stream and are dropped before anything is drawn — measured on
        // this device, 85 of the newest 100 events were heartbeats, so the page opened holding 15
        // while Event Discovery counted 74 for the same user and the two looked like they disagreed.
        // At 500 the same request returns 343 rows, 269 of them heartbeats, and the 74 that remain
        // are exactly what Discovery counts. Later polls are incremental and 100 is more than a few
        // seconds can produce.
        const first = sinceRef.current === null;
        const batch = await api.getLiveEvents(selectedRef.current, sinceRef.current ?? undefined, first ? 500 : 100, versionFilter ?? undefined);
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
    // versionFilter belongs here: it changes what the stream is being asked for, so the poll
    // has to restart rather than keep appending to a stream built under the previous filter.
  }, [selectedId, handleUnauthorized, versionFilter]);

  /**
   * Chosen once, and then left alone.
   *
   * Landing on "select a user" while a run is in the list is landing nowhere — so the live test
   * phone is opened on arrival. But only ever once: a second phone joining while the first is being
   * watched must not pull the stream out from under it, which is why this is a ref and not a
   * dependency. Switching remains a click.
   */
  const autoSelected = useRef(false);
  useEffect(() => {
    if (autoSelected.current || selectedId || activeUsers.length === 0) return;
    // The list is already narrowed to whatever build was asked for, so the newest row in it is the
    // right one to open. This used to intersect a separately-fetched debug set, and did nothing at
    // all until that set arrived.
    const candidates = [...activeUsers].sort((a, b) => (a.lastEventAt < b.lastEventAt ? 1 : -1));
    const newest = candidates[0];
    if (!newest || liveState(newest.lastEventAt) !== "live") return;
    autoSelected.current = true;
    selectUser(newest.userId);
    // selectUser is stable enough for this: it closes over setters, and adding it would re-run the
    // effect on every render — which is the one thing this must not do.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUsers, selectedId]);

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
      // Build and version are not filtered here: the server already applied them, before the limit.
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUsers, search, roleFilter, liveOnly, sortBy]);

  /** What the page is narrowed to right now, in words — for the copied report's header. */
  const filterLabel = useMemo(() => {
    const v = appVersions.find((a) => a.appVersionCode === versionFilter);
    const version = versionFilter == null
      ? "all versions"
      : `${v?.appVersion ?? "?"} (${versionFilter})`;
    return `build ${buildFilter}, ${version}, ${formatDay(range.from)} to ${formatDay(range.to)}`;
  }, [buildFilter, versionFilter, appVersions, range]);

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
                Live users <span className="le-livecount">{liveCount} live</span> ·{" "}
                {meta.truncated ? (
                  <span title={`Showing ${activeUsers.length} of ${meta.total}. Raise the row count below to see more.`}>
                    {activeUsers.length} of {meta.total}
                  </span>
                ) : (
                  <>{meta.total || activeUsers.length} active</>
                )}
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
              <select
                className="input"
                value={buildFilter}
                onChange={(e) => setBuildFilter(e.target.value as BuildFilter)}
                title="Which build to show. Debug is the phones a test round is done on; release is the people actually using the product."
              >
                <option value="debug">Build: debug</option>
                <option value="release">Build: release</option>
                <option value="all">Build: all</option>
              </select>
              <select
                className="input"
                value={versionFilter == null ? "all" : String(versionFilter)}
                onChange={(e) =>
                  setVersionFilter(e.target.value === "all" ? null : Number(e.target.value))
                }
                title="App version, by build number. Only versions that reported in the last 24 hours are listed."
              >
                <option value="all">All versions</option>
                {appVersions.map((v) => (
                  <option key={v.appVersionCode} value={v.appVersionCode}>
                    {v.appVersion ?? "—"} ({v.appVersionCode}) · {v.users}
                  </option>
                ))}
              </select>
              <DateRangePicker value={range} onChange={setRange} />
              <select
                className="input"
                value={String(pageSize)}
                onChange={(e) => setPageSize(Number(e.target.value))}
                title="How many rows to load. Higher is slower to render, not slower to fetch."
              >
                {[50, 100, 200, 500, 1000, 2000, 5000].map((n) => (
                  <option key={n} value={n}>
                    Show {n}
                  </option>
                ))}
              </select>
              <label className="le-check">
                <input type="checkbox" checked={liveOnly} onChange={(e) => setLiveOnly(e.target.checked)} />
                Live only
              </label>
            </div>

            {/* A filter that hides people should say how many. Over seven days this was 451 of
                632 — the builds that shipped before build_type was stamped on every event. */}
            {meta.hiddenNoBuild ? (
              <p className="le-hidden-note">
                {meta.hiddenNoBuild} user{meta.hiddenNoBuild === 1 ? "" : "s"} in this range report no
                build type and are in neither list. Set Build to “all” to include them.
              </p>
            ) : null}
            {usersError ? <p className="error-text">{usersError}</p> : null}

            <div className="le-userlist">
              <div className="le-user-headrow">
                <span>User</span>
                <span>Role</span>
                <span>Country</span>
                <span>Build</span>
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
                  {/*
                    Shown rather than only filterable. "Which version is this person on" is asked far
                    more often than it is filtered on, and answering it by narrowing the list hides
                    every other row to read one field.
                  */}
                  <span
                    className="le-build"
                    title={
                      u.appVersion || u.buildType
                        ? `${u.appVersion ?? "unknown version"} (${u.appVersionCode ?? "?"}) · ${u.buildType ?? "build unknown"}`
                        : "This build reported no version"
                    }
                  >
                    {u.appVersion ?? "—"}
                    {u.buildType === "debug" ? <span className="le-dbg">dbg</span> : null}
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
                      {/* Said out loud for the same reason the window is: a count that does not match
                          what is on screen sends someone looking for a fault. Twenty-eight rows
                          hidden by a tick-box read as twenty-eight events lost. */}
                      {hiddenCount > 0 ? (
                        <> · <span className="live-hidden-note">{hiddenCount} hidden by filters</span></>
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
                            filter: filterLabel,
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
                            filter: filterLabel,
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
                    <label
                      className="le-check"
                      title="Show only events with Track switched on in Event Discovery. Off by default — with it off, everything the debug build emits is here, including events nobody has catalogued yet, which is the only place those can be spotted."
                      style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}
                    >
                      <input type="checkbox" checked={trackedOnly} onChange={(e) => setTrackedOnly(e.target.checked)} />
                      Tracked only
                    </label>
                    <button className="btn btn-outline" onClick={() => setPaused((p) => !p)}>
                      {paused ? "Resume" : "Pause"}
                    </button>
                    <button
                      className="btn btn-outline"
                      onClick={async () => {
                        if (!selectedRef.current) return;
                        // The dialog names the scope the button actually has. It used to say "ALL"
                        // while the page was filtered to one version, so twenty visible rows and
                        // three and a half months of history were the same click.
                        const scope =
                          versionFilter == null
                            ? "ALL of this user's events, every version"
                            : `this user's events from ${appVersions.find((a) => a.appVersionCode === versionFilter)?.appVersion ?? "?"} (${versionFilter}) only`;
                        if (!confirm(`Permanently delete ${scope}? They will NOT reappear.`)) return;
                        try {
                          await api.clearLiveEvents(selectedRef.current, versionFilter ?? undefined);
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
                    {/* Last on the row, at the table's own top-right. It shapes the table;
                        everything to its left changes what is in it. */}
                    <ColumnsMenu
                      labels={COLUMN_LABELS_LIVE_EVENTS}
                      order={colOrder}
                      hidden={colHidden}
                      onToggle={toggleColumn}
                      onMoveTo={moveColumnTo}
                      onReset={resetWidths}
                    />
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
                  // A real table, like Event Discovery's. The two pages are read side by side, and a
                  // list whose columns are never named has to be decoded again on every glance
                  // across. The header is sticky for the reason it exists at all: this list is long.
                  <div className="live-table-wrap">
                    <table ref={tableRef} className="live-table">
                      {/* Widths live here rather than on each <th>, because a column's width is a
                          property of the column and not of its heading — and with table-layout fixed
                          this is the only thing the browser reads. */}
                      <colgroup>
                        {visibleOrder.map((k) => (
                          <col key={k} style={{ width: colW[k] }} />
                        ))}
                      </colgroup>
                      <thead>
                        <tr>
                          {visibleOrder.map((k) => (
                            <th
                              key={k}
                              className="live-th"
                              style={{
                                position: "relative",
                                ...(k === "idx" ? { textAlign: "right" as const, cursor: "pointer" } : {}),
                              }}
                              onDoubleClick={k === "idx" ? resetWidths : undefined}
                              title={k === "idx" ? "Double-click to put every column back." : undefined}
                            >
                              {COLUMN_LABELS_LIVE_EVENTS[k]}
                              <span
                                className={RESIZE_HANDLE_CLASS}
                                title="Drag to resize. Double-click to fit the column to its contents."
                                onMouseDown={(e) => startResize(k, e)}
                                onDoubleClick={(e) => {
                                  e.stopPropagation();
                                  autoFit(k);
                                }}
                              />
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                    {visibleRows.map(({ e, n }, i) => {
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
                      const cells: Record<string, React.ReactNode> = {
                        /* The newest event gets the HIGHEST number, so a row keeps the number it
                            was given. Numbering from the top instead meant every row was renumbered
                            each time an event arrived, which makes the number useless for the one
                            thing it is for — pointing at a row. */
                        idx: (
<td key="idx" className="live-idx">{n}</td>
                        ),
                        /* Name on its own line, everything about it underneath. Five columns of
                            equal weight made the eye hunt for the one thing being looked for — the
                            event — and left the row too wide to sit beside Event Discovery on one
                            screen. Time, screen and parameters are what you read *after* finding the
                            row, so they belong under it rather than beside it. */
                        event: (
<td key="event" className="live-main">
                          <span className="live-name">{nameCol}</span>
                          {/* Same shape as the identity cell in Event Discovery: screen, then time,
                              separated by gap rather than punctuation. The two pages are read side by
                              side, and a row that arranges the same facts differently makes you
                              re-learn it every time you look across. */}
                          <span className="live-meta">
                            {detailCol ? <span className="live-loc">{detailCol}</span> : null}
                            {e.previousScreen ? <span className="live-loc">← {e.previousScreen}</span> : null}
                            <EventTime iso={e.eventTimestamp} />
                            {/* Loud on purpose: an event with no session is missing the thing that
                                joins it to everything else the user did. */}
                            {e.sessionId ? null : <span className="live-nosession">⚠️ no-session</span>}
                            {e.params && Object.keys(e.params).length > 0 ? (
                              <button
                                className="live-params-btn"
                                onClick={() => setExpanded(expanded === `${e.id}-${i}` ? null : `${e.id}-${i}`)}
                              >
                                {expanded === `${e.id}-${i}` ? "hide" : "params"}
                              </button>
                            ) : null}
                          </span>
                          {/* Under the event it belongs to, not loose in the row. */}
                          {expanded === `${e.id}-${i}` && e.params ? (
                            <pre className="live-params">{JSON.stringify(e.params, null, 2)}</pre>
                          ) : null}
                        </td>
                        ),
                        /* Track's answer, shown where the events are — the switch stays in Event
                            Discovery. Showing it here and deciding it there is deliberate: one place
                            to change a thing and every place to see it, so the stream can be read
                            without holding the other window's state in your head. Nothing is
                            filtered out for being off; a row nobody has catalogued yet is exactly
                            the row worth noticing, and this page is where it first appears. */
                        track: (
<td key="track" className="live-cell-center">
                          {/* "on" / "off", not "track on" / "track off" — the column is already
                              called Track, and a cell that repeats its own heading on every row
                              spends the width that made the heading affordable. */}
                          <span
                            className="live-track"
                            data-on={trackedRef.current.set.has(ident)}
                            data-loaded={trackedRef.current.loaded}
                            title={
                              !trackedRef.current.loaded
                                ? "Loading Track settings…"
                                : trackedRef.current.set.has(ident)
                                  ? "Track is ON — this event sends from release builds too. Change it in Event Discovery."
                                  : "Track is OFF — debug builds only. Change it in Event Discovery."
                            }
                          >
                            {trackedRef.current.set.has(ident) ? "● on" : "○ off"}
                          </span>
                        </td>
                        ),
                        tested: (
<td key="tested" className="live-cell-check">
                          {/* Accepting from here, rather than only from Discovery, because this is
                              the page that has the parameters — the richer half of the baseline. */}
                          {/* A checkbox, because Event Discovery's Tested column is one — the same
                              answer to the same question, given the same way on both pages. The
                              label fills the cell so the whole cell is the target, not a word in it. */}
                          <label
                            className="live-check-label"
                            title={
                              testedRef.current.has(identityOf(e))
                                ? "Accepted. Click to withdraw."
                                : "Accept this event as correct, recording its parameter keys and how many times it fired in this run"
                            }
                          >
                          <input
                            type="checkbox"
                            checked={testedRef.current.has(identityOf(e))}
                            onChange={async () => {
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
                          />
                          </label>
                        </td>
                        ),
                      };
                      return (
                      <tr key={`${e.id}-${i}`} className={`live-row live-${eventKind(e.eventName)}`}>
                        {/* Drawn in the order chosen in the Columns menu, and only what was kept. */}
                        {visibleOrder.map((k) => cells[k])}
                      </tr>
                      );
                      })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
        {/* Reporting table — what this build is sending, underneath what one person is doing. */}
        <section className="content-wrap">
          <div className="section-card">
            <div className="le-left-head">
              <h2>
                Events sent{" "}
                <span className="muted">
                  {summary ? `${summary.distinctNames} names · ${summary.totalEvents.toLocaleString()} events` : ""}
                </span>
              </h2>
            </div>
            <p className="muted-line">
              Raw event names, exactly as the app sends them — not the display names shown in the
              feed above. <strong>This table has its own filters</strong>, so it can be read as a
              population while the list above stays pinned to one device.
            </p>

            <div className="le-filters">
              <select
                className="input"
                value={sumBuild}
                onChange={(e) => setSumBuild(e.target.value as BuildFilter)}
                title="Which build to count. Release is the people actually using the product."
              >
                <option value="release">Build: release</option>
                <option value="debug">Build: debug</option>
                <option value="all">Build: all</option>
              </select>
              <DateRangePicker value={sumRange} onChange={setSumRange} />
              <select
                className="input"
                value={sumSort}
                onChange={(e) => setSumSort(e.target.value as "ours" | "diff" | "name")}
                title="What to put at the top."
              >
                <option value="ours">Sort: volume</option>
                <option value="diff">Sort: biggest gap</option>
                <option value="name">Sort: name</option>
              </select>
              {ga4 && (
                <label className="le-check" title="Hide every row where the two systems agree.">
                  <input type="checkbox" checked={onlyDiff} onChange={(e) => setOnlyDiff(e.target.checked)} />
                  Only differences
                </label>
              )}
              <ColumnsMenu
                labels={COLUMN_LABELS_SUMMARY}
                order={sumCols.order}
                hidden={sumCols.hidden}
                onToggle={sumCols.toggleColumn}
                onMoveTo={sumCols.moveColumnTo}
                onReset={sumCols.reset}
              />
              <button
                className="ga4-clear"
                title="Copy exactly what is on screen, as TSV."
                onClick={() => {
                  const head = ga4 ? "event\tours\tga4\tdiff\tusers\tdevices" : "event\tours\tusers\tdevices";
                  const body = visibleSummaryRows
                    .map((r) => {
                      const g = ga4?.get(r.eventName);
                      return ga4
                        ? `${r.eventName}\t${r.events}\t${g ?? ""}\t${g != null ? r.events - g : ""}\t${r.users}\t${r.devices}`
                        : `${r.eventName}\t${r.events}\t${r.users}\t${r.devices}`;
                    })
                    .join("\n");
                  copyText(`${head}\n${body}`);
                }}
              >
                Copy
              </button>
            </div>

            {/* Versions as toggles rather than a dropdown: one or several, and which ones is
                readable without opening anything. A single-select cannot answer "did 1.4.2 change
                this from 1.4.1", which is most of why anyone opens this table. */}
            <div className="ver-chips">
              <button
                className={`ver-chip${sumVersionNames.length === 0 ? " ver-chip-on" : ""}`}
                onClick={() => { setVersionTouched(true); setSumVersionNames([]); }}
                title="Every version in range, added together."
              >
                All versions
              </button>
              {[...versionGroups].map(([name, codes]) => {
                const on = sumVersionNames.includes(name);
                return (
                  <button
                    key={name}
                    className={`ver-chip${on ? " ver-chip-on" : ""}`}
                    title={`Build ${codes.join(", ")}. GA4 reports this as one version; the builds behind it are summed.`}
                    onClick={() => {
                      setVersionTouched(true);
                      setSumVersionNames((cur) =>
                        cur.includes(name) ? cur.filter((n) => n !== name) : [...cur, name],
                      );
                    }}
                  >
                    {name} <span className="ver-chip-codes">({codes.join(", ")})</span>
                  </button>
                );
              })}
            </div>

            {/* GA4 comparison. Loaded from a file rather than fetched: GA4 is a second measurement
                system, and a number of ours sitting beside a number of theirs is the only way to
                see which events disagree — the totals matched to 0.3% while individual events were
                out by 2x in both directions. */}
            <div className="ga4-bar">
              <label className="ga4-upload">
                {ga4 ? "Replace GA4 export" : "Compare with GA4 export…"}
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (!file) return;
                    setGa4Error(null);
                    try {
                      const { counts, label, appVersion, from, to } = parseGa4Csv(await file.text());
                      if (counts.size === 0) {
                        setGa4Error("No event rows found in that file.");
                        return;
                      }
                      setGa4(counts);
                      setGa4Label(label ?? file.name);
                      localStorage.setItem(
                        "ga4-events",
                        JSON.stringify({ label: label ?? file.name, counts: [...counts] }),
                      );
                      // The export states the filters it was produced under, so match them instead
                      // of asking somebody to line up three controls by hand. Mismatched filters
                      // make every row disagree for a reason that has nothing to do with the app,
                      // and that is the one way this comparison can quietly mislead.
                      if (from && to) setSumRange({ from, to });
                      if (appVersion) {
                        setVersionTouched(true);
                        setSumVersionNames([appVersion]);
                      }
                    } catch {
                      setGa4Error("That file could not be read as a GA4 export.");
                    }
                  }}
                />
              </label>
              {ga4 && (
                <>
                  <span className="muted">
                    {ga4.size} GA4 names · {ga4Label}
                  </span>
                  <button
                    className="ga4-clear"
                    onClick={() => {
                      setGa4(null);
                      setGa4Label(null);
                      localStorage.removeItem("ga4-events");
                    }}
                  >
                    Clear
                  </button>
                </>
              )}
              {ga4Error && <span className="error-text">{ga4Error}</span>}
            </div>
            {ga4 && (
              <p className="muted-line">
                Date range and version were set from the export&apos;s own header, so the two sides
                cover the same thing. Build stays yours — GA4 does not record it. Rows marked <em>GA4 only</em> reach Firebase through
                the ads SDK or Firebase&apos;s own lifecycle and never come to us — their absence is
                a channel boundary, not a loss.
              </p>
            )}

            <input
              className="le-search"
              placeholder="Filter event name…"
              value={summaryQuery}
              onChange={(e) => setSummaryQuery(e.target.value)}
            />
            {summaryError ? (
              <p className="error-text">{summaryError}</p>
            ) : summaryLoading && !summary ? (
              <p className="muted-line">Loading…</p>
            ) : !summary || summary.rows.length === 0 ? (
              <p className="muted-line">No events in this range.</p>
            ) : (
              <div className="live-table-wrap">
                <table ref={sumCols.tableRef} className="live-table sum-table">
                  <colgroup>
                    {sumCols.visibleOrder.map((k) => (
                      <col key={k} style={{ width: sumCols.widths[k] }} />
                    ))}
                  </colgroup>
                  <thead>
                    <tr>
                      {sumCols.visibleOrder.map((k) => (
                        <th
                          key={k}
                          className="live-th"
                          style={{ position: "relative", ...(k === "idx" ? { cursor: "pointer" } : {}) }}
                          onDoubleClick={k === "idx" ? sumCols.reset : undefined}
                          title={k === "idx" ? "Double-click to put every column back." : undefined}
                        >
                          {COLUMN_LABELS_SUMMARY[k]}
                          <span
                            className={RESIZE_HANDLE_CLASS}
                            title="Drag to resize. Double-click to fit the column to its contents."
                            onMouseDown={(e) => sumCols.startResize(k, e)}
                            onDoubleClick={(e) => { e.stopPropagation(); sumCols.autoFit(k); }}
                          />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleSummaryRows.map((r, i) => {
                      const g = ga4?.get(r.eventName);
                      const onlyGa4 = isGa4Only(r.eventName);
                      const diff = g != null ? r.events - g : null;
                      const pct = g != null && g > 0 ? (Math.abs(diff!) * 100) / g : null;
                      // Loud only when it matters: a 1-vs-2 gap is noise, a 35% gap on 30 events is
                      // a measurement to chase. Both conditions, never either.
                      const notable = diff != null && Math.abs(diff) >= 3 && (pct ?? 0) >= 10;
                      const cells: Record<string, React.ReactNode> = {
                        idx: <td key="idx" className="muted">{i + 1}</td>,
                        event: (
                          <td key="event">
                            <code>{r.eventName}</code>
                            {ga4 && onlyGa4 && <span className="ga4-tag">GA4 only</span>}
                          </td>
                        ),
                        ours: <td key="ours">{r.events.toLocaleString()}</td>,
                        ga4: <td key="ga4">{g != null ? g.toLocaleString() : "—"}</td>,
                        diff: (
                          <td key="diff" className={notable && !onlyGa4 ? "ga4-diff-notable" : "muted"}>
                            {diff == null
                              ? "—"
                              : diff === 0
                                ? "same"
                                : `${diff > 0 ? "+" : ""}${diff.toLocaleString()}${pct != null ? ` (${pct.toFixed(0)}%)` : ""}`}
                          </td>
                        ),
                        share: (
                          <td key="share" className="muted">
                            {summary.totalEvents > 0
                              ? `${((r.events / summary.totalEvents) * 100).toFixed(1)}%`
                              : "—"}
                          </td>
                        ),
                        users: <td key="users">{r.users.toLocaleString()}</td>,
                        devices: <td key="devices">{r.devices.toLocaleString()}</td>,
                        perDevice: <td key="perDevice">{r.perDevice.toFixed(1)}</td>,
                        lastAt: <td key="lastAt" className="muted">{r.lastAt ? relTime(r.lastAt) : "—"}</td>,
                      };
                      return (
                        <tr
                          key={r.eventName}
                          className="live-row sum-row"
                          // Rows we never received have nothing to break down; opening a dialog that
                          // can only say "nothing here" is worse than the row not being clickable.
                          onClick={r.events > 0 ? () => setDetailFor(r.eventName) : undefined}
                          title={r.events > 0 ? "Open the parameter breakdown" : "Not received here — nothing to break down"}
                          style={r.events > 0 ? undefined : { cursor: "default", opacity: 0.65 }}
                        >
                          {sumCols.visibleOrder.map((k) => cells[k])}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* Parameter breakdown. A count tells you an event fired; this tells you what those firings
            were, which is where a number becomes something to act on. */}
        {detailFor && (
          <div className="ev-modal-scrim" onClick={() => setDetailFor(null)}>
            <div
              className="ev-modal"
              role="dialog"
              aria-modal="true"
              aria-label={`Breakdown of ${detailFor}`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="ev-modal-head">
                <div>
                  <h3><code>{detailFor}</code></h3>
                  <p className="muted-line">
                    {detail
                      ? `${detail.events.toLocaleString()} events · ${detail.users.toLocaleString()} users · ${detail.devices.toLocaleString()} devices`
                      : detailLoading
                        ? "Loading…"
                        : ""}
                    {" · "}
                    {sumBuild}
                    {sumVersionNames.length > 0 ? ` · ${sumVersionNames.join(", ")}` : " · all versions"}
                  </p>
                </div>
                <button className="ev-modal-close" onClick={() => setDetailFor(null)} title="Close (Esc)">
                  ✕
                </button>
              </div>

              <div className="ev-modal-body">
                {detailError ? (
                  <p className="error-text">{detailError}</p>
                ) : detailLoading ? (
                  <p className="muted-line">Loading…</p>
                ) : !detail || detail.params.length === 0 ? (
                  <p className="muted-line">This event carries no parameters.</p>
                ) : (
                  detail.params.map((p) => (
                    <div key={p.key} className="ev-param">
                      <div className="ev-param-head">
                        <code>{p.key}</code>
                        <span className="muted">
                          {p.truncated
                            ? `top ${p.values.length} of many`
                            : `${p.values.length} value${p.values.length === 1 ? "" : "s"}`}
                        </span>
                      </div>
                      <table className="live-table ev-param-table">
                        <tbody>
                          {p.values.map((v) => (
                            <tr key={v.value}>
                              <td className="ev-param-val">
                                {/* An absent key is a finding, not a value — it reads differently
                                    and should look different. */}
                                {v.value === "(absent)" ? <em className="muted">not sent</em> : <code>{v.value}</code>}
                              </td>
                              <td className="ev-param-bar">
                                {/* The bar is the share, so a long tail is readable at a glance
                                    without reading every number. */}
                                <span className="ev-bar" style={{ width: `${Math.max(v.share, 0.5)}%` }} />
                              </td>
                              <td className="ev-param-n">{v.events.toLocaleString()}</td>
                              <td className="ev-param-pct muted">{v.share.toFixed(1)}%</td>
                              <td className="ev-param-u muted">{v.users.toLocaleString()} users</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {p.truncated && (
                        <p className="muted-line ev-param-note">
                          Cut at {p.values.length}. A parameter with more distinct values than this is
                          an id, not a dimension — the ones below the cut are not a tail worth reading.
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
