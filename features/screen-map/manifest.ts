/**
 * Reference pictures of the app's screens, made on the computer by the screenshot pipeline (never taken from a
 * user's phone), published per release as `screenmap/<versionCode>/manifest.json` with one image and one bounds
 * file per screen, state and theme.
 *
 * The page finds the manifest at `NEXT_PUBLIC_SCREENMAP_MANIFEST_URL`. Until that is set, or while a screen has no
 * picture, the page draws its placeholder frame instead — nothing waits on it.
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

export const MANIFEST_URL = process.env.NEXT_PUBLIC_SCREENMAP_MANIFEST_URL ?? "";

type Json = Record<string, unknown>;

const isObj = (v: unknown): v is Json => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown): string | null => (typeof v === "string" && v ? v : null);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v !== "" && Number.isFinite(Number(v)) ? Number(v) : null);

function resolve(base: string, path: string): string {
  try {
    return new URL(path, base).toString();
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
  const list = raw.elements ?? raw.bounds ?? raw.nodes ?? raw.rects;
  const rects: Rect[] = [];
  const add = (id: string | null, r: unknown) => {
    if (!id || !isObj(r)) return;
    const src = isObj(r.bounds) ? r.bounds : isObj(r.boundsInRoot) ? r.boundsInRoot : r;
    const left = num(src.left) ?? num(src.x);
    const top = num(src.top) ?? num(src.y);
    const w = num(src.width) ?? (num(src.right) !== null && left !== null ? num(src.right)! - left : null);
    const h = num(src.height) ?? (num(src.bottom) !== null && top !== null ? num(src.bottom)! - top : null);
    if (left === null || top === null || w === null || h === null || w <= 0 || h <= 0) return;
    rects.push({ id, x: left, y: top, w, h });
  };
  if (Array.isArray(list)) list.forEach((r) => isObj(r) && add(str(r.id) ?? str(r.tag) ?? str(r.analyticsId) ?? str(r.testTag), r));
  else if (isObj(list)) Object.entries(list).forEach(([id, r]) => add(id, r));
  if (!width || !height) return rects.length ? { width: Math.max(...rects.map((r) => r.x + r.w)), height: Math.max(...rects.map((r) => r.y + r.h)), rects } : null;
  return { width, height, rects };
}

let cache: Promise<Shot[]> | null = null;

/** The manifest, fetched once per page load. Any failure reads as "no pictures yet". */
export function loadShots(): Promise<Shot[]> {
  if (!MANIFEST_URL) return Promise.resolve([]);
  if (!cache) {
    cache = fetch(MANIFEST_URL, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => (j ? readManifest(MANIFEST_URL, j) : []))
      .catch(() => []);
  }
  return cache;
}

export async function loadBounds(url: string | null): Promise<Bounds | null> {
  if (!url) return null;
  try {
    const r = await fetch(url, { cache: "force-cache" });
    return r.ok ? readBounds(await r.json()) : null;
  } catch {
    return null;
  }
}

/** Does bounds id [id] belong to the event element [element] on [screen]? `tap:<screen>:<id>` or the id itself. */
export function sameElement(id: string, element: string, screen: string): boolean {
  const base = element.split("#")[0];
  return base === id || base === `tap:${screen}:${id}`;
}
