import { getAllowedRoutes, getDefaultRoute } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/guard";
import type { Session } from "@/lib/auth/types";

export interface ServerAuthState {
  user: Session;
  allowedRoutes: string[];
  defaultRoute: string;
}

export async function getServerAuthState(): Promise<ServerAuthState | null> {
  const session = await getSession();
  if (!session) return null;

  return {
    user: session,
    allowedRoutes: getAllowedRoutes(session.role),
    defaultRoute: getDefaultRoute(session.role),
  };
}
