"use client";

import { useCallback, useEffect, useState } from "react";
import { api, getErrorMessage } from "@/lib/api";
import type { AdminPasskey } from "@/lib/types";
import { createPasskey, passkeyErrorMessage, passkeysSupported } from "@/lib/passkey";

/** A name for this device's passkey that the owner will recognise in the list; he can change it. */
function guessDeviceName(): string {
  if (typeof navigator === "undefined") return "Passkey";
  const ua = navigator.userAgent;
  if (/iPhone/i.test(ua)) return "iPhone";
  if (/iPad/i.test(ua)) return "iPad";
  if (/Android/i.test(ua)) return "Android";
  if (/Macintosh|Mac OS X/i.test(ua)) return "Mac";
  if (/Windows/i.test(ua)) return "Windows";
  return "Passkey";
}

function when(value: string | null): string {
  return value ? new Date(value).toLocaleString() : "—";
}

/**
 * The admin's own passkeys (decision 0117): add one on this device, see them, remove one.
 *
 * Adding asks for a fresh emailed code even though the admin is signed in: a pass stolen from a browser must not be
 * able to plant a passkey of its own, which would outlive every sign-out. One trip to the inbox per device, once.
 *
 * `onUnauthorized` is the page's own handler: a 401 here means the pass is over, as anywhere in the panel.
 */
export default function PasskeysCard({ onUnauthorized }: { onUnauthorized: (err: unknown) => boolean }) {
  const [passkeys, setPasskeys] = useState<AdminPasskey[] | null>(null);
  const [supported, setSupported] = useState(true);
  const [step, setStep] = useState<"idle" | "code">("idle");
  const [code, setCode] = useState("");
  const [name, setName] = useState("Passkey");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const load = useCallback(async () => {
    try {
      setPasskeys(await api.listPasskeys());
    } catch (err) {
      // Never signs out from here: loading the list is not the owner doing anything, and a panel deployed before the
      // backend that serves this route must not throw him out of the page (0117).
      setError(getErrorMessage(err, "Passkeys load nahi huin."));
    }
  }, []);

  useEffect(() => {
    setSupported(passkeysSupported());
    setName(guessDeviceName());
    void load();
  }, [load]);

  async function onStart() {
    setError("");
    setInfo("");
    setBusy(true);
    try {
      await api.sendPasskeyCode();
      setStep("code");
      setCode("");
      setInfo("Aap ki email par 6-digit code bheja gaya hai.");
    } catch (err) {
      if (!onUnauthorized(err)) setError(getErrorMessage(err, "Code nahi bheja ja saka."));
    } finally {
      setBusy(false);
    }
  }

  async function onCreate() {
    setError("");
    setInfo("");
    setBusy(true);
    try {
      const started = await api.passkeyRegistrationOptions(code);
      const credential = await createPasskey(started.options);
      await api.passkeyRegistrationVerify(started.challengeId, credential, name.trim() || "Passkey");
      setStep("idle");
      setCode("");
      setInfo("Passkey ban gaya. Agli dafa login page par \"Passkey / Face ID se login\" dabayein.");
      await load();
    } catch (err) {
      if (!onUnauthorized(err)) setError(passkeyErrorMessage(err, "Passkey nahi ban saka."));
    } finally {
      setBusy(false);
    }
  }

  async function onRemove(passkey: AdminPasskey) {
    if (!window.confirm(`"${passkey.name}" passkey hata dein? Us device se passkey login band ho jayega.`)) return;
    setError("");
    setInfo("");
    setBusy(true);
    try {
      await api.removePasskey(passkey.id);
      await load();
    } catch (err) {
      if (!onUnauthorized(err)) setError(getErrorMessage(err, "Passkey hataya nahi ja saka."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="section-card">
      <div className="section-header">
        <h2>Passkeys (Face ID login)</h2>
      </div>
      <p className="api-access-desc">
        Passkey ke saath login sirf email + Face ID hai — inbox ka code nahi chahiye. Email code wala login waise hi
        chalta rahega.
      </p>

      {!supported ? (
        <p className="api-access-desc">Yeh browser passkey nahi chala sakta.</p>
      ) : step === "idle" ? (
        <div className="api-access-controls">
          <button className="btn" onClick={onStart} disabled={busy}>
            {busy ? "Code bheja ja raha hai…" : "Is device par passkey banayein"}
          </button>
        </div>
      ) : (
        <div className="api-access-controls">
          <label className="filter-control">
            <span>Email ka code</span>
            <input
              className="input"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
            />
          </label>
          <label className="filter-control">
            <span>Naam</span>
            <input className="input" type="text" maxLength={64} value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <button className="btn" onClick={onCreate} disabled={busy || code.length !== 6}>
            {busy ? "Ban raha hai…" : "Passkey banayein"}
          </button>
          <button className="btn btn-outline" onClick={() => setStep("idle")} disabled={busy}>
            Cancel
          </button>
        </div>
      )}

      {info ? <p className="api-access-desc">{info}</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      {passkeys && passkeys.length > 0 ? (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Naam</th>
                <th>Banaya</th>
                <th>Aakhri login</th>
                <th>iCloud sync</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {passkeys.map((passkey) => (
                <tr key={passkey.id}>
                  <td>{passkey.name}</td>
                  <td>{when(passkey.createdAt)}</td>
                  <td>{when(passkey.lastUsedAt)}</td>
                  <td>{passkey.backedUp == null ? "—" : passkey.backedUp ? "Haan" : "Nahi"}</td>
                  <td>
                    <button className="btn btn-outline" onClick={() => onRemove(passkey)} disabled={busy}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : passkeys ? (
        <p className="api-access-desc">Abhi koi passkey nahi.</p>
      ) : null}
    </section>
  );
}
