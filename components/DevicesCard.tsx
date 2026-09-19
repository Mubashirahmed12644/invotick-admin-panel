"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { api, getErrorMessage } from "@/lib/api";
import type { AdminDevice, AdminSignInEvent } from "@/lib/types";

/** Every line's own words, so the list reads as a sentence and not as a code. */
const KIND_LABEL: Record<string, string> = {
  sign_in: "Login hua",
  wrong_password: "Ghalat password",
  wrong_code: "Ghalat code",
  locked: "Taala laga — koshish refuse hui",
  passkey_refused: "Passkey refuse hui",
  passkey_added: "Passkey banayi gayi",
  passkey_removed: "Passkey hatayi gayi",
  device_signed_out: "Is device ko sign out kiya gaya",
};

const METHOD_LABEL: Record<string, string> = {
  password_code: "Password + email code",
  password: "Password",
  passkey: "Face ID / passkey",
};

function when(value: string | null | undefined): string {
  return value ? new Date(value).toLocaleString() : "—";
}

function icon(device: AdminDevice): string {
  return device.isMobile ? "📱" : "💻";
}

/**
 * "Aap ke devices" and "Security activity" (decision 0120), the shape of Google's account page: one card per machine
 * with where and when it was last active, its own sign-in list when opened, and "Is device se sign out" on every
 * machine except this one.
 *
 * The place and the IP are what the request reported. The header that carries them can be faked today, so both are
 * labelled approximate here and neither decides anything on the server.
 */
export default function DevicesCard({ onUnauthorized }: { onUnauthorized: (err: unknown) => boolean }) {
  const [devices, setDevices] = useState<AdminDevice[] | null>(null);
  const [activity, setActivity] = useState<AdminSignInEvent[] | null>(null);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [deviceEvents, setDeviceEvents] = useState<AdminSignInEvent[] | null>(null);
  const [emailOnNewDevice, setEmailOnNewDevice] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const load = useCallback(async () => {
    try {
      const [list, lines, settings] = await Promise.all([
        api.listAdminDevices(),
        api.adminSecurityActivity(0, 25),
        api.adminSecuritySettings(),
      ]);
      setDevices(list);
      setActivity(lines);
      setEmailOnNewDevice(settings.newDeviceEmail);
    } catch (err) {
      // Never signs the owner out from here: a panel deployed before the backend that serves these routes must not
      // throw him off the page (as PasskeysCard does for the same reason).
      setError(getErrorMessage(err, "Devices load nahi huey."));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onOpen(device: AdminDevice) {
    if (openKey === device.deviceKey) {
      setOpenKey(null);
      return;
    }
    setOpenKey(device.deviceKey);
    setDeviceEvents(null);
    try {
      setDeviceEvents(await api.adminDeviceEvents(device.deviceKey, 0, 25));
    } catch (err) {
      if (!onUnauthorized(err)) setError(getErrorMessage(err, "Is device ki list nahi mili."));
    }
  }

  async function onSignOut(device: AdminDevice) {
    if (!window.confirm(`"${device.label}" ko sign out karein? Us device ka login khatam ho jayega.`)) return;
    setError("");
    setInfo("");
    setBusy(true);
    try {
      const result = await api.signOutAdminDevice(device.deviceKey);
      setInfo(`"${device.label}" sign out ho gaya (${result.sessionsEnded} login khatam).`);
      await load();
    } catch (err) {
      if (!onUnauthorized(err)) setError(getErrorMessage(err, "Sign out nahi ho saka."));
    } finally {
      setBusy(false);
    }
  }

  async function onToggleEmail(on: boolean) {
    setError("");
    setBusy(true);
    try {
      const saved = await api.setAdminSecuritySettings(on);
      setEmailOnNewDevice(saved.newDeviceEmail);
    } catch (err) {
      if (!onUnauthorized(err)) setError(getErrorMessage(err, "Setting save nahi hui."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <section className="section-card">
        <div className="section-header">
          <h2>Aap ke devices</h2>
        </div>
        <p className="api-access-desc">
          Jin machines se is panel main login hua. Jagah aur IP sirf andaza hai — jo request ne bataya wahi likha hai.
        </p>

        <label className="filter-control" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <input
            type="checkbox"
            checked={emailOnNewDevice}
            disabled={busy}
            onChange={(e) => void onToggleEmail(e.target.checked)}
          />
          <span>Naye device se login par mujhe email bhejein</span>
        </label>

        {info ? <p className="api-access-desc">{info}</p> : null}
        {error ? <p className="error-text">{error}</p> : null}

        {devices && devices.length > 0 ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Device</th>
                  <th>Jagah (andaza)</th>
                  <th>Aakhri bar</th>
                  <th>Login / refuse</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {devices.map((device) => (
                  <Fragment key={device.deviceKey}>
                    <tr>
                      <td>
                        <button className="btn btn-outline" onClick={() => void onOpen(device)}>
                          {icon(device)} {device.label}
                          {device.current ? " — Yeh device" : ""}
                        </button>
                      </td>
                      <td>
                        {device.approximatePlace || "Maloom nahi"}
                        <br />
                        <small>Reported IP: {device.reportedIp || "—"}</small>
                      </td>
                      <td>{when(device.lastSeenAt)}</td>
                      <td>
                        {device.successes} / {device.refusals}
                      </td>
                      <td>
                        {device.current ? (
                          <span>—</span>
                        ) : (
                          <button className="btn btn-outline" onClick={() => void onSignOut(device)} disabled={busy}>
                            Is device se sign out
                          </button>
                        )}
                      </td>
                    </tr>
                    {openKey === device.deviceKey ? (
                      <tr>
                        <td colSpan={5}>
                          {deviceEvents === null ? (
                            <p className="api-access-desc">Load ho raha hai…</p>
                          ) : deviceEvents.length === 0 ? (
                            <p className="api-access-desc">Is device ki koi line nahi.</p>
                          ) : (
                            <ul className="api-access-desc">
                              {deviceEvents.map((line, index) => (
                                <li key={`${line.at}-${index}`}>
                                  {when(line.at)} — {KIND_LABEL[line.kind] || line.kind}
                                  {line.method ? ` (${METHOD_LABEL[line.method] || line.method})` : ""}
                                  {line.approximatePlace ? ` — ${line.approximatePlace}` : ""}
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        ) : devices ? (
          <p className="api-access-desc">Abhi koi device nahi. Agla login yahan dikhega.</p>
        ) : null}
      </section>

      <section className="section-card">
        <div className="section-header">
          <h2>Security activity</h2>
        </div>
        <p className="api-access-desc">
          Login, ghalat password, ghalat code, taala, passkey banana ya hatana, device sign out — sab yahan. 180 din
          rakha jata hai, phir khud delete ho jata hai.
        </p>
        {activity && activity.length > 0 ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Kab</th>
                  <th>Kya hua</th>
                  <th>Kaise</th>
                  <th>Device</th>
                  <th>Jagah (andaza)</th>
                </tr>
              </thead>
              <tbody>
                {activity.map((line, index) => (
                  <tr key={`${line.at}-${index}`}>
                    <td>{when(line.at)}</td>
                    <td>
                      {KIND_LABEL[line.kind] || line.kind}
                      {line.isNewDevice ? " — naya device" : ""}
                    </td>
                    <td>{line.method ? METHOD_LABEL[line.method] || line.method : "—"}</td>
                    <td>{line.deviceLabel || "—"}</td>
                    <td>{line.approximatePlace || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : activity ? (
          <p className="api-access-desc">Abhi kuch nahi hua.</p>
        ) : null}
      </section>
    </>
  );
}
