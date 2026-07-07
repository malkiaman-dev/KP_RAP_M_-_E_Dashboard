import { cookies } from "next/headers";
import { verifySession, SESSION_COOKIE } from "@/lib/auth/session";
import {
  DEFAULT_FIRM_ID,
  FIRM_COOKIE,
  canRoleSwitchFirm,
  getDefaultFirmForRole,
  parseFirmPreference,
  type FirmId,
} from "@/lib/brand";

export interface ServerFirmContext {
  firmId: FirmId;
  /** When true, client must not override firm from localStorage (role-locked users). */
  locked: boolean;
}

/** Resolve the active firm on the server so the first HTML paint uses the right brand. */
export async function getServerFirmContext(): Promise<ServerFirmContext> {
  const cookieStore = await cookies();
  const session = await verifySession(cookieStore.get(SESSION_COOKIE)?.value);
  const preference = parseFirmPreference(cookieStore.get(FIRM_COOKIE)?.value);

  if (session) {
    if (!canRoleSwitchFirm(session.role)) {
      return {
        firmId: getDefaultFirmForRole(session.role),
        locked: true,
      };
    }
    return {
      firmId: preference ?? DEFAULT_FIRM_ID,
      locked: false,
    };
  }

  return {
    firmId: preference ?? DEFAULT_FIRM_ID,
    locked: false,
  };
}
