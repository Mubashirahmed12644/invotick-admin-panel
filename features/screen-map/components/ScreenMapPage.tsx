"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import LoadingState from "@/components/LoadingState";
import ErrorState from "@/components/ErrorState";
import { getErrorMessage, isUnauthorizedError } from "@/lib/api";
import { clearAccessToken } from "@/lib/auth";
import { cx } from "../cx";
import { screenMapApi } from "../api";
import {
  CREATE,
  CREATE_ELEMENTS,
  EXIT_GROUPS,
  MONEY_SCREENS,
  OVERLAY_ID,
  exitLabel,
  GRID_COLS,
  GRID_ROWS,
  kind,
  parseCell,
  sname,
  tapLabel,
  type DrawState,
  type ElementDef,
} from "../catalog";
import { fmt, fixed2, pc, secs, share, usd } from "../format";
import { loadBounds, loadImage, loadShots, sameElement, type Bounds, type Shot } from "../manifest";
import type { Dimensions, ElementStat, Exit, Filters, Holdout, Mode, ScreenMapStatus, ScreenSummary, ScreenView } from "../types";
import CreatePhone, { badgeText, heatFor, type Metric } from "./CreatePhone";
import { NAV } from "../navmap.data";
import { defaultState, measures, nodeForData, pathTo, type NavPoint } from "../navmap";
import { KIND_NAME, NavCard, NavFrame, NavPhone, PointChoice, nodeName, pointText } from "./NavViewer";

// ── the URL hash: path, mode and filters, so Back, reload and a copied link all land here ──

interface Route {
  stack: string[];
  mode: Mode;
  f: Filters;
}

const DEFAULT_FILTERS: Filters = { days: 14, platform: "Android", versions: "", country: "", source: "", user: "" };
const DEFAULT_ROUTE: Route = { stack: ["splash_scr", "dashboard", CREATE], mode: "tour", f: DEFAULT_FILTERS };
const STORE_KEY = "screenmap.hash";

