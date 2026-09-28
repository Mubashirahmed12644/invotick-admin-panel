"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { cx } from "../cx";
import { sname, tapLabel } from "../catalog";
import { fmt, pc } from "../format";
import { loadBoundsRaw, loadImage, readControls, type Control, type Shot } from "../manifest";
import { dests, isNav, measures, pointForControl, type Dest, type NavMap, type NavPoint, type NavScreen } from "../navmap";
import type { ElementStat, ScreenView } from "../types";
import { heatFor, type Metric } from "./CreatePhone";

/** A node's plain name: the map's own label, else the screen's. `off:<name>` is a screen with no picture. */
export function nodeName(nav: NavMap, node: string): string {
  const s = nav.screens[node];
  if (s?.label) return s.label;
  return sname(node.replace(/^off:/, ""));
}

// ── what the data says about a point ──

export interface PointStat {
  devices: number;
  reachPct: number | null;
  taps: number;
  /** Next screens that followed, with their share of the point's taps. */
  next: { screen: string; taps: number; pct: number | null }[];
  keys: string[];
}

export function pointStat(screen: NavScreen, p: NavPoint, view: ScreenView | null): PointStat | null {
  if (!view) return null;
  const els = view.elements.filter((e) => measures(screen, p, e.key));
  if (!els.length) return null;
  const taps = els.reduce((a, e) => a + e.taps, 0);
  const next = new Map<string, number>();
  for (const e of els) {
    const list = e.next?.length ? e.next : e.leadsTo ? [{ screen: e.leadsTo, taps: Math.round(((e.leadsToPct ?? 0) * e.taps) / 100), pct: e.leadsToPct }] : [];
    for (const n of list) next.set(n.screen, (next.get(n.screen) ?? 0) + n.taps);
  }
  return {
    devices: Math.max(...els.map((e) => e.devices)),
    reachPct: Math.max(...els.map((e) => e.reachPct ?? 0)),
    taps,
    next: [...next.entries()].map(([s, n]) => ({ screen: s, taps: n, pct: taps > 0 ? (100 * n) / taps : null })).sort((a, b) => b.taps - a.taps),
    keys: els.map((e) => e.key),
  };
}

/** The close of a sheet split by how it was done, from the `*_close#method` elements. */
export function closeSplit(view: ScreenView | null): { id: string; parts: { method: string; taps: number }[]; total: number } | null {
  if (!view) return null;
  const byId = new Map<string, Map<string, number>>();
  for (const e of view.elements) {
    const [base, method] = e.key.split("#");
    if (!/_close$/.test(base)) continue;
    const m = byId.get(base) ?? new Map<string, number>();
    m.set(method ?? "unknown", (m.get(method ?? "unknown") ?? 0) + e.taps);
    byId.set(base, m);
  }
  const best = [...byId.entries()].sort((a, b) => sum(b[1]) - sum(a[1]))[0];
  if (!best) return null;
  const parts = [...best[1].entries()].map(([method, taps]) => ({ method, taps })).sort((a, b) => b.taps - a.taps);
  return { id: best[0], parts, total: sum(best[1]) };
}

const sum = (m: Map<string, number>) => [...m.values()].reduce((a, b) => a + b, 0);

export const METHOD_NAMES: Record<string, string> = {
  close_button: "✕ dabaya",
  swipe: "neeche kheencha (swipe)",
  scrim_or_back: "bahar tap ya phone ka back",
  back_press: "phone ka back",
  discard_confirmed: "Discard",
  unknown: "tareeqa nahi bataya (purana data)",
};

// ── how a destination reads ──

const KIND_ICON: Record<string, string> = { forward: "→", backward: "←", outside: "↗", conditional: "⑂", auto: "⏵", stay: "·" };
export const KIND_NAME: Record<string, string> = {
  forward: "aage",
  backward: "wapas",
  outside: "app se bahar",
  conditional: "shart ke saath",
  auto: "khud aage",
  stay: "isi screen par",
};

