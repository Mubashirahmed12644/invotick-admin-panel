"use client";

import { useEffect, useState } from "react";
import { getErrorMessage } from "@/lib/api";
import { releaseImpactApi, unavailableReason } from "../api";
import type { FirstGateResponse, MechanismStep, RangeChoice, Unavailable } from "../types";
import {
  GATE_OUTCOME_WORDS,
  GATE_POSITION_WORDS,
  GATE_REASON_WORDS,
  SECOND_INVOICE_BADGE,
  breachWords,
  day,
  fmt,
  gatePriceSentence,
  gateRecommendationWords,
  gateResult,
  gateRowWords,
  pct,
  sg,
  unavailableText,
  usdSigned,
  weeksText,
} from "../words";
import { KpiTable } from "./KpiTable";
import { Icon, cx } from "./shared";

type Load = { rk: string; kind: "ok"; data: FirstGateResponse } | { rk: string; kind: "unavailable"; reason: Unavailable } | { rk: string; kind: "error"; message: string };

const ON = "Move (ad baad mein)";
const OFF = "Show (aaj jaisa)";

/**
 * The "First invoice gate" section (decision 0233; registry 158), round 4 of the Release Impact page. Its own read and
 * cache. Until a new phone is dealt an arm in the range (the Remote Config key's code default is 0) it shows the honest
 * "not started" state and no number. The price of the move is printed with the same weight as G1 and is never a colour:
 * the owner decides the trade, and nothing here says "remove the gate".
 */
