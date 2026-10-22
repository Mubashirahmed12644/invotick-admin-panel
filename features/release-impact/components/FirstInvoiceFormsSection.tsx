"use client";

import { useEffect, useState } from "react";
import { getErrorMessage } from "@/lib/api";
import { releaseImpactApi, unavailableReason } from "../api";
import type { FirstFormsResponse, FormsComparison, MechanismStep, RangeChoice, Unavailable } from "../types";
import {
  FORMS_ARM_WORDS,
  FORMS_STEP_WORDS,
  FORMS_TAB_WORDS,
  SECOND_INVOICE_BADGE,
  breachWords,
  day,
  fmt,
  formsRecommendationWords,
  formsResult,
  formsRowWords,
  msText,
  pct,
  unavailableText,
  usdSigned,
  weeksText,
} from "../words";
import { KpiTable } from "./KpiTable";
import { Icon, cx } from "./shared";

type Load = { rk: string; kind: "ok"; data: FirstFormsResponse } | { rk: string; kind: "unavailable"; reason: Unavailable } | { rk: string; kind: "error"; message: string };

/** The section's badge: a breach anywhere wins, then a better comparison, then thin. */
function overall(d: FirstFormsResponse | null): string {
  if (!d || d.state === "not_started") return "not_started";
  const b = d.comparisons.map((c) => c.verdict.badge);
  if (b.includes("worse")) return "worse";
  if (b.includes("better")) return "better";
  if (b.length && b.every((x) => x === "thin")) return "thin";
  return b.length ? "plain" : "thin";
}

/**
 * The "First invoice forms" section (decision 0234; registry 160), round 5 of the Release Impact page: the tabs (orders
 * A, B, C, one at a time against control) and the preview-first road (against today). Its own read and cache. Until a
 * new phone is dealt by either switch (both code defaults deal nobody) it shows the honest "not started" state.
 */
