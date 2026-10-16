"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import LoadingState from "@/components/LoadingState";
import ErrorState from "@/components/ErrorState";
import EmptyState from "@/components/EmptyState";
import { getErrorMessage, isUnauthorizedError } from "@/lib/api";
import { clearAccessToken } from "@/lib/auth";
import { abTestsApi, unavailableReason } from "../api";
import styles from "../styles/ab-tests.module.css";
import type { AbTest, AbTestsResponse, Metric, Unavailable, WindowChoice } from "../types";
import {
  AD_QUESTION,
  SCALE,
  SPLASH_WAITING,
  age,
  armLines,
  badgeText,
  barPos,
  barTone,
  day,
  dayTime,
  fmt,
  leakLine,
  metricLabel,
  moreLine,
  pct,
  pendingLine,
  percentLine,
  phonesAB,
  pts,
  pValue,
  recLine,
  remoteUnknownLine,
  setAsideLine,
  statusText,
  summary,
  testWords,
  unavailableText,
  verdictLine,
  weakReason,
  windowLabel,
} from "../words";

/** Class names of this module; several per argument are allowed ("mrow weak"). */
const cx = (...names: (string | false | null | undefined)[]): string =>
  names
    .filter((n): n is string => Boolean(n))
    .flatMap((n) => n.split(/\s+/))
    .map((n) => styles[n] ?? n)
    .join(" ");

const WINDOWS: { w: WindowChoice; label: string }[] = [
  { w: "since", label: "Test shuru se" },
  { w: 7, label: "7 din" },
  { w: 14, label: "14 din" },
  { w: 30, label: "30 din" },
];

type Load =
  | { key: string; kind: "ok"; data: AbTestsResponse }
  | { key: string; kind: "unavailable"; reason: Unavailable }
  | { key: string; kind: "error"; message: string };

/**
 * The A/B Tests page (decision 0222, phase 1): every A/B and holdout test the app runs, with its result in plain words.
 * Read only. It loads once per window, never polls, and asks again only when the server said "still computing"
 * (once, after the 15 s it asked for) or when the person presses retry.
 */
export default function AbTestsPage() {
  const router = useRouter();
  const platform = "Android";
  const [win, setWin] = useState<WindowChoice>("since");
  const [attempt, setAttempt] = useState(0);
  const [load, setLoad] = useState<Load | null>(null);
  const key = `${platform}|${win}|${attempt}`;

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
      .get(platform, win)
      .then((data) => !cancelled && setLoad({ key, kind: "ok", data }))
      .catch((e) => {
        if (cancelled || onFail(e)) return;
        const reason = unavailableReason(e);
        setLoad(
          reason
            ? { key, kind: "unavailable", reason }
            : { key, kind: "error", message: getErrorMessage(e, "A/B Tests load nahi hua.") },
        );
      });
    return () => {
      cancelled = true;
    };
  }, [key, win, onFail]);

  // "Still computing": ask once more after the 15 s the server asked for. Not a poll: one retry, then the button.
  const computing = load?.key === key && load.kind === "unavailable" && load.reason === "computing" && attempt === 0;
  useEffect(() => {
    if (!computing) return;
    const t = window.setTimeout(() => setAttempt((a) => a + 1), 15_000);
    return () => window.clearTimeout(t);
  }, [computing]);

  const current = load?.key === key ? load : null;
  const retry = () => setAttempt((a) => a + 1);
  const pickWindow = (w: WindowChoice) => {
    setWin(w);
    setAttempt(0);
  };

  return (
    <main className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Navbar title="A/B Tests" />
        <section className="content-wrap">
          <div className={cx("root")}>
            <div className={cx("ph1")}>
              <h1>A/B Tests</h1>
              <span className={cx("sub")}>Har test: kis ko kya mila, aur kaun aage hai</span>
            </div>

            <div className={cx("filters")}>
              <div className={cx("fg")} role="group" aria-label="Platform">
                <span className={cx("flabel")}>Platform</span>
                <button type="button" className={cx("chip")} aria-pressed="true">
                  Android
                </button>
                <button type="button" className={cx("chip")} disabled title="Abhi kisi test mein iOS ke asli phones nahi">
                  iOS · jald
                </button>
              </div>
              <div className={cx("fg")} role="group" aria-label="Waqt">
                <span className={cx("flabel")}>Waqt</span>
                {WINDOWS.map(({ w, label }) => (
                  <button key={String(w)} type="button" className={cx("chip")} aria-pressed={win === w} onClick={() => pickWindow(w)}>
                    {label}
                  </button>
                ))}
              </div>
              <div className={cx("scope")}>{scopeLine(current?.kind === "ok" ? current.data : null)}</div>
            </div>

            {!current && <LoadingState message="A/B tests ka hisaab aa raha hai…" />}

            {current?.kind === "error" && <ErrorState message={current.message} onRetry={retry} />}

            {current?.kind === "unavailable" && (
              <div className={cx("waitBox")} role="status" aria-live="polite">
                <span>{unavailableText(current.reason)}</span>
                <button type="button" className="btn" onClick={retry}>
                  Dobara dekhein
                </button>
              </div>
            )}

            {current?.kind === "ok" && <Answer data={current.data} onRetry={retry} />}
          </div>
        </section>
      </div>
    </main>
  );
}

