import { api, fetchBlob } from "./api";
import type { DocumentItem, DocumentStatus } from "@/types";

interface RawDocument {
  businessId: string;
  applicationId: string;
  ownerId: string;
  name: string;
  type: string;
  status: DocumentStatus;
  uploadedOn: string;
  size: string;
  bytes: number;
  mimetype: string;
  storagePath: string;
  remarks?: string;
  applicantName?: string;
  applicationType?: string;
}

function toDoc(d: RawDocument): DocumentItem & {
  applicationId: string;
  ownerId: string;
  mimetype: string;
  applicantName?: string;
  applicationType?: string;
} {
  return {
    id: d.businessId,
    name: d.name,
    type: d.type,
    status: d.status,
    uploadedOn: d.uploadedOn,
    size: d.size,
    applicationId: d.applicationId,
    ownerId: d.ownerId,
    mimetype: d.mimetype,
    remarks: d.remarks,
    applicantName: d.applicantName,
    applicationType: d.applicationType,
  };
}

export async function listDocuments(params: { applicationId?: string; status?: string; page?: string; limit?: string } = {}) {
  const { data } = await api.get<RawDocument[]>("/documents", {
    query: { limit: "100", ...params },
  });
  return data.map(toDoc);
}

export async function uploadDocument(payload: {
  applicationId: string;
  type: string;
  file: File;
}) {
  const form = new FormData();
  form.append("file", payload.file);
  form.append("applicationId", payload.applicationId);
  form.append("type", payload.type);
  const { data } = await api.post<RawDocument>("/documents/upload", form);
  return toDoc(data);
}

export async function updateDocumentStatus(
  businessId: string,
  status: DocumentStatus,
  remarks?: string,
) {
  const { data } = await api.patch<RawDocument>(`/documents/${businessId}/status`, {
    status,
    remarks,
  });
  return toDoc(data);
}

export async function deleteDocument(businessId: string) {
  await api.delete<null>(`/documents/${businessId}`);
}

/**
 * Trigger a browser download of a document.
 */
export async function downloadDocument(businessId: string, filename: string) {
  const result = await fetchBlob(`/documents/${businessId}/download`);
  if (!result) throw new Error("Failed to download document");
  const url = URL.createObjectURL(result.blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = result.filename ?? filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
