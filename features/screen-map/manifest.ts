import { getAccessToken } from "@/lib/auth";

/**
 * Reference pictures of the app's screens, made on the computer by the screenshot pipeline (never taken from a
 * user's phone), published per release as `screenmap/<versionCode>/manifest.json` with one image and one bounds
 * file per screen, state and theme.
 *
 * The pictures sit in a PRIVATE Vercel Blob store, so the browser never fetches them itself: it asks the panel's
 * own route, `/api/screenmap/…`, with the admin's token, and that route reads the store (app/api/screenmap). The
 * manifest is `/api/screenmap/latest/manifest.json` unless `NEXT_PUBLIC_SCREENMAP_MANIFEST_URL` names another.
 * Pictures come back as blobs and are shown through object URLs, because an `<img>` cannot send a token. While a
 * screen has no picture, the page draws its placeholder frame instead — nothing waits on it.
 *
 * The reader is deliberately forgiving about shape, because the pipeline is being built at the same time as this
 * page: a manifest may list entries as an array or nest them by screen and state, and a bounds file may give
 * `left/top/right/bottom` or `x/y/width/height`, as a list or as a map keyed by the element's id.
 */

export interface Shot {
  screen: string;
  state: string;
  theme: "light" | "dark";
  imageUrl: string;
  boundsUrl: string | null;
}

export interface Rect {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Bounds {
  width: number;
  height: number;
  rects: Rect[];
}

export const MANIFEST_URL = process.env.NEXT_PUBLIC_SCREENMAP_MANIFEST_URL || "/api/screenmap/latest/manifest.json";

/** A fetch that carries the signed-in admin's token — the route answers nobody else. */
function authedFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(url, { ...init, headers });
}

type Json = Record<string, unknown>;

const isObj = (v: unknown): v is Json => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown): string | null => (typeof v === "string" && v ? v : null);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v !== "" && Number.isFinite(Number(v)) ? Number(v) : null);

/** [path] against [base]; a same-origin result stays a path, so it goes through the panel's own route. */
function resolve(base: string, path: string): string {
  try {
    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost";
    const u = new URL(path, new URL(base, origin));
    return u.origin === origin ? u.pathname + u.search : u.toString();
  } catch {
    return path;
  }
}

function theme(v: unknown): "light" | "dark" {
  return String(v ?? "").toLowerCase().includes("dark") ? "dark" : "light";
}

function entry(base: string, e: Json, screen?: string, state?: string, th?: string): Shot | null {
  const image = str(e.image) ?? str(e.imageUrl) ?? str(e.url) ?? str(e.png) ?? str(e.webp);
  const s = str(e.screen) ?? screen;
  if (!image || !s) return null;
  const bounds = str(e.bounds) ?? str(e.boundsUrl) ?? str(e.boundsJson);
  return {
    screen: s,
    state: str(e.state) ?? state ?? "default",
    theme: theme(e.theme ?? th ?? image),
    imageUrl: resolve(base, image),
    boundsUrl: bounds ? resolve(base, bounds) : null,
  };
}

/** Every picture a manifest lists, whichever shape it uses. */
export function readManifest(base: string, raw: unknown): Shot[] {
  const out: Shot[] = [];
  // The pipeline's shape (tools/screenmap/package.py): screens[] -> { screen, states: { state: { light|dark: { image, bounds } } } }.
  if (isObj(raw) && Array.isArray(raw.screens) && raw.screens.every((x) => isObj(x) && typeof x.screen === "string" && isObj(x.states))) {
    for (const sc of raw.screens as Json[]) {
      for (const [state, themes] of Object.entries(sc.states as Json)) {
        if (!isObj(themes)) continue;
        for (const [th, e] of Object.entries(themes)) {
          if (!isObj(e) || !str(e.image)) continue;
          out.push({
            screen: sc.screen as string,
            state,
            theme: theme(th),
            imageUrl: resolve(base, e.image as string),
            boundsUrl: str(e.bounds) ? resolve(base, e.bounds as string) : null,
          });
        }
      }
    }
    return out;
  }
  const walk = (v: unknown, screen?: string, state?: string, th?: string) => {
    if (Array.isArray(v)) {
      v.forEach((x) => walk(x, screen, state, th));
      return;
    }
    if (!isObj(v)) return;
    const direct = entry(base, v, screen, state, th);
    if (direct) {
      out.push(direct);
      return;
    }
    for (const [k, child] of Object.entries(v)) {
      if (k === "screens" || k === "images" || k === "entries" || k === "states") walk(child, screen, state, th);
      else if (!screen) walk(child, k, state, th);
      else if (!state) walk(child, screen, k, th);
      else walk(child, screen, state, k);
    }
  };
  walk(raw);
  return out;
}

