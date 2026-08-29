"use client";

import { useEffect, useState, useCallback } from "react";
import { UserPlus, Check, X, MoreHorizontal, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/shared/status-badge";
import { DataTable, type Column } from "@/components/tables/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { userService, ApiError } from "@/services";
import type { StaffMember } from "@/types";
import { getInitials } from "@/lib/utils";

export default function AdminStaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await userService.listStaff({ limit: 100 });
      setStaff(res.items);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load staff");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const changeStatus = async (
    id: string,
    status: "Approved" | "Rejected" | "Inactive" | "Active",
  ) => {
    setBusy(id);
    try {
      await userService.updateStaffStatus(id, status);
      await load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to update staff status");
    } finally {
      setBusy(null);
    }
  };

  const pendingCount = staff.filter((s) => s.status === "Pending").length;

  const columns: Column<StaffMember>[] = [
    {
      key: "name",
      header: "Staff Member",
      render: (s) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">{getInitials(s.name)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium">{s.name}</p>
            <p className="text-xs text-muted-foreground">{s.email}</p>
          </div>
        </div>
      ),
    },
    { key: "id", header: "Staff ID", render: (s) => <span className="text-sm">{s.id}</span> },
    { key: "department", header: "Department", render: (s) => <span className="text-sm">{s.department}</span> },
    {
      key: "assignedClients",
      header: "Assigned Clients",
      render: (s) => <span className="text-sm">{s.assignedClients}</span>,
    },
    { key: "status", header: "Status", render: (s) => <StatusBadge status={s.status} /> },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (s) => (
        <div className="flex justify-end gap-1.5">
          {s.status === "Pending" ? (
            <>
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1 border-success/30 text-success hover:bg-success/10"
                onClick={() => changeStatus(s.id, "Approved")}
                disabled={busy === s.id}
              >
                <Check className="h-3.5 w-3.5" /> Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1 border-destructive/30 text-destructive hover:bg-destructive/10"
                onClick={() => changeStatus(s.id, "Rejected")}
                disabled={busy === s.id}
              >
                <X className="h-3.5 w-3.5" /> Reject
              </Button>
            </>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="h-8 w-8" disabled={busy === s.id}>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {s.status !== "Active" && (
                  <DropdownMenuItem onClick={() => changeStatus(s.id, "Active")}>
                    Mark as Active
                  </DropdownMenuItem>
                )}
                {s.status !== "Inactive" && (
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => changeStatus(s.id, "Inactive")}
                  >
                    Deactivate
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Staff Management"
        description={
          pendingCount > 0
            ? `${pendingCount} staff pending approval`
            : "Review, approve, and manage staff accounts."
        }
        action={
          <Button variant="outline" disabled>
            <UserPlus className="h-4 w-4" /> Add staff
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
              data={staff}
              searchKeys={["name", "email", "id", "department"]}
              searchPlaceholder="Search staff by name, email, ID, or department..."
              emptyTitle="No staff yet"
              emptyDescription="Staff registrations will appear here."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
