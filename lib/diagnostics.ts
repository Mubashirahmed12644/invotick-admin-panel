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
  /**
   * The tab was not on screen when this failed.
   *
   * A sleeping laptop and an unreachable server produce the same status 0, and a burst of them
   * reads as an outage either way. Knowing the tab was hidden is usually the whole explanation —
   * and without it that burst gets reported as a fault and chased.
   */
  hidden?: boolean;
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

/**
 * True once the page is on its way out, so requests it abandons are not filed as faults.
 *
 * Closing a tab, following a link or reloading kills every in-flight request, and each one arrives
 * here as a status 0 that looks exactly like a server that stopped answering. On 2026-08-22 that
 * produced a five-failure report across three endpoints from nothing worse than a deploy replacing
 * the page under an open tab — three of them were simply the requests that tab had in the air.
 *
 * `pagehide` rather than `beforeunload`: Safari fires it for back/forward-cache navigations too,
 * which is the case that made the noise. `pageshow` undoes it, because a page restored from that
 * cache is alive again and its failures matter again.
 */
let leaving = false;
if (typeof window !== "undefined") {
  window.addEventListener("pagehide", () => {
    leaving = true;
  });
  window.addEventListener("pageshow", () => {
    leaving = false;
  });
}

/**
 * How long a failure has to keep failing before it counts as one.
 *
 * A deploy restarts the backend and everything in flight answers 502 for twenty or thirty seconds,
 * then recovers on its own. Recording those made the badge a log of our own releases: on 2026-08-22
 * twenty-one entries, every cluster of them inside a minute of a deploy, carried over as evidence of
 * an outage each time.
 *
 * So a failure waits here first, and one success anywhere cancels the lot. What survives the wait is
 * a server that is still not answering — which is worth a badge. What does not survive it recovered
 * on its own, and something that recovers on its own was not a fault, it was a restart.
 */
const SETTLE_MS = 60_000;

let pending: ApiFailure[] = [];
let settleTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * A request came back. Anything still waiting was a blip.
 *
 * Cleared wholesale rather than per endpoint on purpose: these failures arrive in clusters across
 * every endpoint at once, because the cause is never one endpoint — it is the server, the deploy or
 * the network. One endpoint answering means the thing they all failed against is back.
 */
export function noteApiSuccess(): void {
  pending = [];
}

function settle(): void {
  settleTimer = null;
  const due = pending;
  pending = [];
  if (due.length === 0) return;
  for (const f of due) commitApiFailure(f);
}

export function recordApiFailure(f: ApiFailure): void {
  if (!hasWindow()) return;
  // Only the answerless ones. A 5xx while the page is closing is still a server that failed and is
  // worth keeping; a status 0 is the page's own doing.
  if (leaving && f.status === 0) return;
  pending.push(f);
  if (!settleTimer) settleTimer = setTimeout(settle, SETTLE_MS);
}

function commitApiFailure(f: ApiFailure): void {
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
    lines.push(
    `  ${f.at}  ${String(f.status).padStart(3)}  ${f.method} ${f.url}${f.hidden ? "  [tab hidden]" : ""}`,
  );
  }
  return lines.join("\n");
}
