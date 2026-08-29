"use client";

import { useEffect, useState, useCallback } from "react";
import { MoreHorizontal, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { DataTable, type Column } from "@/components/tables/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { applicationService, ApiError } from "@/services";
import type { Application, ApplicationStatus } from "@/types";
import { formatDate } from "@/lib/utils";

export default function StaffApplicationsPage() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await applicationService.listApplications({ limit: 200 });
      setApps(res.items);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load applications");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const setStatus = async (id: string, status: ApplicationStatus) => {
    setBusy(id);
    try {
      await applicationService.updateApplication(id, { status });
      await load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to update application");
    } finally {
      setBusy(null);
    }
  };

  const columns: Column<Application>[] = [
    {
      key: "id",
      header: "Application",
      render: (a) => (
        <div>
          <p className="text-sm font-medium">{a.id}</p>
          <p className="text-xs text-muted-foreground">{a.applicantName}</p>
        </div>
      ),
    },
    { key: "type", header: "Type", render: (a) => <span className="text-sm">{a.type}</span> },
    { key: "documentsCount", header: "Documents", render: (a) => <span className="text-sm">{a.documentsCount}</span> },
    { key: "submittedOn", header: "Submitted", render: (a) => <span className="text-sm">{formatDate(a.submittedOn)}</span> },
    { key: "status", header: "Status", render: (a) => <StatusBadge status={a.status} /> },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (a) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" className="h-8 w-8" disabled={busy === a.id}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setStatus(a.id, "Under Review")}>
              Mark under review
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatus(a.id, "Verified")}>
              Mark verified
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatus(a.id, "Approved")}>
              Mark approved
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatus(a.id, "Completed")}>
              Mark completed
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => setStatus(a.id, "Rejected")}
            >
              Reject
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Applications"
        description="Review, verify, and update applications assigned to you."
      />
      <Card>
        <CardContent className="p-5">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : error ? (
            <p className="py-6 text-center text-sm text-destructive">{error}</p>
          ) : (
            <DataTable
              columns={columns}
              data={apps}
              searchKeys={["id", "applicantName", "type"]}
              searchPlaceholder="Search applications..."
              emptyTitle="No applications assigned"
              emptyDescription="Applications assigned to you will appear here."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