function scopeLine(d: AbTestsResponse | null): string {
  const base = "Sirf release builds · hamare test phones nikale gaye · sirf naye installs · har phone tab gina jab us ka poora waqt guzar gaya";
  if (!d) return `${base} · har 20 min naya`;
  return `${base} · ${day(d.range.from)} se ${dayTime(d.range.to)} tak · hisaab ${dayTime(d.computedAt)} (${age(d.computedAt)}), har ${d.cacheMinutes} min naya`;
}

function Answer({ data, onRetry }: { data: AbTestsResponse; onRetry: () => void }) {
  if (data.truncated) {
    return (
      <div className={cx("banner")} role="alert">
        Is waqt mein phones itne zyada hain ke server ne gin-na rok diya (had 30,000). Adhoore numbers nahi dikhaye ja rahe:
        chhota waqt chunein.
      </div>
    );
  }
  if (!data.tests.length) return <EmptyState message="Server ki list mein abhi koi test nahi." />;
  const unknown = remoteUnknownLine(data.remoteConfig);
  return (
    <>
      {data.stale && (
        <div className={cx("banner")} role="status">
          <span>
            Ye pichhla hisaab hai ({dayTime(data.computedAt)}). Naya hisaab chal raha hai.
          </span>
          <button type="button" className="btn" onClick={onRetry}>
            Dobara dekhein
          </button>
        </div>
      )}
      <div className={cx("summary")}>
        {summary(data.tests).map((s) => (
          <span key={s.text} className={cx("sumitem", s.warn && "sumWarn")}>
            {s.text}
          </span>
        ))}
      </div>
      {unknown && <div className={cx("note")}>{unknown}</div>}
      <div className={cx("cards")}>
        {data.tests.map((t) => (
          <Card key={t.id} t={t} />
        ))}
      </div>
      <div className={cx("foot")}>
        <b>Ye test nahi hain:</b> {data.notTests.map((n, i) => (
          <span key={n}>
            {i > 0 && ", "}
            <code>{n.replace(/^condition:/, "")}</code>
          </span>
        ))}
        . In sab ki aik hi value hai, ya Remote Config ki purani condition jo kuch nahi karti. Rate-us 2 → 1 din aik setting ki
        tabdeeli thi, test nahi. Hamare {fmt(data.population.excludedTestingDevices)} testing devices aur{" "}
        {fmt(data.population.ourOwnListSize)} apne phones/accounts har ginti se bahar hain; is waqt mein{" "}
        {fmt(data.population.ourOwnPhonesSetAside)} aise phones mile.
      </div>
    </>
  );
}

