"use client";

import { useEffect, useState } from "react";
import { Users, FileClock, FileCheck2, CalendarCheck, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/cards/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/shared/status-badge";
import { DataTable, type Column } from "@/components/tables/data-table";
import { userService, applicationService, documentService, ApiError } from "@/services";
import type { Client, Application, DocumentItem } from "@/types";
import { getInitials } from "@/lib/utils";

export default function StaffDashboardPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [apps, setApps] = useState<Application[]>([]);
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [c, a, d] = await Promise.all([
          userService.listAssignedClients(),
          applicationService.listApplications({ limit: 200 }),
          documentService.listDocuments(),
        ]);
        if (cancelled) return;
        setClients(c);
        setApps(a.items);
        setDocs(d);
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Failed to load dashboard");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  if (error) {
    return (
      <div>
        <PageHeader title="Staff Dashboard" />
        <Card>
          <CardContent className="py-10 text-center text-sm text-destructive">{error}</CardContent>
        </Card>
      </div>
    );
  }

  const pendingDocs = docs.filter((d) => d.status === "Pending" || d.status === "In Progress");
  const completedApplications = apps.filter(
    (a) => a.status === "Completed" || a.status === "Approved",
  );
  const inProgress = apps.filter((a) => a.status !== "Completed" && a.status !== "Rejected");

  const columns: Column<Client>[] = [
    {
      key: "name",
      header: "Client",
      render: (c) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">{getInitials(c.name)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium">{c.name}</p>
            <p className="text-xs text-muted-foreground">{c.email}</p>
          </div>
        </div>
      ),
    },
    { key: "id", header: "Client ID", render: (c) => <span className="text-sm">{c.id}</span> },
    { key: "licenseType", header: "License", render: (c) => <span className="text-sm">{c.licenseType}</span> },
    {
      key: "applications",
      header: "Applications",
      render: (c) => <span className="text-sm">{c.applications}</span>,
    },
    { key: "status", header: "Status", render: (c) => <StatusBadge status={c.status} /> },
  ];

  return (
    <div>
      <PageHeader
        title="Staff Dashboard"
        description="Track your assigned clients, applications, and documents."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Assigned Clients" value={String(clients.length)} icon={Users} />
        <StatCard label="Applications In Progress" value={String(inProgress.length)} icon={FileClock} tone="warning" />
        <StatCard
          label="Completed Applications"
          value={String(completedApplications.length)}
          icon={FileCheck2}
          tone="success"
        />
        <StatCard label="Pending Documents" value={String(pendingDocs.length)} icon={CalendarCheck} tone="primary" />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>My Clients</CardTitle>
          <CardDescription>Clients assigned to you</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={clients}
            searchKeys={["name", "email", "id"]}
            searchPlaceholder="Search clients..."
            emptyTitle="No clients assigned yet"
            emptyDescription="An admin can assign clients to you."
          />
        </CardContent>
      </Card>
    </div>
  );
}
