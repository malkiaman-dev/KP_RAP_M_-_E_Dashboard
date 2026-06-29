import { NextResponse } from "next/server";
import {
  getAllRolePermissions,
  getPermissionsFileContent,
  getPermissionTabs,
  permissionsPath,
  updateRoleTabAccess,
} from "@/lib/auth/permissions";
import { requireMalki } from "@/lib/auth/guard";
import { autoPublishDataFiles } from "@/lib/git/publish";
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

    let published = false;
    let publishError: string | null = null;
    try {
      published = await autoPublishDataFiles(
        [{ localPath: permissionsPath(), content: getPermissionsFileContent() }],
        `Update ${body.role} tab access`
      );
    } catch (error) {
      publishError =
        error instanceof Error ? error.message : "Failed to publish change";
    }

    return NextResponse.json({
      role: body.role,
      routes,
      published,
      publishError,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
