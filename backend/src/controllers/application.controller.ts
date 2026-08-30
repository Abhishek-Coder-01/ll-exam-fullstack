import type { Request, Response } from "express";
import { ApplicationModel } from "../models/Application.model";
import { UserModel } from "../models/User.model";
import { PaymentModel } from "../models/Payment.model";
import { ApiError } from "../utils/ApiError";
import { ok, created } from "../utils/ApiResponse";
import { generateApplicationId, generatePaymentId, generateInvoiceNo } from "../utils/idGenerator";
import { recordActivity } from "../services/activity.service";
import { pushNotification } from "../services/notification.service";
import type { ApplicationStatus } from "../types/domain";
import { assignApplicationToAvailableStaff } from "../services/taskAssignment.service";

const DEFAULT_FEES: Record<string, number> = {
  "Learner's License": 350,
  "Permanent License": 700,
  "Commercial License": 1200,
};

/* --------- Client: create own application --------- */
export async function createApplication(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized();
  const client = await UserModel.findOne({ businessId: req.user.userId, role: "client" });
  if (!client) throw ApiError.forbidden("Only clients can create applications");

  const { type, remarks } = req.body as { type: string; fee?: number; remarks?: string };
  const fee = (req.body as { fee?: number }).fee ?? DEFAULT_FEES[type] ?? 500;

  const app = await ApplicationModel.create({
    businessId: generateApplicationId(),
    applicantName: client.name,
    applicantId: client.businessId,
    type,
    status: "Submitted",
    submittedOn: new Date(),
    updatedOn: new Date(),
    documentsCount: 0,
    fee,
    remarks,
    assignedStaffId: client.assignedStaffId,
    assignedStaffName: client.assignedStaffId
      ? (await UserModel.findOne({ businessId: client.assignedStaffId }))?.name
      : undefined,
  });

  const assignment = await assignApplicationToAvailableStaff({
    applicationId: app.businessId,
    assignmentType: "AUTO",
    assignedBy: "system",
    assignedByName: "System",
  });

  if (assignment.assigned && assignment.application) {
    app.status = assignment.application.status;
    app.assignedStaffId = assignment.application.assignedStaffId;
    app.assignedStaffName = assignment.application.assignedStaffName;
    app.updatedOn = new Date();
  }

  // Auto-create a Pending payment row
  await PaymentModel.create({
    businessId: generatePaymentId(),
    applicationId: app.businessId,
    clientId: client.businessId,
    clientName: client.name,
    amount: fee,
    status: "Pending",
    method: "UPI",
    invoiceNo: generateInvoiceNo(),
    provider: "stub",
    date: new Date(),
  });

  await recordActivity({
    actorId: client.businessId,
    actorName: client.name,
    action: "submitted application",
    target: app.businessId,
  });

  // Notify assigned staff (if any) + all admins
  if (app.assignedStaffId) {
    await pushNotification({
      recipientId: app.assignedStaffId,
      title: "New application assigned",
      description: `${client.name} submitted a ${type} application.`,
      type: "info",
      link: "/staff/applications",
    });
  }
  const admins = await UserModel.find({ role: "admin" });
  await Promise.all(
    admins.map((a) =>
      pushNotification({
        recipientId: a.businessId,
        title: "New application submitted",
        description: `${client.name} submitted a ${type} application.`,
        type: "info",
        link: "/admin/applications",
      }),
    ),
  );

  created(res, app.toObject(), "Application created");
}

/* --------- List applications with role-scoped filter --------- */
export async function listApplications(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized();
  const { page = 1, limit = 20, search, status } = req.query as Record<string, string | undefined>;
  const filter: Record<string, unknown> = {};

  if (req.user.role === "client") filter.applicantId = req.user.userId;
  if (req.user.role === "staff") filter.assignedStaffId = req.user.userId;
  if (req.user.role === "team_leader") {
    const teamMemberIds = await UserModel.find({ role: "staff", teamLeaderId: req.user.userId }).distinct("businessId");
    filter.assignedStaffId = { $in: teamMemberIds };
  }

  if (status) filter.status = status;
  if (search) {
    filter.$or = [
      { businessId: { $regex: search, $options: "i" } },
      { applicantName: { $regex: search, $options: "i" } },
      { type: { $regex: search, $options: "i" } },
    ];
  }

  const p = Number(page);
  const l = Number(limit);
  const [items, total] = await Promise.all([
    ApplicationModel.find(filter).sort({ createdAt: -1 }).skip((p - 1) * l).limit(l),
    ApplicationModel.countDocuments(filter),
  ]);

  ok(res, items, "Applications list", 200, { total, page: p, limit: l });
}

