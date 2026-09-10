"use client";

import { useEffect, useState, useCallback } from "react";
import { FileText, Check, X, Download, Loader2, ChevronDown, ChevronRight, UserRound } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { DataTable, type Column } from "@/components/tables/data-table";
import { documentService, ApiError } from "@/services";
import type { DocumentItem, DocumentStatus } from "@/types";
import { formatDate } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type DocRow = DocumentItem & { applicationId: string };

type ApplicationDocumentGroup = {
  applicationId: string;
  applicantName?: string;
  applicationType?: string;
  documents: DocRow[];
};

export default function StaffDocumentsPage() {
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [expandedApplication, setExpandedApplication] = useState<string | null>(null);
  const [rejectingDocumentId, setRejectingDocumentId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const load = useCallback(async () => {
    try {
      const items = await documentService.listDocuments({ limit: "100" });
      setDocs(items as DocRow[]);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load documents");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const setStatus = async (id: string, status: DocumentStatus, remarks?: string) => {
    setBusy(id);
    try {
      await documentService.updateDocumentStatus(id, status, remarks);
      await load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to update document");
    } finally {
      setBusy(null);
    }
  };

  const openRejectDialog = (id: string) => {
    setRejectingDocumentId(id);
    setRejectionReason("");
  };

  const closeRejectDialog = () => {
    if (busy === rejectingDocumentId) return;
    setRejectingDocumentId(null);
    setRejectionReason("");
  };

  const rejectDocument = async () => {
    const reason = rejectionReason.trim();
    if (!rejectingDocumentId || !reason) return;
    await setStatus(rejectingDocumentId, "Rejected", reason);
    setRejectingDocumentId(null);
    setRejectionReason("");
  };

  const download = async (id: string, name: string) => {
    try {
      await documentService.downloadDocument(id, name);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to download");
    }
  };

  const columns: Column<DocRow>[] = [
    {
      key: "name",
      header: "Document",
      render: (d) => (
        <div className="flex items-center gap-2.5">
          <FileText className="h-4 w-4 shrink-0 text-primary-600" />
          <div>
            <p className="text-sm font-medium">{d.name}</p>
            <p className="text-xs text-muted-foreground">
              {d.size} · {d.applicationId}
            </p>
          </div>
        </div>
      ),
    },
    { key: "type", header: "Type", render: (d) => <span className="text-sm">{d.type}</span> },
    { key: "uploadedOn", header: "Uploaded", render: (d) => <span className="text-sm">{formatDate(d.uploadedOn)}</span> },
    { key: "status", header: "Status", render: (d) => <StatusBadge status={d.status} /> },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (d) => (
        <div className="flex justify-end gap-1.5">
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => download(d.id, d.name)} title="Download">
            <Download className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            className="h-8 w-8 border-success/30 text-success hover:bg-success/10"
            title="Verify"
            onClick={() => setStatus(d.id, "Verified")}
            disabled={busy === d.id}
          >
            <Check className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            className="h-8 w-8 border-destructive/30 text-destructive hover:bg-destructive/10"
            title="Reject"
            onClick={() => openRejectDialog(d.id)}
            disabled={busy === d.id}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  const groups = docs.reduce<ApplicationDocumentGroup[]>((result, document) => {
    let group = result.find((item) => item.applicationId === document.applicationId);
    if (!group) {
      group = {
        applicationId: document.applicationId,
        applicantName: (document as DocRow & { applicantName?: string }).applicantName,
        applicationType: (document as DocRow & { applicationType?: string }).applicationType,
        documents: [],
      };
      result.push(group);
    }
    group.documents.push(document);
    return result;
  }, []);

  return (
    <div>
      <PageHeader title="Documents" description="Review and verify documents submitted by your clients." />
      <Card>
        <CardContent className="p-5">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : error ? (
            <p className="py-6 text-center text-sm text-destructive">{error}</p>
          ) : (
            groups.length === 0 ? (
              <DataTable
                columns={columns}
                data={docs}
                searchKeys={["name", "type"]}
                searchPlaceholder="Search documents..."
                emptyTitle="No documents uploaded yet"
                emptyDescription="Uploaded documents from your assigned clients will appear here."
              />
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {groups.length} application(s) · {docs.length} document(s)
                </p>
                {groups.map((group) => {
                  const isExpanded = expandedApplication === group.applicationId;
                  const pendingCount = group.documents.filter((doc) => doc.status !== "Verified").length;
                  return (
                    <div key={group.applicationId} className="overflow-hidden rounded-lg border border-border">
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-4 bg-muted/20 px-4 py-3 text-left hover:bg-muted/40"
                        onClick={() => setExpandedApplication(isExpanded ? null : group.applicationId)}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          {isExpanded ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                          <div className="rounded-md bg-primary/10 p-2 text-primary">
                            <UserRound className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold">{group.applicationId}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {group.applicantName ?? "Client"}{group.applicationType ? ` · ${group.applicationType}` : ""}
                            </p>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
                          <span>{group.documents.length} document(s)</span>
                          {pendingCount > 0 && <span className="text-amber-600">{pendingCount} pending</span>}
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="border-t border-border p-2">
                          <DataTable
                            columns={columns}
                            data={group.documents}
                            searchKeys={["name", "type"]}
                            searchPlaceholder="Search this application's documents..."
                            emptyTitle="No documents"
                            emptyDescription="No documents found for this application."
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          )}
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(rejectingDocumentId)}
        onOpenChange={(open) => {
          if (!open) closeRejectDialog();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject document</DialogTitle>
            <DialogDescription>
              Please enter a reason. This message will be visible to the client.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label htmlFor="rejection-reason" className="text-sm font-medium">
              Rejection reason
            </label>
            <textarea
              id="rejection-reason"
              value={rejectionReason}
              onChange={(event) => setRejectionReason(event.target.value)}
              placeholder="Example: The uploaded document is not clear..."
              rows={4}
              maxLength={500}
              autoFocus
              className="flex w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            />
            <p className="text-right text-xs text-muted-foreground">{rejectionReason.length}/500</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeRejectDialog} disabled={busy === rejectingDocumentId}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void rejectDocument()}
              disabled={!rejectionReason.trim() || busy === rejectingDocumentId}
            >
              {busy === rejectingDocumentId ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Reject document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
