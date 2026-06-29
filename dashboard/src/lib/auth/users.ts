import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import type { Role, User } from "./types";

interface CredentialsFile {
  users: User[];
}

let cachedUsers: User[] | null = null;

function credentialsPath(): string {
  return join(process.cwd(), "data", "credentials.json");
}

export function getUsers(): User[] {
  if (cachedUsers) return cachedUsers;

  const raw = readFileSync(credentialsPath(), "utf-8");
  const data = JSON.parse(raw) as CredentialsFile;
  cachedUsers = data.users;
  return cachedUsers;
}

export function saveUsers(users: User[]): void {
  const data: CredentialsFile = { users };
  writeFileSync(credentialsPath(), `${JSON.stringify(data, null, 2)}\n`, "utf-8");
  cachedUsers = users;
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

export function getPublicUsers(): Pick<User, "role" | "name" | "email">[] {
  return getUsers().map(({ role, name, email }) => ({ role, name, email }));
}

export function updateUserCredentials(
  role: Role,
  updates: { email: string; password?: string }
): User {
  const users = getUsers();
  const index = users.findIndex((user) => user.role === role);

  if (index === -1) {
    throw new Error("User not found");
  }

  const email = updates.email.trim();
  if (!email) {
    throw new Error("Email is required");
  }

  const duplicate = users.some(
    (user, i) => i !== index && user.email.toLowerCase() === email.toLowerCase()
  );
  if (duplicate) {
    throw new Error("Email is already in use");
  }

  const password = updates.password?.trim();
  const updated: User = {
    ...users[index],
    email,
    password: password ? password : users[index].password,
  };

  users[index] = updated;
  saveUsers(users);
  return updated;
}
