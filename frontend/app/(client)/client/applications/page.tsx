"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Eye, Plus, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { DataTable, type Column } from "@/components/tables/data-table";
import { applicationService, ApiError } from "@/services";
import type { Application } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function ClientApplicationsPage() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await applicationService.listApplications({ limit: 100 });
        if (!cancelled) setApps(res.items);
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
    { key: "type", header: "Type", render: (a) => <span className="text-sm">{a.type}</span> },
    { key: "assignedStaff", header: "Assigned Staff", render: (a) => <span className="text-sm">{a.assignedStaff ?? "—"}</span> },
    { key: "fee", header: "Fee", render: (a) => <span className="text-sm">{formatCurrency(a.fee)}</span> },
    { key: "submittedOn", header: "Submitted", render: (a) => <span className="text-sm">{formatDate(a.submittedOn)}</span> },
    { key: "status", header: "Status", render: (a) => <StatusBadge status={a.status} /> },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: () => (
        <Button size="sm" variant="ghost" className="h-8 gap-1" disabled>
          <Eye className="h-3.5 w-3.5" /> View
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="My Applications"
        description="Track the progress of your license applications."
        action={
          <Button asChild>
            <Link href="/client/application">
              <Plus className="h-4 w-4" /> New Application
            </Link>
          </Button>
        }
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
              searchKeys={["id", "type"]}
              searchPlaceholder="Search your applications..."
              emptyTitle="No applications yet"
              emptyDescription="Submit your first application to get started."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
