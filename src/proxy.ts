import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, expectedToken } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic =
    pathname === "/login" ||
    pathname === "/api/auth" ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/sw.js" ||
    pathname.startsWith("/icons/");

  if (isPublic) return NextResponse.next();

  const cookie = request.cookies.get(AUTH_COOKIE)?.value;
  if (cookie && cookie === (await expectedToken())) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "";
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|ico|webp)$).*)"],
};