export default function FirstInvoiceFormsSection({ range, onFail }: { range: RangeChoice; onFail: (e: unknown) => boolean }) {
  const [attempt, setAttempt] = useState(0);
  const [load, setLoad] = useState<Load | null>(null);
  const rk = String(range);

  useEffect(() => {
    let cancelled = false;
    releaseImpactApi
      .firstInvoiceForms(range)
      .then((data) => !cancelled && setLoad({ rk, kind: "ok", data }))
      .catch((e) => {
        if (cancelled || onFail(e)) return;
        const reason = unavailableReason(e);
        setLoad(reason ? { rk, kind: "unavailable", reason } : { rk, kind: "error", message: getErrorMessage(e, "Pehli invoice ke forms ka hisaab load nahi hua.") });
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
  const key = overall(data);
  const badge = SECOND_INVOICE_BADGE[key];

  return (
    <section className={cx("card", "sec", key === "worse" && "broken")} aria-labelledby="ri-forms">
      <div className={cx("secHead")}>
        <div className={cx("secTop")}>
          <div>
            <h2 id="ri-forms">Pehli invoice ke forms: tabs aur preview pehle</h2>
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
                Badlav: <b>naye phone par teen sheets ki jagah ek screen, teen tabs (item, business, client), ek waqt mein ek order; aur Create invoice ke baad poori invoice ka preview khud</b>
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
            Random: do switch, har ek apna control (first_forms_order + first_forms_flow_percent; first_invoice_post_arm + first_invoice_post_percent)
          </span>
        </div>
        <div className={cx("exp")}>
          <p>
            <span className={cx("k")}>Umeed</span>
            <span>
              Declared (0234): har order aur preview pehle, apne control ke muqable mein, 24 ghante mein ASLI invoice ya invoice bani 18 % se 22 % (+4 pt); har guroh mein
              takreeban 1,600 phone.
            </span>
          </p>
          <p>
            <span className={cx("k")}>Ginti</span>
            <span>Qadam phones mein gine jate hain, rows mein nahi: tabs par item ka naam aur price do row bhejte hain.</span>
          </p>
        </div>
        {data && data.state === "running" && (
          <div className={cx("small")} style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px" }}>
            <span>{`Forms: ${Object.entries(data.population.forms).filter(([, v]) => v > 0).map(([k, v]) => `${FORMS_ARM_WORDS[k] ?? k} ${fmt(v)}`).join(" · ") || "koi nahi"}`}</span>
            <span>{`Preview: ${Object.entries(data.population.post).filter(([, v]) => v > 0).map(([k, v]) => `${FORMS_ARM_WORDS[k] ?? k} ${fmt(v)}`).join(" · ") || "koi nahi"}`}</span>
            <span>{`Naye phone ${fmt(data.population.newPhones)} · hamare apne nikale: ${fmt(data.population.ours)} · 1.5.4 ya purane: ${fmt(data.population.olderBuild)} · 24 ghante baqi: ${fmt(data.population.pending24)}`}</span>
          </div>
        )}
        {data && data.state === "running" && <DataErrors data={data} />}
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
            <h3>Forms ka test abhi shuru nahi: kisi naye phone ko guroh nahi mila</h3>
            <p>
              Is waqt mein koi <code>first_forms_assigned</code> ya <code>first_invoice_post_assigned</code> row nahi aayi. 1.5.5 ship hone aur{" "}
              <code>first_forms_order</code> (A, phir C, phir B) ya <code>first_invoice_post_arm</code> = preview_first hone tak ye khali rehta hai: code mein dono kisi ko
              nahi baant-te. <b>Zero ko &quot;theek&quot; nahi likha jata.</b>
            </p>
            <p className={cx("small", "mut")}>{`+4 pt (18 % se 22 %) dekhne ke liye har guroh mein takreeban 1,569 phone chahiye jin ke 24 ghante poore hon; 50 % par ek order takreeban 1.3 hafte.`}</p>
            {data.population.formsUnassigned > 0 && <p className={cx("small", "mut")}>{`Is waqt ke naye phone jinhen koi guroh nahi mila: ${fmt(data.population.formsUnassigned)}.`}</p>}
          </div>
        )}
        {data && data.state === "running" && <Running data={data} />}
        <div className={cx("foot")}>
          <b>Switch:</b> <code>first_forms_order</code> = control (tabs band, aaj ki sheets), <code>first_forms_flow_percent</code>, <code>first_invoice_post_arm</code> = today
          (preview khud nahi khulta), <code>first_invoice_post_percent</code>. Code mein dono band.
          <ul>
            <li>Tab-ba-tab girawat sirf apne guroh ke andar; guroh ke darmiyan sirf aakhri nateeja (0234).</li>
            <li>Ad ki kamai qeemat hai, rang nahi; koi ad, paywall ya Save gate hataane ka mashwara nahi.</li>
            <li>Tabs ke peeche create screen ka banner nahi banta: dono guroh mein invoice_screen banner fi naya phone dekhein. Play ke crash/ANR: source baqi.</li>
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
        <i style={{ width: `${share == null ? 0 : Math.min(100, Math.round(share))}%`, background: colour }} />
      </span>
      <span className={cx("num")}>
        <b>{share == null ? "—" : pct(share, 0)}</b> <span className={cx("mut")}>{`${fmt(m.x)} / ${fmt(m.n)}`}</span>
      </span>
    </div>
  );
}

function DataErrors({ data }: { data: FirstFormsResponse }) {
  const i = data.integrity;
  const lines: string[] = [];
  if (i.badFormsArm + i.badPostArm > 0) lines.push(`${fmt(i.badFormsArm + i.badPostArm)} phone ka guroh na-maloom (${i.badValues.join(", ")})`);
  if (i.stampMismatch > 0) lines.push(`forms_arm / post_arm deal se alag: ${fmt(i.stampMismatch)} / ${fmt(i.stampRows)} rows`);
  if (i.switchNotOk > 0) lines.push(`${fmt(i.switchNotOk)} deal par switch ki value parhi nahi gayi (order_ok / arm_ok = false)`);
  if (i.percentNotRemote > 0) lines.push(`${fmt(i.percentNotRemote)} deal ka percent Remote Config se nahi aaya`);
  if (i.dealtTwice > 0) lines.push(`${fmt(i.dealtTwice)} phone do baar baante gaye`);
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

/** Below 200 phones a side nothing on the card is a result: the counts are shown, and said to be counts. */
const MIN_PHONES = 200;

function thinNote(n: number): string {
  return n < MIN_PHONES ? ` Abhi ${fmt(n)} phone: ye sirf ginti hai, nateeja nahi (${fmt(MIN_PHONES)} par parhein).` : "";
}

function ComparisonBlock({ c }: { c: FormsComparison }) {
  const rec = formsRecommendationWords(c);
  const g1 = c.kpis.find((k) => k.id === "g1_24h");
  // With few phones every guardrail reads "data kam": show the G1 rows and keep the rest one tap away.
  const thin = Math.min(g1?.a?.n ?? 0, g1?.b?.n ?? 0) < MIN_PHONES && c.verdict.breached.length === 0;
  const [all, setAll] = useState(false);
  const hasPrice = c.adUsdPer1000Variant != null || c.adUsdPer1000Control != null;
  const nameA = FORMS_ARM_WORDS[c.key] ?? c.key;
  const nameB = FORMS_ARM_WORDS[c.control] ?? c.control;
  return (
    <figure className={cx("cc")}>
      <header>
        <h4>{`${nameA} bamuqabla ${nameB}`}</h4>
        <span className={cx("small", "mut")}>{c.windowFrom ? `pehli baar khulne ke din: ${day(c.windowFrom)} – ${day(c.windowTo)}` : "poora waqt"}</span>
      </header>
      <div className={cx("idea")}>
        <b>Nateeja: </b>
        {formsResult(c)}{" "}
        {c.plan.weeksMore == null
          ? "Kitne hafte: abhi andaza nahi."
          : c.plan.weeksMore === 0
            ? "Planned ginti poori."
            : `${weeksText(c.plan.weeksMore, "+4 pt pakka dekhne")} (${fmt(c.plan.neededPerArm)} phone har guroh).`}
      </div>
      {c.verdict.breached.map((id) => {
        const k = c.kpis.find((x) => x.id === id);
        return (
          <div key={id} className={cx("strip", "bad")}>
            <Icon name="x" />
            <span>
              <b className={cx("t")}>{`Hifazati number toot gaya: ${formsRowWords(id).name}.`}</b>
              {k && k.lo != null ? `Poori 95 % hadd (${k.lo} se ${k.hi}); n ${fmt(k.a?.n)} · ${fmt(k.b?.n)}. ` : ""}
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
      <p className={cx("small")}>
        {hasPrice
          ? `Qeemat (rang nahi): ad ki kamai fi 1,000 naye phones, 7 din: ${c.adUsdPer1000Variant == null ? "—" : `$${c.adUsdPer1000Variant.toFixed(2)}`} bamuqabla ${c.adUsdPer1000Control == null ? "—" : `$${c.adUsdPer1000Control.toFixed(2)}`}, farq ${usdSigned(c.adUsdDiffPer1000)}${c.adUsdDiffLo == null ? "" : ` (hadd ${usdSigned(c.adUsdDiffLo)} se ${usdSigned(c.adUsdDiffHi)})`}.`
          : "Qeemat (rang nahi): abhi kisi phone ke 7 din poore nahi, ad ki kamai ka muqabla baad mein."}
      </p>
      {thin && (
        <div className={cx("small")} style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <span>{`Dono taraf ${fmt(MIN_PHONES)} phone hone tak sirf G1 ki qataarain; baqi hifazati number sab "data kam" hain.`}</span>
          <button type="button" className={cx("btn")} onClick={() => setAll((v) => !v)} aria-expanded={all}>
            {all ? "Sirf G1 dikhayein" : "Sab qataarain dikhayein"}
          </button>
        </div>
      )}
      <KpiTable
        only={thin && !all ? ["primary"] : undefined}
        kpis={c.kpis}
        nameA={c.key === "preview_first" ? "Preview pehle" : `Order ${c.key.slice(-1).toUpperCase()}`}
        nameB={c.control === "today" ? "Aaj jaisa" : "Control"}
        wordsFor={formsRowWords}
        subFor={(g) => (g === "primary" ? "pehli baar khulne se; 24 ghante faisla, 7 din parhne ki tareekh" : g === "ltv" ? "sirf bayan: rang nahi" : undefined)}
      />
    </figure>
  );
}

function Running({ data }: { data: FirstFormsResponse }) {
  const p = data.preview;
  return (
    <>
      {data.comparisons.length === 0 && (
        <div className={cx("strip", "info")}>
          <Icon name="info" />
          <span>Abhi sirf control ya aaj-jaisa guroh ke phone: muqabla tab banega jab koi order ya preview pehle wala phone aaye.</span>
        </div>
      )}
      {data.comparisons.map((c) => (
        <ComparisonBlock key={c.key} c={c} />
      ))}
      <div className={cx("charts")}>
        {data.funnels.map((f) => (
          <figure key={f.arm} className={cx("cc")}>
            <header>
              <h4>{`Raasta: ${FORMS_ARM_WORDS[f.arm] ?? f.arm}`}</h4>
            </header>
            <div className={cx("idea")}>{`Guroh milne ke 24 ghante mein, phones mein (rows nahi). Shuru: ${fmt(f.dealt24)} phone.${thinNote(f.dealt24)}`}</div>
            {f.steps.map((s) => (
              <Bar key={s.key} label={s.tab ? `Tab ${s.key.slice(-1)}: ${FORMS_TAB_WORDS[s.tab] ?? s.tab}` : (FORMS_STEP_WORDS[s.key] ?? s.key)} m={{ key: s.key, x: s.phones, n: f.dealt24 }} />
            ))}
          </figure>
        ))}
        {data.tabs.length > 0 && (
          <figure className={cx("cc")}>
            <header>
              <h4>Har tab: kitne pahunche, kitne aage gaye, kitna waqt</h4>
            </header>
            <div className={cx("idea")}>{`Aage = agla tab ya Create invoice ka poora hona. Waqt = tab dikhne se agle qadam tak (median).${thinNote(Math.max(...data.tabs.map((t) => t.reached)))}`}</div>
            {data.tabs.map((t) => (
              <Bar
                key={`${t.arm}-${t.step}`}
                label={`${FORMS_ARM_WORDS[t.arm]?.split(":")[0] ?? t.arm} · tab ${t.step} ${FORMS_TAB_WORDS[t.tab] ?? t.tab}: median ${msText(t.medianMs)}`}
                m={{ key: t.tab, x: t.passed, n: t.reached }}
              />
            ))}
            {Object.entries(data.msInFormsMedian).map(([arm, ms]) => (
              <p key={arm} className={cx("small")}>{`${FORMS_ARM_WORDS[arm]?.split(":")[0] ?? arm}: pehle tab se Create invoice tak median ${msText(ms)}`}</p>
            ))}
          </figure>
        )}
        {(data.refusals.length > 0 || data.closes.length > 0) && (
          <figure className={cx("cc")}>
            <header>
              <h4>Kahan roke gaye, kahan chhoda</h4>
            </header>
            <div className={cx("idea")}>Inkaar = Next / Create dabaya magar naam ya price khali tha (field ke saath). Chhoda = X ya back (tab ke saath).</div>
            {data.refusals.map((r) => (
              <p key={`${r.arm}-${r.tab}-${r.field}`} className={cx("small")}>
                {`${FORMS_ARM_WORDS[r.arm]?.split(":")[0] ?? r.arm} · ${FORMS_TAB_WORDS[r.tab] ?? r.tab} ka ${r.field === "price" ? "price" : "naam"} khali: ${fmt(r.rows)} baar, ${fmt(r.phones)} phone`}
              </p>
            ))}
            {data.closes.map((x) => (
              <p key={`${x.arm}-${x.tab}-${x.method}`} className={cx("small")}>
                {`${FORMS_ARM_WORDS[x.arm]?.split(":")[0] ?? x.arm} · ${FORMS_TAB_WORDS[x.tab] ?? x.tab} par ${x.method === "back_press" ? "back" : "X"}: ${fmt(x.phones)} phone (${fmt(x.withInput)} ne kuch likha tha)`}
              </p>
            ))}
          </figure>
        )}
        {p.dealt24 > 0 && (
          <figure className={cx("cc")}>
            <header>
              <h4>Preview pehle: kya hua</h4>
            </header>
            <div className={cx("idea")}>{`Preview pehle wale ${fmt(p.dealt24)} phone (24 ghante). Save, Add item, Edit ek chunao hain; swipe aur bahar tap = bina chunao chhoda.${thinNote(p.dealt24)}`}</div>
            <Bar label="Preview khud khula" m={{ key: "shown", x: p.shownPhones, n: p.dealt24 }} />
            <Bar label="Save dabaya" m={{ key: "save", x: p.savePhones, n: p.shownPhones }} />
            <Bar label="Add item dabaya" m={{ key: "add", x: p.addItemPhones, n: p.shownPhones }} />
            <Bar label="Edit dabaya" m={{ key: "edit", x: p.editPhones, n: p.shownPhones }} />
            <Bar label="Neeche swipe kiya" m={{ key: "swipe", x: p.closeSwipePhones, n: p.shownPhones }} colour="var(--arm-b)" />
            <Bar label="Bahar tap ya back" m={{ key: "scrim", x: p.closeScrimPhones, n: p.shownPhones }} colour="var(--arm-b)" />
            <p className={cx("small")}>
              {`Create invoice se preview tak (median): ${msText(p.msSinceCompleteP50)} (${fmt(p.msSinceCompleteN)} baar) · had 1.5 s: ${p.speed === "ok" ? "theek" : p.speed === "slow" ? "dheema (peela)" : "ginti kam (30 se kam)"}`}
            </p>
            <p className={cx("small")}>{`Guroh milne se preview tak (median): ${msText(p.openToPreviewMedianMs)}`}</p>
          </figure>
        )}
        {data.crossTab.length > 1 && (
          <figure className={cx("cc")}>
            <header>
              <h4>Dono switch saath: ASLI invoice 24 ghante</h4>
            </header>
            <div className={cx("idea")}>{`Har khana: forms guroh × preview guroh. Sirf bayan; faisla upar ke muqablon se.${thinNote(Math.min(...data.crossTab.map((x) => x.phones)))}`}</div>
            {data.crossTab.map((x) => (
              <Bar key={`${x.forms}-${x.post}`} label={`${FORMS_ARM_WORDS[x.forms]?.split(":")[0] ?? x.forms} × ${FORMS_ARM_WORDS[x.post] ?? x.post}`} m={{ key: x.forms, x: x.g1, n: x.phones }} />
            ))}
          </figure>
        )}
      </div>
    </>
  );
}
