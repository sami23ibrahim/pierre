/**
 * Minimal single-owner auth: the session cookie holds an HMAC of a fixed
 * payload keyed by the admin password. It is not forgeable without the
 * password. Uses Web Crypto so it runs in both Edge middleware and Node.
 */
const PAYLOAD = "pierre-admin-session";

async function hmacHex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function createSessionToken(secret: string): Promise<string> {
  return hmacHex(secret, PAYLOAD);
}

export async function verifySessionToken(
  token: string,
  secret: string,
): Promise<boolean> {
  if (!token || !secret) return false;
  const expected = await hmacHex(secret, PAYLOAD);
  if (token.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= token.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}
