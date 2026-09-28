/**
 * The app's navigation map: for every pictured screen, every place on it that moves the user somewhere — forward to
 * another screen, back to the one underneath, out of the app (the phone's gallery, camera, share sheet…) — read from
 * the app's own code (VC_113_VN_149), not from the events. The events are the evidence shown beside it: a sheet that
 * closes sends no `screen_view` for the screen underneath, and a trip to the phone's gallery sends none at all, so a
 * map made only from the data leaves exactly those places blank ("—").
 *
 * The data lives in `navmap.data.ts`; this file has no imports, so `tools/screen-map-nav-check.mjs` runs the same
 * functions the page does.
 */

export type PointKind = "forward" | "backward" | "outside" | "conditional" | "stay" | "auto";

export interface Branch {
  /** The condition, in plain words. */
  when: string;
  to?: string;
  toState?: string;
  outside?: string;
  returnsTo?: string;
  /** This branch closes or pops back to [to] rather than opening it anew. */
  back?: boolean;
}

export interface NavPoint {
  /**
   * Which drawn control this is: the control's key in the picture's bounds file (its event id, or `label:<text>`, or
   * `nolabel@l,t,r,b`), `re:<regex>` over those keys for repeated rows, or a place with no rectangle: `@system_back`
   * (the phone's back gesture), `@auto` (the screen moves on by itself), and `@<name>` for a control the picture does
   * not show (a field inside a collapsed section).
   */
  match: string;
  label: string;
  kind: PointKind;
  to?: string;
  /** The picture state the destination opens in (a dialog drawn as a state of its screen). */
  toState?: string;
  /** Outside the app: what opens (Gallery, Camera, Share chooser…). */
  outside?: string;
  /** Where the user lands on coming back from [outside]. */
  returnsTo?: string;
  branches?: Branch[];
  /** What a `stay` control does where it is. */
  stay?: string;
  /** Measured element ids beyond the one [match] names (a close split by `method`, a coded twin). */
  events?: string[];
  /** The handler in the app's code. */
  source?: string;
}

export interface NavControl {
  key: string;
  /** Picture states that show it; empty = all. */
  states: string[];
}

export interface NavScreen {
  /** Plain name. */
  label?: string;
  /** The `screen_view` name the app reports while this shows; null when it reports none. */
  dataScreen: string | null;
  kind: "screen" | "sheet" | "dialog";
  /** What back returns to; null for the root. */
  parent: string | null;
  /** True when the screenshot pipeline has a picture of it. */
  pictured: boolean;
  /** Picture states, in the manifest's order. */
  states: string[];
  /** Every tappable control of the picture's top window, as the bounds files list them. */
  controls: NavControl[];
  points: NavPoint[];
  source?: string;
}

export interface NavMap {
  versionCode: number;
  appBranch: string;
  root: string;
  screens: Record<string, NavScreen>;
}

/** Where a point goes, flattened: one entry per branch. */
export interface Dest {
  kind: "screen" | "outside" | "stay";
  to?: string;
  toState?: string;
  outside?: string;
  returnsTo?: string;
  when?: string;
  back: boolean;
}

export const NAV_KINDS: PointKind[] = ["forward", "backward", "outside", "conditional", "auto", "stay"];

/** Is [p] a navigation point (it moves the user), as opposed to a control that acts where it is? */
export const isNav = (p: NavPoint): boolean => p.kind !== "stay";

export function dests(p: NavPoint): Dest[] {
  switch (p.kind) {
    case "forward":
    case "auto":
      return p.to ? [{ kind: "screen", to: p.to, toState: p.toState, back: false }] : [];
    case "backward":
      return p.to ? [{ kind: "screen", to: p.to, toState: p.toState, back: true }] : [];
    case "outside":
      return p.outside ? [{ kind: "outside", outside: p.outside, returnsTo: p.returnsTo, back: false }] : [];
    case "conditional":
      return (p.branches ?? []).map((b) =>
        b.to
          ? { kind: "screen" as const, to: b.to, toState: b.toState, when: b.when, back: !!b.back }
          : b.outside
            ? { kind: "outside" as const, outside: b.outside, returnsTo: b.returnsTo, when: b.when, back: false }
            : { kind: "stay" as const, when: b.when, back: false },
      );
    default:
      return [];
  }
}

/** Does [p] name the control with key [key]? */
export function matchesControl(p: NavPoint, key: string): boolean {
  if (p.match.startsWith("@")) return false;
  if (p.match.startsWith("re:")) {
    try {
      return new RegExp(p.match.slice(3)).test(key);
    } catch {
      return false;
    }
  }
  return p.match === key;
}

