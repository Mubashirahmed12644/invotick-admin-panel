"use client";

import { useCallback, useEffect, useState } from "react";
import EmptyState from "@/components/EmptyState";
import ErrorState from "@/components/ErrorState";
import LoadingState from "@/components/LoadingState";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import { api, getErrorMessage, isUnauthorizedError } from "@/lib/api";
import { clearAccessToken } from "@/lib/auth";
import type { ErrorsUsersSaw } from "@/lib/types";
import { useRouter } from "next/navigation";

/**
 * Errors users saw — the drill-down behind the Health Centre card of the same name.
 *
 * Every failure message a person read in the app (`error_shown`, from 1.4.9), grouped by what they were
 * doing, what it was about and where it failed. Counts are phones, not events: the busiest phone's own
 * count sits beside each group, so one looping phone reads as one phone.
 *
 * Deliberately not in the sidebar (AGENTS.md §5): it is reached from the card. The backend judges it with
 * the same code as the card, so this list cannot disagree with the colour above it.
 */
export default function ErrorsUsersSawPage() {
  const router = useRouter();
  const [data, setData] = useState<ErrorsUsersSaw | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      setData(await api.getErrorsUsersSaw());
    } catch (err) {
      if (isUnauthorizedError(err)) {
        clearAccessToken({ sessionExpired: true });
        router.replace("/login");
        return;
      }
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <main className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Navbar title="Errors users saw" backHref="/health" backLabel="Health Centre" />
        <section className="content-wrap">
          <div style={{ marginBottom: 20 }}>
            <button type="button" onClick={() => void load()} disabled={isLoading}>
              Refresh
            </button>
          </div>

          {isLoading && <LoadingState />}
          {!isLoading && error && <ErrorState message={error} onRetry={() => void load()} />}

          {!isLoading && !error && data && (
            <>
              <p style={{ marginBottom: 8, fontWeight: 600, color: tone(data.status) }}>{data.summary}</p>
              {data.detail && (
                <p style={{ opacity: 0.75, marginBottom: 20, fontSize: 14, whiteSpace: "pre-line" }}>{data.detail}</p>
              )}

              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 28 }}>
                <Stat label="Phones that saw an error, 24 h" value={data.devicesWithErrors} />
                <Stat label="Of them, could not reach us" value={data.devicesWithNetworkErrors} />
                <Stat label="Phones that opened the app, 24 h" value={data.activeDevices} />
                <Stat label="Of them on 1.4.9 or later" value={data.activeOnFirstBuild} />
              </div>

              {data.newClasses.length > 0 && (
                <>
                  <h3 style={{ marginBottom: 8 }}>New on the current build</h3>
                  <div className="table-wrap" style={{ marginBottom: 28 }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Build</th>
                          <th>Exception</th>
                          <th>While</th>
                          <th>Phones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.newClasses.map((c) => (
                          <tr key={`${c.platform}-${c.build}-${c.exceptionClass}`}>
                            <td>{c.platform} {c.build}</td>
                            <td>{c.exceptionClass}</td>
                            <td>{c.where}</td>
                            <td><strong>{c.devices}</strong></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              <h3 style={{ marginBottom: 8 }}>Every group, last 24 h against the 7 days before</h3>
              {data.groups.length === 0 ? (
                <EmptyState message={data.status === "UNKNOWN" ? data.summary : "No error was shown to anyone in 8 days."} />
              ) : (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th></th>
                        <th>While</th>
                        <th>Kind</th>
                        <th>Phones 24 h</th>
                        <th>7-day avg / day</th>
                        <th>Times 24 h</th>
                        <th>Busiest phone</th>
                        <th>Top exception</th>
                        <th>HTTP</th>
                        <th>Builds</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.groups.map((g) => (
                        <tr key={`${g.subject}-${g.action}-${g.kind}`} title={g.flagReason ?? undefined}>
                          <td style={{ color: g.flag === "red" ? "var(--md-sys-color-error)" : g.flag === "amber" ? "var(--md-sys-color-warning)" : undefined }}>
                            {g.flag === "red" ? "●" : g.flag === "amber" ? "◐" : ""}
                          </td>
                          <td>{g.action} {g.subject}</td>
                          <td>{g.kind}</td>
                          <td><strong>{g.devices}</strong></td>
                          <td>{g.baselineDailyDevices}</td>
                          <td>{g.events}</td>
                          <td>{g.busiestPhoneEvents}</td>
                          <td>{g.topExceptionClass ? `${g.topExceptionClass} (${g.topExceptionClassDevices})` : "—"}</td>
                          <td>{g.topHttpStatus ?? "—"}</td>
                          <td>{g.builds.join(", ") || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <h3 style={{ margin: "28px 0 8px" }}>How it is judged</h3>
              <dl className="hc-facts">
                {Object.entries(data.thresholds).map(([k, v]) => (
                  <div key={k} className="hc-fact">
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
                <div className="hc-fact">
                  <dt>Window</dt>
                  <dd>last 24 h against the 7 days before ({data.baselineDays} of 7 with any rows); release builds only</dd>
                </div>
                <div className="hc-fact">
                  <dt>Set aside — our own phones and accounts</dt>
                  <dd>{data.oursSetAsidePhones} phones, {data.oursSetAsideEvents} events</dd>
                </div>
                <div className="hc-fact">
                  <dt>Sent in 8 days, by build type</dt>
                  <dd>{Object.entries(data.byBuildType).map(([k, v]) => `${k}: ${v}`).join(" · ") || "nothing yet"}</dd>
                </div>
                <div className="hc-fact">
                  <dt>Rows read</dt>
                  <dd>{data.rowsRead}{data.capped ? " — capped, the oldest days are cut" : ""}</dd>
                </div>
              </dl>
            </>
          )}
        </section>
      </div>
    </main>
  );
}

function tone(status: ErrorsUsersSaw["status"]): string | undefined {
  if (status === "CRITICAL") return "var(--md-sys-color-error)";
  if (status === "WARNING") return "var(--md-sys-color-warning)";
  return undefined;
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ minWidth: 200, flex: "1 1 200px", padding: 16, border: "1px solid rgba(128,128,128,0.25)", borderRadius: 10 }}>
      <div style={{ fontSize: 13, opacity: 0.75 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 600 }}>{value.toLocaleString()}</div>
    </div>
  );
}
