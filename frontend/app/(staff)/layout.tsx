import { DashboardShell } from "@/components/shared/dashboard-shell";

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell
      role="staff"
      breadcrumbs={[{ label: "Staff" }]}
      profileHref="/staff/profile"
    >
      {children}
    </DashboardShell>
  );
}
