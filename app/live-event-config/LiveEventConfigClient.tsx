"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { api, type EventDiscoveryItem, type DefaultListTask, type DebugDevice } from "@/lib/api";
import { EventTime, timeWithMillis } from "@/lib/eventTime";
import { copyText, downloadText, fileStamp } from "@/lib/clipboard";

// Per-row unsaved edits, so the live refresh never clobbers what the admin is typing.
interface Draft {
  tracked?: boolean;
  displayName?: string;
  replaceName?: string;
  description?: string;
  layer?: string;
}

const REFRESH_MS = 4000;

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
    ["#", "fired", "kind", "src", "identity", "layer", "status", "display name", "description"].join(" | "),
  ];
  const rows = items.map((i, idx) =>
    [
      items.length - idx,
      i.firings ?? 0,
      eventType(i.eventName),
      i.autoCaptured ? "auto" : "coded",
      i.eventName,
      i.layer || "-",
      i.planned ? "planned" : i.inList ? "in list" : "debug-only",
      i.displayName || "-",
      (i.description || "-").replace(/\s+/g, " "),
    ].join(" | "),
  );
  return [...head, ...rows].join("\n");
}

interface PendingRow {
  id: string;
  anchor: string | null;
  position: "above" | "below";
  eventName: string;
  identityType: "action" | "screen";
  layer: string;
  displayName: string;
  description: string;
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
    description: "",
  };
}

