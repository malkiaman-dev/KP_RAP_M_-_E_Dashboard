import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth/session";

export async function GET() {
  const cookieStore = await cookies();
  const session = await verifySession(cookieStore.get("dashboard_session")?.value);

  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  return NextResponse.json({ user: session });
}
