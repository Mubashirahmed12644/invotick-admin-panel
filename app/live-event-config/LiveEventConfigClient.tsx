"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RESIZE_HANDLE_CLASS, useColumnWidths } from "@/lib/useColumnWidths";
import { ColumnsMenu } from "@/components/ColumnsMenu";
import Link from "next/link";
import { api, type EventDiscoveryItem, type DebugDevice } from "@/lib/api";
import { EventTime, timeWithMillis } from "@/lib/eventTime";
import { copyText, downloadText, fileStamp } from "@/lib/clipboard";

// Per-row unsaved edits, so the live refresh never clobbers what the admin is typing.
interface Draft {
  tracked?: boolean;
  /** Switched off deliberately. Under the denylist this is what decides whether release sends it. */
  denied?: boolean;
  displayName?: string;
  replaceName?: string;
  layer?: string;
}

const REFRESH_MS = 4000;

/** The editable half of a row — everything a person types, as opposed to what the app reports. */
type SavedConfig = {
  tracked: boolean;
  denied: boolean;
  layer: string | null;
  displayName: string | null;
  replaceName: string | null;
};

const norm = (v: string | null | undefined) => (v ?? "").trim();

/**
 * Keep a just-saved row showing what was saved until a poll actually returns it.
 *
 * Config changes when a person types; firings and lastSeen change every second. Hanging both on the
 * same 4-second poll meant the fast half overwrote the slow half: `save()` cleared the draft, the
 * next poll replaced the list, and the row fell back to whatever discovery said. If the read did not
 * find the config the write had stored, the field went blank with no error anywhere — the write had
 * succeeded, so nothing had failed loudly enough to report.
 *
 * So hold the saved values, compare them against each poll, and drop them the moment the server
 * agrees. While they disagree the row keeps the saved value and is marked, which turns a silent
 * blanking into a visible statement about which side is wrong.
 */
function applyPending(
  rows: EventDiscoveryItem[],
  pending: Record<string, SavedConfig>,
): EventDiscoveryItem[] {
  if (Object.keys(pending).length === 0) return rows;
  return rows.map((row) => {
    const saved = pending[row.eventName];
    if (!saved) return row;
    const echoed =
      row.tracked === saved.tracked &&
      row.denied === saved.denied &&
      norm(row.layer) === norm(saved.layer) &&
      norm(row.displayName) === norm(saved.displayName) &&
      norm(row.replaceName) === norm(saved.replaceName);
    if (echoed) {
      delete pending[row.eventName];
      return row;
    }
    return { ...row, ...saved, unconfirmed: true };
  });
}

// Classify a discovered event: screen-view vs a click/action event. Screen views are emitted as
// screen_view / nav_screen_view, or named "<Something>_Scr" via trackScreen.
function eventType(name: string): "screen" | "action" {
  const n = name.toLowerCase();
  if (
    n.startsWith("screen:") ||
    n === "screen_view" ||
    n === "nav_screen_view" ||
    n.endsWith("_scr") ||
    n.includes("screen_view")
  ) {
    return "screen";
  }
  return "action";
}

// Constrain a display name to the analytics naming convention as the admin types: lowercase
// snake_case, letters/digits/underscores only, must start with a letter, max 40 chars.
/** Column keys in the order they are rendered — how a key becomes a cell position. */
const COLUMN_ORDER_EVENT_DISCOVERY = [
  "idx", "tested", "track", "live", "identity", "count", "layer", "replace", "actions",
];

/** What each column is called in the Columns menu. Short, because the menu is a list, not a header. */
const COLUMN_LABELS_EVENT_DISCOVERY: Record<string, string> = {
  idx: "#",
  tested: "Tested",
  track: "Sending",
  live: "Meaningful event name",
  identity: "Events from apps",
  count: "Firings",
  layer: "Layer",
  replace: "Replace name",
  actions: "Save",
};

const SELECTED_USER_KEY = "webpanel_discovery_user";

/**
 * How recent an event has to be for a run to count as live.
 *
 * The list already stops at five minutes, but five-minutes-ago and still-going look identical in a
 * dropdown — and picking a run that ended is how you end up reading a finished list as though it
 * were filling. Ninety seconds is comfortably longer than the app's own heartbeat interval, so a
 * phone that is merely idle still reads as live.
 */
const LIVE_WITHIN_MS = 90_000;

function sanitizeName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9_ -]/g, "") // drop symbols
    .replace(/[\s-]+/g, "_") // spaces / hyphens -> underscore
    .replace(/_{2,}/g, "_") // collapse repeats
    .replace(/^[^a-z]+/, "") // must start with a letter
    .slice(0, 40);
}

// Info tooltip that appears after ~2s of hover (matches the requested delay).
function InfoTooltip({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  return (
    <span
      style={{ position: "relative", display: "inline-block", marginLeft: 6, verticalAlign: "middle" }}
      onMouseEnter={() => {
        timer.current = setTimeout(() => setOpen(true), 2000);
      }}
      onMouseLeave={() => {
        if (timer.current) clearTimeout(timer.current);
        setOpen(false);
      }}
    >
      <span
        aria-label="Naming help"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 15,
          height: 15,
          borderRadius: "50%",
          border: "1px solid var(--md-sys-color-outline-variant)",
          color: "var(--md-sys-color-on-surface)",
          fontSize: 10,
          fontWeight: 700,
          fontStyle: "italic",
          cursor: "help",
        }}
      >
        i
      </span>
      {open ? (
        <span
          style={{
            position: "absolute",
            top: "130%",
            left: 0,
            zIndex: 20,
            width: 300,
            background: "var(--md-sys-color-primary-container)",
            color: "var(--md-sys-color-on-primary-container)",
            fontSize: 12,
            fontWeight: 400,
            lineHeight: 1.55,
            padding: "10px 12px",
            borderRadius: 8,
            boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
            whiteSpace: "normal",
            textTransform: "none",
          }}
        >
          {children}
        </span>
      ) : null}
    </span>
  );
}


/**
 * A row being authored for an event the app does not emit yet.
 *
 * `anchor` is the identity it was inserted next to, so the plan sits beside the thing it relates to
 * — "this screen fires these three, and a fourth is missing" reads at a glance in a way an appended
 * list never does. `anchor: null` means it was added from the toolbar and goes at the top.
 */
/**
 * Who caused an event — the question a funnel cannot answer about itself.
 *
 * A funnel is built from what the user did. People leave one because of what the app did to them:
 * an ad, a login wall, an API that never answered. With only the first kind recorded, every leak
 * reads as lost interest — including the ~20% splash drop, which is a login wall we put there.
 *
 * Grouped in the select so picking the right one needs no theory: anything the user touched is
 * Intent, and the rest is reviewed by whoever wires the event up.
 */
const LAYERS: { group: string; options: { value: string; label: string; hint: string }[] }[] = [
  {
    group: "Intent — the user did this",
    options: [
      { value: "intent.screen", label: "Screen", hint: "a screen the user reached" },
      { value: "intent.action", label: "Action", hint: "something the user deliberately did" },
    ],
  },
  {
    group: "Response — the app did this back",
    options: [
      { value: "response.outcome", label: "Outcome", hint: "did what they asked for actually happen" },
      { value: "response.gate", label: "Gate", hint: "we stopped them on purpose: login wall, paywall, ad gate, permission" },
      { value: "response.interruption", label: "Interruption", hint: "happened to them unasked: an ad displayed, a dialog" },
    ],
  },
  {
    group: "Infra — underneath",
    options: [
      { value: "infra.api", label: "API", hint: "a server call's result" },
      { value: "infra.sync", label: "Sync", hint: "a push or pull result" },
      { value: "infra.ads", label: "Ads SDK", hint: "load/show failures, not the visible ad" },
    ],
  },
];

const LAYER_LABEL: Record<string, string> = Object.fromEntries(
  LAYERS.flatMap((g) => g.options.map((o) => [o.value, `${g.group.split(" —")[0]} · ${o.label}`])),
);

/**
 * The discovery table as text, for pasting somewhere it can be read.
 *
 * Row order and columns as shown, plus the scope and filters at the top — a list of events without
 * "which device, debug only, ignored shown" is not reproducible, and the first question about any
 * of these numbers is which slice of data produced them.
 */
function buildDiscoveryReport(
  items: EventDiscoveryItem[],
  ctx: { device: string; debugOnly: boolean; showIgnored: boolean; search: string; fired: number },
): string {
  const head = [
    `# Event Discovery — device: ${ctx.device || "all devices"}`,
    `# debugOnly=${ctx.debugOnly} showIgnored=${ctx.showIgnored}${ctx.search ? ` search="${ctx.search}"` : ""}`,
    `# ${items.length} identities, ${ctx.fired} firings, copied ${new Date().toISOString()}`,
    "",
    ["#", "fired", "kind", "src", "identity", "layer", "display name"].join(" | "),
  ];
  const rows = items.map((i, idx) =>
    [
      items.length - idx,
      i.firings ?? 0,
      eventType(i.eventName),
      i.autoCaptured ? "auto" : "coded",
      i.eventName,
      i.layer || "-",
      i.displayName || "-",
    ].join(" | "),
  );
  return [...head, ...rows].join("\n");
}

/**
 * How a tested event differs from the shape it was accepted with, or null when it matches.
 *
 * Hiding a verified event is only safe if something is still watching it. An event that stops
 * firing, starts firing twice, or drops a parameter would otherwise be invisible precisely because
 * somebody checked it once.
 *
 * Only meaningful when a device is scoped: unscoped counts are the whole install base and would
 * report a deviation for every tested row on the page.
 */
function deviationOf(i: EventDiscoveryItem, scoped: boolean): string | null {
  if (!i.testedAt || !i.baseline || !scoped) return null;
  const was = i.baseline.firings;
  const now = i.firings ?? 0;
  // Only silence counts. How MANY times an event fires is a property of the route the tester
  // walked, not of the event: opening a form, cancelling it part-way and then completing it later
  // is one deliberate flow that fires the same event twice, and reporting that as a change turned
  // a correct run into three warnings. An event that has stopped firing altogether is the one
  // thing a tick could otherwise hide, and that is what this still catches.
  if (typeof was === "number" && was > 0 && now === 0) return `did not fire (was ${was}×)`;
  return null;
}

