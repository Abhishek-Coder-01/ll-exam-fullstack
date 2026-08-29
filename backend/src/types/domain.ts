/**
 * Domain-wide shared enum-like types.
 * Kept in sync with frontend `/types/index.ts`.
 */

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

export type NotificationType = "info" | "success" | "warning" | "error";

export const ROLES: Role[] = ["admin", "staff", "client"];
export const APPLICATION_STATUSES: ApplicationStatus[] = [
  "Submitted",
  "Under Review",
  "Assigned Staff",
  "Verified",
  "Approved",
  "Completed",
  "Rejected",
];
export const STAFF_STATUSES: StaffStatus[] = [
  "Pending",
  "Approved",
  "Rejected",
  "Active",
  "Inactive",
];
export const PAYMENT_STATUSES: PaymentStatus[] = ["Pending", "Verified", "Failed", "Completed"];
export const DOCUMENT_STATUSES: DocumentStatus[] = ["Pending", "In Progress", "Verified", "Rejected"];
export const NOTIFICATION_TYPES: NotificationType[] = ["info", "success", "warning", "error"];
