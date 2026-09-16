"use client";

import { UploadCloud, Sparkles } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { UploadPanel } from "@/components/surveys/upload-panel";
import { PlaceholderPage } from "@/components/placeholder-page";
import { PageHero } from "@/components/ui/page-hero";

export default function SurveyUploadPage() {
  const { user } = useAuth();
  const isMalki = user?.role === "malki";

  if (!isMalki) {
    return (
      <PlaceholderPage
        title="Upload Data"
        description="Survey data uploads are managed by the platform administrator."
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Data management"
        title="Upload Survey"
        accent="Data"
        description="Replace the Tracking (baseline + new sample), Household, and Girls survey exports, then regenerate the error log — everything else updates on its own."
        links={[
          { href: "/surveys/errors", label: "Error Report" },
          { href: "/surveys", label: "All Surveys" },
          { href: "/settings", label: "Settings" },
        ]}
        stats={[
          {
            label: "Sources",
            value: "4 surveys",
            icon: UploadCloud,
            colorClass: "text-teal",
          },
          {
            label: "Error log",
            value: "On demand",
            icon: Sparkles,
            colorClass: "text-amber-600 dark:text-gold",
          },
        ]}
      />

      <UploadPanel />
    </div>
  );
}
