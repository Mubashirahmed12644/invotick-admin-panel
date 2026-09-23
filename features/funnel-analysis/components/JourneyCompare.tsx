"use client";

import { useEffect, useMemo, useState } from "react";
import { api, getErrorMessage } from "@/lib/api";
import { DateRangePicker, defaultRange, toRangeIso, type DayRange } from "@/components/DateRangePicker";
import { stickyDayRange, stickyOneOf, stickyString, useStickyState, type StickyCodec } from "@/lib/stickyFilters";
import type { AppVersion } from "@/lib/types";
import { isPublishedVersion } from "@/lib/publishedVersions";
import { withPlatform } from "@/lib/versionPlatform";
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

/** `24 Sep, 5:18 pm` in the reader's own clock: the moment a waiting cohort becomes readable. */
function fmtMoment(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

function windowLabel(hours: number): string {
  if (hours === 1) return "1 ghanta";
  if (hours === 24) return "24 ghante";
  if (hours === 72) return "3 din";
  if (hours === 168) return "7 din";
  return `${hours} ghante`;
}

/** Below this a column's share is not a verdict (the backend's own `too_few` line). */
const THIN = 50;

// Every filter of this tab stays chosen through a reload, Back and a copied link (decision 0123).
// Its URL names start with "c" because the journey tab and the screen funnel below share this URL,
// and two components reading one name (`mode`, `ver`) overwrite each other (decision 0141).
const PAGE = "funnel-compare";
const BYS: readonly CompareBy[] = ["version", "country", "tier", "source", "campaign", "platform"];
const byCodec = stickyOneOf(BYS as CompareBy[]) as StickyCodec<CompareBy>;
const windowCodec: StickyCodec<number> = {
  toParam: (v) => String(v),
  fromParam: (raw) => (WINDOWS.some((w) => String(w.hours) === raw) ? Number(raw) : null),
};
const buildCodec = stickyOneOf(["release", "debug", "all"]);
const countryModeCodec = stickyOneOf(["all", "only", "except"] as const) as StickyCodec<"all" | "only" | "except">;
/** "" is "any", and is left out of the URL rather than written as an empty value. */
function optionalOneOf(allowed: readonly string[]): StickyCodec<string> {
  return {
    toParam: (v) => (v === "" ? null : v),
    fromParam: (raw) => (allowed.includes(raw) ? raw : null),
  };
}
const tierCodec = optionalOneOf(["T1", "T2", "T3", "unknown"]);
const platformCodec = optionalOneOf(["Android", "iOS"]);
const countryCodeCodec: StickyCodec<string> = {
  toParam: (v) => (v === "" ? null : v.toUpperCase()),
  fromParam: (raw) => (/^[A-Za-z]{2}$/.test(raw) ? raw.toUpperCase() : null),
};
const versionCodec: StickyCodec<string> = {
  toParam: (v) => (v === "" ? null : v),
  fromParam: (raw) => (/^\d+$/.test(raw) ? raw : null),
};
const listCodec: StickyCodec<string[]> = {
  toParam: (v) => (v.length === 0 ? null : v.join(",")),
  fromParam: (raw) => raw.split(",").filter((x) => x !== "").slice(0, 6),
};

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
  const [by, setBy] = useStickyState<CompareBy>(PAGE, "cby", "version", byCodec);
  const [range, setRange] = useStickyState<DayRange>(PAGE, "crange", defaultRange(), stickyDayRange);
  const [build, setBuild] = useStickyState<string>(PAGE, "cbuild", "release", buildCodec);
  const [windowHours, setWindowHours] = useStickyState<number>(PAGE, "cwin", 24, windowCodec);
  // Fixed dimensions. "" = sab.
  const [version, setVersion] = useStickyState<string>(PAGE, "cver", "", versionCodec);
  const [countryMode, setCountryMode] = useStickyState<"all" | "only" | "except">(PAGE, "ccm", "all", countryModeCodec);
  const [countryCode, setCountryCode] = useStickyState<string>(PAGE, "ccc", "PK", countryCodeCodec);
  const [tier, setTier] = useStickyState<string>(PAGE, "ctier", "", tierCodec);
  const [source, setSource] = useStickyState<string>(PAGE, "csrc", "", stickyString);
  const [campaign, setCampaign] = useStickyState<string>(PAGE, "ccamp", "", stickyString);
  const [platform, setPlatform] = useStickyState<string>(PAGE, "cplat", "", platformCodec);
  /** Chosen groups; empty = the backend's six largest. */
  const [picked, setPicked] = useStickyState<string[]>(PAGE, "ccols", [], listCodec);
  const [baseline, setBaseline] = useStickyState<string>(PAGE, "cbase", "", stickyString);
  const [campaigns, setCampaigns] = useState<CompareGroup[]>([]);
  const [versions, setVersions] = useState<AppVersion[]>([]);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** True from the first render: the version list is fetched before the report, and a blank pause
   *  with no word on it reads as an empty comparison rather than as a wait. */
  const [loading, setLoading] = useState(true);
  /** The version list has arrived (or failed). Until then "Muqabla: Version" does not ask. */
  const [versionsSettled, setVersionsSettled] = useState(false);

  useEffect(() => {
    let dead = false;
    setVersionsSettled(false);
    (async () => {
      try {
        const iso = toRangeIso(range);
        const v = await api.getAppVersions(iso.from, iso.to);
        // Only store-published builds belong in a picker here — an internal build (1.4.9, codes
        // 108-112) is our own testing. The list is maintained in lib/publishedVersions.ts.
        if (!dead) setVersions(v.filter((x) => isPublishedVersion(x.appVersionCode)));
      } catch {
        // The picker is empty; the error that matters is the report's own.
      } finally {
        if (!dead) setVersionsSettled(true);
      }
    })();
    return () => {
      dead = true;
    };
  }, [range]);

  const codes = useMemo(() => {
    const seen = new Map<number, { name: string | null; platforms: string[] | null | undefined }>();
    versions.forEach((v) => {
      if (v.appVersionCode != null && !seen.has(v.appVersionCode)) seen.set(v.appVersionCode, { name: v.appVersion, platforms: v.platforms });
    });
    return [...seen.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([code, v]) => ({ code, name: v.name, label: withPlatform(`${v.name ?? "—"} (${code})`, v.platforms) }));
  }, [versions]);

  /**
   * "Muqabla: Version" compares PUBLISHED builds only.
   *
   * The columns are named in the request rather than filtered out of the reply, because the reply's
   * per-cell "+x pts" is measured against a baseline the backend chose from what it compared. Drop a
   * column afterwards and the ones left could be reading themselves against a build that is no longer
   * on the screen. `codes` is already published-only and newest-first, so this is the newest six.
   */
  const versionValues = useMemo(() => {
    const chosen = picked.filter((k) => isPublishedVersion(Number(k)));
    return (chosen.length > 0 ? chosen : codes.slice(0, 6).map((c) => String(c.code))).join(",");
  }, [picked, codes]);
  /** This window holds no published build at all, so there is nothing honest to compare. */
  const noPublishedVersions = by === "version" && versionsSettled && versionValues === "";

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
    // The published list decides which columns "Muqabla: Version" asks for, so it must be here
    // first. Asking before it arrives runs the 10-second read twice (the trap of decision 0141).
    if (by === "version" && !versionsSettled) return;
    if (noPublishedVersions) {
      setReport(null);
      setLoading(false);
      setError(null);
      return;
    }
    let dead = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const iso = toRangeIso(range);
        const code = countryCode.trim().toUpperCase();
        const r = await api.getJourneyCompare({
          by,
          values: by === "version" ? versionValues.split(",") : picked.length > 0 ? picked : undefined,
          // A baseline the comparison no longer holds would be read against nothing.
          baseline: (by === "version" ? (isPublishedVersion(Number(baseline)) ? baseline : "") : baseline) || undefined,
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
  }, [by, picked, baseline, windowHours, range, build, version, countryMode, countryCode, tier, source, campaign, platform, versionValues, versionsSettled, noPublishedVersions]);

  const shown = report && report.by === by ? report : null;
  /** A column's name; a version also says its platform, because 1.4.7 is 106 on Android and 21 on iOS. */
  const colLabel = (g: CompareGroup) => {
    if (by === "version") return codes.find((c) => String(c.code) === g.key)?.label ?? g.label;
    return groupLabel(by, g);
  };
  const cohortOf = (key: string) => shown?.groups.find((g) => g.key === key)?.cohort ?? 0;
  /** What may be ticked into the comparison. On "Version" an internal build is never on offer. */
  const allGroups = shown
    ? [...shown.groups, ...shown.others].filter((g) => by !== "version" || isPublishedVersion(Number(g.key)))
    : [];
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
            {version !== "" && !codes.some((c) => String(c.code) === version) && (
              <option value={version}>Version: ({version}) — is range mein nahi</option>
            )}
            {codes.map((c) => (
              <option key={c.code} value={c.code}>
                Version: {c.label}
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
            {source !== "" && !SOURCE_FIXED.includes(source) && <option value={source}>Source: {SOURCE_LABEL[source] ?? source}</option>}
            {SOURCE_FIXED.map((s) => (
              <option key={s} value={s}>
                Source: {SOURCE_LABEL[s] ?? s}
              </option>
            ))}
          </select>
        )}
        {by !== "campaign" && (campaigns.length > 0 || campaign !== "") && (
          <select className="input" value={campaign} onChange={(e) => setCampaign(e.target.value)}>
            <option value="">Campaign: sab</option>
            {campaign !== "" && !campaigns.some((c) => c.key === campaign) && <option value={campaign}>Campaign: {campaign}</option>}
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
              {colLabel(g)} <span className={styles.count}>({g.cohort})</span>
            </label>
          ))}
          <select className="input" value={baseline || shown.baseline} onChange={(e) => setBaseline(e.target.value)} title="Baqi sab is se milaye jayenge">
            {shown.groups.map((g) => (
              <option key={g.key} value={g.key}>
                Buniyad: {colLabel(g)}
              </option>
            ))}
          </select>
        </div>
      )}

      {error ? (
        <p className="error-text">{error}</p>
      ) : noPublishedVersions ? (
        <p className={styles.notice}>
          In tareekhon mein <strong>koi store par nikli hui version nahi chali</strong>. Muqabla sirf un
          builds ka hota hai jo asal mein Play/App Store par gayi hain — andar ke (internal) test builds
          hamara apna chalana hai, users ka nahi. Tareekhein barhayein.
        </p>
      ) : loading && !shown ? (
        <p className="muted-line">Load ho raha hai… (30 din ka muqabla 10 second tak le sakta hai)</p>
      ) : !shown ? null : shown.groups.length === 0 ? (
        <p className={styles.notice}>
          In filters aur in tareekhon mein <strong>koi naya user nahi mila</strong> — na tayyar, na intezaar mein.
          Tareekhein barhayein ya koi &ldquo;fixed&rdquo; filter hatayein.
        </p>
      ) : (
        <>
          <WhyThin report={shown} windowHours={windowHours} label={colLabel} onWindow={setWindowHours} />
          {by === "campaign" && shown.metaCampaigns === "key_missing" && (
            <p className={styles.warn}>
              Facebook/Instagram ke ads ki campaign abhi <strong>band (locked)</strong> hai: Meta har install ke
              saath campaign ka naam <em>encrypted</em> bhejta hai, aur use kholne ki chaabi (Install Referrer
              Decryption Key) server par abhi rakhi nahi gayi. Chaabi lagte hi yahi column har campaign ke naam se
              alag ho jayenge — purane installs samet.
            </p>
          )}
          {shown.groups.some((g) => g.cohort > 0) && (
          <div className={`live-table-wrap ${styles.wrap}`}>
            <table className={`live-table ${styles.table}`}>
              <thead>
                <tr>
                  <th className="live-th">Qadam</th>
                  {shown.groups.map((g) => (
                    <th key={g.key} className="live-th">
                      {colLabel(g)}
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
                      {g.cohort > 0 && g.cohort < THIN && <div className={styles.sub}>kam log — faisla nahi</div>}
                      {g.cohort > 0 ? (
                        <div className={styles.sub}>
                          pehli opening {fmtDay(g.firstOpenFrom)} – {fmtDay(g.firstOpenTo)}
                        </div>
                      ) : (
                        <div className={styles.sub}>
                          abhi koi tayyar nahi{g.nextReadyAt ? ` — pehla ${fmtMoment(g.nextReadyAt)}` : ""}
                        </div>
                      )}
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
          )}

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

/**
 * Says in words why a table is empty or a column is thin (decision 0141).
 *
 * On 2026-09-21 the owner picked 1.4.7 and "7 din" and got a table of zeros and dashes. The numbers
 * were right: 1.4.7's first user had opened the app four days earlier, so nobody could have had seven
 * days yet. The table could not say that. This does, with the date the first one will be ready and the
 * shorter windows that already have people in them, as buttons.
 */
function WhyThin({
  report,
  windowHours,
  label,
  onWindow,
}: {
  report: Report;
  windowHours: number;
  label: (g: CompareGroup) => string;
  onWindow: (hours: number) => void;
}) {
  const groups = report.groups;
  const waiting = groups.reduce((n, g) => n + g.notYetJudged, 0);
  const judged = groups.reduce((n, g) => n + g.cohort, 0);
  const next = groups
    .map((g) => g.nextReadyAt)
    .filter((x): x is string => !!x)
    .sort()[0];
  const hasReady = groups.some((g) => g.readyByWindow != null);
  /** Shorter windows, with how many of the shown columns' users each already holds. */
  const shorter = WINDOWS.filter((w) => w.hours < windowHours)
    .map((w) => ({
      hours: w.hours,
      total: groups.reduce((n, g) => n + (g.readyByWindow?.[String(w.hours)] ?? 0), 0),
    }))
    .filter((w) => w.total > 0)
    .reverse();

  if (judged === 0) {
    return (
      <div className={styles.notice} role="status">
        <p>
          <strong>
            Is waqt ({windowLabel(windowHours)}) ke liye abhi koi user tayyar nahi — is liye table khali hai.
          </strong>{" "}
          Ye data ki ghalti nahi. In filters ke <strong>{waiting}</strong> naye users mein se kisi ko bhi apni pehli
          opening ke baad abhi {windowLabel(windowHours)} poore nahi hue, aur jis ka waqt poora nahi hua use
          &ldquo;invoice nahi banai&rdquo; mein gina nahi jata.
        </p>
        {next && (
          <p>
            Pehla user <strong>{fmtMoment(next)}</strong> ko tayyar hoga.
          </p>
        )}
        {hasReady && shorter.length > 0 ? (
          <p className={styles.actions}>
            Abhi dekhna ho to chhota waqt chunein:
            {shorter.map((w) => (
              <button key={w.hours} type="button" className={styles.windowBtn} onClick={() => onWindow(w.hours)}>
                {windowLabel(w.hours)} — {w.total} log
              </button>
            ))}
          </p>
        ) : (
          !hasReady && <p>Chhota waqt (jaise 24 ghante ya 1 ghanta) chun kar dekhein.</p>
        )}
      </div>
    );
  }

  const thin = groups.filter((g) => g.cohort < THIN);
  if (thin.length === 0) return null;
  // The longest shorter window in which every thin column already has enough people to be a verdict.
  const enough = hasReady
    ? WINDOWS.filter((w) => w.hours < windowHours)
        .reverse()
        .find((w) => thin.every((g) => (g.readyByWindow?.[String(w.hours)] ?? 0) >= THIN))
    : undefined;
  return (
    <div className={styles.notice} role="status">
      <p>
        <strong>{thin.map(label).join(", ")}</strong>: {THIN} se kam log jin ka {windowLabel(windowHours)} poora hua
        {" "}({thin.map((g) => g.cohort).join(", ")}). In ka % faisla nahi deta — thore log ho to ek do ka farq bhi
        bara lagta hai.
        {thin.some((g) => g.notYetJudged > 0) && (
          <> Abhi {thin.reduce((n, g) => n + g.notYetJudged, 0)} aur intezaar mein hain.</>
        )}
      </p>
      {enough && (
        <p className={styles.actions}>
          <button type="button" className={styles.windowBtn} onClick={() => onWindow(enough.hours)}>
            {windowLabel(enough.hours)} chunein
          </button>{" "}
          — us mein har column mein {THIN}+ log hain.
        </p>
      )}
    </div>
  );
}
