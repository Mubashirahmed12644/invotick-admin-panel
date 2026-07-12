"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { api, type EventDiscoveryItem, type DefaultListTask } from "@/lib/api";

// Per-row unsaved edits, so the live refresh never clobbers what the admin is typing.
interface Draft {
  tracked?: boolean;
  displayName?: string;
  description?: string;
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

  function buildKotlin(list: DefaultListTask[]): string {
    const date = new Date().toISOString().slice(0, 10);
    const lines = list.map((i) => `    "${i.eventName}",${i.displayName ? `  // ${i.displayName}` : ""}`);
    return (
      `// Live Event Discovery — bundled default allowlist (exported ${date})\n` +
      `// Paste into AnalyticsAllowlist.DEFAULT (core/analytics).\n` +
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

  const debugOnlyRef = useRef(debugOnly);
  debugOnlyRef.current = debugOnly;
  const showIgnoredRef = useRef(showIgnored);
  showIgnoredRef.current = showIgnored;

  const load = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const data = await api.getEventDiscovery(debugOnlyRef.current, showIgnoredRef.current);
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
  }, [debugOnly, showIgnored]);

  // Events still visible after the "Clear" cutoff (content-only; configs are untouched).
  const visibleItems = useMemo(
    () =>
      clearedAt
        ? items.filter((i) => (i.lastSeen ? new Date(i.lastSeen).getTime() > clearedAt : true))
        : items,
    [items, clearedAt],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return visibleItems;
    return visibleItems.filter(
      (i) =>
        i.eventName.toLowerCase().includes(q) ||
        (i.screenName ?? "").toLowerCase().includes(q) ||
        (i.displayName ?? "").toLowerCase().includes(q),
    );
  }, [visibleItems, search]);

  const inListCount = useMemo(() => visibleItems.filter((i) => i.inList).length, [visibleItems]);
  const needNameCount = useMemo(
    () => visibleItems.filter((i) => (drafts[i.eventName]?.tracked ?? i.tracked) && !(drafts[i.eventName]?.displayName ?? i.displayName)).length,
    [visibleItems, drafts],
  );

