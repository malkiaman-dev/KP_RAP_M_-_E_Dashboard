import { readFileSync } from "fs";
import { join } from "path";
import type { User } from "./types";

interface CredentialsFile {
  users: User[];
}

let cachedUsers: User[] | null = null;

export function getUsers(): User[] {
  if (cachedUsers) return cachedUsers;

  const filePath = join(process.cwd(), "data", "credentials.json");
  const raw = readFileSync(filePath, "utf-8");
  const data = JSON.parse(raw) as CredentialsFile;
  cachedUsers = data.users;
  return cachedUsers;
}

export function findUser(email: string, password: string): User | null {
  const normalizedEmail = email.trim().toLowerCase();
  return (
    getUsers().find(
      (user) =>
        user.email.toLowerCase() === normalizedEmail && user.password === password
    ) ?? null
  );
}
