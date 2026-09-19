"use client";

import { useEffect, useMemo, useState } from "react";
import { api, getErrorMessage } from "@/lib/api";
import { DateRangePicker, defaultRange, toRangeIso, type DayRange } from "@/components/DateRangePicker";
import type { AppVersion } from "@/lib/types";
import type { CompareBy, CompareCell, CompareGroup, ComparisonVerdict, JourneyCompare as Report } from "@/features/funnel-analysis/types";
import styles from "@/features/funnel-analysis/styles/version-comparison.module.css";

/**
 * Muqabla — sab kuch fixed rakh kar SIRF EK cheez badlo (backend decisions 0114, 0116).
 *
 * Maalik ke alfaaz (2026-09-19): "sari cheezain same rakh ker kisi aik cheez ko compare kerny wala
 * mechanism". Upar "kis cheez ka muqabla" chunein (version, mulk, mulk ka tier, install source, ad
 * campaign, platform); baqi har cheez neeche "fixed" filters mein ek hi qeemat par rakhi ja sakti hai.
 * Har naye user ko uski APNI pehli opening se barabar waqt tak dekha jata hai (0114), aur jis ka waqt
 * abhi poora nahi hua wo alag gina jata hai — "nahi banai" mein nahi.
 */

const STEP_LABEL: Record<string, string> = {
  step_1: "Pehli baar app kholi",
  step_2: "Splash screen paar ki",
  step_3: "Invoice wali screen kholi",
  step_4: "Business ka form shuru kiya",
  step_5: "Business save kar liya",
  step_6: "Client save kar liya",
  step_7: "Item add kiya",
  step_8: "Invoice ban gayi",
  shared: "Invoice share ki (share confirm hua — G1)",
};

const BY_OPTIONS: { by: CompareBy; label: string }[] = [
  { by: "version", label: "Version" },
  { by: "tier", label: "Mulk ka tier" },
  { by: "country", label: "Mulk" },
  { by: "source", label: "Install source" },
  { by: "campaign", label: "Ad campaign" },
  { by: "platform", label: "Platform" },
];

const WINDOWS = [
  { hours: 1, label: "1 ghanta (jaldi ka andaza)" },
  { hours: 24, label: "24 ghante" },
  { hours: 72, label: "3 din" },
  { hours: 168, label: "7 din" },
];

const VERDICT: Record<ComparisonVerdict, { text: string; cls: string }> = {
  baseline: { text: "buniyad", cls: "base" },
  behind: { text: "peeche — shor se zyada", cls: "behind" },
  ahead: { text: "aage — shor se zyada", cls: "ahead" },
  within_noise: { text: "farq shor ke andar", cls: "noise" },
  too_few: { text: "log kam — faisla nahi", cls: "few" },
};

const TIER_LABEL: Record<string, string> = {
  T1: "Tier 1",
  T2: "Tier 2",
  T3: "Tier 3 (baqi sab)",
  unknown: "Mulk maloom nahi",
};

/**
 * `utm_source` jaisa aaya, hoobahu (AGENTS-EVENTS 1.16). `apps.facebook.com` Meta ka apna tag hai jo
 * Facebook app se aane wale HAR install par lagta hai — hamara link nahi; `facebook` hamara hai.
 */
const SOURCE_LABEL: Record<string, string> = {
  "apps.facebook.com": "Facebook app se (Meta ka tag)",
  "apps.instagram.com": "Instagram app se (Meta ka tag)",
  "google-play": "Play Store (organic)",
  "(not set)": "Play ne source nahi bataya",
  no_referrer: "Install referrer aaya hi nahi",
  facebook: "Hamara link: facebook",
  google_ads: "Hamara link: google_ads",
  tiktok: "Hamara link: tiktok",
  shared_invoice: "Share ki gayi invoice ka link",
  unknown: "Maloom nahi",
};

const SOURCE_FIXED = ["apps.facebook.com", "apps.instagram.com", "google-play", "(not set)", "no_referrer", "facebook", "google_ads", "shared_invoice"];

function groupLabel(by: CompareBy, g: CompareGroup): string {
  if (by === "tier") return TIER_LABEL[g.key] ?? g.key;
  if (by === "source") return SOURCE_LABEL[g.key] ?? g.key;
  if (by === "country" && g.key === "unknown") return "Mulk maloom nahi";
  return g.label;
}

