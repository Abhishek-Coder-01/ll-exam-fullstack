import { Schema, model, type Document, type Model } from "mongoose";
import { APPLICATION_STATUSES, type ApplicationStatus } from "../types/domain";

export interface IApplication extends Document {
  businessId: string; // APP-90012
  idempotencyKey?: string;
  applicantName: string;
  applicantId: string; // -> Client.businessId
  type: string; // Learner's License, Permanent License, Commercial License
  status: ApplicationStatus;
  assignedStaffId?: string;
  assignedStaffName?: string;
  submittedOn: Date;
  updatedOn: Date;
  documentsCount: number;
  fee: number;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

const applicationSchema = new Schema<IApplication>(
  {
    businessId: { type: String, required: true, unique: true, index: true },
    idempotencyKey: { type: String, index: true, sparse: true },
    applicantName: { type: String, required: true },
    applicantId: { type: String, required: true, index: true },
    type: { type: String, required: true },
    status: {
      type: String,
      required: true,
      enum: APPLICATION_STATUSES,
      default: "Submitted",
      index: true,
    },
    assignedStaffId: { type: String, index: true },
    assignedStaffName: { type: String },
    submittedOn: { type: Date, default: Date.now },
    updatedOn: { type: Date, default: Date.now },
    documentsCount: { type: Number, default: 0 },
    fee: { type: Number, required: true, min: 0 },
    remarks: { type: String },
  },
  { timestamps: true },
);

applicationSchema.pre("save", function updateTimestamp(next) {
  this.updatedOn = new Date();
  next();
});

applicationSchema.index({ applicantId: 1, createdAt: -1 });
applicationSchema.index({ assignedStaffId: 1, status: 1, createdAt: -1 });
applicationSchema.index({ status: 1, createdAt: -1 });
applicationSchema.index({ applicantId: 1, idempotencyKey: 1 }, { unique: true, sparse: true });

export const ApplicationModel: Model<IApplication> = model<IApplication>(
  "Application",
  applicationSchema,
);
