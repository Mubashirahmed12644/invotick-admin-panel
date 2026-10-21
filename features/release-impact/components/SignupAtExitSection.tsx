"use client";

import { useEffect, useState } from "react";
import { getErrorMessage } from "@/lib/api";
import { releaseImpactApi, unavailableReason } from "../api";
import type { MechanismStep, RangeChoice, SignupInviteResponse, Unavailable } from "../types";
import {
  SECOND_INVOICE_BADGE,
  SIGNUP_LEVEL_WORDS,
  SIGNUP_MECHANISM_WORDS,
  breachWords,
  day,
  fmt,
  pct,
  recommendationWords,
  signupResult,
  signupRowWords,
  unavailableText,
  weeksText,
} from "../words";
import { KpiTable } from "./KpiTable";
import { Icon, cx } from "./shared";

type Load = { rk: string; kind: "ok"; data: SignupInviteResponse } | { rk: string; kind: "unavailable"; reason: Unavailable } | { rk: string; kind: "error"; message: string };

const ON = "Dawat ke saath";
const OFF = "Bina dawat (holdout)";

/**
 * The "Signup at exit" section (decisions 0231, 0232; registry 157), round 3 of the Release Impact page. Its own read
 * and cache; until a guest phone is dealt an arm in the range it shows the honest "not shipped / no data yet" state
 * and no number.
 */
