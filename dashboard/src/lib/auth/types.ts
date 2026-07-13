import type { FieldDistrict } from "./districts";

export type Role = "malki" | "pidc" | "world-bank" | "piu" | "district";

export interface User {
  email: string;
  password: string;
  role: Role;
  name: string;
  /** Present for district field accounts — scopes error log access. */
  district?: FieldDistrict;
}

export interface Session {
  email: string;
  role: Role;
  name: string;
  district?: FieldDistrict;
}
