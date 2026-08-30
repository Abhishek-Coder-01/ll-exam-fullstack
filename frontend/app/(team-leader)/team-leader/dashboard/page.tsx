"use client";

import { useEffect, useState } from "react";
import { Users, FileText, ClipboardCheck, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/cards/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { applicationService, userService } from "@/services";

export default function TeamLeaderDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ teamMembers: 0, activeApps: 0, completed: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const currentUser = user;
    let cancelled = false;

    async function load() {
      try {
        const [staffRes, appsRes] = await Promise.all([
          userService.listStaff({ limit: 200, status: "Active" }),
          applicationService.listApplications({ limit: 500 }),
        ]);

        if (cancelled) return;

        const teamMembers = staffRes.items.filter((s) => (s as any).teamLeaderId === currentUser.businessId);
        const teamMemberIds = teamMembers.map((s) => s.id);
        const activeApps = appsRes.items.filter(
          (a) => teamMemberIds.includes(a.assignedStaff ?? "") && ["Assigned", "In Progress"].includes(a.status),
        );
        const completed = appsRes.items.filter(
          (a) => teamMemberIds.includes(a.assignedStaff ?? "") && ["Completed", "Approved"].includes(a.status),
        );

        setStats({
          teamMembers: teamMembers.length,
          activeApps: activeApps.length,
          completed: completed.length,
        });
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Team Leader Dashboard"
        description="Track team performance, assigned work, and staff availability."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Team Members" value={String(stats.teamMembers)} icon={Users} />
        <StatCard label="Active Applications" value={String(stats.activeApps)} icon={FileText} tone="warning" />
        <StatCard label="Completed" value={String(stats.completed)} icon={ClipboardCheck} tone="success" />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Navigate to view your team's details</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <ul className="space-y-2">
            <li>• View your assigned staff members</li>
            <li>• Track active applications for your team</li>
            <li>• Monitor staff availability status</li>
            <li>• Review completed assignments</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
