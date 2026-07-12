"use client";

import { Settings as SettingsIcon, Rocket } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { PublishPanel } from "@/components/settings/publish-panel";
import { PlaceholderPage } from "@/components/placeholder-page";
import { PageHero } from "@/components/ui/page-hero";

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
      <PageHero
        eyebrow="Platform administration"
        title="Settings"
        accent="Control"
        description="Manage how the dashboard is published and kept up to date for field and leadership users."
        links={[
          { href: "/team", label: "Team" },
          { href: "/", label: "Dashboard" },
        ]}
        stats={[
          {
            label: "Workspace",
            value: "Live publish",
            icon: Rocket,
            colorClass: "text-teal",
          },
          {
            label: "Access",
            value: "Malki only",
            icon: SettingsIcon,
            colorClass: "text-deep-teal",
          },
        ]}
      />

      <PublishPanel />
    </div>
  );
}
