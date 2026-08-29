import { DashboardShell } from "@/components/shared/dashboard-shell";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell
      role="client"
      breadcrumbs={[{ label: "Client" }]}
      profileHref="/client/profile"
    >
      {children}
    </DashboardShell>
  );
}
