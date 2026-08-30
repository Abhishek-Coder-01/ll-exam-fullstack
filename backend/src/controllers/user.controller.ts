import type { Request, Response } from "express";
import { UserModel } from "../models/User.model";
import { ApiError } from "../utils/ApiError";
import { ok } from "../utils/ApiResponse";
import { ApplicationModel } from "../models/Application.model";
import { PaymentModel } from "../models/Payment.model";
import { recordActivity } from "../services/activity.service";
import { pushNotification } from "../services/notification.service";
import { generateTeamLeaderId } from "../utils/idGenerator";

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

/* ----------------- Team leader management (admin) ----------------- */

export async function listTeamLeaders(req: Request, res: Response): Promise<void> {
  const { page = 1, limit = 20, search } = req.query as Record<string, string | undefined>;
  const filter: Record<string, unknown> = { role: "team_leader" };
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { businessId: { $regex: search, $options: "i" } },
    ];
  }

  const p = Number(page);
  const l = Number(limit);
  const [items, total] = await Promise.all([
    UserModel.find(filter).sort({ createdAt: -1 }).skip((p - 1) * l).limit(l),
    UserModel.countDocuments(filter),
  ]);

  const enriched = await Promise.all(
    items.map(async (user) => {
      const teamMembers = await UserModel.find({ role: "staff", teamLeaderId: user.businessId });
      const activeTasks = await ApplicationModel.countDocuments({
        assignedStaffId: { $in: teamMembers.map((member) => member.businessId) },
        status: { $in: ["Assigned", "In Progress"] },
      });
      return { ...user.toPublicJSON(), teamMemberCount: teamMembers.length, activeTasks };
    }),
  );

  ok(res, enriched, "Team leaders list", 200, { total, page: p, limit: l });
}

export async function createTeamLeader(req: Request, res: Response): Promise<void> {
  const { name, email, phone, password, department } = req.body as {
    name: string;
    email: string;
    phone: string;
    password: string;
    department?: string;
  };

  const existing = await UserModel.findOne({ $or: [{ email }, { phone }] });
  if (existing) {
    if (existing.phone === phone) throw ApiError.conflict("Mobile number already registered");
    throw ApiError.conflict("Email already registered");
  }

  const teamLeader = await UserModel.create({
    businessId: generateTeamLeaderId(),
    name,
    email,
    phone,
    password,
    role: "team_leader",
    department: department ?? "Licensing",
    staffStatus: "Active",
    availabilityStatus: "Available",
    isPhoneVerified: true,
    isEmailVerified: false,
  });

  await recordActivity({
    actorId: req.user?.userId ?? "system",
    actorName: req.user?.email ?? "system",
    action: "created team leader",
    target: teamLeader.businessId,
  });

  ok(res, teamLeader.toPublicJSON(), "Team leader created successfully");
}

export async function updateTeamLeader(req: Request, res: Response): Promise<void> {
  const { businessId } = req.params;
  const { name, email, phone, department } = req.body as {
    name?: string;
    email?: string;
    phone?: string;
    department?: string;
  };

  const teamLeader = await UserModel.findOne({ businessId, role: "team_leader" });
  if (!teamLeader) throw ApiError.notFound("Team leader not found");

  if (name) teamLeader.name = name;
  if (email) teamLeader.email = email;
  if (phone) teamLeader.phone = phone;
  if (department) teamLeader.department = department;

  await teamLeader.save();
  ok(res, teamLeader.toPublicJSON(), "Team leader updated");
}

export async function toggleTeamLeaderActive(req: Request, res: Response): Promise<void> {
  const { businessId } = req.params;
  const { active } = req.body as { active?: boolean };
  const teamLeader = await UserModel.findOne({ businessId, role: "team_leader" });
  if (!teamLeader) throw ApiError.notFound("Team leader not found");

  teamLeader.staffStatus = active === false ? "Inactive" : "Active";
  teamLeader.availabilityStatus = active === false ? "Offline" : "Available";
  await teamLeader.save();

  ok(res, teamLeader.toPublicJSON(), "Team leader activity updated");
}

export async function assignStaffToTeamLeader(req: Request, res: Response): Promise<void> {
  const { businessId } = req.params;
  const { staffId } = req.body as { staffId: string };

  const teamLeader = await UserModel.findOne({ businessId, role: "team_leader" });
  if (!teamLeader) throw ApiError.notFound("Team leader not found");

  const staff = await UserModel.findOne({ businessId: staffId, role: "staff" });
  if (!staff) throw ApiError.notFound("Staff not found");

  staff.teamLeaderId = teamLeader.businessId;
  await staff.save();

  ok(res, staff.toPublicJSON(), "Staff assigned to team leader");
}

export async function removeStaffFromTeamLeader(req: Request, res: Response): Promise<void> {
  const { businessId } = req.params;
  const { staffId } = req.body as { staffId: string };

  const teamLeader = await UserModel.findOne({ businessId, role: "team_leader" });
  if (!teamLeader) throw ApiError.notFound("Team leader not found");

  const staff = await UserModel.findOne({ businessId: staffId, role: "staff", teamLeaderId: teamLeader.businessId });
  if (!staff) throw ApiError.notFound("Staff not assigned to this team leader");

  staff.teamLeaderId = undefined;
  await staff.save();

  ok(res, staff.toPublicJSON(), "Staff removed from team leader");
}

export async function deleteTeamLeader(req: Request, res: Response): Promise<void> {
  const { businessId } = req.params;

  const teamLeader = await UserModel.findOne({ businessId, role: "team_leader" });
  if (!teamLeader) throw ApiError.notFound("Team leader not found");

  // Remove team leader assignment from all assigned staff
  await UserModel.updateMany({ teamLeaderId: teamLeader.businessId }, { $unset: { teamLeaderId: "" } });

  // Delete the team leader
  await UserModel.deleteOne({ businessId, role: "team_leader" });

  ok(res, null, "Team leader deleted successfully");
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

  let staffIds: string[] = [];
  if (req.user.role === "staff") {
    staffIds = [req.user.userId];
  } else if (req.user.role === "team_leader") {
    const teamMembers = await UserModel.find({ role: "staff", teamLeaderId: req.user.userId }).lean();
    staffIds = teamMembers.map((member) => member.businessId);
  }

  const clients = await UserModel.find({
    role: "client",
    assignedStaffId: { $in: staffIds.length ? staffIds : ["__none__"] },
  });

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
