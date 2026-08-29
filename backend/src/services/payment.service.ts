/**
 * Payment gateway abstraction.
 *
 * Today: `stub` provider — client can create an order, "pay" it, and it moves to Completed.
 * Tomorrow: swap in Razorpay / Stripe by implementing the same `PaymentProvider` interface.
 *
 * As you asked — payment integration ka "introduction" abhi, real gateway (Razorpay) baad me.
 */
import { randomBytes } from "crypto";
import { env } from "../config/env";

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
    // TODO: swap with the real Razorpay SDK once RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are set.
    // const rz = new Razorpay({ key_id: env.RAZORPAY_KEY_ID, key_secret: env.RAZORPAY_KEY_SECRET });
    // const order = await rz.orders.create({ amount: input.amount * 100, currency: input.currency, receipt: input.invoiceNo });
    return {
      provider: "razorpay",
      orderId: `rzp_placeholder_${randomBytes(6).toString("hex")}`,
      amount: input.amount,
      currency: input.currency,
      keyId: env.RAZORPAY_KEY_ID,
    };
  },
  async verifyPayment() {
    // TODO: verify HMAC SHA256 signature using RAZORPAY_KEY_SECRET.
    return false;
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
