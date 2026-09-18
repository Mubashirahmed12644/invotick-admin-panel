"use client";

import { useEffect, useMemo, useState } from "react";
import { api, getErrorMessage } from "@/lib/api";
import { DateRangePicker, defaultRange, toRangeIso, type DayRange } from "@/components/DateRangePicker";
import type { AppVersion } from "@/lib/types";
import type { ComparisonCell, ComparisonVerdict, JourneyComparison } from "@/features/funnel-analysis/types";
import styles from "@/features/funnel-analysis/styles/version-comparison.module.css";

/**
 * Version ka muqabla — pehli invoice ka safar, 2–3 versions saath saath (backend decision 0114).
 *
 * "Pehli invoice ka safar" har user ko arse ke aakhir tak dekhta hai. Do versions us tarah
 * milaye jayein to purane version ke users ko din mile hote hain aur naye ko ghante — 2026-09-19 ko
 * isi wajah se 1.4.6 20 % aur 1.4.7 15 % dikha, jab ke pehle ghante mein dono 16.1 % aur 13.5 % thay.
 * Yahan har user ko uski APNI pehli opening se barabar waqt (1 ghanta / 24 ghante / 3 din / 7 din)
 * tak dekha jata hai, aur jis ka waqt abhi poora nahi hua wo alag gina jata hai — "nahi banai" mein nahi.
 */

/** Same words as the journey ladder (FirstInvoiceJourney.tsx RUNG), plus the G1 share row. */
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

