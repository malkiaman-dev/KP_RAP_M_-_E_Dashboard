import { NextResponse } from "next/server";
import { loadHhGirlsExportPayload } from "@/lib/data/hh-girls-loader";
import { requireApiAccess } from "@/lib/auth/guard";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireApiAccess("/api/metrics");
  if ("error" in auth) return auth.error;

  try {
    const payload = loadHhGirlsExportPayload();
    return NextResponse.json(payload);
  } catch (error) {
    console.error("Failed to load HH/Girls export data:", error);
    return NextResponse.json(
      { error: "Failed to load HH/Girls export data" },
      { status: 500 }
    );
  }
}
