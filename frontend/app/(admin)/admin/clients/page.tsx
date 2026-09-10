"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { MoreHorizontal, Loader2, Users, UserCheck, AlertTriangle } from "lucide-react";
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
import type { Client, StaffMember } from "@/types";
import { getInitials, formatDate } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AdminClientsPage() {
  const pathname = usePathname();
  const mode = pathname.startsWith("/team-leader/") ? "team_leader" : "admin";
  const [clients, setClients] = useState<Client[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assigningClient, setAssigningClient] = useState<Client | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [reassignmentConfirmed, setReassignmentConfirmed] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const load = useCallback(async () => {
    try {
      const [c, s] = await Promise.all([
        userService.listClients({ limit: 200 }),
        userService.listStaff({ limit: 200 }),
      ]);
      setClients(c.items);
      setStaff(s.items);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load clients");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Keep an already-open admin page in sync when a new application is
  // auto-assigned in the background. Refresh on focus/visibility as well as
  // periodically, without showing the initial full-page loader again.
  useEffect(() => {
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        void load();
      }
    };
    const intervalId = window.setInterval(refreshWhenVisible, 30_000);

    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [load]);

  const openAssignDialog = (client: Client) => {
    setAssigningClient(client);
    setSelectedStaffId(client.assignedStaffId ?? "");
    setReassignmentConfirmed(false);
  };

  const closeAssignDialog = () => {
    if (assigning) return;
    setAssigningClient(null);
    setSelectedStaffId("");
    setReassignmentConfirmed(false);
  };

  const assign = async () => {
    if (!assigningClient || !selectedStaffId) return;
    const isReassignment = Boolean(assigningClient.assignedStaffId && selectedStaffId !== assigningClient.assignedStaffId);
    if (isReassignment && !reassignmentConfirmed) return;
    setAssigning(true);
    try {
      await userService.assignStaffToClient(assigningClient.id, selectedStaffId);
      await load();
      setAssigningClient(null);
      setSelectedStaffId("");
      setReassignmentConfirmed(false);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to assign staff");
    } finally {
      setAssigning(false);
    }
  };

  const eligibleStaff = staff.filter(
    (member) =>
      (member.status === "Approved" || member.status === "Active") &&
      (member.availabilityStatus !== "Inactive" &&
        member.availabilityStatus !== "Suspended" &&
        member.availabilityStatus !== "Offline" ||
        member.id === assigningClient?.assignedStaffId),
  );
  const availableStaff = eligibleStaff.filter((member) => member.availabilityStatus === "Available");
  const busyStaff = eligibleStaff.filter((member) => member.availabilityStatus !== "Available");

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
    { key: "phone", header: "Phone", render: (c) => <span className="text-sm">{c.phone}</span> },
    { key: "licenseType", header: "License Type", render: (c) => <span className="text-sm">{c.licenseType}</span> },
    { key: "assignedStaff", header: "Assigned Staff", render: (c) => <span className="text-sm">{c.assignedStaff ?? "—"}</span> },
    { key: "applications", header: "Applications", render: (c) => <span className="text-sm">{c.applications}</span> },
    { key: "createdAt", header: "Joined", render: (c) => <span className="text-sm">{formatDate(c.createdAt)}</span> },
    { key: "status", header: "Status", render: (c) => <StatusBadge status={c.status} /> },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (c) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openAssignDialog(c)}>Assign staff</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Client Management"
        description={
          mode === "team_leader"
            ? "Manage clients assigned to your team and assign them to your staff."
            : "View and manage registered client accounts."
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
              data={clients}
              searchKeys={["name", "email", "id", "licenseType"]}
              searchPlaceholder="Search clients by name, email, or ID..."
              emptyTitle="No clients registered yet"
              emptyDescription="Clients will appear here after they complete registration."
            />
          )}
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(assigningClient)}
        onOpenChange={(open) => {
          if (!open) closeAssignDialog();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign staff to client</DialogTitle>
            <DialogDescription>
              Choose an available staff member for {assigningClient?.name} ({assigningClient?.id}).
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg border border-success/30 bg-success/5 p-3">
              <p className="text-2xl font-semibold text-success">{availableStaff.length}</p>
              <p className="text-xs text-muted-foreground">Available</p>
            </div>
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
              <p className="text-2xl font-semibold text-amber-600">{busyStaff.length}</p>
              <p className="text-xs text-muted-foreground">Busy / Break</p>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-2xl font-semibold">{eligibleStaff.length}</p>
              <p className="text-xs text-muted-foreground">Total eligible</p>
            </div>
          </div>

          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Currently assigned</p>
            <p className="mt-1 text-sm font-semibold">
              {assigningClient?.assignedStaff ?? "No staff assigned"}
            </p>
            {assigningClient?.assignedStaffId && (
              <p className="text-xs text-muted-foreground">{assigningClient.assignedStaffId}</p>
            )}
          </div>

          {assigningClient?.assignedStaffId && selectedStaffId && selectedStaffId !== assigningClient.assignedStaffId && (
            <div className="space-y-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-800">
              <div className="flex gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>This client already has an assigned staff member. Reassigning will move future work to the new staff; existing application progress and history will remain saved.</p>
              </div>
              <label className="flex cursor-pointer items-start gap-2">
                <input
                  type="checkbox"
                  checked={reassignmentConfirmed}
                  onChange={(event) => setReassignmentConfirmed(event.target.checked)}
                  className="mt-1"
                />
                <span>I understand and want to reassign this client.</span>
              </label>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-sm font-medium">Select staff</p>
            {eligibleStaff.length === 0 ? (
              <div className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">
                No approved staff members are available for assignment.
              </div>
            ) : (
              <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an available staff member" />
                </SelectTrigger>
                <SelectContent>
                  {eligibleStaff.map((member) => (
                    <SelectItem
                      key={member.id}
                      value={member.id}
                      disabled={
                        member.availabilityStatus !== "Available" &&
                        member.id !== assigningClient?.assignedStaffId
                      }
                    >
                      <span className="flex items-center gap-2">
                        {member.availabilityStatus === "Available" ? (
                          <UserCheck className="h-4 w-4 text-success" />
                        ) : (
                          <Users className="h-4 w-4 text-amber-600" />
                        )}
                        {member.name} · {member.department} · {member.id === assigningClient?.assignedStaffId
                          ? "Assigned"
                          : member.availabilityStatus ?? "Available"}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeAssignDialog} disabled={assigning}>
              Cancel
            </Button>
            <Button
              onClick={() => void assign()}
              disabled={!selectedStaffId || assigning || Boolean(assigningClient?.assignedStaffId && selectedStaffId !== assigningClient.assignedStaffId && !reassignmentConfirmed)}
            >
              {assigning ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Assign staff
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
