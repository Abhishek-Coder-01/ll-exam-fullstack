import { api } from "./api";
import type { Payment, PaymentStatus } from "@/types";

interface RawPayment {
  businessId: string;
  applicationId: string;
  clientId: string;
  clientName: string;
  amount: number;
  status: PaymentStatus;
  method: string;
  invoiceNo: string;
  date: string;
  provider?: string;
  providerOrderId?: string;
}

function toPayment(p: RawPayment): Payment {
  return {
    id: p.businessId,
    applicationId: p.applicationId,
    clientName: p.clientName,
    amount: p.amount,
    status: p.status,
    method: p.method,
    date: p.date,
    invoiceNo: p.invoiceNo,
  };
}

export async function listPayments(params: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
} = {}) {
  const { data, meta } = await api.get<RawPayment[]>("/payments", { query: params });
  return {
    items: data.map(toPayment),
    total: Number(meta?.total ?? data.length),
    page: Number(meta?.page ?? 1),
    limit: Number(meta?.limit ?? data.length),
  };
}

export interface CreateOrderResponse {
  payment: RawPayment;
  order: {
    provider: string;
    orderId: string;
    amount: number;
    currency: string;
    keyId?: string;
  };
}

export async function createPaymentOrder(applicationId: string, method: string) {
  const { data } = await api.post<CreateOrderResponse>("/payments/create-order", {
    applicationId,
    method,
  });
  return data;
}

export async function verifyPayment(payload: {
  orderId: string;
  paymentId: string;
  signature: string;
}) {
  const { data } = await api.post<RawPayment>("/payments/verify", payload);
  return toPayment(data);
}

export async function updatePaymentStatus(businessId: string, status: PaymentStatus) {
  const { data } = await api.patch<RawPayment>(`/payments/${businessId}/status`, { status });
  return toPayment(data);
}
