import type { LiveEvent } from "@/lib/types";
import { dateTimeWithMillis } from "@/lib/eventTime";

/**
 * The Live Events stream as text, for pasting somewhere it can be read by someone who is not
 * looking at the screen.
 *
 * It lives here rather than inside the page for one reason: **this is the copy that gets believed.**
 * The page can be re-read; the pasted text is what arrives in chat, and whatever it fails to say is
 * a thing the reader will assume. On 2026-09-19 what it failed to say was the build, and a day went
 * into measuring behaviour that belonged to 1.4.2 (versionCode 94) and had been fixed two releases
 * earlier. A pure function with no component around it can also be run and read directly, which is
 * how its shape is checked.
 *
 * Every event, oldest first — reading order, not the newest-first order the page shows — with the
 * millisecond, the build, the identity as the app sent it, the display name only when one differs
 * from it, the screen, and the full params. The params are the point: they carry `method`,
 * `break_ms`, `had_input` and the rest, and they are exactly what is behind the "params" toggle
 * nobody can paste.
 */

/**
 * The names a screen view arrives under. Android sends `nav_screen_view`; `screen_view` is the iOS
 * spelling.
 *
 * The page tested `=== "screen_view"` in three places, so on Android it never matched. Every screen
 * row was therefore keyed by the literal `nav_screen_view` instead of `screen: <route>`, and two
 * things followed silently: a display name typed against a screen row in Event Discovery was looked
 * up under a key nothing here produced and never appeared, and "mark tested" filed every screen in
 * the app under one shared identity, so ticking one screen ticked all of them.
 *
 * Kept identical to the backend's `event_name IN ('nav_screen_view', 'screen_view')`. The two
 * derivations have to agree exactly — that is the whole contract — so they belong in one place each.
 */
export const SCREEN_VIEW_EVENTS = new Set(["nav_screen_view", "screen_view"]);

/** Event Discovery's identity for a row — `screen: <route>` for a screen view, the name otherwise. */
export function identityOf(e: LiveEvent): string {
  return SCREEN_VIEW_EVENTS.has(e.eventName)
    ? `screen: ${(e.params?.screen as string | undefined) || e.screenName || "?"}`
    : e.eventName;
}

/**
 * The build a row came from, as one short readable thing: `1.4.2 (94)`.
 *
 * One function, because the screen, the copied text and the downloaded file must all say the same
 * words.
 *
 * Never a guess. A row with no version prints an em dash, because "no version reported" and "the
 * version we assume everyone is on" are different answers and only one of them is true.
 */
export function buildLabel(e: Pick<LiveEvent, "appVersion" | "appVersionCode">): string {
  if (e.appVersion && e.appVersionCode != null) return `${e.appVersion} (${e.appVersionCode})`;
  if (e.appVersion) return e.appVersion;
  if (e.appVersionCode != null) return `(${e.appVersionCode})`;
  return "\u2014";
}

/** Every distinct build in a set of rows, newest build number first. */
export function buildsIn(events: LiveEvent[]): string[] {
  const seen = new Map<string, number>();
  events.forEach((e) => {
    const label = buildLabel(e);
    const rank = e.appVersionCode ?? -1;
    if (!seen.has(label) || (seen.get(label) ?? -1) < rank) seen.set(label, rank);
  });
  return [...seen.entries()].sort((a, b) => b[1] - a[1]).map(([label]) => label);
}

export interface StreamReportContext {
  userId: string;
  invotickId?: string | null;
  names: Map<string, string>;
  /** What the page was narrowed to when this was copied. */
  filter?: string;
  /** Overridable so the shape can be checked without the clock moving under it. */
  now?: Date;
}

export function buildStreamReport(events: LiveEvent[], ctx: StreamReportContext): string {
  // Which builds these rows actually came from. Named here and on every line, because a feed that
  // does not say cost a day on 2026-09-19.
  const builds = buildsIn(events);
  const head = [
    `# Live Events \u2014 ${ctx.invotickId ? `Invotick ID ${ctx.invotickId}, ` : ""}user ${ctx.userId}`,
    // A report that does not say what it was filtered to gets read as everything. This one was:
    // copied while the page showed one version, and taken as the user's whole history.
    `# filter: ${ctx.filter ?? "all versions"}`,
    // The mixed case is the one that misleads, so it is said loudly rather than left to be noticed.
    builds.length > 1
      ? `# build: MIXED \u2014 ${builds.join(", ")}. Read every line's own build before comparing them.`
      : `# build: ${builds[0] ?? "\u2014"}`,
    `# ${events.length} events, oldest first, copied ${(ctx.now ?? new Date()).toISOString()}`,
    "",
  ];
  const body = [...events].reverse().map((e, i) => {
    const screen = e.screenName ?? (e.params?.screen as string | undefined) ?? "";
    const ident = identityOf(e);
    const shown = ctx.names.get(ident);
    const label = shown && shown !== ident ? `${ident}  [shown as ${shown}]` : ident;
    const params = e.params && Object.keys(e.params).length ? JSON.stringify(e.params) : "-";
    // The build sits on the first line, next to the time, where the eye already is \u2014 not in the
    // params blob, which is where things go to be scrolled past.
    return `${String(i + 1).padStart(3)}  ${dateTimeWithMillis(e.eventTimestamp)}  [${buildLabel(e)}]  ${label}\n      screen=${screen || "-"}  params=${params}`;
  });
  return [...head, ...body].join("\n");
}