export default function FirstInvoiceGateSection({ range, onFail }: { range: RangeChoice; onFail: (e: unknown) => boolean }) {
  const [attempt, setAttempt] = useState(0);
  const [load, setLoad] = useState<Load | null>(null);
  const rk = String(range);

  useEffect(() => {
    let cancelled = false;
    releaseImpactApi
      .firstInvoiceGate(range)
      .then((data) => !cancelled && setLoad({ rk, kind: "ok", data }))
      .catch((e) => {
        if (cancelled || onFail(e)) return;
        const reason = unavailableReason(e);
        setLoad(reason ? { rk, kind: "unavailable", reason } : { rk, kind: "error", message: getErrorMessage(e, "Pehli invoice ke gate ka hisaab load nahi hua.") });
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
  const rec = data && data.state === "running" ? gateRecommendationWords(data) : null;

  return (
    <section className={cx("card", "sec", data?.verdict.badge === "worse" && "broken")} aria-labelledby="ri-gate">
      <div className={cx("secHead")}>
        <div className={cx("secTop")}>
          <div>
            <h2 id="ri-gate">Pehli invoice ka gate: ad save ke baad dashboard par</h2>
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
                Badlav: <b>naye user ki pehli invoice foran save; wahi ad-ya-premium dialog ek baar dashboard par (20 % phones). Ad hat-ta nahi, jagah badalti hai</b>
              </span>
            </div>
          </div>
          <div style={{ display: "grid", gap: 6, justifyItems: "end" }}>
            <span className={cx("badge", badge.cls)}>
              <Icon name={badge.icon === "eq" ? "info" : badge.icon} />
              <span>
                {badge.word}
                <small>{data ? (data.state === "not_started" ? "is waqt mein koi guroh nahi" : `${badge.small} · sirf G1 par`) : "hisaab ho raha hai"}</small>
              </span>
            </span>
          </div>
        </div>
        <div className={cx("kinds")}>
          <span className={cx("kind", "rand")}>
            <Icon name="users" />
            Random: phone ka bucket (first_invoice_gate_move_percent, code mein 0: key lagne tak band)
          </span>
        </div>
        <div className={cx("exp")}>
          <p>
            <span className={cx("k")}>Umeed</span>
            <span>
              Declared (0233): move guroh mein pehli baar khulne ke 24 ghante mein ASLI invoice (share ya payment) zyada. Plan: invoice bani 18 % se +4 pt. Qeemat (ad ki
              kamai, premium) saath saath, faisla aap ka.
            </span>
          </p>
          <p>
            <span className={cx("k")}>Nateeja</span>
            <span>{data ? gateResult(data) : "—"}</span>
          </p>
        </div>
        {data && data.state === "running" && (
          <div className={cx("small")} style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px" }}>
            <span>{`Guroh: ${fmt(data.population.move)} move · ${fmt(data.population.show)} show · naye phone ${fmt(data.population.newPhones)}`}</span>
            <span>
              {data.plan.weeksMore == null
                ? "Kitne hafte: abhi andaza nahi"
                : data.plan.weeksMore === 0
                  ? "Planned ginti poori"
                  : `${weeksText(data.plan.weeksMore, "+4 pt pakka dekhne")} (${fmt(data.plan.neededMove)} move phones)`}
            </span>
            <span>{`Guroh nahi mila: ${fmt(data.population.unassigned)} · hamare apne nikale: ${fmt(data.population.ours)} · 1.5.4 ya purane: ${fmt(data.population.olderBuild)} · 24 ghante baqi: ${fmt(data.population.pending24)}`}</span>
          </div>
        )}
        {data && data.state === "running" && <DataErrors data={data} />}
        {data?.verdict.breached.map((id) => {
          const k = data.kpis.find((x) => x.id === id);
          return (
            <div key={id} className={cx("strip", "bad")}>
              <Icon name="x" />
              <span>
                <b className={cx("t")}>{`Hifazati number toot gaya: ${gateRowWords(id).name}.`}</b>
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
            <h3>Gate ka test abhi shuru nahi: kisi naye phone ko guroh nahi mila</h3>
            <p>
              Is waqt mein koi <code>first_invoice_gate_assigned</code> row nahi aayi. 1.5.5 ship hone aur <code>first_invoice_gate_move_percent</code> 20 hone tak ye
              khali rehta hai (code mein 0). Is liye koi number nahi dikhaya ja raha. <b>Zero ko &quot;theek&quot; nahi likha jata.</b>
            </p>
            {data.population.unassigned > 0 && <p className={cx("small", "mut")}>{`Is waqt ke naye phone jinhen guroh nahi mila: ${fmt(data.population.unassigned)}.`}</p>}
            {data.plan.neededMove != null && (
              <p className={cx("small", "mut")}>{`+4 pt (18 % se 22 %) dekhne ke liye takreeban ${fmt(data.plan.neededMove)} move phones chahiye jin ke 24 ghante poore hon.`}</p>
            )}
          </div>
        )}
        {data && data.state === "running" && <Running data={data} />}
        <div className={cx("foot")}>
          <b>Switch:</b> <code>first_invoice_gate_move_percent</code> (0 = sab phone par dialog save se pehle, aaj jaisa; test 20). Ad unit, premium ka darwaza aur
          baqi har ad wahi.
          <ul>
            <li>Ad ki kamai ka girna khud ba khud &quot;BURA&quot; nahi: wo qeemat hai, sawal aap se. Ye panel kabhi gate, ad ya paywall hataane ka mashwara nahi deta.</li>
            <li>&quot;Ad dekhein&quot; dabana ad dikhne ka saboot nahi (no-fill bhi flow khatam karta hai); asli kamai ad_impression_value se.</li>
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

/** Rows that must be 0 when the app sends what AGENTS-EVENTS 1.41 says: each is a data error, never a result. */
function DataErrors({ data }: { data: FirstGateResponse }) {
  const i = data.integrity;
  const lines: string[] = [];
  if (i.badArm > 0) lines.push(`${fmt(i.badArm)} phone ka guroh na move na show (${i.badArmValues.join(", ")})`);
  if (i.armChanged > 0) lines.push(`${fmt(i.armChanged)} phone ka guroh badla`);
  if (i.savedBeforeDeal > 0) lines.push(`${fmt(i.savedBeforeDeal)} phone ko invoice save karne ke baad guroh mila`);
  if (i.gateArmMismatch > 0) lines.push(`gate_arm ghalat: ${fmt(i.gateArmMismatch)} / ${fmt(i.gateArmRows)} rows`);
  if (i.movedOnShow > 0 || i.afterSaveOnShow > 0) lines.push(`show guroh mein dashboard wala dialog: ${fmt(i.afterSaveOnShow)} phone, ${fmt(i.movedOnShow)} result rows`);
  if (i.percentNotRemote > 0) lines.push(`${fmt(i.percentNotRemote)} phone ka percent Remote Config se nahi aaya`);
  if (data.balance.status === "off")
    lines.push(`move ka hissa ${pct((data.balance.move / Math.max(1, data.balance.total)) * 100)} jab key ${data.balance.expectedPercent} % kehti hai (hadd ${pct(data.balance.lo)} se ${pct(data.balance.hi)})`);
  if (!lines.length) return null;
  return (
    <div className={cx("strip", "warn")}>
      <Icon name="warn" />
      <span>
        <b className={cx("t")}>Data ki galti (0 honi chahiye):</b>
        {lines.join(" · ")}. App ka hisaab check karein; ye nateeja nahi.
      </span>
    </div>
  );
}

function PriceBlock({ data }: { data: FirstGateResponse }) {
  const p = data.price;
  const per = (v: number | null) => (v == null ? "—" : `$${v.toFixed(2)}`);
  const sh = (v: number | null) => (v == null ? "—" : v.toFixed(1));
  return (
    <figure className={cx("cc")}>
      <header>
        <h4>{`Qeemat: har 1,000 naye phones par, pehle ${p.horizonDays} din (G1 jitna hi wazan)`}</h4>
      </header>
      <div className={cx("idea")}>Ad ki kamai (sab formats) aur pehle share, dono guroh. Ye number rang nahi lete: sauda aap ka faisla hai.</div>
      <div className={cx("tblwrap")}>
        <table className={cx("tbl", "stack")}>
          <thead>
            <tr>
              <th>Number</th>
              <th className={cx("cur")}>Move</th>
              <th>Show</th>
              <th>Farq · 95 % hadd</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">
                Ad ki kamai fi 1,000 naye phones
                <small>{`${fmt(p.phonesMove)} · ${fmt(p.phonesShow)} phones · ${fmt(p.adPhonesMove)} · ${fmt(p.adPhonesShow)} ad wale${p.capUsd != null ? ` · ek phone ${per(p.capUsd)} par kata` : ""}`}</small>
              </th>
              <td className={cx("cur")} data-l="Move">
                <span className={cx("v")}>{per(p.usdPer1000Move)}</span>
              </td>
              <td data-l="Show">
                <span className={cx("v")}>{per(p.usdPer1000Show)}</span>
              </td>
              <td data-l="Farq · 95 % hadd">
                <span className={cx("v")}>{usdSigned(p.usdDiffPer1000)}</span>
                <span className={cx("nn")}>{p.usdDiffLo == null ? "" : `${usdSigned(p.usdDiffLo)} se ${usdSigned(p.usdDiffHi)}`}</span>
              </td>
            </tr>
            <tr>
              <th scope="row">
                Pehle share (ASLI invoice) fi 1,000, 7 din
                <small>share (reminder nahi) ya payment</small>
              </th>
              <td className={cx("cur")} data-l="Move">
                <span className={cx("v")}>{sh(p.sharesPer1000Move)}</span>
              </td>
              <td data-l="Show">
                <span className={cx("v")}>{sh(p.sharesPer1000Show)}</span>
              </td>
              <td data-l="Farq · 95 % hadd">
                <span className={cx("v")}>{sg(p.extraSharesPer1000)}</span>
                <span className={cx("nn")}>{p.extraSharesLo == null ? "" : `${sg(p.extraSharesLo)} se ${sg(p.extraSharesHi)}`}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <Bar label="Dashboard wala dialog asal mein dikha (move)" m={{ key: "seen", x: p.movedSeen, n: p.movedOwed }} />
      <p className={cx("small")}>
        <b>Aap se sawal: </b>
        {gatePriceSentence(p)}
      </p>
    </figure>
  );
}

function Running({ data }: { data: FirstGateResponse }) {
  const moved = Object.entries(data.movedResults).filter(([, v]) => v > 0);
  const owed = Object.values(data.movedResults).reduce((a, v) => a + v, 0);
  const reasons = Object.entries(data.notReachedReasons);
  const reasonTotal = reasons.reduce((a, [, v]) => a + v, 0);
  return (
    <>
      <PriceBlock data={data} />
      <KpiTable kpis={data.kpis} nameA={ON} nameB={OFF} wordsFor={gateRowWords} subFor={(g) => (g === "primary" ? "pehli baar khulne se; 24 ghante faisla, 7 din parhne ki tareekh" : g === "ltv" ? "qeemat ka number: rang nahi, faisla aap ka" : undefined)} />
      <div className={cx("charts")}>
        <figure className={cx("cc")}>
          <header>
            <h4>Dialog kahan dikha, aur kya chuna (phones, 7 din)</h4>
          </header>
          <div className={cx("idea")}>Wahi dialog dono jagah: save se pehle (show) ya dashboard par (move). Har qatar: dikha · ad dabaya · premium dabaya · band kiya.</div>
          {data.dialog
            .filter((d) => d.shown + d.watchAd + d.premium + d.dismissed > 0)
            .map((d) => (
              <Bar
                key={`${d.arm}-${d.position}`}
                label={`${d.arm === "move" ? "Move" : "Show"} · ${GATE_POSITION_WORDS[d.position] ?? d.position}: ${fmt(d.watchAd)} ad · ${fmt(d.premium)} premium · ${fmt(d.dismissed)} band`}
                m={{ key: d.position, x: d.shown, n: d.arm === "move" ? data.population.move : data.population.show }}
                colour={d.arm === "move" ? undefined : "var(--arm-b)"}
              />
            ))}
        </figure>
        <figure className={cx("cc")}>
          <header>
            <h4>Dashboard wale dialog ka anjaam (move guroh)</h4>
          </header>
          <div className={cx("idea")}>Har dialog jo banta tha uski ek row: paanchon milakar &quot;banta tha&quot;. Jo kabhi nahi dikha, wo is test ki asal qeemat hai.</div>
          {moved.map(([k, v]) => (
            <Bar key={k} label={GATE_OUTCOME_WORDS[k] ?? k} m={{ key: k, x: v, n: owed }} colour={k === "not_reached" || k === "other" ? "var(--bad)" : undefined} />
          ))}
          {reasons.map(([k, v]) => (
            <Bar key={`r-${k}`} label={`Kyun nahi dikha: ${GATE_REASON_WORDS[k] ?? k}`} m={{ key: k, x: v, n: reasonTotal }} colour="var(--arm-b)" />
          ))}
        </figure>
      </div>
    </>
  );
}
