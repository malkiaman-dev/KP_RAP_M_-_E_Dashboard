import { Users, Shield } from "lucide-react";
import { TeamCredentialsPanel } from "@/components/team/team-credentials-panel";
import { TeamPermissionsPanel } from "@/components/team/team-permissions-panel";
import { PageHero } from "@/components/ui/page-hero";

export default function TeamPage() {
  return (
    <div className="space-y-8">
      <PageHero
        eyebrow="Access & identity control"
        title="Team"
        accent="Management"
        description="Manage login credentials and control which dashboard tabs each role can access. Changes take effect on the next sign-in."
        links={[
          { href: "/settings", label: "Settings" },
          { href: "/", label: "Dashboard" },
        ]}
        stats={[
          {
            label: "Focus",
            value: "Credentials",
            icon: Users,
            colorClass: "text-teal",
          },
          {
            label: "Controls",
            value: "Tab access",
            icon: Shield,
            colorClass: "text-deep-teal",
          },
        ]}
      />
      <TeamCredentialsPanel />
      <TeamPermissionsPanel />
    </div>
  );
}
