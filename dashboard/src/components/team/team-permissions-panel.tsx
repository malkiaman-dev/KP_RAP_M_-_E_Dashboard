"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { LayoutGrid, Save, Shield } from "lucide-react";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { useAuth } from "@/components/auth/auth-provider";
import type { Role } from "@/lib/auth/types";

interface PermissionTab {
  href: string;
  label: string;
  section: string;
}

interface PermissionsResponse {
  permissions: Record<Role, string[]>;
  tabs: PermissionTab[];
}

interface RolePermissionState {
  routes: string[];
  saving: boolean;
  message: string | null;
  error: string | null;
}

async function fetchPermissions(): Promise<PermissionsResponse> {
  const res = await fetch("/api/team/permissions");
  if (!res.ok) throw new Error("Failed to load tab permissions");
  return res.json();
}

function emptyState(): RolePermissionState {
  return { routes: [], saving: false, message: null, error: null };
}

export function TeamPermissionsPanel() {
  const queryClient = useQueryClient();
  const { refreshAuth } = useAuth();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["team-permissions"],
    queryFn: fetchPermissions,
  });

  const [forms, setForms] = useState<Record<Role, RolePermissionState>>(
    {} as Record<Role, RolePermissionState>
  );

  useEffect(() => {
    if (!data) return;

    setForms((prev) => {
      const next = { ...prev };
      for (const [role, routes] of Object.entries(data.permissions) as [
        Role,
        string[],
      ][]) {
        if (!next[role]) {
          next[role] = { ...emptyState(), routes };
        } else if (!next[role].saving && !next[role].message) {
          next[role] = { ...next[role], routes };
        }
      }
      return next;
    });
  }, [data]);

  function updateRole(role: Role, patch: Partial<RolePermissionState>) {
    setForms((prev) => ({
      ...prev,
      [role]: { ...prev[role], ...patch },
    }));
  }

  function toggleTab(role: Role, href: string) {
    const current = forms[role]?.routes ?? [];
    const isEnabled = current.includes(href);
    const isMalkiRequired = role === "malki" && href === "/team";

    if (isMalkiRequired && isEnabled) return;

    const routes = isEnabled
      ? current.filter((route) => route !== href)
      : [...current, href];

    updateRole(role, { routes, message: null, error: null });
  }

  async function handleSave(role: Role) {
    const form = forms[role];
    if (!form) return;

    updateRole(role, { saving: true, message: null, error: null });

    try {
      const res = await fetch("/api/team/permissions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, routes: form.routes }),
      });

      const result = await res.json();

      if (!res.ok) {
        updateRole(role, {
          saving: false,
          error: result.error ?? "Failed to save tab access",
        });
        return;
      }

      await queryClient.invalidateQueries({ queryKey: ["team-permissions"] });
      await refreshAuth();

      updateRole(role, {
        saving: false,
        routes: result.routes,
        message: "Tab access updated successfully.",
        error: null,
      });
    } catch {
      updateRole(role, {
        saving: false,
        error: "Unable to save tab access. Please try again.",
      });
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-border bg-card">
        <p className="text-sm text-muted-foreground">Loading tab permissions…</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center">
        <p className="font-semibold text-red-600">Failed to load tab permissions</p>
      </div>
    );
  }

  const sections = [...new Set(data.tabs.map((tab) => tab.section))];

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
            <LayoutGrid className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Tab access</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose which dashboard tabs each role can view. Disabled tabs appear
              locked in the sidebar.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        {(Object.keys(data.permissions) as Role[]).map((role, index) => {
          const form = forms[role] ?? emptyState();

          return (
            <motion.div
              key={role}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              className="rounded-2xl border border-border bg-card p-6"
            >
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {ROLE_LABELS[role]}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {form.routes.length} tab{form.routes.length === 1 ? "" : "s"} enabled
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                  <Shield className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>

              <div className="space-y-4">
                {sections.map((section) => (
                  <div key={section}>
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      {section}
                    </p>
                    <div className="space-y-2">
                      {data.tabs
                        .filter((tab) => tab.section === section)
                        .map((tab) => {
                          const enabled = form.routes.includes(tab.href);
                          const lockedForMalki = role === "malki" && tab.href === "/team";

                          return (
                            <label
                              key={tab.href}
                              className={`flex items-center justify-between rounded-xl border px-3 py-2.5 transition-colors ${
                                enabled
                                  ? "border-primary/30 bg-primary/5"
                                  : "border-border bg-background"
                              } ${lockedForMalki ? "opacity-80" : "cursor-pointer hover:bg-muted/40"}`}
                            >
                              <span className="text-sm font-medium text-foreground">
                                {tab.label}
                              </span>
                              <input
                                type="checkbox"
                                checked={enabled}
                                disabled={lockedForMalki}
                                onChange={() => toggleTab(role, tab.href)}
                                className="h-4 w-4 rounded border-border text-primary focus:ring-primary/30 disabled:cursor-not-allowed"
                              />
                            </label>
                          );
                        })}
                    </div>
                  </div>
                ))}

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
                  onClick={() => handleSave(role)}
                  disabled={form.saving || form.routes.length === 0}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  {form.saving ? "Saving…" : "Save tab access"}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
