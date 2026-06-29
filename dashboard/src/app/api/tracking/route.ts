import { NextResponse } from "next/server";
import { loadTrackingMetrics } from "@/lib/data/tracking-loader";
import { requireApiAccess } from "@/lib/auth/guard";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireApiAccess("/api/tracking");
  if ("error" in auth) return auth.error;

  try {
    const metrics = loadTrackingMetrics();
    return NextResponse.json(metrics);
  } catch (error) {
    console.error("Failed to load tracking metrics:", error);
    return NextResponse.json(
      { error: "Failed to load tracking survey data" },
      { status: 500 }
    );
  }
}
