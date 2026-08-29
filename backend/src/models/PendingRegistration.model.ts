import { Schema, model, type Document, type Model } from "mongoose";

/**
 * Holds client registration data temporarily until the OTP is verified.
 * Only after OTP verification is a real User document created in MongoDB.
 *
 * TTL: documents auto-expire 24 hours after creation to prevent buildup
 * of abandoned registrations.
 */
export interface IPendingRegistration extends Document {
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
  licenseType: string;
  createdAt: Date;
  updatedAt: Date;
}

const pendingRegistrationSchema = new Schema<IPendingRegistration>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    phone: { type: String, required: true, trim: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    licenseType: { type: String, required: true, default: "Learner's License" },
  },
  { timestamps: true },
);

// TTL: auto-delete pending registrations 24 hours after creation.
pendingRegistrationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

export const PendingRegistrationModel: Model<IPendingRegistration> = model<IPendingRegistration>(
  "PendingRegistration",
  pendingRegistrationSchema,
);
