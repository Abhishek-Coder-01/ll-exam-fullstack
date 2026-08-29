import type { Request, Response } from "express";
import fs from "fs";
import path from "path";
import { DocumentItemModel } from "../models/Document.model";
import { ApplicationModel } from "../models/Application.model";
import { ApiError } from "../utils/ApiError";
import { ok, created } from "../utils/ApiResponse";
import { generateDocumentId } from "../utils/idGenerator";
import { humanSize, UPLOAD_ROOT } from "../middlewares/upload.middleware";
import { recordActivity } from "../services/activity.service";
import { pushNotification } from "../services/notification.service";
import type { DocumentStatus } from "../types/domain";

export async function uploadDocument(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized();
  if (!req.file) throw ApiError.badRequest("No file uploaded");

  const { applicationId, type } = req.body as { applicationId: string; type: string };
  const app = await ApplicationModel.findOne({ businessId: applicationId });
  if (!app) {
    // clean up orphan file
    fs.unlinkSync(path.join(UPLOAD_ROOT, req.file.filename));
    throw ApiError.notFound("Application not found");
  }

  if (req.user.role === "client" && app.applicantId !== req.user.userId) {
    fs.unlinkSync(path.join(UPLOAD_ROOT, req.file.filename));
    throw ApiError.forbidden("You cannot upload documents for this application");
  }

  const doc = await DocumentItemModel.create({
    businessId: generateDocumentId(),
    applicationId,
    ownerId: app.applicantId,
    name: req.file.originalname,
    type,
    status: "Pending",
    uploadedOn: new Date(),
    size: humanSize(req.file.size),
    bytes: req.file.size,
    mimetype: req.file.mimetype,
    storagePath: req.file.filename,
  });

  app.documentsCount = await DocumentItemModel.countDocuments({ applicationId });
  app.updatedOn = new Date();
  await app.save();

  await recordActivity({
    actorId: req.user.userId,
    actorName: req.user.email,
    action: "uploaded document",
    target: doc.businessId,
    meta: { applicationId, type },
  });

  if (app.assignedStaffId) {
    await pushNotification({
      recipientId: app.assignedStaffId,
      title: "New document uploaded",
      description: `${app.applicantName} uploaded ${type} for ${app.businessId}.`,
      type: "info",
      link: "/staff/documents",
    });
  }

  created(res, doc.toObject(), "Document uploaded");
}

export async function listDocuments(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized();
  const { applicationId, status } = req.query as Record<string, string | undefined>;
  const filter: Record<string, unknown> = {};

  if (applicationId) filter.applicationId = applicationId;
  if (status) filter.status = status;

  if (req.user.role === "client") {
    filter.ownerId = req.user.userId;
  } else if (req.user.role === "staff") {
    const apps = await ApplicationModel.find({ assignedStaffId: req.user.userId }).select("businessId");
    filter.applicationId = { $in: apps.map((a) => a.businessId) };
  }

  const docs = await DocumentItemModel.find(filter).sort({ createdAt: -1 });
  ok(res, docs);
}

export async function updateDocumentStatus(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized();
  const { businessId } = req.params;
  const { status, remarks } = req.body as { status: DocumentStatus; remarks?: string };

  const doc = await DocumentItemModel.findOne({ businessId });
  if (!doc) throw ApiError.notFound("Document not found");

  doc.status = status;
  if (remarks !== undefined) doc.remarks = remarks;
  doc.reviewedBy = req.user.userId;
  doc.reviewedAt = new Date();
  await doc.save();

  await pushNotification({
    recipientId: doc.ownerId,
    title: `Document ${doc.name} — ${status}`,
    description: remarks ?? `Status updated to ${status}.`,
    type: status === "Rejected" ? "error" : status === "Verified" ? "success" : "info",
    link: "/client/documents",
  });

  await recordActivity({
    actorId: req.user.userId,
    actorName: req.user.email,
    action: `document ${status.toLowerCase()}`,
    target: doc.businessId,
  });

  ok(res, doc.toObject(), "Document status updated");
}

export async function downloadDocument(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized();
  const { businessId } = req.params;
  const doc = await DocumentItemModel.findOne({ businessId });
  if (!doc) throw ApiError.notFound("Document not found");

  if (req.user.role === "client" && doc.ownerId !== req.user.userId) {
    throw ApiError.forbidden();
  }
  if (req.user.role === "staff") {
    const app = await ApplicationModel.findOne({ businessId: doc.applicationId });
    if (!app || app.assignedStaffId !== req.user.userId) throw ApiError.forbidden();
  }

  const filePath = path.join(UPLOAD_ROOT, doc.storagePath);
  if (!fs.existsSync(filePath)) throw ApiError.notFound("File missing on disk");

  res.download(filePath, doc.name);
}

export async function deleteDocument(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized();
  const { businessId } = req.params;
  const doc = await DocumentItemModel.findOne({ businessId });
  if (!doc) throw ApiError.notFound("Document not found");
  if (req.user.role === "client" && doc.ownerId !== req.user.userId) {
    throw ApiError.forbidden();
  }

  const filePath = path.join(UPLOAD_ROOT, doc.storagePath);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  await doc.deleteOne();

  const app = await ApplicationModel.findOne({ businessId: doc.applicationId });
  if (app) {
    app.documentsCount = await DocumentItemModel.countDocuments({ applicationId: app.businessId });
    await app.save();
  }

  ok(res, null, "Document deleted");
}
