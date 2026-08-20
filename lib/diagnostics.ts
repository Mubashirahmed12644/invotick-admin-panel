/**
 * Every failed request, kept where it can still be read after the thing that failed has gone.
 *
 * The panel's errors flash and vanish. A page redirects, a poll overwrites the last message, a
 * toast times out — and what is left to report is "different errors keep appearing", which is not
 * something anybody can act on. Meanwhile the console has them, but only until the next reload, and
 * only for whoever happened to have it open.
 *
 * So they are recorded here as they happen, survive a reload, and can be copied out in one press.
 * Deliberately client-side and deliberately in localStorage: the failures worth catching are exactly
 * the ones where the server cannot be reached, and anything that needed the server to record them
 * would be silent for precisely those.
 */
export interface ApiFailure {
  at: string;
  method: string;
  url: string;
  /** 0 when the request never got an answer at all — a timeout, a refused connection, a 502. */
  status: number;
  message: string;
}

const KEY = "webpanel_api_failures";
const CAPACITY = 200;
/**
 * How long a failure stays worth looking at.
 *
 * Kept because a count that only grows stops meaning anything. Fifty-seven failures sitting there
 * from a fault fixed hours ago reads exactly like fifty-seven happening now, and the first version of
 * this had no window at all — the same mistake as a banner that reports a changed firing count: it
 * teaches you to ignore it, which is the one thing a warning must never do.
 */
const MAX_AGE_MS = 2 * 60 * 60 * 1000;

function hasWindow(): boolean {
  return typeof window !== "undefined";
}

export function recordApiFailure(f: ApiFailure): void {
  if (!hasWindow()) return;
  try {
    const all = readApiFailures();
    all.unshift(f);
    window.localStorage.setItem(KEY, JSON.stringify(all.slice(0, CAPACITY)));
    // So a badge can react without polling storage.
    window.dispatchEvent(new CustomEvent("webpanel:api-failure"));
  } catch {
    // Recording a failure must never become one.
  }
}

export function readApiFailures(): ApiFailure[] {
  if (!hasWindow()) return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const all = JSON.parse(raw) as ApiFailure[];
    const cutoff = Date.now() - MAX_AGE_MS;
    return all.filter((f) => Date.parse(f.at) >= cutoff);
  } catch {
    return [];
  }
}

/** Milliseconds since the most recent failure, or null when there are none. */
export function msSinceNewestFailure(): number | null {
  const all = readApiFailures();
  if (!all.length) return null;
  return Date.now() - Date.parse(all[0].at);
}

export function clearApiFailures(): void {
  if (!hasWindow()) return;
  window.localStorage.removeItem(KEY);
  window.dispatchEvent(new CustomEvent("webpanel:api-failure"));
}

/**
 * Grouped by what failed and how, because twenty rows of the same 502 are one fact, not twenty —
 * and a report that reads as twenty sends the reader looking for twenty causes.
 */
export function formatApiFailures(): string {
  const all = readApiFailures();
  if (!all.length) return "# No API failures recorded.";

  const groups = new Map<string, { n: number; first: string; last: string; sample: ApiFailure }>();
  for (const f of all) {
    const path = f.url.split("?")[0];
    const key = `${f.status} ${f.method} ${path}`;
    const g = groups.get(key);
    if (g) {
      g.n += 1;
      if (f.at < g.first) g.first = f.at;
      if (f.at > g.last) g.last = f.at;
    } else {
      groups.set(key, { n: 1, first: f.at, last: f.at, sample: f });
    }
  }

  const lines = [
    `# Panel API failures — ${all.length} recorded, ${groups.size} distinct`,
    `# copied ${new Date().toISOString()} · ${typeof navigator !== "undefined" ? navigator.userAgent : ""}`,
    "",
  ];
  for (const [key, g] of [...groups.entries()].sort((a, b) => b[1].n - a[1].n)) {
    lines.push(`${String(g.n).padStart(4)} x  ${key}`);
    lines.push(`        first ${g.first}  last ${g.last}`);
    lines.push(`        ${g.sample.message}`);
    if (g.sample.url.includes("?")) lines.push(`        query: ${g.sample.url.split("?")[1]}`);
    lines.push("");
  }
  lines.push("# Newest 40, in order:");
  for (const f of all.slice(0, 40)) {
    lines.push(`  ${f.at}  ${String(f.status).padStart(3)}  ${f.method} ${f.url}`);
  }
  return lines.join("\n");
}
