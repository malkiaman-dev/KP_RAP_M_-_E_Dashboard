import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  canAccessApi,
  canAccessRoute,
  getDefaultRoute,
} from "@/lib/auth/roles";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/session";

const PUBLIC_PATHS = ["/login"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.includes(pathname)) {
    const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);
    if (session) {
      return NextResponse.redirect(
        new URL(getDefaultRoute(session.role), request.url)
      );
    }
    return NextResponse.next();
  }

  if (pathname === "/api/auth/login") {
    return NextResponse.next();
  }

  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);

  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    if (!canAccessApi(session.role, pathname)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.next();
  }

  if (!canAccessRoute(session.role, pathname)) {
    return NextResponse.redirect(
      new URL(getDefaultRoute(session.role), request.url)
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
