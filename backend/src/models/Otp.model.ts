import { Schema, model, type Document, type Model } from "mongoose";

export type OtpPurpose = "register" | "login" | "reset_password" | "phone_change";

export interface IOtp extends Document {
  phone: string;
  codeHash: string;
  purpose: OtpPurpose;
  expiresAt: Date;
  attempts: number;
  consumed: boolean;
  userId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const otpSchema = new Schema<IOtp>(
  {
    phone: { type: String, required: true, index: true },
    codeHash: { type: String, required: true },
    purpose: {
      type: String,
      required: true,
      enum: ["register", "login", "reset_password", "phone_change"],
    },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
    consumed: { type: Boolean, default: false, index: true },
    userId: { type: String, index: true },
  },
  { timestamps: true },
);

// TTL: auto-delete OTP documents ~1 hour after expiresAt
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 3600 });

export const OtpModel: Model<IOtp> = model<IOtp>("Otp", otpSchema);