function fmtDay(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function pct(n: number): string {
  return `${n.toFixed(1)}%`;
}

function Cell({ c, cohort }: { c: ComparisonCell; cohort: number }) {
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

export function JourneyVersionComparison() {
  const [range, setRange] = useState<DayRange>(defaultRange);
  const [build, setBuild] = useState("release");
  const [windowHours, setWindowHours] = useState(24);
  const [countryMode, setCountryMode] = useState<"all" | "only" | "except">("all");
  const [countryCode, setCountryCode] = useState("PK");
  const [versions, setVersions] = useState<AppVersion[]>([]);
  /** Chosen builds, baseline first. The third is optional (null). */
  const [picked, setPicked] = useState<(number | null)[]>([null, null, null]);
  const [touched, setTouched] = useState(false);
  const [report, setReport] = useState<JourneyComparison | null>(null);
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

  /** Distinct builds, newest first. The picker lists each code once whatever its build types. */
  const codes = useMemo(() => {
    const seen = new Map<number, string | null>();
    versions.forEach((v) => {
      if (v.appVersionCode != null && !seen.has(v.appVersionCode)) seen.set(v.appVersionCode, v.appVersion);
    });
    return [...seen.entries()].sort((a, b) => b[0] - a[0]).map(([code, name]) => ({ code, name }));
  }, [versions]);

  // Default: the build before the newest as the baseline, the newest beside it.
  useEffect(() => {
    if (touched || codes.length < 2 || picked[0] != null) return;
    setPicked([codes[1].code, codes[0].code, null]);
  }, [codes, touched, picked]);

  const chosen = useMemo(() => picked.filter((x): x is number => x != null), [picked]);
  const valid = chosen.length >= 2 && new Set(chosen).size === chosen.length;

  useEffect(() => {
    if (!valid) return;
    let dead = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const iso = toRangeIso(range);
        const code = countryCode.trim().toUpperCase();
        const r = await api.getJourneyComparison({
          versions: chosen,
          baseline: chosen[0],
          windowHours,
          from: iso.from,
          to: iso.to,
          buildType: build,
          country: countryMode === "all" || code.length !== 2 ? undefined : code,
          excludeCountry: countryMode === "except",
        });
        if (!dead) setReport(r);
      } catch (err) {
        if (!dead) setError(getErrorMessage(err, "Muqabla load nahi hua."));
      } finally {
        if (!dead) setLoading(false);
      }
    })();
    return () => {
      dead = true;
    };
  }, [valid, chosen, windowHours, range, build, countryMode, countryCode]);

  const nameOf = (code: number) => {
    const v = report?.versions.find((x) => x.versionCode === code);
    const n = v?.versionName ?? codes.find((c) => c.code === code)?.name;
    return n ? `${n} (${code})` : String(code);
  };

  /** True when no two builds share a single first-open day: then the gap is also a gap in calendar. */
  const calendarsApart = useMemo(() => {
    if (!report) return false;
    const spans = report.versions
      .filter((v) => v.firstOpenFrom && v.firstOpenTo)
      .map((v) => [Date.parse(v.firstOpenFrom!), Date.parse(v.firstOpenTo!)] as const);
    for (let i = 0; i < spans.length; i++)
      for (let j = i + 1; j < spans.length; j++)
        if (spans[i][0] <= spans[j][1] && spans[j][0] <= spans[i][1]) return false;
    return spans.length >= 2;
  }, [report]);

  const cohortOf = (code: number) => report?.versions.find((v) => v.versionCode === code)?.cohort ?? 0;

  return (
    <section className="section-card fij">
      <div className="fij-head">
        <div>
          <h2>Version ka muqabla — pehli invoice</h2>
          <p className="muted-line">
            Har naye user ko uski <strong>apni pehli opening se barabar waqt</strong> tak dekha gaya hai,
            har version ke liye. Jis ka waqt abhi poora nahi hua wo neeche &ldquo;abhi waqt poora nahi&rdquo;
            mein alag gina hai — use &ldquo;invoice nahi banai&rdquo; nahi maana gaya. Pehla version buniyad
            (baseline) hai; baqi us se milaye gaye hain.
          </p>
        </div>
      </div>

      <div className="le-filters">
        {[0, 1, 2].map((i) => (
          <select
            key={i}
            className="input"
            value={picked[i] == null ? "" : String(picked[i])}
            onChange={(e) => {
              setTouched(true);
              const next = [...picked];
              next[i] = e.target.value === "" ? null : Number(e.target.value);
              setPicked(next);
            }}
          >
            <option value="">{i === 0 ? "Buniyad version" : i === 1 ? "Version 2" : "Version 3 (zaroori nahi)"}</option>
            {codes.map((c) => (
              <option key={c.code} value={c.code}>
                {i === 0 ? "Buniyad: " : ""}
                {c.name ?? "—"} ({c.code})
              </option>
            ))}
          </select>
        ))}
        <select className="input" value={windowHours} onChange={(e) => setWindowHours(Number(e.target.value))} title="Pehli opening ke baad kitna waqt dekha jaye">
          {WINDOWS.map((w) => (
            <option key={w.hours} value={w.hours}>
              Waqt: {w.label}
            </option>
          ))}
        </select>
        <select className="input" value={countryMode} onChange={(e) => setCountryMode(e.target.value as "all" | "only" | "except")}>
          <option value="all">Mulk: sab</option>
          <option value="only">Mulk: sirf {countryCode.toUpperCase() || "—"}</option>
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
        <select className="input" value={build} onChange={(e) => setBuild(e.target.value)}>
          <option value="release">Build: release</option>
          <option value="debug">Build: debug</option>
          <option value="all">Build: all</option>
        </select>
        <DateRangePicker value={range} onChange={setRange} />
      </div>

      {!valid ? (
        <p className="muted-line">Kam az kam do alag versions chunein.</p>
      ) : error ? (
        <p className="error-text">{error}</p>
      ) : loading && !report ? (
        <p className="muted-line">Load ho raha hai…</p>
      ) : !report ? null : (
        <>
          <div className="live-table-wrap">
            <table className={`live-table ${styles.table}`}>
              <thead>
                <tr>
                  <th className="live-th">Qadam</th>
                  {report.versions.map((v) => (
                    <th key={v.versionCode} className="live-th">
                      {nameOf(v.versionCode)}
                      {v.versionCode === report.baselineVersionCode ? " · buniyad" : ""}
                    </th>
                  ))}
                </tr>
                <tr className={styles.cohortRow}>
                  <td>
                    Naye users (cohort)
                    <div className={styles.sub}>jin ka poora waqt guzar chuka</div>
                  </td>
                  {report.versions.map((v) => (
                    <td key={v.versionCode}>
                      <strong>{v.cohort}</strong>
                      <div className={styles.sub}>
                        pehli opening {fmtDay(v.firstOpenFrom)} – {fmtDay(v.firstOpenTo)}
                      </div>
                      {v.notYetJudged > 0 && <div className={styles.sub}>+{v.notYetJudged} abhi waqt poora nahi</div>}
                    </td>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.steps.map((s) => (
                  <tr key={s.key} className={s.key === "step_8" || s.key === "shared" ? styles.goal : undefined}>
                    <td className={styles.stepName}>{STEP_LABEL[s.key] ?? s.label}</td>
                    {s.cells.map((c) => (
                      <Cell key={c.versionCode} c={c} cohort={cohortOf(c.versionCode)} />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {calendarsApart && (
            <p className={styles.warn}>
              Dhyan: in versions ke naye users <strong>alag dinon</strong> mein aaye (upar &ldquo;pehli
              opening&rdquo; dekhein). Farq version ka bhi ho sakta hai aur us waqt ke ad campaign ya
              mulk ke mix ka bhi — ye table dono ko alag nahi kar sakta.
            </p>
          )}

          <p className="muted-line">
            Har khane mein: <strong>%</strong> = cohort mein se kitne is qadam tak pohanche · chhota adad =
            kitne log · <strong>daira</strong> = 95% ka andaza ke asal rate kahan hai · <strong>pts</strong> =
            buniyad se farq (percentage points). <strong>&ldquo;Peeche — shor se zyada&rdquo;</strong> tab likha
            jata hai jab farq itna bara ho ke itfaqan hone ka imkaan 5% se kam ho (z ≤ −1.96), aur dono taraf
            kam az kam 50 log hon. Qadam 1–8 &ldquo;kam az kam yahan tak&rdquo; hain; aakhri line (share) alag
            gini gayi hai. Hamare test phone (Testing devices page) is mein shamil nahi.
          </p>
        </>
      )}
    </section>
  );
}
