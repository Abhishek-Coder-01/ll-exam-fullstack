import { Schema, model, type Document, type Model } from "mongoose";
import { PAYMENT_STATUSES, type PaymentStatus } from "../types/domain";

export interface IPayment extends Document {
  businessId: string; // PAY-55001
  applicationId: string;
  clientId: string;
  clientName: string;
  amount: number;
  status: PaymentStatus;
  method: string; // UPI / Net Banking / Debit Card / Credit Card / Stub
  invoiceNo: string;
  date: Date;

  // Gateway stub fields — kept generic for later Razorpay/Stripe hookup
  provider: "stub" | "razorpay" | "stripe";
  providerOrderId?: string;
  providerPaymentId?: string;
  providerSignature?: string;
  raw?: Record<string, unknown>;

  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    businessId: { type: String, required: true, unique: true, index: true },
    applicationId: { type: String, required: true, index: true },
    clientId: { type: String, required: true, index: true },
    clientName: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      required: true,
      enum: PAYMENT_STATUSES,
      default: "Pending",
      index: true,
    },
    method: { type: String, required: true },
    invoiceNo: { type: String, required: true, unique: true },
    date: { type: Date, default: Date.now },

    provider: { type: String, enum: ["stub", "razorpay", "stripe"], default: "stub" },
    providerOrderId: { type: String },
    providerPaymentId: { type: String },
    providerSignature: { type: String },
    raw: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

export const PaymentModel: Model<IPayment> = model<IPayment>("Payment", paymentSchema);
