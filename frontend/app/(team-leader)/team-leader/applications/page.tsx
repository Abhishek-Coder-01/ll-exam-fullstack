"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/tables/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { applicationService, ApiError } from "@/services";
import type { Application } from "@/types";

export default function TeamLeaderApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await applicationService.listApplications({ limit: 100 });
        if (!cancelled) setApplications(res.items);
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Failed to load applications");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const columns: Column<Application>[] = [
    { key: "id", header: "Application ID", render: (a) => <span className="text-sm font-medium">{a.id}</span> },
    { key: "applicantName", header: "Client", render: (a) => <span className="text-sm">{a.applicantName}</span> },
    { key: "type", header: "Type", render: (a) => <span className="text-sm">{a.type}</span> },
    { key: "status", header: "Status", render: (a) => <StatusBadge status={a.status} /> },
    { key: "submittedOn", header: "Submitted", render: (a) => <span className="text-xs text-muted-foreground">{new Date(a.submittedOn).toLocaleDateString()}</span> },
  ];

  return (
    <div>
      <PageHeader title="Applications" description="Review submissions assigned to your team." />

      <Card>
        <CardHeader>
          <CardTitle>Team Applications</CardTitle>
          <CardDescription>All applications assigned to your team members</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : error ? (
            <p className="py-6 text-center text-sm text-destructive">{error}</p>
          ) : (
            <DataTable
              columns={columns}
              data={applications}
              searchKeys={["id", "applicantName", "type"]}
              searchPlaceholder="Search by application ID, client, or type..."
              emptyTitle="No applications"
              emptyDescription="No applications have been assigned to your team yet."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
