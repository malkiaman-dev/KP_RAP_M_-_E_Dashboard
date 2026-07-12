import { NextResponse } from "next/server";
import { loadTrackingSurvey } from "@/lib/data/tracking-loader";
import { computeTrackingTargetGaps } from "@/lib/data/tracking-target-gaps";
import { requireApiAccess } from "@/lib/auth/guard";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireApiAccess("/api/tracking");
  if ("error" in auth) return auth.error;

  try {
    const gaps = computeTrackingTargetGaps(loadTrackingSurvey());
    return NextResponse.json(gaps);
  } catch (error) {
    console.error("Failed to compute tracking target gaps:", error);
    return NextResponse.json(
      { error: "Failed to load tracking target gap analysis" },
      { status: 500 }
    );
  }
}