/** The point that covers control [key] on [screen]: an exact key first, then a pattern. */
export function pointForControl(screen: NavScreen, key: string): NavPoint | null {
  return screen.points.find((p) => p.match === key) ?? screen.points.find((p) => p.match.startsWith("re:") && matchesControl(p, key)) ?? null;
}

/** The auto-captured tap's own part: `tap:<screen>:<File>.<label>_N` → `<File>.<label>_N`; a coded id as it is. */
export function tapTag(id: string): string {
  const base = id.split("#")[0];
  const m = /^tap:[^:]+:(.+)$/.exec(base);
  return m ? m[1] : base;
}

/** Does a control key name the measured element [elementKey]? An auto tap by its own part, a coded id as it is. */
function sameId(controlKey: string, elementKey: string): boolean {
  if (controlKey.startsWith("label:") || controlKey.startsWith("nolabel@")) return false;
  const el = elementKey.split("#")[0];
  if (controlKey.startsWith("tap:")) return el.startsWith("tap:") && tapTag(el) === tapTag(controlKey);
  // A close split by `method` (close_button / swipe / scrim_or_back) is measured on the point that names the method.
  return el === controlKey && (elementKey === el || elementKey.endsWith("#close_button") || elementKey.endsWith("#unknown"));
}

/**
 * Does the measured element [elementKey] belong to point [p] on [screen]? The screenshot pipeline stamps a sheet's
 * taps with the screen underneath it while the app stamps them with the sheet's own name, so an auto tap is compared
 * by its own part, never by the screen in front of it.
 */
export function measures(screen: NavScreen, p: NavPoint, elementKey: string): boolean {
  if (p.events?.includes(elementKey)) return true;
  if (p.match.startsWith("@")) return false;
  if (!p.match.startsWith("re:")) return sameId(p.match, elementKey);
  return screen.controls.some((c) => matchesControl(p, c.key) && sameId(c.key, elementKey));
}

/** Every screen [from] leads to, forward or back, with the point that does it. */
export function edges(nav: NavMap, from: string): { to: string; point: NavPoint; back: boolean }[] {
  const s = nav.screens[from];
  if (!s) return [];
  const out: { to: string; point: NavPoint; back: boolean }[] = [];
  for (const p of s.points) {
    for (const d of dests(p)) {
      if (d.kind === "screen" && d.to) out.push({ to: d.to, point: p, back: d.back });
      if (d.kind === "outside" && d.returnsTo) out.push({ to: d.returnsTo, point: p, back: false });
    }
  }
  return out;
}

/** The shortest path of taps from the root to [target], as a list of screens (root first); null when unreachable. */
export function pathTo(nav: NavMap, target: string): string[] | null {
  if (!nav.screens[target]) return null;
  const prev = new Map<string, string | null>([[nav.root, null]]);
  const queue = [nav.root];
  while (queue.length) {
    const cur = queue.shift()!;
    if (cur === target) break;
    for (const e of edges(nav, cur)) {
      if (e.back || prev.has(e.to)) continue;
      prev.set(e.to, cur);
      queue.push(e.to);
    }
  }
  if (!prev.has(target)) return null;
  const path: string[] = [];
  for (let at: string | null = target; at; at = prev.get(at) ?? null) path.unshift(at);
  return path;
}

/** The screen a data-screen name is drawn by: the pictured one reporting it, else the name itself. */
export function nodeForData(nav: NavMap, dataScreen: string): string {
  if (nav.screens[dataScreen]) return dataScreen;
  const hit = Object.entries(nav.screens).find(([, s]) => s.dataScreen === dataScreen);
  return hit ? hit[0] : dataScreen;
}

/** The picture state shown first: an ordinary one, not a dialog, an error or a loading state. */
export function defaultState(states: string[]): string | null {
  const order = ["empty", "filled", "default", "open", "list", "form-empty", "form", "sent", "chrome", "prices-loaded", "invoice", "edit", "pending", "loading"];
  for (const o of order) if (states.includes(o)) return o;
  return states[0] ?? null;
}

/** Does control [c] show in picture state [state]? */
export const inState = (c: NavControl, state: string | null): boolean => !state || c.states.length === 0 || c.states.includes(state);

export interface NavCounts {
  screens: number;
  pictured: number;
  offManifest: number;
  controls: number;
  points: number;
  forward: number;
  backward: number;
  outside: number;
  conditional: number;
  auto: number;
  stay: number;
  unresolved: number;
}

