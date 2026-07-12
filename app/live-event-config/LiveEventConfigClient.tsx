"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, type EventDiscoveryItem } from "@/lib/api";

// Per-row unsaved edits, so the live refresh never clobbers what the admin is typing.
interface Draft {
  renameRequested?: boolean;
  requestedName?: string;
  description?: string;
}

const REFRESH_MS = 4000;

// "Live Event Discovery and Config" — live-lists every event / UI-action the DEBUG app emits
// (its meaningful name, or a searchable identity when it has none). For each, the admin flips
// "Rename" on, types the name it SHOULD have + a description, and Saves. Saving maps the name
// instantly for reporting AND queues a code-rename task a developer applies in the app source.
export default function LiveEventConfigClient() {
  const [items, setItems] = useState<EventDiscoveryItem[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debugOnly, setDebugOnly] = useState(true);
  const [live, setLive] = useState(true);
  const [savingRow, setSavingRow] = useState<string | null>(null);
  const [savedRow, setSavedRow] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  // Read latest debugOnly inside the polling loop without re-arming the interval each toggle.
  const debugOnlyRef = useRef(debugOnly);
  debugOnlyRef.current = debugOnly;

  const load = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const data = await api.getEventDiscovery(debugOnlyRef.current);
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

  // Live auto-refresh — keeps the feed current as new actions fire in the debug app.
  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => load(false), REFRESH_MS);
    return () => clearInterval(id);
  }, [live, load]);

  // Reload immediately when the debug-only filter flips.
  useEffect(() => {
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debugOnly]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.eventName.toLowerCase().includes(q) ||
        (i.screenName ?? "").toLowerCase().includes(q) ||
        (i.requestedName ?? "").toLowerCase().includes(q),
    );
  }, [items, search]);

  const pendingCount = useMemo(
    () => items.filter((i) => i.codeTaskStatus === "PENDING").length,
    [items],
  );

  // Effective (draft-over-server) value getters.
  const renameOn = (i: EventDiscoveryItem) => drafts[i.eventName]?.renameRequested ?? i.renameRequested;
  const nameVal = (i: EventDiscoveryItem) => drafts[i.eventName]?.requestedName ?? i.requestedName ?? "";
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
        renameRequested: renameOn(i),
        requestedName: nameVal(i).trim() || null,
        description: descVal(i).trim() || null,
        screenName: i.screenName,
      });
      // Server is now source of truth for this row → clear its draft + reflect the new task status.
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
                renameRequested: task.requestedName != null,
                requestedName: task.requestedName,
                description: task.description,
                codeTaskStatus: task.codeTaskStatus,
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
  };
  const td: React.CSSProperties = {
    padding: "8px 10px",
    borderBottom: "1px solid #f1f1f4",
    verticalAlign: "top",
  };

  return (
    <div style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0D4DC0" }}>Live Event Discovery and Config</h1>
          <p style={{ color: "#71717a", fontSize: 13, marginTop: 4, maxWidth: 720 }}>
            Live feed of every event & UI-action the <b>debug</b> app emits — its meaningful name, or a
            searchable identity when it has none. Flip <b>Rename</b>, type the name it should have + a
            description, and Save: the name maps for reporting instantly and a code-rename task is queued.
          </p>
        </div>
        <div style={{ fontSize: 13, color: "#52525b", textAlign: "right" }}>
          <div>
            <b>{items.length}</b> events ·{" "}
            <b style={{ color: pendingCount ? "#d97706" : "#16a34a" }}>{pendingCount}</b> pending task
            {pendingCount === 1 ? "" : "s"}
          </div>
          {lastRefreshed ? (
            <div style={{ fontSize: 11, color: "#a1a1aa", marginTop: 2 }}>
              updated {lastRefreshed.toLocaleTimeString()}
            </div>
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
        <label style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6, color: "#3f3f46" }}>
          <input type="checkbox" checked={live} onChange={(e) => setLive(e.target.checked)} />
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: live ? "#16a34a" : "#a1a1aa",
                display: "inline-block",
              }}
            />
            Live ({REFRESH_MS / 1000}s)
          </span>
        </label>
        <button
          type="button"
          onClick={() => load(true)}
          style={{ marginLeft: "auto", padding: "6px 14px", borderRadius: 6, border: "1px solid #d4d4d8", background: "#fff", fontSize: 13, cursor: "pointer" }}
        >
          Refresh
        </button>
      </div>

      {error ? <p style={{ color: "#dc2626", fontSize: 13, marginBottom: 12 }}>{error}</p> : null}

      {loading ? (
        <p style={{ color: "#71717a" }}>Loading discovery feed…</p>
      ) : (
        <div style={{ overflowX: "auto", border: "1px solid #e4e4e7", borderRadius: 10 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff" }}>
            <thead>
              <tr>
                <th style={{ ...th, width: 70 }}>Rename</th>
                <th style={th}>Event name / identity</th>
                <th style={{ ...th, width: 240 }}>Updated name</th>
                <th style={th}>Description</th>
                <th style={{ ...th, width: 96 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((i) => {
                const on = renameOn(i);
                return (
                  <tr key={i.eventName} style={{ background: on ? "#eff6ff" : undefined }}>
                    <td style={{ ...td, textAlign: "center" }}>
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={(e) => setDraft(i.eventName, { renameRequested: e.target.checked })}
                      />
                    </td>
                    <td style={td}>
                      <div style={{ fontFamily: "monospace", fontSize: 12.5, fontWeight: 600, wordBreak: "break-all" }}>
                        {i.eventName}
                      </div>
                      <div style={{ fontSize: 11, color: "#a1a1aa", marginTop: 2 }}>
                        {i.screenName ? `on ${i.screenName}` : "—"}
                        {i.codeTaskStatus === "PENDING" ? (
                          <span style={{ marginLeft: 8, color: "#d97706", fontWeight: 700 }}>● task queued</span>
                        ) : i.codeTaskStatus === "APPLIED" ? (
                          <span style={{ marginLeft: 8, color: "#16a34a", fontWeight: 700 }}>✓ applied</span>
                        ) : null}
                      </div>
                    </td>
                    <td style={td}>
                      <input
                        style={{ ...inputStyle, background: on ? "#fff" : "#f4f4f5", color: on ? "#111" : "#a1a1aa" }}
                        placeholder={on ? "e.g. invoice_sent" : "enable Rename to edit"}
                        disabled={!on}
                        value={nameVal(i)}
                        onChange={(e) => setDraft(i.eventName, { requestedName: e.target.value })}
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
                  <td style={{ ...td, color: "#a1a1aa", textAlign: "center" }} colSpan={5}>
                    No events yet{debugOnly ? " from debug builds" : ""}. Interact with the debug app — actions appear here live.
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
