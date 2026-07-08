import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, expectedToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const { pin } = await request.json();

  if (!process.env.APP_PIN || pin !== process.env.APP_PIN) {
    return NextResponse.json({ error: "Wrong PIN" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_COOKIE, await expectedToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
  return response;
}
