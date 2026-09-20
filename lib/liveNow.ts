import { getAccessToken } from "@/lib/auth";
import type { LiveNow } from "@/lib/types";

/**
 * The live-now stream: who is on the app right now, pushed by the server (decision 0122).
 *
 * ## Why this is not `EventSource`
 *
 * The browser's own `EventSource` cannot set a header, and every panel route is reached with
 * `Authorization: Bearer …`. The alternatives are a token in the query string — which would land in
 * nginx's access log on every reconnection — or a cookie the panel does not use. So the stream is
 * read with `fetch`, which takes the header, and the handful of lines below parse the same
 * `text/event-stream` format `EventSource` would have parsed.
 *
 * ## What it guarantees the caller
 *
 * - `onSnapshot` is called with a complete picture, never a difference, so a reconnection needs no
 *   catching up and the page cannot drift.
 * - `onState` says what the connection is doing, so the page can show it rather than leave a stale
 *   number looking live.
 * - When the stream cannot be held at all — a proxy that will not pass one, a network that blocks
 *   it, the server's open-stream cap — it falls back to asking the same endpoint's ordinary JSON
 *   form on a timer. That read costs the server nothing either: both answer from memory.
 * - The server ends each stream after ten minutes, inside nginx's fifteen-minute read timeout, so a
 *   clean reconnection is the normal case and not an error.
 */
export type LiveNowState = "connecting" | "streaming" | "polling" | "offline";

const STREAM_PATH = "/backend/v1/webpanel/analytics/live-now/stream";
const SNAPSHOT_PATH = "/backend/v1/webpanel/analytics/live-now";

/** How often the fallback asks, when the stream could not be held. */
const POLL_MS = 5_000;

/** Reconnection backoff: quick at first, then patient, never faster than the server can cope with. */
const BACKOFF_MS = [1_000, 2_000, 5_000, 10_000, 20_000];

export interface LiveNowStream {
  close(): void;
}

export function openLiveNowStream(
  onSnapshot: (snapshot: LiveNow) => void,
  onState: (state: LiveNowState) => void,
): LiveNowStream {
  let closed = false;
  let attempt = 0;
  let controller: AbortController | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const wait = (ms: number) =>
    new Promise<void>((resolve) => {
      timer = setTimeout(resolve, ms);
    });

  /** The fallback. Same data, same cost to the server, just on a timer instead of on a change. */
  async function pollOnce(): Promise<boolean> {
    const token = getAccessToken();
    if (!token) return false;
    const res = await fetch(SNAPSHOT_PATH, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return false;
    const body = await res.json();
    if (body?.data) onSnapshot(body.data as LiveNow);
    return true;
  }

  async function readStream(): Promise<"ended" | "refused"> {
    const token = getAccessToken();
    if (!token) return "refused";
    controller = new AbortController();
    const res = await fetch(STREAM_PATH, {
      headers: { Authorization: `Bearer ${token}`, Accept: "text/event-stream" },
      cache: "no-store",
      signal: controller.signal,
    });
    // 503 is the server's open-stream cap, and it means "keep polling", not "something broke".
    if (!res.ok || !res.body) return "refused";

    onState("streaming");
    attempt = 0;

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) return "ended";
      buffer += decoder.decode(value, { stream: true });
      // One message ends at a blank line. A line beginning ':' is a keep-alive comment, and a
      // message may carry several `data:` lines, which are joined with a newline.
      let split = buffer.indexOf("\n\n");
      while (split !== -1) {
        const chunk = buffer.slice(0, split);
        buffer = buffer.slice(split + 2);
        const data = chunk
          .split("\n")
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trimStart())
          .join("\n");
        if (data) {
          try {
            onSnapshot(JSON.parse(data) as LiveNow);
          } catch {
            // A half-delivered message is not worth tearing the stream down for.
          }
        }
        split = buffer.indexOf("\n\n");
      }
    }
  }

  (async () => {
    while (!closed) {
      onState(attempt === 0 ? "connecting" : "connecting");
      let outcome: "ended" | "refused" | "error" = "error";
      try {
        outcome = await readStream();
      } catch {
        outcome = "error";
      }
      if (closed) return;

      if (outcome === "ended" && attempt === 0) {
        // The server closed a healthy stream on its own schedule. Reconnect at once, with no
        // backoff and no "reconnecting" flicker: nothing went wrong.
        continue;
      }

      // Could not hold a stream. Keep the page alive on the cheap JSON form while trying again.
      onState("polling");
      const until = Date.now() + BACKOFF_MS[Math.min(attempt, BACKOFF_MS.length - 1)];
      attempt += 1;
      let everAnswered = false;
      while (!closed && Date.now() < until) {
        try {
          everAnswered = (await pollOnce()) || everAnswered;
        } catch {
          // fall through to the state below
        }
        if (closed) return;
        await wait(POLL_MS);
      }
      if (!everAnswered && !closed) onState("offline");
    }
  })();

  return {
    close() {
      closed = true;
      if (timer) clearTimeout(timer);
      controller?.abort();
    },
  };
}
