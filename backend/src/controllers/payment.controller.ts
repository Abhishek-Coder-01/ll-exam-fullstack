import type { Request, Response } from "express";
import { PaymentModel } from "../models/Payment.model";
import { ApplicationModel } from "../models/Application.model";
import { UserModel } from "../models/User.model";
import { ApiError } from "../utils/ApiError";
import { ok, created } from "../utils/ApiResponse";
import { generatePaymentId, generateInvoiceNo } from "../utils/idGenerator";
import { getPaymentProvider } from "../services/payment.service";
import { recordActivity } from "../services/activity.service";
import { pushNotification } from "../services/notification.service";
import type { PaymentStatus } from "../types/domain";

/**
 * NOTE — payment "introduction" only for now (as requested).
 * `createOrder` + `verifyPayment` speak to the Payment provider abstraction;
 * default provider = `stub` so the end-to-end flow works without any real gateway.
 * Swap PAYMENT_PROVIDER=razorpay in .env once you're ready.
 */

export async function createOrder(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized();
  const { applicationId, method } = req.body as { applicationId: string; method: string };

  const app = await ApplicationModel.findOne({ businessId: applicationId });
  if (!app) throw ApiError.notFound("Application not found");
  if (req.user.role === "client" && app.applicantId !== req.user.userId) {
    throw ApiError.forbidden();
  }
  const client = await UserModel.findOne({ businessId: app.applicantId });
  if (!client) throw ApiError.notFound("Client not found");

  // Reuse an existing Pending payment for this application if one exists
  let payment = await PaymentModel.findOne({ applicationId, status: "Pending" });
  if (!payment) {
    payment = await PaymentModel.create({
      businessId: generatePaymentId(),
      applicationId,
      clientId: client.businessId,
      clientName: client.name,
      amount: app.fee,
      status: "Pending",
      method,
      invoiceNo: generateInvoiceNo(),
      provider: "stub",
      date: new Date(),
    });
  } else {
    payment.method = method;
    await payment.save();
  }

  const provider = getPaymentProvider();
  const order = await provider.createOrder({
    amount: payment.amount,
    currency: "INR",
    applicationId,
    clientId: client.businessId,
    invoiceNo: payment.invoiceNo,
  });

  payment.provider = order.provider;
  payment.providerOrderId = order.orderId;
  await payment.save();

  created(res, {
    payment: payment.toObject(),
    order,
  }, "Order created");
}

export async function verifyPayment(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized();
  const { orderId, paymentId, signature } = req.body as {
    orderId: string;
    paymentId: string;
    signature: string;
  };

  const payment = await PaymentModel.findOne({ providerOrderId: orderId });
  if (!payment) throw ApiError.notFound("Payment not found");
  if (req.user.role === "client" && payment.clientId !== req.user.userId) {
    throw ApiError.forbidden();
  }

  const provider = getPaymentProvider();
  const isValid = await provider.verifyPayment({ orderId, paymentId, signature });
  if (!isValid) {
    payment.status = "Failed";
    await payment.save();
    throw ApiError.badRequest("Payment verification failed");
  }

  payment.providerPaymentId = paymentId;
  payment.providerSignature = signature;
  payment.status = "Completed";
  await payment.save();

  // Optionally advance the application status
  const app = await ApplicationModel.findOne({ businessId: payment.applicationId });
  if (app && app.status === "Submitted") {
    app.status = "Under Review";
    app.updatedOn = new Date();
    await app.save();
  }

  await recordActivity({
    actorId: req.user.userId,
    actorName: req.user.email,
    action: "completed payment",
    target: payment.businessId,
  });

  await pushNotification({
    recipientId: payment.clientId,
    title: "Payment successful",
    description: `Payment of ₹${payment.amount} for ${payment.applicationId} has been recorded.`,
    type: "success",
    link: "/client/payments",
  });

  ok(res, payment.toObject(), "Payment verified");
}

export async function listPayments(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized();
  const { page = 1, limit = 20, status, search } = req.query as Record<string, string | undefined>;
  const filter: Record<string, unknown> = {};
  if (req.user.role === "client") filter.clientId = req.user.userId;
  if (status) filter.status = status;
  if (search) {
    filter.$or = [
      { businessId: { $regex: search, $options: "i" } },
      { invoiceNo: { $regex: search, $options: "i" } },
      { clientName: { $regex: search, $options: "i" } },
      { applicationId: { $regex: search, $options: "i" } },
    ];
  }
  const p = Number(page);
  const l = Number(limit);
  const [items, total] = await Promise.all([
    PaymentModel.find(filter).sort({ createdAt: -1 }).skip((p - 1) * l).limit(l),
    PaymentModel.countDocuments(filter),
  ]);
  ok(res, items, "Payments", 200, { total, page: p, limit: l });
}

export async function updatePaymentStatus(req: Request, res: Response): Promise<void> {
  const { businessId } = req.params;
  const { status } = req.body as { status: PaymentStatus };
  const payment = await PaymentModel.findOne({ businessId });
  if (!payment) throw ApiError.notFound("Payment not found");
  payment.status = status;
  await payment.save();
  ok(res, payment.toObject(), "Payment status updated");
}
