import { NextResponse } from "next/server";
import { loadTrackedGirlsByDistrict } from "@/lib/data/tracking-loader";
import { requireApiAccess } from "@/lib/auth/guard";

export const dynamic = "force-dynamic";

/** Successfully tracked girls per district (HH / Girls district targets). */
export async function GET() {
  const auth = await requireApiAccess("/api/tracking-district-targets");
  if ("error" in auth) return auth.error;

  try {
    return NextResponse.json(loadTrackedGirlsByDistrict());
  } catch (error) {
    console.error("Failed to load district targets:", error);
    return NextResponse.json(
      { error: "Failed to load tracking survey data" },
      { status: 500 }
    );
  }
}