function readHash(hash: string): Route {
  const q = new URLSearchParams(hash.replace(/^#/, ""));
  const stack = (q.get("p") ?? "").split(">").map((s) => s.trim()).filter((s) => /^[A-Za-z0-9_:.~-]{1,120}$/.test(s));
  const days = Number(q.get("d"));
  const src = q.get("src");
  const u = q.get("u");
  return {
    stack: stack.length ? stack : DEFAULT_ROUTE.stack,
    mode: q.get("m") === "normal" ? "normal" : "tour",
    f: {
      days: days === 7 || days === 30 ? days : 14,
      platform: q.has("pf") ? q.get("pf") ?? "" : DEFAULT_FILTERS.platform,
      versions: (q.get("v") ?? "").split(",").filter((x) => /^\d+$/.test(x)).join(","),
      country: q.get("c") ?? "",
      source: src === "meta" || src === "organic" ? src : "",
      user: u === "new" || u === "returning" ? u : "",
    },
  };
}

function writeHash(r: Route): string {
  const q = new URLSearchParams();
  q.set("m", r.mode);
  q.set("p", r.stack.join(">"));
  q.set("d", String(r.f.days));
  q.set("pf", r.f.platform);
  if (r.f.versions) q.set("v", r.f.versions);
  if (r.f.country) q.set("c", r.f.country);
  if (r.f.source) q.set("src", r.f.source);
  if (r.f.user) q.set("u", r.f.user);
  return `#${q.toString()}`;
}

function remember(hash: string) {
  try {
    window.localStorage.setItem(STORE_KEY, hash);
  } catch {
    // A private window or blocked storage: the hash in the URL still carries everything.
  }
}

function recalled(): string | null {
  try {
    return window.localStorage.getItem(STORE_KEY);
  } catch {
    return null;
  }
}

const NAV_EVENT = "screenmap:navigate";

function subscribeHash(onChange: () => void): () => void {
  window.addEventListener("hashchange", onChange);
  window.addEventListener("popstate", onChange);
  window.addEventListener(NAV_EVENT, onChange);
  return () => {
    window.removeEventListener("hashchange", onChange);
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(NAV_EVENT, onChange);
  };
}

/** This page's place in the browser's history: its index, and the furthest index a Forward can reach. */
function histIndex(): number {
  const st = window.history.state as { smIdx?: number } | null;
  return typeof st?.smIdx === "number" ? st.smIdx : 0;
}
let histMax = 0;

/** A stack entry is `<node>` or `<node>~<picture state>`. */
function splitEntry(e: string): { node: string; state: string | null } {
  const i = e.indexOf("~");
  return i < 0 ? { node: e, state: null } : { node: e.slice(0, i), state: e.slice(i + 1) || null };
}
const entry = (node: string, state?: string | null) => (state ? `${node}~${state}` : node);

/** The hash, or on an empty URL the one this page was last on. Never null in the browser. */
function currentHash(): string {
  return window.location.hash || recalled() || "";
}

function serverHash(): string | null {
  return null;
}

// ── page ──

export default function ScreenMapPage() {
  const router = useRouter();
  // The route lives in the URL hash: read through useSyncExternalStore so Back, Forward and a pasted link follow it.
  const hash = useSyncExternalStore(subscribeHash, currentHash, serverHash);
  const ready = hash !== null;
  const route = useMemo(() => readHash(hash ?? ""), [hash]);
  const [view, setView] = useState<{ key: string; data: ScreenView } | null>(null);
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null);
  const [screens, setScreens] = useState<ScreenSummary[]>([]);
  const [dims, setDims] = useState<Dimensions | null>(null);
  const [holdout, setHoldout] = useState<Holdout | null>(null);
  const [status, setStatus] = useState<ScreenMapStatus | null>(null);
  const [shots, setShots] = useState<Shot[]>([]);
  const [picked, setSel] = useState("overlay");
  const [drawState, setDrawState] = useState<DrawState>("empty");
  const [metric, setMetric] = useState<Metric>("reach");
  const [dark, setDark] = useState(false);
  const [navGo, setNavGo] = useState(true);
  const [exitView, setExitView] = useState<"visits" | "lost">("visits");
  const [tipState, setTipState] = useState<{ text: string; x: number; y: number; hash: string | null } | null>(null);
  const [retry, setRetry] = useState(0);

  const tip = tipState && tipState.hash === hash ? tipState : null;
  const setTip = useCallback((t: { text: string; x: number; y: number } | null) => setTipState(t ? { ...t, hash } : null), [hash]);
  const top = splitEntry(route.stack[route.stack.length - 1]);
  const node = top.node;
  const navScreen = NAV.screens[node] ?? null;
  // The name the data is kept under; null for a screen that reports no screen_view of its own.
  const screen = navScreen ? navScreen.dataScreen : node.startsWith("off:") ? null : node;
  const picState = navScreen?.pictured ? (top.state && navScreen.states.includes(top.state) ? top.state : defaultState(navScreen.states)) : null;
  const isCreate = screen === CREATE && (node === CREATE || !navScreen);
  // The tour's overlay does not exist without the tour.
  const sel = route.mode === "normal" && picked === "overlay" ? "preview" : picked;
  const viewKey = `${route.mode}|${screen}|${JSON.stringify(route.f)}|${retry}`;
  const filterKey = JSON.stringify(route.f);
  const loading = ready && screen !== null && view?.key !== viewKey && failure?.key !== viewKey;
  const error = failure?.key === viewKey ? failure.message : null;

  // Canonical hash on first load (an empty URL takes the last one used), remembered for the next visit.
  useEffect(() => {
    if (hash === null) return;
    const h = writeHash(route);
    remember(h);
    if (window.location.hash !== h) window.history.replaceState({ smIdx: histIndex() }, "", h);
  }, [hash, route]);

  const [choice, setChoice] = useState<{ hash: string; point: NavPoint } | null>(null);
  const [picked2, setPicked2] = useState<{ node: string; match: string } | null>(null);
  const navigate = useCallback((next: Route) => {
    const h = writeHash(next);
    remember(h);
    if (window.location.hash !== h) {
      const idx = histIndex() + 1;
      histMax = idx;
      window.history.pushState({ smIdx: idx }, "", h);
      window.dispatchEvent(new Event(NAV_EVENT));
    }
    setTipState(null);
    setChoice(null);
  }, []);

  /** Forward: the destination goes on top of the stack. The same screen in another state replaces the top. */
  const go = useCallback(
    (to: string, toState?: string | null) => {
      const cur = splitEntry(route.stack[route.stack.length - 1]);
      const stack = cur.node === to ? [...route.stack.slice(0, -1), entry(to, toState)] : [...route.stack, entry(to, toState)];
      navigate({ ...route, stack });
    },
    [navigate, route],
  );
  /** Back to [to]: the stack unwinds to it; a screen that is not below (a jump from the picker) is reached by its path. */
  const backTo = useCallback(
    (to: string, toState?: string | null) => {
      const below = route.stack.slice(0, -1);
      let i = below.length - 1;
      while (i >= 0 && splitEntry(below[i]).node !== to) i--;
      const stack = i >= 0 ? [...below.slice(0, i), entry(to, toState ?? splitEntry(below[i]).state)] : [...(pathTo(NAV, to) ?? [to]).slice(0, -1), entry(to, toState)];
      navigate({ ...route, stack });
    },
    [navigate, route],
  );
  const back = useCallback(() => {
    if (route.stack.length > 1) navigate({ ...route, stack: route.stack.slice(0, -1) });
  }, [navigate, route]);
  const onGo = useCallback((to: string, toState?: string, isBack?: boolean) => (isBack ? backTo(to, toState) : go(to, toState)), [go, backTo]);
  const setPicState = useCallback((st: string) => go(node, st), [go, node]);
  const setFilter = useCallback((patch: Partial<Filters>) => navigate({ ...route, f: { ...route.f, ...patch } }), [navigate, route]);

  const onFail = useCallback(
    (e: unknown) => {
      if (isUnauthorizedError(e)) {
        clearAccessToken({ sessionExpired: true });
        router.replace("/login");
        return true;
      }
      return false;
    },
    [router],
  );

  // The screen itself.
  useEffect(() => {
    if (!ready || !screen) return;
    let cancelled = false;
    const f = JSON.parse(filterKey) as Filters;
    screenMapApi
      .screen(screen, route.mode, f, 100)
      .then((data) => !cancelled && setView({ key: viewKey, data }))
      .catch((e) => !cancelled && !onFail(e) && setFailure({ key: viewKey, message: getErrorMessage(e, "Screen Map load nahi hua.") }));
    return () => {
      cancelled = true;
    };
  }, [ready, screen, route.mode, filterKey, viewKey, onFail]);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    screenMapApi.screens(route.f.days, route.f.platform).then((s) => !cancelled && setScreens(s)).catch(onFail);
    return () => {
      cancelled = true;
    };
  }, [ready, route.f.days, route.f.platform, onFail]);

  useEffect(() => {
    if (!ready || !screen) return;
    let cancelled = false;
    screenMapApi.dimensions(screen, route.f.days).then((d) => !cancelled && setDims(d)).catch(onFail);
    return () => {
      cancelled = true;
    };
  }, [ready, screen, route.f.days, onFail]);

  useEffect(() => {
    if (!ready || !isCreate) return;
    let cancelled = false;
    screenMapApi.holdout(JSON.parse(filterKey) as Filters).then((h) => !cancelled && setHoldout(h)).catch(onFail);
    return () => {
      cancelled = true;
    };
  }, [ready, isCreate, filterKey, onFail]);

  useEffect(() => {
    let cancelled = false;
    screenMapApi.status().then((st) => !cancelled && setStatus(st)).catch(() => undefined);
    loadShots().then((sh) => !cancelled && setShots(sh));
    return () => {
      cancelled = true;
    };
  }, []);

  // ── derived ──

  const data = screen && view?.key === viewKey ? view.data : null;
  const stats = useMemo(() => {
    const out: Record<string, ElementStat | null> = {};
    const els = data?.elements ?? [];
    for (const def of CREATE_ELEMENTS) {
      out[def.k] = els.find((e) => def.ids.includes(e.key)) ?? null;
    }
    return out;
  }, [data]);
  const overlay = useMemo(() => data?.elements.find((e) => e.key === OVERLAY_ID) ?? null, [data]);

  const measured = useCallback(
    (def: ElementDef) => {
      if (def.needs === "dead_tap") return false;
      if (def.needs === "ad_clicked") return Boolean(stats[def.k]);
      return true;
    },
    [stats],
  );

  const onPick = useCallback(
    (k: string) => {
      const st = stats[k];
      if (navGo && st?.leadsTo) {
        go(st.leadsTo);
        return;
      }
      setSel(k);
    },
    [stats, navGo, go],
  );

  const onHover = useCallback(
    (k: string | null, x: number, y: number) => {
      if (!k) return setTip(null);
      const def = CREATE_ELEMENTS.find((d) => d.k === k);
      const st = stats[k];
      const text = st?.leadsTo
        ? `${def?.label ?? k}: yahan dabane par ${pc(st.leadsToPct)} → ${sname(st.leadsTo)}`
        : `${def?.label ?? k}: yahan dabane se koi nayi screen nahi khulti`;
      setTip({ text, x, y });
    },
    [stats, setTip],
  );

  const onPoint = (p: NavPoint) => {
    setPicked2({ node, match: p.match });
    if (!navGo) return;
    if ((p.kind === "forward" || p.kind === "auto") && p.to) return go(p.to, p.toState);
    if (p.kind === "backward" && p.to) return backTo(p.to, p.toState);
    setChoice({ hash: hash ?? "", point: p });
  };
  const selectedPoint = picked2?.node === node ? picked2.match : null;
  const openChoice = choice && choice.hash === hash ? choice.point : null;

  if (!ready) return null;

  const h = data?.headline;
  const modeCounts = Object.fromEntries((data?.modes ?? []).map((m) => [m.mode, m]));

  return (
    <main className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Navbar title="Screen Map" />
        <section className="content-wrap">
          <div className={cx("root")}>
            <h1>Screen Map: {nodeName(NAV, node)}</h1>
            <div className={cx("sub")}>
              {data ? `${data.from} – ${data.to}` : "…"} · sirf release build · hamare test phone nikaal diye ·{" "}
              {status?.countedThrough ? `ginti ${status.countedThrough.replace("T", " ").slice(0, 16)} UTC tak` : "ginti abhi shuru nahi hui"}
              {status?.running ? " · abhi gin raha hai" : ""}
            </div>

            <FilterCard route={route} screens={screens} dims={dims} setFilter={setFilter} navigate={navigate} />

            <div className={cx("card section")}>
              <div className={cx("flabel")} style={{ marginBottom: 6 }}>
                Screen ki haalat (mode) — har number isi se badalta hai
              </div>
              <div className={cx("modes")}>
                {(["tour", "normal"] as Mode[]).map((m) => {
                  const c = modeCounts[m];
                  const title = isCreate ? (m === "tour" ? "Pehli invoice — tour ke saath" : "Baaqi sab — bina tour") : m === "tour" ? "Pehli invoice" : "Baaqi sab";
                  return (
                    <button key={m} className={cx("mode")} aria-pressed={route.mode === m} onClick={() => navigate({ ...route, mode: m })}>
                      <b>{title}</b>
                      <span>
                        {c ? `${fmt(c.viewers)} devices · ${fmt(c.visits)} visits${isCreate ? ` · invoice ${pc(share(c.createdDevices, c.viewers))}` : ""}` : "—"}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className={cx("note")}>
                <ModeNote isCreate={isCreate} sources={data?.modeSources ?? {}} />
              </div>
            </div>

            {error && <ErrorState message={error} onRetry={() => setRetry((n) => n + 1)} />}
            {!data && loading && <LoadingState message="Screen Map load ho raha hai…" />}
            {data && h && <Kpis view={data} isCreate={isCreate} />}
            <div className={cx("grid")}>
              <PhoneColumn
                route={route}
                node={node}
                screen={screen}
                picState={picState}
                setPicState={setPicState}
                view={data}
                shots={shots}
                drawState={drawState}
                setDrawState={(s) => {
                  setDrawState(s);
                  if (s === "full" && ["logo", "meta", "business", "client"].includes(sel)) setSel("save");
                  if (s === "empty" && ["save", "itemrow", "expand", "banner"].includes(sel)) setSel("business");
                }}
                dark={dark}
                setDark={setDark}
                metric={metric}
                setMetric={setMetric}
                navGo={navGo}
                setNavGo={setNavGo}
                back={back}
                navigate={navigate}
                go={go}
                onGo={onGo}
                onPoint={onPoint}
                selectedPoint={selectedPoint}
                choice={openChoice}
                closeChoice={() => setChoice(null)}
                stats={stats}
                overlay={overlay}
                measured={measured}
                sel={sel}
                onPick={onPick}
                onHover={onHover}
                setTip={setTip}
              />
              <div>
                {navScreen && <NavCard nav={NAV} node={node} screen={navScreen} view={data} selected={selectedPoint} onPoint={onPoint} onGo={onGo} />}
                {data && h && (isCreate ? (
                  <>
                    <CreateDetail sel={sel} view={data} stats={stats} overlay={overlay} measured={measured} />
                    <CreateTable sel={sel} setSel={setSel} stats={stats} overlay={overlay} measured={measured} />
                  </>
                ) : (
                  <GenericRight view={data} screen={screen ?? node} node={node} go={(to) => go(nodeForData(NAV, to))} onPoint={onPoint} />
                ))}
                {!screen && (
                  <div className={cx("card section")}>
                    <div className={cx("small muted")}>
                      Ye screen apna screen_view nahi bhejti, is liye is ke numbers alag se nahi gine jate. Raaste upar app ke code se hain.
                    </div>
                  </div>
                )}
              </div>
            </div>
            {data && h && (
              <>
                <div className={cx("two section")}>
                  <ExitsCard view={data} isCreate={isCreate} exitView={exitView} setExitView={setExitView} mode={route.mode} />
                  <div className={cx("card")}>
                    <h2>Waqt is screen par</h2>
                    <div className={cx("dgrid")} style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
                      <div><b>{secs(h.stay.median)}</b><span>aam visit (median)</span></div>
                      <div><b>{secs(h.stay.p75)}</b><span>visit p75</span></div>
                      {isCreate && <div><b>{secs(h.toInvoice.median)}</b><span>khulne se invoice tak (median)</span></div>}
                      {isCreate && <div><b>{secs(h.toInvoice.p75)}</b><span>invoice tak p75</span></div>}
                    </div>
                    <div className={cx("note")}>
                      {isCreate
                        ? "Aik \"visit\" = Create Invoice khuli, phir business/client/item wali sheets ke saath, jab tak user screen chhor na de. Invoice tak ka waqt sirf unka jinki invoice isi visit mein bani."
                        : "Aik visit = screen khuli, jab tak agli screen na khule ya app chhor na di jaye. Waqt app ka apna naap hai (prev_screen_ms) jahan wo maujood hai."}
                    </div>
                    {(isCreate || MONEY_SCREENS.has(screen ?? "") || data.revenue.appOpenN + data.revenue.interstitialN + data.revenue.bannerN > 0) && (
                      <BothSides view={data} isCreate={isCreate} screen={screen ?? ""} />
                    )}
                  </div>
                </div>

                <div className={cx("two section")}>
                  <DeadTaps view={data} isCreate={isCreate} mode={route.mode} overlay={overlay} />
                  {isCreate ? <Why view={data} mode={route.mode} stats={stats} overlay={overlay} /> : <NextScreens view={data} go={(to) => go(nodeForData(NAV, to))} />}
                </div>

                {isCreate && <HoldoutCard holdout={holdout} />}
                {isCreate && <CoverageCard view={data} shots={shots} />}
                <div className={cx("note")} style={{ margin: "14px 0 30px" }}>
                  Source: Screen Map tables (screen_stay, screen_tap_day, screen_nav_day), jo job har 3 ghante naye aane wale
                  analytics_events se bharta hai. Aik device = aik dekhne wala. Filter sab saath chalte hain.
                </div>
              </>
            )}
          </div>
          {tip && (
            <div className={cx("tipbox")} style={{ left: Math.min(window.innerWidth - 270, tip.x + 12), top: tip.y + 14 }}>
              {tip.text}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

// ── filters ──

function Chip({ on, onClick, children, title, disabled }: { on: boolean; onClick: () => void; children: ReactNode; title?: string; disabled?: boolean }) {
  return (
    <button className={cx("chip")} aria-pressed={on} onClick={onClick} title={title} disabled={disabled}>
      {children}
    </button>
  );
}

function FilterCard({
  route,
  screens,
  dims,
  setFilter,
  navigate,
}: {
  route: Route;
  screens: ScreenSummary[];
  dims: Dimensions | null;
  setFilter: (p: Partial<Filters>) => void;
  navigate: (r: Route) => void;
}) {
  const f = route.f;
  const screen = splitEntry(route.stack[route.stack.length - 1]).node;
  const versions = (dims?.versions ?? []).filter((v) => v.value && v.value !== "-1");
  const top = versions.slice(0, 3);
  const older = versions.slice(3).map((v) => v.value).join(",");
  const countries = (dims?.countries ?? []).filter((c) => c.value).slice(0, 3);
  const platforms = (dims?.platforms ?? []).filter((p) => p.value);
  const pick = (v: string) => {
    const path = pathTo(NAV, nodeForData(NAV, v));
    navigate({ ...route, stack: path ?? (v === CREATE ? ["dashboard", CREATE] : kind(v) !== "screen" ? [CREATE, v] : [v]) });
  };
  const listed = new Set(screens.map((s) => s.screen));
  const drawnOnly = Object.entries(NAV.screens).filter(([k, s]) => !listed.has(s.dataScreen ?? k) && !listed.has(k));

  return (
    <div className={cx("card section")}>
      <div className={cx("row")} style={{ justifyContent: "space-between", gap: 12 }}>
        <div className={cx("fgroup")} style={{ flex: 1, minWidth: 260 }}>
          <span className={cx("flabel")}>Screen</span>
          <select className={cx("select")} aria-label="Screen chunein" value={screen} onChange={(e) => pick(e.target.value)}>
            {!screens.some((s) => s.screen === screen) && !NAV.screens[screen] && <option value={screen}>{sname(screen)}</option>}
            {drawnOnly.map(([k]) => (
              <option key={k} value={k}>
                {nodeName(NAV, k)} — naqsha (data nahi)
              </option>
            ))}
            {screens.map((s) => (
              <option key={s.screen} value={s.screen}>
                {sname(s.screen)} — {fmt(s.viewers)}
              </option>
            ))}
          </select>
          <span className={cx("tag tPart")}>{screens.length} screens</span>
        </div>
        <div className={cx("fgroup")}>
          <span className={cx("flabel")}>Din</span>
          {([7, 14, 30] as const).map((d) => (
            <Chip key={d} on={f.days === d} onClick={() => setFilter({ days: d })}>
              {d}
            </Chip>
          ))}
          <span className={cx("flabel")} style={{ marginLeft: 6 }}>Platform</span>
          <Chip on={f.platform === ""} onClick={() => setFilter({ platform: "" })}>Sab</Chip>
          {["Android", "iOS"].map((p) => {
            const d = platforms.find((x) => x.value === p);
            return (
              <Chip key={p} on={f.platform === p} onClick={() => setFilter({ platform: p })} title={d ? `${fmt(d.devices)} devices` : "is range mein koi release user nahi"}>
                {p}
              </Chip>
            );
          })}
        </div>
      </div>
      <div className={cx("row")} style={{ marginTop: 6, gap: 14 }}>
        <div className={cx("fgroup")}>
          <span className={cx("flabel")}>Version</span>
          <Chip on={!f.versions} onClick={() => setFilter({ versions: "" })}>Sab</Chip>
          {top.map((v) => (
            <Chip key={v.value} on={f.versions === v.value} onClick={() => setFilter({ versions: v.value })} title={`${fmt(v.devices)} devices`}>
              {v.value}
            </Chip>
          ))}
          {older && (
            <Chip on={f.versions === older} onClick={() => setFilter({ versions: older })}>
              Purane
            </Chip>
          )}
        </div>
        <div className={cx("fgroup")}>
          <span className={cx("flabel")}>Kahan se aaye</span>
          <Chip on={!f.source} onClick={() => setFilter({ source: "" })}>Sab</Chip>
          <Chip on={f.source === "meta"} onClick={() => setFilter({ source: "meta" })}>Meta</Chip>
          <Chip on={f.source === "organic"} onClick={() => setFilter({ source: "organic" })}>Organic</Chip>
        </div>
        <div className={cx("fgroup")}>
          <span className={cx("flabel")}>Mulk</span>
          <Chip on={!f.country} onClick={() => setFilter({ country: "" })}>Sab</Chip>
          {countries.map((c) => (
            <Chip key={c.value} on={f.country === c.value} onClick={() => setFilter({ country: c.value })} title={`${fmt(c.devices)} devices`}>
              {c.value}
            </Chip>
          ))}
        </div>
        <div className={cx("fgroup")}>
          <span className={cx("flabel")}>User</span>
          <Chip on={!f.user} onClick={() => setFilter({ user: "" })}>Sab</Chip>
          <Chip on={f.user === "new"} onClick={() => setFilter({ user: "new" })}>Naye</Chip>
          <Chip on={f.user === "returning"} onClick={() => setFilter({ user: "returning" })}>Purane</Chip>
        </div>
      </div>
      <div className={cx("note")}>
        Sab filter saath chalte hain. &quot;Meta&quot; = install Facebook/Instagram ke raaste (device_journey.meta_shaped); jis device ka
        journey row nahi wo na Meta mein na Organic mein. &quot;Naye&quot; = is range mein app pehli dafa kholte hi ye screen dekhi (open_count = 1).
      </div>
    </div>
  );
}

function ModeNote({ isCreate, sources }: { isCreate: boolean; sources: Record<string, number> }) {
  const total = Object.values(sources).reduce((a, b) => a + b, 0);
  const signal = sources.screen_mode ?? 0;
  if (!isCreate) {
    return (
      <>
        Is screen par: <b>&quot;Pehli invoice&quot;</b> = device ki pehli invoice banne tak (aur uske 30 minute baad tak),{" "}
        <b>&quot;Baaqi sab&quot;</b> = uske baad. {signal > 0 && `${fmt(signal)} visits mein app ne khud haalat batayi (screen_mode).`}
      </>
    );
  }
  return (
    <>
      Har <b>visit</b> ki apni haalat. {signal > 0 ? <><b>{pc(share(signal, total))}</b> visits mein app ne khud batayi (screen_mode); baaqi ki </> : "App abhi haalat nahi bhejti (screen_mode naye release se aayega), is liye "}
      haalat device ki history se: tour tab tak jab tak pehla item/invoice/estimate na bane, aur jis visit mein parde par tap hua wo tour mein
      ({fmt(sources.overlay_tap ?? 0)} visits). Andaaza: history wali &quot;bina tour&quot; visits ka ~18% asal mein tour ho sakta hai.
    </>
  );
}

// ── KPIs ──

function Kpis({ view, isCreate }: { view: ScreenView; isCreate: boolean }) {
  const h = view.headline;
  const items: [string, string, string][] = isCreate
    ? [
        [fmt(h.viewers), "devices (is haalat mein)", `${fmt(h.visits)} visits · ${pc(share(h.visitsEndedSaved, h.visits))} invoice par khatam`],
        [fmt(h.complete), "kam az kam aik item add kiya", pc(share(h.complete, h.viewers))],
        [fmt(h.saveDevices), "Save dabaya", pc(share(h.saveDevices, h.viewers))],
        [fmt(h.createdDevices), "invoice bani", pc(share(h.createdDevices, h.viewers))],
        [fmt(h.sharedDevices), "3 ghante mein share bhi ki", pc(share(h.sharedDevices, h.viewers))],
        [secs(h.stay.median), "aam visit ka waqt (median)", `p75 ${secs(h.stay.p75)}`],
      ]
    : [
        [fmt(h.viewers), "devices (is haalat mein)", `${fmt(h.visits)} visits`],
        [secs(h.stay.median), "median waqt", `p75 ${secs(h.stay.p75)}`],
        [fmt(view.elementsTotal), "cheezen jin par tap aaya", `sab se upar: ${view.elements[0] ? pc(view.elements[0].reachPct) : "—"}`],
        [view.exits[0] ? exitLabel(view.exits[0].kind) : "—", "sab se aam nikalna", view.exits[0] ? pc(share(view.exits[0].visits, h.visits)) : ""],
      ];
  return (
    <div className={cx("kpis")}>
      {items.map(([v, l, p]) => (
        <div key={l} className={cx("kpi")}>
          <div className={cx("kpiV")} style={v.length > 12 ? { fontSize: 14, whiteSpace: "normal" } : undefined}>{v}</div>
          <div className={cx("kpiL")}>{l}</div>
          <div className={cx("kpiP")}>{p}</div>
        </div>
      ))}
    </div>
  );
}

// ── the phone column ──

interface PhoneProps {
  route: Route;
  node: string;
  screen: string | null;
  picState: string | null;
  setPicState: (s: string) => void;
  view: ScreenView | null;
  shots: Shot[];
  drawState: DrawState;
  setDrawState: (s: DrawState) => void;
  dark: boolean;
  setDark: (d: boolean) => void;
  metric: Metric;
  setMetric: (m: Metric) => void;
  navGo: boolean;
  setNavGo: (b: boolean) => void;
  back: () => void;
  navigate: (r: Route) => void;
  go: (s: string, state?: string | null) => void;
  onGo: (to: string, toState?: string, back?: boolean) => void;
  onPoint: (p: NavPoint) => void;
  selectedPoint: string | null;
  choice: NavPoint | null;
  closeChoice: () => void;
  stats: Record<string, ElementStat | null>;
  overlay: ElementStat | null;
  measured: (d: ElementDef) => boolean;
  sel: string;
  onPick: (k: string) => void;
  onHover: (k: string | null, x: number, y: number) => void;
  setTip: (t: { text: string; x: number; y: number } | null) => void;
}

/** The browser's own history for this page: Back and Forward like a browser's, over every screen visited. */
function HistoryButtons() {
  const [, force] = useState(0);
  useEffect(() => subscribeHash(() => force((n) => n + 1)), []);
  const idx = typeof window === "undefined" ? 0 : histIndex();
  return (
    <div className={cx("navhist")}>
      <button type="button" className={cx("chip chipSm")} disabled={idx <= 0} onClick={() => window.history.back()} title="Pichhli dekhi hui screen (browser ki tarah)">
        ◀ Pichhli
      </button>
      <button type="button" className={cx("chip chipSm")} disabled={idx >= histMax} onClick={() => window.history.forward()} title="Agli dekhi hui screen (browser ki tarah)">
        Agli ▶
      </button>
    </div>
  );
}

function PhoneColumn(p: PhoneProps) {
  const { route, node, screen, view, shots, drawState, dark, metric, navGo, picState } = p;
  const navScreen = NAV.screens[node] ?? null;
  const isCreate = screen === CREATE && (node === CREATE || !navScreen);
  const box = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setZoom(Math.min(1, Math.max(0.5, (el.clientWidth - 30) / 376))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const theme = dark ? "dark" : "light";
  const shot = navScreen?.pictured
    ? shots.find((s) => s.screen === node && s.theme === theme && s.state === picState) ?? shots.find((s) => s.screen === node && s.theme === theme) ?? null
    : !navScreen && screen
      ? shots.find((s) => s.screen === screen && s.theme === theme) ?? null
      : null;
  const parent = route.stack.length > 1 ? splitEntry(route.stack[route.stack.length - 2]).node : null;
  const overCreate = !isCreate && !!screen && kind(screen) !== "screen" && parent === CREATE && !navScreen;

  return (
    <div className={cx("card phoneBox")} ref={box}>
      <HistoryButtons />
      <div className={cx("crumbs")}>
        <button className={cx("backbtn")} disabled={route.stack.length < 2} aria-label="Ek qadam upar (stack)" title="Stack mein ek qadam neeche" onClick={p.back}>
          ←
        </button>
        {route.stack.map((k, i) => {
          const e = splitEntry(k);
          return i === route.stack.length - 1 ? (
            <span key={`${k}-${i}`} className={cx("here")}>{nodeName(NAV, e.node)}</span>
          ) : (
            <span key={`${k}-${i}`}>
              <a onClick={() => p.navigate({ ...route, stack: route.stack.slice(0, i + 1) })}>{nodeName(NAV, e.node)}</a> <span className={cx("muted")}>→</span>
            </span>
          );
        })}
        <button className={cx("chip chipSm")} aria-pressed={navGo} onClick={() => p.setNavGo(!navGo)} title="Band ho to tap sirf cheez chunta hai, aage nahi le jata">
          Tap = aage jayein
        </button>
      </div>
      {navScreen?.pictured && navScreen.states.length > 1 && (
        <div className={cx("row")} style={{ justifyContent: "center" }}>
          <span className={cx("flabel")}>Tasveer</span>
          {navScreen.states.map((st) => (
            <Chip key={st} on={picState === st} onClick={() => p.setPicState(st)}>
              {st}
            </Chip>
          ))}
        </div>
      )}
      {isCreate && !shot && (
        <div className={cx("row")} style={{ justifyContent: "center" }}>
          <Chip on={drawState === "empty"} onClick={() => p.setDrawState("empty")}>Khaali (pehli dafa)</Chip>
          <Chip on={drawState === "full"} onClick={() => p.setDrawState("full")}>Mukammal (Save dikhta hai)</Chip>
        </div>
      )}
      <div className={cx("row")} style={{ justifyContent: "center" }}>
        <Chip on={dark} onClick={() => p.setDark(!dark)}>Dark tasveer</Chip>
        <span className={cx("flabel")}>Rang</span>
        {(["forward", "backward", "outside", "conditional"] as const).map((k) => (
          <span key={k} className={cx("kind", `k-${k}`)}>{KIND_NAME[k]}</span>
        ))}
      </div>
      {p.choice && <PointChoice nav={NAV} point={p.choice} onGo={p.onGo} onClose={p.closeChoice} />}
      <div className={cx("phoneScale")} style={{ zoom }}>
        <div className={cx("phone")}>
          {navScreen && shot ? (
            <NavPhone nav={NAV} node={node} screen={navScreen} shot={shot} view={view} metric={metric} selected={p.selectedPoint} onPoint={p.onPoint} setTip={p.setTip} />
          ) : navScreen ? (
            <NavFrame nav={NAV} node={node} screen={navScreen} view={view} onPoint={p.onPoint} dark={dark} />
          ) : view && shot ? (
            <ShotPhone shot={shot} screen={screen ?? node} view={view} metric={metric} navGo={navGo} go={(to) => p.go(nodeForData(NAV, to))} setTip={p.setTip} />
          ) : view && (isCreate || overCreate) ? (
            <CreatePhone
              state={overCreate ? (screen === "ad_dialog_shown" ? "full" : drawState) : drawState}
              mode={route.mode}
              dark={dark}
              metric={metric}
              sel={p.sel}
              stats={p.stats}
              overlay={p.overlay}
              measured={p.measured}
              onPick={p.onPick}
              onHover={p.onHover}
              bare={overCreate}
            >
              {overCreate && <GenericFrame screen={screen!} view={view} navGo={navGo} go={(to) => p.go(nodeForData(NAV, to))} setTip={p.setTip} />}
            </CreatePhone>
          ) : view ? (
            <div className={cx("screen", dark && "dark")}>
              <GenericFrame screen={screen ?? node} view={view} navGo={navGo} go={(to) => p.go(nodeForData(NAV, to))} setTip={p.setTip} />
            </div>
          ) : (
            <div className={cx("screen", dark && "dark")} />
          )}
        </div>
      </div>
      <div className={cx("note")} style={{ textAlign: "center", maxWidth: 360 }}>
        {navScreen
          ? shot
            ? "Tasveer computer par hamare demo data se bani (screenshot pipeline) — kabhi kisi user ki nahi. Har dabne wali cheez par tap karein: neela = aage, jamni = wapas, peela = app se bahar, firozi = shart ke saath. Phone ka back neeche hai."
            : navScreen.pictured
              ? "Tasveer load ho rahi hai…"
              : "Is screen ki tasveer pipeline mein abhi nahi; is ke raaste app ke code se buttons ki shakal mein hain."
          : "Is screen ki tasveer abhi nahi aayi, is liye phone mein iske taps ki fehrist hai — har aik par tap karke aage ja sakte hain."}
      </div>
    </div>
  );
}

/** A reference picture with the measured elements boxed where the bounds file puts them. */
function ShotPhone({ shot, screen, view, metric, navGo, go, setTip }: { shot: Shot; screen: string; view: ScreenView; metric: Metric; navGo: boolean; go: (s: string) => void; setTip: PhoneProps["setTip"] }) {
  const [bounds, setBounds] = useState<Bounds | null>(null);
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    loadBounds(shot.boundsUrl).then((b) => !cancelled && setBounds(b));
    return () => {
      cancelled = true;
    };
  }, [shot.boundsUrl]);
  // Through the panel's signed-in route (the store is private), handed to the <img> as an object URL.
  useEffect(() => {
    let cancelled = false;
    let made: string | null = null;
    loadImage(shot.imageUrl).then((u) => {
      if (cancelled) {
        if (u?.startsWith("blob:")) URL.revokeObjectURL(u);
        return;
      }
      if (u?.startsWith("blob:")) made = u;
      setSrc(u);
    });
    return () => {
      cancelled = true;
      if (made) URL.revokeObjectURL(made);
    };
  }, [shot.imageUrl]);
  const scale = bounds ? 360 / bounds.width : 1;
  return (
    <div className={cx("shot")}>
      {/* eslint-disable-next-line @next/next/no-img-element -- a remote picture of known size, not a page asset */}
      {src ? <img src={src} alt={`${sname(screen)} (${shot.state}, ${shot.theme})`} /> : null}
      {bounds?.rects.map((r, i) => {
        const st = view.elements.find((e) => e.elements.some((el) => sameElement(r.id, el, screen)));
        if (!st) return null;
        return (
          <div
            key={`${r.id}-${i}`}
            className={cx("shotBox")}
            style={{ left: r.x * scale, top: r.y * scale, width: r.w * scale, height: r.h * scale, "--heat": heatFor(st, metric) } as CSSProperties}
            onMouseEnter={(e) => setTip({ text: `${tapLabel(st.key)}: ${st.leadsTo ? `${pc(st.leadsToPct)} → ${sname(st.leadsTo)}` : "nayi screen nahi"}`, x: e.clientX, y: e.clientY })}
            onMouseLeave={() => setTip(null)}
            onClick={() => navGo && st.leadsTo && go(st.leadsTo)}
          >
            <span className={cx("bdg")}>
              <span className={cx("bn")}>{i + 1}</span>
              {badgeText(st, metric)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** A screen with no picture yet: its name, its real counts, and its tapped elements, each one tappable onward. */
function GenericFrame({ screen, view, navGo, go, setTip }: { screen: string; view: ScreenView; navGo: boolean; go: (s: string) => void; setTip: PhoneProps["setTip"] }) {
  const kd = kind(screen);
  const rows = view.elements.filter((e) => e.devices >= 3 && e.key !== OVERLAY_ID);
  return (
    <div className={cx("gen")}>
      {kd !== "screen" && <div className={cx("scrim")} />}
      <div className={cx("frame", kd !== "screen" && kd)}>
        <div className={cx("fhead")}>
          {kd === "sheet" && <div className={cx("grab")} />}
          <div className={cx("fname")}>{sname(screen)}</div>
          <div className={cx("fid")}>{screen} · {kd} · tasveer abhi nahi (placeholder)</div>
          <div className={cx("fk")}>
            <div><b>{fmt(view.headline.viewers)}</b>devices</div>
            <div><b>{fmt(view.headline.visits)}</b>visits</div>
            <div><b>{secs(view.headline.stay.median)}</b>median waqt</div>
          </div>
        </div>
        <div className={cx("flist")}>
          {rows.length === 0 && <div className={cx("ph")}>Is haalat mein koi tap nahi aaya.</div>}
          {rows.map((r) => (
            <button
              key={r.key}
              className={cx("gbtn", r.leadsTo && "go")}
              onMouseEnter={(e) => setTip({ text: r.leadsTo ? `${tapLabel(r.key)}: ${pc(r.leadsToPct)} → ${sname(r.leadsTo)}` : `${tapLabel(r.key)}: koi nayi screen nahi khulti`, x: e.clientX, y: e.clientY })}
              onMouseLeave={() => setTip(null)}
              onClick={() => navGo && r.leadsTo && go(r.leadsTo)}
            >
              <i className={cx("gheat")} style={{ width: `${Math.min(100, r.reachPct ?? 0)}%` }} />
              <span>
                {tapLabel(r.key)} · <b>{pc(r.reachPct)}</b>
              </span>
              <small>
                {r.leadsTo ? `→ ${sname(r.leadsTo)} (${pc(r.leadsToPct)})` : kd === "screen" ? "koi nayi screen nahi khulti" : "nayi screen nahi — sheet band ya isi par"}
                {(r.repeatPct ?? 0) >= 10 ? ` · dobara-tap ${pc(r.repeatPct)}` : ""}
              </small>
            </button>
          ))}
          <div className={cx("ph")}>Neela kinara = dabane par agli screen khulti hai.</div>
        </div>
      </div>
    </div>
  );
}

// ── Create Invoice: detail and element table ──

function covTag(c: ElementDef["cov"], short = false) {
  if (c === "ok") return <span className={cx("tag tOk")}>{short ? "poora" : "data poora"}</span>;
  if (c === "part") return <span className={cx("tag tPart")}>adhoora</span>;
  return <span className={cx("tag tNo")}>napa nahi</span>;
}

function CreateDetail({ sel, view, stats, overlay, measured }: { sel: string; view: ScreenView; stats: Record<string, ElementStat | null>; overlay: ElementStat | null; measured: (d: ElementDef) => boolean }) {
  const ov = view.overlay;
  if (sel === "overlay") {
    if (view.mode === "normal") {
      return (
        <div className={cx("card detail")}>
          <h3><span className={cx("num")}>T</span> Tour ka dhundla hissa</h3>
          <div className={cx("small muted")} style={{ marginTop: 6 }}>Is haalat mein tour nahi hota, is liye parda bhi nahi. {fmt(overlay?.taps ?? 0)} tap.</div>
        </div>
      );
    }
    return (
      <div className={cx("card detail")}>
        <div className={cx("row")} style={{ justifyContent: "space-between" }}>
          <h3><span className={cx("num")}>T</span> Tour ka dhundla hissa</h3>
          {covTag("ok")}
        </div>
        <div className={cx("ids")}>invoice_overlay_clicked · auto</div>
        <div className={cx("dgrid")}>
          <div><b>{pc(overlay?.reachPct)}</b><span>dekhne walon ne yahan tap kiya</span></div>
          <div><b>{fmt(overlay?.taps ?? 0)}</b><span>kul tap</span></div>
          <div><b>{pc(overlay?.repeatPct)}</b><span>2 s ke andar dobara</span></div>
          <div><b>{fmt(overlay?.rageDevices ?? 0)}</b><span>devices: 3 s mein 3+ tap</span></div>
        </div>
        <div className={cx("small muted")}>
          Pehli dafa screen dhundli ho jati hai aur sirf aik card roshan rehta hai. Dhundle hisse par tap kuch nahi karta. Qadam ke hisaab se:
          business {fmt(ov?.business)}, client {fmt(ov?.client)}, items {fmt(ov?.items)} tap. {fmt(ov?.bursts)} taps ki lehron mein se{" "}
          <b>{fmt(ov?.burstLeave)}</b> ke baad agla kaam screen se nikalna tha (10 s ke andar).
        </div>
      </div>
    );
  }
  const def = CREATE_ELEMENTS.find((e) => e.k === sel);
  if (!def) return null;
  const st = stats[def.k];
  const live = measured(def);
  const vis = def.st.length === 1 && def.st[0] === "full" ? "sirf mukammal haalat mein dikhta hai" : def.st.length === 1 ? "sirf khaali haalat mein" : "dono haalaton mein";
  return (
    <div className={cx("card detail")}>
      <div className={cx("row")} style={{ justifyContent: "space-between" }}>
        <h3><span className={cx("num")}>{def.n}</span> {def.label}</h3>
        {live ? covTag(def.cov === "no" ? "part" : def.cov) : covTag("no")}
      </div>
      <div className={cx("ids")}>{def.ev} · {def.ch === "auto" ? "auto tap" : def.ch === "coded" ? "coded event" : "—"} · {vis}</div>
      {!live ? (
        <div className={cx("slot")} style={{ marginTop: 10 }}>
          <b>Not measured yet</b> — needs <b>{def.needs}</b> (app ke naye release se).<br />
          {def.note}
        </div>
      ) : (
        <>
          <div className={cx("dgrid")}>
            <div><b>{pc(st?.reachPct)}</b><span>dekhne walon ne dabaya ({fmt(st?.devices ?? 0)})</span></div>
            <div><b>{pc(st?.reachCompletePct)}</b><span>item add karne walon mein</span></div>
            <div><b>{fixed2(st?.perViewer ?? 0)}</b><span>tap fi dekhne wala</span></div>
            <div><b>{pc(st?.repeatPct)}</b><span>2 s ke andar dobara · {fmt(st?.rageDevices ?? 0)} rage</span></div>
          </div>
          {st?.leadsTo && <div className={cx("small")}>Dabane par <b>{pc(st.leadsToPct)}</b> dafa → {sname(st.leadsTo)}.</div>}
          {def.cv && <div className={cx("small muted")}>Tap pahunchne ki jaanch (mockup, 14 din): jab ye cheez kuch kholti hai, to {def.cv} dafa kholne se pehle ye tap mila.</div>}
          {def.note && <div className={cx("small muted")} style={{ marginTop: 6 }}>{def.note}</div>}
        </>
      )}
    </div>
  );
}

function CreateTable({ sel, setSel, stats, overlay, measured }: { sel: string; setSel: (k: string) => void; stats: Record<string, ElementStat | null>; overlay: ElementStat | null; measured: (d: ElementDef) => boolean }) {
  const list = [
    ...CREATE_ELEMENTS.map((def) => ({ k: def.k, n: String(def.n), label: def.label, cov: def.cov, live: measured(def), st: stats[def.k] })),
    { k: "overlay", n: "T", label: "Tour ka dhundla hissa", cov: "ok" as const, live: true, st: overlay },
  ].sort((a, b) => (b.live && b.st ? b.st.reachPct ?? 0 : -1) - (a.live && a.st ? a.st.reachPct ?? 0 : -1));
  return (
    <div className={cx("card section")}>
      <h2>Har cheez par kitne logon ne tap kiya</h2>
      <div className={cx("scroll")}>
        <table className={cx("table clickRows")}>
          <thead>
            <tr><th>#</th><th>Cheez</th><th className={cx("n")}>% ne dabaya</th><th className={cx("n hideSm")}>Tap / dekhne wala</th><th className={cx("n hideSm")}>Dobara tap</th><th>Data</th></tr>
          </thead>
          <tbody>
            {list.map(({ k, n, label, cov, live, st }) => {
              const dead = !live || !st;
              return (
                <tr key={k} className={sel === k ? cx("sel") : undefined} onClick={() => setSel(k)}>
                  <td><span className={cx("num")}>{n}</span></td>
                  <td>
                    {label}
                    {!dead && <div className={cx("bar")}><i style={{ width: `${Math.min(100, st.reachPct ?? 0)}%` }} /></div>}
                  </td>
                  <td className={cx("n")}>{dead ? "—" : pc(st.reachPct)}</td>
                  <td className={cx("n hideSm")}>{dead ? "—" : fixed2(st.perViewer)}</td>
                  <td className={cx("n hideSm")}>{dead ? "—" : `${pc(st.repeatPct)}${st.rageDevices ? ` · ${fmt(st.rageDevices)}⚡` : ""}`}</td>
                  <td>{covTag(live ? (cov === "no" ? "part" : cov) : "no", true)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className={cx("note")}>
        &quot;% ne dabaya&quot; = is haalat mein screen dekhne wale devices mein se kitno ne kam az kam aik dafa dabaya. &quot;Dobara tap&quot; = pichhle tap
        ke 2 second ke andar usi cheez par phir tap (400 ms se tez wale app khud rok deti hai).
      </div>
    </div>
  );
}

// ── any other screen: its taps and where it leads ──

function GenericRight({ view, screen, node, go, onPoint }: { view: ScreenView; screen: string; node: string; go: (s: string) => void; onPoint: (p: NavPoint) => void }) {
  const h = view.headline;
  const navScreen = NAV.screens[node] ?? null;
  const pointOf = (key: string) => (navScreen ? navScreen.points.find((p) => measures(navScreen, p, key)) ?? null : null);
  return (
    <div>
      <div className={cx("card detail")}>
        <h3>{sname(screen)}</h3>
        <div className={cx("ids")}>{screen}</div>
        <div className={cx("dgrid")}>
          <div><b>{fmt(h.viewers)}</b><span>devices</span></div>
          <div><b>{fmt(h.visits)}</b><span>visits</span></div>
          <div><b>{secs(h.stay.median)}</b><span>median waqt</span></div>
          <div><b>{secs(h.stay.p75)}</b><span>p75 waqt</span></div>
        </div>
      </div>
      <div className={cx("card section")}>
        <h2>Taps (is haalat mein)</h2>
        <div className={cx("scroll")}>
          <table className={cx("table")}>
            <thead>
              <tr><th>Cheez</th><th className={cx("n")}>% ne dabaya</th><th className={cx("n hideSm")}>Tap / device</th><th className={cx("n hideSm")}>Dobara</th><th>Kahan le jata hai</th></tr>
            </thead>
            <tbody>
              {view.elements.length === 0 && (
                <tr><td colSpan={5} className={cx("muted")}>koi tap nahi</td></tr>
              )}
              {view.elements.map((r) => (
                <tr key={r.key}>
                  <td>
                    {tapLabel(r.key)}
                    <div className={cx("ids")}>{r.key}</div>
                    <div className={cx("bar")}><i style={{ width: `${Math.min(100, r.reachPct ?? 0)}%` }} /></div>
                  </td>
                  <td className={cx("n")}>{pc(r.reachPct)}</td>
                  <td className={cx("n hideSm")}>{fixed2(r.perViewer)}</td>
                  <td className={cx("n hideSm")}>{pc(r.repeatPct)}</td>
                  <td className={cx("small")}>
                    <LeadCell r={r} point={pointOf(r.key)} go={go} onPoint={onPoint} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className={cx("note")}>
          &quot;Kahan le jata hai&quot; = app ke code ka raasta (naqsha), aur us ke saath data: tap ke 2 second ke andar agli screen (Save 5 s, Watch ad
          120 s), kam az kam 50% dafa. Sheet band karna aur gallery/camera data mein koi screen nahi dikhate, is liye wahan sirf code ka raasta hai. {fmt(view.elementsTotal)} cheezen, sab se
          zyada dabayi gayi {view.elements.length} dikh rahi hain.
        </div>
      </div>
    </div>
  );
}

/** Where a measured tap leads: the code's destination, with the data's next screen beside it as evidence. */
function LeadCell({ r, point, go, onPoint }: { r: ElementStat; point: NavPoint | null; go: (s: string) => void; onPoint: (p: NavPoint) => void }) {
  const data = r.leadsTo ? `${sname(r.leadsTo)} ${pc(r.leadsToPct)}` : (r.next ?? [])[0] ? `${sname(r.next![0].screen)} ${pc(r.next![0].pct)}` : null;
  if (point && point.kind !== "stay") {
    return (
      <>
        <a className={cx("golink")} onClick={() => onPoint(point)}>{pointText(NAV, point)}</a>
        {data && <div className={cx("muted")}>data: → {data}</div>}
      </>
    );
  }
  if (r.leadsTo) return <a className={cx("golink")} onClick={() => go(r.leadsTo!)}>→ {sname(r.leadsTo)} {pc(r.leadsToPct)}</a>;
  if (point) return <span className={cx("muted")}>isi screen par: {point.stay}</span>;
  return <>—</>;
}

function NextScreens({ view, go }: { view: ScreenView; go: (s: string) => void }) {
  const total = view.exits.reduce((a, e) => a + e.visits, 0);
  // Ways of leaving that share a label (no signal, a restart with no background) are one row.
  const rows = new Map<string, { label: string; screen: string | null; visits: number }>();
  for (const e of view.exits) {
    const named = EXIT_GROUPS.some((g) => g.id !== "other" && g.match(e.kind));
    const label = named ? exitLabel(e.kind) : sname(e.kind);
    const row = rows.get(label) ?? { label, screen: named ? null : e.kind, visits: 0 };
    row.visits += e.visits;
    rows.set(label, row);
  }
  const list = [...rows.values()].sort((a, b) => b.visits - a.visits).slice(0, 10);
  return (
    <div className={cx("card")}>
      <h2>Yahan se agli screen</h2>
      <div className={cx("scroll")}>
        <table className={cx("table")}>
          <tbody>
            {list.map((r) => (
              <tr key={r.label}>
                <td>
                  {r.screen ? (
                    <a style={{ color: "var(--primary)", cursor: "pointer", fontWeight: 700 }} onClick={() => go(r.screen!)}>{r.label}</a>
                  ) : (
                    r.label
                  )}
                </td>
                <td className={cx("n")}>{pc(share(r.visits, total))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={cx("note")}>Har visit ka ant: agli screen, ya app chhor dena. Neeli screen par tap karke wahan ja sakte hain.</div>
    </div>
  );
}

// ── exits ──

function groupExits(list: Exit[], pick: (e: Exit) => number) {
  const out: Record<string, number> = Object.fromEntries(EXIT_GROUPS.map((g) => [g.id, 0]));
  for (const e of list) {
    const g = EXIT_GROUPS.find((x) => x.match(e.kind))!;
    out[g.id] += pick(e);
  }
  return out;
}

function ExitsCard({ view, isCreate, exitView, setExitView, mode }: { view: ScreenView; isCreate: boolean; exitView: "visits" | "lost"; setExitView: (v: "visits" | "lost") => void; mode: Mode }) {
  const lost = view.lost;
  const src = exitView === "lost" && lost ? lost.finalExits : view.exits;
  const g = groupExits(src, (e) => e.visits);
  const ad = groupExits(exitView === "visits" ? view.exits : [], (e) => e.afterAd30s);
  const clicked = groupExits(exitView === "visits" ? view.exits : [], (e) => e.adClicked30s);
  const anyClick = view.revenue.adClicks > 0;
  const tot = Object.values(g).reduce((a, b) => a + b, 0);
  return (
    <div className={cx("card")}>
      <h2>Log is screen se kaise nikle</h2>
      {isCreate && (
        <div className={cx("row")}>
          <Chip on={exitView === "visits"} onClick={() => setExitView("visits")}>Har visit ka ant</Chip>
          <Chip on={exitView === "lost"} onClick={() => setExitView("lost")}>Jinki invoice nahi bani — aakhri dafa</Chip>
        </div>
      )}
      <div className={cx("stack")}>
        {EXIT_GROUPS.filter((x) => g[x.id]).map((x) => (
          <span key={x.id} title={x.label} style={{ width: `${(100 * g[x.id]) / Math.max(1, tot)}%`, background: x.color }} />
        ))}
      </div>
      <div className={cx("scroll")}>
        <table className={cx("table")}>
          <thead>
            <tr><th>Kahan gaye</th><th className={cx("n")}>Ginti</th><th className={cx("n")}>%</th><th className={cx("n")}>Ad 30 s pehle</th><th className={cx("n hideSm")}>Ad dabaya</th></tr>
          </thead>
          <tbody>
            {EXIT_GROUPS.filter((x) => !(exitView === "lost" && x.id === "saved") && (isCreate || g[x.id] > 0)).map((x) => (
              <tr key={x.id}>
                <td className={cx("legend")}><i style={{ background: x.color }} />{x.label}</td>
                <td className={cx("n")}>{fmt(g[x.id])}</td>
                <td className={cx("n")}>{pc(share(g[x.id], tot))}</td>
                <td className={cx("n")}>{exitView === "visits" && x.id !== "saved" ? fmt(ad[x.id]) : "—"}</td>
                <td className={cx("n hideSm")}>{exitView === "visits" && anyClick ? fmt(clicked[x.id]) : "—"}</td>
              </tr>
            ))}
            <tr>
              <td className={cx("legend")}>Galti ka paigham (error_shown) wali visits</td>
              <td className={cx("n")} colSpan={4} style={{ textAlign: "right" }}>
                {view.flags.errorShown > 0 ? fmt(view.flags.errorShown) : <span className={cx("tag tPart")}>0 — 1.4.9 se</span>}
              </td>
            </tr>
            {isCreate && (
              <tr>
                <td className={cx("legend")}>Save par &quot;kuch kami hai&quot; (ci_save_validation_failed) — Save teeno cheezon se pehle dikhta hi nahi</td>
                <td className={cx("n")} colSpan={4} style={{ textAlign: "right" }}>
                  {fmt(view.flags.validationFailed)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className={cx("note")}>
        {exitView === "visits" ? (
          <>
            Kul {fmt(tot)} visits. &quot;Ad ke 30 s andar&quot; = nikalne se pehle 30 second mein koi ad dikha. Ye sirf saath hona hai, wajah nahi.{" "}
            {anyClick ? "\"Ad dabaya\" = nikalne se pehle 30 s mein ad par click (ad_clicked)." : "Ad par click ka event (ad_clicked) naye release se aayega; tab tak \"ad khola\" aur \"chala gaya\" alag nahi ho sakte."}
          </>
        ) : lost && mode === "tour" ? (
          <>
            {fmt(tot)} devices jinki tour wali visits mein invoice nahi bani — unka aakhri nikalna. Inmein se: kuch nahi kiya {fmt(lost.nothing)}, sirf
            business {fmt(lost.businessOnly)}, business+client {fmt(lost.businessClient)}, <b>teeno kaam ho chuke the {fmt(lost.allThree)}</b>.
          </>
        ) : (
          <>{fmt(tot)} devices jinki bina-tour visits mein invoice nahi bani — unka aakhri nikalna.</>
        )}
      </div>
    </div>
  );
}

// ── the money side: both sides, as a question ──

function BothSides({ view, isCreate, screen }: { view: ScreenView; isCreate: boolean; screen: string }) {
  const h = view.headline;
  const r = view.revenue;
  const adsTotal = r.appOpenMicros + r.interstitialMicros + r.bannerMicros;
  const leftAfterAd = view.exits.filter((e) => e.kind !== "saved_inv_scr").reduce((a, e) => a + e.afterAd30s, 0);
  return (
    <>
      {isCreate && (
        <>
          <h2 style={{ marginTop: 14 }}>Save ka darwaza (ad ya premium)</h2>
          <div className={cx("scroll")}>
          <table className={cx("table")}>
            <tbody>
              <tr><td>Save dabaya</td><td className={cx("n")}>{fmt(h.saveDevices)}</td><td className={cx("n")}>devices</td></tr>
              <tr><td>Dialog dikha (ad ya premium)</td><td className={cx("n")}>{fmt(h.gateDevices)}</td><td className={cx("n")} /></tr>
              <tr><td>&quot;Watch ad&quot; dabaya <span className={cx("small muted")}>(watch_ad_click)</span></td><td className={cx("n")}>{fmt(h.watchDevices)}</td><td className={cx("n")}>{pc(share(h.watchDevices, h.gateDevices))}</td></tr>
              <tr><td>Premium dabaya</td><td className={cx("n")}>{fmt(h.premiumDevices)}</td><td className={cx("n")}>{pc(share(h.premiumDevices, h.gateDevices))}</td></tr>
              <tr><td>Dialog band kiya (✕) — draft bach jata hai (decision 0032)</td><td className={cx("n")}>{fmt(h.dismissDevices)}</td><td className={cx("n")}>{pc(share(h.dismissDevices, h.gateDevices))}</td></tr>
              <tr><td><b>Save dabaya magar invoice nahi bani</b></td><td className={cx("n")}><b>{fmt(h.saveNoCreateDevices)}</b></td><td className={cx("n")}><b>{pc(share(h.saveNoCreateDevices, h.saveDevices))}</b></td></tr>
            </tbody>
          </table>
          </div>
        </>
      )}
      <div className={cx("two")} style={{ marginTop: 10, gap: 10 }}>
        <div className={cx("q small")} style={{ borderLeftColor: "var(--error)" }}>
          <b>Chhor kar jane wala palla</b>
          <br />
          {fmt(leftAfterAd)} visits ad dikhne ke 30 s andar khatam hui (invoice ke ilawa).
          {isCreate && <> {fmt(h.dismissOnlyDevices)} devices ne ad dekhe baghair dialog band kiya aur invoice nahi bani.</>}
          {screen === "premium_scr" && <> Is screen se nikalne ke raaste upar ki table mein.</>}
        </div>
        <div className={cx("q small")} style={{ borderLeftColor: "var(--success)" }}>
          <b>Kamai ka palla</b> (in visits ke dauran)
          <br />
          app-open {usd(r.appOpenMicros)} ({fmt(r.appOpenN)}) · interstitial {usd(r.interstitialMicros)} ({fmt(r.interstitialN)}) · banner {usd(r.bannerMicros)} ({fmt(r.bannerN)})
          <br />
          kul ads <b>{usd(adsTotal)}</b>
          {r.purchases > 0 && <> · premium khareeda {fmt(r.purchases)} dafa (raqam Users page par)</>}
          {r.adClicks > 0 && <> · ad par {fmt(r.adClicks)} click</>}
        </div>
      </div>
      <div className={cx("q small")}>
        <b>Sawal aap ke liye (tajweez nahi):</b> dono palle saath rakhe hain. Kya is darwaze ka hisaab alag se dekhna chahenge? Ad ya paywall ko kam
        karne ki koi tajweez yahan nahi.
      </div>
    </>
  );
}

// ── dead taps ──

function DeadTaps({ view, isCreate, mode, overlay }: { view: ScreenView; isCreate: boolean; mode: Mode; overlay: ElementStat | null }) {
  const cells = view.deadTaps;
  const max = Math.max(1, ...cells.map((c) => c.taps));
  const ov = view.overlay;
  return (
    <div className={cx("card")}>
      <h2>Khaali jagah par tap (dead taps)</h2>
      {isCreate && mode === "tour" && overlay && (
        <>
          <div className={cx("small")}>
            <b>Tour ke dauran:</b> {fmt(overlay.devices)} devices ({pc(overlay.reachPct)}) ne dhundle hisse par {fmt(overlay.taps)} tap kiye. {pc(overlay.repeatPct)}{" "}
            pichhle tap ke 2 s ke andar; {fmt(overlay.rageDevices)} devices ne 3 s mein 3+ tap kiye.
          </div>
          <div className={cx("dgrid")}>
            <div><b>{fmt(ov?.business)}</b><span>business qadam</span></div>
            <div><b>{fmt(ov?.client)}</b><span>client qadam</span></div>
            <div><b>{fmt(ov?.items)}</b><span>items qadam</span></div>
            <div><b>{fmt(ov?.burstLeave)}</b><span>lehar ke 10 s mein nikal gaye</span></div>
          </div>
        </>
      )}
      {cells.length > 0 ? (
        <>
          <div className={cx("small")}>
            <b>dead_tap</b> — jahan tap kisi button ne nahi liya, 6 × 12 ki jaali mein (kabhi tasveer ya likha hua nahi):
          </div>
          <DeadGrid cells={cells} max={max} />
          <div className={cx("small muted")}>
            Sab se garm: {cells.slice(0, 3).map((c) => `${c.cell} (${fmt(c.taps)} tap, ${fmt(c.devices)} devices)`).join(" · ")}
          </div>
        </>
      ) : (
        <div className={cx("slot")}>
          <b>Not measured yet</b> — needs <b>dead_tap</b> (app ke naye release se). Tab yahan jaali par garmi dikhegi — maslan <span className={cx("num")}>2</span> logo ka
          dabba.
        </div>
      )}
    </div>
  );
}

function DeadGrid({ cells, max }: { cells: ScreenView["deadTaps"]; max: number }) {
  const at = new Map<string, number>();
  for (const c of cells) {
    const rc = parseCell(c.cell);
    if (rc) at.set(`${rc.r}-${rc.c}`, (at.get(`${rc.r}-${rc.c}`) ?? 0) + c.taps);
  }
  return (
    <div className={cx("deadGrid")}>
      {Array.from({ length: GRID_ROWS * GRID_COLS }, (_, i) => {
        const v = at.get(`${Math.floor(i / GRID_COLS)}-${i % GRID_COLS}`) ?? 0;
        return <span key={i} style={{ background: v ? `rgba(240, 140, 20, ${0.15 + (0.75 * v) / max})` : undefined }}>{v ? fmt(v) : ""}</span>;
      })}
    </div>
  );
}

// ── why they leave ──

function Why({ view, mode, stats, overlay }: { view: ScreenView; mode: Mode; stats: Record<string, ElementStat | null>; overlay: ElementStat | null }) {
  const h = view.headline;
  const idle = view.idle;
  const comp = view.completeness;
  const idleExit = (ids: string[]) => (idle?.exits ?? []).filter((e) => ids.includes(e.kind)).reduce((a, e) => a + e.visits, 0);
  const items: ReactNode[] =
    mode === "tour"
      ? [
          <><b>Tour ke dhundle hisse par tap zaya na jaye.</b> <span className={cx("big")}>{fmt(overlay?.devices ?? 0)}</span> logon ({pc(overlay?.reachPct)}) ne wahan{" "}
            <span className={cx("big")}>{fmt(overlay?.taps ?? 0)}</span> tap kiye, {pc(overlay?.repeatPct)} dobara-tap the, aur {fmt(view.overlay?.burstLeave)} dafa aise taps ke 10 s ke andar
            user screen se nikal gaya. Tajweez: dhundle hisse par tap ho to roshan card halka sa hile aur hint dobara aaye.{" "}
            <span className={cx("muted")}>Dekhne wala number: dobara-tap {pc(overlay?.repeatPct)} neeche aaye.</span></>,
          <><b>{fmt(idle?.devices)} log tour mein aaye aur kuch nahi chhua.</b> Aam taur par {secs(idle?.duration.median)} (p75 {secs(idle?.duration.p75)}) rahe;{" "}
            {fmt(idleExit(["close:back_press"]))} back se gaye, {fmt(idleExit(["background_never_back", "background_long"]))} app chhor kar wapas nahi aaye,{" "}
            {fmt(idleExit(["close:close_button"]))} ne ✕ dabaya. Tajweez: pehla kaam chhota ho — business ka sirf naam, card ke andar hi likhna shuru ho.{" "}
            <span className={cx("muted")}>Dekhne wala number: business card {pc(stats.business?.reachPct)} → upar.</span></>,
          <><b>{fmt(comp?.completeNoSave)} logon ke paas business, client aur item teeno the, phir bhi Save nahi dabaya</b> ({fmt(comp?.completeNoSavePreviewed)} ne Preview
            dekha). Tajweez: teeno poore hote hi Save tak khud scroll ho aur Preview screen par bhi Save ho.{" "}
            <span className={cx("muted")}>Dekhne wala number: item walon mein Save {pc(stats.save?.reachCompletePct)} → upar.</span></>,
        ]
      : [
          <><b>Purane user aksar khol kar foran band karte hain.</b> {fmt(idle?.devices)} ne kuch nahi chhua (median {secs(idle?.duration.median)}, p75{" "}
            {secs(idle?.duration.p75)}); ✕ {pc(stats.close?.reachPct)} ne dabaya. Tajweez: pehle ye naapein ke wo yahan kyun aaye — dashboard ka kaunsa button unhein laaya.{" "}
            <span className={cx("muted")}>Dekhne wala number: {fmt(idle?.devices)} neeche.</span></>,
          <><b>Preview zyada, Save kam.</b> {pc(stats.preview?.reachPct)} ne Preview dabaya; {fmt(comp?.completeNoSave)} ne item daala magar Save nahi dabaya, jin mein{" "}
            {fmt(comp?.completeNoSavePreviewed)} ne Preview dekha. Tajweez: Preview screen par hi Save.{" "}
            <span className={cx("muted")}>Dekhne wala number: item walon mein Save {pc(stats.save?.reachCompletePct)} → upar.</span></>,
          <><b>Currency aur item line par dobara tap.</b> Currency {pc(stats.currency?.repeatPct)} dobara-tap ({fmt(stats.currency?.rageDevices ?? 0)} rage), item line{" "}
            {pc(stats.itemrow?.repeatPct)}. Tajweez: currency ke lock (🔒) par tap ho to wajah likh kar batayein.{" "}
            <span className={cx("muted")}>Dekhne wala number: currency dobara-tap {pc(stats.currency?.repeatPct)} neeche.</span></>,
        ];
  return (
    <div className={cx("card why")}>
      <h2>Log kyun chhor jate hain — 3 tajweezein</h2>
      <ol style={{ paddingLeft: 18, margin: 0 }}>
        {items.map((t, i) => (
          <li key={i}>{t}</li>
        ))}
      </ol>
      <div className={cx("q small")}>
        <b>Sawal aap ke liye (tajweez nahi):</b> {fmt(h.saveDevices)} ne Save dabaya, {fmt(h.saveNoCreateDevices)} ({pc(share(h.saveNoCreateDevices, h.saveDevices))}) ki
        invoice nahi bani; {fmt(h.dismissOnlyDevices)} ne ad dekhe baghair dialog band kiya. Doosri taraf in visits ki kamai{" "}
        {usd(view.revenue.appOpenMicros + view.revenue.interstitialMicros + view.revenue.bannerMicros)}. Kya Save ke darwaze ka ye hisaab alag se dekhna chahenge?
      </div>
      <div className={cx("note")}>Numbers upar chune hue filter ke hain. Har tajweez ke saath wo number hai jise dekh kar pata chalega ke kaam hua ya nahi.</div>
    </div>
  );
}

// ── the tour holdout ──

function HoldoutCard({ holdout }: { holdout: Holdout | null }) {
  if (!holdout) return null;
  const on = holdout.arms.find((a) => a.variant === "on");
  const off = holdout.arms.find((a) => a.variant === "off");
  const label = (m: string) => (m === "created" ? "Invoice bani" : "G1: share ya payment (24 ghante mein)");
  return (
    <div className={cx("card section")}>
      <h2>Tour ka A/B — 20% naye users ko tour nahi (holdout)</h2>
      {!on && !off ? (
        <div className={cx("slot")}>
          <b>Abhi koi data nahi</b> — app ka naya release <b>overlay_variant</b> (on / off) bhejega; tab yahan dono guroh ke naye users gine jayenge.
        </div>
      ) : (
        <div className={cx("scroll")}>
          <table className={cx("table")}>
            <thead>
              <tr><th>Guroh</th><th className={cx("n")}>Naye devices</th><th className={cx("n")}>Invoice bani</th><th className={cx("n")}>G1</th></tr>
            </thead>
            <tbody>
              {[on, off].filter(Boolean).map((a) => (
                <tr key={a!.variant}>
                  <td>{a!.variant === "on" ? "Tour ke saath (on)" : "Bina tour (off, holdout)"}</td>
                  <td className={cx("n")}>{fmt(a!.devices)}</td>
                  <td className={cx("n")}>{fmt(a!.created)} · {pc(a!.createdPct)}</td>
                  <td className={cx("n")}>{fmt(a!.g1)} · {pc(a!.g1Pct)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className={cx("scroll")}>
      <table className={cx("table")} style={{ marginTop: 8 }}>
        <tbody>
          {holdout.comparisons.map((c) => (
            <tr key={c.metric}>
              <td>{label(c.metric)}</td>
              <td className={cx("n")}>{c.diffPts == null ? "—" : `${c.diffPts > 0 ? "+" : ""}${c.diffPts.toFixed(1)} pts (z ${c.z?.toFixed(2)})`}</td>
              <td className={cx("n")}>
                <span className={cx("tag", c.significant ? "tOk" : "tPart")}>{c.significant ? (c.verdict === "tour ahead" ? "tour aage" : "bina tour aage") : "abhi kaafi data nahi"}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      <div className={cx("note")}>
        {holdout.from} – {holdout.to} (30 din). Faisla tab tak nahi jab tak har guroh mein kam az kam {fmt(holdout.minPerArm)} naye devices na hon aur farq
        itna bara na ho ke ittefaq na lage (95%). Ye sawal hai, faisla aap ka.
      </div>
    </div>
  );
}

// ── what the page has and has not got ──

function CoverageCard({ view, shots }: { view: ScreenView; shots: Shot[] }) {
  const signal = view.modeSources.screen_mode ?? 0;
  const rows: [string, string, "ok" | "part" | "no"][] = [
    ["1. Saaf tasveer (light + dark)", shots.length ? `${shots.length} tasveerein screenshot pipeline se` : "Abhi nahi — screenshot pipeline (Roborazzi) ka manifest aane par khud dikhegi", shots.length ? "ok" : "no"],
    ["2. Har button ki jagah", shots.length ? "bounds JSON se (testTag = event id)" : "Tasveer ke saath aayegi", shots.length ? "part" : "no"],
    ["3. Kitno ne dabaya, tap fi user, dobara tap", "Auto taps; Save aur Watch-ad coded event se", "part"],
    ["4. Nikalna — agli screen, back/✕, background, band, crash", "screen_view, invoice_screen_close(method), app_background, app_cold_start", "ok"],
    ["4. …error ke baad / ad click ke baad", view.revenue.adClicks > 0 ? "error_shown; ad_clicked aa raha hai" : "error_shown sirf 1.4.9; ad_clicked naye release se", view.revenue.adClicks > 0 ? "ok" : "part"],
    ["5. Waqt (median / p75)", "Visit ke shuru aur ant se", "ok"],
    ["6. Khaali jagah par tap", view.deadTaps.length ? "dead_tap aa raha hai" : "Sirf tour ke parde par; dead_tap naye release se", view.deadTaps.length ? "ok" : "part"],
    ["7. Haalat (tour / bina tour)", signal ? `screen_mode ${fmt(signal)} visits mein` : "History se andaaza; screen_mode naye release se", signal ? "ok" : "part"],
    ["8. Filter: version, platform, Meta/organic, mulk, naya/purana, din", "Event par; device_journey.meta_shaped; open_count", "ok"],
  ];
  return (
    <div className={cx("card section")}>
      <h2>Is page ka data — kya maujood hai, kya nahi</h2>
      <div className={cx("scroll")}>
        <table className={cx("table")}>
          <thead><tr><th>Hissa</th><th>Kahan se aata hai</th><th>Haal</th></tr></thead>
          <tbody>
            {rows.map(([a, b, c]) => (
              <tr key={a}>
                <td><b>{a}</b></td>
                <td className={cx("small")}>{b}</td>
                <td>{c === "ok" ? <span className={cx("tag tOk")}>maujood</span> : c === "part" ? <span className={cx("tag tPart")}>adhoora</span> : <span className={cx("tag tNo")}>nahi</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
