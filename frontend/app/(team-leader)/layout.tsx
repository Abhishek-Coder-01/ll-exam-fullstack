import { DashboardShell } from "@/components/shared/dashboard-shell";

export default function TeamLeaderLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell
      role="team_leader"
      breadcrumbs={[{ label: "Team Leader" }]}
      profileHref="/team-leader/profile"
    >
      {children}
    </DashboardShell>
  );
}
