"use client";

import { useEffect, useState } from "react";
import { getErrorMessage } from "@/lib/api";
import { releaseImpactApi, unavailableReason } from "../api";
import type { RangeChoice, SecondInvoiceResponse, Unavailable } from "../types";
import {
  MECHANISM_WORDS,
  SECOND_INVOICE_BADGE,
  breachWords,
  day,
  fmt,
  pct,
  recommendationWords,
  rowWords,
  secondInvoiceResult,
  secondInvoiceRowWords,
  unavailableText,
} from "../words";
import { CohortChart, FunnelChart } from "./Charts";
import { KpiTable } from "./KpiTable";
import { Icon, cx } from "./shared";

type Load = { rk: string; kind: "ok"; data: SecondInvoiceResponse } | { rk: string; kind: "unavailable"; reason: Unavailable } | { rk: string; kind: "error"; message: string };

const ON = "Nudge ke saath";
const OFF = "Bina nudge (control)";

/**
 * The "Doosri invoice" section (decision 0227, the test of 0228 §2, the approved mockup's frame 4 sketch, the four goals of
 * 0229), round 2 of the Release Impact page. Its own read and cache; until a phone is dealt an arm it shows the honest
 * "not shipped" state and no number.
 */
export default function SecondInvoiceSection({ range, onFail }: { range: RangeChoice; onFail: (e: unknown) => boolean }) {
  const [attempt, setAttempt] = useState(0);
  const [load, setLoad] = useState<Load | null>(null);
  const rk = String(range);

  useEffect(() => {
    let cancelled = false;
    releaseImpactApi
      .secondInvoice(range)
      .then((data) => !cancelled && setLoad({ rk, kind: "ok", data }))
      .catch((e) => {
        if (cancelled || onFail(e)) return;
        const reason = unavailableReason(e);
        setLoad(reason ? { rk, kind: "unavailable", reason } : { rk, kind: "error", message: getErrorMessage(e, "Doosri invoice ka hisaab load nahi hua.") });
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

  return (
    <section className={cx("card", "sec", data?.verdict.badge === "worse" && "broken")} aria-labelledby="ri-second">
      <div className={cx("secHead")}>
        <div className={cx("secTop")}>
          <div>
            <h2 id="ri-second">Doosri invoice: teen nudge, ek holdout</h2>
            <div className={cx("facts")}>
              <span>
                <Icon name="phone" />
                Android (C sirf Android; A aur B iOS par bhi)
              </span>
              <span>
                <Icon name="cal" />
                <b>1.5.4</b> (118) · 21 Oct · 99 %
              </span>
              {data && (
                <span>
                  {`${day(data.range.from)} – ${day(data.range.to)}`}
                </span>
              )}
              <span>
                Badlav: <b>Next step card (A), Repeat (B), unpaid reminder (C)</b>
              </span>
            </div>
          </div>
          <div style={{ display: "grid", gap: 6, justifyItems: "end" }}>
            <span className={cx("badge", badge.cls)}>
              <Icon name={badge.icon === "eq" ? "info" : badge.icon} />
              <span>
                {badge.word}
                <small>{data ? (data.state === "not_started" ? badge.small : `${badge.small} · primary se`) : "hisaab ho raha hai"}</small>
              </span>
            </span>
          </div>
        </div>
        <div className={cx("kinds")}>
          <span className={cx("kind", "rand")}>
            <Icon name="users" />
            Random: hamare apne guroh (nudges_holdout_percent, code mein 20)
          </span>
        </div>
        <div className={cx("exp")}>
          <p>
            <span className={cx("k")}>Umeed</span>
            <span>
              Declared (0227): 7 din mein doosri invoice 14.2 % se +4 pt (18.2 %); koi hifazati number na bigre; do invoice ka ek number 0; chaar maqsad neeche
              na jayen.
            </span>
          </p>
          <p>
            <span className={cx("k")}>Nateeja</span>
            <span>{data ? secondInvoiceResult(data) : "—"}</span>
          </p>
        </div>
        {data && data.state === "running" && <Plan data={data} />}
        {data?.verdict.breached.map((id) => (
          <div key={id} className={cx("strip", "bad")}>
            <Icon name="x" />
            <span>
              <b className={cx("t")}>{`Hifazati number toot gaya: ${secondInvoiceRowWords(id).name}.`}</b>
              {data.kpis
                .filter((k) => k.id === id)
                .map((k) => `Poori 95 % hadd (${k.lo} se ${k.hi}) had ke buri taraf; n ${fmt(k.a?.n)} · ${fmt(k.b?.n)}. `)}
              {breachWords(data.kpis.find((k) => k.id === id)?.onBreach ?? null)}
            </span>
          </div>
        ))}
        {data && data.state === "running" && <Recommendation data={data} />}
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
        {data && data.state === "not_started" && <NotStarted data={data} />}
        {data && data.state === "running" && <Running data={data} />}
        <div className={cx("foot")}>
          <b>Switch jo toot par naam hote hain:</b> <code>next_step_card_enabled</code>, <code>repeat_action_enabled</code>, <code>unpaid_reminder_enabled</code>,{" "}
          <code>nudges_holdout_percent</code>. Holdout ka code-default test ki value (20) hai, 0 nahi.
          <ul>
            <li>Reminder se payment aayi ya nahi ye naapa nahi ja sakta: sirf khud darj ki gayi payment dikhti hai.</li>
            <li>Ek bundle: teeno mein se kaunsa kaam aaya, ye primary nahi batata; har nudge ke qadam neeche alag dikhte hain.</li>
            <li>Pehli invoice = 90 din ki look-back mein phone ki pehli invoice. Jin phones ko guroh nahi mila, wo alag gine jaate hain, kisi taraf nahi.</li>
            <li>Play ka uninstall: source baqi; uski jagah andaza &quot;pehli invoice ke baad 14 din mein phir nahi aaye&quot;.</li>
          </ul>
        </div>
      </div>
    </section>
  );
}

function NotStarted({ data }: { data: SecondInvoiceResponse }) {
  return (
    <div className={cx("statebox")}>
      <span className={cx("st", "thin")}>
        <Icon name="clock" />
        abhi data nahi
      </span>
      <h3>Is waqt mein kisi phone ko nudge ka guroh nahi mila</h3>
      <p>
        Is waqt mein koi <code>nudges_assigned</code> row nahi aayi, is liye koi number nahi dikhaya ja raha. 1.5.4 se pehle ke waqt mein ye theek hai; 1.5.4
        ke phones ke waqt mein ye khamoshi hai: Health Centre ki <code>feature-events-arriving</code> check dekhein. <b>Zero ko &quot;theek&quot; nahi likha jata.</b>
      </p>
      <p className={cx("small", "mut")}>
        {`Is waqt ${fmt(data.population.firstInvoices)} phones ne pehli invoice banayi (sab bina guroh${data.population.ours ? `, ${fmt(data.population.ours)} hamare apne nikale` : ""}). `}
        {data.plan.neededPerArm != null &&
          `+4 pt (14.2 % se 18.2 %) dekhne ke liye har guroh mein takreeban ${fmt(data.plan.neededPerArm)} phone chahiye jin ke 7 din poore hon.`}
      </p>
    </div>
  );
}

function Plan({ data }: { data: SecondInvoiceResponse }) {
  const p = data.plan;
  return (
    <div className={cx("small")} style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px" }}>
      <span>{`Guroh: ${fmt(data.holdout.on)} nudge ke saath · ${fmt(data.holdout.off)} control`}</span>
      <span>{`Har hafte: ${p.perWeekOn} · ${p.perWeekOff} naye pehli-invoice phone`}</span>
      <span>
        {p.weeksMore == null
          ? "Kitne hafte: abhi andaza nahi (kisi guroh mein naye phone nahi)"
          : p.weeksMore === 0
            ? `Dono guroh mein ${fmt(p.neededPerArm)} phone poore`
            : `+4 pt pakka dekhne mein takreeban ${p.weeksMore} hafte aur (${fmt(p.neededPerArm)} phone har guroh)`}
      </span>
      <span>{`Guroh nahi mila: ${fmt(data.population.unassigned)} · hamare apne nikale: ${fmt(data.population.ours)} · 7 din baqi: ${fmt(data.population.pending7)}`}</span>
    </div>
  );
}

function Recommendation({ data }: { data: SecondInvoiceResponse }) {
  const rec = recommendationWords({ section: { recommendation: data.recommendation, kpis: data.kpis, currentName: "1.5.4" } } as never);
  if (!rec) {
    return (
      <div className={cx("strip", "neu")}>
        <Icon name="info" />
        <span>
          <b className={cx("t")}>Sifarish abhi nahi.</b> Sifarish sirf parhne ki tareekhon par (pehle guroh ke 24 ghante, din 7, din 30 baad).
        </span>
      </div>
    );
  }
  return (
    <div className={cx("strip", rec.tone)}>
      <Icon name={rec.tone === "bad" ? "x" : rec.tone === "warn" ? "warn" : "info"} />
      <span>
        <b className={cx("t")}>{rec.title}</b>
        {rec.body}
      </span>
    </div>
  );
}

function Running({ data }: { data: SecondInvoiceResponse }) {
  const ladder = {
    firstOpensA: data.funnel.firstInvoiceOn,
    firstOpensB: data.funnel.firstInvoiceOff,
    steps: data.funnel.steps.map((s) => ({ key: s.key, a: s.on, b: s.off })),
  };
  const curve = data.curve.map((p) => ({ day: p.day, a: p.on, b: p.off }));
  const on = data.shareToSecond.on;
  const off = data.shareToSecond.off;
  const maxH = Math.max(1, on.p75 ?? 0, off.p75 ?? 0);
  return (
    <>
      {data.offArmNudgePhones > 0 && (
        <div className={cx("strip", "warn")}>
          <Icon name="warn" />
          <span>
            <b className={cx("t")}>{`Control ke ${fmt(data.offArmNudgePhones)} phone ne nudge dekha.`}</b>
            Control mein nudge nahi dikhna chahiye: app ka guroh check karein. Ye phone dono taraf ke hisaab mein waise hi gine gaye.
          </span>
        </div>
      )}
      <div className={cx("charts")}>
        <FunnelChart
          ladder={ladder as never}
          nameA={ON}
          nameB={OFF}
          text={{
            title: "Pehli invoice se doosri invoice tak",
            idea: "Sawal: nudge ne doosri invoice badhayi? Dono guroh saath saath, whisker = 95 % hadd.",
            note: "Sirf wo phone jin ke 7 din poore hue. Holdout random hai.",
            empty: "Abhi kisi phone ke 7 din poore nahi hue.",
          }}
        />
        <CohortChart
          points={curve}
          nameA={ON}
          nameB={OFF}
          text={{
            title: "Doosri invoice kab bani (pehli invoice ke baad)",
            idea: "Sawal: kitne phone ne doosri invoice bana li, din ba din? Shaded patti = 95 % hadd.",
            note: "Din 1, din 7 par parha jata hai.",
            empty: "Abhi kisi phone ke 7 din poore nahi hue.",
          }}
        />
      </div>
      <KpiTable kpis={data.kpis} nameA={ON} nameB={OFF} wordsFor={secondInvoiceRowWords} subFor={(g) => (g === "g1" ? "pehli invoice ke baad" : undefined)} />
      <div className={cx("charts")}>
        <figure className={cx("cc")}>
          <header>
            <h4>Har nudge ke qadam (sirf nudge wale guroh)</h4>
          </header>
          <div className={cx("idea")}>Kaun sa hissa kaam kar raha hai, ye yahan dikhta hai; primary ka nateeja is se nahi badalta. Har qatar mein ginti.</div>
          <table className={cx("tbl")}>
            <tbody>
              {data.mechanism.map((m) => (
                <tr key={m.key}>
                  <th scope="row">
                    {`${MECHANISM_WORDS[m.key]?.nudge ?? ""} · ${MECHANISM_WORDS[m.key]?.name ?? m.key}`}
                  </th>
                  <td>
                    <span className={cx("v")}>{m.n > 0 ? pct((m.x / m.n) * 100, 0) : "—"}</span>
                    <span className={cx("nn")}>{`${fmt(m.x)} / ${fmt(m.n)}`}</span>
                  </td>
                </tr>
              ))}
              <tr>
                <th scope="row">Copy jis mein raqam nahi badli</th>
                <td>
                  <span className={cx("v")}>{data.repeatAmountsUnchanged.n > 0 ? pct((data.repeatAmountsUnchanged.x / data.repeatAmountsUnchanged.n) * 100, 0) : "—"}</span>
                  <span className={cx("nn")}>{`${fmt(data.repeatAmountsUnchanged.x)} / ${fmt(data.repeatAmountsUnchanged.n)} · sirf dekha jata hai, maqsad nahi`}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </figure>
        <figure className={cx("cc")}>
          <header>
            <h4>Qadamon ke beech waqt</h4>
          </header>
          <div className={cx("idea")}>Pehle share se doosri invoice tak, ghante: median aur p75, dono guroh. Sirf dekhne ke liye.</div>
          {[
            ["Nudge ke saath · median", on.median, "var(--arm-a)", on.n],
            ["Bina nudge · median", off.median, "var(--arm-b)", off.n],
            ["Nudge ke saath · p75", on.p75, "var(--arm-a)", on.n],
            ["Bina nudge · p75", off.p75, "var(--arm-b)", off.n],
          ].map(([label, v, c, n]) => (
            <div key={label as string} className={cx("pbar")}>
              <span>{label as string}</span>
              <span className={cx("tr")}>
                <i style={{ width: `${v == null ? 0 : Math.round(((v as number) / maxH) * 100)}%`, background: c as string }} />
              </span>
              <span className={cx("num")}>
                <b>{v == null ? "—" : `${v} ghante`}</b> <span className={cx("mut")}>{`n ${fmt(n as number)}`}</span>
              </span>
            </div>
          ))}
        </figure>
      </div>
      <p className={cx("small", "mut")}>
        {`Holdout ki value kahan se aayi: ${Object.entries(data.holdout.percentSources)
          .map(([k, v]) => `${k} ${fmt(v)}`)
          .join(" · ")}. Guroh ka hissa: ${Object.entries(data.holdout.holdoutPercents)
          .map(([k, v]) => `${k} % par ${fmt(v)}`)
          .join(" · ")}. ${rowWords("second_7d").mean}.`}
      </p>
    </>
  );
}
