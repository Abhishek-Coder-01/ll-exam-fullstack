"use client";

import { useEffect, useState, useCallback } from "react";
import { Check, X, MoreHorizontal, FileText, Loader2, AlertTriangle } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function AdminApplicationsPage() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [rejectingApplicationId, setRejectingApplicationId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [assigningApplication, setAssigningApplication] = useState<Application | null>(null);
  const [assignStaffId, setAssignStaffId] = useState("");
  const [reassignmentConfirmed, setReassignmentConfirmed] = useState(false);

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

  const setStatus = async (id: string, status: ApplicationStatus, remarks?: string) => {
    setBusy(id);
    try {
      await applicationService.updateApplication(id, { status, remarks });
      await load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to update application");
    } finally {
      setBusy(null);
    }
  };

  const openRejectDialog = (id: string) => {
    setRejectingApplicationId(id);
    setRejectionReason("");
  };

  const closeRejectDialog = () => {
    if (busy === rejectingApplicationId) return;
    setRejectingApplicationId(null);
    setRejectionReason("");
  };

  const rejectApplication = async () => {
    const reason = rejectionReason.trim();
    if (!rejectingApplicationId || !reason) return;
    await setStatus(rejectingApplicationId, "Rejected", reason);
    setRejectingApplicationId(null);
    setRejectionReason("");
  };

  const openAssignDialog = (application: Application) => {
    setAssigningApplication(application);
    setAssignStaffId("");
    setReassignmentConfirmed(false);
  };

  const closeAssignDialog = () => {
    if (assigningApplication && busy === assigningApplication.id) return;
    setAssigningApplication(null);
    setAssignStaffId("");
    setReassignmentConfirmed(false);
  };

  const assign = async () => {
    if (!assigningApplication || !assignStaffId.trim()) return;
    const isReassignment = Boolean(assigningApplication.assignedStaffId && assignStaffId.trim() !== assigningApplication.assignedStaffId);
    if (isReassignment && !reassignmentConfirmed) return;
    const id = assigningApplication.id;
    setBusy(id);
    try {
      await applicationService.updateApplication(id, { assignedStaffId: assignStaffId.trim() });
      await load();
      closeAssignDialog();
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
      key: "rejectionReason",
      header: "Rejection Reason",
      render: (a) => (
        <span className="text-sm text-destructive">
          {a.status === "Rejected" ? a.remarks ?? "No reason provided" : "—"}
        </span>
      ),
    },
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
                onClick={() => openRejectDialog(a.id)}
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
              <DropdownMenuItem onClick={() => openAssignDialog(a)}>Assign / reassign staff</DropdownMenuItem>
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
      <Dialog
        open={Boolean(assigningApplication)}
        onOpenChange={(open) => {
          if (!open) closeAssignDialog();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign or reassign staff</DialogTitle>
            <DialogDescription>
              {assigningApplication?.id} · {assigningApplication?.applicantName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <p><span className="font-medium">Current status:</span> {assigningApplication?.status}</p>
              <p><span className="font-medium">Current staff:</span> {assigningApplication?.assignedStaff ?? "Unassigned"}</p>
            </div>
            {assigningApplication?.assignedStaff && (
              <div className="flex gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-800">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>This application already has work assigned. Reassigning it will move future work to the new staff, while previous work and assignment history remain saved.</p>
              </div>
            )}
            <div className="space-y-2">
              <label htmlFor="assign-staff-id" className="text-sm font-medium">New staff Business ID</label>
              <input
                id="assign-staff-id"
                value={assignStaffId}
                onChange={(event) => setAssignStaffId(event.target.value)}
                placeholder="Example: STF-101"
                autoFocus
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            {assigningApplication?.assignedStaffId && assignStaffId.trim() && assignStaffId.trim() !== assigningApplication.assignedStaffId && (
              <label className="flex cursor-pointer items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={reassignmentConfirmed}
                  onChange={(event) => setReassignmentConfirmed(event.target.checked)}
                  className="mt-1"
                />
                <span>I understand this is a reassignment and the application will continue from its current status.</span>
              </label>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeAssignDialog} disabled={busy === assigningApplication?.id}>Cancel</Button>
            <Button
              onClick={() => void assign()}
              disabled={!assignStaffId.trim() || Boolean(assigningApplication?.assignedStaffId && assignStaffId.trim() !== assigningApplication.assignedStaffId && !reassignmentConfirmed) || busy === assigningApplication?.id}
            >
              {busy === assigningApplication?.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Confirm assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(rejectingApplicationId)}
        onOpenChange={(open) => {
          if (!open) closeRejectDialog();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject application</DialogTitle>
            <DialogDescription>
              Enter the reason for rejecting this application. The client will be able to see it.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label htmlFor="application-rejection-reason" className="text-sm font-medium">
              Rejection reason
            </label>
            <textarea
              id="application-rejection-reason"
              value={rejectionReason}
              onChange={(event) => setRejectionReason(event.target.value)}
              placeholder="Example: Required documents are incomplete..."
              rows={4}
              maxLength={500}
              autoFocus
              className="flex w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            />
            <p className="text-right text-xs text-muted-foreground">{rejectionReason.length}/500</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeRejectDialog} disabled={busy === rejectingApplicationId}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void rejectApplication()}
              disabled={!rejectionReason.trim() || busy === rejectingApplicationId}
            >
              {busy === rejectingApplicationId ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Reject application
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {!loading && apps.length === 0 && (
        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <FileText className="h-4 w-4" /> Nothing to review right now.
        </div>
      )}
    </div>
  );
}
