import { NextResponse } from "next/server";
import {
  credentialsPath,
  getCredentialsFileContent,
  getManageableUsers,
  updateUserCredentials,
} from "@/lib/auth/users";
import { requireMalki } from "@/lib/auth/guard";
import { autoPublishDataFiles } from "@/lib/git/publish";
import { isFieldDistrict } from "@/lib/auth/districts";
import type { Role } from "@/lib/auth/types";

export async function GET() {
  const auth = await requireMalki();
  if ("error" in auth) return auth.error;

  return NextResponse.json({ users: getManageableUsers() });
}

export async function PUT(request: Request) {
  const auth = await requireMalki();
  if ("error" in auth) return auth.error;

  try {
    const body = (await request.json()) as {
      role?: Role;
      email?: string;
      password?: string;
      district?: string;
    };

    if (!body.role || !body.email) {
      return NextResponse.json(
        { error: "Role and email are required" },
        { status: 400 }
      );
    }

    if (body.role === "district" && !isFieldDistrict(body.district)) {
      return NextResponse.json(
        { error: "District is required for field accounts" },
        { status: 400 }
      );
    }

    const updated = updateUserCredentials(body.role, {
      email: body.email,
      password: body.password,
      ...(body.role === "district" && isFieldDistrict(body.district)
        ? { district: body.district }
        : {}),
    });

    let published = false;
    let publishError: string | null = null;
    try {
      published = await autoPublishDataFiles(
        [{ localPath: credentialsPath(), content: getCredentialsFileContent() }],
        `Update ${updated.name} login credentials`
      );
    } catch (error) {
      publishError =
        error instanceof Error ? error.message : "Failed to publish change";
    }

    return NextResponse.json({
      user: {
        role: updated.role,
        name: updated.name,
        email: updated.email,
        password: updated.password,
        district: updated.district,
      },
      published,
      publishError,
      requiresReLogin:
        auth.session.role === updated.role &&
        auth.session.email !== updated.email,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
