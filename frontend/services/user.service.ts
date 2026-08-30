import { api } from "./api";
import type { StaffMember, Client } from "@/types";

export interface AdminStats {
  totalClients: number;
  totalStaff: number;
  pendingStaff: number;
  totalApplications: number;
  completedApplications: number;
  pendingPayments: number;
  totalRevenue: number;
}

export interface PagedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

interface RawUser {
  businessId: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  avatarUrl?: string;
  isPhoneVerified?: boolean;
  isEmailVerified?: boolean;
  staffStatus?: string;
  department?: string;
  licenseType?: string;
  assignedStaffId?: string;
  assignedStaff?: string;
  clientStatus?: string;
  applications?: number;
  assignedClients?: number;
  completedApplications?: number;
  createdAt: string;
  updatedAt?: string;
}

function toStaff(u: RawUser): StaffMember {
  return {
    id: u.businessId,
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: "staff",
    status: (u.staffStatus as StaffMember["status"]) ?? "Pending",
    assignedClients: u.assignedClients ?? 0,
    completedApplications: u.completedApplications ?? 0,
    department: u.department ?? "Licensing",
    createdAt: u.createdAt,
    avatarUrl: u.avatarUrl,
  };
}

function toClient(u: RawUser): Client {
  return {
    id: u.businessId,
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: "client",
    status: (u.clientStatus as Client["status"]) ?? "Active",
    applications: u.applications ?? 0,
    assignedStaff: u.assignedStaff,
    licenseType: u.licenseType ?? "Learner's License",
    createdAt: u.createdAt,
    avatarUrl: u.avatarUrl,
  };
}

/* ------------------ Admin: stats ------------------ */

export async function fetchAdminStats(): Promise<AdminStats> {
  const { data } = await api.get<AdminStats>("/users/admin/stats");
  return data;
}

/* ------------------ Staff management (admin) ------------------ */

export async function listStaff(params: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
} = {}): Promise<PagedResponse<StaffMember>> {
  const { data, meta } = await api.get<RawUser[]>("/users/staff", { query: params });
  return {
    items: data.map(toStaff),
    total: Number(meta?.total ?? data.length),
    page: Number(meta?.page ?? 1),
    limit: Number(meta?.limit ?? data.length),
  };
}

export async function updateStaffStatus(
  businessId: string,
  staffStatus: "Pending" | "Approved" | "Rejected" | "Active" | "Inactive",
): Promise<StaffMember> {
  const { data } = await api.patch<RawUser>(`/users/staff/${businessId}/status`, { staffStatus });
  return toStaff(data);
}

/* ------------------ Team leader management (admin) ------------------ */

export interface TeamLeader {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: "team_leader";
  department?: string;
  staffStatus?: string;
  teamMemberCount: number;
  activeTasks: number;
  createdAt: string;
  avatarUrl?: string;
}

function toTeamLeader(u: RawUser): TeamLeader {
  return {
    id: u.businessId,
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: "team_leader",
    department: u.department ?? "Licensing",
    staffStatus: u.staffStatus ?? "Active",
    teamMemberCount: (u as any).teamMemberCount ?? 0,
    activeTasks: (u as any).activeTasks ?? 0,
    createdAt: u.createdAt,
    avatarUrl: u.avatarUrl,
  };
}

export async function listTeamLeaders(params: {
  page?: number;
  limit?: number;
  search?: string;
} = {}): Promise<PagedResponse<TeamLeader>> {
  const { data, meta } = await api.get<RawUser[]>("/users/team-leaders", { query: params });
  return {
    items: data.map(toTeamLeader),
    total: Number(meta?.total ?? data.length),
    page: Number(meta?.page ?? 1),
    limit: Number(meta?.limit ?? data.length),
  };
}

export async function createTeamLeader(payload: {
  name: string;
  email: string;
  phone: string;
  password: string;
  department?: string;
}): Promise<TeamLeader> {
  const { data } = await api.post<RawUser>("/users/team-leaders", payload);
  return toTeamLeader(data);
}

export async function updateTeamLeader(
  businessId: string,
  payload: { name?: string; email?: string; phone?: string; department?: string },
): Promise<TeamLeader> {
  const { data } = await api.patch<RawUser>(`/users/team-leaders/${businessId}`, payload);
  return toTeamLeader(data);
}

export async function toggleTeamLeaderActive(businessId: string, active: boolean): Promise<TeamLeader> {
  const { data } = await api.patch<RawUser>(`/users/team-leaders/${businessId}/active`, { active });
  return toTeamLeader(data);
}

export async function deleteTeamLeader(businessId: string): Promise<any> {
  const { data } = await api.delete(`/users/team-leaders/${businessId}`);
  return data;
}

export async function assignStaffToTeamLeader(
  teamLeaderBusinessId: string,
  staffBusinessId: string,
): Promise<any> {
  const { data } = await api.patch(`/users/team-leaders/${teamLeaderBusinessId}/assign-staff`, {
    staffId: staffBusinessId,
  });
  return data;
}

export async function removeStaffFromTeamLeader(
  teamLeaderBusinessId: string,
  staffBusinessId: string,
): Promise<any> {
  const { data } = await api.patch(`/users/team-leaders/${teamLeaderBusinessId}/remove-staff`, {
    staffId: staffBusinessId,
  });
  return data;
}

/* ------------------ Client management (admin) ------------------ */

export async function listClients(params: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
} = {}): Promise<PagedResponse<Client>> {
  const { data, meta } = await api.get<RawUser[]>("/users/clients", { query: params });
  return {
    items: data.map(toClient),
    total: Number(meta?.total ?? data.length),
    page: Number(meta?.page ?? 1),
    limit: Number(meta?.limit ?? data.length),
  };
}

export async function assignStaffToClient(
  clientBusinessId: string,
  staffBusinessId: string,
): Promise<Client> {
  const { data } = await api.patch<RawUser>(
    `/users/clients/${clientBusinessId}/assign`,
    { staffId: staffBusinessId },
  );
  return toClient(data);
}

/* ------------------ Staff: assigned clients ------------------ */

export async function listAssignedClients(): Promise<Client[]> {
  const { data } = await api.get<RawUser[]>("/users/staff/assigned-clients");
  return data.map(toClient);
}

/* ------------------ Self: profile ------------------ */

export async function updateProfile(payload: {
  name?: string;
  avatarUrl?: string;
  department?: string;
  licenseType?: string;
}) {
  const { data } = await api.patch<RawUser>("/users/me", payload);
  return data;
}
