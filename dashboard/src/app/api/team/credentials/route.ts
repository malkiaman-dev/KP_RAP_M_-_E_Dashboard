import { NextResponse } from "next/server";
import {
  credentialsPath,
  getCredentialsFileContent,
  getPublicUsers,
  updateUserCredentials,
} from "@/lib/auth/users";
import { requireMalki } from "@/lib/auth/guard";
import { autoPublishDataFiles } from "@/lib/git/publish";
import type { Role } from "@/lib/auth/types";

export async function GET() {
  const auth = await requireMalki();
  if ("error" in auth) return auth.error;

  return NextResponse.json({ users: getPublicUsers() });
}

export async function PUT(request: Request) {
  const auth = await requireMalki();
  if ("error" in auth) return auth.error;

  try {
    const body = (await request.json()) as {
      role?: Role;
      email?: string;
      password?: string;
    };

    if (!body.role || !body.email) {
      return NextResponse.json(
        { error: "Role and email are required" },
        { status: 400 }
      );
    }

    const updated = updateUserCredentials(body.role, {
      email: body.email,
      password: body.password,
    });

    let published = false;
    let publishError: string | null = null;
    try {
      published = await autoPublishDataFiles(
        [{ localPath: credentialsPath(), content: getCredentialsFileContent() }],
        `Update ${updated.role} login credentials`
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
      },
      published,
      publishError,
      requiresReLogin:
        auth.session.role === updated.role && auth.session.email !== updated.email,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
