import type { Role } from "./types";

export const ROLE_LABELS: Record<Role, string> = {
  malki: "Malki",
  pidc: "PIDC",
  "world-bank": "World Bank",
  piu: "PIU",
  district: "Field Team",
};

/** Stakeholder roles with one account each (excludes multi-account district). */
export const STAKEHOLDER_ROLES: Role[] = [
  "malki",
  "pidc",
  "world-bank",
  "piu",
];

export const ALL_ROLES: Role[] = [...STAKEHOLDER_ROLES, "district"];
