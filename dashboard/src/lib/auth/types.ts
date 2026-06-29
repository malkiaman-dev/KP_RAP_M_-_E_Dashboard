export type Role = "malki" | "pidc" | "world-bank" | "piu";

export interface User {
  email: string;
  password: string;
  role: Role;
  name: string;
}

export interface Session {
  email: string;
  role: Role;
  name: string;
}
