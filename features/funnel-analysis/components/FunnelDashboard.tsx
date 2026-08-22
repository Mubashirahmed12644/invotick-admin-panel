"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import EmptyState from "@/components/EmptyState";
import ErrorState from "@/components/ErrorState";
import LoadingState from "@/components/LoadingState";
import Navbar from "@/components/Navbar";
import { clearAccessToken, isLoggedIn } from "@/lib/auth";
import { api, getErrorMessage, isUnauthorizedError } from "@/lib/api";
import { useRouter } from "next/navigation";
import type {
  FunnelDimensions,
  FunnelBy,
  FunnelMode,
  FunnelQueryRequest,
  FunnelQueryResponse,
  FunnelStepResult,
} from "@/lib/types";
import styles from "@/features/funnel-analysis/styles/funnel-analysis.module.css";

// ── Helpers ────────────────────────────────────────────────────────────────

function toDateTimeLocalValue(date: Date): string {
  const y = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${mo}-${d}T${h}:${mi}`;
}

function toUtcIso(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function formatSeconds(secs: number): string {
  if (secs < 60) return `${Math.round(secs)}s`;
  const m = Math.floor(secs / 60);
  const s = Math.round(secs % 60);
  if (m < 60) return s > 0 ? `${m}m ${s}s` : `${m}m`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm > 0 ? `${h}h ${rm}m` : `${h}h`;
}

function numFmt(n: number): string {
  return n.toLocaleString();
}

// ── StepInput — searchable autocomplete ───────────────────────────────────

interface StepInputProps {
  value: string;
  names: string[];
  placeholder?: string;
  onChange: (v: string) => void;
}

function StepInput({ value, names, placeholder, onChange }: StepInputProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const wrapRef = useRef<HTMLDivElement>(null);

  const suggestions = names
    .filter((n) => n.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 25);

  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    function handleOut(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOut);
    return () => document.removeEventListener("mousedown", handleOut);
  }, []);

  return (
    <div className={styles.stepInputWrap} ref={wrapRef}>
      <input
        className="input"
        type="text"
        value={query}
        placeholder={placeholder ?? "Type or select…"}
        onChange={(e) => {
          setQuery(e.target.value);
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}
        autoComplete="off"
      />
      {open && suggestions.length > 0 ? (
        <ul className={styles.stepSuggestions} role="listbox">
          {suggestions.map((name) => (
            <li
              key={name}
              role="option"
              aria-selected={name === value}
              className={styles.stepSuggestion}
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(name);
                setQuery(name);
                setOpen(false);
              }}
            >
              {name}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

// ── FunnelStepBar — one row inside the funnel chart ───────────────────────

interface FunnelStepBarProps {
  step: FunnelStepResult;
  isFirst: boolean;
}

function FunnelStepBar({ step, isFirst }: FunnelStepBarProps) {
  const width = Math.max(step.conversionFromFirst, 2);
  const dropPct = isFirst
    ? 0
    : parseFloat((100 - step.conversionFromPrevious).toFixed(1));

  return (
    <div className={styles.funnelStepBlock}>
      {/* Drop-off connector (hidden for step 1) */}
      {!isFirst ? (
        <div className={styles.dropOffConnector}>
          <span className={styles.dropOffArrow}>↓</span>
          {step.dropOffSessions > 0 ? (
            <span className={styles.dropOffLost}>
              −{numFmt(step.dropOffSessions)} dropped
            </span>
          ) : null}
          {dropPct > 0 ? (
            <span className={styles.dropOffPct}>{dropPct}% drop-off</span>
          ) : null}
          {step.avgSecondsFromPreviousStep !== null ? (
            <span className={styles.dropOffTime}>
              ⏱ avg {formatSeconds(step.avgSecondsFromPreviousStep)} to reach
            </span>
          ) : null}
        </div>
      ) : null}

      {/* Step label row */}
      <div className={styles.funnelStepMeta}>
        <div className={styles.funnelStepLabel}>
          <span className={styles.funnelStepNum}>{step.step}</span>
          <span className={styles.funnelStepName} title={step.name}>
            {step.name}
          </span>
        </div>
        <div className={styles.funnelStepStats}>
          <span className={styles.funnelStepSessionCount}>
            {numFmt(step.sessions)} sessions · {numFmt(step.users)} users
          </span>
          <span className={styles.funnelStepConvFirst}>
            {step.conversionFromFirst.toFixed(1)}%
          </span>
          {!isFirst ? (
            <span className={styles.funnelStepConvPrev}>
              {step.conversionFromPrevious.toFixed(1)}% from prev
            </span>
          ) : null}
        </div>
      </div>

      {/* The bar */}
      <div className={styles.funnelBarTrack}>
        <div
          className={styles.funnelBarFill}
          style={{ width: `${width}%` }}
        >
          <span className={styles.funnelBarFillText}>
            {numFmt(step.sessions)}
          </span>
          {step.users > 0 ? (
            <span className={styles.funnelBarFillUsers}>
              · {numFmt(step.users)} users
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ── StepCard — detail card below the funnel chart ─────────────────────────

interface StepCardProps {
  step: FunnelStepResult;
  isBottleneck: boolean;
}

function StepCard({ step, isBottleneck }: StepCardProps) {
  const isFirst = step.step === 1;

  return (
    <div className={`${styles.stepCard} ${isBottleneck ? styles.stepCardBottleneck : ""}`}>
      <div className={styles.stepCardTop}>
        <span className={styles.stepCardBadge}>{step.step}</span>
        <div>
          <div className={styles.stepCardName}>{step.name}</div>
          {isBottleneck ? (
            <div className={styles.bottleneckBadge}>⚠ Biggest drop-off</div>
          ) : null}
        </div>
      </div>

      {/* Progress bar */}
      <div className={styles.stepCardProgress}>
        <div className={styles.stepCardProgressTrack}>
          <div
            className={styles.stepCardProgressFill}
            style={{ width: `${Math.max(step.conversionFromFirst, 1)}%` }}
          />
        </div>
      </div>

      {/* Metrics 2×2 grid */}
      <div className={styles.stepCardMetrics}>
        <div className={styles.stepCardMetric}>
          <div className={styles.stepCardMetricValue}>{numFmt(step.sessions)}</div>
          <div className={styles.stepCardMetricLabel}>Sessions</div>
        </div>
        <div className={styles.stepCardMetric}>
          <div className={styles.stepCardMetricValue}>{numFmt(step.users)}</div>
          <div className={styles.stepCardMetricLabel}>Users</div>
        </div>
        <div className={styles.stepCardMetric}>
          <div className={`${styles.stepCardMetricValue} ${styles.stepCardMetricValuePrimary}`}>
            {step.conversionFromFirst.toFixed(1)}%
          </div>
          <div className={styles.stepCardMetricLabel}>Conv. from First</div>
        </div>
        <div className={styles.stepCardMetric}>
          <div
            className={`${styles.stepCardMetricValue} ${
              isFirst || step.dropOffSessions === 0
                ? ""
                : styles.stepCardMetricValueDanger
            }`}
          >
            {isFirst ? "—" : `−${numFmt(step.dropOffSessions)}`}
          </div>
          <div className={styles.stepCardMetricLabel}>Sessions Dropped</div>
        </div>
      </div>

      {/* Avg time row */}
      <div className={styles.stepCardTime}>
        {step.avgSecondsFromPreviousStep !== null ? (
          <>
            ⏱ avg{" "}
            <span className={styles.stepCardTimeValue}>
              {formatSeconds(step.avgSecondsFromPreviousStep)}
            </span>{" "}
            from previous step
          </>
        ) : isFirst ? (
          "Funnel entry point"
        ) : (
          "No timing data"
        )}
      </div>
    </div>
  );
}

// ── Main dashboard ─────────────────────────────────────────────────────────

export function FunnelDashboard() {
  const router = useRouter();

  const [steps, setSteps] = useState<string[]>(["", ""]);
  const [funnelBy, setFunnelBy] = useState<FunnelBy>("SCREEN");
  const [mode, setMode] = useState<FunnelMode>("ORDERED");
  const [from, setFrom] = useState(() =>
    toDateTimeLocalValue(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
  );
  const [to, setTo] = useState(() => toDateTimeLocalValue(new Date()));
  const [platform, setPlatform] = useState("");
  // The build number, held as a string because that is what a <select> value is. "" means All.
  const [appVersionCode, setAppVersionCode] = useState("");
  const [dimensions, setDimensions] = useState<FunnelDimensions | null>(null);
  const [osVersion, setOsVersion] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [maxStepDurationMinutes, setMaxStepDurationMinutes] = useState("");

  const [validationError, setValidationError] = useState("");
  const [names, setNames] = useState<string[]>([]);
  const [namesLoading, setNamesLoading] = useState(false);
  const [result, setResult] = useState<FunnelQueryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Auth guard
  useEffect(() => {
    if (!isLoggedIn()) router.replace("/login");
  }, [router]);

  // Load autocomplete names when funnelBy changes
  const loadNames = useCallback(async (type: FunnelBy) => {
    setNamesLoading(true);
    try {
      const data = await api.getFunnelNames({ type });
      setNames(data ?? []);
    } catch {
      setNames([]);
    } finally {
      setNamesLoading(false);
    }
  }, []);

  useEffect(() => { void loadNames(funnelBy); }, [funnelBy, loadNames]);

  // Loaded for the SELECTED window, not for all time. A list built over all time can offer a
  // release that shipped and died before this range, and a funnel returning zero for it reads as a
  // product failure rather than as an empty filter.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const d = await api.getFunnelDimensions({
          from: new Date(from).toISOString(),
          to: new Date(to).toISOString(),
        });
        if (!cancelled) setDimensions(d);
      } catch {
        // A missing filter list must not take the page down — the funnel still runs unfiltered.
        if (!cancelled) setDimensions(null);
      }
    })();
    return () => { cancelled = true; };
  }, [from, to]);

  // Switch funnel type → clear steps & result
  const handleFunnelByChange = useCallback((next: FunnelBy) => {
    setFunnelBy(next);
    setSteps(["", ""]);
    setResult(null);
    setError("");
    setValidationError("");
  }, []);

  // Step CRUD
  const addStep = useCallback(() => setSteps((p) => [...p, ""]), []);
  const removeStep = useCallback(
    (i: number) => setSteps((p) => p.filter((_, idx) => idx !== i)),
    [],
  );
  const updateStep = useCallback((i: number, v: string) => {
    setSteps((p) => { const n = [...p]; n[i] = v; return n; });
  }, []);
  const moveStep = useCallback((i: number, dir: "up" | "down") => {
    setSteps((p) => {
      const n = [...p];
      const swap = dir === "up" ? i - 1 : i + 1;
      if (swap < 0 || swap >= n.length) return p;
      [n[i], n[swap]] = [n[swap], n[i]];
      return n;
    });
  }, []);

  // Run funnel query
  const handleAnalyze = useCallback(async () => {
    const filled = steps.filter((s) => s.trim().length > 0);

    if (filled.length < 2) {
      setValidationError("Add at least 2 steps to run the analysis.");
      return;
    }

    const fromIso = toUtcIso(from);
    const toIso = toUtcIso(to);

    if (from && !fromIso) { setValidationError("Invalid 'From' date."); return; }
    if (to && !toIso)     { setValidationError("Invalid 'To' date."); return; }
    if (fromIso && toIso && new Date(toIso) <= new Date(fromIso)) {
      setValidationError("'To' must be after 'From'.");
      return;
    }

    const maxMins = maxStepDurationMinutes ? Number(maxStepDurationMinutes) : undefined;
    if (maxMins !== undefined && (Number.isNaN(maxMins) || maxMins <= 0)) {
      setValidationError("Max step duration must be a positive number.");
      return;
    }

    setValidationError("");
    setLoading(true);
    setError("");

    const req: FunnelQueryRequest = {
      steps: filled,
      funnelBy,
      mode,
      ...(fromIso ? { from: fromIso } : {}),
      ...(toIso   ? { to: toIso }     : {}),
      ...(maxMins                     ? { maxStepDurationMinutes: maxMins } : {}),
      ...(platform                    ? { platform }           : {}),
      ...(appVersionCode              ? { appVersionCode: Number(appVersionCode) } : {}),
      ...(osVersion.trim()            ? { osVersion: osVersion.trim() }   : {}),
      ...(country.trim()              ? { country: country.trim() }       : {}),
      ...(city.trim()                 ? { city: city.trim() }             : {}),
    };

    try {
      const data = await api.queryFunnel(req);
      setResult(data);
    } catch (err) {
      if (isUnauthorizedError(err)) {
        clearAccessToken({ sessionExpired: true });
        router.replace("/login");
        return;
      }
      setError(getErrorMessage(err, "Failed to run funnel analysis."));
    } finally {
      setLoading(false);
    }
  }, [steps, funnelBy, mode, from, to, platform, appVersionCode, osVersion, country, city, maxStepDurationMinutes, router]);

  const handleReset = useCallback(() => {
    setSteps(["", ""]);
    setMode("ORDERED");
    setFunnelBy("SCREEN");
    setFrom(toDateTimeLocalValue(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)));
    setTo(toDateTimeLocalValue(new Date()));
    setPlatform(""); setAppVersionCode(""); setOsVersion("");
    setCountry(""); setCity(""); setMaxStepDurationMinutes("");
    setValidationError(""); setResult(null); setError("");
  }, []);

  // Find the step with the highest drop-off (excluding step 1)
  const bottleneckStep = result
    ? result.steps.reduce(
        (worst, s) =>
          s.step > 1 && s.dropOffSessions > (worst?.dropOffSessions ?? 0) ? s : worst,
        null as FunnelStepResult | null,
      )
    : null;

  const overallConversion = result?.steps[result.steps.length - 1]?.conversionFromFirst ?? 0;

  return (
    <>
      <Navbar title="Funnel Analysis" />
      <section className="content-wrap">

        {/* ── Page header ── */}
        <div className={styles.pageHeader}>
          <div className={styles.pageTitleGroup}>
            <h1 className={styles.pageTitle}>Funnel Analysis</h1>
            <p className={styles.pageSubtitle}>
              Build a step-by-step funnel and instantly see where users drop off, conversion rates, and time between steps.
            </p>
          </div>
        </div>

        {/* ── Step builder ── */}
        <div className={styles.builderCard}>
          <div className={styles.builderCardTop}>
            <span className={styles.builderCardTitle}>
              Funnel Steps
              {names.length > 0 ? ` · ${names.length} ${funnelBy === "SCREEN" ? "screens" : "events"} available` : ""}
            </span>
            <div className={styles.funnelByToggle}>
              <button
                type="button"
                className={`${styles.toggleBtn} ${funnelBy === "SCREEN" ? styles.toggleBtnActive : ""}`}
                onClick={() => handleFunnelByChange("SCREEN")}
              >
                Screens
              </button>
              <button
                type="button"
                className={`${styles.toggleBtn} ${funnelBy === "EVENT" ? styles.toggleBtnActive : ""}`}
                onClick={() => handleFunnelByChange("EVENT")}
              >
                Events
              </button>
            </div>
          </div>

          {namesLoading ? (
            <p className={styles.namesHint}>Loading {funnelBy === "SCREEN" ? "screen" : "event"} names…</p>
          ) : null}

          <div className={styles.stepList}>
            {steps.map((step, index) => (
              <div key={index} className={styles.stepItem}>
                <span className={styles.stepCircle}>{index + 1}</span>
                <StepInput
                  value={step}
                  names={names}
                  placeholder={`Step ${index + 1} — ${funnelBy === "SCREEN" ? "screen" : "event"} name`}
                  onChange={(v) => updateStep(index, v)}
                />
                <div className={styles.stepItemActions}>
                  <button
                    type="button"
                    className={styles.moveBtn}
                    onClick={() => moveStep(index, "up")}
                    disabled={index === 0}
                    title="Move up"
                    aria-label="Move step up"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className={styles.moveBtn}
                    onClick={() => moveStep(index, "down")}
                    disabled={index === steps.length - 1}
                    title="Move down"
                    aria-label="Move step down"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className={styles.removeBtn}
                    onClick={() => removeStep(index)}
                    disabled={steps.length <= 2}
                    title="Remove step"
                    aria-label="Remove step"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.addStepRow}>
            <button
              type="button"
              className={styles.addStepBtn}
              onClick={addStep}
              disabled={steps.length >= 10}
            >
              + Add Step
              {steps.length >= 10 ? " (max 10)" : ""}
            </button>
          </div>
        </div>

        {/* ── Filters ── */}
        <section className="filters-panel">
          <div className="filters-header">
            <p className="results-meta">
              Date range, mode, and optional demographic filters
            </p>
            <div className={styles.filterActions}>
              <button type="button" className="btn btn-outline" onClick={handleReset}>
                Reset All
              </button>
              <button
                type="button"
                className={`btn ${styles.analyzeBtn}`}
                onClick={() => void handleAnalyze()}
                disabled={loading}
              >
                {loading ? "Analyzing…" : "Run Analysis"}
              </button>
            </div>
          </div>

          <div className="filters-grid">
            <label className="filter-control">
              <span>From</span>
              <input className="input" type="datetime-local" value={from}
                onChange={(e) => setFrom(e.target.value)} />
            </label>
            <label className="filter-control">
              <span>To</span>
              <input className="input" type="datetime-local" value={to}
                onChange={(e) => setTo(e.target.value)} />
            </label>
            <label className="filter-control">
              <span>Mode</span>
              <select className="input" value={mode}
                onChange={(e) => setMode(e.target.value as FunnelMode)}>
                <option value="ORDERED">Ordered (recommended)</option>
                <option value="STRICT">Strict — consecutive only</option>
                <option value="ANY_ORDER">Any Order</option>
              </select>
            </label>
            <label className="filter-control">
              <span>Platform</span>
              <select className="input" value={platform}
                onChange={(e) => setPlatform(e.target.value)}>
                <option value="">All Platforms</option>
                <option value="Android">Android</option>
                <option value="iOS">iOS</option>
                <option value="Web">Web</option>
                <option value="Unknown">Unknown</option>
              </select>
            </label>
            <label className="filter-control">
              <span>App Version</span>
              <select className="input" value={appVersionCode}
                onChange={(e) => setAppVersionCode(e.target.value)}>
                <option value="">All Versions</option>
                {dimensions?.versions.map((v) => (
                  <option key={v.code} value={String(v.code)}>
                    {v.name ? `${v.name} (${v.code})` : `build ${v.code}`}
                  </option>
                ))}
              </select>
            </label>
            <label className="filter-control">
              <span>OS Version</span>
              <input className="input" type="text" value={osVersion}
                onChange={(e) => setOsVersion(e.target.value)} placeholder="e.g. 14" />
            </label>
            <label className="filter-control">
              <span>Country</span>
              <select className="input" value={country}
                onChange={(e) => setCountry(e.target.value)}>
                <option value="">All Countries</option>
                {dimensions?.countries.map((c) => (
                  <option key={c.country} value={c.country}>
                    {c.country} ({c.events.toLocaleString()})
                  </option>
                ))}
              </select>
            </label>
            <label className="filter-control">
              <span>City</span>
              <input className="input" type="text" value={city}
                onChange={(e) => setCity(e.target.value)} placeholder="e.g. Karachi" />
            </label>
            <label className="filter-control">
              <span>Max Duration (minutes)</span>
              <input className="input" type="number" min="1" value={maxStepDurationMinutes}
                onChange={(e) => setMaxStepDurationMinutes(e.target.value)} placeholder="No limit" />
            </label>
          </div>

          {validationError ? <p className="error-text">{validationError}</p> : null}

          {result ? (
            <div className={styles.resolvedFilters}>
              <span className={styles.filterChip}>From: {result.filters.from}</span>
              <span className={styles.filterChip}>To: {result.filters.to}</span>
              <span className={styles.filterChip}>Mode: {result.filters.mode}</span>
              <span className={styles.filterChip}>By: {result.filters.funnelBy}</span>
              {result.filters.platform        ? <span className={styles.filterChip}>Platform: {result.filters.platform}</span> : null}
              {result.filters.appVersionCode  ? <span className={styles.filterChip}>Version: {dimensions?.versions.find((v) => v.code === result.filters.appVersionCode)?.name ?? `build ${result.filters.appVersionCode}`}</span> : null}
              {result.filters.osVersion       ? <span className={styles.filterChip}>OS: {result.filters.osVersion}</span> : null}
              {result.filters.country         ? <span className={styles.filterChip}>Country: {result.filters.country}</span> : null}
              {result.filters.city            ? <span className={styles.filterChip}>City: {result.filters.city}</span> : null}
              {result.filters.maxStepDurationMinutes ? (
                <span className={styles.filterChip}>Max: {result.filters.maxStepDurationMinutes}m</span>
              ) : null}
            </div>
          ) : null}
        </section>

        {/* ── Loading / Error ── */}
        {loading ? <LoadingState message="Running funnel analysis…" /> : null}
        {!loading && error ? (
          <ErrorState message={error} onRetry={() => void handleAnalyze()} />
        ) : null}

        {/* ── Results ── */}
        {!loading && !error && result ? (
          result.totalSessions === 0 ? (
            <EmptyState message="No sessions matched the funnel criteria. Try a wider date range or fewer filters." />
          ) : (
            <>
              {/* Summary stat cards */}
              <div className={styles.summaryRow}>
                <div className={`${styles.statCard} ${styles.statCardAccent}`}>
                  <div className={styles.statValue}>{numFmt(result.totalSessions)}</div>
                  <div className={styles.statLabel}>Total Sessions</div>
                  <div className={styles.statMeta}>entered the funnel</div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statValue}>{numFmt(result.totalUsers)}</div>
                  <div className={styles.statLabel}>Unique Users</div>
                  <div className={styles.statMeta}>authenticated accounts</div>
                </div>
                <div className={styles.statCard}>
                  <div className={`${styles.statValue} ${overallConversion >= 50 ? styles.statValueGreen : styles.statValuePrimary}`}>
                    {overallConversion.toFixed(1)}%
                  </div>
                  <div className={styles.statLabel}>Overall Conversion</div>
                  <div className={styles.statMeta}>step 1 → step {result.steps.length}</div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statValue}>{result.steps.length}</div>
                  <div className={styles.statLabel}>Funnel Steps</div>
                  <div className={styles.statMeta}>
                    {bottleneckStep
                      ? `biggest drop at step ${bottleneckStep.step}`
                      : "no drop-off detected"}
                  </div>
                </div>
              </div>

              {/* Funnel chart */}
              <div className={styles.funnelCard}>
                <div className={styles.funnelCardHeader}>
                  <div>
                    <div className={styles.funnelCardTitle}>Conversion Funnel</div>
                    <div className={styles.funnelCardSubtitle}>
                      Bar width represents conversion from step 1. Drop-off between each step shown in red.
                    </div>
                  </div>
                </div>
                <div className={styles.funnelChart}>
                  {result.steps.map((step, index) => (
                    <FunnelStepBar key={step.step} step={step} isFirst={index === 0} />
                  ))}
                </div>
              </div>

              {/* Step breakdown cards */}
              <div className={styles.breakdownHeader}>
                <span className={styles.breakdownTitle}>Step Breakdown</span>
                <span className={styles.breakdownCount}>{result.steps.length} steps</span>
              </div>
              <div className={styles.stepCards}>
                {result.steps.map((step) => (
                  <StepCard
                    key={step.step}
                    step={step}
                    isBottleneck={
                      bottleneckStep !== null &&
                      bottleneckStep.step === step.step &&
                      step.dropOffSessions > 0
                    }
                  />
                ))}
              </div>
            </>
          )
        ) : null}

        {/* ── Empty prompt (before first analysis) ── */}
        {!loading && !error && !result ? (
          <div className={styles.emptyPrompt}>
            <div className={styles.emptyPromptIcon}>🔭</div>
            <div className={styles.emptyPromptTitle}>Ready to analyze</div>
            <p className={styles.emptyPromptText}>
              Select at least 2 steps in the builder above, configure your date range,
              and click <strong>Run Analysis</strong> to visualize the funnel.
            </p>
          </div>
        ) : null}

      </section>
    </>
  );
}
