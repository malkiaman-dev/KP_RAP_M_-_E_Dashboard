import { NextResponse } from "next/server";
import { loadDashboardMetrics } from "@/lib/data/survey-loader";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const metrics = loadDashboardMetrics();
    return NextResponse.json(metrics);
  } catch (error) {
    console.error("Failed to load metrics:", error);
    return NextResponse.json(
      { error: "Failed to load survey data" },
      { status: 500 }
    );
  }
}
