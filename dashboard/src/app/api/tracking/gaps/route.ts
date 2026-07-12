import { NextResponse } from "next/server";
import path from "path";
import { loadTrackingSurvey } from "@/lib/data/tracking-loader";
import { computeTrackingTargetGaps } from "@/lib/data/tracking-target-gaps";
import { trackingTargetsAvailable } from "@/lib/data/tracking-targets-loader";
import { filesSignature, getCached } from "@/lib/data/survey-cache";
import { requireApiAccess } from "@/lib/auth/guard";

export const dynamic = "force-dynamic";

const DATA_ROOT = path.join(process.cwd(), "..");

function trackingGapsSignature(): string {
  return filesSignature([
    path.join(DATA_ROOT, "Surveys", "Tracking_Survey_Baseline.csv"),
    path.join(DATA_ROOT, "Surveys", "Tracking_Survey_NewSample.csv"),
    path.join(DATA_ROOT, "Surveys", "Tracking_Survey.csv"),
    path.join(DATA_ROOT, "Tracking_Targets", "Tracking_Survey_Baseline.xlsx"),
    path.join(DATA_ROOT, "Tracking_Targets", "Tracking_Survey_NewSample.xlsx"),
  ]);
}

export async function GET() {
  const auth = await requireApiAccess("/api/tracking");
  if ("error" in auth) return auth.error;

  try {
    if (!trackingTargetsAvailable()) {
      return NextResponse.json(computeTrackingTargetGaps([]));
    }

    const gaps = getCached("tracking-gaps-v1", trackingGapsSignature(), () =>
      computeTrackingTargetGaps(loadTrackingSurvey())
    );
    return NextResponse.json(gaps);
  } catch (error) {
    console.error("Failed to compute tracking target gaps:", error);
    return NextResponse.json(
      { error: "Failed to load tracking target gap analysis" },
      { status: 500 }
    );
  }
}
