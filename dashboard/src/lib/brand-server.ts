import { cookies } from "next/headers";
import { verifySession, SESSION_COOKIE } from "@/lib/auth/session";
import {
  FIRM_COOKIE,
  canRoleSwitchFirm,
  getDefaultFirmForRole,
  type FirmId,
} from "@/lib/brand";

function parseFirmCookie(value: string | undefined): FirmId | null {
  if (value === "pidc" || value === "alliance") return value;
  return null;
}

export interface ServerFirmContext {
  firmId: FirmId;
  /** When true, client must not override firm from localStorage (role-locked users). */
  locked: boolean;
}

/** Resolve the active firm on the server so the first HTML paint uses the right brand. */
export async function getServerFirmContext(): Promise<ServerFirmContext> {
  const cookieStore = await cookies();
  const session = await verifySession(cookieStore.get(SESSION_COOKIE)?.value);
  const preference = parseFirmCookie(cookieStore.get(FIRM_COOKIE)?.value);

  if (session) {
    if (!canRoleSwitchFirm(session.role)) {
      return {
        firmId: getDefaultFirmForRole(session.role),
        locked: true,
      };
    }
    return {
      firmId: preference ?? "alliance",
      locked: false,
    };
  }

  return {
    firmId: preference ?? "alliance",
    locked: false,
  };
}