  const trackedOn = (i: EventDiscoveryItem) => drafts[i.eventName]?.tracked ?? i.tracked;
  const nameVal = (i: EventDiscoveryItem) => drafts[i.eventName]?.displayName ?? i.displayName ?? "";
  const descVal = (i: EventDiscoveryItem) => drafts[i.eventName]?.description ?? i.description ?? "";

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
        tracked: trackedOn(i),
        displayName: nameVal(i).trim() || null,
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
    border: "1px solid #d4d4d8",
    borderRadius: 6,
    fontSize: 13,
  };
  const th: React.CSSProperties = {
    textAlign: "left",
    padding: "8px 10px",
    fontSize: 12,
    fontWeight: 700,
    color: "#52525b",
    borderBottom: "1px solid #e4e4e7",
    whiteSpace: "nowrap",
    position: "sticky",
    top: 0,
    background: "#f9fafb",
    zIndex: 1,
  };
  const td: React.CSSProperties = {
    padding: "8px 10px",
    borderBottom: "1px solid #f1f1f4",
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
          background: on ? "#16a34a" : "#d4d4d8",
          padding: 2,
          cursor: "pointer",
          display: "inline-flex",
          justifyContent: on ? "flex-end" : "flex-start",
          alignItems: "center",
        }}
      >
        <span style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", display: "block" }} />
      </button>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
      <Link
        href="/"
        style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "#0D4DC0", textDecoration: "none", marginBottom: 12 }}
      >
        ← Back to home
      </Link>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0D4DC0" }}>Live Event Discovery and Config</h1>
          <p style={{ color: "#71717a", fontSize: 13, marginTop: 4, maxWidth: 720 }}>
            Every event & UI-action the <b>debug</b> app emits, tagged <b>in-list</b> or <b>debug-only</b>. Turn
            <b> Track</b> on to send it from release builds + name it — the app&apos;s bundled default list stays primary.
          </p>
        </div>
        <div style={{ fontSize: 13, color: "#52525b", textAlign: "right" }}>
          <div>
            <b>{visibleItems.length}</b> seen · <b style={{ color: "#16a34a" }}>{inListCount}</b> in list ·{" "}
            <b style={{ color: needNameCount ? "#d97706" : "#16a34a" }}>{needNameCount}</b> need name
          </div>
          {lastRefreshed ? (
            <div style={{ fontSize: 11, color: "#a1a1aa", marginTop: 2 }}>updated {lastRefreshed.toLocaleTimeString()}</div>
          ) : null}
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center", margin: "16px 0", flexWrap: "wrap" }}>
        <input
          placeholder="Search event / identity / screen…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...inputStyle, maxWidth: 320 }}
        />
        <label style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6, color: "#3f3f46" }}>
          <input type="checkbox" checked={debugOnly} onChange={(e) => setDebugOnly(e.target.checked)} />
          Debug builds only
        </label>
        <label style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6, color: showIgnored ? "#b45309" : "#3f3f46" }}>
          <input type="checkbox" checked={showIgnored} onChange={(e) => setShowIgnored(e.target.checked)} />
          Show ignored
        </label>
        <label style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6, color: "#3f3f46" }}>
          <input type="checkbox" checked={live} onChange={(e) => setLive(e.target.checked)} />
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: live ? "#16a34a" : "#a1a1aa", display: "inline-block" }} />
            Live ({REFRESH_MS / 1000}s)
          </span>
        </label>
        <button
          type="button"
          onClick={() => (showDefault ? setShowDefault(false) : openDefaultList())}
          style={{ marginLeft: "auto", padding: "6px 14px", borderRadius: 6, border: "1px solid #0D4DC0", background: showDefault ? "#eff6ff" : "#fff", color: "#0D4DC0", fontSize: 13, fontWeight: 500, cursor: "pointer" }}
        >
          {showDefault ? "Hide default list" : "Default list"}
        </button>
        <button
          type="button"
          onClick={() => load(true)}
          style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid #d4d4d8", background: "#fff", fontSize: 13, cursor: "pointer" }}
        >
          Refresh
        </button>
        {clearedAt ? (
          <button
            type="button"
            onClick={showAll}
            title={`Cleared at ${new Date(clearedAt).toLocaleTimeString()} — showing events since then`}
            style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid #b45309", background: "#fffbeb", color: "#b45309", fontSize: 13, cursor: "pointer" }}
          >
            Show all (cleared {new Date(clearedAt).toLocaleTimeString()})
          </button>
        ) : (
          <button
            type="button"
            onClick={clearList}
            title="Hide all current events (noise). Configs are kept; new events still appear."
            style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid #d4d4d8", background: "#fff", fontSize: 13, cursor: "pointer" }}
          >
            Clear list
          </button>
        )}
      </div>

      {showDefault ? (
        <div style={{ border: "1px solid #bfdbfe", background: "#f8fbff", borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#0D4DC0" }}>App bundled default list</div>
              <div style={{ fontSize: 12, color: "#71717a", marginTop: 2 }}>
                Every tracked event — ships in the app as <code>AnalyticsAllowlist.DEFAULT</code>. <b>{defaultItems.length}</b> keys.
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={copyKotlin}
                disabled={defaultItems.length === 0}
                style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #d4d4d8", background: "#fff", fontSize: 13, cursor: "pointer" }}
              >
                {copiedKt ? "Copied ✓" : "Copy .kt"}
              </button>
              <button
                type="button"
                onClick={exportKotlin}
                disabled={defaultItems.length === 0}
                style={{ padding: "6px 12px", borderRadius: 6, border: "none", background: "#0D4DC0", color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer" }}
              >
                Export .kt
              </button>
            </div>
          </div>
          {defaultLoading ? (
            <p style={{ color: "#71717a", fontSize: 13 }}>Loading…</p>
          ) : defaultItems.length === 0 ? (
            <p style={{ color: "#a1a1aa", fontSize: 13 }}>No tracked events yet. Turn Track on for an event to add it here.</p>
          ) : (
            <pre style={{ margin: 0, maxHeight: 260, overflow: "auto", background: "#fff", border: "1px solid #e4e4e7", borderRadius: 6, padding: 12, fontSize: 12.5, lineHeight: 1.7, whiteSpace: "pre" }}>
              {buildKotlin(defaultItems)}
            </pre>
          )}
        </div>
      ) : null}

      {error ? <p style={{ color: "#dc2626", fontSize: 13, marginBottom: 12 }}>{error}</p> : null}

      {loading ? (
        <p style={{ color: "#71717a" }}>Loading discovery feed…</p>
      ) : (
        <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: "calc(100vh - 300px)", border: "1px solid #e4e4e7", borderRadius: 10 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff" }}>
            <thead>
              <tr>
                <th style={{ ...th, width: 64 }}>Track</th>
                <th style={th}>Event / identity</th>
                <th style={{ ...th, width: 108 }}>Status</th>
                <th style={{ ...th, width: 180 }}>Display name</th>
                <th style={th}>Description</th>
                <th style={{ ...th, width: 90 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((i) => {
                const on = trackedOn(i);
                const needName = on && !nameVal(i).trim();
                return (
                  <tr key={i.eventName} style={{ background: on ? "#eff6ff" : undefined }}>
                    <td style={{ ...td, textAlign: "center" }}>
                      <Toggle on={on} onChange={(v) => setDraft(i.eventName, { tracked: v })} />
                    </td>
                    <td style={td}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                        {eventType(i.eventName) === "screen" ? (
                          <span style={{ flexShrink: 0, fontSize: 10.5, fontWeight: 600, color: "#6d28d9", background: "#f5f3ff", borderRadius: 5, padding: "2px 6px", marginTop: 1 }}>screen</span>
                        ) : (
                          <span style={{ flexShrink: 0, fontSize: 10.5, fontWeight: 600, color: "#3f3f46", background: "#f4f4f5", borderRadius: 5, padding: "2px 6px", marginTop: 1 }}>action</span>
                        )}
                        <span style={{ fontFamily: "monospace", fontSize: 12.5, fontWeight: 600, wordBreak: "break-all" }}>{i.eventName}</span>
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
                            color: copiedRow === i.eventName ? "#16a34a" : "#a1a1aa",
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
                            color: showIgnored ? "#16a34a" : "#c4c4c8",
                          }}
                        >
                          {showIgnored ? "↺" : "⊘"}
                        </button>
                      </div>
                      <div style={{ fontSize: 11, color: "#a1a1aa", marginTop: 2 }}>
                        {i.screenName ?? "—"}
                        {i.lastSeen ? ` · ${new Date(i.lastSeen).toLocaleTimeString()}` : ""}
                      </div>
                    </td>
                    <td style={td}>
                      {i.inList ? (
                        <span style={{ fontSize: 11, color: "#15803d", background: "#f0fdf4", borderRadius: 6, padding: "3px 8px", whiteSpace: "nowrap" }}>● in list</span>
                      ) : (
                        <span style={{ fontSize: 11, color: "#b45309", background: "#fffbeb", borderRadius: 6, padding: "3px 8px", whiteSpace: "nowrap" }}>● debug-only</span>
                      )}
                      {i.defaultListStatus === "PENDING" ? (
                        <div style={{ fontSize: 10.5, color: "#d97706", marginTop: 3 }}>task queued</div>
                      ) : i.defaultListStatus === "APPLIED" ? (
                        <div style={{ fontSize: 10.5, color: "#16a34a", marginTop: 3 }}>✓ in default</div>
                      ) : null}
                    </td>
                    <td style={td}>
                      <input
                        style={{ ...inputStyle, background: on ? "#fff" : "#f4f4f5", color: on ? "#111" : "#a1a1aa", borderColor: needName ? "#f59e0b" : "#d4d4d8" }}
                        placeholder={on ? "e.g. invoice_sent" : "Track on to name"}
                        disabled={!on}
                        value={nameVal(i)}
                        onChange={(e) => setDraft(i.eventName, { displayName: e.target.value })}
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
                          background: savedRow === i.eventName ? "#16a34a" : "#0D4DC0",
                          color: "#fff",
                          fontSize: 12.5,
                          fontWeight: 600,
                          cursor: "pointer",
                          opacity: savingRow === i.eventName ? 0.6 : 1,
                        }}
                      >
                        {savingRow === i.eventName ? "Saving…" : savedRow === i.eventName ? "Saved ✓" : "Save"}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 ? (
                <tr>
                  <td style={{ ...td, color: "#a1a1aa", textAlign: "center" }} colSpan={6}>
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
