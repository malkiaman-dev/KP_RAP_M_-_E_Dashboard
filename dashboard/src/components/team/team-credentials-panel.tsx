"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Eye, EyeOff, KeyRound, Mail, Save, Shield } from "lucide-react";
import { ROLE_LABELS } from "@/lib/auth/roles";
import type { Role } from "@/lib/auth/types";

interface ManageableUser {
  role: Role;
  name: string;
  email: string;
  password: string;
}

interface UserFormState {
  email: string;
  password: string;
  showPassword: boolean;
  saving: boolean;
  message: string | null;
  error: string | null;
  /** True after the user edits email/password until a successful save. */
  dirty: boolean;
}

async function fetchTeamUsers(): Promise<ManageableUser[]> {
  const res = await fetch("/api/team/credentials", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load team credentials");
  const data = await res.json();
  return data.users;
}

function formFromUser(
  user: ManageableUser,
  prev?: UserFormState
): UserFormState {
  return {
    email: user.email,
    password: user.password ?? "",
    showPassword: prev?.showPassword ?? false,
    saving: false,
    message: prev?.message ?? null,
    error: null,
    dirty: false,
  };
}

export function TeamCredentialsPanel() {
  const queryClient = useQueryClient();
  const { data: users, isLoading, isError } = useQuery({
    queryKey: ["team-credentials", "v2"],
    queryFn: fetchTeamUsers,
  });

  const [forms, setForms] = useState<Partial<Record<Role, UserFormState>>>({});

  useEffect(() => {
    if (!users) return;

    setForms((prev) => {
      const next: Partial<Record<Role, UserFormState>> = { ...prev };
      for (const user of users) {
        const existing = next[user.role];
        // Never overwrite while saving, or while the admin is mid-edit.
        if (existing?.saving || existing?.dirty) continue;
        next[user.role] = formFromUser(user, existing);
      }
      return next;
    });
  }, [users]);

  function updateForm(role: Role, patch: Partial<UserFormState>) {
    setForms((prev) => ({
      ...prev,
      [role]: {
        ...(prev[role] ?? {
          email: "",
          password: "",
          showPassword: false,
          saving: false,
          message: null,
          error: null,
          dirty: false,
        }),
        ...patch,
      },
    }));
  }

  async function handleSave(user: ManageableUser) {
    const form = forms[user.role];
    if (!form) return;

    updateForm(user.role, { saving: true, message: null, error: null });

    try {
      const res = await fetch("/api/team/credentials", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: user.role,
          email: form.email,
          password: form.password.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        updateForm(user.role, {
          saving: false,
          error: data.error ?? "Failed to save changes",
        });
        return;
      }

      const savedPassword = data.user?.password ?? form.password;
      const baseMessage = data.requiresReLogin
        ? "Saved. Sign in again with your new email."
        : data.published
          ? "Saved and published live."
          : "Credentials updated successfully.";

      updateForm(user.role, {
        saving: false,
        dirty: false,
        email: data.user?.email ?? form.email,
        password: savedPassword,
        message: data.publishError
          ? `${baseMessage} (Publish failed: ${data.publishError})`
          : baseMessage,
        error: null,
      });

      await queryClient.invalidateQueries({ queryKey: ["team-credentials"] });
    } catch {
      updateForm(user.role, {
        saving: false,
        error: "Unable to save changes. Please try again.",
      });
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-border bg-card">
        <p className="text-sm text-muted-foreground">Loading team accounts…</p>
      </div>
    );
  }

  if (isError || !users) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center">
        <p className="font-semibold text-red-600">Failed to load team accounts</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-card via-card to-teal/[0.04] p-6 dark:to-teal/[0.08]">
        <h2 className="text-lg font-semibold text-foreground">Account credentials</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Current passwords are loaded for every role. Use the eye icon to reveal
          them, or edit and save.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {users.map((user, index) => {
          const form = forms[user.role] ?? formFromUser(user);

          return (
            <motion.div
              key={user.role}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm transition-all hover:border-teal/25 hover:shadow-md hover:shadow-teal/5"
            >
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{user.name}</h3>
                  <p className="text-sm text-muted-foreground">{ROLE_LABELS[user.role]}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                  <Shield className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor={`email-${user.role}`}
                    className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-foreground"
                  >
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    Email
                  </label>
                  <input
                    id={`email-${user.role}`}
                    type="email"
                    name={`team-email-${user.role}`}
                    autoComplete="off"
                    value={form.email}
                    onChange={(e) =>
                      updateForm(user.role, {
                        email: e.target.value,
                        dirty: true,
                        message: null,
                        error: null,
                      })
                    }
                    className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground transition-all focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div>
                  <label
                    htmlFor={`password-${user.role}`}
                    className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-foreground"
                  >
                    <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id={`password-${user.role}`}
                      type={form.showPassword ? "text" : "password"}
                      name={`team-password-${user.role}`}
                      autoComplete="off"
                      value={form.password}
                      onChange={(e) =>
                        updateForm(user.role, {
                          password: e.target.value,
                          dirty: true,
                          message: null,
                          error: null,
                        })
                      }
                      className="h-11 w-full rounded-xl border border-border bg-background px-4 pr-11 text-sm text-foreground transition-all focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        updateForm(user.role, { showPassword: !form.showPassword })
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                      aria-label={form.showPassword ? "Hide password" : "Show password"}
                    >
                      {form.showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {form.error && (
                  <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
                    {form.error}
                  </p>
                )}

                {form.message && (
                  <p className="rounded-lg bg-teal/10 px-3 py-2 text-sm text-teal">
                    {form.message}
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => handleSave(user)}
                  disabled={form.saving || !form.email.trim()}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  {form.saving ? "Saving…" : "Save changes"}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
