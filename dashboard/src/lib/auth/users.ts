import { readFileSync, statSync, writeFileSync } from "fs";
import { join } from "path";
import bundledCredentials from "../../../data/credentials.json";
import { isFieldDistrict, type FieldDistrict } from "./districts";
import type { Role, User } from "./types";

interface CredentialsFile {
  users: User[];
}

let cachedUsers: User[] | null = null;
let cachedMtimeMs: number | null = null;
/** True when memory was updated but the filesystem write failed (e.g. serverless). */
let cacheAheadOfDisk = false;

export function credentialsPath(): string {
  return join(process.cwd(), "data", "credentials.json");
}

function serializeUsers(users: User[]): string {
  const data: CredentialsFile = { users };
  return `${JSON.stringify(data, null, 2)}\n`;
}

function bundledUsers(): User[] {
  return (bundledCredentials as CredentialsFile).users;
}

export function getUsers(): User[] {
  // Prefer in-memory updates that could not be persisted yet.
  if (cachedUsers && cacheAheadOfDisk) return cachedUsers;

  // On Vercel/serverless, always use the build-time credentials so deploys
  // cannot keep serving a stale traced copy of credentials.json.
  if (process.env.NODE_ENV === "production") {
    if (!cachedUsers) cachedUsers = bundledUsers();
    return cachedUsers;
  }

  try {
    const mtimeMs = statSync(credentialsPath()).mtimeMs;
    if (cachedUsers && cachedMtimeMs === mtimeMs) return cachedUsers;

    const raw = readFileSync(credentialsPath(), "utf-8");
    const data = JSON.parse(raw) as CredentialsFile;
    cachedUsers = data.users;
    cachedMtimeMs = mtimeMs;
    cacheAheadOfDisk = false;
    return cachedUsers;
  } catch {
    if (cachedUsers) return cachedUsers;
    cachedUsers = bundledUsers();
    return cachedUsers;
  }
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
    cachedMtimeMs = statSync(credentialsPath()).mtimeMs;
    cacheAheadOfDisk = false;
  } catch {
    // Read-only filesystem: persistence is handled by committing to GitHub.
    cacheAheadOfDisk = true;
  }
}

export function findUser(email: string, password: string): User | null {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedPassword = password.trim();
  return (
    getUsers().find(
      (user) =>
        user.email.toLowerCase() === normalizedEmail &&
        user.password === normalizedPassword
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