function Card({ t }: { t: AbTest }) {
  const w = testWords(t.id);
  const badge = t.verdict.state === "PROVEN" ? "bProven" : t.verdict.state === "LEANING" ? "bLean" : "bNone";
  const rec = recLine(t);
  const more = moreLine(t);
  const pending = pendingLine(t);
  const aside = setAsideLine(t);
  return (
    <article className={cx("card")} aria-label={w.name}>
      <div className={cx("chead")}>
        <div className={cx("ctitle")}>
          <h2>{w.name}</h2>
          {w.what && <div className={cx("what")}>{w.what}</div>}
        </div>
        <div className={cx("pills")}>
          <span className={cx("status", t.status === "RUNNING" && "run")}>{statusText(t)}</span>
          {t.intendedOff && <span className={cx("status warn")}>Band hona tha</span>}
          <span className={cx("status")}>{t.startedAt ? `${day(t.startedAt)} se` : "shuru nahi"}</span>
        </div>
      </div>

      <div className={cx("cleft")}>
        <div className={cx("verdict")}>
          <span className={cx("badge", badge)}>{badgeText(t)}</span>
          <span className={cx("vline")}>{verdictLine(t)}</span>
          {more && <span className={cx("more")}>{more}</span>}
        </div>

        <div className={cx("arms")}>
          {(["A", "B"] as const).map((role) => {
            const arm = t.arms.find((a) => a.role === role);
            if (!arm) return null;
            const l = armLines(t, arm);
            return (
              <div key={role} className={cx("arm")}>
                <span className={cx("armK")}>{role === "A" ? w.a.long : w.b.long}</span>
                <span className={cx("armN")}>
                  {l.n} <small>{l.small}</small>
                </span>
                <span className={cx("armS")}>{l.sub}</span>
              </div>
            );
          })}
        </div>

        <div className={cx("fact")}>
          <span className={cx("fk")}>Hissa kahan se aata hai</span>
          <span>{percentLine(t)}</span>
        </div>
        {t.leak && (
          <div className={cx("fact leak")}>
            <span className={cx("fk")}>Leak</span>
            <span>{leakLine(t, t.leak)}</span>
          </div>
        )}
        {t.touchesAds && (
          <div className={cx("fact ask")}>
            <span className={cx("fk")}>Ad se juda · sawal aap se</span>
            <span>{AD_QUESTION}</span>
          </div>
        )}
        {rec && (
          <div className={cx("rec")}>
            <span className={cx("fk")}>Sifarish</span>
            <span>{rec}</span>
          </div>
        )}
      </div>

      <div className={cx("cright")}>
        <div className={cx("mlist")}>{t.metricsBuilt ? <MetricRows t={t} /> : <Waiting />}</div>
        {pending && <div className={cx("note")}>{pending}</div>}
        {aside && <div className={cx("note")}>{aside}</div>}
        {t.metricsBuilt && t.metrics.length > 0 && <Workings t={t} />}
        {t.breakdown && t.breakdown.length > 0 && <Languages t={t} />}
      </div>
    </article>
  );
}

function Waiting() {
  return (
    <>
      <div className={cx("mgroup")}>Shuru hone par yahan</div>
      {SPLASH_WAITING.map((x) => (
        <div key={x} className={cx("mrow weak")}>
          <span className={cx("lab")}>{x}</span>
          <span className={cx("diff")}>—</span>
        </div>
      ))}
    </>
  );
}

function MetricRows({ t }: { t: AbTest }) {
  const w = testWords(t.id);
  return (
    <>
      <div className={cx("mhead")} aria-hidden="true">
        <span>Kya</span>
        <span>{w.a.short}</span>
        <span>{w.b.short}</span>
        <span>Farq</span>
        <span>Farq ki range (points)</span>
      </div>
      {t.metrics.map((m, i) => {
        // A group heading above the first row of each group (G1 first, then the rest).
        const first = i === 0 || t.metrics[i - 1].primary !== m.primary;
        const head = first ? (
          <div className={cx("mgroup")}>{m.primary ? "Asal maqsad · G1 = share ya payment" : "Saath mein dekhein (badge nahi badalte)"}</div>
        ) : null;
        const weak = weakReason(m);
        return (
          <div key={`${m.metric}-${m.window}`}>
            {head}
            <div className={cx("mrow", weak && "weak")}>
              <span className={cx("lab")}>
                {metricLabel(m)} <span className={cx("w")}>· {windowLabel(m.window)}</span>
                {weak && <span className={cx("kam")}>{weak}</span>}
              </span>
              <span className={cx("diff")}>{pts(m.diffPts)} pts</span>
              <span className={cx("rates")}>
                <span>
                  <span className={cx("armname")}>{w.a.short} </span>
                  <b>{pct(m.a.rate)}</b>
                </span>
                <span className={cx("sep")}> · </span>
                <span>
                  <span className={cx("armname")}>{w.b.short} </span>
                  <b>{pct(m.b.rate)}</b>
                </span>
              </span>
              <div className={cx("barcell")}>
                <Bar m={m} />
              </div>
            </div>
          </div>
        );
      })}
      <div className={cx("scale")} aria-hidden="true">
        <span>
          {w.a.short} peeche · −{SCALE}
        </span>
        <span>0</span>
        <span>
          +{SCALE} · {w.a.short} aage
        </span>
      </div>
    </>
  );
}

