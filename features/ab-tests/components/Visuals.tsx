import type { ReactNode } from "react";
import type { AbTest, Metric } from "../types";
import {
  AD_QUESTION,
  AD_STRIP,
  FUNNEL_NOTE,
  SPLASH_WAITING,
  answerLine,
  badgeWord,
  barPos,
  chance,
  countPct,
  fmt,
  findMetric,
  funnelSteps,
  jawab,
  langName,
  languageBars,
  leadArm,
  leakStrip,
  metricFull,
  metricLabel,
  metricTone,
  moreLine,
  pairTip,
  pakkaChecks,
  pct,
  pendingLine,
  percentLine,
  pts,
  ptsWord,
  rateWidth,
  recLine,
  ringInfo,
  setAsideLine,
  stateChip,
  testWords,
  winLabel,
  type Tone,
  type Win,
} from "../words";
import { Icon, cx, type IconName } from "./shared";

/** Props that make a drawing readable by keyboard, touch and screen reader: the tooltip text is also its name. */
const tip = (text: string) => ({ "data-tip": text, tabIndex: 0, role: "img" as const, "aria-label": text });

const toneIcon = (t: Tone): IconName => (t === "good" ? "check" : t === "bad" ? "x" : "wave");

/** One test's card. `win` is the chip: it picks which reading every number comes from. */
export default function Card({ t, win }: { t: AbTest; win: Win }) {
  const w = testWords(t.id);
  const idle = t.status === "NOT_STARTED" || !t.metricsBuilt;
  return (
    <article className={cx("card", idle && "idle")} aria-label={w.name}>
      <Head t={t} win={win} />
      <Strips t={t} />
      {idle ? (
        <div className={cx("cbody")}>
          <div className={cx("col")}>
            <Hero t={t} win={win} />
          </div>
          <div className={cx("col")}>
            <Coming t={t} />
            <Ring t={t} />
          </div>
        </div>
      ) : (
        <div className={cx("cbody")}>
          <div className={cx("col")}>
            <Hero t={t} win={win} />
            <Funnel t={t} win={win} />
            <Langs t={t} />
          </div>
          <div className={cx("col")}>
            <Interval t={t} win={win} />
            <Ring t={t} />
            <Spark />
          </div>
        </div>
      )}
      <Workings t={t} />
    </article>
  );
}

// ── head: name, state, badge, the one-line question and answer ──

