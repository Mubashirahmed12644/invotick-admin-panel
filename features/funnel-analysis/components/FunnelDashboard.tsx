"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import EmptyState from "@/components/EmptyState";
import ErrorState from "@/components/ErrorState";
import LoadingState from "@/components/LoadingState";
import Navbar from "@/components/Navbar";
import { clearAccessToken, isLoggedIn } from "@/lib/auth";
import { api, getErrorMessage, isUnauthorizedError } from "@/lib/api";
import { useRouter } from "next/navigation";
import type { FunnelBy, FunnelMode, FunnelQueryRequest, FunnelQueryResponse } from "@/lib/types";
import styles from "@/features/funnel-analysis/styles/funnel-analysis.module.css";

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

function formatSeconds(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  if (mins < 60) return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins > 0 ? `${hours}h ${remMins}m` : `${hours}h`;
}

// ── Step autocomplete input ────────────────────────────────────────────────

interface StepInputProps {
  value: string;
  names: string[];
  placeholder?: string;
  onChange: (value: string) => void;
}

function StepInput({ value, names, placeholder, onChange }: StepInputProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const wrapRef = useRef<HTMLDivElement>(null);

  const filtered = names
    .filter((n) => n.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 20);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  return (
    <div className={styles.stepInputWrap} ref={wrapRef}>
      <input
        className="input"
        type="text"
        value={query}
        placeholder={placeholder ?? "Select or type a name"}
        onChange={(e) => {
          setQuery(e.target.value);
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
      />
      {open && filtered.length > 0 ? (
        <ul className={styles.stepSuggestions} role="listbox">
          {filtered.map((name) => (
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
  const [appVersion, setAppVersion] = useState("");
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

  useEffect(() => {
    if (!isLoggedIn()) router.replace("/login");
  }, [router]);

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

  useEffect(() => {
    void loadNames(funnelBy);
  }, [funnelBy, loadNames]);

  const handleFunnelByChange = useCallback((next: FunnelBy) => {
    setFunnelBy(next);
    setSteps(["", ""]);
    setResult(null);
    setError("");
  }, []);

  const addStep = useCallback(() => {
    setSteps((prev) => [...prev, ""]);
  }, []);

  const removeStep = useCallback((index: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateStep = useCallback((index: number, value: string) => {
    setSteps((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }, []);

  const moveStep = useCallback((index: number, dir: "up" | "down") => {
    setSteps((prev) => {
      const next = [...prev];
      const swap = dir === "up" ? index - 1 : index + 1;
      if (swap < 0 || swap >= next.length) return prev;
      [next[index], next[swap]] = [next[swap], next[index]];
      return next;
    });
  }, []);

  const handleAnalyze = useCallback(async () => {
    const filledSteps = steps.filter((s) => s.trim().length > 0);

    if (filledSteps.length < 2) {
      setValidationError("Add at least 2 steps to run the analysis.");
      return;
    }

    const fromIso = toUtcIso(from);
    const toIso = toUtcIso(to);

    if (from && !fromIso) {
      setValidationError("Invalid 'From' date.");
      return;
    }
    if (to && !toIso) {
      setValidationError("Invalid 'To' date.");
      return;
    }
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

    const request: FunnelQueryRequest = {
      steps: filledSteps,
      funnelBy,
      mode,
      ...(fromIso ? { from: fromIso } : {}),
      ...(toIso ? { to: toIso } : {}),
      ...(maxMins ? { maxStepDurationMinutes: maxMins } : {}),
      ...(platform ? { platform } : {}),
      ...(appVersion.trim() ? { appVersion: appVersion.trim() } : {}),
      ...(osVersion.trim() ? { osVersion: osVersion.trim() } : {}),
      ...(country.trim() ? { country: country.trim() } : {}),
      ...(city.trim() ? { city: city.trim() } : {}),
    };

    try {
      const data = await api.queryFunnel(request);
      setResult(data);
    } catch (queryError) {
      if (isUnauthorizedError(queryError)) {
        clearAccessToken({ sessionExpired: true });
        router.replace("/login");
        return;
      }
      setError(getErrorMessage(queryError, "Failed to run funnel analysis."));
    } finally {
      setLoading(false);
    }
  }, [steps, funnelBy, mode, from, to, platform, appVersion, osVersion, country, city, maxStepDurationMinutes, router]);

  const handleReset = useCallback(() => {
    setSteps(["", ""]);
    setMode("ORDERED");
    setFunnelBy("SCREEN");
    setFrom(toDateTimeLocalValue(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)));
    setTo(toDateTimeLocalValue(new Date()));
    setPlatform("");
    setAppVersion("");
    setOsVersion("");
    setCountry("");
    setCity("");
    setMaxStepDurationMinutes("");
    setValidationError("");
    setResult(null);
    setError("");
  }, []);

  return (
    <>
      <Navbar title="Funnel Analysis" />
      <section className="content-wrap">

        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>Funnel Analysis</h1>
            <p className={styles.pageSubtitle}>
              Build a step-by-step funnel and analyze how sessions move through key screens or events.
            </p>
          </div>
        </div>

        {/* Step builder */}
        <section className={styles.stepBuilderSection}>
          <div className={styles.stepBuilderHeader}>
            <h2 className={styles.sectionTitle}>Funnel Steps</h2>
            <div className={styles.funnelByToggle}>
              <button
                type="button"
                className={`btn btn-outline ${funnelBy === "SCREEN" ? styles.toggleActive : ""}`}
                onClick={() => handleFunnelByChange("SCREEN")}
              >
                Screens
              </button>
              <button
                type="button"
                className={`btn btn-outline ${funnelBy === "EVENT" ? styles.toggleActive : ""}`}
                onClick={() => handleFunnelByChange("EVENT")}
              >
                Events
              </button>
            </div>
          </div>

          {namesLoading ? (
            <p className={styles.namesLoadingText}>
              Loading {funnelBy === "SCREEN" ? "screen" : "event"} names…
            </p>
          ) : null}

          <div className={styles.stepList}>
            {steps.map((step, index) => (
              <div key={index} className={styles.stepRow}>
                <span className={styles.stepBadge}>{index + 1}</span>
                <StepInput
                  value={step}
                  names={names}
                  placeholder={`Step ${index + 1}: ${funnelBy === "SCREEN" ? "screen" : "event"} name`}
                  onChange={(v) => updateStep(index, v)}
                />
                <div className={styles.stepActions}>
                  <button
                    type="button"
                    className={`btn btn-outline ${styles.stepActionBtn}`}
                    onClick={() => moveStep(index, "up")}
                    disabled={index === 0}
                    title="Move up"
                    aria-label="Move step up"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className={`btn btn-outline ${styles.stepActionBtn}`}
                    onClick={() => moveStep(index, "down")}
                    disabled={index === steps.length - 1}
                    title="Move down"
                    aria-label="Move step down"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className={`btn btn-outline ${styles.stepActionBtn} ${styles.stepDeleteBtn}`}
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

          <button
            type="button"
            className={`btn btn-outline ${styles.addStepBtn}`}
            onClick={addStep}
            disabled={steps.length >= 10}
          >
            + Add Step
          </button>
        </section>

        {/* Filters */}
        <section className="filters-panel">
          <div className="filters-header">
            <p className="results-meta">Configure date range and filters, then click Analyze.</p>
            <div className={styles.filterActions}>
              <button type="button" className="btn btn-outline" onClick={handleReset}>
                Reset
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => void handleAnalyze()}
                disabled={loading}
              >
                {loading ? "Analyzing…" : "Analyze"}
              </button>
            </div>
          </div>

          <div className="filters-grid">
            <label className="filter-control">
              <span>From</span>
              <input
                className="input"
                type="datetime-local"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </label>

            <label className="filter-control">
              <span>To</span>
              <input
                className="input"
                type="datetime-local"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </label>

            <label className="filter-control">
              <span>Mode</span>
              <select
                className="input"
                value={mode}
                onChange={(e) => setMode(e.target.value as FunnelMode)}
              >
                <option value="ORDERED">Ordered (recommended)</option>
                <option value="STRICT">Strict (consecutive)</option>
                <option value="ANY_ORDER">Any Order</option>
              </select>
            </label>

            <label className="filter-control">
              <span>Platform</span>
              <select
                className="input"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
              >
                <option value="">All Platforms</option>
                <option value="Android">Android</option>
                <option value="iOS">iOS</option>
                <option value="Web">Web</option>
                <option value="Unknown">Unknown</option>
              </select>
            </label>

            <label className="filter-control">
              <span>App Version</span>
              <input
                className="input"
                type="text"
                value={appVersion}
                onChange={(e) => setAppVersion(e.target.value)}
                placeholder="e.g. 2.1.0"
              />
            </label>

            <label className="filter-control">
              <span>OS Version</span>
              <input
                className="input"
                type="text"
                value={osVersion}
                onChange={(e) => setOsVersion(e.target.value)}
                placeholder="e.g. 14"
              />
            </label>

            <label className="filter-control">
              <span>Country</span>
              <input
                className="input"
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="e.g. Pakistan"
              />
            </label>

            <label className="filter-control">
              <span>City</span>
              <input
                className="input"
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Karachi"
              />
            </label>

            <label className="filter-control">
              <span>Max Step Duration (min)</span>
              <input
                className="input"
                type="number"
                min="1"
                value={maxStepDurationMinutes}
                onChange={(e) => setMaxStepDurationMinutes(e.target.value)}
                placeholder="No limit"
              />
            </label>
          </div>

          {validationError ? <p className="error-text">{validationError}</p> : null}

          {result ? (
            <div className={styles.resolvedFilters}>
              <span className={styles.filterChip}>From: {result.filters.from}</span>
              <span className={styles.filterChip}>To: {result.filters.to}</span>
              <span className={styles.filterChip}>Mode: {result.filters.mode}</span>
              <span className={styles.filterChip}>By: {result.filters.funnelBy}</span>
              {result.filters.platform ? (
                <span className={styles.filterChip}>Platform: {result.filters.platform}</span>
              ) : null}
              {result.filters.appVersion ? (
                <span className={styles.filterChip}>App Version: {result.filters.appVersion}</span>
              ) : null}
              {result.filters.osVersion ? (
                <span className={styles.filterChip}>OS Version: {result.filters.osVersion}</span>
              ) : null}
              {result.filters.country ? (
                <span className={styles.filterChip}>Country: {result.filters.country}</span>
              ) : null}
              {result.filters.city ? (
                <span className={styles.filterChip}>City: {result.filters.city}</span>
              ) : null}
              {result.filters.maxStepDurationMinutes ? (
                <span className={styles.filterChip}>
                  Max Duration: {result.filters.maxStepDurationMinutes}m
                </span>
              ) : null}
            </div>
          ) : null}
        </section>

        {/* Results */}
        {loading ? <LoadingState message="Running funnel analysis…" /> : null}
        {!loading && error ? (
          <ErrorState message={error} onRetry={() => void handleAnalyze()} />
        ) : null}

        {!loading && !error && result ? (
          result.totalSessions === 0 ? (
            <EmptyState message="No sessions matched the funnel criteria. Try adjusting the date range or filters." />
          ) : (
            <>
              <div className={styles.summaryGrid}>
                <div className={styles.summaryCard}>
                  <span className={styles.summaryValue}>
                    {result.totalSessions.toLocaleString()}
                  </span>
                  <span className={styles.summaryLabel}>Total Sessions</span>
                </div>
                <div className={styles.summaryCard}>
                  <span className={styles.summaryValue}>
                    {result.totalUsers.toLocaleString()}
                  </span>
                  <span className={styles.summaryLabel}>Total Users</span>
                </div>
                <div className={styles.summaryCard}>
                  <span className={styles.summaryValue}>
                    {result.steps[result.steps.length - 1]?.conversionFromFirst.toFixed(1)}%
                  </span>
                  <span className={styles.summaryLabel}>Overall Conversion</span>
                </div>
                <div className={styles.summaryCard}>
                  <span className={styles.summaryValue}>{result.steps.length}</span>
                  <span className={styles.summaryLabel}>Steps</span>
                </div>
              </div>

              <div className={styles.funnelChart}>
                {result.steps.map((step, index) => (
                  <div key={step.step}>
                    {index > 0 ? (
                      <div className={styles.dropOffRow}>
                        {step.dropOffSessions > 0 ? (
                          <span className={styles.dropOffBadge}>
                            −{step.dropOffSessions.toLocaleString()} sessions dropped
                            {step.dropOffUsers > 0
                              ? ` · ${step.dropOffUsers.toLocaleString()} users`
                              : ""}
                          </span>
                        ) : null}
                        {step.avgSecondsFromPreviousStep !== null ? (
                          <span className={styles.avgTimeBadge}>
                            avg {formatSeconds(step.avgSecondsFromPreviousStep)} to reach this step
                          </span>
                        ) : null}
                      </div>
                    ) : null}

                    <div className={styles.stepBarRow}>
                      <div className={styles.stepBarLabel}>
                        <span className={styles.stepBarNumber}>Step {step.step}</span>
                        <span className={styles.stepBarName} title={step.name}>
                          {step.name}
                        </span>
                      </div>
                      <div className={styles.stepBarTrack}>
                        <div
                          className={styles.stepBarFill}
                          style={{ width: `${Math.max(step.conversionFromFirst, 1)}%` }}
                        >
                          <span className={styles.stepBarCount}>
                            {step.sessions.toLocaleString()} sessions
                          </span>
                        </div>
                      </div>
                      <div className={styles.stepBarMeta}>
                        <span className={styles.convFromFirst}>
                          {step.conversionFromFirst.toFixed(1)}%
                        </span>
                        {index > 0 ? (
                          <span className={styles.convFromPrev}>
                            {step.conversionFromPrevious.toFixed(1)}% from prev
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className={styles.stepTable}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Step Name</th>
                      <th>Sessions</th>
                      <th>Users</th>
                      <th>Drop-off Sessions</th>
                      <th>Drop-off Users</th>
                      <th>Conv. from First</th>
                      <th>Conv. from Prev</th>
                      <th>Avg Time from Prev</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.steps.map((step) => (
                      <tr key={step.step}>
                        <td>{step.step}</td>
                        <td className={styles.stepNameCell} title={step.name}>
                          {step.name}
                        </td>
                        <td>{step.sessions.toLocaleString()}</td>
                        <td>{step.users.toLocaleString()}</td>
                        <td className={step.dropOffSessions > 0 ? styles.dropOffCell : ""}>
                          {step.dropOffSessions > 0
                            ? `−${step.dropOffSessions.toLocaleString()}`
                            : "—"}
                        </td>
                        <td className={step.dropOffUsers > 0 ? styles.dropOffCell : ""}>
                          {step.dropOffUsers > 0
                            ? `−${step.dropOffUsers.toLocaleString()}`
                            : "—"}
                        </td>
                        <td className={styles.convCell}>
                          {step.conversionFromFirst.toFixed(1)}%
                        </td>
                        <td className={styles.convCell}>
                          {step.conversionFromPrevious.toFixed(1)}%
                        </td>
                        <td>
                          {step.avgSecondsFromPreviousStep !== null
                            ? formatSeconds(step.avgSecondsFromPreviousStep)
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )
        ) : null}

        {!loading && !error && !result ? (
          <div className={styles.emptyPrompt}>
            <p>
              Add at least 2 steps above and click <strong>Analyze</strong> to run the funnel.
            </p>
          </div>
        ) : null}

      </section>
    </>
  );
}
