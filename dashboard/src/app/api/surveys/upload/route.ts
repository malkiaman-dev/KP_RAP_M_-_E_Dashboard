import { NextResponse } from "next/server";
import { requireMalki } from "@/lib/auth/guard";
import {
  getSurveyFileStatuses,
  saveSurveyUpload,
  SURVEY_UPLOAD_TARGETS,
  type SurveyUploadTarget,
} from "@/lib/data/survey-upload";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const VALID_TARGETS = new Set<string>(SURVEY_UPLOAD_TARGETS.map((t) => t.key));

export async function GET() {
  const auth = await requireMalki();
  if ("error" in auth) return auth.error;

  return NextResponse.json({ files: getSurveyFileStatuses() });
}

export async function POST(request: Request) {
  const auth = await requireMalki();
  if ("error" in auth) return auth.error;

  try {
    const form = await request.formData();
    const target = form.get("target");
    const file = form.get("file");

    if (typeof target !== "string" || !VALID_TARGETS.has(target)) {
      return NextResponse.json(
        { error: "Unknown or missing upload target" },
        { status: 400 }
      );
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !["csv", "xlsx", "xls"].includes(ext)) {
      return NextResponse.json(
        { error: "Only .csv, .xlsx, or .xls files are supported" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await saveSurveyUpload(
      target as SurveyUploadTarget,
      buffer,
      file.name
    );

    return NextResponse.json({
      ok: true,
      ...result,
      files: getSurveyFileStatuses(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save uploaded file";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
