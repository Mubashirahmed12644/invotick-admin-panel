"use client";

import { useEffect, useMemo, useState } from "react";
import { api, type EventCatalogItem } from "@/lib/api";

// Curation catalog for analytics events, kept on its OWN page so the Live Events stream stays
// undisturbed. Every recorded event name is listed with its count + last-seen; an admin toggles
// "Keep" and writes a display name + description. Curation is data (saved per-event), not code —
// so surfacing an event in funnels is a config edit, no app rebuild.
export default function LiveEventConfigClient() {
  const [items, setItems] = useState<EventCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [keptOnly, setKeptOnly] = useState(false);
  const [savingRow, setSavingRow] = useState<string | null>(null);
  const [savedRow, setSavedRow] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setItems(await api.getEventCatalog());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load the event catalog.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(
      (i) =>
        (!keptOnly || i.kept) &&
        (q === "" ||
          i.eventName.toLowerCase().includes(q) ||
          (i.displayName ?? "").toLowerCase().includes(q)),
    );
  }, [items, search, keptOnly]);

  const keptCount = useMemo(() => items.filter((i) => i.kept).length, [items]);

  function patch(name: string, p: Partial<EventCatalogItem>) {
    setItems((prev) => prev.map((i) => (i.eventName === name ? { ...i, ...p } : i)));
    setSavedRow(null);
  }

  async function save(item: EventCatalogItem) {
    setSavingRow(item.eventName);
    setError(null);
    try {
      await api.saveEventConfig({
        eventName: item.eventName,
        kept: item.kept,
        displayName: item.displayName,
        description: item.description,
      });
      setSavedRow(item.eventName);
      setTimeout(() => setSavedRow((r) => (r === item.eventName ? null : r)), 1500);
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
  const td: React.CSSProperties = { padding: "8px 10px", borderBottom: "1px solid #f1f1f4", verticalAlign: "top" };

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0D4DC0" }}>Live Event Config</h1>
          <p style={{ color: "#71717a", fontSize: 13, marginTop: 4 }}>
            Curate which recorded events are kept for funnels. Keeping/naming an event is config, not
            code — no app rebuild. (The Live Events stream page is separate and untouched.)
          </p>
        </div>
        <div style={{ fontSize: 13, color: "#52525b" }}>
          <b>{items.length}</b> events · <b style={{ color: "#16a34a" }}>{keptCount}</b> kept
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center", margin: "16px 0" }}>
        <input
          placeholder="Search event / display name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...inputStyle, maxWidth: 320 }}
        />
        <label style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6, color: "#3f3f46" }}>
          <input type="checkbox" checked={keptOnly} onChange={(e) => setKeptOnly(e.target.checked)} />
          Kept only
        </label>
        <button
          type="button"
          onClick={load}
          style={{ marginLeft: "auto", padding: "6px 14px", borderRadius: 6, border: "1px solid #d4d4d8", background: "#fff", fontSize: 13, cursor: "pointer" }}
        >
          Refresh
        </button>
      </div>

      {error ? (
        <p style={{ color: "#dc2626", fontSize: 13, marginBottom: 12 }}>{error}</p>
      ) : null}

      {loading ? (
        <p style={{ color: "#71717a" }}>Loading catalog…</p>
      ) : (
        <div style={{ overflowX: "auto", border: "1px solid #e4e4e7", borderRadius: 10 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff" }}>
            <thead>
              <tr>
                <th style={{ ...th, width: 60 }}>Keep</th>
                <th style={th}>Event name</th>
                <th style={{ ...th, width: 80, textAlign: "right" }}>Count</th>
                <th style={{ ...th, width: 220 }}>Display name</th>
                <th style={th}>Description</th>
                <th style={{ ...th, width: 90 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.eventName} style={{ background: item.kept ? "#f0fdf4" : undefined }}>
                  <td style={{ ...td, textAlign: "center" }}>
                    <input
                      type="checkbox"
                      checked={item.kept}
                      onChange={(e) => patch(item.eventName, { kept: e.target.checked })}
                    />
                  </td>
                  <td style={{ ...td, fontFamily: "monospace", fontSize: 12.5, fontWeight: 600 }}>{item.eventName}</td>
                  <td style={{ ...td, textAlign: "right", color: "#71717a" }}>{item.count.toLocaleString()}</td>
                  <td style={td}>
                    <input
                      style={inputStyle}
                      placeholder="e.g. Invoice sent"
                      value={item.displayName ?? ""}
                      onChange={(e) => patch(item.eventName, { displayName: e.target.value })}
                    />
                  </td>
                  <td style={td}>
                    <input
                      style={inputStyle}
                      placeholder="What this event means / where it fires…"
                      value={item.description ?? ""}
                      onChange={(e) => patch(item.eventName, { description: e.target.value })}
                    />
                  </td>
                  <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>
                    <button
                      type="button"
                      onClick={() => save(item)}
                      disabled={savingRow === item.eventName}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 6,
                        border: "none",
                        background: savedRow === item.eventName ? "#16a34a" : "#0D4DC0",
                        color: "#fff",
                        fontSize: 12.5,
                        fontWeight: 600,
                        cursor: "pointer",
                        opacity: savingRow === item.eventName ? 0.6 : 1,
                      }}
                    >
                      {savingRow === item.eventName ? "Saving…" : savedRow === item.eventName ? "Saved ✓" : "Save"}
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 ? (
                <tr>
                  <td style={{ ...td, color: "#a1a1aa", textAlign: "center" }} colSpan={6}>
                    No events{keptOnly ? " kept yet" : ""}.
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
