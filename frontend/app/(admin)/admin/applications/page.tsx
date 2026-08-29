"use client";

import { useEffect, useState, useCallback } from "react";
import { Check, X, MoreHorizontal, FileText, Loader2 } from "lucide-react";
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
import { formatCurrency, formatDate } from "@/lib/utils";

export default function AdminApplicationsPage() {
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

  const assign = async (id: string) => {
    const staffId = window.prompt("Enter staff Business ID to assign (e.g. STF-101)");
    if (!staffId) return;
    setBusy(id);
    try {
      await applicationService.updateApplication(id, { assignedStaffId: staffId.trim() });
      await load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to assign staff");
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
    {
      key: "assignedStaff",
      header: "Assigned Staff",
      render: (a) => <span className="text-sm">{a.assignedStaff ?? "Unassigned"}</span>,
    },
    { key: "documentsCount", header: "Documents", render: (a) => <span className="text-sm">{a.documentsCount}</span> },
    { key: "fee", header: "Fee", render: (a) => <span className="text-sm">{formatCurrency(a.fee)}</span> },
    { key: "submittedOn", header: "Submitted", render: (a) => <span className="text-sm">{formatDate(a.submittedOn)}</span> },
    { key: "status", header: "Status", render: (a) => <StatusBadge status={a.status} /> },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (a) => (
        <div className="flex justify-end gap-1.5">
          {(a.status === "Verified" || a.status === "Under Review") && (
            <>
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8 border-success/30 text-success hover:bg-success/10"
                title="Approve"
                onClick={() => setStatus(a.id, "Approved")}
                disabled={busy === a.id}
              >
                <Check className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8 border-destructive/30 text-destructive hover:bg-destructive/10"
                title="Reject"
                onClick={() => setStatus(a.id, "Rejected")}
                disabled={busy === a.id}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => assign(a.id)}>Assign staff</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatus(a.id, "Under Review")}>
                Mark under review
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatus(a.id, "Verified")}>
                Mark verified
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatus(a.id, "Completed")}>
                Mark completed
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Applications"
        description="Review, assign, and approve or reject license applications."
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
              searchPlaceholder="Search by application ID, applicant, or type..."
              emptyTitle="No applications found"
              emptyDescription="New applications will appear here once submitted by clients."
            />
          )}
        </CardContent>
      </Card>
      {!loading && apps.length === 0 && (
        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <FileText className="h-4 w-4" /> Nothing to review right now.
        </div>
      )}
    </div>
  );
}
