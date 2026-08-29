"use client";

import { useEffect, useState, useCallback } from "react";
import { FileText, Check, X, Download, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { DataTable, type Column } from "@/components/tables/data-table";
import { documentService, ApiError } from "@/services";
import type { DocumentItem, DocumentStatus } from "@/types";
import { formatDate } from "@/lib/utils";

type DocRow = DocumentItem & { applicationId: string };

export default function StaffDocumentsPage() {
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const items = await documentService.listDocuments();
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

  const setStatus = async (id: string, status: DocumentStatus) => {
    setBusy(id);
    try {
      await documentService.updateDocumentStatus(id, status);
      await load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to update document");
    } finally {
      setBusy(null);
    }
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
            onClick={() => setStatus(d.id, "Rejected")}
            disabled={busy === d.id}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

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
            <DataTable
              columns={columns}
              data={docs}
              searchKeys={["name", "type"]}
              searchPlaceholder="Search documents..."
              emptyTitle="No documents uploaded yet"
              emptyDescription="Uploaded documents from your assigned clients will appear here."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