interface PendingRow {
  id: string;
  anchor: string | null;
  position: "above" | "below";
  eventName: string;
  identityType: "action" | "screen";
  layer: string;
  displayName: string;
}

function newPending(anchor: string | null, position: "above" | "below"): PendingRow {
  return {
    id: `p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    anchor,
    position,
    eventName: "",
    identityType: "action",
    layer: "intent.action",
    displayName: "",
  };
}

// "Live Event Discovery and Config" — live-lists every event / UI-action the app emits, by its
// meaningful name or a searchable identity when it has none.
// The "Sending" toggle decides whether a RELEASE build emits the event. It is on by default and
// writes `denied` when switched off, because the app now sends everything except what somebody
// turned off. It used to be "Track", an opt-in — which could never discover anything, since a key
// can only be listed after it has been seen, so a control added in a later release stayed silent
// and invisible for ever. Switching one off takes effect without a release.
export default function LiveEventConfigClient() {
  const [items, setItems] = useState<EventDiscoveryItem[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debugOnly, setDebugOnly] = useState(true);
  const [showIgnored, setShowIgnored] = useState(false);
  const [live, setLive] = useState(true);
  const [savingRow, setSavingRow] = useState<string | null>(null);
  /**
   * The one row whose name is open for editing.
   *
   * A box per row put every name behind a border and a caret, so a column meant to be read at a
   * glance — and compared against the other window — looked like a form. Reading is the common act
   * here and renaming is the rare one, so reading is what the column does until asked.
   */
  const [editingName, setEditingName] = useState<string | null>(null);

  /** Column widths, dragged from the header edges and kept across reloads. */
  const { widths: colW, startResize, reset: resetWidths, autoFit, tableRef, order: colOrder, hidden: colHidden, visibleOrder, toggleColumn, moveColumnTo } = useColumnWidths("event-discovery", {"idx": 40, "tested": 78, "track": 64, "live": 210, "identity": 210, "count": 56, "layer": 150, "replace": 180, "actions": 90}, COLUMN_ORDER_EVENT_DISCOVERY);
  const [savedRow, setSavedRow] = useState<string | null>(null);
  const [copiedRow, setCopiedRow] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  // "Clear list" cutoff (epoch ms): hide events last seen BEFORE this, so repeated flow-testing
  // starts from a clean feed. Only hides content — configs (Track/name/description) are untouched.
  const [clearedAt, setClearedAt] = useState<number | null>(null);
  // Rows an admin is authoring for events the app does not emit yet. Held here until saved, so a
  // half-typed plan never reaches the server and never looks like a real event.
  const [pending, setPending] = useState<PendingRow[]>([]);
  const [menuFor, setMenuFor] = useState<string | null>(null);

  useEffect(() => {
    const v = typeof window !== "undefined" ? window.localStorage.getItem("lediscovery_cleared_at") : null;
    if (v) setClearedAt(Number(v));
  }, []);

  function clearList() {
    const now = Date.now();
    setClearedAt(now);
    window.localStorage.setItem("lediscovery_cleared_at", String(now));
  }
  function showAll() {
    setClearedAt(null);
    window.localStorage.removeItem("lediscovery_cleared_at");
  }

  // Auto-captured identity? (file-based tap/btn/ib or a tap:screen:label key). Only these are
  // gated by the allowlist AND have no production history, so they're safe to rename in code.
  function isAutoCaptured(key: string): boolean {
    return /^tap:/.test(key) || /\.(tap|btn|ib)_\d+$/.test(key);
  }

  async function copyIdentity(name: string) {
    try {
      await navigator.clipboard.writeText(name);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = name;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopiedRow(name);
    setTimeout(() => setCopiedRow((r) => (r === name ? null : r)), 1200);
  }

  async function setIgnored(name: string, ignored: boolean) {
    try {
      await api.ignoreEvent(name, ignored);
      // Ignoring drops it from the normal feed; restoring drops it from the ignored feed.
      setItems((prev) => prev.filter((it) => it.eventName !== name));
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update ignore.");
    }
  }

  // Which user's run this page is describing. Empty means everyone, which is right for deciding
  // what an event IS and wrong for checking what a test round produced — unscoped, the presence
  // ping counts tens of thousands across the install base and cannot be tallied against anything.
  /**
   * Which run is being looked at. A URL wins, then the last choice, then whoever is actually live.
   *
   * It used to come from the URL alone, so every plain reload dropped back to "all users" while a
   * live run sat in the list — and unscoped is the one setting this page is nearly useless in, since
   * the count then covers the whole install base rather than the run being checked.
   *
   * The stored key is written even when the choice is "all", so choosing it deliberately survives a
   * reload too. Absent means never chosen, and only then does the live user get picked.
   */
  const [userId, setUserId] = useState(() => {
    if (typeof window === "undefined") return "";
    const fromUrl = new URLSearchParams(window.location.search).get("userId");
    if (fromUrl) return fromUrl;
    try {
      return window.localStorage.getItem(SELECTED_USER_KEY) ?? "";
    } catch {
      return "";
    }
  });

  /**
   * Whether a choice has ever been made here — including choosing "all users".
   *
   * Only when nothing has been chosen does the page pick for you, and only then a run that is
   * genuinely still sending. Auto-selecting on every load would override a deliberate "all users"
   * every time, which is the same disrespect as forgetting the choice in the first place.
   */
  const everChosen = useRef(
    typeof window === "undefined"
      ? true
      : Boolean(new URLSearchParams(window.location.search).get("userId")) ||
          (() => {
            try {
              return window.localStorage.getItem(SELECTED_USER_KEY) !== null;
            } catch {
              return false;
            }
          })(),
  );

  const chooseUser = useCallback((next: string) => {
    setUserId(next);
    everChosen.current = true;
    try {
      window.localStorage.setItem(SELECTED_USER_KEY, next);
    } catch {
      // Private browsing. The choice still applies for this session.
    }
  }, []);
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  // The devices a test round can be picked from. Debug, because that is what separates the phone
  // doing the testing from four thousand real users — the intuitive filter, "versions above the
  // released one", returns nothing at all: a debug build of 1.4.0 reports `1.4.0` like everyone.
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  /**
   * Off by default, on the owner's instruction (2026-08-22).
   *
   * It shipped on, reasoning that a fresh run reprints everything already accepted so the short list
   * — the one with work left in it — was the useful opening view. That is true while a round is
   * being worked through and wrong the rest of the time: the page opens showing a fraction of what
   * fired, with the count in the header describing the whole, and a list that hides most of itself
   * before being asked is a list nobody trusts.
   *
   * Live Events keeps its own default; this is the catalogue and that is the stream.
   */
  const [hideTested, setHideTested] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [movingRow, setMovingRow] = useState<string | null>(null);
  const [devices, setDevices] = useState<DebugDevice[]>([]);
  useEffect(() => {
    let cancelled = false;
    // The same rule as the discovery poll below, for the same reason: this one was queueing behind
    // it and holding connections of its own while the server was already out of them.
    let devicesInFlight = false;
    let devicesNextAt = 0;
    let devicesFailures = 0;
    const pull = async () => {
      if (devicesInFlight || Date.now() < devicesNextAt) return;
      devicesInFlight = true;
      try {
        // Five minutes, the same boundary Live Events stops calling a user recent at. A device
        // that stopped sending five minutes ago is not a run anyone is watching, and listing it
        // only makes the live one harder to find.
        const d = await api.getDebugDevices(5);
        if (!cancelled) {
          setDevices(d);
          // First visit with nothing chosen: land on the run that is actually going, rather than on
          // "all users" — the one setting this page is nearly useless in, since the count then
          // covers the whole install base instead of the run being checked.
          if (!everChosen.current && d.length > 0) {
            const newest = [...d].sort((a, b) => (a.lastEventAt < b.lastEventAt ? 1 : -1))[0];
            if (Date.now() - new Date(newest.lastEventAt).getTime() <= LIVE_WITHIN_MS) {
              chooseUser(newest.userId);
            }
          }
        }
        devicesFailures = 0;
        devicesNextAt = 0;
      } catch {
        // A missing list leaves the page unscoped, which is the old behaviour and still usable.
        devicesFailures += 1;
        devicesNextAt = Date.now() + Math.min(60_000, 15_000 * 2 ** devicesFailures);
      } finally {
        devicesInFlight = false;
      }
    };
    void pull();
    // Re-pulled, because a five-minute window and a one-time fetch is an empty dropdown: the phone
    // that starts a run after this page was opened would never appear in it.
    const t = setInterval(pull, 15_000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  const [debouncedUserId, setDebouncedUserId] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedUserId(userId.trim()), 400);
    return () => clearTimeout(t);
  }, [userId]);

  const debugOnlyRef = useRef(debugOnly);
  debugOnlyRef.current = debugOnly;
  const showIgnoredRef = useRef(showIgnored);
  showIgnoredRef.current = showIgnored;

  // A poll must never overtake the one before it.
  //
  // This is what turned a slow query into an unreachable server. The interval fires every four
  // seconds whether or not the last request has come back, so once discovery started taking eight,
  // every tick added another in-flight request holding another database connection. Measured at the
  // worst of it: 10 connections active, 0 idle, 48 queued behind them — at which point the JWT
  // filter could not get a connection either, and the panel started answering 503 to itself.
  //
  // The panel was making the server slower in exact proportion to how slow it already was.
  // Saved rows waiting for the poll to agree. A ref, not state: it must not itself cause a render.
  const pendingConfirm = useRef<Record<string, SavedConfig>>({});

  const inFlight = useRef(false);
  const consecutiveFailures = useRef(0);
  const nextAttemptAt = useRef(0);

  const load = useCallback(async (userInitiated = false) => {
    if (inFlight.current) return;
    // Backing off a struggling server rather than leaning on it. A pressed button still goes
    // through — a person asking is not the traffic that caused this.
    if (!userInitiated && Date.now() < nextAttemptAt.current) return;

    inFlight.current = true;
    if (userInitiated) setLoading(true);
    try {
      const data = await api.getEventDiscovery(debugOnlyRef.current, showIgnoredRef.current, userIdRef.current.trim() || undefined);
      setItems(applyPending(data, pendingConfirm.current));
      setError(null);
      setLastRefreshed(new Date());
      consecutiveFailures.current = 0;
      nextAttemptAt.current = 0;
    } catch (e) {
      consecutiveFailures.current += 1;
      const wait = Math.min(60_000, REFRESH_MS * 2 ** consecutiveFailures.current);
      nextAttemptAt.current = Date.now() + wait;
      setError(
        `${e instanceof Error ? e.message : "Failed to load the discovery feed."}` +
          ` — retrying in ${Math.round(wait / 1000)}s`,
      );
    } finally {
      inFlight.current = false;
      if (userInitiated) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(true);
  }, [load]);

  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => load(false), REFRESH_MS);
    return () => clearInterval(id);
  }, [live, load]);

  useEffect(() => {
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // Debounced on userId: this is typed, not toggled, and a request per keystroke would fire eight
    // times for one paste.
  }, [debugOnly, showIgnored, debouncedUserId]);

  /**
   * Events still visible after the "Clear" cutoff (content-only; configs are untouched).
   *
   * The cutoff does NOT apply while Show ignored is on, and that is the point of this branch. Clear
   * list hides the noise in the LIVE feed — events that have not fired since you pressed it are not
   * interesting right now. But Show ignored is not the live feed: it is the list of decisions you
   * have already made, and a decision does not stop existing because the event has been quiet.
   *
   * Measured 2026-08-16: the backend held six ignored events, the screen showed three. The other
   * three had last fired before the cutoff, so the page silently answered "these are the ones you
   * ignored" with a subset — the exact shape of wrong answer that reads as complete.
   */
  const visibleItems = useMemo(
    () =>
      clearedAt && !showIgnored
        ? items.filter((i) => (i.lastSeen ? new Date(i.lastSeen).getTime() > clearedAt : true))
        : items,
    [items, clearedAt, showIgnored],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return visibleItems;
    return visibleItems.filter(
      (i) =>
        i.eventName.toLowerCase().includes(q) ||
        (i.screenName ?? "").toLowerCase().includes(q) ||
        (i.displayName ?? "").toLowerCase().includes(q) ||
        // Typing "auto" or "coded" narrows to one origin. Going through a few hundred rows deciding
        // which of a duplicated pair to keep is the actual job, and it is far easier one kind at a
        // time.
        (typeof i.autoCaptured === "boolean" && (i.autoCaptured ? "auto" : "coded").includes(q)),
    );
  }, [visibleItems, search]);

  // "Seen" must exclude planned rows. An event nobody built and an event that was built and stopped
  // firing are the same picture once those are counted together, and telling them apart is the point.
  // Occurrences, not rows: this is the number that reconciles against the live stream, which the
  // seen count never could.
  // Everything that changed since it was accepted. Computed BEFORE the hide filter, or the rows it
  // is meant to warn about would be the exact rows it could not see.
  const deviations = useMemo(
    () =>
      filtered
        .map((i) => ({ item: i, why: deviationOf(i, Boolean(userId)) }))
        .filter((d): d is { item: EventDiscoveryItem; why: string } => d.why !== null),
    [filtered, userId],
  );

  // What the table actually shows. Deviating rows stay visible even when hidden is asked for: an
  // event that changed is the one thing on this page that has not been dealt with.
  const shown = useMemo(
    () =>
      hideTested
        ? filtered.filter((i) => !i.testedAt || deviationOf(i, Boolean(userId)) !== null)
        : filtered,
    [filtered, hideTested, userId],
  );

  // The select-all reflects what is on screen, so with "Hide tested" on it reads as unticked even
  // after a whole round was accepted — the rows it ticked left the view. That is the intended
  // reading: it acts on what can be seen.
  const shownTested = shown.filter((i) => Boolean(i.testedAt)).length;
  const allShownTested = shown.length > 0 && shownTested === shown.length;
  const someShownTested = shownTested > 0 && !allShownTested;
  const allTestedRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (allTestedRef.current) allTestedRef.current.indeterminate = someShownTested;
  }, [someShownTested]);

  // Two numbers, because they answer two questions and were previously one number answering
  // neither: the totals row summed only the rows on screen while the # column numbered them out of
  // the unfiltered list, so with "Hide tested" on the page showed 34 against 16. The scope total is
  // the one that reconciles against the live stream, which has a row per firing.
  const firedShown = shown.reduce((n, i) => n + (i.firings ?? 0), 0);
  const firedCount = filtered.reduce((n, i) => n + (i.firings ?? 0), 0);
  const seenCount = useMemo(() => visibleItems.filter((i) => !i.planned).length, [visibleItems]);
  const plannedCount = useMemo(() => visibleItems.filter((i) => i.planned).length, [visibleItems]);
  const needNameCount = useMemo(
    () => visibleItems.filter((i) => (drafts[i.eventName]?.tracked ?? i.tracked) && !(drafts[i.eventName]?.displayName ?? i.displayName)).length,
    [visibleItems, drafts],
  );

  /**
   * Accept an event, or withdraw that.
   *
   * The baseline is what this page can see — the firing count for the scoped device. Ticking with no
   * device scoped stores no count, so the event is marked but not comparable; that is stated on the
   * control rather than silently allowed to look like a checked event.
   */
  /**
   * Apply the tick locally. The server is still the authority — a failure puts the rows back.
   *
   * It used to be applied only after the POST *and* a full reload of the feed had both returned,
   * so for two round trips the row looked untouched and the click read as not having landed. The
   * box is small enough to doubt anyway; making it slow as well meant clicking it again.
   */
  function applyTested(names: Set<string>, tested: boolean) {
    const at = new Date().toISOString();
    setItems((prev) =>
      prev.map((it) =>
        names.has(it.eventName)
          ? tested
            ? {
                ...it,
                testedAt: at,
                // Same rule as the request: with no device selected there is no run to record.
                baseline: userId ? { firings: it.firings ?? 0, screen: it.screenName ?? undefined } : it.baseline,
              }
            : { ...it, testedAt: null, baseline: null }
          : it,
      ),
    );
  }

  const baselineFor = (i: EventDiscoveryItem, tested: boolean) =>
    tested && userId ? { firings: i.firings ?? 0, screen: i.screenName ?? undefined } : undefined;

  async function setTested(i: EventDiscoveryItem, tested: boolean) {
    const before = items;
    applyTested(new Set([i.eventName]), tested);
    try {
      await api.setEventTested(i.eventName, tested, baselineFor(i, tested));
      void load();
    } catch (e) {
      setItems(before);
      setError(e instanceof Error ? e.message : "Failed to update the tested mark.");
    }
  }

  /**
   * Tick, or clear, every row the table is currently showing.
   *
   * Deliberately "in view" rather than "everything": the list is already filtered by search, by
   * device and by the hide, and those filters are how a round of testing is scoped. A button that
   * silently reached past them would accept events that were never on screen.
   *
   * The endpoint takes one event, so this is still one request per row — a few at a time, because
   * two hundred at once is a burst the panel has no reason to make.
   */
  async function setTestedBulk(rows: EventDiscoveryItem[], tested: boolean) {
    const targets = rows.filter((r) => Boolean(r.testedAt) !== tested);
    if (!targets.length || bulkBusy) return;
    // Only the clearing direction asks. Ticking is undone by clicking again; clearing throws away
    // the recorded baselines, which is the part that cannot be clicked back.
    if (!tested && !window.confirm(`Clear the tested mark on ${targets.length} row(s)? The baselines recorded with them go too.`)) return;

    const before = items;
    applyTested(new Set(targets.map((t) => t.eventName)), tested);
    setBulkBusy(true);
    const queue = [...targets];
    const failed: string[] = [];
    const worker = async () => {
      for (let next = queue.pop(); next; next = queue.pop()) {
        try {
          await api.setEventTested(next.eventName, tested, baselineFor(next, tested));
        } catch {
          failed.push(next.eventName);
        }
      }
    };
    try {
      await Promise.all(Array.from({ length: Math.min(6, targets.length) }, worker));
      if (failed.length) {
        setItems(before);
        setError(`${failed.length} of ${targets.length} rows could not be updated. Nothing was changed.`);
      }
      await load();
    } finally {
      setBulkBusy(false);
    }
  }

  /**
   * Move a row to the name the code now uses.
   *
   * Asks first, and names both sides: this deletes the old row, and pressing it before the app is
   * sending the new name leaves the metadata sitting on an identity nothing has fired yet.
   */
  async function applyRename(i: EventDiscoveryItem) {
    const to = replaceVal(i).trim();
    if (!to || to === i.eventName) return;
    if (!window.confirm(`Move everything recorded against ${i.eventName} to ${to}?\n\nDo this once the app is actually sending ${to}. The old row is removed.`)) return;
    setMovingRow(i.eventName);
    try {
      await api.applyEventRename(i.eventName, to);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to carry the row over.");
    } finally {
      setMovingRow(null);
    }
  }

  const trackedOn = (i: EventDiscoveryItem) => drafts[i.eventName]?.tracked ?? i.tracked;
  /**
   * Whether a release build sends this event.
   *
   * Derived from `denied`, not from `tracked`. A config row is created the moment anyone touches an
   * event — renaming it is enough — and `tracked` is false on a fresh row, so reading the inverse
   * would show every newly-named event as switched off. Nothing and "not denied" both mean sending.
   */
  const sendingOn = (i: EventDiscoveryItem) => !(drafts[i.eventName]?.denied ?? i.denied);
  const nameVal = (i: EventDiscoveryItem) => drafts[i.eventName]?.displayName ?? i.displayName ?? "";
  const replaceVal = (i: EventDiscoveryItem) => drafts[i.eventName]?.replaceName ?? i.replaceName ?? "";
  const layerVal = (i: EventDiscoveryItem) => drafts[i.eventName]?.layer ?? i.layer ?? "";


  function addPending(anchor: string | null, position: "above" | "below") {
    setPending((prev) => [...prev, newPending(anchor, position)]);
    setMenuFor(null);
  }

  function patchPending(id: string, patch: Partial<PendingRow>) {
    setPending((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  /**
   * Save an authored row as a planned event.
   *
   * The identity is stored exactly as the app will emit it: a screen becomes `screen: <route>`,
   * because that is the shape the discovery query derives when the event actually fires. Getting
   * this wrong would mean the row never matches its own event and sits "planned" forever after the
   * work was in fact done.
   */
  async function savePending(row: PendingRow) {
    const raw = row.eventName.trim();
    if (!raw) return;
    const identity =
      row.identityType === "screen" && !raw.startsWith("screen: ") ? `screen: ${raw}` : raw;

    setSavingRow(row.id);
    setError(null);
    try {
      await api.saveEventConfig({
        eventName: identity,
        tracked: false,
        displayName: row.displayName.trim() || null,
        replaceName: null,
        planned: true,
        identityType: row.identityType,
        layer: row.layer || null,
      });
      setPending((prev) => prev.filter((r) => r.id !== row.id));
      await load(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSavingRow(null);
    }
  }

  /**
   * Ask the app to stop emitting an event.
   *
   * Deliberately does not hide the row. The point is that it is still arriving — that is what makes
   * the pending state honest, and what makes "marked removed but still firing" visible later.
   */
  async function suppress(i: EventDiscoveryItem, on: boolean) {
    try {
      await api.suppressEvent(i.eventName, on);
      await load(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update");
    }
  }

  /** Only planned rows can be deleted; the server refuses the rest and says why. */
  async function deleteRow(i: EventDiscoveryItem) {
    setMenuFor(null);
    if (!i.planned) return;
    setSavingRow(i.eventName);
    try {
      await api.deletePlannedEvent(i.eventName);
      await load(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete");
    } finally {
      setSavingRow(null);
    }
  }


  const inp: React.CSSProperties = {
    width: "100%", padding: "6px 8px", borderRadius: 6,
    border: "1px solid var(--md-sys-color-outline-variant)", fontSize: 12.5,
  };

  /** The layer select, grouped so the right answer needs no theory. */
  function layerSelect(value: string, onChange: (v: string) => void, unset: boolean) {
    return (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          ...inp,
          // Uncategorised is a real state, not a default, and it should look unanswered rather than
          // quietly pass as one of the choices.
          color: unset ? "var(--md-sys-color-warning)" : undefined,
          background: unset ? "var(--md-sys-color-surface-container-lowest)" : undefined,
        }}
      >
        <option value="">— not set —</option>
        {LAYERS.map((g) => (
          <optgroup key={g.group} label={g.group}>
            {g.options.map((o) => (
              <option key={o.value} value={o.value} title={o.hint}>
                {o.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    );
  }

  /** One authored row: the four things needed to build the event, and nothing else. */
  function renderPending(row: PendingRow) {
        const cells: Record<string, React.ReactNode> = {
      /* An authored row is not part of the discovered feed, so it holds the column without a
            number rather than borrowing one and shifting every row below it. */
      idx: (
<td key="idx" style={{ ...td, textAlign: "right", color: "var(--md-sys-color-on-surface-variant)", fontSize: 11 }}>—</td>
      ),
      tested: (
<td key="tested" style={{ ...td, textAlign: "center", color: "var(--md-sys-color-on-surface-variant)", fontSize: 11 }}>—</td>
      ),
      track: (
<td key="track" style={{ ...td, textAlign: "center", color: "var(--md-sys-color-on-surface-variant)", fontSize: 11 }}>—</td>
      ),
      /* The meaningful name. An authored row has never fired, so there is nothing in the stream to
            line it up against yet — but this is the column the name is typed in now, and naming the
            event is most of what authoring one is. */
      live: (
<td key="live" style={td}>
          <input
            value={row.displayName}
            onChange={(e) => patchPending(row.id, { displayName: e.target.value })}
            placeholder="Reporting name"
            style={inp}
          />
        </td>
      ),
      identity: (
<td key="identity" style={td}>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <select
              value={row.identityType}
              onChange={(e) => {
                const t = e.target.value as "action" | "screen";
                // Follows the shape only while the layer is still Intent — once it has been moved to
                // Response or Infra, that was a considered choice and must not be undone by touching
                // an unrelated dropdown.
                patchPending(row.id, {
                  identityType: t,
                  ...(row.layer.startsWith("intent.") ? { layer: `intent.${t === "screen" ? "screen" : "action"}` } : {}),
                });
              }}
              style={{ ...inp, width: 84, flexShrink: 0 }}
            >
              <option value="action">action</option>
              <option value="screen">screen</option>
            </select>
            <input
              autoFocus
              value={row.eventName}
              onChange={(e) => patchPending(row.id, { eventName: e.target.value })}
              placeholder={row.identityType === "screen" ? "route name" : "event_name"}
              style={{ ...inp, fontFamily: "monospace" }}
            />
          </div>
          {/* Said out loud because the stored identity must match what the app will emit, and a
              screen row is stored with this prefix. A mismatch would leave the row planned forever
              after the work was actually done. */}
          {row.identityType === "screen" && row.eventName.trim() ? (
            <span style={{ fontSize: 10.5, color: "var(--md-sys-color-warning)" }}>
              saved as <code>screen: {row.eventName.trim()}</code>
            </span>
          ) : null}
        </td>
      ),
      count: (
<td key="count" style={{ ...td, textAlign: "right", color: "var(--md-sys-color-on-surface-variant)", fontSize: 11 }}>—</td>
      ),
      layer: (
<td key="layer" style={td}>
          {layerSelect(row.layer, (v) => patchPending(row.id, { layer: v }), !row.layer)}
        </td>
      ),
      replace: (
<td key="replace" style={td}>
          {/* Renaming targets an identity that already exists in code. This one does not yet. */}
          <input disabled placeholder="n/a until it exists" style={{ ...inp, background: "var(--md-sys-color-surface-container-lowest)", color: "var(--md-sys-color-on-surface-variant)" }} />
        </td>
      ),
      actions: (
<td key="actions" style={{ ...td, whiteSpace: "nowrap" }}>
          <button
            type="button"
            onClick={() => void savePending(row)}
            disabled={!row.eventName.trim() || savingRow === row.id}
            style={{
              padding: "6px 12px", borderRadius: 6, border: "none",
              background: row.eventName.trim() ? "var(--md-sys-color-primary)" : "var(--md-sys-color-surface-container-high)",
              color: "var(--md-sys-color-on-primary)", fontSize: 12.5, fontWeight: 600,
              cursor: row.eventName.trim() ? "pointer" : "not-allowed",
            }}
          >
            {savingRow === row.id ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => setPending((prev) => prev.filter((r) => r.id !== row.id))}
            style={{ marginLeft: 6, padding: "6px 8px", borderRadius: 6, border: "1px solid var(--md-sys-color-outline-variant)", background: "var(--md-sys-color-surface-container-lowest)", fontSize: 12.5, cursor: "pointer", color: "var(--md-sys-color-on-surface)" }}
          >
            Cancel
          </button>
        </td>
      ),
    };
    return (
      <tr key={row.id} style={{ background: "var(--md-sys-color-surface-container-lowest)" }}>
        {visibleOrder.map((k) => cells[k])}
      </tr>
    );
  }

  /** Row menu: insert a plan beside this event, or drop a plan that was abandoned. */
  function rowMenu(i: EventDiscoveryItem) {
    const open = menuFor === i.eventName;
    const item: React.CSSProperties = {
      display: "block", width: "100%", textAlign: "left", padding: "7px 12px",
      border: "none", background: "transparent", fontSize: 12.5, cursor: "pointer", whiteSpace: "nowrap",
    };
    return (
      <span style={{ position: "relative", display: "inline-block" }}>
        <button
          type="button"
          aria-label={`Row actions for ${i.eventName}`}
          onClick={() => setMenuFor(open ? null : i.eventName)}
          style={{ border: "none", background: "transparent", cursor: "pointer", padding: "2px 6px", color: "var(--md-sys-color-on-surface-variant)", fontSize: 15, lineHeight: 1 }}
        >
          ⋯
        </button>
        {open ? (
          <>
            {/* Click-away, so the menu never sticks open behind a live feed that keeps re-rendering. */}
            <span
              onClick={() => setMenuFor(null)}
              style={{ position: "fixed", inset: 0, zIndex: 10 }}
            />
            <span
              style={{
                position: "absolute", right: 0, top: "100%", zIndex: 11, minWidth: 170,
                background: "var(--md-sys-color-surface-container-lowest)", border: "1px solid var(--md-sys-color-outline-variant)", borderRadius: 8,
                boxShadow: "0 8px 24px rgba(0,0,0,0.10)", padding: "4px 0",
              }}
            >
              <button type="button" style={item} onClick={() => addPending(i.eventName, "above")}>
                Add row above
              </button>
              <button type="button" style={item} onClick={() => addPending(i.eventName, "below")}>
                Add row below
              </button>
              <span style={{ display: "block", height: 1, background: "var(--md-sys-color-surface-container-low)", margin: "4px 0" }} />
              {/*
                Only for events that CAN be removed from the app.

                An auto-captured tap cannot, and does not need to be: the send-allowlist is a
                positive list, so one that is never added to it never reaches production. Offering
                "stop sending from app" there asks a developer to delete tracking that is already
                silent — which is exactly what happened once, and had to be reverted. Those rows get
                "Never show again" instead, which takes them out of the way while the list is being
                built.

                A deliberately-coded event is the opposite: the allowlist does not gate it, it always
                sends, and deleting the call is the only thing that stops it.

                The `suppressStatus === "NONE"` half matters as much as the autoCaptured half. Hiding
                the control outright left auto rows that were ALREADY marked for removal with no way
                back — the state existed and the only button that could undo it had gone. Withholding
                a decision that does not apply is right; trapping one already made is not. So an auto
                row is offered nothing while there is nothing to undo, and "Keep sending it" the
                moment there is.
              */}
              {/* CODED rows: their only lever. The allowlist does not gate a deliberately-coded
                  event, so it always sends and deleting the call is the one thing that stops it. */}
              {i.autoCaptured ? null : (
                <button
                  type="button"
                  style={item}
                  title={
                    i.suppressStatus === "NONE"
                      ? "Queues removing the emission from the app source. Until that ships, the app keeps sending it."
                      : "Cancel the removal — the app keeps sending this, and it returns to the feed."
                  }
                  onClick={() => {
                    setMenuFor(null);
                    void suppress(i, i.suppressStatus === "NONE");
                  }}
                >
                  {i.suppressStatus === "NONE" ? "Stop sending from app" : "Keep sending it"}
                </button>
              )}

              {/* Both kinds get this. For an AUTO row it is the only lever it needs: the
                  send-allowlist is a positive list, so one never added to it never reaches
                  production, and taking it out of the way is the whole job. For a CODED row it is
                  the second option — hide it from the list while you decide, without queuing a
                  source change you have not committed to. */}
              <button
                type="button"
                style={item}
                title={
                  i.autoCaptured
                    ? "Takes it out of this list. The allowlist already decides whether it ships, and it is not on it."
                    : "Only hides the row here. The app carries on sending it."
                }
                onClick={() => {
                  setMenuFor(null);
                  void setIgnored(i.eventName, !i.ignored);
                }}
              >
                {i.ignored ? "Show again" : "Never show again"}
              </button>

              {/* An auto row that was marked for removal BEFORE the two levers were separated. Its
                  own lever cannot clear that state, and leaving it with no way out is the trap this
                  already caused once. Transitional: nothing can set the state on an auto row now, so
                  this disappears as the last of them are cleared. */}
              {i.autoCaptured && i.suppressStatus !== "NONE" ? (
                <button
                  type="button"
                  style={item}
                  title="Cancel a removal that was queued before auto and coded events had separate controls."
                  onClick={() => {
                    setMenuFor(null);
                    void suppress(i, false);
                  }}
                >
                  Keep sending it
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => void deleteRow(i)}
                disabled={!i.planned}
                title={i.planned ? undefined : "This event has fired — use Ignore to hide it"}
                style={{ ...item, color: i.planned ? "var(--md-sys-color-error)" : "var(--md-sys-color-on-surface-variant)", cursor: i.planned ? "pointer" : "not-allowed" }}
              >
                Delete row
              </button>
            </span>
          </>
        ) : null}
      </span>
    );
  }

  function setDraft(name: string, patch: Draft) {
    setDrafts((prev) => ({ ...prev, [name]: { ...prev[name], ...patch } }));
    setSavedRow((r) => (r === name ? null : r));
  }

  async function save(i: EventDiscoveryItem) {
    setSavingRow(i.eventName);
    setError(null);
    // Read once, before the draft is cleared: these accessors fall back to the row, so reading them
    // afterwards would return the old values rather than what is being saved.
    const edited: SavedConfig = {
      // Passed through unchanged. `tracked` drives the older default-list task queue; the lever
      // that decides what release actually sends is `denied`, and writing one must not move the
      // other.
      tracked: trackedOn(i),
      denied: !sendingOn(i),
      layer: layerVal(i) || null,
      displayName: nameVal(i).trim() || null,
      replaceName: replaceVal(i).trim() || null,
    };
    try {
      const task = await api.saveEventConfig({
        eventName: i.eventName,
        ...edited,
        screenName: i.screenName,
      });
      // Hold it until a poll returns it. Without this the row goes back to the feed four seconds
      // later, and a read that cannot find the write shows up as an empty field instead of a fault.
      pendingConfirm.current[i.eventName] = edited;
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[i.eventName];
        return next;
      });
      setItems((prev) =>
        prev.map((it) =>
          it.eventName === i.eventName
            ? {
                ...it,
                ...edited,
              }
            : it,
        ),
      );
      setSavedRow(i.eventName);
      setTimeout(() => setSavedRow((r) => (r === i.eventName ? null : r)), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSavingRow(null);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "6px 8px",
    border: "1px solid var(--md-sys-color-outline-variant)",
    borderRadius: 6,
    fontSize: 13,
  };

  const th: React.CSSProperties = {
    textAlign: "left",
    padding: "8px 10px",
    fontSize: 12,
    fontWeight: 700,
    color: "var(--md-sys-color-on-surface)",
    borderBottom: "1px solid var(--md-sys-color-outline-variant)",
    whiteSpace: "nowrap",
    position: "sticky",
    top: 0,
    background: "var(--md-sys-color-surface-container-lowest)",
    zIndex: 1,
  };
  const td: React.CSSProperties = {
    padding: "8px 10px",
    borderBottom: "1px solid var(--md-sys-color-outline-variant)",
    verticalAlign: "top",
  };

  function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
    return (
      <button
        type="button"
        onClick={() => onChange(!on)}
        aria-pressed={on}
        style={{
          width: 38,
          height: 22,
          borderRadius: 22,
          border: "none",
          background: on ? "var(--md-sys-color-success)" : "var(--md-sys-color-surface-container-high)",
          padding: 2,
          cursor: "pointer",
          display: "inline-flex",
          justifyContent: on ? "flex-end" : "flex-start",
          alignItems: "center",
        }}
      >
        <span style={{ width: 18, height: 18, borderRadius: "50%", background: "var(--md-sys-color-surface-container-lowest)", display: "block" }} />
      </button>
    );
  }

  const headers: Record<string, React.ReactNode> = {
    idx: (
<th key="idx"
                  style={{ ...th, position: "relative", width: 40, textAlign: "right", cursor: "pointer" }}
                  onDoubleClick={resetWidths}
                  title="Drag any heading's right edge to resize. Double-click here to put every column back."
                >#
                  <span
                    className={RESIZE_HANDLE_CLASS}
                    title="Drag to resize. Double-click to fit the column to its contents."
                    onMouseDown={(e) => startResize("idx", e)}
                    onDoubleClick={(e) => {
                      // Or the heading behind it also hears the double-click and resets everything.
                      e.stopPropagation();
                      autoFit("idx");
                    }}
                  />
                </th>
    ),
    tested: (
<th key="tested" style={{ ...th, position: "relative", width: 78, textAlign: "center", padding: 0 }}>
                  <label
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px 10px", cursor: bulkBusy ? "progress" : "pointer" }}
                    title={
                      shown.length
                        ? `Accepted as correct. Ticking records what the event looked like, so a later run that differs is reported instead of hidden.\n\nThis box applies to the ${shown.length} row(s) in view.`
                        : "Accepted as correct. Nothing is in view to tick."
                    }
                  >
                    <input
                      ref={allTestedRef}
                      type="checkbox"
                      disabled={bulkBusy || shown.length === 0}
                      checked={allShownTested}
                      onChange={(e) => void setTestedBulk(shown, e.target.checked)}
                      style={{ width: 16, height: 16, cursor: "inherit", margin: 0 }}
                    />
                    Tested
                  </label>
                
                  <span
                    className={RESIZE_HANDLE_CLASS}
                    title="Drag to resize. Double-click to fit the column to its contents."
                    onMouseDown={(e) => startResize("tested", e)}
                    onDoubleClick={(e) => {
                      // Or the heading behind it also hears the double-click and resets everything.
                      e.stopPropagation();
                      autoFit("tested");
                    }}
                  />
                </th>
    ),
    track: (
<th key="track" style={{ ...th, position: "relative", width: 72 }}>Sending
                  <span
                    className={RESIZE_HANDLE_CLASS}
                    title="Drag to resize. Double-click to fit the column to its contents."
                    onMouseDown={(e) => startResize("track", e)}
                    onDoubleClick={(e) => {
                      // Or the heading behind it also hears the double-click and resets everything.
                      e.stopPropagation();
                      autoFit("track");
                    }}
                  />
                </th>
    ),
    live: (
<th key="live" style={{ ...th, position: "relative", minWidth: 210 }}>
                  Meaningful event name
                  <InfoTooltip>
                    <b>Naming best practices</b>
                    <br />• lowercase <b>snake_case</b> (words joined by _)
                    <br />• structure: <code>area_object_action</code>
                    <br />• e.g. <code>add_business_logo_clicked</code>, <code>invoice_sent</code>
                    <br />• action verb: <code>_clicked</code> / <code>_created</code> / <code>_viewed</code>
                    <br />• only a–z, 0–9, _ · start with a letter · ≤ 40 chars
                    <br />• no spaces, symbols, or personal data
                    <br />
                    <span style={{ color: "var(--md-sys-color-on-surface-variant)" }}>Input auto-formats to this as you type.</span>
                  </InfoTooltip>
                
                  <span
                    className={RESIZE_HANDLE_CLASS}
                    title="Drag to resize. Double-click to fit the column to its contents."
                    onMouseDown={(e) => startResize("live", e)}
                    onDoubleClick={(e) => {
                      // Or the heading behind it also hears the double-click and resets everything.
                      e.stopPropagation();
                      autoFit("live");
                    }}
                  />
                </th>
    ),
    identity: (
<th key="identity" style={{ ...th, position: "relative", minWidth: 210 }}>Events from apps
                  <span
                    className={RESIZE_HANDLE_CLASS}
                    title="Drag to resize. Double-click to fit the column to its contents."
                    onMouseDown={(e) => startResize("identity", e)}
                    onDoubleClick={(e) => {
                      // Or the heading behind it also hears the double-click and resets everything.
                      e.stopPropagation();
                      autoFit("identity");
                    }}
                  />
                </th>
    ),
    count: (
<th key="count"
                  style={{ ...th, position: "relative", width: 56, textAlign: "right" }}
                  title="How many times this fired — the row is one identity, this is its occurrences"
                >
                  <div style={{ fontVariantNumeric: "tabular-nums", fontWeight: 700, color: "var(--md-sys-color-on-surface)" }}>
                    {firedShown === firedCount ? firedCount : `${firedShown}/${firedCount}`}
                  </div>
                
                  <span
                    className={RESIZE_HANDLE_CLASS}
                    title="Drag to resize. Double-click to fit the column to its contents."
                    onMouseDown={(e) => startResize("count", e)}
                    onDoubleClick={(e) => {
                      // Or the heading behind it also hears the double-click and resets everything.
                      e.stopPropagation();
                      autoFit("count");
                    }}
                  />
                </th>
    ),
    layer: (
<th key="layer" style={{ ...th, position: "relative", width: 150, minWidth: 150 }} title="Who caused this event — what a funnel cannot tell you about itself">
                  Layer
                
                  <span
                    className={RESIZE_HANDLE_CLASS}
                    title="Drag to resize. Double-click to fit the column to its contents."
                    onMouseDown={(e) => startResize("layer", e)}
                    onDoubleClick={(e) => {
                      // Or the heading behind it also hears the double-click and resets everything.
                      e.stopPropagation();
                      autoFit("layer");
                    }}
                  />
                </th>
    ),
    replace: (
<th key="replace" style={{ ...th, position: "relative", width: 180, minWidth: 150 }}>
                  Replace name
                  <InfoTooltip>
                    <b>Replace the code identity</b>
                    <br />Renames this event&apos;s name IN THE APP CODE to what you type here.
                    <b>Leave empty = no change</b> (the current name keeps running).
                    <br /><br />
                    For an already-shipped event this is still safe by design: old app versions keep
                    reporting the old name, and the new version reports this new name — each version is
                    correct on its own. Fill it only when you actually want to rename.
                  </InfoTooltip>
                
                  <span
                    className={RESIZE_HANDLE_CLASS}
                    title="Drag to resize. Double-click to fit the column to its contents."
                    onMouseDown={(e) => startResize("replace", e)}
                    onDoubleClick={(e) => {
                      // Or the heading behind it also hears the double-click and resets everything.
                      e.stopPropagation();
                      autoFit("replace");
                    }}
                  />
                </th>
    ),
    actions: (
<th key="actions" style={{ ...th, position: "relative", width: 90 }}>
                  <span
                    className={RESIZE_HANDLE_CLASS}
                    title="Drag to resize. Double-click to fit the column to its contents."
                    onMouseDown={(e) => startResize("actions", e)}
                    onDoubleClick={(e) => {
                      // Or the heading behind it also hears the double-click and resets everything.
                      e.stopPropagation();
                      autoFit("actions");
                    }}
                  />
                </th>
    ),
  };

  return (
    // No max-width. 1280 was a sensible cap for a page of prose and the wrong one for a nine-column
    // table: on a wide screen it left space unused on the right while squeezing the identity column
    // until it broke words in half. The table scrolls inside its own container below, so a narrow
    // window is handled there rather than by starving every window.
    <div style={{ padding: 24, margin: "0 auto" }}>
      <Link
        href="/"
        style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--md-sys-color-primary)", textDecoration: "none", marginBottom: 12 }}
      >
        ← Back to home
      </Link>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--md-sys-color-primary)" }}>Live Event Discovery and Config</h1>
          <p style={{ color: "var(--md-sys-color-on-surface)", fontSize: 13, marginTop: 4, maxWidth: 720 }}>
            Every event & UI-action the app emits. Release builds send <b>all</b> of them — switch
            <b> Sending</b> off for the ones you do not want, and it stops without a release. Name an
            event under <b>Meaningful event name</b>; that name is what every other page shows.
          </p>
        </div>
        <div style={{ fontSize: 13, color: "var(--md-sys-color-on-surface)", textAlign: "right" }}>
          <div>
            <b>{seenCount}</b> seen ·{" "}
            <b>{firedCount}</b> fired ·{" "}
            {plannedCount > 0 ? (
              <>
                <b style={{ color: "var(--md-sys-color-warning)" }}>{plannedCount}</b> planned ·{" "}
              </>
            ) : null}
            <b style={{ color: needNameCount ? "var(--md-sys-color-warning)" : "var(--md-sys-color-success)" }}>{needNameCount}</b> need name
          </div>
          {lastRefreshed ? (
            <div style={{ fontSize: 11, color: "var(--md-sys-color-on-surface-variant)", marginTop: 2 }}>updated {lastRefreshed.toLocaleTimeString()}</div>
          ) : null}
        </div>
      </div>

      {deviations.length > 0 ? (
        <div
          style={{
            margin: "16px 0 0",
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid var(--md-sys-color-warning)",
            background: "var(--md-sys-color-surface-container-low)",
            color: "var(--md-sys-color-on-surface)",
            fontSize: 13,
          }}
        >
          <b>{deviations.length} accepted {deviations.length === 1 ? "event has" : "events have"} changed in this run.</b>{" "}
          They stay in the list below even with “Hide tested” on — an event that was verified and then
          changed is the one thing here nobody has looked at yet.
          <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
            {deviations.slice(0, 8).map((d) => (
              <li key={d.item.eventName} style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12.5 }}>
                {d.item.eventName} — {d.why}
              </li>
            ))}
          </ul>
          {deviations.length > 8 ? (
            <div style={{ marginTop: 4, color: "var(--md-sys-color-on-surface-variant)" }}>
              …and {deviations.length - 8} more.
            </div>
          ) : null}
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 12, alignItems: "center", margin: "16px 0", flexWrap: "wrap" }}>
        <input
          placeholder="Search event / identity / screen / auto / coded…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...inputStyle, maxWidth: 320 }}
        />
        <select
          title="Pick the user whose run you are checking. The × column then counts only that device's firings, so this page and its live stream tally."
          value={userId}
          onChange={(e) => chooseUser(e.target.value)}
          style={{ ...inputStyle, maxWidth: 320,
                   borderColor: userId ? "var(--md-sys-color-primary)" : undefined }}
        >
          <option value="">All users — not a single run</option>
          {/* Newest first, and said out loud which one is still going. The list is already capped at
              five minutes, but "five minutes ago" and "still sending" look the same in a dropdown,
              and picking a finished run is how a static list gets read as though it were filling. */}
          {[...devices]
            .sort((a, b) => (a.lastEventAt < b.lastEventAt ? 1 : -1))
            .map((d) => {
              const ageMs = Date.now() - new Date(d.lastEventAt).getTime();
              const live = ageMs <= LIVE_WITHIN_MS;
              const ago = live ? "live" : `${Math.max(1, Math.round(ageMs / 60_000))}m ago`;
              // Keyed and labelled by the user's id — that is what the page scopes by, and what the
              // live stream is opened with. The Invotick id or email follows as the human handle.
              const who = d.invotickId || d.email;

  return (
                <option key={d.userId} value={d.userId}>
                  {`${live ? "● " : ""}${d.userId.slice(0, 8)}${who ? ` · ${who}` : ""} · ${d.recentEventCount} events · ${ago}`}
                </option>
              );
            })}
          {/* A user arrived at by link may not be in the recent list — keep it selectable rather
              than silently resetting the page to unscoped. */}
          {userId && !devices.some((d) => d.userId === userId) ? (
            <option value={userId}>{userId.slice(0, 8)} · from link</option>
          ) : null}
        </select>
        <label style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6, color: "var(--md-sys-color-on-surface)" }}>
          <input type="checkbox" checked={debugOnly} onChange={(e) => setDebugOnly(e.target.checked)} />
          Debug builds only
        </label>
        <label
          style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6, color: hideTested ? "var(--md-sys-color-primary)" : "var(--md-sys-color-on-surface)" }}
          title="Hide events already accepted as correct, so what is left is what still needs checking. Anything hidden that has changed is still reported above."
        >
          <input type="checkbox" checked={hideTested} onChange={(e) => setHideTested(e.target.checked)} />
          Hide tested
        </label>
        <label style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6, color: showIgnored ? "var(--md-sys-color-warning)" : "var(--md-sys-color-on-surface)" }}>
          <input type="checkbox" checked={showIgnored} onChange={(e) => setShowIgnored(e.target.checked)} />
          Show ignored
        </label>
        <label style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6, color: "var(--md-sys-color-on-surface)" }}>
          <input type="checkbox" checked={live} onChange={(e) => setLive(e.target.checked)} />
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: live ? "var(--md-sys-color-success)" : "var(--md-sys-color-inverse-surface)", display: "inline-block" }} />
            Live ({REFRESH_MS / 1000}s)
          </span>
        </label>
        
        <button
          className="btn btn-outline"
          onClick={async () => {
            const r = await copyText(
              buildDiscoveryReport(shown, {
                device: userId,
                debugOnly,
                showIgnored,
                search,
                fired: firedCount,
              }),
            );
            setCopyState(r);
            setTimeout(() => setCopyState("idle"), 2500);
          }}
        >
          {copyState === "copied" ? "Copied ✓" : copyState === "failed" ? "Copy failed" : "Copy list"}
        </button>
        <button
          className="btn btn-outline"
          title="Same report as a .txt file — easier to hand over than a wall of pasted text"
          onClick={() =>
            downloadText(
              `discovery-${(userId || "all").slice(0, 8)}-${fileStamp()}.txt`,
              buildDiscoveryReport(shown, {
                device: userId,
                debugOnly,
                showIgnored,
                search,
                fired: firedCount,
              }),
            )
          }
        >
          Download
        </button>
        <button
          type="button"
          onClick={() => load(true)}
          style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid var(--md-sys-color-outline-variant)", background: "var(--md-sys-color-surface-container-lowest)", fontSize: 13, cursor: "pointer" }}
        >
          Refresh
        </button>
        {/*
          Two buttons, not one that swaps.

          Clear list used to be REPLACED by "Show all" the moment it was pressed, so the control you
          had just used vanished and its place was taken by one that undoes it. Clearing twice — hide
          the noise, work a while, hide the new noise — needed an undo and a re-clear in between.

          Clear list now only ever clears. Show all appears next to it while a cleared marker exists
          and only ever brings the hidden events back.
        */}
        <button
          type="button"
          onClick={clearList}
          title="Hide all current events (noise). Configs are kept; new events still appear."
          style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid var(--md-sys-color-outline-variant)", background: "var(--md-sys-color-surface-container-lowest)", fontSize: 13, cursor: "pointer" }}
        >
          Clear list
        </button>
        {/* Not while Show ignored is on: the cutoff does not apply there, so a button offering to
            "show all" would claim something is hidden when nothing is. */}
        {clearedAt && !showIgnored ? (
          <button
            type="button"
            onClick={showAll}
            title={`Cleared at ${new Date(clearedAt).toLocaleTimeString()} — bring the hidden events back`}
            style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid var(--md-sys-color-outline-variant)", background: "var(--md-sys-color-surface-container-lowest)", color: "var(--md-sys-color-warning)", fontSize: 13, cursor: "pointer" }}
          >
            Show all (cleared {new Date(clearedAt).toLocaleTimeString()})
          </button>
        ) : null}

        {/* Last on the row, so it sits at the table's own top-right corner.
            It shapes the table; everything to its left changes what data is in it. Those
            are different questions and were reading as one pile of buttons — this one was
            stranded on the opposite side of the row from the table it belongs to. */}
        <ColumnsMenu
          labels={COLUMN_LABELS_EVENT_DISCOVERY}
          order={colOrder}
          hidden={colHidden}
          onToggle={toggleColumn}
          onMoveTo={moveColumnTo}
          onReset={resetWidths}
        />
      </div>


      {error ? <p style={{ color: "var(--md-sys-color-error)", fontSize: 13, marginBottom: 12 }}>{error}</p> : null}

      {loading ? (
        <p style={{ color: "var(--md-sys-color-on-surface)" }}>Loading discovery feed…</p>
      ) : (
        <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: "calc(100vh - 300px)", border: "1px solid var(--md-sys-color-outline-variant)", borderRadius: 10 }}>
          <table ref={tableRef} style={{ width: "100%", tableLayout: "fixed", borderCollapse: "collapse", background: "var(--md-sys-color-surface-container-lowest)" }}>
          {/* Widths belong to the columns, not to the headings — and with table-layout
              fixed this is the only place the browser looks for them. */}
          <colgroup>
            {visibleOrder.map((k) => (
              <col key={k} style={{ width: colW[k] }} />
            ))}
          </colgroup>
            <thead>
              <tr>
                {visibleOrder.map((k) => headers[k])}
              </tr>
            </thead>
            <tbody>
              {pending.filter((r) => r.anchor === null).map(renderPending)}
              {shown.flatMap((i, idx) => {
                const on = sendingOn(i);
                const needName = on && !nameVal(i).trim();
                const cells: Record<string, React.ReactNode> = {
                  idx: (
<td key="idx" style={{ ...td, textAlign: "right", color: "var(--md-sys-color-on-surface-variant)", fontVariantNumeric: "tabular-nums" }}>
                      {shown.length - idx}
                    </td>
                  ),
                  /* The whole cell is the target. A bare 13px checkbox is a tap that has to be
                        aimed: on a trackpad a light tap two pixels off does nothing at all, which
                        reads as needing a firmer click rather than a better-aimed one. */
                  tested: (
<td key="tested" style={{ ...td, textAlign: "center", padding: 0 }}>
                      <label
                        style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "10px 8px", minHeight: 34, cursor: "pointer" }}
                        title={
                          i.testedAt
                            ? `Accepted ${new Date(i.testedAt).toLocaleString()}${
                                i.baseline?.firings != null ? ` · fired ${i.baseline.firings}× then` : " · no baseline recorded"
                              }`
                            : userId
                              ? "Accept this event and record how it behaved in this run"
                              : "Accept this event. With no device selected there is no run to record, so it cannot be compared later."
                        }
                      >
                        <input
                          type="checkbox"
                          checked={Boolean(i.testedAt)}
                          onChange={(e) => void setTested(i, e.target.checked)}
                          style={{ width: 16, height: 16, cursor: "inherit", margin: 0 }}
                        />
                      </label>
                    </td>
                  ),
                  track: (
<td key="track" style={{ ...td, textAlign: "center" }}>
                      <Toggle on={on} onChange={(v) => setDraft(i.eventName, { denied: !v })} />
                    </td>
                  ),
                  live: (
<td key="live" style={td}>
                      {/* Deliberately the same derivation Live Events uses, and deliberately not a
                          shared helper: the two pages take different shapes of row, and a wrapper
                          that flattened both would be one more thing to keep honest. What has to
                          match is the string on screen. */}
                      {(() => {
                        const isScreen = eventType(i.eventName) === "screen";
                        const route = i.eventName.replace(/^screen:\s*/, "");
                        const asLive = isScreen ? route : i.eventName;
                        const detail = isScreen ? "screen_view" : i.screenName ?? "";
                        return (
                          <>
                            {/* Read by default, edited on request. The placeholder while editing is
                                what Live displays with no name set, so an empty box still says what
                                is on the other screen rather than nothing. */}
                            {/* A textarea, not an input. A name runs to forty characters and this
                                column is narrow: a single line scrolled the start of it out of sight,
                                so `App left (backgrounded)` was being edited as `pp left
                                (backgrounded)` with no sign that anything was missing. Editing
                                something you cannot fully see is worse than not editing it. */}
                            {editingName === i.eventName ? (
                              <textarea
                                autoFocus
                                rows={2}
                                ref={(el) => {
                                  if (!el) return;
                                  el.style.height = "auto";
                                  el.style.height = `${el.scrollHeight}px`;
                                }}
                                style={{
                                  ...inputStyle,
                                  fontFamily: "monospace",
                                  fontWeight: 700,
                                  lineHeight: 1.35,
                                  resize: "none",
                                  overflow: "hidden",
                                  overflowWrap: "anywhere",
                                  background: "var(--md-sys-color-surface-container-lowest)",
                                  color: "var(--md-sys-color-on-surface)",
                                  borderColor: needName ? "var(--md-sys-color-warning)" : "var(--md-sys-color-outline)",
                                }}
                                placeholder={asLive}
                                value={nameVal(i)}
                                onChange={(e) => {
                                  // Grow with the content, so nothing is ever scrolled out of view.
                                  e.currentTarget.style.height = "auto";
                                  e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
                                  setDraft(i.eventName, { displayName: sanitizeName(e.target.value) });
                                }}
                                onBlur={() => setEditingName(null)}
                                onKeyDown={(ev) => {
                                  // Enter closes rather than adding a line — a name has no lines, and
                                  // sanitizeName turns any whitespace into an underscore anyway.
                                  // Neither key saves: Save is still the row's own button, and a field
                                  // that committed on Enter but not on blur would be two rules for
                                  // one box.
                                  if (ev.key === "Enter") {
                                    ev.preventDefault();
                                    setEditingName(null);
                                  } else if (ev.key === "Escape") {
                                    setEditingName(null);
                                  }
                                }}
                              />
                            ) : (
                              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                                <span
                                  style={{
                                    fontFamily: "monospace",
                                    fontSize: 12.5,
                                    fontWeight: 700,
                                    overflowWrap: "anywhere",
                                    color: needName
                                      ? "var(--md-sys-color-warning)"
                                      : nameVal(i).trim()
                                        ? "var(--md-sys-color-on-surface)"
                                        : "var(--md-sys-color-on-surface-variant)",
                                  }}
                                >
                                  {nameVal(i).trim() || asLive}
                                </span>
                                <button
                                  type="button"
                                  disabled={!on}
                                  onClick={() => setEditingName(i.eventName)}
                                  title="Rename for reporting"
                                  aria-label={`Rename ${i.eventName}`}
                                  style={{
                                    flexShrink: 0,
                                    border: "none",
                                    background: "transparent",
                                    cursor: on ? "pointer" : "not-allowed",
                                    padding: "1px 4px",
                                    fontSize: 11,
                                    lineHeight: 1.4,
                                    opacity: on ? 1 : 0.35,
                                    color: needName ? "var(--md-sys-color-warning)" : "var(--md-sys-color-on-surface-variant)",
                                  }}
                                >
                                  ✎
                                </button>
                              </div>
                            )}
                            <div style={{ fontSize: 11, marginTop: 2, display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap", color: "var(--md-sys-color-on-surface-variant)" }}>
                              {detail ? <span>{detail}</span> : null}
                              {i.lastSeen ? <EventTime iso={i.lastSeen} /> : null}
                            </div>
                          </>
                        );
                      })()}
                    </td>
                  ),
                  identity: (
<td key="identity" style={td}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 6, flexWrap: "wrap" }}>
                        {/* Never broken mid-word. `break-all` turned `ad_impression_value` into four lines that each
                            read as nonsense, and an identity is the one string on this page that has to be read
                            exactly — it is what gets typed into a query later. The table scrolls instead. */}
                        <span style={{ fontFamily: "monospace", fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap" }}>{i.eventName}</span>
                        <button
                          type="button"
                          onClick={() => copyIdentity(i.eventName)}
                          title="Copy identity"
                          aria-label={`Copy ${i.eventName}`}
                          style={{
                            flexShrink: 0,
                            border: "none",
                            background: "transparent",
                            cursor: "pointer",
                            padding: "1px 4px",
                            fontSize: 11,
                            lineHeight: 1.4,
                            color: copiedRow === i.eventName ? "var(--md-sys-color-success)" : "var(--md-sys-color-on-surface-variant)",
                          }}
                        >
                          {copiedRow === i.eventName ? "✓" : "⧉"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setIgnored(i.eventName, !showIgnored)}
                          title={showIgnored ? "Restore to feed" : "Never show again"}
                          aria-label={showIgnored ? `Restore ${i.eventName}` : `Ignore ${i.eventName}`}
                          style={{
                            flexShrink: 0,
                            border: "none",
                            background: "transparent",
                            cursor: "pointer",
                            padding: "1px 4px",
                            fontSize: 11,
                            lineHeight: 1.4,
                            color: showIgnored ? "var(--md-sys-color-success)" : "var(--md-sys-color-on-surface-variant)",
                          }}
                        >
                          {showIgnored ? "↺" : "⊘"}
                        </button>
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          marginTop: 2,
                          display: "flex",
                          alignItems: "baseline",
                          gap: 6,
                          flexWrap: "wrap",
                        }}
                      >
                        {/* Only when there is one. The old `?? "—"` printed a dash for every event
                            that has no screen, so most rows opened with a placeholder and the time
                            arrived after a separator that separated nothing. */}
                        {i.screenName ? <span style={{ color: "var(--md-sys-color-on-surface)" }}>{i.screenName}</span> : null}
                        {i.lastSeen ? <EventTime iso={i.lastSeen} /> : null}
                        {/* Kind and channel moved down here from in front of the name.
                            They were the first thing on the row, so the identity started at a
                            different x depending on whether it was `screen` or `action`, `auto` or
                            `coded` — and Live Events, read beside this, starts every row with the
                            name. Two lists of the same events that cannot be run down side by side
                            are two lists nobody reconciles. Name first on both; everything about it
                            underneath, in the same order. */}
                        {eventType(i.eventName) === "screen" ? (
                          <span style={{ flexShrink: 0, fontSize: 10.5, fontWeight: 600, color: "var(--md-sys-color-primary)", background: "var(--md-sys-color-surface-container-low)", borderRadius: 5, padding: "2px 6px", marginTop: 1 }}>screen</span>
                        ) : (
                          <span style={{ flexShrink: 0, fontSize: 10.5, fontWeight: 600, color: "var(--md-sys-color-on-surface)", background: "var(--md-sys-color-surface-container-low)", borderRadius: 5, padding: "2px 6px", marginTop: 1 }}>action</span>
                        )}
                        {/*
                          Where the event came from — the thing that decides which lever it has, and
                          until now the page never said it.

                          Two rows can describe the SAME action twice: Topbar.topbar_back_1 is the
                          codemod capturing a back press, Create_Invoice_Backpress_click is somebody
                          having coded one deliberately. Choosing which to keep is impossible without
                          knowing which is which, and the shape of the name is a poor guess — this
                          reads `params.auto`, which only the auto-capture path stamps.

                          Rendered only when the field is actually present: an older backend does not
                          send it, and a missing value must not be drawn as "coded".
                        */}
                        {typeof i.autoCaptured === "boolean" ? (
                          <span
                            title={
                              i.autoCaptured
                                ? "Auto-captured by the codemod. Governed by the send-allowlist — it reaches production only if you add it, so there is nothing to remove from the app."
                                : "Deliberately coded as analytics.trackClick(...). The allowlist does not gate it, so it always sends and only deleting the call stops it."
                            }
                            style={{
                              flexShrink: 0,
                              fontSize: 10.5,
                              fontWeight: 600,
                              borderRadius: 5,
                              padding: "2px 6px",
                              marginTop: 1,
                              background: "var(--md-sys-color-surface-container-low)",
                              color: i.autoCaptured
                                ? "var(--md-sys-color-on-surface-variant)"
                                : "var(--md-sys-color-primary)",
                            }}
                          >
                            {i.autoCaptured ? "auto" : "coded"}
                          </span>
                        ) : null}
                        {/* The three states that used to be a column of their own.
                            That column labelled every row — "in list" or "debug-only" — and both
                            words answered a question the Sending toggle now answers directly, one
                            cell away. What is left are three things that are only sometimes true,
                            and a badge that appears only when it means something is worth more than
                            a column that has to say something about every row. */}
                        {i.stillFiringAfterRemoval ? (
                          <span title="We recorded this as removed and it arrived anyway — a release did not do what it claimed." style={{ flexShrink: 0, fontSize: 10.5, fontWeight: 600, borderRadius: 5, padding: "2px 6px", marginTop: 1, color: "var(--md-sys-color-error)", background: "var(--md-sys-color-surface-container)" }}>still firing</span>
                        ) : i.suppressStatus === "PENDING" ? (
                          <span title="Marked for removal from the app; not applied yet." style={{ flexShrink: 0, fontSize: 10.5, fontWeight: 600, borderRadius: 5, padding: "2px 6px", marginTop: 1, color: "var(--md-sys-color-error)", background: "var(--md-sys-color-surface-container-low)" }}>removing</span>
                        ) : null}
                        {i.planned ? (
                          <span title="Written down before the app emits it. Clears itself once the event actually fires." style={{ flexShrink: 0, fontSize: 10.5, fontWeight: 600, borderRadius: 5, padding: "2px 6px", marginTop: 1, color: "var(--md-sys-color-warning)", background: "var(--md-sys-color-surface-container-low)" }}>planned</span>
                        ) : null}
                        {/* The write said yes and the read disagrees. Shown rather than swallowed:
                            this row is displaying what was saved, not what discovery returned. */}
                        {i.unconfirmed ? (
                          <span
                            title="Saved successfully, but the discovery feed keeps returning a different value for this row. What you see here is what was saved. The write is fine; the read is not finding it."
                            style={{ fontSize: 10.5, color: "var(--md-sys-color-error)", border: "1px solid var(--md-sys-color-error)", borderRadius: 6, padding: "1px 6px", whiteSpace: "nowrap" }}
                          >
                            saved · server not returning it
                          </span>
                        ) : null}
                      </div>
                    </td>
                  ),
                  /* Bold once it has fired more than once, because that is the case the live
                        stream shows as several rows and this page shows as one. */
                  count: (
<td key="count" style={{ ...td, textAlign: "right", fontVariantNumeric: "tabular-nums",
                                 color: (i.firings ?? 0) > 1 ? "var(--md-sys-color-on-surface)" : "var(--md-sys-color-on-surface-variant)",
                                 fontWeight: (i.firings ?? 0) > 1 ? 700 : 400 }}>
                      {i.firings ?? 0}
                    </td>
                  ),
                  layer: (
<td key="layer" style={td}>
                      {layerSelect(layerVal(i), (v) => setDraft(i.eventName, { layer: v }), !layerVal(i))}
                    </td>
                  ),
                  replace: (
<td key="replace" style={td}>
                      <input
                        style={inputStyle}
                        placeholder="rename code id (optional) → e.g. send_button_clicked"
                        value={replaceVal(i)}
                        onChange={(e) => setDraft(i.eventName, { replaceName: sanitizeName(e.target.value) })}
                      />
                      {/* Typing the new name only queues the work; the rename lands in a release.
                          This is the other half — press it once the app is sending the new name, and
                          everything recorded here follows the identity instead of being stranded on
                          a name nothing will send again. */}
                      {replaceVal(i).trim() && replaceVal(i).trim() !== i.eventName && (
                        <button
                          type="button"
                          disabled={movingRow === i.eventName}
                          onClick={() => void applyRename(i)}
                          title={`Move everything recorded here — name, description, layer, allowlist, tested mark and baseline — from ${i.eventName} to ${replaceVal(i).trim()}. Press once the app is actually sending the new name.`}
                          style={{
                            marginTop: 4, fontSize: 11, padding: "3px 8px", borderRadius: 6, cursor: "pointer",
                            border: "1px solid var(--md-sys-color-outline)",
                            background: "transparent", color: "var(--md-sys-color-primary)",
                          }}
                        >
                          {movingRow === i.eventName ? "moving…" : "rename shipped → carry over"}
                        </button>
                      )}
                    </td>
                  ),
                  actions: (
<td key="actions" style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>
                      <button
                        type="button"
                        onClick={() => save(i)}
                        disabled={savingRow === i.eventName}
                        style={{
                          padding: "6px 12px",
                          borderRadius: 6,
                          border: "none",
                          background: savedRow === i.eventName ? "var(--md-sys-color-success)" : "var(--md-sys-color-primary)",
                          color: "var(--md-sys-color-on-primary)",
                          fontSize: 12.5,
                          fontWeight: 600,
                          cursor: "pointer",
                          opacity: savingRow === i.eventName ? 0.6 : 1,
                        }}
                      >
                        {savingRow === i.eventName ? "Saving…" : savedRow === i.eventName ? "Saved ✓" : "Save"}
                      </button>
                      {rowMenu(i)}
                    </td>
                  ),
                };
                return [
                  ...pending.filter((r) => r.anchor === i.eventName && r.position === "above").map(renderPending),
                  <tr
                    key={i.eventName}
                    style={{ background: i.planned ? "var(--md-sys-color-surface-container-lowest)" : on ? "var(--md-sys-color-primary-container)" : undefined }}
                  >
                    {visibleOrder.map((k) => cells[k])}
                  </tr>,
                  ...pending.filter((r) => r.anchor === i.eventName && r.position === "below").map(renderPending),
                ];
              })}
              {filtered.length === 0 && pending.length === 0 ? (
                <tr>
                  {/* Was 8 while the table had 11 columns, and is 12 now. A short colSpan does not
                      error — the message simply stops short of the table and the empty state looks
                      like a broken row. */}
                  <td style={{ ...td, color: "var(--md-sys-color-on-surface-variant)", textAlign: "center" }} colSpan={11}>
                    {showIgnored
                      ? "No ignored events."
                      : `No events yet${debugOnly ? " from debug builds" : ""}. Interact with the debug app — actions appear here live.`}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
