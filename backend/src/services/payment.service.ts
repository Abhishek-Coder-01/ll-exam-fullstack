/**
 * Payment gateway abstraction.
 *
 * Today: `stub` provider — client can create an order, "pay" it, and it moves to Completed.
 * Tomorrow: swap in Razorpay / Stripe by implementing the same `PaymentProvider` interface.
 *
 * As you asked — payment integration ka "introduction" abhi, real gateway (Razorpay) baad me.
 */
import { randomBytes } from "crypto";
import { createHmac, timingSafeEqual } from "crypto";
import { env } from "../config/env";
import { ApiError } from "../utils/ApiError";

export interface CreateOrderInput {
  amount: number;
  currency: string;
  applicationId: string;
  clientId: string;
  invoiceNo: string;
}

export interface OrderResult {
  provider: "stub" | "razorpay" | "stripe";
  orderId: string;
  amount: number;
  currency: string;
  keyId?: string; // only for gateways that need it on the client
}

export interface VerifyPaymentInput {
  orderId: string;
  paymentId: string;
  signature: string;
}

export interface PaymentProvider {
  createOrder(input: CreateOrderInput): Promise<OrderResult>;
  verifyPayment(input: VerifyPaymentInput): Promise<boolean>;
}

/* -------------------- Stub provider (default) -------------------- */
const stubProvider: PaymentProvider = {
  async createOrder(input) {
    return {
      provider: "stub",
      orderId: `stub_order_${randomBytes(6).toString("hex")}`,
      amount: input.amount,
      currency: input.currency,
    };
  },
  async verifyPayment() {
    // Stub always verifies successfully — replaced by real signature check later.
    return true;
  },
};

/* -------------------- Razorpay placeholder --------------------
   Not wired to the SDK yet; TODO block outlines the real integration.
------------------------------------------------------------------ */
const razorpayProvider: PaymentProvider = {
  async createOrder(input) {
    if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
      throw ApiError.internal("Razorpay is not configured");
    }
    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: Math.round(input.amount * 100),
        currency: input.currency,
        receipt: input.invoiceNo,
        notes: { applicationId: input.applicationId, clientId: input.clientId },
      }),
    });
    if (!response.ok) {
      throw ApiError.internal("Unable to create payment order");
    }
    const order = (await response.json()) as { id?: string; amount?: number; currency?: string };
    if (!order.id || typeof order.amount !== "number" || !order.currency) {
      throw ApiError.internal("Invalid payment provider response");
    }
    return {
      provider: "razorpay",
      orderId: order.id,
      amount: order.amount / 100,
      currency: order.currency,
      keyId: env.RAZORPAY_KEY_ID,
    };
  },
  async verifyPayment({ orderId, paymentId, signature }) {
    if (!env.RAZORPAY_KEY_SECRET) return false;
    const expected = createHmac("sha256", env.RAZORPAY_KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");
    const expectedBuffer = Buffer.from(expected, "utf8");
    const actualBuffer = Buffer.from(signature, "utf8");
    return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer);
  },
};

export function getPaymentProvider(): PaymentProvider {
  switch (env.PAYMENT_PROVIDER) {
    case "razorpay":
      return razorpayProvider;
    case "stub":
    default:
      return stubProvider;
  }
}
