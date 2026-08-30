import { z } from "zod";
import {
  APPLICATION_STATUSES,
  DOCUMENT_STATUSES,
  PAYMENT_STATUSES,
  STAFF_AVAILABILITY_STATUSES,
  STAFF_STATUSES,
} from "../types/domain";

export const createApplicationSchema = z.object({
  type: z.string().min(2, "Application type is required"),
  fee: z.number().min(0).optional(),
  remarks: z.string().optional(),
});

export const updateApplicationSchema = z.object({
  status: z.enum(APPLICATION_STATUSES as [string, ...string[]]).optional(),
  assignedStaffId: z.string().optional(),
  assignedStaffName: z.string().optional(),
  remarks: z.string().optional(),
  type: z.string().optional(),
  fee: z.number().min(0).optional(),
});

export const uploadDocumentSchema = z.object({
  applicationId: z.string().min(1),
  type: z.string().min(1),
});

export const updateDocumentStatusSchema = z.object({
  status: z.enum(DOCUMENT_STATUSES as [string, ...string[]]),
  remarks: z.string().optional(),
});

export const updateStaffStatusSchema = z.object({
  staffStatus: z.enum(STAFF_STATUSES as [string, ...string[]]),
});

export const updateStaffAvailabilitySchema = z.object({
  availabilityStatus: z.enum(STAFF_AVAILABILITY_STATUSES as [string, ...string[]]),
});

export const createPaymentSchema = z.object({
  applicationId: z.string().min(1),
  method: z.string().min(1),
});

export const verifyPaymentSchema = z.object({
  orderId: z.string().min(1),
  paymentId: z.string().min(1),
  signature: z.string().min(1),
});

export const updatePaymentStatusSchema = z.object({
  status: z.enum(PAYMENT_STATUSES as [string, ...string[]]),
});

export const sendMessageSchema = z.object({
  threadId: z.string().min(1),
  message: z.string().min(1),
});

export const createThreadSchema = z.object({
  clientId: z.string().min(1),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  avatarUrl: z.string().url().optional(),
  department: z.string().optional(),
  licenseType: z.string().optional(),
});
