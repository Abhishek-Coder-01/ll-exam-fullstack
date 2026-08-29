import { api } from "./api";
import type { Application, ApplicationStatus } from "@/types";

interface RawApplication {
  businessId: string;
  applicantName: string;
  applicantId: string;
  type: string;
  status: ApplicationStatus;
  assignedStaffId?: string;
  assignedStaffName?: string;
  submittedOn: string;
  updatedOn: string;
  documentsCount: number;
  fee: number;
  remarks?: string;
}

function toApplication(a: RawApplication): Application {
  return {
    id: a.businessId,
    applicantName: a.applicantName,
    applicantId: a.applicantId,
    type: a.type,
    status: a.status,
    assignedStaff: a.assignedStaffName,
    submittedOn: a.submittedOn,
    updatedOn: a.updatedOn,
    documentsCount: a.documentsCount,
    fee: a.fee,
  };
}

export async function listApplications(params: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
} = {}) {
  const { data, meta } = await api.get<RawApplication[]>("/applications", { query: params });
  return {
    items: data.map(toApplication),
    total: Number(meta?.total ?? data.length),
    page: Number(meta?.page ?? 1),
    limit: Number(meta?.limit ?? data.length),
  };
}

export async function getApplication(businessId: string): Promise<Application> {
  const { data } = await api.get<RawApplication>(`/applications/${businessId}`);
  return toApplication(data);
}

export async function createApplication(payload: {
  type: string;
  fee?: number;
  remarks?: string;
}): Promise<Application> {
  const { data } = await api.post<RawApplication>("/applications", payload);
  return toApplication(data);
}

export async function updateApplication(
  businessId: string,
  patch: Partial<{
    status: ApplicationStatus;
    assignedStaffId: string;
    assignedStaffName: string;
    remarks: string;
    type: string;
    fee: number;
  }>,
): Promise<Application> {
  const { data } = await api.patch<RawApplication>(`/applications/${businessId}`, patch);
  return toApplication(data);
}
