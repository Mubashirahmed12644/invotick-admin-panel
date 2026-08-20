"use client";

import { useCallback, useEffect, useState } from "react";
import { clearApiFailures, formatApiFailures, msSinceNewestFailure, readApiFailures, type ApiFailure } from "@/lib/diagnostics";
import { copyText } from "@/lib/clipboard";

/**
 * A standing count of failed requests, on every page.
 *
 * The failures worth reporting are the ones that flash past: a poll fails, the next one succeeds and
 * overwrites the message, a page redirects and takes its own error with it. What survives is an
 * impression — "different errors keep appearing" — and an impression cannot be diagnosed.
 *
 * So the count sits there until somebody clears it, and one press puts the whole thing on the
 * clipboard, grouped, with times. Nothing is sent anywhere: it is copied by the person who saw it.
 */
export default function ApiFailureBadge() {
  const [failures, setFailures] = useState<ApiFailure[]>([]);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const refresh = useCallback(() => setFailures(readApiFailures()), []);

  useEffect(() => {
    refresh();
    // So "last 4m ago" keeps counting up while the page sits open, and so entries age out of the
    // window without needing a request to arrive first.
    const t = setInterval(refresh, 30_000);
    window.addEventListener("webpanel:api-failure", refresh);
    // Another tab's failures count too — the panel is used in two windows at once.
    window.addEventListener("storage", refresh);
    return () => {
      clearInterval(t);
      window.removeEventListener("webpanel:api-failure", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [refresh]);

  if (!failures.length) return null;

  const distinct = new Set(failures.map((f) => `${f.status} ${f.url.split("?")[0]}`)).size;

  return (
    <div
      style={{
        position: "fixed", right: 16, bottom: 16, zIndex: 9999,
        display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8,
        fontSize: 12, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
      }}
    >
      {open && (
        <div
          style={{
            width: "min(560px, 92vw)", maxHeight: "50vh", overflow: "auto",
            background: "var(--md-sys-color-surface-container-high, #fff)",
            color: "var(--md-sys-color-on-surface, #111)",
            border: "1px solid var(--md-sys-color-outline-variant, #ccc)",
            borderRadius: 10, padding: 12, boxShadow: "0 12px 32px rgba(0,0,0,.25)",
          }}
        >
          <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={async () => {
                await copyText(formatApiFailures());
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              style={btn}
            >
              {copied ? "copied" : "Copy report"}
            </button>
            <button type="button" onClick={() => { clearApiFailures(); setOpen(false); }} style={btn}>
              Clear
            </button>
            <span style={{ marginLeft: "auto", opacity: 0.7 }}>
              {failures.length} recorded · {distinct} distinct
            </span>
          </div>
          {failures.slice(0, 40).map((f, i) => (
            <div key={`${f.at}-${i}`} style={{ display: "flex", gap: 8, padding: "3px 0", borderTop: i ? "1px solid var(--md-sys-color-outline-variant, #eee)" : undefined }}>
              <span style={{ opacity: 0.6 }}>{f.at.slice(11, 23)}</span>
              <b style={{ color: "var(--md-sys-color-error, #b3261e)" }}>{f.status || "net"}</b>
              <span style={{ wordBreak: "break-all" }}>{f.method} {f.url.split("?")[0]}</span>
            </div>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Requests that failed since this was last cleared. Click to read or copy them."
        style={{
          ...btn,
          background: "var(--md-sys-color-error-container, #f9dedc)",
          color: "var(--md-sys-color-on-error-container, #410e0b)",
          borderColor: "var(--md-sys-color-error, #b3261e)",
          fontWeight: 700,
        }}
      >
        ⚠ {failures.length} failed · last {ageLabel(msSinceNewestFailure())}
      </button>
    </div>
  );
}

/**
 * How long ago the most recent one was — the difference between "this is happening" and "this
 * happened". Without it a standing count says nothing about whether anything is still wrong.
 */
function ageLabel(ms: number | null): string {
  if (ms === null) return "—";
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  return m < 60 ? `${m}m ago` : `${Math.round(m / 60)}h ago`;
}

const btn: React.CSSProperties = {
  fontSize: 12, padding: "5px 10px", borderRadius: 8, cursor: "pointer",
  border: "1px solid var(--md-sys-color-outline, #999)",
  background: "transparent", color: "inherit",
};
