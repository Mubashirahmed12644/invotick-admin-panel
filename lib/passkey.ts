/**
 * Passkeys (WebAuthn) in the browser, for the admin sign-in (decision 0117).
 *
 * The server hands over `{"publicKey": {...}}` with every binary field as base64url text, exactly as Yubico's
 * library writes it. The browser wants those fields as bytes, and answers with bytes; this file turns one into the
 * other in both directions, and nothing else. The checking — challenge, origin, Face ID, the counter — is all on the
 * server.
 *
 * No library: the conversion is these few lines, and a dependency on the sign-in page is one more thing that can
 * break it.
 */

type Json = Record<string, unknown>;

function toBytes(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function toBase64url(buffer: ArrayBuffer | null | undefined): string | null {
  if (!buffer) return null;
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function withIdsAsBytes(list: unknown): PublicKeyCredentialDescriptor[] | undefined {
  if (!Array.isArray(list)) return undefined;
  return list.map((item) => {
    const entry = item as Json;
    return { ...entry, id: toBytes(String(entry.id)) } as PublicKeyCredentialDescriptor;
  });
}

/** Whether this browser can use a passkey at all. */
export function passkeysSupported(): boolean {
  return typeof window !== "undefined" && typeof window.PublicKeyCredential === "function" && !!navigator.credentials;
}

/** Makes a passkey on this device for the options the server gave; returns what the server's verify step reads. */
export async function createPasskey(options: { publicKey: Json }): Promise<Json> {
  const publicKey = options.publicKey;
  const user = publicKey.user as Json;
  const creation: PublicKeyCredentialCreationOptions = {
    ...(publicKey as unknown as PublicKeyCredentialCreationOptions),
    challenge: toBytes(String(publicKey.challenge)),
    user: { ...(user as unknown as PublicKeyCredentialUserEntity), id: toBytes(String(user.id)) },
    excludeCredentials: withIdsAsBytes(publicKey.excludeCredentials),
  };
  const credential = (await navigator.credentials.create({ publicKey: creation })) as PublicKeyCredential | null;
  if (!credential) throw new Error("No passkey was made.");
  const response = credential.response as AuthenticatorAttestationResponse;
  return {
    type: credential.type,
    id: credential.id,
    rawId: toBase64url(credential.rawId),
    response: {
      clientDataJSON: toBase64url(response.clientDataJSON),
      attestationObject: toBase64url(response.attestationObject),
      transports: typeof response.getTransports === "function" ? response.getTransports() : [],
    },
    clientExtensionResults: credential.getClientExtensionResults?.() ?? {},
  };
}

/** Asks this device for a passkey signature over the server's challenge (Face ID, fingerprint or PIN). */
export async function getPasskey(options: { publicKey: Json }): Promise<Json> {
  const publicKey = options.publicKey;
  const request: PublicKeyCredentialRequestOptions = {
    ...(publicKey as unknown as PublicKeyCredentialRequestOptions),
    challenge: toBytes(String(publicKey.challenge)),
    allowCredentials: withIdsAsBytes(publicKey.allowCredentials),
  };
  const credential = (await navigator.credentials.get({ publicKey: request })) as PublicKeyCredential | null;
  if (!credential) throw new Error("No passkey was chosen.");
  const response = credential.response as AuthenticatorAssertionResponse;
  return {
    type: credential.type,
    id: credential.id,
    rawId: toBase64url(credential.rawId),
    response: {
      clientDataJSON: toBase64url(response.clientDataJSON),
      authenticatorData: toBase64url(response.authenticatorData),
      signature: toBase64url(response.signature),
      userHandle: toBase64url(response.userHandle),
    },
    clientExtensionResults: credential.getClientExtensionResults?.() ?? {},
  };
}

/** A browser refusal in the owner's words: cancelled, or this device has no passkey for the panel. */
export function passkeyErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError") return "Passkey cancel ho gaya, ya is device par koi passkey nahi. Dobara koshish karein, ya email code se login karein.";
    if (error.name === "InvalidStateError") return "Is device par passkey pehle se bana hua hai.";
    if (error.name === "SecurityError") return "Yeh page passkey nahi maang sakta (address check karein).";
  }
  return error instanceof Error && error.message ? error.message : fallback;
}
