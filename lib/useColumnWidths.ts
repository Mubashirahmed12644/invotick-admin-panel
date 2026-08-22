"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Draggable column widths that survive a reload.
 *
 * Both event tables are read side by side, and which column needs the room depends entirely on what
 * is being looked at — a long identity one day, a description the next. A width chosen and then lost
 * on the next refresh is worse than no control at all: it has to be chosen again every time, so it
 * stops being used.
 *
 * Kept in localStorage rather than on the server. This is one person's view of one screen, it should
 * not travel between machines, and a layout preference is not worth a round trip that can fail.
 */
const PREFIX = "webpanel_colwidths_";

/** Narrow enough to hide a column is not a width, it is a mistake with no way back. */
const MIN_WIDTH = 44;

export function useColumnWidths(
  tableKey: string,
  defaults: Record<string, number>,
  /** Column keys in the order they appear, so a key can be turned into a cell position. */
  order: string[],
) {
  const [widths, setWidths] = useState<Record<string, number>>(defaults);
  /** The table itself, needed to measure a column against its own contents. */
  const tableRef = useRef<HTMLTableElement | null>(null);

  // Read after mount, never during render: the server has no localStorage, and reading it in the
  // initial state would make the first client render disagree with the HTML it is hydrating.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(PREFIX + tableKey);
      if (!raw) return;
      const saved = JSON.parse(raw) as Record<string, number>;
      // Merged over the defaults, not used in their place. A column added later would otherwise have
      // no width at all, and the table would silently lose it.
      setWidths((w) => ({ ...w, ...saved }));
    } catch {
      // A malformed entry is not worth a broken page. The defaults are already correct.
    }
  }, [tableKey]);

  const drag = useRef<{ key: string; startX: number; startWidth: number } | null>(null);

  const startResize = useCallback(
    (key: string, event: React.MouseEvent) => {
      event.preventDefault();
      drag.current = { key, startX: event.clientX, startWidth: widths[key] ?? MIN_WIDTH };

      const onMove = (e: MouseEvent) => {
        const d = drag.current;
        if (!d) return;
        const next = Math.max(MIN_WIDTH, d.startWidth + (e.clientX - d.startX));
        setWidths((w) => ({ ...w, [d.key]: next }));
      };

      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        // Written on release, not on every pixel of the drag — a hundred writes for one decision.
        setWidths((w) => {
          try {
            window.localStorage.setItem(PREFIX + tableKey, JSON.stringify(w));
          } catch {
            // Private browsing, a full quota. The width still applies for this session.
          }
          return w;
        });
        drag.current = null;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
      // Held on the body for the whole drag: without it the cursor flickers back to a caret the
      // moment the pointer leaves the handle, and the drag reads as broken while it is working.
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [tableKey, widths],
  );

  const persist = useCallback(
    (next: Record<string, number>) => {
      try {
        window.localStorage.setItem(PREFIX + tableKey, JSON.stringify(next));
      } catch {
        // Private browsing, a full quota. The width still applies for this session.
      }
    },
    [tableKey],
  );

  /**
   * Fit a column to its own widest cell — the double-click every spreadsheet has taught people to
   * expect on a column divider.
   *
   * Measured rather than guessed. The table is briefly put back on automatic layout with every other
   * column pinned to its current width, so the browser sizes this one to its contents and we read the
   * answer off it. Estimating from character counts is the obvious shortcut and it is wrong for
   * exactly the content that needs fitting: proportional type, monospace identities and a two-line
   * meta row do not share a width per character.
   */
  const autoFit = useCallback(
    (key: string) => {
      const table = tableRef.current;
      const index = order.indexOf(key);
      if (!table || index < 0) return;

      const cols = Array.from(table.querySelectorAll("col"));
      if (cols.length !== order.length) return;

      const previousLayout = table.style.tableLayout;
      const previousWidths = cols.map((c) => c.style.width);

      cols.forEach((c, k) => {
        c.style.width = k === index ? "auto" : `${widths[order[k]] ?? MIN_WIDTH}px`;
      });
      table.style.tableLayout = "auto";

      // Reading a layout property is what forces the reflow; without it the measurement is of the
      // layout we just left.
      let measured = MIN_WIDTH;
      table.querySelectorAll<HTMLElement>(`tr > *:nth-child(${index + 1})`).forEach((cell) => {
        measured = Math.max(measured, cell.getBoundingClientRect().width);
      });

      table.style.tableLayout = previousLayout;
      cols.forEach((c, k) => {
        c.style.width = previousWidths[k];
      });

      // A little air, and never below the floor.
      const next = Math.max(MIN_WIDTH, Math.ceil(measured) + 8);
      setWidths((w) => {
        const merged = { ...w, [key]: next };
        persist(merged);
        return merged;
      });
    },
    [order, widths, persist],
  );

  const reset = useCallback(() => {
    setWidths(defaults);
    try {
      window.localStorage.removeItem(PREFIX + tableKey);
    } catch {
      /* nothing to undo if it was never stored */
    }
    // defaults is a literal at the call site and stable in practice; listing it would re-create this
    // on every render and hand a new function to every header.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableKey]);

  return { widths, startResize, reset, autoFit, tableRef };
}

/**
 * The grab area on a header's trailing edge. Rendered inside a `position: relative` `<th>`.
 *
 * A class rather than an inline style so it can have a hover state — and it needs one. It was
 * invisible at first, on the reasoning that a line down every heading is a lot of furniture for a
 * control most people touch twice. That was wrong in the way invisible controls usually are: the
 * cursor changed on hover, so the feature existed, but only for somebody who already knew where to
 * put the pointer.
 */
export const RESIZE_HANDLE_CLASS = "col-resize-handle";
