import { NextResponse } from "next/server";
import { requireMalki } from "@/lib/auth/guard";
import {
  ALL_DQA_MODULES,
  getDqaLastError,
  getDqaStatus,
  isErrorLogStale,
  runDqaNow,
  type DqaModule,
} from "@/lib/data/dqa-runner";

const VALID_MODULES = new Set<string>(ALL_DQA_MODULES);

export const dynamic = "force-dynamic";
/** Regenerating the error log runs the Python DQA pipeline and can take minutes. */
export const maxDuration = 300;

export async function GET() {
  const auth = await requireMalki();
  if ("error" in auth) return auth.error;

  return NextResponse.json({
    status: getDqaStatus(),
    stale: isErrorLogStale(),
    lastError: getDqaLastError(),
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
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