export function destText(nav: NavMap, d: Dest): string {
  if (d.kind === "outside") return `App se bahar: ${d.outside}${d.returnsTo ? ` — wapas aa kar ${nodeName(nav, d.returnsTo)}` : ""}`;
  if (d.kind === "stay") return "isi screen par rehta hai";
  return `${d.back ? "← " : "→ "}${nodeName(nav, d.to!)}${d.toState ? ` (${d.toState})` : ""}`;
}

export function pointText(nav: NavMap, p: NavPoint): string {
  if (p.kind === "stay") return `Isi screen par: ${p.stay ?? ""}`;
  return dests(p)
    .map((d) => `${d.when ? `${d.when}: ` : ""}${destText(nav, d)}`)
    .join(" · ");
}

// ── the phone: the picture, its controls as hotspots, and the phone's own back ──

interface PhoneProps {
  nav: NavMap;
  node: string;
  screen: NavScreen;
  shot: Shot;
  view: ScreenView | null;
  metric: Metric;
  selected: string | null;
  onPoint: (p: NavPoint) => void;
  setTip: (t: { text: string; x: number; y: number } | null) => void;
}

export function NavPhone({ nav, node, screen, shot, view, metric, selected, onPoint, setTip }: PhoneProps) {
  const [ctl, setCtl] = useState<{ url: string; width: number; controls: Control[] } | null>(null);
  const [img, setImg] = useState<{ url: string; src: string | null } | null>(null);
  useEffect(() => {
    let cancelled = false;
    loadBoundsRaw(shot.boundsUrl).then((raw) => {
      if (cancelled) return;
      const c = readControls(raw);
      setCtl(c ? { url: shot.boundsUrl ?? "", width: c.width, controls: c.controls } : null);
    });
    return () => {
      cancelled = true;
    };
  }, [shot.boundsUrl]);
  useEffect(() => {
    let cancelled = false;
    let made: string | null = null;
    loadImage(shot.imageUrl).then((u) => {
      if (cancelled) {
        if (u?.startsWith("blob:")) URL.revokeObjectURL(u);
        return;
      }
      if (u?.startsWith("blob:")) made = u;
      setImg({ url: shot.imageUrl, src: u });
    });
    return () => {
      cancelled = true;
      if (made) URL.revokeObjectURL(made);
    };
  }, [shot.imageUrl]);

  const scale = ctl ? 360 / ctl.width : 0.5;
  // Biggest first, so a small button sits above the scrim behind it.
  const drawn = useMemo(
    () =>
      (ctl && ctl.url === (shot.boundsUrl ?? "") ? ctl.controls : [])
        .map((c) => ({ c, p: pointForControl(screen, c.key) }))
        .sort((a, b) => b.c.w * b.c.h - a.c.w * a.c.h),
    [ctl, shot.boundsUrl, screen],
  );
  const sysBack = screen.points.find((p) => p.match === "@system_back");
  const auto = screen.points.find((p) => p.match === "@auto");
  const hidden = screen.points.filter((p) => p.match.startsWith("@") && p.match !== "@system_back" && p.match !== "@auto");
  const src = img?.url === shot.imageUrl ? img.src : null;

  return (
    <>
      <div className={cx("shot")}>
        {/* eslint-disable-next-line @next/next/no-img-element -- a remote picture of known size, not a page asset */}
        {src ? <img src={src} alt={`${nodeName(nav, node)} (${shot.state}, ${shot.theme})`} /> : <div style={{ height: 780 }} />}
        {drawn.map(({ c, p }, i) => {
          const full = c.w * scale >= 350 && c.h * scale >= 700;
          const st = p ? pointStat(screen, p, view) : null;
          const statLike = st ? ({ reachPct: st.reachPct, perViewer: null, repeatPct: null } as unknown as ElementStat) : null;
          const k = p?.kind ?? "none";
          return (
            <button
              type="button"
              key={`${c.key}-${i}`}
              className={cx("hs", `hs-${k}`, full && "hsFull", p && selected === p.match && "hsSel")}
              style={{ left: c.x * scale, top: c.y * scale, width: c.w * scale, height: c.h * scale, "--heat": st && metric === "reach" ? heatFor(statLike, "reach") : 0 } as CSSProperties}
              aria-label={p ? `${p.label}: ${pointText(nav, p)}` : c.label || c.key}
              onMouseEnter={(e) => setTip({ text: p ? `${p.label} — ${pointText(nav, p)}${st ? ` · data: ${pc(st.reachPct)} ne dabaya` : ""}` : `${c.label || c.key}: naqshe mein nahi`, x: e.clientX, y: e.clientY })}
              onMouseMove={(e) => setTip({ text: p ? `${p.label} — ${pointText(nav, p)}${st ? ` · data: ${pc(st.reachPct)} ne dabaya` : ""}` : `${c.label || c.key}: naqshe mein nahi`, x: e.clientX, y: e.clientY })}
              onMouseLeave={() => setTip(null)}
              onClick={(e) => {
                e.stopPropagation();
                setTip(null);
                if (p) onPoint(p);
              }}
            >
              {!full && p && isNav(p) && (
                <span className={cx("bdg")}>
                  <span className={cx("bn")}>{KIND_ICON[p.kind]}</span>
                  {st ? pc(st.reachPct) : ""}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <SystemBar nav={nav} sysBack={sysBack} auto={auto} onPoint={onPoint} />
      {hidden.length > 0 && (
        <div className={cx("sysbar")}>
          {hidden.map((p) => (
            <button key={p.match} type="button" className={cx("sysbtn")} title={pointText(nav, p)} onClick={() => onPoint(p)}>
              {KIND_ICON[p.kind]} {p.label} <small>tasveer mein nahi dikhta · {pointText(nav, p)}</small>
            </button>
          ))}
        </div>
      )}
    </>
  );
}

/** Under the picture: the phone's own back, and a screen that moves on by itself. */
function SystemBar({ nav, sysBack, auto, onPoint }: { nav: NavMap; sysBack?: NavPoint; auto?: NavPoint; onPoint: (p: NavPoint) => void }) {
  if (!sysBack && !auto) return null;
  return (
    <div className={cx("sysbar")}>
      {sysBack && (
        <button type="button" className={cx("sysbtn")} title={pointText(nav, sysBack)} onClick={() => onPoint(sysBack)}>
          ◁ Phone ka back <small>{pointText(nav, sysBack)}</small>
        </button>
      )}
      {auto && (
        <button type="button" className={cx("sysbtn")} title={pointText(nav, auto)} onClick={() => onPoint(auto)}>
          ⏵ Khud aage <small>{pointText(nav, auto)}</small>
        </button>
      )}
    </div>
  );
}

/** A screen with no picture: its navigation points as buttons, so the walk never stops at a screen we have not drawn. */
export function NavFrame({ nav, node, screen, view, onPoint, dark }: { nav: NavMap; node: string; screen: NavScreen; view: ScreenView | null; onPoint: (p: NavPoint) => void; dark: boolean }) {
  const sysBack = screen.points.find((p) => p.match === "@system_back");
  const auto = screen.points.find((p) => p.match === "@auto");
  const kd = screen.kind;
  return (
    <>
      <div className={cx("screen", dark && "dark")}>
        <div className={cx("gen")}>
          {kd !== "screen" && <div className={cx("scrim")} />}
          <div className={cx("frame", kd !== "screen" && kd)}>
            <div className={cx("fhead")}>
              {kd === "sheet" && <div className={cx("grab")} />}
              <div className={cx("fname")}>{nodeName(nav, node)}</div>
              <div className={cx("fid")}>
                {screen.dataScreen ?? "screen_view nahi"} · {kd} · is ki tasveer pipeline mein nahi
              </div>
            </div>
            <div className={cx("flist")}>
              {screen.points
                .filter((p) => !p.match.startsWith("@system_back") && p.match !== "@auto")
                .map((p) => {
                  const st = pointStat(screen, p, view);
                  return (
                    <button key={p.match} type="button" className={cx("gbtn", isNav(p) && "go")} onClick={() => onPoint(p)}>
                      <span>
                        {KIND_ICON[p.kind]} {p.label}
                        {st ? <> · <b>{pc(st.reachPct)}</b></> : null}
                      </span>
                      <small>{pointText(nav, p)}</small>
                    </button>
                  );
                })}
              <div className={cx("ph")}>Ye screen app mein hai magar screenshot pipeline ne abhi is ki tasveer nahi banayi.</div>
            </div>
          </div>
        </div>
      </div>
      <SystemBar nav={nav} sysBack={sysBack} auto={auto} onPoint={onPoint} />
    </>
  );
}

// ── what a tap on an outside or conditional point shows ──

export function PointChoice({ nav, point, onGo, onClose }: { nav: NavMap; point: NavPoint; onGo: (to: string, toState?: string, back?: boolean) => void; onClose: () => void }) {
  const ds = point.kind === "stay" ? [] : dests(point);
  return (
    <div className={cx("choice")} role="dialog" aria-label={point.label}>
      <div className={cx("row")} style={{ justifyContent: "space-between" }}>
        <b>
          {KIND_ICON[point.kind]} {point.label}
        </b>
        <button type="button" className={cx("chip chipSm")} onClick={onClose} aria-label="Band karein">
          ✕
        </button>
      </div>
      {point.kind === "stay" && <div className={cx("small")}>Isi screen par rehta hai: {point.stay}</div>}
      {ds.map((d, i) => (
        <div key={i} className={cx("small")} style={{ marginTop: 6 }}>
          {d.when && <span className={cx("muted")}>{d.when}: </span>}
          {d.kind === "screen" && d.to ? (
            <a className={cx("golink")} onClick={() => onGo(d.to!, d.toState, d.back)}>
              {destText(nav, d)}
            </a>
          ) : d.kind === "outside" ? (
            <>
              <span className={cx("tag tPart")}>App se bahar: {d.outside}</span>
              {d.returnsTo && (
                <>
                  {" "}
                  wapas aa kar{" "}
                  <a className={cx("golink")} onClick={() => onGo(d.returnsTo!)}>
                    {nodeName(nav, d.returnsTo)} →
                  </a>
                </>
              )}
            </>
          ) : (
            destText(nav, d)
          )}
        </div>
      ))}
      {point.source && <div className={cx("ids")} style={{ marginTop: 6 }}>{point.source}</div>}
    </div>
  );
}

// ── the list of a screen's ways in and out ──

export function NavCard({
  nav,
  screen,
  view,
  selected,
  onPoint,
  onGo,
}: {
  nav: NavMap;
  node: string;
  screen: NavScreen;
  view: ScreenView | null;
  selected: string | null;
  onPoint: (p: NavPoint) => void;
  onGo: (to: string, toState?: string, back?: boolean) => void;
}) {
  const [showStay, setShowStay] = useState(false);
  const navPoints = screen.points.filter(isNav);
  const stay = screen.points.filter((p) => !isNav(p));
  const split = closeSplit(view);
  const unmapped = view
    ? view.elements.filter((e) => e.devices >= 3 && !screen.points.some((p) => measures(screen, p, e.key)) && !/^(dead_tap|ad_clicked|invoice_overlay_clicked)/.test(e.key))
    : [];
  const rows = showStay ? [...navPoints, ...stay] : navPoints;
  return (
    <div className={cx("card section")}>
      <h2>
        Is screen ke raaste — {navPoints.length} {navPoints.length === 1 ? "raasta" : "raaste"}
      </h2>
      <div className={cx("scroll")}>
        <table className={cx("table clickRows")}>
          <thead>
            <tr>
              <th>Cheez</th>
              <th>Kahan le jata hai (app ka code)</th>
              <th className={cx("hideSm")}>Data (is haalat mein)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const st = pointStat(screen, p, view);
              const ds = isNav(p) ? dests(p) : [];
              return (
                <tr key={p.match} className={selected === p.match ? cx("sel") : undefined} onClick={() => onPoint(p)}>
                  <td>
                    <span className={cx("kind", `k-${p.kind}`)}>{KIND_NAME[p.kind]}</span> {p.label}
                    <div className={cx("ids")}>{p.match.startsWith("@") ? (p.match === "@system_back" ? "phone ka back" : "khud") : p.match.startsWith("re:") ? "har line" : tapLabel(p.match)}</div>
                  </td>
                  <td className={cx("small")}>
                    {p.kind === "stay"
                      ? p.stay
                      : ds.map((d, i) => (
                          <div key={i}>
                            {d.when && <span className={cx("muted")}>{d.when}: </span>}
                            {d.kind === "screen" && d.to ? (
                              <a
                                className={cx("golink")}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onGo(d.to!, d.toState, d.back);
                                }}
                              >
                                {destText(nav, d)}
                              </a>
                            ) : d.kind === "outside" ? (
                              <>
                                <span className={cx("tag tPart")}>App se bahar: {d.outside}</span>
                                {d.returnsTo && (
                                  <>
                                    {" "}
                                    →{" "}
                                    <a
                                      className={cx("golink")}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onGo(d.returnsTo!);
                                      }}
                                    >
                                      wapsi: {nodeName(nav, d.returnsTo)}
                                    </a>
                                  </>
                                )}
                              </>
                            ) : (
                              destText(nav, d)
                            )}
                          </div>
                        ))}
                  </td>
                  <td className={cx("small hideSm")}>
                    {st ? (
                      <>
                        <b>{pc(st.reachPct)}</b> ne dabaya ({fmt(st.devices)}) · {fmt(st.taps)} tap
                        {p.kind === "backward" || p.kind === "outside" ? (
                          <div className={cx("muted")}>
                            {fmt(st.next.reduce((a, n) => a + n.taps, 0))} ke baad 2 s mein koi screen_view aaya — {p.kind === "backward" ? "sheet/screen band hone par neeche wali screen dobara nahi bolti" : "app se bahar ka safar screen_view nahi bhejta"}, is liye raasta code se
                          </div>
                        ) : (
                          st.next.slice(0, 3).map((n) => (
                            <div key={n.screen} className={cx("muted")}>
                              → {nodeName(nav, n.screen)} {pc(n.pct)}
                            </div>
                          ))
                        )}
                        {st.next.length === 0 && (p.kind === "forward" || p.kind === "conditional") && <div className={cx("muted")}>2 s mein koi screen nahi</div>}
                      </>
                    ) : (
                      <span className={cx("muted")}>{p.match.startsWith("label:") || p.match.startsWith("nolabel@") ? "is ka apna event nahi" : "—"}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {split && split.parts.some((x) => x.method !== "unknown") && (
        <div className={cx("small")} style={{ marginTop: 8 }}>
          <b>Band kaise kiya</b> ({split.id}):{" "}
          {split.parts.map((x) => `${METHOD_NAMES[x.method] ?? x.method} ${pc((100 * x.taps) / Math.max(1, split.total))}`).join(" · ")}
        </div>
      )}
      <div className={cx("row")} style={{ marginTop: 8 }}>
        <button type="button" className={cx("chip chipSm")} aria-pressed={showStay} onClick={() => setShowStay(!showStay)}>
          Isi screen wali cheezen bhi ({stay.length})
        </button>
      </div>
      <div className={cx("note")}>
        Raasta app ke code se (VC_113_VN_149) — data sirf gawahi hai. Sheet band hone par neeche wali screen dobara &quot;screen_view&quot; nahi bhejti, aur
        gallery/camera app se bahar hain, is liye in ka data wala &quot;kahan gaya&quot; khaali rehta hai; code ka raasta phir bhi yahan hai.
        {unmapped.length > 0 && <> Data mein {unmapped.length} aisi cheezen bhi hain jo is tasveer mein nahi: {unmapped.slice(0, 4).map((e) => tapLabel(e.key)).join(", ")}.</>}
      </div>
    </div>
  );
}
