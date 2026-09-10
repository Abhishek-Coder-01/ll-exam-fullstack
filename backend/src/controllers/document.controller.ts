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
import { parsePagination } from "../utils/pagination";

const MAX_DOCUMENTS_PER_APPLICATION = 3;

export async function uploadDocument(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized();
  if (!req.file) throw ApiError.badRequest("No file uploaded");

  const { applicationId, type } = req.body as { applicationId: string; type: string };
  const uploadedPath = path.resolve(UPLOAD_ROOT, req.file.filename);
  const removeUploadedFile = () => {
    try {
      if (uploadedPath.startsWith(`${UPLOAD_ROOT}${path.sep}`) && fs.existsSync(uploadedPath)) {
        fs.unlinkSync(uploadedPath);
      }
    } catch {
      // Preserve the original request error if cleanup itself fails.
    }
  };
  const app = await ApplicationModel.findOne({ businessId: applicationId });
  if (!app) {
    removeUploadedFile();
    throw ApiError.notFound("Application not found");
  }

  if (req.user.role === "client" && app.applicantId !== req.user.userId) {
    removeUploadedFile();
    throw ApiError.forbidden("You cannot upload documents for this application");
  }
  if (req.user.role === "staff" && app.assignedStaffId !== req.user.userId) {
    removeUploadedFile();
    throw ApiError.forbidden("This application is not assigned to you");
  }

  const existingDocumentCount = await DocumentItemModel.countDocuments({ applicationId });
  if (existingDocumentCount >= MAX_DOCUMENTS_PER_APPLICATION) {
    removeUploadedFile();
    throw ApiError.badRequest(
      `Maximum ${MAX_DOCUMENTS_PER_APPLICATION} documents are allowed for one application`,
    );
  }

  let doc;
  try {
    doc = await DocumentItemModel.create({
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
  } catch (err) {
    removeUploadedFile();
    throw err;
  }
  res.locals.uploadPersisted = true;

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
  const { applicationId, status, page = "1", limit = "20" } = req.query as Record<string, string | undefined>;
  const filter: Record<string, unknown> = {};

  if (applicationId) filter.applicationId = applicationId;
  if (status) filter.status = status;

  if (req.user.role === "client") {
    filter.ownerId = req.user.userId;
  } else if (req.user.role === "staff") {
    const apps = await ApplicationModel.find({ assignedStaffId: req.user.userId }).select("businessId");
    filter.applicationId = { $in: apps.map((a) => a.businessId) };
  }

  const { page: p, limit: l, skip } = parsePagination(page, limit);
  const [docs, total] = await Promise.all([
    DocumentItemModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(l).lean(),
    DocumentItemModel.countDocuments(filter),
  ]);
  const applicationIds = [...new Set(docs.map((doc) => doc.applicationId))];
  const applications = applicationIds.length
    ? await ApplicationModel.find({ businessId: { $in: applicationIds } })
        .select("businessId applicantName type")
        .lean()
    : [];
  const applicationById = new Map(applications.map((app) => [app.businessId, app]));
  const enrichedDocs = docs.map((doc) => {
    const application = applicationById.get(doc.applicationId);
    return {
      ...doc,
      applicantName: application?.applicantName,
      applicationType: application?.type,
    };
  });
  ok(res, enrichedDocs, "Documents", 200, { total, page: p, limit: l });
}

export async function updateDocumentStatus(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized();
  const { businessId } = req.params;
  const { status, remarks } = req.body as { status: DocumentStatus; remarks?: string };

  const doc = await DocumentItemModel.findOne({ businessId });
  if (!doc) throw ApiError.notFound("Document not found");

  if (req.user.role === "staff") {
    const app = await ApplicationModel.findOne({ businessId: doc.applicationId });
    if (!app || app.assignedStaffId !== req.user.userId) throw ApiError.forbidden();
  }

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
  const filePath = path.resolve(UPLOAD_ROOT, doc.storagePath);
  if (!filePath.startsWith(`${UPLOAD_ROOT}${path.sep}`)) {
    throw ApiError.badRequest("Invalid document path");
  }
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
  if (req.user.role === "staff") {
    const app = await ApplicationModel.findOne({ businessId: doc.applicationId });
    if (!app || app.assignedStaffId !== req.user.userId) throw ApiError.forbidden();
  }

  const filePath = path.resolve(UPLOAD_ROOT, doc.storagePath);
  if (!filePath.startsWith(`${UPLOAD_ROOT}${path.sep}`)) {
    throw ApiError.badRequest("Invalid document path");
  }
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  await doc.deleteOne();

  const app = await ApplicationModel.findOne({ businessId: doc.applicationId });
  if (app) {
    app.documentsCount = await DocumentItemModel.countDocuments({ applicationId: app.businessId });
    await app.save();
  }

  ok(res, null, "Document deleted");
}
