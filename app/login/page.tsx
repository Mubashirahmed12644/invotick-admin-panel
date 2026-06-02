"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import { api, getErrorMessage } from "@/lib/api";
import { consumeSessionExpiredFlag, isLoggedIn, setAccessToken } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
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

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const data = await api.login({
        email,
        password,
      });

      setAccessToken(data.accessToken);
      router.replace("/users");
    } catch (submitError) {
      setError(getErrorMessage(submitError, "Login failed."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="center-screen page-pad">
      <section className="login-card">
        <Logo href="/login" width={172} height={42} />
        <h1>Admin Login</h1>
        <form onSubmit={onSubmit} className="form-grid">
          <label>
            Email
            <input
              className="input"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
            />
          </label>
          <label>
            Password
            <input
              className="input"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoComplete="current-password"
            />
          </label>
          {error ? <p className="error-text">{error}</p> : null}
          <button type="submit" className="btn" disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Login"}
          </button>
        </form>
      </section>
    </main>
  );
}