function fmtDay(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function pct(n: number): string {
  return `${n.toFixed(1)}%`;
}

function Cell({ c, cohort }: { c: CompareCell; cohort: number }) {
  const v = VERDICT[c.verdict];
  return (
    <td className={`${styles.cell} ${styles[v.cls] ?? ""}`}>
      <div className={styles.main}>
        <span className={styles.share}>{cohort > 0 ? pct(c.share) : "—"}</span>
        <span className={styles.count}>{c.reached}</span>
      </div>
      {cohort > 0 && (
        <div className={styles.sub} title="95% ka daira (Wilson): asal rate is ke andar hone ka zyada imkaan hai">
          {Math.round(c.ciLow)}–{Math.round(c.ciHigh)}%
        </div>
      )}
      {c.diffPoints != null && (
        <div className={styles.diff} title={c.z != null ? `z = ${c.z.toFixed(2)}` : undefined}>
          {c.diffPoints >= 0 ? "+" : "−"}
          {Math.abs(c.diffPoints).toFixed(1)} pts · {v.text}
        </div>
      )}
    </td>
  );
}

export function JourneyCompare() {
  const [by, setBy] = useState<CompareBy>("version");
  const [range, setRange] = useState<DayRange>(defaultRange);
  const [build, setBuild] = useState("release");
  const [windowHours, setWindowHours] = useState(24);
  // Fixed dimensions. "" = sab.
  const [version, setVersion] = useState("");
  const [countryMode, setCountryMode] = useState<"all" | "only" | "except">("all");
  const [countryCode, setCountryCode] = useState("PK");
  const [tier, setTier] = useState("");
  const [source, setSource] = useState("");
  const [campaign, setCampaign] = useState("");
  const [platform, setPlatform] = useState("");
  /** Chosen groups; empty = the backend's six largest. */
  const [picked, setPicked] = useState<string[]>([]);
  const [baseline, setBaseline] = useState("");
  const [campaigns, setCampaigns] = useState<CompareGroup[]>([]);
  const [versions, setVersions] = useState<AppVersion[]>([]);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const iso = toRangeIso(range);
        const v = await api.getAppVersions(iso.from, iso.to);
        if (!dead) setVersions(v);
      } catch {
        // The picker is empty; the error that matters is the report's own.
      }
    })();
    return () => {
      dead = true;
    };
  }, [range]);

  const codes = useMemo(() => {
    const seen = new Map<number, string | null>();
    versions.forEach((v) => {
      if (v.appVersionCode != null && !seen.has(v.appVersionCode)) seen.set(v.appVersionCode, v.appVersion);
    });
    return [...seen.entries()].sort((a, b) => b[0] - a[0]).map(([code, name]) => ({ code, name }));
  }, [versions]);

  // A dimension cannot vary and be held fixed at once: switching "by" clears its own filter and the picks.
  const changeBy = (next: CompareBy) => {
    setBy(next);
    setPicked([]);
    setBaseline("");
    if (next === "version") setVersion("");
    if (next === "country") setCountryMode("all");
    if (next === "tier") {
      setTier("");
      if (countryMode === "only") setCountryMode("all");
    }
    if (next === "source") setSource("");
    if (next === "campaign") setCampaign("");
    if (next === "platform") setPlatform("");
  };

  useEffect(() => {
    let dead = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const iso = toRangeIso(range);
        const code = countryCode.trim().toUpperCase();
        const r = await api.getJourneyCompare({
          by,
          values: picked.length > 0 ? picked : undefined,
          baseline: baseline || undefined,
          windowHours,
          from: iso.from,
          to: iso.to,
          buildType: build,
          version: by !== "version" && version ? Number(version) : undefined,
          country: by !== "country" && countryMode !== "all" && code.length === 2 ? code : undefined,
          excludeCountry: countryMode === "except",
          tier: by !== "tier" ? tier || undefined : undefined,
          source: by !== "source" ? source || undefined : undefined,
          campaign: by !== "campaign" ? campaign || undefined : undefined,
          platform: by !== "platform" ? platform || undefined : undefined,
        });
        if (dead) return;
        setReport(r);
        if (r.by === "campaign") setCampaigns([...r.groups, ...r.others]);
      } catch (err) {
        if (!dead) setError(getErrorMessage(err, "Muqabla load nahi hua."));
      } finally {
        if (!dead) setLoading(false);
      }
    })();
    return () => {
      dead = true;
    };
  }, [by, picked, baseline, windowHours, range, build, version, countryMode, countryCode, tier, source, campaign, platform]);

  const shown = report && report.by === by ? report : null;
  const cohortOf = (key: string) => shown?.groups.find((g) => g.key === key)?.cohort ?? 0;
  const allGroups = shown ? [...shown.groups, ...shown.others] : [];
  const current = picked.length > 0 ? picked : shown?.groups.map((g) => g.key) ?? [];

  const toggle = (key: string) => {
    const next = current.includes(key) ? current.filter((k) => k !== key) : [...current, key].slice(0, 6);
    setPicked(next);
    if (!next.includes(baseline)) setBaseline("");
  };

  const tierList = shown?.tiers ?? {};
  const tierInPlay = by === "tier" || tier !== "";

  return (
    <section className="section-card fij">
      <div className="fij-head">
        <div>
          <h2>Muqabla — sab fixed, sirf ek cheez badli</h2>
          <p className="muted-line">
            Pehle chunein <strong>kis cheez ka muqabla</strong> karna hai; baqi har cheez neeche ek qeemat par
            fixed rakhi ja sakti hai (jaise: sirf Tier 1, aur versions ka muqabla). Har naye user ko uski{" "}
            <strong>apni pehli opening se barabar waqt</strong> tak dekha gaya hai; jis ka waqt abhi poora nahi
            hua wo &ldquo;abhi waqt poora nahi&rdquo; mein alag gina hai.
          </p>
        </div>
      </div>

      <div className="le-filters">
        <select className="input" value={by} onChange={(e) => changeBy(e.target.value as CompareBy)} title="Kis cheez ka muqabla">
          {BY_OPTIONS.map((o) => (
            <option key={o.by} value={o.by}>
              Muqabla: {o.label}
            </option>
          ))}
        </select>
        <select className="input" value={windowHours} onChange={(e) => setWindowHours(Number(e.target.value))} title="Pehli opening ke baad kitna waqt dekha jaye">
          {WINDOWS.map((w) => (
            <option key={w.hours} value={w.hours}>
              Waqt: {w.label}
            </option>
          ))}
        </select>
        <select className="input" value={build} onChange={(e) => setBuild(e.target.value)}>
          <option value="release">Build: release</option>
          <option value="debug">Build: debug</option>
          <option value="all">Build: all</option>
        </select>
        <DateRangePicker value={range} onChange={setRange} />
      </div>

      <div className="le-filters" aria-label="Fixed">
        <span className="muted-line">Fixed:</span>
        {by !== "version" && (
          <select className="input" value={version} onChange={(e) => setVersion(e.target.value)}>
            <option value="">Version: sab</option>
            {codes.map((c) => (
              <option key={c.code} value={c.code}>
                Version: {c.name ?? "—"} ({c.code})
              </option>
            ))}
          </select>
        )}
        {by !== "tier" && (
          <select className="input" value={tier} onChange={(e) => setTier(e.target.value)}>
            <option value="">Tier: sab</option>
            {Object.entries(TIER_LABEL).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
        )}
        {by !== "country" && (
          <>
            <select className="input" value={countryMode} onChange={(e) => setCountryMode(e.target.value as "all" | "only" | "except")}>
              <option value="all">Mulk: sab</option>
              {by !== "tier" && <option value="only">Mulk: sirf {countryCode.toUpperCase() || "—"}</option>}
              <option value="except">Mulk: {countryCode.toUpperCase() || "—"} ke ilawa</option>
            </select>
            {countryMode !== "all" && (
              <input
                className="input"
                style={{ width: 64 }}
                maxLength={2}
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value.replace(/[^a-zA-Z]/g, ""))}
                title="Do harfi ISO code, jaise PK"
              />
            )}
          </>
        )}
        {by !== "source" && (
          <select className="input" value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="">Source: sab</option>
            {SOURCE_FIXED.map((s) => (
              <option key={s} value={s}>
                Source: {SOURCE_LABEL[s] ?? s}
              </option>
            ))}
          </select>
        )}
        {by !== "campaign" && campaigns.length > 0 && (
          <select className="input" value={campaign} onChange={(e) => setCampaign(e.target.value)}>
            <option value="">Campaign: sab</option>
            {campaigns.map((c) => (
              <option key={c.key} value={c.key}>
                Campaign: {c.label}
              </option>
            ))}
          </select>
        )}
        {by !== "platform" && (
          <select className="input" value={platform} onChange={(e) => setPlatform(e.target.value)}>
            <option value="">Platform: sab</option>
            <option value="Android">Android</option>
            <option value="iOS">iOS</option>
          </select>
        )}
      </div>

      {shown && allGroups.length > 0 && (
        <div className="le-filters" aria-label="Groups">
          <span className="muted-line">Columns (6 tak):</span>
          {allGroups.map((g) => (
            <label key={g.key} className="muted-line" style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
              <input type="checkbox" checked={current.includes(g.key)} onChange={() => toggle(g.key)} />
              {groupLabel(by, g)} <span className={styles.count}>({g.cohort})</span>
            </label>
          ))}
          <select className="input" value={baseline || shown.baseline} onChange={(e) => setBaseline(e.target.value)} title="Baqi sab is se milaye jayenge">
            {shown.groups.map((g) => (
              <option key={g.key} value={g.key}>
                Buniyad: {groupLabel(by, g)}
              </option>
            ))}
          </select>
        </div>
      )}

      {error ? (
        <p className="error-text">{error}</p>
      ) : loading && !shown ? (
        <p className="muted-line">Load ho raha hai… (30 din ka muqabla 10 second tak le sakta hai)</p>
      ) : !shown ? null : shown.groups.length === 0 ? (
        <p className="muted-line">In filters mein koi naya user nahi mila.</p>
      ) : (
        <>
          {by === "campaign" && shown.metaCampaigns === "key_missing" && (
            <p className={styles.warn}>
              Facebook/Instagram ke ads ki campaign abhi <strong>band (locked)</strong> hai: Meta har install ke
              saath campaign ka naam <em>encrypted</em> bhejta hai, aur use kholne ki chaabi (Install Referrer
              Decryption Key) server par abhi rakhi nahi gayi. Chaabi lagte hi yahi column har campaign ke naam se
              alag ho jayenge — purane installs samet.
            </p>
          )}
          <div className="live-table-wrap">
            <table className={`live-table ${styles.table}`}>
              <thead>
                <tr>
                  <th className="live-th">Qadam</th>
                  {shown.groups.map((g) => (
                    <th key={g.key} className="live-th">
                      {groupLabel(by, g)}
                      {g.key === shown.baseline ? " · buniyad" : ""}
                    </th>
                  ))}
                </tr>
                <tr className={styles.cohortRow}>
                  <td>
                    Naye users (cohort)
                    <div className={styles.sub}>jin ka poora waqt guzar chuka</div>
                  </td>
                  {shown.groups.map((g) => (
                    <td key={g.key}>
                      <strong>{g.cohort}</strong>
                      {g.cohort > 0 && g.cohort < 50 && <div className={styles.sub}>kam log — faisla nahi</div>}
                      <div className={styles.sub}>
                        pehli opening {fmtDay(g.firstOpenFrom)} – {fmtDay(g.firstOpenTo)}
                      </div>
                      {g.inCommonWindow != null && shown.groups.length > 1 && (
                        <div className={styles.sub}>{Math.round(g.inCommonWindow * 100)}% sab ke saanjhe dinon mein</div>
                      )}
                      {g.notYetJudged > 0 && <div className={styles.sub}>+{g.notYetJudged} abhi waqt poora nahi</div>}
                    </td>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shown.steps.map((s) => (
                  <tr key={s.key} className={s.key === "step_8" || s.key === "shared" ? styles.goal : undefined}>
                    <td className={styles.stepName}>{STEP_LABEL[s.key] ?? s.label}</td>
                    {s.cells.map((c) => (
                      <Cell key={c.group} c={c} cohort={cohortOf(c.group)} />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {shown.calendar.warning && (
            <p className={styles.warn}>
              Dhyan:{" "}
              {shown.calendar.warning === "apart"
                ? "in groups ke naye users bilkul alag dinon mein aaye — koi din saanjha nahi."
                : "kisi group ke aadhe se kam users un dinon mein aaye jo sab groups mein saanjhe hain."}{" "}
              Is liye farq sirf chuni hui cheez ka nahi, <strong>us waqt ke ad campaign aur mulkon ke mix</strong>{" "}
              ka bhi ho sakta hai. Behtar: tareekhein saanjhe dinon ({fmtDay(shown.calendar.commonFrom)} –{" "}
              {fmtDay(shown.calendar.commonTo)}) tak mehdood karein.
            </p>
          )}
          {shown.truncated && (
            <p className={styles.warn}>Is range mein naye users had se zyada hain; sirf ek hissa gina gaya. Range chhoti karein.</p>
          )}
          {tierInPlay && (
            <p className="muted-line">
              Tier list (ek hi jagah, backend <code>CountryTiers</code>): <strong>T1</strong> = {(tierList.T1 ?? []).join(", ")}.{" "}
              <strong>T2</strong> = {(tierList.T2 ?? []).join(", ")}. <strong>T3</strong> = baqi har maloom mulk.
              &ldquo;Mulk maloom nahi&rdquo; T3 mein nahi gina gaya.
            </p>
          )}
          <p className="muted-line">
            Har khane mein: <strong>%</strong> = cohort mein se kitne is qadam tak pohanche · chhota adad = kitne log
            · <strong>daira</strong> = 95% ka andaza ke asal rate kahan hai · <strong>pts</strong> = buniyad se farq.
            &ldquo;Peeche/aage — shor se zyada&rdquo; tab jab itfaqan hone ka imkaan 5% se kam ho (|z| ≥ 1.96) aur
            dono taraf kam az kam 50 log hon. Hamare test phone shamil nahi.
          </p>
        </>
      )}
    </section>
  );
}
