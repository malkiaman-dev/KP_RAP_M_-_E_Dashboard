import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { isFieldDistrict, type FieldDistrict } from "./districts";
import type { Role, User } from "./types";

interface CredentialsFile {
  users: User[];
}

let cachedUsers: User[] | null = null;

export function credentialsPath(): string {
  return join(process.cwd(), "data", "credentials.json");
}

function serializeUsers(users: User[]): string {
  const data: CredentialsFile = { users };
  return `${JSON.stringify(data, null, 2)}\n`;
}

export function getUsers(): User[] {
  if (cachedUsers) return cachedUsers;

  const raw = readFileSync(credentialsPath(), "utf-8");
  const data = JSON.parse(raw) as CredentialsFile;
  cachedUsers = data.users;
  return cachedUsers;
}

export function getCredentialsFileContent(): string {
  return serializeUsers(getUsers());
}

export function saveUsers(users: User[]): void {
  // Update the in-memory cache first so the change is live immediately even
  // when the filesystem is read-only (e.g. on a serverless host).
  cachedUsers = users;
  try {
    writeFileSync(credentialsPath(), serializeUsers(users), "utf-8");
  } catch {
    // Read-only filesystem: persistence is handled by committing to GitHub.
  }
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

export function getPublicUsers(): Pick<User, "role" | "name" | "email" | "district">[] {
  return getUsers().map(({ role, name, email, district }) => ({
    role,
    name,
    email,
    district,
  }));
}

/** Malki-only credential management view — includes plaintext passwords. */
export function getManageableUsers(): Pick<
  User,
  "role" | "name" | "email" | "password" | "district"
>[] {
  return getUsers().map(({ role, name, email, password, district }) => ({
    role,
    name,
    email,
    password,
    district,
  }));
}

export function updateUserCredentials(
  role: Role,
  updates: { email: string; password?: string; district?: FieldDistrict }
): User {
  const users = getUsers();
  const index =
    role === "district"
      ? users.findIndex(
          (user) =>
            user.role === "district" &&
            user.district === updates.district
        )
      : users.findIndex((user) => user.role === role);

  if (index === -1) {
    throw new Error("User not found");
  }

  if (role === "district" && !isFieldDistrict(updates.district)) {
    throw new Error("District is required for field accounts");
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
