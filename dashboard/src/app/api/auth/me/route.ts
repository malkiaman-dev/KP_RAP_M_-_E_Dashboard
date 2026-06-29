import { NextResponse } from "next/server";
import {
  getAllowedRoutes,
  getDefaultRoute,
} from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/guard";

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const allowedRoutes = getAllowedRoutes(session.role);

  return NextResponse.json({
    user: session,
    allowedRoutes,
    defaultRoute: getDefaultRoute(session.role),
  });
}
