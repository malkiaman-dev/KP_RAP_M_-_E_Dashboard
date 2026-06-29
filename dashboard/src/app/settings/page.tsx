"use client";

import { motion } from "framer-motion";
import { Settings as SettingsIcon } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { PublishPanel } from "@/components/settings/publish-panel";
import { PlaceholderPage } from "@/components/placeholder-page";

export default function SettingsPage() {
  const { user } = useAuth();
  const isMalki = user?.role === "malki";

  if (!isMalki) {
    return (
      <PlaceholderPage
        title="Settings"
        description="Organization preferences and theme configuration."
      />
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
            <SettingsIcon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Settings</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage how the dashboard is published and kept up to date.
            </p>
          </div>
        </div>
      </motion.div>

      <PublishPanel />
    </div>
  );
}
