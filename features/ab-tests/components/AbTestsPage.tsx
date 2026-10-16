"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import ErrorState from "@/components/ErrorState";
import EmptyState from "@/components/EmptyState";
import { getErrorMessage, isUnauthorizedError } from "@/lib/api";
import { clearAccessToken } from "@/lib/auth";
import { abTestsApi, unavailableReason } from "../api";
import type { AbTestsResponse, Unavailable, WindowChoice } from "../types";
import { HOW_COUNTED, WIN_CHIPS, age, day, dayTime, fmt, remoteUnknownLine, tileCounts, unavailableText, type Win } from "../words";
import Card from "./Visuals";
import TipLayer from "./Tip";
import { Icon, cx, type IconName } from "./shared";

/** The range the numbers are taken from (what the backend is asked); the 24 ghante / 7 din chips are separate. */
const RANGES: { w: WindowChoice; label: string }[] = [
  { w: "since", label: "Test shuru se" },
  { w: 7, label: "Pichhle 7 din" },
  { w: 14, label: "Pichhle 14 din" },
  { w: 30, label: "Pichhle 30 din" },
];

/** "Hisaab ho raha hai" is asked again after the 15 s the server asked for, a few times, then the button takes over. */
const AUTO_RETRIES = 3;

type Load =
  | { rk: string; kind: "ok"; data: AbTestsResponse }
  | { rk: string; kind: "unavailable"; reason: Unavailable }
  | { rk: string; kind: "error"; message: string };

/**
 * The A/B Tests page (decision 0222): every A/B and holdout test the app runs, drawn. Read only.
 * One request per range; the 24 ghante / 7 din chips only choose which reading of the same answer every picture uses.
 */
