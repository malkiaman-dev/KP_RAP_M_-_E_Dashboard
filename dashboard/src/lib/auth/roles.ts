import type { Role } from "./types";

export const ROLE_LABELS: Record<Role, string> = {
  malki: "Malki",
  pidc: "PIDC",
  "world-bank": "World Bank",
  piu: "PIU",
};

export const ALL_ROLES: Role[] = ["malki", "pidc", "world-bank", "piu"];