export default function SignupAtExitSection({ range, onFail }: { range: RangeChoice; onFail: (e: unknown) => boolean }) {
  const [attempt, setAttempt] = useState(0);
  const [load, setLoad] = useState<Load | null>(null);
  const rk = String(range);

  useEffect(() => {
    let cancelled = false;
    releaseImpactApi
      .signupAtExit(range)
      .then((data) => !cancelled && setLoad({ rk, kind: "ok", data }))
      .catch((e) => {
        if (cancelled || onFail(e)) return;
        const reason = unavailableReason(e);
        setLoad(reason ? { rk, kind: "unavailable", reason } : { rk, kind: "error", message: getErrorMessage(e, "Signup at exit ka hisaab load nahi hua.") });
      });
    return () => {
      cancelled = true;
    };
  }, [rk, range, attempt, onFail]);

  const current = load?.rk === rk ? load : null;
  const computing = current?.kind === "unavailable" && current.reason === "computing" && attempt < 3;
  useEffect(() => {
    if (!computing) return;
    const t = window.setTimeout(() => setAttempt((a) => a + 1), 15_000);
    return () => window.clearTimeout(t);
  }, [computing, attempt]);

  const data = current?.kind === "ok" ? current.data : null;
  const badge = SECOND_INVOICE_BADGE[data?.verdict.badge ?? "not_started"];
  const rec = data && data.state === "running"
    ? recommendationWords({ section: { recommendation: data.recommendation, kpis: data.kpis, currentName: "1.5.5" } } as never)
    : null;

  return (
    <section className={cx("card", "sec", data?.verdict.badge === "worse" && "broken")} aria-labelledby="ri-signup">
      <div className={cx("secHead")}>
        <div className={cx("secTop")}>
          <div>
            <h2 id="ri-signup">Signup at exit: dawat aur Account safety</h2>
            <div className={cx("facts")}>
              <span>
                <Icon name="phone" />
                Android aur iOS alag kabhi nahi milte; ye Android hai
              </span>
              <span>
                <Icon name="cal" />
                <b>1.5.5</b> (taiyari, ship nahi hui)
              </span>
              {data && <span>{`${day(data.range.from)} – ${day(data.range.to)}`}</span>}
              <span>
                Badlav: <b>exit dialog par account ki dawat, sirf jo guest kamaye (share, 3 invoice, premium, 3 din)</b>
              </span>
            </div>
          </div>
          <div style={{ display: "grid", gap: 6, justifyItems: "end" }}>
            <span className={cx("badge", badge.cls)}>
              <Icon name={badge.icon === "eq" ? "info" : badge.icon} />
              <span>
                {badge.word}
                <small>{data ? (data.state === "not_started" ? "is waqt mein koi guroh nahi" : `${badge.small} · primary se`) : "hisaab ho raha hai"}</small>
              </span>
            </span>
          </div>
        </div>
        <div className={cx("kinds")}>
          <span className={cx("kind", "rand")}>
            <Icon name="users" />
            Random: hamare apne guroh (signup_invite_holdout_percent, code mein 20)
          </span>
        </div>
        <div className={cx("exp")}>
          <p>
            <span className={cx("k")}>Umeed</span>
            <span>
              Declared (0232): dawat wale guroh mein 14 din mein account +3 pt zyada (maslan 3 % se 6 %); pehli invoice, ad ki kamai, premium, app mein
              rehna aur install na bigren.
            </span>
          </p>
          <p>
            <span className={cx("k")}>Nateeja</span>
            <span>{data ? signupResult(data) : "—"}</span>
          </p>
        </div>
        {data && data.state === "running" && (
          <div className={cx("small")} style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px" }}>
            <span>{`Guroh: ${fmt(data.population.invited)} dawat · ${fmt(data.population.holdout)} holdout · ${fmt(data.population.paying)} premium guest (alag)`}</span>
            <span>
              {data.plan.weeksMore == null
                ? "Kitne hafte: abhi andaza nahi"
                : data.plan.weeksMore === 0
                  ? "Planned ginti poori"
                  : `${weeksText(data.plan.weeksMore, "+3 pt pakka dekhne")} (${fmt(data.plan.neededInvited)} dawat · ${fmt(data.plan.neededHoldout)} holdout)`}
            </span>
            <span>{`Hamare apne nikale: ${fmt(data.population.ours)} · 1.5.4 ya purane: ${fmt(data.population.olderBuild)} · do baar guroh: ${fmt(data.population.dealtTwice)} · 14 din baqi: ${fmt(data.population.pending14)}`}</span>
          </div>
        )}
        {data?.verdict.breached.map((id) => {
          const k = data.kpis.find((x) => x.id === id);
          return (
            <div key={id} className={cx("strip", "bad")}>
              <Icon name="x" />
              <span>
                <b className={cx("t")}>{`Hifazati number toot gaya: ${signupRowWords(id).name}.`}</b>
                {k && k.lo != null ? `Poori 95 % hadd (${k.lo} se ${k.hi}) had ke buri taraf; n ${fmt(k.a?.n)} · ${fmt(k.b?.n)}. ` : `n ${fmt(k?.a?.n)} · ${fmt(k?.b?.n)}. `}
                {breachWords(k?.onBreach ?? null)}
              </span>
            </div>
          );
        })}
        {rec && (
          <div className={cx("strip", rec.tone)}>
            <Icon name={rec.tone === "bad" ? "x" : rec.tone === "warn" ? "warn" : "info"} />
            <span>
              <b className={cx("t")}>{rec.title}</b>
              {rec.body}
            </span>
          </div>
        )}
      </div>
      <div className={cx("secBody")}>
        {!current && (
          <div className={cx("skel")} aria-hidden="true">
            <div className={cx("sk", "skLine")} style={{ width: "60%" }} />
            <div className={cx("sk", "skBlock")} />
          </div>
        )}
        {current?.kind === "error" && (
          <div className={cx("statebox")}>
            <p>{current.message}</p>
            <button type="button" className={cx("btn", "fill")} onClick={() => setAttempt((a) => a + 1)}>
              <Icon name="refresh" />
              Dobara koshish
            </button>
          </div>
        )}
        {current?.kind === "unavailable" && (
          <div className={cx("strip", current.reason === "computing" ? "info" : "warn")} role="status">
            {current.reason === "computing" ? <span className={cx("spin")} aria-hidden="true" /> : <Icon name="warn" />}
            <span>{unavailableText(current.reason)}</span>
          </div>
        )}
        {data && data.state === "not_started" && (
          <div className={cx("statebox")}>
            <span className={cx("st", "thin")}>
              <Icon name="clock" />
              abhi data nahi
            </span>
            <h3>1.5.5 abhi ship nahi hui: kisi guest phone ko dawat ka guroh nahi mila</h3>
            <p>
              Is waqt mein koi <code>signup_invite_assigned</code> row nahi aayi, is liye koi number nahi dikhaya ja raha. Pehla eligible phone aate hi section
              khud bhar jata hai. <b>Zero ko &quot;theek&quot; nahi likha jata.</b>
            </p>
            {data.plan.neededHoldout != null && (
              <p className={cx("small", "mut")}>
                {`+3 pt (3 % se 6 %) dekhne ke liye takreeban ${fmt(data.plan.neededHoldout)} holdout aur ${fmt(data.plan.neededInvited)} dawat wale phone chahiye jin ke 14 din poore hon.`}
              </p>
            )}
          </div>
        )}
        {data && data.state === "running" && <Running data={data} />}
        <div className={cx("foot")}>
          <b>Switch:</b> <code>signup_exit_invite_enabled</code> (toot par band), <code>signup_invite_holdout_percent</code>, <code>account_safety_line_enabled</code>,{" "}
          <code>signup_invite_cap_exits</code>, <code>signup_invite_cap_per_week</code>. Holdout ka code-default 20, 0 nahi.
          <ul>
            <li>Dawat kabhi invoice banane, kharidne ya ad ke beech nahi aati (0231): ye panel bhi aisa koi mashwara nahi deta.</li>
            <li>Premium guests (deal par paying=true) dono gurohon se bahar hain, chahe bucket ne koi bhi guroh diya ho: unki apni qatar, faisle mein nahi.</li>
            <li>Play ke crash, ANR aur uninstall: source baqi; uninstall ki jagah andaza.</li>
          </ul>
        </div>
      </div>
    </section>
  );
}

