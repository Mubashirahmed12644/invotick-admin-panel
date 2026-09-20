"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * A filter the reader chose stays chosen — through a reload, through Back, and in a copied link
 * (decision 0123).
 *
 * The owner, 2026-09-20: *"bohat sary pages jab reload kerty hain to wo default setting per reload
 * ho jaty hain, jabky unko last setting per reload hona chahiye — jo international asool hy us ke
 * mutabiq setting kero."* Every page here opened on its defaults, so the thirty-day range, the
 * build and the version had to be re-picked after every reload, and a link to what was on screen
 * could not be sent to anybody.
 *
 * ## Where a value comes from, in order
 *
 * 1. **The URL.** It wins, always. That is what makes Back, Forward and a pasted link work, and it
 *    is the only one of the three a person can see and edit.
 * 2. **What this page was last set to**, kept in `localStorage` under one key per page. Used when
 *    the URL says nothing, so opening the page fresh returns the reader where they were.
 * 3. **The default.**
 *
 * ## Why the URL is read from `window.location` and not `useSearchParams`
 *
 * `useSearchParams` makes a page opt out of static rendering unless it sits inside a `<Suspense>`
 * boundary, and every page in this panel is `"use client"` and fetches in an effect anyway — so it
 * would be a build-time constraint bought for nothing. The window's own URL says the same thing,
 * and `popstate` is what Back and Forward actually fire.
 *
 * ## Why the URL is written with `history.pushState` and not the router
 *
 * Next 16 patches `window.history.pushState`/`replaceState` so the App Router and
 * `useSearchParams` follow an external change (`next/dist/client/components/app-router.js`). Using
 * it means the route is not re-navigated: no server round trip, no remount, and the page's own
 * state — an open stream, a loaded feed — survives a filter change. `router.push` would re-render
 * the route tree for a value that never leaves the browser.
 *
 * ## One write per change, not one per filter
 *
 * Several filters often move together (picking a preset range sets two dates). Every setter adds to
 * one pending batch that is flushed on the next microtask, so the URL changes once and every effect
 * that depends on it runs once. That is the rule the polling work needs: changing a filter must not
 * fire a heavy fetch more than once.
 *
 * ## What never goes in the URL
 *
 * Free text. A search box on these pages is usually an email or a user id, and a URL is copied,
 * pasted into chat and kept in history. Those stay ordinary component state and are forgotten when
 * the page closes — see [useStickyState] and its `remember` option.
 */

/** How one value is written into a URL and read back out. */
export interface StickyCodec<T> {
  toParam(value: T): string | null;
  fromParam(raw: string): T | null;
}

export const stickyString: StickyCodec<string> = {
  toParam: (v) => (v === "" ? null : v),
  fromParam: (raw) => raw,
};

export const stickyBoolean: StickyCodec<boolean> = {
  toParam: (v) => (v ? "1" : "0"),
  fromParam: (raw) => raw === "1" || raw === "true",
};

export const stickyNumber: StickyCodec<number | null> = {
  toParam: (v) => (v == null ? null : String(v)),
  fromParam: (raw) => {
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  },
};

/** A number that always has a value — a page size, a row count. */
export const stickyNumberRequired: StickyCodec<number> = {
  toParam: (v) => String(v),
  fromParam: (raw) => {
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  },
};

/** A day range as `YYYY-MM-DD..YYYY-MM-DD`, which is readable and sorts the way it reads. */
export interface StickyDayRange {
  from: Date;
  to: Date;
}