export default function AbTestsPage() {
  const router = useRouter();
  const platform = "Android";
  const [range, setRange] = useState<WindowChoice>("since");
  const [win, setWin] = useState<Win>("24h");
  const [attempt, setAttempt] = useState(0);
  const [load, setLoad] = useState<Load | null>(null);
  const rk = `${platform}|${range}`;
  const rootRef = useRef<HTMLDivElement>(null);

  const onFail = useCallback(
    (e: unknown): boolean => {
      if (isUnauthorizedError(e)) {
        clearAccessToken({ sessionExpired: true });
        router.replace("/login");
        return true;
      }
      return false;
    },
    [router],
  );

  useEffect(() => {
    let cancelled = false;
    abTestsApi
      .get(platform, range)
      .then((data) => !cancelled && setLoad({ rk, kind: "ok", data }))
      .catch((e) => {
        if (cancelled || onFail(e)) return;
        const reason = unavailableReason(e);
        setLoad(
          reason ? { rk, kind: "unavailable", reason } : { rk, kind: "error", message: getErrorMessage(e, "A/B Tests load nahi hua.") },
        );
      });
    return () => {
      cancelled = true;
    };
  }, [rk, range, attempt, onFail]);

  const current = load?.rk === rk ? load : null;
  const computing = current?.kind === "unavailable" && current.reason === "computing" && attempt < AUTO_RETRIES;
  useEffect(() => {
    if (!computing) return;
    const t = window.setTimeout(() => setAttempt((a) => a + 1), 15_000);
    return () => window.clearTimeout(t);
  }, [computing, attempt]);

  /** Ask again. From an error the page goes back to its skeleton; with data on screen (stale) the data stays until the new answer. */
  const retry = () => {
    if (current?.kind !== "ok") setLoad(null);
    setAttempt((a) => a + 1);
  };
  const pickRange = (w: WindowChoice) => {
    setRange(w);
    setAttempt(0);
  };

  const data = current?.kind === "ok" ? current.data : null;

  return (
    <main className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Navbar title="A/B Tests" />
        <section className="content-wrap">
          <div className={cx("root")} ref={rootRef}>
            <header className={cx("top")}>
              <h1>A/B Tests</h1>
              <Meta data={data} />
            </header>

            <div className={cx("filters")} role="toolbar" aria-label="Filters">
              <div className={cx("fgrp")} role="group" aria-label="Platform">
                <button type="button" className={cx("chip")} aria-pressed="true">
                  <Icon name="phone" />
                  Android
                </button>
                <button type="button" className={cx("chip")} disabled aria-pressed="false" title="Abhi kisi test mein iOS ke asli phones nahi">
                  iOS <small>jald</small>
                </button>
              </div>
              <div className={cx("fgrp")} role="group" aria-label="Waqt: har number is reading se">
                {WIN_CHIPS.map(({ w, label }) => (
                  <button key={w} type="button" className={cx("chip")} aria-pressed={win === w} onClick={() => setWin(w)}>
                    {label}
                  </button>
                ))}
              </div>
              <div className={cx("fgrp")}>
                <label className={cx("chip", "rangechip")} title="Phone jo is dauran test mein aaye">
                  <Icon name="cal" />
                  {data ? `${day(data.range.from)} – ${day(data.range.to)}` : "Tarikh"}
                  <select
                    className={cx("rangesel")}
                    aria-label="Kis dauran ke phones"
                    value={String(range)}
                    onChange={(e) => pickRange(e.target.value === "since" ? "since" : (Number(e.target.value) as WindowChoice))}
                  >
                    {RANGES.map((r) => (
                      <option key={String(r.w)} value={String(r.w)}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            {!current && (
              <>
                <span className={cx("sr")} role="status">
                  A/B tests ka hisaab aa raha hai…
                </span>
                <Skeleton />
              </>
            )}
            {current?.kind === "error" && <ErrorState message={current.message} onRetry={retry} />}
            {current?.kind === "unavailable" && (
              <>
                <div className={cx("waitBox")} role="status" aria-live="polite">
                  <span className={cx("spin")} aria-hidden="true" />
                  <span>{unavailableText(current.reason)}</span>
                  <button type="button" className={cx("btn")} onClick={retry}>
                    Dobara dekhein
                  </button>
                </div>
                {current.reason === "computing" && <Skeleton />}
              </>
            )}
            {data && <Answer data={data} win={win} onRetry={retry} />}

            <details className={cx("calc", "howbox")}>
              <summary>
                <Icon name="chev" />
                Ye numbers kaise gine gaye
              </summary>
              <ul className={cx("howlist")}>
                {HOW_COUNTED.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </details>

            <TipLayer scope={rootRef} />
          </div>
        </section>
      </div>
    </main>
  );
}

function Meta({ data }: { data: AbTestsResponse | null }) {
  if (!data) return <div className={cx("meta")}>Android · naye install · release</div>;
  return (
    <div className={cx("meta")}>
      <span>{data.platform}</span>
      <span>Naye install</span>
      <span>Release</span>
      <span>{fmt(data.population.excludedTestingDevices)} test phone nikale</span>
      <span className={cx("num")}>
        {dayTime(data.computedAt)} · {age(data.computedAt)}
      </span>
    </div>
  );
}

function Answer({ data, win, onRetry }: { data: AbTestsResponse; win: Win; onRetry: () => void }) {
  if (data.truncated) {
    return (
      <div className={cx("banner")} role="alert">
        Is waqt mein phones itne zyada hain ke server ne gin-na rok diya (had 30,000). Adhoore numbers nahi dikhaye ja rahe: chhota waqt chunein.
      </div>
    );
  }
  if (!data.tests.length) return <EmptyState message="Server ki list mein abhi koi test nahi." />;
  const unknown = remoteUnknownLine(data.remoteConfig);
  const c = tileCounts(data.tests);
  const tiles: { cls: string; icon: IconName; n: number; label: string; sub: string }[] = [
    { cls: "tRun", icon: "play", n: c.running, label: "Chal rahe", sub: `${c.total} mein se` },
    { cls: "tGood", icon: "check", n: c.proven, label: "PAKKA", sub: "faisla ho gaya" },
    { cls: "tWarn", icon: "trend", n: c.leaning, label: "RUJHAN", sub: "aage, sabit nahi" },
    { cls: "tNeu", icon: "clock", n: c.thin, label: "DATA KAM", sub: c.notStarted ? `${c.notStarted} shuru nahi` : "intezar" },
  ];
  return (
    <>
      {data.stale && (
        <div className={cx("banner")} role="status">
          <Icon name="clock" />
          <span>Ye pichhla hisaab hai ({dayTime(data.computedAt)}). Naya hisaab chal raha hai.</span>
          <button type="button" className={cx("btn")} onClick={onRetry}>
            Dobara dekhein
          </button>
        </div>
      )}
      {unknown && <div className={cx("banner")}>{unknown}</div>}
      <div className={cx("tiles")}>
        {tiles.map((t) => (
          <div key={t.label} className={cx("tile", t.cls)}>
            <span className={cx("tn", "num")}>
              <Icon name={t.icon} />
              {t.n}
            </span>
            <span className={cx("tl")}>{t.label}</span>
            <span className={cx("ts")}>{t.sub}</span>
          </div>
        ))}
      </div>
      <div className={cx("cards")}>
        {data.tests.map((t) => (
          <Card key={t.id} t={t} win={win} />
        ))}
      </div>
      <p className={cx("foot")}>
        <b>Test nahi:</b>{" "}
        {data.notTests.map((n, i) => (
          <span key={n}>
            {i > 0 && " · "}
            <code>{n.replace(/^condition:/, "")}</code>
          </span>
        ))}
        . Hamare {fmt(data.population.ourOwnListSize)} apne phones/accounts har ginti se bahar hain.
      </p>
    </>
  );
}

/** Placeholder shapes while the first answer arrives or is being computed. */
function Skeleton() {
  return (
    <div className={cx("skel")} aria-hidden="true">
      <div className={cx("tiles")}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={cx("sk", "skTile")} />
        ))}
      </div>
      {[0, 1].map((i) => (
        <div key={i} className={cx("card")}>
          <div className={cx("sk", "skLine", "w60")} />
          <div className={cx("sk", "skLine", "w90")} />
          <div className={cx("sk", "skBlock")} />
        </div>
      ))}
    </div>
  );
}
