import { NextResponse } from "next/server";
import { findUser } from "@/lib/auth/users";
import { getDefaultRoute } from "@/lib/auth/permissions";
import { signSession, sessionCookieOptions } from "@/lib/auth/session";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; password?: string };

    if (!body.email || !body.password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const user = findUser(body.email, body.password);
    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const session = {
      email: user.email,
      role: user.role,
      name: user.name,
    };

    const token = await signSession(session);
    const response = NextResponse.json({
      user: session,
      redirectTo: getDefaultRoute(user.role),
    });

    const cookie = sessionCookieOptions(token);
    response.cookies.set(cookie.name, cookie.value, {
      httpOnly: cookie.httpOnly,
      secure: cookie.secure,
      sameSite: cookie.sameSite,
      path: cookie.path,
      maxAge: cookie.maxAge,
    });

    return response;
  } catch {
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
