"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { api, getErrorMessage } from "@/lib/api";
import { consumeSessionExpiredFlag, isLoggedIn, setAccessToken } from "@/lib/auth";

type Step = "credentials" | "otp";

export default function LoginPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isLoggedIn()) {
      router.replace("/users");
      return;
    }

    if (consumeSessionExpiredFlag()) {
      setError("Session expired. Please log in again.");
    }
  }, [router]);

  async function onSubmitCredentials(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setInfo("");
    setIsSubmitting(true);

    try {
      const data = await api.login({ email, password });

      if (data.otpRequired) {
        setStep("otp");
        setOtp("");
        setInfo(`A 6-digit code was sent to ${data.email}.`);
      } else if (data.auth?.accessToken) {
        // 2FA disabled (escape hatch) — token issued directly.
        setAccessToken(data.auth.accessToken);
        router.replace("/users");
      } else {
        setError("Unexpected response. Please try again.");
      }
    } catch (submitError) {
      setError(getErrorMessage(submitError, "Login failed."));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onSubmitOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const data = await api.verifyAdminOtp({ email, otp });
      setAccessToken(data.accessToken);
      router.replace("/users");
    } catch (submitError) {
      setError(getErrorMessage(submitError, "Verification failed."));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onResend() {
    setError("");
    setInfo("");
    setIsSubmitting(true);
    try {
      await api.login({ email, password });
      setInfo(`A new code was sent to ${email}.`);
    } catch (resendError) {
      setError(getErrorMessage(resendError, "Could not resend the code."));
    } finally {
      setIsSubmitting(false);
    }
  }

  function backToCredentials() {
    setStep("credentials");
    setOtp("");
    setError("");
    setInfo("");
  }

  return (
    <main className="auth-screen">
      <section className="auth-card">
        <header className="auth-head">
          <span className="auth-badge">
            <Image src="/logo.png" alt="Invotick" width={30} height={30} priority />
          </span>
          <h1 className="auth-title">Admin Login</h1>
          <p className="auth-subtitle">
            {step === "credentials"
              ? "Sign in to the Invotick control panel"
              : "Enter the verification code we emailed you"}
          </p>
        </header>

        {step === "credentials" ? (
          <form onSubmit={onSubmitCredentials} className="auth-body">
            <div className="auth-field">
              <label className="auth-label" htmlFor="admin-email">
                Email
              </label>
              <div className="auth-input-wrap">
                <span className="auth-lead" aria-hidden>
                  <MailIcon />
                </span>
                <input
                  id="admin-email"
                  className="auth-input"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="admin@invotick.com"
                  required
                  autoComplete="email"
                  autoFocus
                />
              </div>
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="admin-password">
                Password
              </label>
              <div className="auth-input-wrap">
                <span className="auth-lead" aria-hidden>
                  <LockIcon />
                </span>
                <input
                  id="admin-password"
                  className="auth-input"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="auth-toggle"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            {error ? (
              <p className="auth-error" role="alert">
                <WarnIcon />
                {error}
              </p>
            ) : null}

            <button type="submit" className="auth-submit" disabled={isSubmitting}>
              {isSubmitting ? "Signing in…" : "Login"}
            </button>
          </form>
        ) : (
          <form onSubmit={onSubmitOtp} className="auth-body">
            <div className="auth-field">
              <label className="auth-label" htmlFor="admin-otp">
                Verification code
              </label>
              <div className="auth-input-wrap">
                <span className="auth-lead" aria-hidden>
                  <ShieldIcon />
                </span>
                <input
                  id="admin-otp"
                  className="auth-input auth-otp"
                  type="text"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  value={otp}
                  onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  required
                  autoFocus
                  autoComplete="one-time-code"
                />
              </div>
            </div>

            {info ? <p className="auth-info">{info}</p> : null}
            {error ? (
              <p className="auth-error" role="alert">
                <WarnIcon />
                {error}
              </p>
            ) : null}

            <button type="submit" className="auth-submit" disabled={isSubmitting || otp.length !== 6}>
              {isSubmitting ? "Verifying…" : "Verify & continue"}
            </button>

            <div className="auth-links">
              <button type="button" className="auth-linkbtn" onClick={onResend} disabled={isSubmitting}>
                Resend code
              </button>
              <button type="button" className="auth-linkbtn" onClick={backToCredentials} disabled={isSubmitting}>
                Use a different account
              </button>
            </div>
          </form>
        )}

        <footer className="auth-foot">
          <LockIcon />
          Authorized administrators only
        </footer>
      </section>
    </main>
  );
}

/* ---- inline icons (no extra deps) ---- */
function MailIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-10 6L2 7" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c6.5 0 10 8 10 8a18.5 18.5 0 0 1-2.16 3.19M6.61 6.61A18.5 18.5 0 0 0 2 12s3.5 7 10 7a9.12 9.12 0 0 0 4.06-.94" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24M2 2l20 20" />
    </svg>
  );
}

function WarnIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  );
}
