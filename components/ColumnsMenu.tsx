"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Choose which columns a table shows, and in what order.
 *
 * A panel rather than drag-and-drop on the headings. Dragging a heading is the elegant version and it
 * fights the other thing headings do here — the right edge is already a resize handle, and a control
 * that means "move me" three pixels from one that means "widen me" is a control that does the wrong
 * thing under a hurried hand.
 */
export function ColumnsMenu({
  labels,
  order,
  hidden,
  onToggle,
  onMove,
  onReset,
}: {
  /** Column key → what it is called in the header. */
  labels: Record<string, string>;
  order: string[];
  hidden: string[];
  onToggle: (key: string) => void;
  onMove: (key: string, delta: -1 | 1) => void;
  onReset: () => void;
}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement | null>(null);

  // Closes on a click anywhere else. Without this it stays open behind whatever is clicked next and
  // has to be dismissed deliberately, which is not how a menu behaves anywhere else on the page.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const hiddenCount = hidden.length;

  return (
    <div ref={box} style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        className="btn btn-outline"
        onClick={() => setOpen((v) => !v)}
        title="Choose which columns are shown, and their order"
      >
        {/* The count is the point of putting it on the button: a table quietly missing three columns
            is a table somebody will report as broken. */}
        Columns{hiddenCount > 0 ? ` · ${hiddenCount} hidden` : ""}
      </button>

      {open ? (
        <div
          style={{
            position: "absolute",
            zIndex: 40,
            top: "calc(100% + 6px)",
            right: 0,
            minWidth: 240,
            padding: 8,
            borderRadius: 10,
            border: "1px solid var(--md-sys-color-outline-variant)",
            background: "var(--md-sys-color-surface-container-lowest)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
          }}
        >
          {order.map((key, i) => {
            const shown = !hidden.includes(key);
            return (
              <div
                key={key}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 4px", fontSize: 13 }}
              >
                <label style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, cursor: "pointer" }}>
                  <input type="checkbox" checked={shown} onChange={() => onToggle(key)} />
                  <span style={{ color: shown ? "var(--md-sys-color-on-surface)" : "var(--md-sys-color-on-surface-variant)" }}>
                    {labels[key] ?? key}
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => onMove(key, -1)}
                  disabled={i === 0}
                  title="Move left"
                  style={arrow(i === 0)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => onMove(key, 1)}
                  disabled={i === order.length - 1}
                  title="Move right"
                  style={arrow(i === order.length - 1)}
                >
                  ↓
                </button>
              </div>
            );
          })}
          <div style={{ borderTop: "1px solid var(--md-sys-color-outline-variant)", marginTop: 6, paddingTop: 6 }}>
            <button type="button" className="btn btn-outline" style={{ width: "100%" }} onClick={onReset}>
              Reset columns and widths
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Up and down here mean left and right in the table; the list is the table turned on its side. */
function arrow(disabled: boolean): React.CSSProperties {
  return {
    border: "1px solid var(--md-sys-color-outline-variant)",
    background: "transparent",
    borderRadius: 6,
    width: 22,
    height: 22,
    lineHeight: 1,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.3 : 1,
    color: "var(--md-sys-color-on-surface)",
  };
}
