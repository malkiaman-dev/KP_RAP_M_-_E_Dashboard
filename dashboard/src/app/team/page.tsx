import { TeamCredentialsPanel } from "@/components/team/team-credentials-panel";
import { TeamPermissionsPanel } from "@/components/team/team-permissions-panel";

export default function TeamPage() {
  return (
    <div className="space-y-8">
      <TeamCredentialsPanel />
      <TeamPermissionsPanel />
    </div>
  );
}
