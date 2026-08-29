export type Role = "admin" | "staff" | "client";

export type ApplicationStatus =
  | "Submitted"
  | "Under Review"
  | "Assigned Staff"
  | "Verified"
  | "Approved"
  | "Completed"
  | "Rejected";

export type StaffStatus = "Pending" | "Approved" | "Rejected" | "Active" | "Inactive";

export type PaymentStatus = "Pending" | "Verified" | "Failed" | "Completed";

export type DocumentStatus = "Pending" | "In Progress" | "Verified" | "Rejected";

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatarUrl?: string;
  role: Role;
  createdAt: string;
}

export interface StaffMember extends User {
  role: "staff";
  status: StaffStatus;
  assignedClients: number;
  completedApplications: number;
  department: string;
}

export interface Client extends User {
  role: "client";
  status: "Active" | "Inactive";
  applications: number;
  assignedStaff?: string;
  licenseType: string;
}

export interface Application {
  id: string;
  applicantName: string;
  applicantId: string;
  type: string;
  status: ApplicationStatus;
  assignedStaff?: string;
  submittedOn: string;
  updatedOn: string;
  documentsCount: number;
  fee: number;
}

export interface Payment {
  id: string;
  applicationId: string;
  clientName: string;
  amount: number;
  status: PaymentStatus;
  method: string;
  date: string;
  invoiceNo: string;
}

export interface DocumentItem {
  id: string;
  name: string;
  type: string;
  status: DocumentStatus;
  uploadedOn: string;
  size: string;
}

export interface ChatMessage {
  id: string;
  sender: string;
  senderRole: Role;
  message: string;
  time: string;
  isOwn?: boolean;
}

export interface ChatThread {
  id: string;
  clientName: string;
  lastMessage: string;
  time: string;
  unread: number;
  avatarUrl?: string;
}

export interface Notification {
  id: string;
  title: string;
  description: string;
  time: string;
  read: boolean;
  type: "info" | "success" | "warning" | "error";
}

export interface ActivityItem {
  id: string;
  actor: string;
  action: string;
  target: string;
  time: string;
}

export interface TimelineStep {
  label: string;
  status: "completed" | "current" | "upcoming";
  date?: string;
}

export interface ChartPoint {
  name: string;
  value?: number;
  [key: string]: string | number | undefined;
}