function Bar({ m }: { m: Metric }) {
  if (m.diffPts == null || m.diffLo == null || m.diffHi == null) return <div className={cx("track")} aria-hidden="true" />;
  const left = barPos(m.diffLo);
  const right = barPos(m.diffHi);
  return (
    <div className={cx("track")} role="img" aria-label={`Farq ${pts(m.diffPts)} points, range ${pts(m.diffLo)} se ${pts(m.diffHi)}`}>
      <span className={cx("iv", barTone(m))} style={{ left: `${left}%`, width: `${Math.max(0, right - left)}%` }} />
      <span className={cx("zero")} />
      <span className={cx("dot")} style={{ left: `${barPos(m.diffPts)}%` }} />
    </div>
  );
}

function Workings({ t }: { t: AbTest }) {
  return (
    <details className={cx("calc")}>
      <summary>Hisaab dekhein</summary>
      <div className={cx("calcbox")}>
        <table className={cx("t")}>
          <thead>
            <tr>
              <th>Kya</th>
              <th className={cx("n")}>Phones A / B</th>
              <th className={cx("n")}>Farq</th>
              <th className={cx("n")}>Range</th>
              <th className={cx("n")}>z</th>
              <th className={cx("n")}>p</th>
            </tr>
          </thead>
          <tbody>
            {t.metrics.map((m) => (
              <tr key={`${m.metric}-${m.window}`} className={cx(!m.valid && "grey")}>
                <td>
                  {metricLabel(m)} {windowLabel(m.window)}
                </td>
                <td className={cx("n")}>{phonesAB(m.a, m.b)}</td>
                <td className={cx("n")}>{pts(m.diffPts)}</td>
                <td className={cx("n")}>
                  {pts(m.diffLo)} se {pts(m.diffHi)}
                </td>
                <td className={cx("n")}>{m.z == null ? "—" : m.z.toFixed(2)}</td>
                <td className={cx("n")}>{pValue(m.p)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className={cx("note")}>
          Har guroh ki range Wilson 95%, farq ki range Newcombe 95%, z do-guroh test. Faisla tab jab har guroh mein kam az kam 200
          phones hon. Badge sirf G1 se tay hota hai.
          {t.verdict.neededPerArm != null && ` Is farq ko pakka karne ke liye har guroh mein takreeban ${fmt(t.verdict.neededPerArm)} phones chahiye.`}
        </p>
      </div>
    </details>
  );
}

function Languages({ t }: { t: AbTest }) {
  const w = testWords(t.id);
  return (
    <details className={cx("calc")}>
      <summary>Zubaan war (sirf dekhne ke liye)</summary>
      <div className={cx("calcbox")}>
        <table className={cx("t")}>
          <thead>
            <tr>
              <th>Zubaan</th>
              <th className={cx("n")}>
                {w.a.short} / {w.b.short}
              </th>
              <th className={cx("n")}>Save 24 ghante</th>
              <th className={cx("n")}>G1 24 ghante</th>
            </tr>
          </thead>
          <tbody>
            {t.breakdown!.map((l) => {
              const saved = l.metrics.find((m) => m.metric === "saved");
              const g1 = l.metrics.find((m) => m.metric === "g1");
              return (
                <tr key={l.lang} className={cx(!l.enough && "grey")}>
                  <td>{l.lang}</td>
                  <td className={cx("n")}>
                    {fmt(l.aPhones)} / {fmt(l.bPhones)}
                  </td>
                  <td className={cx("n")}>{l.enough && saved ? `${pts(saved.diffPts)} (p ${pValue(saved.p)})` : "kam phones"}</td>
                  <td className={cx("n")}>{l.enough && g1 ? `${pts(g1.diffPts)} (p ${pValue(g1.p)})` : "kam phones"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className={cx("note")}>
          Faisla sirf poore guroh par hai (aik pehle se tay muqabla). Jis zubaan mein har taraf 100 se kam phones hon, wo parhne
          layak nahi.
        </p>
      </div>
    </details>
  );
}
