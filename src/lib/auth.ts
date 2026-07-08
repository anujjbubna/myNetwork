export const AUTH_COOKIE = "mynetwork_auth";

/** HMAC-SHA256 of a fixed message with AUTH_SECRET, hex-encoded. Works in both Node and Edge runtimes. */
export async function expectedToken(): Promise<string> {
  const secret = process.env.AUTH_SECRET ?? "dev-secret";
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode("mynetwork-session-v1"));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
