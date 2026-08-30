import { Schema, model, type Document, type Model } from "mongoose";
import bcrypt from "bcryptjs";
import { env } from "../config/env";
import {
  ROLES,
  type Role,
  type StaffAvailabilityStatus,
  type StaffStatus,
} from "../types/domain";

export interface IUser extends Document {
  businessId: string; // e.g. STF-101, TL-200, CLT-2001, ADM-001
  name: string;
  email: string;
  phone: string;
  password: string;
  role: Role;
  avatarUrl?: string;

  // Verification & activation
  isPhoneVerified: boolean;
  isEmailVerified: boolean;

  // Staff-specific
  staffStatus?: StaffStatus; // Pending / Approved / Rejected / Active / Inactive
  department?: string;
  availabilityStatus?: StaffAvailabilityStatus;
  teamLeaderId?: string;

  // Client-specific
  licenseType?: string;
  assignedStaffId?: string; // FK -> businessId of staff
  clientStatus?: "Active" | "Inactive";

  // Session
  refreshTokenHash?: string;

  createdAt: Date;
  updatedAt: Date;

  comparePassword(candidate: string): Promise<boolean>;
  toPublicJSON(): Record<string, unknown>;
}

const userSchema = new Schema<IUser>(
  {
    businessId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    phone: { type: String, required: true, trim: true, index: true },
    password: { type: String, required: true, minlength: 6, select: false },
    role: { type: String, required: true, enum: ROLES, index: true },
    avatarUrl: { type: String },

    isPhoneVerified: { type: Boolean, default: false },
    isEmailVerified: { type: Boolean, default: false },

    // Staff and Team Leaders
    staffStatus: {
      type: String,
      enum: ["Pending", "Approved", "Rejected", "Active", "Inactive"],
    },
    department: { type: String },
    availabilityStatus: {
      type: String,
      enum: ["Available", "Busy", "Break", "Offline", "Inactive", "Suspended"],
      default: "Available",
    },
    teamLeaderId: { type: String, index: true },

    // Client
    licenseType: { type: String },
    assignedStaffId: { type: String, index: true },
    clientStatus: { type: String, enum: ["Active", "Inactive"] },

    refreshTokenHash: { type: String, select: false },
  },
  { timestamps: true },
);

userSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, env.BCRYPT_SALT_ROUNDS);
  next();
});

userSchema.methods.comparePassword = async function comparePassword(
  this: IUser,
  candidate: string,
): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toPublicJSON = function toPublicJSON(this: IUser): Record<string, unknown> {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshTokenHash;
  return obj;
};

export const UserModel: Model<IUser> = model<IUser>("User", userSchema);
