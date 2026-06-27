import { NextResponse } from "next/server";
import { loadErrorMetrics } from "@/lib/data/error-loader";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const metrics = loadErrorMetrics();
    return NextResponse.json(metrics);
  } catch (error) {
    console.error("Failed to load error log:", error);
    return NextResponse.json(
      { error: "Failed to load error log data" },
      { status: 500 }
    );
  }
}