export interface NavProblem {
  screen: string;
  what: string;
}

/**
 * Walks the whole map. A problem is anything that would leave a "—" or a dead end on the page:
 * - a control of a picture that no point covers, or a point that covers no control;
 * - a navigation point with no destination, or one whose destination is not a screen in the map;
 * - a screen other than the root with no way back;
 * - a pictured screen that cannot be reached by tapping from the root, or cannot get back to it.
 */
export function checkNav(nav: NavMap): { counts: NavCounts; problems: NavProblem[] } {
  const problems: NavProblem[] = [];
  const counts: NavCounts = { screens: 0, pictured: 0, offManifest: 0, controls: 0, points: 0, forward: 0, backward: 0, outside: 0, conditional: 0, auto: 0, stay: 0, unresolved: 0 };
  const bad = (screen: string, what: string, unresolved = true) => {
    problems.push({ screen, what });
    if (unresolved) counts.unresolved++;
  };
  if (!nav.screens[nav.root]) bad(nav.root, "the root is not a screen in the map");

  for (const [key, s] of Object.entries(nav.screens)) {
    counts.screens++;
    if (s.pictured) counts.pictured++;
    else counts.offManifest++;
    counts.controls += s.controls.length;

    for (const c of s.controls) {
      const hits = s.points.filter((p) => matchesControl(p, c.key));
      if (hits.length === 0) bad(key, `control "${c.key}" has no point`);
    }
    for (const p of s.points) {
      counts[p.kind]++;
      if (isNav(p)) counts.points++;
      const special = p.match.startsWith("@");
      if (s.pictured && !special && !s.controls.some((c) => matchesControl(p, c.key))) bad(key, `point "${p.match}" matches no control of the picture`);
      if (!isNav(p)) {
        if (!p.stay) bad(key, `"${p.label}" does nothing and says nothing`);
        continue;
      }
      const ds = dests(p);
      if (ds.length === 0) bad(key, `"${p.label}" (${p.kind}) has no destination`);
      for (const d of ds) {
        if (d.kind === "screen" && (!d.to || !nav.screens[d.to])) bad(key, `"${p.label}" leads to "${d.to}", which is not a screen in the map`);
        if (d.kind === "screen" && d.to && d.toState && !nav.screens[d.to]?.states.includes(d.toState)) bad(key, `"${p.label}" opens state "${d.toState}" that ${d.to} has no picture of`);
        if (d.kind === "outside" && d.returnsTo && !nav.screens[d.returnsTo]) bad(key, `"${p.label}" returns to "${d.returnsTo}", which is not a screen in the map`);
        if (d.kind === "stay" && p.kind === "conditional" && !d.when) bad(key, `"${p.label}" has a branch with no condition`);
      }
    }
    if (key !== nav.root) {
      const back = s.points.some((p) => dests(p).some((d) => d.back));
      if (!back) bad(key, "no way back (no backward point and no system back)");
      if (s.parent && !nav.screens[s.parent]) bad(key, `its parent "${s.parent}" is not a screen in the map`);
    }
  }

  // Reachable from the root by forward taps, and back to the root by any taps.
  const reach = new Set<string>([nav.root]);
  const queue = [nav.root];
  while (queue.length) {
    for (const e of edges(nav, queue.shift()!)) if (!reach.has(e.to) && nav.screens[e.to]) {
      reach.add(e.to);
      queue.push(e.to);
    }
  }
  for (const [key, s] of Object.entries(nav.screens)) {
    if (!reach.has(key)) bad(key, `${s.pictured ? "pictured" : "off-manifest"} screen cannot be reached by tapping from ${nav.root}`);
  }
  // Back to the root: reverse reachability over every edge.
  const into = new Map<string, string[]>();
  for (const key of Object.keys(nav.screens)) for (const e of edges(nav, key)) into.set(e.to, [...(into.get(e.to) ?? []), key]);
  const home = new Set<string>([nav.root]);
  const q2 = [nav.root];
  // The root's own screen (the first real one it continues to) counts as home too.
  for (const e of edges(nav, nav.root)) if (!home.has(e.to)) { home.add(e.to); q2.push(e.to); }
  while (q2.length) {
    for (const from of into.get(q2.shift()!) ?? []) if (!home.has(from)) {
      home.add(from);
      q2.push(from);
    }
  }
  for (const [key] of Object.entries(nav.screens)) if (!home.has(key)) bad(key, "cannot get back to the start by tapping");

  return { counts, problems };
}