/** An element's rectangles, in the picture's own pixels. */
export function readBounds(raw: unknown): Bounds | null {
  if (!isObj(raw)) return null;
  const width = num(raw.width) ?? num((raw.image as Json | undefined)?.width) ?? null;
  const height = num(raw.height) ?? num((raw.image as Json | undefined)?.height) ?? null;
  const list = raw.elements ?? raw.controls ?? raw.bounds ?? raw.nodes ?? raw.rects;
  const rects: Rect[] = [];
  const add = (id: string | null, r: unknown) => {
    if (!id || !isObj(r)) return;
    // `[left, top, right, bottom]`, as the pipeline writes it.
    if (Array.isArray(r.bounds) && r.bounds.length === 4 && r.bounds.every((v) => num(v) !== null)) {
      const [l, t, rt, b] = (r.bounds as unknown[]).map((v) => num(v)!);
      if (rt > l && b > t) rects.push({ id, x: l, y: t, w: rt - l, h: b - t });
      return;
    }
    const src = isObj(r.bounds) ? r.bounds : isObj(r.boundsInRoot) ? r.boundsInRoot : r;
    const left = num(src.left) ?? num(src.x);
    const top = num(src.top) ?? num(src.y);
    const w = num(src.width) ?? (num(src.right) !== null && left !== null ? num(src.right)! - left : null);
    const h = num(src.height) ?? (num(src.bottom) !== null && top !== null ? num(src.bottom)! - top : null);
    if (left === null || top === null || w === null || h === null || w <= 0 || h <= 0) return;
    rects.push({ id, x: left, y: top, w, h });
  };
  // `event` is the name the tap arrives under, screen included, so it is preferred to the bare tag.
  if (Array.isArray(list)) list.forEach((r) => isObj(r) && add(str(r.id) ?? str(r.event) ?? str(r.tag) ?? str(r.analyticsId) ?? str(r.testTag), r));
  else if (isObj(list)) Object.entries(list).forEach(([id, r]) => add(id, r));
  if (!width || !height) return rects.length ? { width: Math.max(...rects.map((r) => r.x + r.w)), height: Math.max(...rects.map((r) => r.y + r.h)), rects } : null;
  return { width, height, rects };
}

let cache: Promise<Shot[]> | null = null;

/** The manifest, fetched once per page load. Any failure reads as "no pictures yet". */
export function loadShots(): Promise<Shot[]> {
  if (!MANIFEST_URL) return Promise.resolve([]);
  if (!cache) {
    cache = authedFetch(MANIFEST_URL, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => (j ? readManifest(MANIFEST_URL, j) : []))
      .catch(() => []);
  }
  return cache;
}

export async function loadBounds(url: string | null): Promise<Bounds | null> {
  if (!url) return null;
  try {
    const r = await authedFetch(url);
    return r.ok ? readBounds(await r.json()) : null;
  } catch {
    return null;
  }
}

/**
 * A picture as an object URL (the caller revokes it). An `<img>` cannot carry the admin's token, so the picture is
 * fetched with it and handed over as a blob.
 */
export async function loadImage(url: string): Promise<string | null> {
  if (!url.startsWith("/")) return url; // not ours: a public URL the page may show as is
  try {
    const r = await authedFetch(url);
    return r.ok ? URL.createObjectURL(await r.blob()) : null;
  } catch {
    return null;
  }
}

/** Does bounds id [id] belong to the event element [element] on [screen]? `tap:<screen>:<id>` or the id itself. */
export function sameElement(id: string, element: string, screen: string): boolean {
  const base = element.split("#")[0];
  return base === id || base === `tap:${screen}:${id}`;
}

/** One tappable control of a picture, keyed the way the navigation map (`navmap.data.ts`) names it. */
export interface Control {
  key: string;
  label: string;
  window: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * The controls of a picture's TOP window (the sheet or dialog in front; what is underneath cannot be tapped), keyed as
 * the navigation map keys them: the event id, else `label:<text>`, else `nolabel@l,t,r,b`.
 */
export function readControls(raw: unknown): { width: number; height: number; controls: Control[] } | null {
  if (!isObj(raw) || !Array.isArray(raw.controls)) return null;
  const width = num(raw.width) ?? num((raw.image as Json | undefined)?.width) ?? 720;
  const height = num(raw.height) ?? num((raw.image as Json | undefined)?.height) ?? 1561;
  const all = (raw.controls as unknown[]).filter(isObj);
  const top = Math.max(0, ...all.map((c) => num(c.window) ?? 0));
  const controls: Control[] = [];
  for (const c of all) {
    if ((num(c.window) ?? 0) !== top) continue;
    const b = Array.isArray(c.bounds) ? (c.bounds as unknown[]).map((v) => num(v)) : [];
    if (b.length !== 4 || b.some((v) => v === null)) continue;
    const [l, t, r, bt] = b as number[];
    if (r <= l || bt <= t) continue;
    const label = str(c.label) ?? "";
    const key = str(c.event) ?? (label.trim() ? `label:${label}` : `nolabel@${l},${t},${r},${bt}`);
    controls.push({ key, label, window: top, x: l, y: t, w: r - l, h: bt - t });
  }
  return { width, height, controls };
}

/** A picture's bounds file as it is, for [readControls]. */
export async function loadBoundsRaw(url: string | null): Promise<unknown> {
  if (!url) return null;
  try {
    const r = await authedFetch(url);
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
}
