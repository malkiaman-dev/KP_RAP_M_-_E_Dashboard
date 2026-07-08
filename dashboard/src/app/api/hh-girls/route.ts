import { NextResponse } from "next/server";
import { loadHhGirlsMetrics } from "@/lib/data/hh-girls-loader";
import { requireApiAccess } from "@/lib/auth/guard";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireApiAccess("/api/metrics");
  if ("error" in auth) return auth.error;

  try {
    const metrics = loadHhGirlsMetrics();
    return NextResponse.json(metrics);
  } catch (error) {
    console.error("Failed to load HH/Girls metrics:", error);
    return NextResponse.json(
      { error: "Failed to load HH/Girls survey data" },
      { status: 500 }
    );
  }
}