function dayString(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function parseDay(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

export const stickyDayRange: StickyCodec<StickyDayRange> = {
  toParam: (v) => `${dayString(v.from)}..${dayString(v.to)}`,
  fromParam: (raw) => {
    const [a, b] = raw.split("..");
    const from = a ? parseDay(a) : null;
    const to = b ? parseDay(b) : null;
    return from && to ? { from, to } : null;
  },
};

/** One value chosen from a fixed list — anything else in the URL is ignored rather than trusted. */
export function stickyOneOf<T extends string>(allowed: readonly T[]): StickyCodec<T> {
  return {
    toParam: (v) => v,
    fromParam: (raw) => (allowed.includes(raw as T) ? (raw as T) : null),
  };
}

// ---------------------------------------------------------------------------------------------
// The batched URL writer
// ---------------------------------------------------------------------------------------------

let pending: Map<string, string | null> | null = null;

function queueParam(key: string, value: string | null) {
  if (typeof window === "undefined") return;
  if (pending === null) {
    pending = new Map();
    // A microtask, so every setter fired in one event handler lands in the same history entry and
    // the page re-reads its parameters exactly once.
    queueMicrotask(() => {
      const batch = pending;
      pending = null;
      if (!batch) return;
      const url = new URL(window.location.href);
      let changed = false;
      batch.forEach((v, k) => {
        const current = url.searchParams.get(k);
        if (v === null) {
          if (current !== null) {
            url.searchParams.delete(k);
            changed = true;
          }
        } else if (current !== v) {
          url.searchParams.set(k, v);
          changed = true;
        }
      });
      if (!changed) return;
      // pushState, not replaceState: a filter change is a place the reader can go Back from, which
      // is what they expect from every other site they use.
      window.history.pushState(window.history.state, "", `${url.pathname}${url.search}`);
    });
  }
  pending.set(key, value);
}

// ---------------------------------------------------------------------------------------------
// Remembering per page
// ---------------------------------------------------------------------------------------------

const STORE_PREFIX = "webpanel_filters_";

function readRemembered(pageKey: string): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORE_PREFIX + pageKey);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function remember(pageKey: string, name: string, value: string | null) {
  if (typeof window === "undefined") return;
  try {
    const all = readRemembered(pageKey);
    if (value === null) delete all[name];
    else all[name] = value;
    window.localStorage.setItem(STORE_PREFIX + pageKey, JSON.stringify(all));
  } catch {
    // A full or blocked localStorage costs the memory, not the page.
  }
}

/** For a "reset filters" control, and for a test to start from nothing. */
export function forgetFilters(pageKey: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORE_PREFIX + pageKey);
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------------------------
// The hook
// ---------------------------------------------------------------------------------------------

export interface StickyOptions {
  /**
   * False for a value that must not outlive the page: free text, anything holding an email or an
   * id. It then behaves exactly like `useState`.
   */
  remember?: boolean;
}

/**
 * A `useState` that remembers.
 *
 * Deliberately the same shape as `useState` so a page adopts it one line at a time:
 * `useState<BuildFilter>("release")` becomes
 * `useStickyState("live-events", "build", "release", stickyOneOf(BUILD_FILTERS))`.
 *
 * @param pageKey one per page, the key the remembered values are kept under.
 * @param name the URL parameter, kept short and readable (`build`, `ver`, `range`).
 */
export function useStickyState<T>(
  pageKey: string,
  name: string,
  fallback: T,
  codec: StickyCodec<T>,
  options: StickyOptions = {},
): [T, (next: T | ((prev: T) => T)) => void] {
  const willRemember = options.remember !== false;

  const readParam = () => {
    if (typeof window === "undefined") return null;
    return new URL(window.location.href).searchParams.get(name);
  };

  // The starting value is worked out once, in the order the class note gives. It cannot be
  // recomputed on every render: the URL is written asynchronously, so a render between the setter
  // and the flush would read the old parameter and undo the change.
  const [value, setValue] = useState<T>(() => {
    let resolved: T | null = null;
    const fromUrl = readParam();
    if (fromUrl !== null) resolved = codec.fromParam(fromUrl);
    if (resolved === null && willRemember) {
      const stored = readRemembered(pageKey)[name];
      if (stored !== undefined) resolved = codec.fromParam(stored);
    }
    return resolved === null ? fallback : resolved;
  });

  // Keep the newest value where the popstate listener can see it without re-subscribing.
  const latest = useRef(value);
  latest.current = value;

  // Back and Forward change the URL without going through the setter below.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onPop = () => {
      const raw = readParam();
      const decoded = raw === null ? fallback : codec.fromParam(raw);
      if (decoded === null) return;
      if (codec.toParam(decoded) !== codec.toParam(latest.current)) setValue(decoded);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
    // codec and fallback are constants at every call site.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);

  // The first value, whatever it came from, is put in the URL so that what is on screen is what a
  // copied link says. replaceState, because arriving at a page is not a step to go Back from.
  const wrote = useRef(false);
  useEffect(() => {
    if (wrote.current || typeof window === "undefined") return;
    wrote.current = true;
    const encoded = codec.toParam(latest.current);
    const url = new URL(window.location.href);
    if (encoded !== null && url.searchParams.get(name) !== encoded) {
      url.searchParams.set(name, encoded);
      window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}`);
    }
    // Once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);

  // Takes a value or an updater, exactly like `useState`, so a page adopting this does not have to
  // rewrite `setSortDirection(prev => prev === "asc" ? "desc" : "asc")` into something else.
  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      const resolved =
        typeof next === "function" ? (next as (prev: T) => T)(latest.current) : next;
      latest.current = resolved;
      setValue(resolved);
      const encoded = codec.toParam(resolved);
      queueParam(name, encoded);
      if (willRemember) remember(pageKey, name, encoded);
    },
    // codec is a module constant at every call site.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [name, pageKey, willRemember],
  );

  return useMemo(() => [value, set], [value, set]);
}