// "Live Event Discovery and Config" — live-lists every event / UI-action the DEBUG app emits (its
// meaningful name, or a searchable identity when it has none), each tagged in-list or debug-only.
// Turning "Track" on adds the event to the backend override allowlist (so release builds send it),
// maps a display name for reporting, and queues a task to bake the key into the app's bundled
// default list next release. The app's bundled default list stays the primary source of truth.
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
  const [showDefault, setShowDefault] = useState(false);
  const [defaultItems, setDefaultItems] = useState<DefaultListTask[]>([]);
  const [defaultLoading, setDefaultLoading] = useState(false);
  const [copiedKt, setCopiedKt] = useState(false);

  // Auto-captured identity? (file-based tap/btn/ib or a tap:screen:label key). Only these are
  // gated by the allowlist AND have no production history, so they're safe to rename in code.
  function isAutoCaptured(key: string): boolean {
    return /^tap:/.test(key) || /\.(tap|btn|ib)_\d+$/.test(key);
  }

  function buildKotlin(list: DefaultListTask[]): string {
    const date = new Date().toISOString().slice(0, 10);
    const lines = list.map((i) => {
      // [replace] = the admin filled the Replace-name column -> rename the code id to it (key = that name).
      // Otherwise [keep] the raw event name (display name, if any, is a reporting mapping only).
      const replace = !!i.replaceName;
      const key = replace ? (i.replaceName as string) : i.eventName;
      const tag = replace
        ? `  // [replace] ← ${i.eventName}`
        : i.displayName
          ? `  // [keep] ${i.displayName}`
          : "";
      return `    "${key}",${tag}`;
    });
    return (
      `// Live Event Discovery — bundled default allowlist (exported ${date})\n` +
      `// Paste into AnalyticsAllowlist.DEFAULT (core/analytics).\n` +
      `// [replace] = rename that code analyticsId to this name (admin set Replace name — auto + not shipped).\n` +
      `// [keep]    = leave the raw event name; the display name is a reporting mapping only.\n` +
      `private val DEFAULT: Set<String> = setOf(\n${lines.join("\n")}\n)\n`
    );
  }

  async function openDefaultList() {
    setShowDefault(true);
    setDefaultLoading(true);
    try {
      setDefaultItems(await api.getDefaultList());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load the default list.");
    } finally {
      setDefaultLoading(false);
    }
  }

  async function resetDefaultList() {
    if (!window.confirm("Reset the default list? This untracks ALL events so you can build a fresh list. Names/descriptions are kept.")) return;
    try {
      await api.resetDefaultList();
      setDefaultItems([]);
      await load(true); // refresh the feed so Track toggles reflect the reset
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reset failed.");
    }
  }

  function exportKotlin() {
    const text = buildKotlin(defaultItems);
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "AnalyticsAllowlist.default.kt";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function copyKotlin() {
    const text = buildKotlin(defaultItems);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopiedKt(true);
    setTimeout(() => setCopiedKt(false), 1500);
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
  const [userId, setUserId] = useState(() =>
    typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("userId") ?? "",
  );
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  // The devices a test round can be picked from. Debug, because that is what separates the phone
  // doing the testing from four thousand real users — the intuitive filter, "versions above the
  // released one", returns nothing at all: a debug build of 1.4.0 reports `1.4.0` like everyone.
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [devices, setDevices] = useState<DebugDevice[]>([]);
  useEffect(() => {
    let cancelled = false;
    const pull = async () => {
      try {
        // Five minutes, the same boundary Live Events stops calling a user recent at. A device
        // that stopped sending five minutes ago is not a run anyone is watching, and listing it
        // only makes the live one harder to find.
        const d = await api.getDebugDevices(5);
        if (!cancelled) setDevices(d);
      } catch {
        // A missing list leaves the page unscoped, which is the old behaviour and still usable.
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

  const load = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const data = await api.getEventDiscovery(debugOnlyRef.current, showIgnoredRef.current, userIdRef.current.trim() || undefined);
      setItems(data);
      setError(null);
      setLastRefreshed(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load the discovery feed.");
    } finally {
      if (showSpinner) setLoading(false);
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
  const firedCount = filtered.reduce((n, i) => n + (i.firings ?? 0), 0);
  const seenCount = useMemo(() => visibleItems.filter((i) => !i.planned).length, [visibleItems]);
  const plannedCount = useMemo(() => visibleItems.filter((i) => i.planned).length, [visibleItems]);
  const inListCount = useMemo(() => visibleItems.filter((i) => i.inList).length, [visibleItems]);
  const needNameCount = useMemo(
    () => visibleItems.filter((i) => (drafts[i.eventName]?.tracked ?? i.tracked) && !(drafts[i.eventName]?.displayName ?? i.displayName)).length,
    [visibleItems, drafts],
  );

  const trackedOn = (i: EventDiscoveryItem) => drafts[i.eventName]?.tracked ?? i.tracked;
  const nameVal = (i: EventDiscoveryItem) => drafts[i.eventName]?.displayName ?? i.displayName ?? "";
  const replaceVal = (i: EventDiscoveryItem) => drafts[i.eventName]?.replaceName ?? i.replaceName ?? "";
  const descVal = (i: EventDiscoveryItem) => drafts[i.eventName]?.description ?? i.description ?? "";
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
        description: row.description.trim() || null,
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
    return (
      <tr key={row.id} style={{ background: "var(--md-sys-color-surface-container-lowest)" }}>
        {/* An authored row is not part of the discovered feed, so it holds the column without a
            number rather than borrowing one and shifting every row below it. */}
        <td style={{ ...td, textAlign: "right", color: "var(--md-sys-color-on-surface-variant)", fontSize: 11 }}>—</td>
        <td style={{ ...td, textAlign: "center", color: "var(--md-sys-color-on-surface-variant)", fontSize: 11 }}>—</td>
        <td style={td}>
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
        <td style={{ ...td, textAlign: "right", color: "var(--md-sys-color-on-surface-variant)", fontSize: 11 }}>—</td>
        <td style={td}>
          {layerSelect(row.layer, (v) => patchPending(row.id, { layer: v }), !row.layer)}
        </td>
        <td style={td}>
          <span style={{ fontSize: 11, color: "var(--md-sys-color-warning)", background: "var(--md-sys-color-surface-container-low)", borderRadius: 6, padding: "3px 8px", whiteSpace: "nowrap" }}>
            ● planned
          </span>
        </td>
        <td style={td}>
          <input
            value={row.displayName}
            onChange={(e) => patchPending(row.id, { displayName: e.target.value })}
            placeholder="Reporting name"
            style={inp}
          />
        </td>
        <td style={td}>
          {/* Renaming targets an identity that already exists in code. This one does not yet. */}
          <input disabled placeholder="n/a until it exists" style={{ ...inp, background: "var(--md-sys-color-surface-container-lowest)", color: "var(--md-sys-color-on-surface-variant)" }} />
        </td>
        <td style={td}>
          <input
            value={row.description}
            onChange={(e) => patchPending(row.id, { description: e.target.value })}
            placeholder="What it means and exactly where it fires"
            style={inp}
          />
        </td>
        <td style={{ ...td, whiteSpace: "nowrap" }}>
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
    try {
      const task = await api.saveEventConfig({
        eventName: i.eventName,
        layer: layerVal(i) || null,
        tracked: trackedOn(i),
        displayName: nameVal(i).trim() || null,
        replaceName: replaceVal(i).trim() || null,
        description: descVal(i).trim() || null,
        screenName: i.screenName,
      });
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
                tracked: trackedOn(i),
                displayName: task.displayName,
                description: task.description,
                defaultListStatus: task.status,
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
            Every event & UI-action the <b>debug</b> app emits, tagged <b>in-list</b> or <b>debug-only</b>. Turn
            <b> Track</b> on to send it from release builds + name it — the app&apos;s bundled default list stays primary.
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
            <b style={{ color: "var(--md-sys-color-success)" }}>{inListCount}</b> in list ·{" "}
            <b style={{ color: needNameCount ? "var(--md-sys-color-warning)" : "var(--md-sys-color-success)" }}>{needNameCount}</b> need name
          </div>
          {lastRefreshed ? (
            <div style={{ fontSize: 11, color: "var(--md-sys-color-on-surface-variant)", marginTop: 2 }}>updated {lastRefreshed.toLocaleTimeString()}</div>
          ) : null}
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center", margin: "16px 0", flexWrap: "wrap" }}>
        <input
          placeholder="Search event / identity / screen / auto / coded…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...inputStyle, maxWidth: 320 }}
        />
        <select
          title="Pick the device whose run you are checking. The × column then counts only that device's firings, so this page and its live stream tally."
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          style={{ ...inputStyle, maxWidth: 320,
                   borderColor: userId ? "var(--md-sys-color-primary)" : undefined }}
        >
          <option value="">All devices — not a single run</option>
          {devices.map((d) => (
            <option key={d.userId} value={d.userId}>
              {(d.invotickId || d.email || d.userId.slice(0, 8)) +
                ` · ${d.recentEventCount} events · ${timeWithMillis(d.lastEventAt).slice(0, 8)}`}
            </option>
          ))}
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
          type="button"
          onClick={() => (showDefault ? setShowDefault(false) : openDefaultList())}
          style={{ marginLeft: "auto", padding: "6px 14px", borderRadius: 6, border: "1px solid var(--md-sys-color-outline-variant)", background: showDefault ? "var(--md-sys-color-surface-container-low)" : "var(--md-sys-color-surface-container-lowest)", color: "var(--md-sys-color-primary)", fontSize: 13, fontWeight: 500, cursor: "pointer" }}
        >
          {showDefault ? "Hide default list" : "Default list"}
        </button>
        <button
          className="btn btn-outline"
          onClick={async () => {
            const r = await copyText(
              buildDiscoveryReport(visibleItems, {
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
              buildDiscoveryReport(visibleItems, {
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
      </div>

      {showDefault ? (
        <div style={{ border: "1px solid var(--md-sys-color-outline-variant)", background: "var(--md-sys-color-surface-container-lowest)", borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--md-sys-color-primary)" }}>App bundled default list</div>
              <div style={{ fontSize: 12, color: "var(--md-sys-color-on-surface)", marginTop: 2 }}>
                Every tracked event — ships in the app as <code>AnalyticsAllowlist.DEFAULT</code>. <b>{defaultItems.length}</b> keys.
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={resetDefaultList}
                disabled={defaultItems.length === 0}
                title="Untrack all events to build a fresh default list"
                style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid var(--md-sys-color-outline-variant)", background: "var(--md-sys-color-surface-container-lowest)", color: "var(--md-sys-color-error)", fontSize: 13, cursor: "pointer" }}
              >
                Reset
              </button>
              <button
                type="button"
                onClick={copyKotlin}
                disabled={defaultItems.length === 0}
                style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid var(--md-sys-color-outline-variant)", background: "var(--md-sys-color-surface-container-lowest)", fontSize: 13, cursor: "pointer" }}
              >
                {copiedKt ? "Copied ✓" : "Copy .kt"}
              </button>
              <button
                type="button"
                onClick={exportKotlin}
                disabled={defaultItems.length === 0}
                style={{ padding: "6px 12px", borderRadius: 6, border: "none", background: "var(--md-sys-color-primary-container)", color: "var(--md-sys-color-on-primary-container)", fontSize: 13, fontWeight: 500, cursor: "pointer" }}
              >
                Export .kt
              </button>
            </div>
          </div>
          {defaultLoading ? (
            <p style={{ color: "var(--md-sys-color-on-surface)", fontSize: 13 }}>Loading…</p>
          ) : defaultItems.length === 0 ? (
            <p style={{ color: "var(--md-sys-color-on-surface-variant)", fontSize: 13 }}>No tracked events yet. Turn Track on for an event to add it here.</p>
          ) : (
            <pre style={{ margin: 0, maxHeight: 260, overflow: "auto", background: "var(--md-sys-color-surface-container-lowest)", border: "1px solid var(--md-sys-color-outline-variant)", borderRadius: 6, padding: 12, fontSize: 12.5, lineHeight: 1.7, whiteSpace: "pre" }}>
              {buildKotlin(defaultItems)}
            </pre>
          )}
        </div>
      ) : null}

      {error ? <p style={{ color: "var(--md-sys-color-error)", fontSize: 13, marginBottom: 12 }}>{error}</p> : null}

      {loading ? (
        <p style={{ color: "var(--md-sys-color-on-surface)" }}>Loading discovery feed…</p>
      ) : (
        <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: "calc(100vh - 300px)", border: "1px solid var(--md-sys-color-outline-variant)", borderRadius: 10 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", background: "var(--md-sys-color-surface-container-lowest)" }}>
            <thead>
              <tr>
                <th style={{ ...th, width: 40, textAlign: "right" }}>#</th>
                <th style={{ ...th, width: 64 }}>Track</th>
                {/* Bounded at both ends. Unbounded, an unbroken identity demanded 615px and starved
                    the rest — Layer collapsed to 51px and Description to 88. */}
                <th style={{ ...th, minWidth: 210 }}>Event / identity</th>
                {/* The total belongs over the column it totals. It was only in the summary line at
                    the far right of the page, which is nowhere near the numbers it adds up. */}
                <th
                  style={{ ...th, width: 56, textAlign: "right" }}
                  title="How many times this fired — the row is one identity, this is its occurrences"
                >
                  <div style={{ fontVariantNumeric: "tabular-nums", fontWeight: 700, color: "var(--md-sys-color-on-surface)" }}>
                    {firedCount}
                  </div>
                </th>
                <th style={{ ...th, width: 150, minWidth: 150 }} title="Who caused this event — what a funnel cannot tell you about itself">
                  Layer
                </th>
                <th style={{ ...th, width: 108, minWidth: 100 }}>Status</th>
                <th style={{ ...th, width: 180, minWidth: 150 }}>
                  Display name
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
                </th>
                <th style={{ ...th, width: 180, minWidth: 150 }}>
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
                </th>
                <th style={th}>Description</th>
                <th style={{ ...th, width: 90 }}></th>
              </tr>
            </thead>
            <tbody>
              {pending.filter((r) => r.anchor === null).map(renderPending)}
              {filtered.flatMap((i, idx) => {
                const on = trackedOn(i);
                const needName = on && !nameVal(i).trim();
                return [
                  ...pending.filter((r) => r.anchor === i.eventName && r.position === "above").map(renderPending),
                  <tr
                    key={i.eventName}
                    style={{ background: i.planned ? "var(--md-sys-color-surface-container-lowest)" : on ? "var(--md-sys-color-primary-container)" : undefined }}
                  >
                    <td style={{ ...td, textAlign: "right", color: "var(--md-sys-color-on-surface-variant)", fontVariantNumeric: "tabular-nums" }}>
                      {filtered.length - idx}
                    </td>
                    <td style={{ ...td, textAlign: "center" }}>
                      <Toggle on={on} onChange={(v) => setDraft(i.eventName, { tracked: v })} />
                    </td>
                    <td style={td}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 6, flexWrap: "wrap" }}>
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
                      </div>
                    </td>
                    {/* Bold once it has fired more than once, because that is the case the live
                        stream shows as several rows and this page shows as one. */}
                    <td style={{ ...td, textAlign: "right", fontVariantNumeric: "tabular-nums",
                                 color: (i.firings ?? 0) > 1 ? "var(--md-sys-color-on-surface)" : "var(--md-sys-color-on-surface-variant)",
                                 fontWeight: (i.firings ?? 0) > 1 ? 700 : 400 }}>
                      {i.firings ?? 0}
                    </td>
                    <td style={td}>
                      {layerSelect(layerVal(i), (v) => setDraft(i.eventName, { layer: v }), !layerVal(i))}
                    </td>
                    <td style={td}>
                      {/* Planned is tested FIRST. It has inList = false, so any check starting from
                          inList files it under "debug-only" — which reads as "this fired but is not
                          allowlisted" and is the exact confusion this status exists to prevent. */}
                      {i.stillFiringAfterRemoval ? (
                        /* We said this was removed and it arrived anyway. Loudest state on the row,
                           because it means a release did not do what it claimed. */
                        <span style={{ fontSize: 11, color: "var(--md-sys-color-error)", background: "var(--md-sys-color-surface-container)", borderRadius: 6, padding: "3px 8px", whiteSpace: "nowrap" }}>● still firing</span>
                      ) : i.suppressStatus === "PENDING" ? (
                        <span style={{ fontSize: 11, color: "var(--md-sys-color-error)", background: "var(--md-sys-color-surface-container-low)", borderRadius: 6, padding: "3px 8px", whiteSpace: "nowrap" }}>● removing</span>
                      ) : i.planned ? (
                        <span style={{ fontSize: 11, color: "var(--md-sys-color-warning)", background: "var(--md-sys-color-surface-container-low)", borderRadius: 6, padding: "3px 8px", whiteSpace: "nowrap" }}>● planned</span>
                      ) : i.inList ? (
                        <span style={{ fontSize: 11, color: "var(--md-sys-color-success)", background: "var(--md-sys-color-surface-container-lowest)", borderRadius: 6, padding: "3px 8px", whiteSpace: "nowrap" }}>● in list</span>
                      ) : (
                        <span style={{ fontSize: 11, color: "var(--md-sys-color-warning)", background: "var(--md-sys-color-surface-container-lowest)", borderRadius: 6, padding: "3px 8px", whiteSpace: "nowrap" }}>● debug-only</span>
                      )}
                      {i.defaultListStatus === "PENDING" ? (
                        <div style={{ fontSize: 10.5, color: "var(--md-sys-color-warning)", marginTop: 3 }}>task queued</div>
                      ) : i.defaultListStatus === "APPLIED" ? (
                        <div style={{ fontSize: 10.5, color: "var(--md-sys-color-success)", marginTop: 3 }}>✓ in default</div>
                      ) : null}
                    </td>
                    <td style={td}>
                      <input
                        style={{ ...inputStyle, background: on ? "var(--md-sys-color-surface-container-lowest)" : "var(--md-sys-color-surface-container-low)", color: on ? "var(--md-sys-color-on-surface)" : "var(--md-sys-color-on-surface-variant)", borderColor: needName ? "var(--md-sys-color-warning)" : "var(--md-sys-color-outline)" }}
                        placeholder={on ? "e.g. invoice_sent" : "Track on to name"}
                        disabled={!on}
                        value={nameVal(i)}
                        onChange={(e) => setDraft(i.eventName, { displayName: sanitizeName(e.target.value) })}
                      />
                    </td>
                    <td style={td}>
                      <input
                        style={inputStyle}
                        placeholder="rename code id (optional) → e.g. send_button_clicked"
                        value={replaceVal(i)}
                        onChange={(e) => setDraft(i.eventName, { replaceName: sanitizeName(e.target.value) })}
                      />
                    </td>
                    <td style={td}>
                      <input
                        style={inputStyle}
                        placeholder="What this event means / where it fires…"
                        value={descVal(i)}
                        onChange={(e) => setDraft(i.eventName, { description: e.target.value })}
                      />
                    </td>
                    <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>
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
                  </tr>,
                  ...pending.filter((r) => r.anchor === i.eventName && r.position === "below").map(renderPending),
                ];
              })}
              {filtered.length === 0 && pending.length === 0 ? (
                <tr>
                  <td style={{ ...td, color: "var(--md-sys-color-on-surface-variant)", textAlign: "center" }} colSpan={8}>
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
