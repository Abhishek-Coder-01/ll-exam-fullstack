"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { FileText, UploadCloud, Download, Trash2, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { DataTable, type Column } from "@/components/tables/data-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { documentService, applicationService, ApiError } from "@/services";
import type { Application, DocumentItem } from "@/types";
import { formatDate } from "@/lib/utils";

type DocRow = DocumentItem & { applicationId: string };

export default function ClientDocumentsPage() {
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedApp, setSelectedApp] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("Identity Proof");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const [d, a] = await Promise.all([
        documentService.listDocuments(),
        applicationService.listApplications({ limit: 50 }),
      ]);
      setDocs(d as DocRow[]);
      setApps(a.items);
      if (a.items.length > 0 && !selectedApp) setSelectedApp(a.items[0].id);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load documents");
    } finally {
      setLoading(false);
    }
  }, [selectedApp]);

  useEffect(() => {
    void load();
  }, [load]);

  const onFile = async (file: File | null) => {
    if (!file || !selectedApp) return;
    setUploading(true);
    try {
      await documentService.uploadDocument({
        applicationId: selectedApp,
        type: selectedType,
        file,
      });
      await load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to upload document");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const download = async (id: string, name: string) => {
    try {
      await documentService.downloadDocument(id, name);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to download");
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("Delete this document?")) return;
    setBusy(id);
    try {
      await documentService.deleteDocument(id);
      await load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to delete");
    } finally {
      setBusy(null);
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
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => download(d.id, d.name)}
            title="Download"
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-destructive hover:bg-destructive/10"
            onClick={() => remove(d.id)}
            disabled={busy === d.id || d.status === "Verified"}
            title={d.status === "Verified" ? "Cannot delete a verified document" : "Delete"}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Documents"
        description="Upload, download, and manage your submitted documents."
      />

      <Card className="mb-4">
        <CardContent className="p-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div className="space-y-1.5">
              <p className="text-xs font-medium">Application</p>
              <Select value={selectedApp} onValueChange={setSelectedApp}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an application" />
                </SelectTrigger>
                <SelectContent>
                  {apps.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No applications yet
                    </SelectItem>
                  ) : (
                    apps.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.id} · {a.type}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-medium">Document type</p>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Identity Proof">Identity Proof</SelectItem>
                  <SelectItem value="Address Proof">Address Proof</SelectItem>
                  <SelectItem value="Photograph">Photograph</SelectItem>
                  <SelectItem value="Medical">Medical Certificate</SelectItem>
                  <SelectItem value="Age Proof">Age Proof</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={!selectedApp || uploading || apps.length === 0}
              className="gap-1"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UploadCloud className="h-4 w-4" />
              )}
              Upload
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="application/pdf,image/*"
              onChange={(e) => onFile(e.target.files?.[0] ?? null)}
            />
          </div>
        </CardContent>
      </Card>

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
              searchPlaceholder="Search your documents..."
              emptyTitle="No documents uploaded yet"
              emptyDescription="Attach documents to your applications from above."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
