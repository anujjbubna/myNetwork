import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const ADMIN_COOKIE = "mynetwork_admin";

function adminCredentials() {
  const id = process.env.ADMIN_ID?.trim() ?? "";
  const password = process.env.ADMIN_PASSWORD ?? "";
  return { id, password };
}

export function adminConfigured() {
  const { id, password } = adminCredentials();
  return Boolean(id && password);
}

/** HMAC token proving an admin session. */
export async function expectedAdminToken(): Promise<string> {
  const { id, password } = adminCredentials();
  const secret = process.env.AUTH_SECRET ?? "dev-secret";
  return createHmac("sha256", secret)
    .update(`mynetwork-admin-v1:${id}:${password}`)
    .digest("hex");
}

export function verifyAdminCredentials(id: string, password: string): boolean {
  const expected = adminCredentials();
  if (!expected.id || !expected.password) return false;
  try {
    const idOk =
      id.length === expected.id.length &&
      timingSafeEqual(Buffer.from(id), Buffer.from(expected.id));
    const passOk =
      password.length === expected.password.length &&
      timingSafeEqual(Buffer.from(password), Buffer.from(expected.password));
    return idOk && passOk;
  } catch {
    return false;
  }
}

export async function isAdminSession(): Promise<boolean> {
  if (!adminConfigured()) return false;
  const jar = await cookies();
  const cookie = jar.get(ADMIN_COOKIE)?.value;
  if (!cookie) return false;
  const expected = await expectedAdminToken();
  try {
    return (
      cookie.length === expected.length &&
      timingSafeEqual(Buffer.from(cookie), Buffer.from(expected))
    );
  } catch {
    return false;
  }
}

/** Returns true if admin cookie is valid, otherwise a 401/503 Response. */
export async function requireAdminSession(): Promise<true | NextResponse> {
  if (!adminConfigured()) {
    return NextResponse.json(
      { error: "Admin login is not configured (set ADMIN_ID and ADMIN_PASSWORD)" },
      { status: 503 },
    );
  }
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return true;
}

export function adminCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds,
  };
}
