import { NextResponse } from "next/server";
import { loadTrackingExportPayload } from "@/lib/data/tracking-loader";
import { requireApiAccess } from "@/lib/auth/guard";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireApiAccess("/api/tracking");
  if ("error" in auth) return auth.error;

  try {
    const payload = loadTrackingExportPayload();
    return NextResponse.json(payload);
  } catch (error) {
    console.error("Failed to load tracking export data:", error);
    return NextResponse.json(
      { error: "Failed to load tracking export data" },
      { status: 500 }
    );
  }
}
