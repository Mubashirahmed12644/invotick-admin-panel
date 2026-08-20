"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import { api, getErrorMessage, isUnauthorizedError, ApiError } from "@/lib/api";
import { clearAccessToken, isLoggedIn } from "@/lib/auth";
import type { ApiTokenResponse } from "@/lib/types";

export default function ApiAccessPage() {
  const router = useRouter();

  const [expiryDays, setExpiryDays] = useState(30);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<ApiTokenResponse | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [revoked, setRevoked] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace("/login");
    }
  }, [router]);

  function handleUnauthorized(err: unknown): boolean {
    if (isUnauthorizedError(err)) {
      clearAccessToken({
        reason: {
          at: new Date().toISOString(),
          status: err instanceof ApiError ? err.status : undefined,
          url: err instanceof ApiError ? err.url : undefined,
          message: err instanceof Error ? err.message : String(err),
        },
      });
      router.replace("/login");
      return true;
    }
    return false;
  }

  async function onGenerate() {
    setError("");
    setCopied(false);
    setRevoked(false);
    setResult(null);
    setIsGenerating(true);
    try {
      const data = await api.generateApiToken(expiryDays);
      setResult(data);
    } catch (err) {
      if (!handleUnauthorized(err)) {
        setError(getErrorMessage(err, "Could not generate token."));
      }
    } finally {
      setIsGenerating(false);
    }
  }

  async function onCopy() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setError("Copy failed — select the token and copy manually.");
    }
  }

  async function onRevoke() {
    if (!result) return;
    setError("");
    setRevoking(true);
    try {
      await api.revokeApiToken(result.jti);
      setRevoked(true);
    } catch (err) {
      if (!handleUnauthorized(err)) {
        setError(getErrorMessage(err, "Could not revoke token."));
      }
    } finally {
      setRevoking(false);
    }
  }

  return (
    <main className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Navbar title="API Access" />
        <section className="content-wrap">
          <div className="api-access-wrap">
            <section className="section-card">
              <div className="section-header">
                <h2>Generate API token</h2>
              </div>
              <p className="api-access-desc">
                Create a revocable token for programmatic read access to the webpanel &amp; analytics
                APIs. Use it as an <code>Authorization: Bearer &lt;token&gt;</code> header.
              </p>

              <div className="api-access-warn" role="note">
                ⚠️ This token carries <strong>admin privileges</strong>. Treat it like a password —
                share it only with a trusted tool, and revoke it when you&apos;re done.
              </div>

              <div className="api-access-controls">
                <label className="filter-control">
                  <span>Expires in</span>
                  <select
                    className="input"
                    value={expiryDays}
                    onChange={(e) => setExpiryDays(Number(e.target.value))}
                  >
                    <option value={7}>7 days</option>
                    <option value={30}>30 days</option>
                    <option value={90}>90 days</option>
                  </select>
                </label>
                <button className="btn" onClick={onGenerate} disabled={isGenerating}>
                  {isGenerating ? "Generating…" : "Generate token"}
                </button>
              </div>

              {error ? <p className="error-text">{error}</p> : null}
            </section>

            {result ? (
              <section className="section-card">
                <div className="section-header">
                  <h2>Your token</h2>
                </div>
                <p className="api-access-desc">
                  Copy this now — it won&apos;t be shown again. Expires{" "}
                  <strong>{new Date(result.expiresAt).toLocaleString()}</strong> ({result.expiryDays} days).
                </p>
                <textarea className="input api-access-token" readOnly rows={4} value={result.token} />
                <div className="api-access-controls">
                  <button className="btn" onClick={onCopy}>
                    {copied ? "Copied ✓" : "Copy token"}
                  </button>
                  <button
                    className="btn btn-outline"
                    onClick={onRevoke}
                    disabled={revoking || revoked}
                  >
                    {revoked ? "Revoked ✓" : revoking ? "Revoking…" : "Revoke this token"}
                  </button>
                </div>
                <p className="api-access-jti">
                  Token id (jti): <code>{result.jti}</code>
                </p>
                {revoked ? (
                  <p className="api-access-desc">This token has been revoked and no longer works.</p>
                ) : null}
              </section>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