function Bar({ label, m, colour }: { label: string; m: MechanismStep; colour?: string }) {
  const share = m.n > 0 ? (m.x / m.n) * 100 : null;
  return (
    <div className={cx("pbar")}>
      <span>{label}</span>
      <span className={cx("tr")}>
        <i style={{ width: `${share == null ? 0 : Math.round(share)}%`, background: colour }} />
      </span>
      <span className={cx("num")}>
        <b>{share == null ? "—" : pct(share, 0)}</b> <span className={cx("mut")}>{`${fmt(m.x)} / ${fmt(m.n)}`}</span>
      </span>
    </div>
  );
}

function Running({ data }: { data: SignupInviteResponse }) {
  const levels = Object.entries(data.shownByLevel);
  const levelTotal = levels.reduce((a, [, v]) => a + v, 0);
  return (
    <>
      {(data.capViolations.x > 0 || data.holdoutShownPhones > 0) && (
        <div className={cx("strip", "warn")}>
          <Icon name="warn" />
          <span>
            <b className={cx("t")}>{`Had se zyada dawat: ${fmt(data.capViolations.x)} · holdout ke ${fmt(data.holdoutShownPhones)} phone ne dawat dekhi.`}</b>
            Dono 0 hone chahiye (3 exit mein 1, hafte mein 3; holdout ko kabhi nahi). App ka hisaab check karein.
          </span>
        </div>
      )}
      <KpiTable kpis={data.kpis} nameA={ON} nameB={OFF} wordsFor={signupRowWords} subFor={(g) => (g === "g1" ? "eligible hone ke 14 din" : undefined)} />
      <div className={cx("charts")}>
        <figure className={cx("cc")}>
          <header>
            <h4>Dawat ke qadam (sirf dawat wala guroh)</h4>
          </header>
          <div className={cx("idea")}>Kahan log ruke: dawat dikhi → Google ya email → sign-in poora → guest ka kaam juda. Har qatar mein ginti.</div>
          {data.mechanism.map((m) => (
            <Bar key={m.key} label={SIGNUP_MECHANISM_WORDS[m.key] ?? m.key} m={m} />
          ))}
          <Bar label="Had se zyada dawat (0 hona chahiye)" m={data.capViolations} colour="var(--bad)" />
        </figure>
        <figure className={cx("cc")}>
          <header>
            <h4>Safety level aur doosri qatarain</h4>
          </header>
          <div className={cx("idea")}>Dawat kis safety level par dikhi; premium guests; account bana kar 7 din mein wapas na aane wale (ulta asar).</div>
          {levels.map(([k, v]) => (
            <Bar key={k} label={`Dawat dikhi: ${SIGNUP_LEVEL_WORDS[k] ?? k}`} m={{ key: k, x: v, n: levelTotal }} />
          ))}
          <Bar label="Premium guest: 14 din mein account" m={data.paying} colour="var(--arm-b)" />
          <Bar label="Account bana, 7 din mein wapas nahi aaye" m={data.signupsGone7} colour="var(--arm-b)" />
        </figure>
      </div>
    </>
  );
}
