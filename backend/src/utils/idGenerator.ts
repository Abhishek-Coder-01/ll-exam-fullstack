/**
 * Human-readable business ID generators.
 * Kept aligned with the frontend dummy-data conventions (STF-101, CLT-2001, APP-90012, ...).
 */
import { customAlphabet } from "./nanoid";

const digits = customAlphabet("0123456789", 5);

export function generateStaffId(): string {
  return `STF-${digits(3)}`;
}
export function generateTeamLeaderId(): string {
  return `TL-${digits(3)}`;
}
export function generateClientId(): string {
  return `CLT-${digits(4)}`;
}
export function generateApplicationId(): string {
  return `APP-${digits(5)}`;
}
export function generatePaymentId(): string {
  return `PAY-${digits(5)}`;
}
export function generateInvoiceNo(): string {
  return `INV-${digits(4)}`;
}
export function generateDocumentId(): string {
  return `DOC-${digits(5)}`;
}
export function generateNotificationId(): string {
  return `NTF-${digits(5)}`;
}
export function generateThreadId(): string {
  return `THR-${digits(4)}`;
}
export function generateMessageId(): string {
  return `MSG-${digits(5)}`;
}