/* --------- Single application --------- */
export async function getApplication(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized();
  const { businessId } = req.params;
  const app = await ApplicationModel.findOne({ businessId });
  if (!app) throw ApiError.notFound("Application not found");

  if (req.user.role === "client" && app.applicantId !== req.user.userId) {
    throw ApiError.forbidden("You cannot view this application");
  }
  if (req.user.role === "staff" && app.assignedStaffId !== req.user.userId) {
    throw ApiError.forbidden("This application is not assigned to you");
  }
  if (req.user.role === "team_leader") {
    const teamMemberIds = await UserModel.find({ role: "staff", teamLeaderId: req.user.userId }).distinct("businessId");
    if (!teamMemberIds.includes(app.assignedStaffId ?? "")) {
      throw ApiError.forbidden("This application is not assigned to your team");
    }
  }
  ok(res, app.toObject());
}

/* --------- Update / assign / status --------- */
export async function updateApplication(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized();
  const { businessId } = req.params;
  const app = await ApplicationModel.findOne({ businessId });
  if (!app) throw ApiError.notFound("Application not found");

  const patch = req.body as {
    status?: ApplicationStatus;
    assignedStaffId?: string;
    assignedStaffName?: string;
    remarks?: string;
    type?: string;
    fee?: number;
  };

  // Only admin/staff can change status; client can only update type/fee if still Submitted
  if (req.user.role === "client") {
    if (app.applicantId !== req.user.userId) throw ApiError.forbidden();
    if (app.status !== "Submitted") {
      throw ApiError.badRequest("Cannot edit an application after it has moved past Submitted");
    }
    if (patch.type) app.type = patch.type;
  } else {
    if (req.user.role === "team_leader") {
      const teamMemberIds = await UserModel.find({ role: "staff", teamLeaderId: req.user.userId }).distinct("businessId");
      if (patch.assignedStaffId && !teamMemberIds.includes(patch.assignedStaffId)) {
        throw ApiError.forbidden("You can only reassign tasks to your own team members");
      }
    }

    if (patch.status) app.status = patch.status;
    if (patch.assignedStaffId !== undefined) {
      const staff = await UserModel.findOne({ businessId: patch.assignedStaffId, role: "staff" });
      if (!staff) throw ApiError.notFound("Assignee staff not found");
      app.assignedStaffId = staff.businessId;
      app.assignedStaffName = staff.name;
      if (app.status === "Submitted") app.status = "Assigned Staff";
      await pushNotification({
        recipientId: staff.businessId,
        title: "Application assigned",
        description: `${app.applicantName}'s ${app.type} application has been assigned to you.`,
        type: "info",
        link: "/staff/applications",
      });
    }
    if (patch.remarks !== undefined) app.remarks = patch.remarks;
    if (patch.fee !== undefined) app.fee = patch.fee;
    if (patch.type) app.type = patch.type;
  }

  app.updatedOn = new Date();
  await app.save();

  // Notify applicant on status change
  if (patch.status) {
    await pushNotification({
      recipientId: app.applicantId,
      title: `Application ${app.businessId} — ${patch.status}`,
      description: `Your ${app.type} application status is now "${patch.status}".`,
      type:
        patch.status === "Rejected"
          ? "error"
          : patch.status === "Completed" || patch.status === "Approved"
            ? "success"
            : "info",
      link: "/client/applications",
    });
  }

  await recordActivity({
    actorId: req.user.userId,
    actorName: req.user.email,
    action: "updated application",
    target: app.businessId,
    meta: patch,
  });

  ok(res, app.toObject(), "Application updated");
}
