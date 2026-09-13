"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api, getErrorMessage, isUnauthorizedError } from "@/lib/api";
import { clearAccessToken } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import type { SupportLookupResult } from "@/lib/types";
import styles from "./support-view.module.css";

const KIND_LABELS: Record<string, string> = {
  invotick_id: "Invotick ID",
  uuid: "user or device id",
  guest_address: "guest address",
  email: "email",
  phone: "phone number",
  device_id: "device id",
};

const MATCH_LABELS: Record<string, string> = {
  INVOTICK_ID: "Invotick ID",
  USER_ID: "User id",
  DEVICE_ID: "Device id",
  GUEST_ADDRESS: "Guest address",
  EMAIL: "Email",
  PHONE: "Own phone",
  BUSINESS_PHONE: "Business phone",
};

/**
 * Finds the account a person writing to support is talking about (decision 0075).
 *
 * The server decides what the text is (an Invotick ID, a user or device id, a guest address, an email
 * or a phone number), searches only there, and answers at most ten accounts with their email and phone
 * masked. The text goes in a request body, never a URL, and is kept nowhere but this box. Every lookup
 * is recorded, by the kind of text, never by the text.
 */
export function SupportLookup() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [result, setResult] = useState<SupportLookupResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const q = text.trim();
    if (!q) return;
    setBusy(true);
    setError("");
    try {
      setResult(await api.supportLookup(q));
    } catch (lookupError) {
      if (isUnauthorizedError(lookupError)) {
        clearAccessToken({ sessionExpired: true });
        router.replace("/login");
        return;
      }
      setResult(null);
      setError(getErrorMessage(lookupError, "The lookup failed."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="section-card">
      <div className="section-header">
        <h2>Find a user for support</h2>
      </div>
      <p className="muted-line">
        Type an Invotick ID (9 digits), a user or device id, a guest address, an email or a phone number.
        Emails and phone numbers in the answer are masked, and every lookup is recorded.
      </p>
      <form className={styles.lookupForm} onSubmit={(event) => void onSubmit(event)}>
        <input
          className="input"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="e.g. 123456782, someone@example.com or +92 300 1234567"
          aria-label="Find a user for support"
          autoComplete="off"
          spellCheck={false}
          maxLength={254}
        />
        <button type="submit" className="btn" disabled={busy || !text.trim()}>
          {busy ? "Finding…" : "Find"}
        </button>
      </form>

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}

      {result && result.candidates.length === 0 ? (
        <p className="muted-line">No account matched this {KIND_LABELS[result.kind] ?? result.kind}.</p>
      ) : null}

      {result && result.candidates.length > 0 ? (
        <div className={styles.tableWrap}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Invotick ID</th>
                <th>Name</th>
                <th>Account</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Matched on</th>
                <th>Created</th>
                <th>Last sign-in</th>
                <th aria-label="Open" />
              </tr>
            </thead>
            <tbody>
              {result.candidates.map((candidate) => (
                <tr key={candidate.userId}>
                  <td className={styles.mono}>{candidate.invotickId ?? "—"}</td>
                  <td>{candidate.username ?? "—"}</td>
                  <td>
                    {candidate.role}
                    {candidate.isDeleted ? " · deleted" : ""}
                  </td>
                  <td>{candidate.emailMasked ?? "—"}</td>
                  <td>{candidate.phoneMasked ?? "—"}</td>
                  <td>
                    {MATCH_LABELS[candidate.matchedOn] ?? candidate.matchedOn}
                    {candidate.viaRetiredGuestId ? (
                      <div className={styles.note} title={candidate.viaRetiredGuestId}>
                        found through a retired guest account
                      </div>
                    ) : null}
                  </td>
                  <td>{formatDateTime(candidate.createdAt)}</td>
                  <td>{formatDateTime(candidate.lastLoginAt)}</td>
                  <td>
                    <Link className="btn btn-outline" href={`/users/${candidate.userId}?tab=support`}>
                      Open support view
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {result.truncated ? (
            <p className="muted-line">
              More accounts matched{result.matched != null ? ` (${result.matched} in all)` : ""} than the ten
              shown. Type something more specific.
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
