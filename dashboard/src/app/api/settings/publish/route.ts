import { NextResponse } from "next/server";
import { requireMalki } from "@/lib/auth/guard";
import { getPublishStatus, publishChanges } from "@/lib/git/publish";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireMalki();
  if ("error" in auth) return auth.error;

  try {
    const status = await getPublishStatus();
    return NextResponse.json(status);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to read publish status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireMalki();
  if ("error" in auth) return auth.error;

  try {
    const body = (await request
      .json()
      .catch(() => ({}))) as { note?: string };

    const result = await publishChanges(body.note);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to publish changes";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
