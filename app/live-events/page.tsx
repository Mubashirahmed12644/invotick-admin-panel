"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import { api, getErrorMessage, isUnauthorizedError } from "@/lib/api";
import { clearAccessToken, isLoggedIn } from "@/lib/auth";
import type { LiveEvent, WebpanelUserWithStatsResponse } from "@/lib/types";

const POLL_MS = 2500;

function eventKind(name: string): "screen" | "click" | "lifecycle" | "other" {
  if (name === "screen_view") return "screen";
  if (name.startsWith("app_")) return "lifecycle";
  if (name.endsWith("_clicked") || name.endsWith("_add") || name.endsWith("_added") || name.includes("click"))
    return "click";
  return "other";
}

export default function LiveEventsPage() {
  const router = useRouter();

  const [users, setUsers] = useState<WebpanelUserWithStatsResponse[]>([]);
  const [search, setSearch] = useState("");
  const [userId, setUserId] = useState("");
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const sinceRef = useRef<string | null>(null);
  const seenRef = useRef<Set<string>>(new Set());
  const pausedRef = useRef(false);
  const userIdRef = useRef("");

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  const handleUnauthorized = useCallback(
    (err: unknown): boolean => {
      if (isUnauthorizedError(err)) {
        clearAccessToken();
        router.replace("/login");
        return true;
      }
      return false;
    },
    [router],
  );

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace("/login");
      return;
    }
    api
      .getAllUsersWithStats()
      .then(setUsers)
      .catch((err) => {
        if (!handleUnauthorized(err)) setError(getErrorMessage(err, "Could not load users."));
      });
  }, [router, handleUnauthorized]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = q
      ? users.filter(
          (u) =>
            u.email.toLowerCase().includes(q) ||
            (u.username ?? "").toLowerCase().includes(q) ||
            u.id.toLowerCase().includes(q),
        )
      : users;
    return base.slice(0, 30);
  }, [users, search]);

  function selectUser(id: string) {
    setUserId(id);
    userIdRef.current = id;
    setEvents([]);
    setError("");
    sinceRef.current = null;
    seenRef.current = new Set();
    setSearch("");
  }

  // Polling loop
  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    async function poll() {
      if (pausedRef.current || cancelled) return;
      try {
        const batch = await api.getLiveEvents(userIdRef.current, sinceRef.current ?? undefined, 100);
        if (cancelled) return;
        const fresh = batch.filter((e) => e.id && !seenRef.current.has(e.id));
        if (fresh.length > 0) {
          fresh.forEach((e) => e.id && seenRef.current.add(e.id));
          const maxCreated = fresh.reduce(
            (acc, e) => (e.createdAt > acc ? e.createdAt : acc),
            sinceRef.current ?? "",
          );
          if (maxCreated) sinceRef.current = maxCreated;
          // newest first in the UI
          setEvents((prev) => [...[...fresh].reverse(), ...prev].slice(0, 1000));
        }
        setError("");
      } catch (err) {
        if (!handleUnauthorized(err)) setError(getErrorMessage(err, "Poll failed — retrying…"));
      }
    }

    poll();
    const t = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [userId, handleUnauthorized]);

  const selectedUser = users.find((u) => u.id === userId);

  return (
    <main className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Navbar title="Live Events (DebugView)" />
        <section className="content-wrap">
          <div className="live-wrap">
            <section className="section-card">
              <div className="section-header">
                <h2>Select a user</h2>
              </div>
              <input
                className="input"
                placeholder="Search by email, username, or user id…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search.trim() ? (
                <div className="live-userlist">
                  {filteredUsers.map((u) => (
                    <button key={u.id} className="live-useritem" onClick={() => selectUser(u.id)}>
                      <strong>{u.email}</strong>
                      <span>{u.username ?? "—"} · {u.id.slice(0, 8)}…</span>
                    </button>
                  ))}
                  {filteredUsers.length === 0 ? <p className="api-access-desc">No matches.</p> : null}
                </div>
              ) : null}

              {userId ? (
                <div className="live-status">
                  <span>
                    Streaming: <strong>{selectedUser?.email ?? userId}</strong>
                  </span>
                  <div className="api-access-controls" style={{ marginTop: 0 }}>
                    <button className="btn btn-outline" onClick={() => setPaused((p) => !p)}>
                      {paused ? "Resume" : "Pause"}
                    </button>
                    <button
                      className="btn btn-outline"
                      onClick={() => {
                        setEvents([]);
                        seenRef.current = new Set();
                      }}
                    >
                      Clear
                    </button>
                    <span className="live-dot" data-live={!paused}>
                      {paused ? "paused" : "live"}
                    </span>
                  </div>
                </div>
              ) : null}
              {error ? <p className="error-text">{error}</p> : null}
            </section>

            {userId ? (
              <section className="section-card">
                <div className="section-header">
                  <h2>Event stream ({events.length})</h2>
                </div>
                {events.length === 0 ? (
                  <p className="api-access-desc">
                    Waiting for events… open the app as this user and interact — events appear here within ~{POLL_MS / 1000}s.
                  </p>
                ) : (
                  <div className="live-stream">
                    {events.map((e, i) => (
                      <div key={`${e.id}-${i}`} className={`live-row live-${eventKind(e.eventName)}`}>
                        <span className="live-time">{new Date(e.createdAt).toLocaleTimeString()}</span>
                        <span className="live-name">{e.eventName}</span>
                        <span className="live-screen">
                          {e.screenName ? e.screenName : ""}
                          {e.previousScreen ? ` ← ${e.previousScreen}` : ""}
                          {e.sessionId ? "" : " · ⚠️no-session"}
                        </span>
                        {e.params && Object.keys(e.params).length > 0 ? (
                          <button
                            className="live-params-btn"
                            onClick={() => setExpanded(expanded === `${e.id}-${i}` ? null : `${e.id}-${i}`)}
                          >
                            {expanded === `${e.id}-${i}` ? "hide" : "params"}
                          </button>
                        ) : (
                          <span />
                        )}
                        {expanded === `${e.id}-${i}` && e.params ? (
                          <pre className="live-params">{JSON.stringify(e.params, null, 2)}</pre>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
