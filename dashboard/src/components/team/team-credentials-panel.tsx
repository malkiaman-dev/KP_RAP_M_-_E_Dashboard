"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Eye, EyeOff, KeyRound, Mail, Save, Shield, Users } from "lucide-react";
import { ROLE_LABELS } from "@/lib/auth/roles";
import type { Role } from "@/lib/auth/types";

interface PublicUser {
  role: Role;
  name: string;
  email: string;
}

interface UserFormState {
  email: string;
  password: string;
  showPassword: boolean;
  saving: boolean;
  message: string | null;
  error: string | null;
}

async function fetchTeamUsers(): Promise<PublicUser[]> {
  const res = await fetch("/api/team/credentials");
  if (!res.ok) throw new Error("Failed to load team credentials");
  const data = await res.json();
  return data.users;
}

function emptyFormState(): UserFormState {
  return {
    email: "",
    password: "",
    showPassword: false,
    saving: false,
    message: null,
    error: null,
  };
}

export function TeamCredentialsPanel() {
  const queryClient = useQueryClient();
  const { data: users, isLoading, isError } = useQuery({
    queryKey: ["team-credentials"],
    queryFn: fetchTeamUsers,
  });

  const [forms, setForms] = useState<Record<Role, UserFormState>>(
    {} as Record<Role, UserFormState>
  );

  useEffect(() => {
    if (!users) return;

    setForms((prev) => {
      const next = { ...prev };
      for (const user of users) {
        if (!next[user.role]) {
          next[user.role] = { ...emptyFormState(), email: user.email };
        } else if (!next[user.role].saving && !next[user.role].message) {
          next[user.role] = {
            ...next[user.role],
            email: user.email,
          };
        }
      }
      return next;
    });
  }, [users]);

  function updateForm(role: Role, patch: Partial<UserFormState>) {
    setForms((prev) => ({
      ...prev,
      [role]: { ...prev[role], ...patch },
    }));
  }

  async function handleSave(user: PublicUser) {
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
          password: form.password || undefined,
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

      await queryClient.invalidateQueries({ queryKey: ["team-credentials"] });

      const baseMessage = data.requiresReLogin
        ? "Saved. Sign in again with your new email."
        : data.published
          ? "Saved and published live."
          : "Credentials updated successfully.";

      updateForm(user.role, {
        saving: false,
        password: "",
        message: data.publishError
          ? `${baseMessage} (Publish failed: ${data.publishError})`
          : baseMessage,
        error: null,
      });
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
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border bg-card p-6"
      >
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Team Management</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage login credentials and control which tabs each role can access.
            </p>
          </div>
        </div>
      </motion.div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground">Account credentials</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Update login email and password for each role.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {users.map((user, index) => {
          const form = forms[user.role] ?? {
            ...emptyFormState(),
            email: user.email,
          };

          return (
            <motion.div
              key={user.role}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="rounded-2xl border border-border bg-card p-6"
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
                    value={form.email}
                    onChange={(e) =>
                      updateForm(user.role, { email: e.target.value, message: null, error: null })
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
                    New password
                  </label>
                  <div className="relative">
                    <input
                      id={`password-${user.role}`}
                      type={form.showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={(e) =>
                        updateForm(user.role, {
                          password: e.target.value,
                          message: null,
                          error: null,
                        })
                      }
                      placeholder="Leave blank to keep current password"
                      className="h-11 w-full rounded-xl border border-border bg-background px-4 pr-11 text-sm text-foreground placeholder:text-muted-foreground transition-all focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
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
