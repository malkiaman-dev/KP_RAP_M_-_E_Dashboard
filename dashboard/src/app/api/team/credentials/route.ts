import { NextResponse } from "next/server";
import { getPublicUsers, updateUserCredentials } from "@/lib/auth/users";
import { requireMalki } from "@/lib/auth/guard";
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

    return NextResponse.json({
      user: {
        role: updated.role,
        name: updated.name,
        email: updated.email,
      },
      requiresReLogin:
        auth.session.role === updated.role && auth.session.email !== updated.email,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
