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
  onMoveTo,
  onReset,
}: {
  /** Column key → what it is called in the header. */
  labels: Record<string, string>;
  order: string[];
  hidden: string[];
  onToggle: (key: string) => void;
  /** Put `key` at `index` in the order — the whole move, not one step of it. */
  onMoveTo: (key: string, index: number) => void;
  onReset: () => void;
}) {
  const [open, setOpen] = useState(false);
  /** What is being dragged, and where it would land. Both needed to draw the line before the drop. */
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
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
          onDragOver={(e) => e.preventDefault()}
          style={{
            position: "absolute",
            zIndex: 40,
            top: "calc(100% + 6px)",
            right: 0,
            minWidth: 250,
            padding: 8,
            borderRadius: 10,
            border: "1px solid var(--md-sys-color-outline-variant)",
            background: "var(--md-sys-color-surface-container-lowest)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
          }}
        >
          {order.map((key, i) => {
            const shown = !hidden.includes(key);
            const dragging = dragKey === key;
            return (
              <div
                key={key}
                draggable
                onDragStart={(e) => {
                  setDragKey(key);
                  // Firefox refuses to start a drag without data on the transfer.
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", key);
                }}
                onDragEnd={() => {
                  setDragKey(null);
                  setOverIndex(null);
                }}
                onDragOver={(e) => {
                  // Without preventDefault the browser refuses the drop and the whole thing looks
                  // broken while working perfectly.
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  if (overIndex !== i) setOverIndex(i);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const from = dragKey ?? e.dataTransfer.getData("text/plain");
                  if (from) onMoveTo(from, i);
                  setDragKey(null);
                  setOverIndex(null);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "4px 4px",
                  fontSize: 13,
                  borderRadius: 6,
                  cursor: "grab",
                  opacity: dragging ? 0.4 : 1,
                  // The line marks where it lands, on the edge it would land against.
                  borderTop: overIndex === i && !dragging ? "2px solid var(--md-sys-color-primary)" : "2px solid transparent",
                  background: dragging ? "var(--md-sys-color-surface-container)" : undefined,
                }}
              >
                {/* The grip is what says "this moves". A row that is draggable and does not look it
                    is a feature nobody finds. */}
                <span style={{ color: "var(--md-sys-color-on-surface-variant)", cursor: "grab", userSelect: "none" }}>⠿</span>
                <label style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, cursor: "pointer" }}>
                  <input type="checkbox" checked={shown} onChange={() => onToggle(key)} />
                  <span style={{ color: shown ? "var(--md-sys-color-on-surface)" : "var(--md-sys-color-on-surface-variant)" }}>
                    {labels[key] ?? key}
                  </span>
                </label>
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
