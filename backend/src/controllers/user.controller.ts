import type { Request, Response } from "express";
import { UserModel } from "../models/User.model";
import { ApiError } from "../utils/ApiError";
import { ok } from "../utils/ApiResponse";
import { ApplicationModel } from "../models/Application.model";
import { PaymentModel } from "../models/Payment.model";
import { recordActivity } from "../services/activity.service";
import { pushNotification } from "../services/notification.service";

/* ----------------- Profile (self) ----------------- */

export async function updateProfile(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized();
  const user = await UserModel.findOne({ businessId: req.user.userId });
  if (!user) throw ApiError.notFound("User not found");

  const patch = req.body as {
    name?: string;
    avatarUrl?: string;
    department?: string;
    licenseType?: string;
  };
  if (patch.name) user.name = patch.name;
  if (patch.avatarUrl) user.avatarUrl = patch.avatarUrl;
  if (patch.department && user.role === "staff") user.department = patch.department;
  if (patch.licenseType && user.role === "client") user.licenseType = patch.licenseType;

  await user.save();
  ok(res, user.toPublicJSON(), "Profile updated");
}

/* ----------------- Staff management (admin) ----------------- */

export async function listStaff(req: Request, res: Response): Promise<void> {
  const { page = 1, limit = 20, search, status } = req.query as Record<string, string | undefined>;
  const filter: Record<string, unknown> = { role: "staff" };
  if (status) filter.staffStatus = status;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { businessId: { $regex: search, $options: "i" } },
      { department: { $regex: search, $options: "i" } },
    ];
  }
  const p = Number(page);
  const l = Number(limit);
  const [items, total] = await Promise.all([
    UserModel.find(filter)
      .sort({ createdAt: -1 })
      .skip((p - 1) * l)
      .limit(l),
    UserModel.countDocuments(filter),
  ]);

  // Attach light-weight aggregate stats so the /admin/staff table looks like the mock data
  const items2 = await Promise.all(
    items.map(async (u) => {
      const [assignedClients, completedApplications] = await Promise.all([
        UserModel.countDocuments({ role: "client", assignedStaffId: u.businessId }),
        ApplicationModel.countDocuments({
          assignedStaffId: u.businessId,
          status: { $in: ["Completed", "Approved"] },
        }),
      ]);
      return {
        ...u.toPublicJSON(),
        assignedClients,
        completedApplications,
      };
    }),
  );

  ok(res, items2, "Staff list", 200, { total, page: p, limit: l });
}

export async function updateStaffStatus(req: Request, res: Response): Promise<void> {
  const { businessId } = req.params;
  const { staffStatus } = req.body as { staffStatus: string };
  const staff = await UserModel.findOne({ businessId, role: "staff" });
  if (!staff) throw ApiError.notFound("Staff not found");

  staff.staffStatus = staffStatus as typeof staff.staffStatus;
  await staff.save();

  await recordActivity({
    actorId: req.user?.userId ?? "system",
    actorName: req.user?.email ?? "system",
    action: `updated staff status to ${staffStatus}`,
    target: staff.businessId,
  });

  await pushNotification({
    recipientId: staff.businessId,
    title: `Your account is now ${staffStatus}`,
    description:
      staffStatus === "Approved"
        ? "You can now log in and start managing applications."
        : `Your staff account status has been changed to ${staffStatus}.`,
    type: staffStatus === "Approved" ? "success" : "info",
  });

  ok(res, staff.toPublicJSON(), "Staff status updated");
}

/* ----------------- Client management (admin) ----------------- */

export async function listClients(req: Request, res: Response): Promise<void> {
  const { page = 1, limit = 20, search, status } = req.query as Record<string, string | undefined>;
  const filter: Record<string, unknown> = { role: "client" };
  if (status) filter.clientStatus = status;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { phone: { $regex: search, $options: "i" } },
      { businessId: { $regex: search, $options: "i" } },
    ];
  }
  const p = Number(page);
  const l = Number(limit);
  const [items, total] = await Promise.all([
    UserModel.find(filter)
      .sort({ createdAt: -1 })
      .skip((p - 1) * l)
      .limit(l),
    UserModel.countDocuments(filter),
  ]);

  const items2 = await Promise.all(
    items.map(async (u) => {
      const applications = await ApplicationModel.countDocuments({ applicantId: u.businessId });
      let assignedStaffName: string | undefined;
      if (u.assignedStaffId) {
        const staff = await UserModel.findOne({ businessId: u.assignedStaffId });
        assignedStaffName = staff?.name;
      }
      return { ...u.toPublicJSON(), applications, assignedStaff: assignedStaffName };
    }),
  );

  ok(res, items2, "Clients list", 200, { total, page: p, limit: l });
}

export async function assignStaffToClient(req: Request, res: Response): Promise<void> {
  const { businessId } = req.params;
  const { staffId } = req.body as { staffId: string };
  const client = await UserModel.findOne({ businessId, role: "client" });
  if (!client) throw ApiError.notFound("Client not found");
  const staff = await UserModel.findOne({ businessId: staffId, role: "staff" });
  if (!staff) throw ApiError.notFound("Staff not found");
  client.assignedStaffId = staff.businessId;
  await client.save();

  await pushNotification({
    recipientId: staff.businessId,
    title: "New client assigned",
    description: `${client.name} is now assigned to you.`,
    type: "info",
    link: "/staff/clients",
  });

  ok(res, client.toPublicJSON(), "Staff assigned to client");
}

/* ----------------- Staff view: assigned clients ----------------- */

export async function listAssignedClients(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized();
  const clients = await UserModel.find({ role: "client", assignedStaffId: req.user.userId });
  const items = await Promise.all(
    clients.map(async (u) => ({
      ...u.toPublicJSON(),
      applications: await ApplicationModel.countDocuments({ applicantId: u.businessId }),
    })),
  );
  ok(res, items);
}

/* ----------------- Admin: dashboard stats ----------------- */

export async function adminStats(_req: Request, res: Response): Promise<void> {
  const [
    totalClients,
    totalStaff,
    pendingStaff,
    totalApplications,
    completedApplications,
    pendingPayments,
    totalRevenueAgg,
  ] = await Promise.all([
    UserModel.countDocuments({ role: "client" }),
    UserModel.countDocuments({ role: "staff" }),
    UserModel.countDocuments({ role: "staff", staffStatus: "Pending" }),
    ApplicationModel.countDocuments({}),
    ApplicationModel.countDocuments({ status: { $in: ["Completed", "Approved"] } }),
    PaymentModel.countDocuments({ status: "Pending" }),
    PaymentModel.aggregate([
      { $match: { status: { $in: ["Completed", "Verified"] } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
  ]);

  const totalRevenue = totalRevenueAgg[0]?.total ?? 0;

  ok(res, {
    totalClients,
    totalStaff,
    pendingStaff,
    totalApplications,
    completedApplications,
    pendingPayments,
    totalRevenue,
  });
}
