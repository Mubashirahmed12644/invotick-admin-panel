import { createHash } from "node:crypto";

/**
 * The Screen Map's reference pictures, read from the private Vercel Blob store `invotick-screenmap`.
 *
 * The store is private: nothing in it opens without its read-write token, and that token must never reach a
 * browser. So the page asks this route, and this route asks the store.
 *
 *   GET /api/screenmap/<versionCode>/manifest.json
 *   GET /api/screenmap/<versionCode>/<screen>/<state>-<theme>.webp | .bounds.json
 *   GET /api/screenmap/latest/…                     the newest release in the store
 *
 * Only a signed-in admin gets an answer. The panel keeps no session of its own — the backend decides who is an
 * admin — so the caller's bearer token is put to the backend's admin-only `GET /v2/auth/admin-passkeys`, the same
 * `@RequireRole(ADMIN)` every other panel call meets. A yes is remembered for a minute, so a page of pictures costs
 * one check, not one per picture.
 *
 * Only `screenmap/…` paths are read, one plain segment at a time, and only `.json` / `.webp` / `.png`.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PREFIX = "screenmap/";
const SEGMENT = /^[A-Za-z0-9._-]+$/;
const TYPES: Record<string, string> = { json: "application/json", webp: "image/webp", png: "image/png" };
/** What @vercel/blob 2.8.0 sends; the list call needs it. */
const BLOB_API_VERSION = "12";

const BACKEND = (process.env.NEXT_PUBLIC_API_BASE_URL || "https://stage.invotick.com").replace(/\/$/, "");

const fail = (status: number, code: string, message: string) =>
  Response.json({ error: { code, message, status } }, { status, headers: { "Cache-Control": "no-store" } });

// ── who may ask ──────────────────────────────────────────────────────────────────────────────────────────────

const admins = new Map<string, number>();
const ADMIN_TTL_MS = 60_000;

async function isAdmin(authorization: string | null): Promise<boolean> {
  if (!authorization?.startsWith("Bearer ") || authorization.length < 20) return false;
  const key = createHash("sha256").update(authorization).digest("hex");
  const until = admins.get(key);
  if (until && until > Date.now()) return true;
  const r = await fetch(`${BACKEND}/v2/auth/admin-passkeys`, {
    headers: { Authorization: authorization },
    cache: "no-store",
  }).catch(() => null);
  if (!r?.ok) {
    admins.delete(key);
    return false;
  }
  if (admins.size > 200) admins.clear();
  admins.set(key, Date.now() + ADMIN_TTL_MS);
  return true;
}

// ── the store ────────────────────────────────────────────────────────────────────────────────────────────────

function storeToken(): string | null {
  return process.env.BLOB_READ_WRITE_TOKEN || null;
}

/**
 * The store's host is named by its id. @vercel/blob reads it from the token (`vercel_blob_rw_<storeId>_<secret>`);
 * `BLOB_STORE_ID` (`store_<id>`, set when the store was connected to this project) is the fallback.
 */
function storeId(token: string): string | null {
  return token.split("_")[3] || process.env.BLOB_STORE_ID?.replace(/^store_/, "").toLowerCase() || null;
}

/** The newest `screenmap/<versionCode>/` folder in the store. */
async function latestRelease(token: string): Promise<string | null> {
  const q = new URLSearchParams({ prefix: PREFIX, mode: "folded", limit: "1000" });
  const r = await fetch(`https://blob.vercel-storage.com/?${q}`, {
    headers: { authorization: `Bearer ${token}`, "x-api-version": BLOB_API_VERSION },
    cache: "no-store",
  }).catch(() => null);
  if (!r?.ok) return null;
  const body = (await r.json().catch(() => null)) as { folders?: string[] } | null;
  const codes = (body?.folders ?? [])
    .map((f) => f.slice(PREFIX.length).replace(/\/$/, ""))
    .filter((c) => /^\d+$/.test(c))
    .map(Number);
  return codes.length ? String(Math.max(...codes)) : null;
}

export async function GET(request: Request, ctx: { params: Promise<{ path: string[] }> }): Promise<Response> {
  if (!(await isAdmin(request.headers.get("authorization")))) {
    return fail(401, "UNAUTHORIZED", "Sign in as an admin to see the Screen Map.");
  }

  const segments = (await ctx.params).path ?? [];
  if (segments.length < 2 || segments.some((s) => !SEGMENT.test(s) || s === "." || s === "..")) {
    return fail(400, "BAD_REQUEST", "Not a Screen Map path.");
  }
  const ext = segments[segments.length - 1].split(".").pop()?.toLowerCase() ?? "";
  const type = TYPES[ext];
  if (!type) return fail(400, "BAD_REQUEST", "Only .json, .webp and .png are served.");

  const token = storeToken();
  const id = token ? storeId(token) : null;
  if (!token || !id) return fail(503, "NOT_CONFIGURED", "BLOB_READ_WRITE_TOKEN is not set on this deployment.");

  if (segments[0] === "latest") {
    const newest = await latestRelease(token);
    if (!newest) return fail(404, "NOT_FOUND", "No release in the store yet.");
    segments[0] = newest;
  }

  const pathname = PREFIX + segments.join("/");
  if (!pathname.startsWith(PREFIX)) return fail(400, "BAD_REQUEST", "Not a Screen Map path.");

  const upstream = await fetch(`https://${id}.private.blob.vercel-storage.com/${pathname}`, {
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  }).catch(() => null);
  if (!upstream) return fail(502, "UPSTREAM", "The picture store did not answer.");
  if (upstream.status === 404) return fail(404, "NOT_FOUND", "No such picture.");
  if (!upstream.ok || !upstream.body) return fail(502, "UPSTREAM", `The picture store answered ${upstream.status}.`);

  // Pictures of a release never change; its manifest can be rewritten by a new run, and `latest` moves.
  const cache = ext === "json" || request.url.includes("/latest/") ? "private, max-age=60" : "private, max-age=3600";
  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": type,
      "Cache-Control": cache,
      "X-Content-Type-Options": "nosniff",
      ...(upstream.headers.get("content-length") ? { "Content-Length": upstream.headers.get("content-length")! } : {}),
    },
  });
}
