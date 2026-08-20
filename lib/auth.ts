export const TOKEN_STORAGE_KEY = "webpanel_access_token";
const SESSION_EXPIRED_KEY = "webpanel_session_expired";
const SIGN_OUT_REASON_KEY = "webpanel_sign_out_reason";

/**
 * What the request that ended the session actually said.
 *
 * A sign-out destroys its own evidence: the token is cleared and the page redirects, and the failing
 * request, its status and its body all leave the screen in the same instant. What is left is "it
 * logged me out again", which is a symptom with nothing attached to it — the same logout was
 * reported three times before anyone could say which request caused it.
 *
 * Written on the way out and read once on the login screen, so the answer is waiting where the
 * person already is.
 */
export interface SignOutReason {
  at: string;
  status?: number;
  url?: string;
  message?: string;
}

export function hasWindow(): boolean {
  return typeof window !== "undefined";
}

export function getAccessToken(): string | null {
  if (!hasWindow()) {
    return null;
  }

  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setAccessToken(token: string): void {
  if (!hasWindow()) {
    return;
  }

  window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function clearAccessToken(options?: { sessionExpired?: boolean; reason?: SignOutReason }): void {
  if (!hasWindow()) {
    return;
  }

  window.localStorage.removeItem(TOKEN_STORAGE_KEY);

  if (options?.sessionExpired || options?.reason) {
    window.localStorage.setItem(SESSION_EXPIRED_KEY, "1");
  }

  if (options?.reason) {
    try {
      window.localStorage.setItem(SIGN_OUT_REASON_KEY, JSON.stringify(options.reason));
    } catch {
      // Never let recording why we signed out be the thing that stops us signing out.
    }
  }
}

/** Read once, then forgotten — the next login screen should not repeat the last one's reason. */
export function consumeSignOutReason(): SignOutReason | null {
  if (!hasWindow()) return null;
  const raw = window.localStorage.getItem(SIGN_OUT_REASON_KEY);
  if (!raw) return null;
  window.localStorage.removeItem(SIGN_OUT_REASON_KEY);
  try {
    return JSON.parse(raw) as SignOutReason;
  } catch {
    return null;
  }
}

export function isLoggedIn(): boolean {
  return Boolean(getAccessToken());
}

export function consumeSessionExpiredFlag(): boolean {
  if (!hasWindow()) {
    return false;
  }

  const flag = window.localStorage.getItem(SESSION_EXPIRED_KEY);

  if (!flag) {
    return false;
  }

  window.localStorage.removeItem(SESSION_EXPIRED_KEY);
  return true;
}
