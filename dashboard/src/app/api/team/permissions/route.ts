import { NextResponse } from "next/server";
import {
  getAllRolePermissions,
  getPermissionTabs,
  updateRoleTabAccess,
} from "@/lib/auth/permissions";
import { requireMalki } from "@/lib/auth/guard";
import type { Role } from "@/lib/auth/types";

export async function GET() {
  const auth = await requireMalki();
  if ("error" in auth) return auth.error;

  return NextResponse.json({
    permissions: getAllRolePermissions(),
    tabs: getPermissionTabs(),
  });
}

export async function PUT(request: Request) {
  const auth = await requireMalki();
  if ("error" in auth) return auth.error;

  try {
    const body = (await request.json()) as {
      role?: Role;
      routes?: string[];
    };

    if (!body.role || !Array.isArray(body.routes)) {
      return NextResponse.json(
        { error: "Role and routes are required" },
        { status: 400 }
      );
    }

    const routes = updateRoleTabAccess(body.role, body.routes);

    return NextResponse.json({
      role: body.role,
      routes,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
