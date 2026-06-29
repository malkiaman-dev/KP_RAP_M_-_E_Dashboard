import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { canAccessApi } from "@/lib/auth/permissions";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/session";
import type { Session } from "@/lib/auth/types";

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  return verifySession(cookieStore.get(SESSION_COOKIE)?.value);
}

export async function requireSession(): Promise<
  { session: Session } | { error: NextResponse }
> {
  const session = await getSession();

  if (!session) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { session };
}

export async function requireMalki(): Promise<
  { session: Session } | { error: NextResponse }
> {
  const result = await requireSession();
  if ("error" in result) return result;

  if (result.session.role !== "malki") {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return result;
}

export async function requireApiAccess(
  apiPath: string
): Promise<{ session: Session } | { error: NextResponse }> {
  const result = await requireSession();
  if ("error" in result) return result;

  if (!canAccessApi(result.session.role, apiPath)) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return result;
}
