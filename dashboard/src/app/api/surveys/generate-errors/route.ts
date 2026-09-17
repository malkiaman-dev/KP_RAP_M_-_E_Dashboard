import { NextResponse } from "next/server";
import { requireMalki } from "@/lib/auth/guard";
import {
  ALL_DQA_MODULES,
  getDqaLastError,
  getDqaStatus,
  isErrorLogStale,
  isPythonAvailable,
  runDqaNow,
  type DqaModule,
} from "@/lib/data/dqa-runner";
import { publishChanges } from "@/lib/git/publish";

const VALID_MODULES = new Set<string>(ALL_DQA_MODULES);

export const dynamic = "force-dynamic";
/** Regenerating the error log runs the Python DQA pipeline and can take minutes. */
export const maxDuration = 300;

export async function GET() {
  const auth = await requireMalki();
  if ("error" in auth) return auth.error;

  const pythonAvailable = await isPythonAvailable();

  return NextResponse.json({
    status: pythonAvailable ? getDqaStatus() : "unavailable",
    stale: isErrorLogStale(),
    lastError: getDqaLastError(),
    pythonAvailable,
  });
}

export async function POST(request: Request) {
  const auth = await requireMalki();
  if ("error" in auth) return auth.error;

  const body = (await request.json().catch(() => ({}))) as {
    modules?: unknown;
  };

  let modules: DqaModule[] | undefined;
  if (Array.isArray(body.modules)) {
    const requested = body.modules.filter(
      (m): m is DqaModule => typeof m === "string" && VALID_MODULES.has(m)
    );
    if (requested.length === 0) {
      return NextResponse.json(
        { error: "Select at least one survey type to check" },
        { status: 400 }
      );
    }
    modules = requested;
  }

  const result = await runDqaNow(modules);
  if (!result.ok) {
    return NextResponse.json(result, { status: 500 });
  }

  // Regenerating the error log only changes the local file — push it live
  // (git commit + push, same as the Settings ▸ Publish flow) so the hosted
  // dashboard picks up the fresh Daily_Error_Log.xlsx without a manual step.
  try {
    const publish = await publishChanges("Regenerate Daily_Error_Log.xlsx");
    return NextResponse.json({
      ...result,
      message: `${result.message} ${publish.message}`,
    });
  } catch (err) {
    const publishError =
      err instanceof Error ? err.message : "Failed to publish to the live server";
    return NextResponse.json({
      ...result,
      message: `${result.message} Not published live: ${publishError}`,
    });
  }
}