function Head({ t, win }: { t: AbTest; win: Win }) {
  const w = testWords(t.id);
  const st = stateChip(t);
  const state = t.verdict.state;
  const badge = state === "PROVEN" ? "bGood" : state === "LEANING" ? "bWarn" : "bNeu";
  const icon: IconName = state === "PROVEN" ? "check" : state === "LEANING" ? "trend" : "clock";
  const checks = pakkaChecks(t);
  return (
    <>
      <div className={cx("chead")}>
        <div>
          <h2>{w.name}</h2>
          <span className={cx("state", !st.on && "off")}>
            <span className={cx("dot")} aria-hidden="true" />
            {st.text}
            {st.off ? <span className={cx("split")}> · band hona tha</span> : st.split ? <span className={cx("split")}> · {st.split}</span> : null}
          </span>
        </div>
        <span className={cx("badge", badge, state === "LEANING" && "hit")} {...(state === "LEANING" ? tip("RUJHAN (sabit nahi): ek taraf aage hai magar ittefaq bhi ho sakta hai") : {})}>
          <Icon name={icon} />
          {badgeWord(t)}
        </span>
        {checks.length > 0 && (
          <div className={cx("checks")}>
            PAKKA = dono <Icon name="check" />
            {checks.map((c) => (
              <span key={c.w} className={cx("ck hit", c.sure && "yes", c.w === win && "cur")} {...tip(c.tip)}>
                <Icon name={c.sure ? "check" : "wave"} />
                {winLabel(c.w)}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className={cx("qa")}>
        <p>
          <span className={cx("k")}>Sawal</span>
          <span>{w.ask}</span>
        </p>
        <p>
          <span className={cx("k")}>Jawab</span>
          <span className={cx("ans")}>{jawab(t, win)}</span>
        </p>
      </div>
    </>
  );
}

// ── special strips: the tour's leak, and the ad trade ──

function Strips({ t }: { t: AbTest }) {
  const leak = leakStrip(t);
  return (
    <>
      {leak && (
        <div className={cx("strip sWarn")} role="note">
          <Icon name="warn" />
          <div>
            <b>{leak.title}</b>
            <span className={cx("sub")}>
              {leak.parts.map((p) => (
                <span key={p}>{p}</span>
              ))}
            </span>
          </div>
        </div>
      )}
      {t.touchesAds && (
        <div className={cx("strip sNeu")} role="note" data-tip={AD_QUESTION} tabIndex={0}>
          <Icon name="scale" />
          <div>
            <b>{AD_STRIP.title}</b>
            <span className={cx("sub")}>
              <span>{AD_STRIP.sub}</span>
            </span>
          </div>
        </div>
      )}
    </>
  );
}

// ── hero: arm tiles, the delta pill, the bar pair on the 0-20 % scale ──

function Hero({ t, win }: { t: AbTest; win: Win }) {
  const x = testWords(t.id);
  const m = findMetric(t, "g1", win);
  const lead = leadArm(t);
  const tone = metricTone(m);
  const tag = t.verdict.state === "PROVEN" ? { icon: "check" as const, text: "Jeeta" } : { icon: "trend" as const, text: "Aage" };
  const idle = !m;
  const arm = (k: "a" | "b") => {
    const role = k === "a" ? "A" : "B";
    const rec = t.arms.find((a) => a.role === role);
    const p = m?.[k];
    return (
      <div className={cx("arm", k, lead === role && "win", idle && "ghostarm")}>
        {lead === role && (
          <span className={cx("tag")}>
            <Icon name={tag.icon} />
            {tag.text}
          </span>
        )}
        <span className={cx("an")}>
          <span className={cx("sw", k)} aria-hidden="true" />
          <span>{x[k].short}</span>
        </span>
        <span className={cx("big", "num")}>{p ? pct(p.rate) : fmt(rec?.assigned ?? 0)}</span>
        <span className={cx("nn", "num")}>{p ? `${fmt(p.x)} / ${fmt(p.n)} phone` : "phone"}</span>
      </div>
    );
  };
  return (
    <div className={cx("blk")}>
      <div className={cx("lab")}>
        <span>{idle ? "Guroh" : metricLabel({ metric: "g1" })}</span>
        <em>{idle ? "abhi khali" : `${winLabel(win)} mein`}</em>
      </div>
      <div className={cx("hero")}>
        {arm("a")}
        <div
          className={cx("delta", `d-${tone}`)}
          {...(m ? tip(`Farq: ${ptsWord(m.diffPts)} (range ${pts(m.diffLo)} se ${pts(m.diffHi)})`) : {})}
        >
          <Icon name={toneIcon(tone)} />
          <b className={cx("num")}>{m ? pts(m.diffPts) : "—"}</b>
          <small>points</small>
        </div>
        {arm("b")}
      </div>
      {m && (
        <div className={cx("hb")} {...tip(pairTip(t, m))}>
          {(["a", "b"] as const).map((k) => (
            <div key={k} className={cx("hb-row")}>
              <span className={cx("hb-name")}>{x[k].short}</span>
              <div className={cx("track")}>
                <span className={cx("grid-l")} style={{ left: "50%" }} aria-hidden="true" />
                <div className={cx("bar", k)} style={{ width: `${rateWidth(m[k].rate)}%` }} />
              </div>
            </div>
          ))}
          <div className={cx("axis")} aria-hidden="true">
            <span style={{ left: 0 }}>0%</span>
            <span style={{ left: "50%" }}>10%</span>
            <span style={{ left: "100%" }}>20%</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Behtari: the range of the gap, on one -15..+15 points axis ──

const TICKS = [-15, -10, -5, 0, 5, 10, 15];
const signed = (v: number): string => (v > 0 ? `+${v}` : v < 0 ? `−${Math.abs(v)}` : "0");

function Interval({ t, win }: { t: AbTest; win: Win }) {
  const x = testWords(t.id);
  const rows: { m: Metric | undefined; label: string; main: boolean }[] = [
    { m: findMetric(t, "g1", win), label: metricLabel({ metric: "g1" }), main: true },
    { m: findMetric(t, "saved", win), label: `${metricLabel({ metric: "saved" })} · ${winLabel(win)}`, main: false },
    { m: findMetric(t, "return", "d2_7"), label: metricLabel({ metric: "return" }), main: false },
  ];
  return (
    <div className={cx("blk")}>
      <div className={cx("lab")}>
        <span>Behtari</span>
        <em>points · {winLabel(win)}</em>
      </div>
      <div className={cx("iv-ends")}>
        <span>
          <Icon name="left" />
          <span className={cx("sw", "b")} aria-hidden="true" />
          {x.b.short} behtar
        </span>
        <span>
          {x.a.short} behtar
          <span className={cx("sw", "a")} aria-hidden="true" />
          <Icon name="right" />
        </span>
      </div>
      <div className={cx("iv")}>
        {rows.map(({ m, label, main }) => {
          if (!m) return null;
          const tone = metricTone(m);
          const lo = barPos(m.diffLo ?? 0);
          const hi = barPos(m.diffHi ?? 0);
          const sure = tone === "good" || tone === "bad";
          return (
            <div
              key={`${m.metric}-${m.window}`}
              className={cx("iv-row", main && "main")}
              {...tip(`${label}: ${ptsWord(m.diffPts)} · range ${pts(m.diffLo)} se ${pts(m.diffHi)} · ${sure ? "pakka" : "pakka nahi"}`)}
            >
              <div className={cx("iv-lab")}>
                <span>{label}</span>
                <span className={cx("iv-num", tone)}>
                  <Icon name={toneIcon(tone)} />
                  {pts(m.diffPts)}
                </span>
              </div>
              <div className={cx("iv-track")}>
                <div className={cx("iv-bar", tone)} style={{ left: `${lo}%`, width: `${Math.max(hi - lo, 0.5)}%` }} />
                <div className={cx("iv-zero")} />
                {m.diffPts != null && <i className={cx("iv-dot")} style={{ left: `${barPos(m.diffPts)}%` }} />}
              </div>
            </div>
          );
        })}
        <div className={cx("iv-axis")} aria-hidden="true">
          {TICKS.map((v) => (
            <span key={v} className={cx(v === 0 && "z")} style={{ left: `${barPos(v)}%` }}>
              {signed(v)}
            </span>
          ))}
        </div>
      </div>
      <div className={cx("key")}>
        <span>
          <i className={cx("good")} />0 ke daayen = pakka
        </span>
        <span>
          <i className={cx("mid")} />0 ko chhuye = pakka nahi
        </span>
      </div>
    </div>
  );
}

// ── sample ring ──

function Ring({ t }: { t: AbTest }) {
  const r = ringInfo(t);
  const R = 30;
  const C = 2 * Math.PI * R;
  const label = r.kind === "proven" ? "✓" : r.kind === "not_started" ? "0" : r.kind === "count" ? pct(r.frac).replace(/\.0%$/, "%") : "—";
  const ringClass = r.kind === "proven" ? "good" : "";
  const v = t.verdict;
  let body: ReactNode;
  let text: string;
  if (r.kind === "not_started") {
    text = "Abhi koi phone nahi mila";
    body = (
      <div>
        <div className={cx("p1", "num")}>0 phone</div>
        <div className={cx("p2")}>{text}</div>
        <span className={cx("p3", "neu")}>
          <Icon name="clock" />
          {r.chip}
        </span>
      </div>
    );
  } else if (r.kind === "proven") {
    text = "Faisla ho chuka: aur intezar ki zaroorat nahi";
    body = (
      <div>
        <div className={cx("p1")}>Kaafi phone</div>
        <div className={cx("p2")}>Faisla ho chuka</div>
        <span className={cx("p3", "good")}>
          <Icon name="check" />
          {r.chip}
        </span>
      </div>
    );
  } else {
    text = `Har taraf ${fmt(r.need)} phone chahiye. Roz ~${Math.round(v.perDayA)} / ~${Math.round(v.perDayB)} naye. ${moreLine(t)}`;
    body = (
      <div>
        <div className={cx("p1", "num")}>{r.need != null ? `${fmt(r.have)} / ${fmt(r.need)}` : `${fmt(r.have)} phone`}</div>
        <div className={cx("p2")}>phone har taraf (7 din poore)</div>
        <span className={cx("p3")}>
          <Icon name="clock" />
          {r.chip}
        </span>
      </div>
    );
  }
  return (
    <div className={cx("blk")}>
      <div className={cx("lab")}>
        <span>Sample</span>
        <em>har taraf kitne chahiye</em>
      </div>
      <div className={cx("prog")} {...tip(text)}>
        <svg className={cx("ring")} viewBox="0 0 76 76" aria-hidden="true">
          <circle className={cx("rbg")} cx="38" cy="38" r={R} fill="none" strokeWidth="8" />
          {r.frac > 0 && (
          <circle
            className={cx("rfg", ringClass)}
            cx="38"
            cy="38"
            r={R}
            fill="none"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${(C * r.frac).toFixed(1)} ${C.toFixed(1)}`}
            transform="rotate(-90 38 38)"
          />
          )}
          <text x="38" y="43" textAnchor="middle">
            {label}
          </text>
        </svg>
        {body}
      </div>
    </div>
  );
}

// ── Safar: the journey in three steps, both arms ──

function Funnel({ t, win }: { t: AbTest; win: Win }) {
  const x = testWords(t.id);
  const steps = funnelSteps(t, win);
  if (!steps.length) return null;
  return (
    <div className={cx("blk")}>
      <div className={cx("lab")}>
        <span>Safar</span>
        <em>{winLabel(win)} mein</em>
      </div>
      <div className={cx("legend")}>
        <span>
          <span className={cx("sw", "a")} aria-hidden="true" />A · {x.a.short}
        </span>
        <span>
          <span className={cx("sw", "b")} aria-hidden="true" />B · {x.b.short}
        </span>
      </div>
      <div className={cx("fn")}>
        {steps.map((s, i) => (
          <div
            key={s.label}
            className={cx("fn-step")}
            {...tip(`${s.label}: ${x.a.short} ${fmt(s.a.x)} / ${fmt(s.a.n)} = ${pct(s.a.rate)} · ${x.b.short} ${fmt(s.b.x)} / ${fmt(s.b.n)} = ${pct(s.b.rate)}`)}
          >
            <span className={cx("fn-lab")}>{s.label}</span>
            <div className={cx("fn-bars")}>
              {(["a", "b"] as const).map((k) => (
                <div key={k} className={cx("fn-row")}>
                  <span className={cx("l", k)} aria-hidden="true">
                    {k.toUpperCase()}
                  </span>
                  <div className={cx("track")}>
                    <div className={cx("bar", k)} style={{ width: `${Math.max((s[k].rate ?? 0) * 100, 0.8)}%` }} />
                  </div>
                  <span className={cx("v", "num")}>{i === 0 ? fmt(s[k].n) : pct(s[k].rate)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <span className={cx("fnote")}>{FUNNEL_NOTE}</span>
    </div>
  );
}

// ── Zubaanein ──

function Langs({ t }: { t: AbTest }) {
  const l = languageBars(t);
  if (!l) return null;
  return (
    <div className={cx("blk")}>
      <div className={cx("lab")}>
        <span>Zubaanein</span>
        <em>faisla sab ko mila kar</em>
      </div>
      <div className={cx("langs")}>
        {l.rows.map((r) => (
          <div key={r.label} className={cx("lg", r.tip && "hit")} {...(r.tip ? tip(r.tip) : {})}>
            <span>{r.label}</span>
            <div className={cx("track", "thin")}>
              <div className={cx("bar", "a")} style={{ width: `${(r.phones / l.max) * 100}%` }} />
            </div>
            <span className={cx("v", "num")}>{fmt(r.phones)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Roz ba roz: the empty frame; the backend does not send a daily series yet ──

function Spark() {
  return (
    <div className={cx("spark")} role="img" aria-label="Roz ba roz chart: agla marhala. Roz ka data abhi backend nahi deta">
      <div className={cx("lab")}>
        <span>Roz ba roz</span>
        <span className={cx("next")}>
          <Icon name="clock" />
          Agla marhala
        </span>
      </div>
      <svg className={cx("sp")} viewBox="0 0 300 40" preserveAspectRatio="none" aria-hidden="true">
        <path className={cx("ph")} d="M0 32 H300" />
        <path className={cx("ph")} d="M0 20 H300" />
      </svg>
      <span className={cx("why")}>Roz ka data abhi backend nahi deta</span>
    </div>
  );
}

// ── what a test that has not run will show ──

function Coming({ t }: { t: AbTest }) {
  if (t.id !== "splash_wait") return null;
  return (
    <div className={cx("blk")}>
      <div className={cx("lab")}>
        <span>Chalne par dikhega</span>
      </div>
      <div className={cx("ghosts")}>
        {SPLASH_WAITING.map((g) => (
          <span key={g} className={cx("ghost")}>
            {g}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Hisaab dekhein: every number and the long sentences ──

function Workings({ t }: { t: AbTest }) {
  const x = testWords(t.id);
  const pending = pendingLine(t);
  const aside = setAsideLine(t);
  const rec = recLine(t);
  const facts: [string, string][] = [
    ["Poora sawal", x.question.replace(/^Sawal: /, "")],
    ["Poora jawab", answerLine(t).replace(/^Jawab: /, "")],
    ["Hissa kahan se", percentLine(t)],
    ["Baante gaye", t.arms.map((a) => `${a.role} ${fmt(a.assigned)}${a.observedShare != null ? ` (${pct(a.observedShare)})` : ""}`).join(" · ")],
  ];
  if (pending) facts.push(["Intezar mein", pending]);
  if (aside) facts.push(["Nahi gine", aside]);
  facts.push(["PAKKA ka qaida", "ASLI invoice: 24 ghante aur 7 din dono mein farq 0 se hat kar ho."]);
  if (t.touchesAds) facts.push(["Ad ka sawal", AD_QUESTION]);
  else if (rec) facts.push(["Sifarish", rec]);
  const bd = t.breakdown;
  return (
    <details className={cx("calc")}>
      <summary>
        <Icon name="chev" />
        Hisaab dekhein
      </summary>
      {t.metrics.length > 0 && (
        <div className={cx("tbl")}>
          <table>
            <thead>
              <tr>
                <th>Paimaana</th>
                <th>Waqt</th>
                <th>A · {x.a.short}</th>
                <th>B · {x.b.short}</th>
                <th>Farq</th>
                <th>Range</th>
                <th>Ittefaq ka imkaan</th>
              </tr>
            </thead>
            <tbody>
              {t.metrics.map((m) => (
                <tr key={`${m.metric}-${m.window}`}>
                  <td>{metricLabel(m)}</td>
                  <td>{winLabel(m.window)}</td>
                  <td>{countPct(m.a)}</td>
                  <td>{countPct(m.b)}</td>
                  <td>
                    <b>{pts(m.diffPts)}</b>
                  </td>
                  <td>
                    {pts(m.diffLo)} … {pts(m.diffHi)}
                  </td>
                  <td>{chance(m.p)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {t.metrics.length > 0 && (
        <p className={cx("note")}>
          Har guroh ki range Wilson 95%, farq ki range Newcombe 95%. Faisla tab jab har guroh mein kam az kam 200 phones hon. Badge sirf ASLI
          invoice se tay hota hai.
          {t.verdict.neededPerArm != null && ` Is farq ko pakka karne ke liye har guroh mein takreeban ${fmt(t.verdict.neededPerArm)} phones chahiye.`}
        </p>
      )}
      <dl className={cx("kv")}>
        {facts.map(([k, v]) => (
          <div key={k} className={cx("kvrow")}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      {bd && bd.length > 0 && (
        <>
          <div className={cx("lab", "sublab")}>
            <span>Zubaan war</span>
            <em>sirf dekhne ke liye; faisla poore guroh par hai</em>
          </div>
          <div className={cx("tbl")}>
            <table>
              <thead>
                <tr>
                  <th>Zubaan</th>
                  <th>
                    {x.a.short} / {x.b.short}
                  </th>
                  <th>{metricFull({ metric: "saved", window: "24h" })}</th>
                  <th>{metricFull({ metric: "g1", window: "24h" })}</th>
                </tr>
              </thead>
              <tbody>
                {bd.map((l) => {
                  const rec = l as unknown as { aPhones?: number; bPhones?: number; aphones?: number; bphones?: number };
                  const saved = l.metrics.find((m) => m.metric === "saved");
                  const g1 = l.metrics.find((m) => m.metric === "g1");
                  const cell = (m: Metric | undefined) =>
                    l.enough && m ? `${x.a.short} ${countPct(m.a)} · ${x.b.short} ${countPct(m.b)}` : "kam phones";
                  return (
                    <tr key={l.lang}>
                      <td>{langName(l.lang)}</td>
                      <td>
                        {fmt(rec.aPhones ?? rec.aphones)} / {fmt(rec.bPhones ?? rec.bphones)}
                      </td>
                      <td>{cell(saved)}</td>
                      <td>{cell(g1)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className={cx("note")}>Jis zubaan mein har taraf 100 se kam phones hon, wo parhne layak nahi.</p>
        </>
      )}
    </details>
  );
}

