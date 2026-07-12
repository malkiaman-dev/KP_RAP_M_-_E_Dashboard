import { NextResponse } from "next/server";
import { loadErrorMetrics } from "@/lib/data/error-loader";
import { requireApiAccess } from "@/lib/auth/guard";

export const dynamic = "force-dynamic";
/** DQA may still be regenerating in the background; allow a long request budget. */
export const maxDuration = 60;

export async function GET() {
  const auth = await requireApiAccess("/api/errors");
  if ("error" in auth) return auth.error;

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
