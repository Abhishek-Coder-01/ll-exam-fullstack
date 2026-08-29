import { Schema, model, type Document, type Model } from "mongoose";
import { DOCUMENT_STATUSES, type DocumentStatus } from "../types/domain";

export interface IDocumentItem extends Document {
  businessId: string; // DOC-001
  applicationId: string; // -> Application.businessId
  ownerId: string; // -> Client.businessId
  name: string;
  type: string; // Identity Proof, Address Proof, Photograph, Medical, Age Proof
  status: DocumentStatus;
  uploadedOn: Date;
  size: string; // "1.2 MB" (also stored as bytes)
  bytes: number;
  mimetype: string;
  storagePath: string; // relative path in UPLOAD_DIR
  remarks?: string;
  reviewedBy?: string;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const documentSchema = new Schema<IDocumentItem>(
  {
    businessId: { type: String, required: true, unique: true, index: true },
    applicationId: { type: String, required: true, index: true },
    ownerId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    type: { type: String, required: true },
    status: {
      type: String,
      required: true,
      enum: DOCUMENT_STATUSES,
      default: "Pending",
      index: true,
    },
    uploadedOn: { type: Date, default: Date.now },
    size: { type: String, required: true },
    bytes: { type: Number, required: true },
    mimetype: { type: String, required: true },
    storagePath: { type: String, required: true },
    remarks: { type: String },
    reviewedBy: { type: String },
    reviewedAt: { type: Date },
  },
  { timestamps: true },
);

export const DocumentItemModel: Model<IDocumentItem> = model<IDocumentItem>(
  "DocumentItem",
  documentSchema,
);
