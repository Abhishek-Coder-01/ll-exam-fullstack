import mongoose from "mongoose";
import { ApplicationModel } from "../models/Application.model";
import { TaskAssignmentLogModel } from "../models/TaskAssignmentLog.model";
import { UserModel } from "../models/User.model";
import { recordActivity } from "./activity.service";
import { pushNotification } from "./notification.service";

export type AssignmentType = "AUTO" | "MANUAL";

export function pickLeastActiveStaff(
  staff: Array<{ businessId: string; staffStatus?: string; availabilityStatus?: string; role?: string; name?: string }>,
  activeCounts: Record<string, number>,
): { businessId: string; name: string; staffStatus?: string; availabilityStatus?: string; role?: string } | undefined {
  const eligible = staff
    .map((member) => ({
      ...member,
      role: member.role ?? "staff",
      staffStatus: member.staffStatus ?? "Active",
      availabilityStatus: member.availabilityStatus ?? "Available",
      name: member.name ?? "Staff",
    }))
    .filter(
      (member) =>
        member.role === "staff" &&
        member.staffStatus === "Active" &&
        member.availabilityStatus === "Available",
    );

  if (eligible.length === 0) return undefined;

  return eligible.reduce(
    (best, current) => {
      const bestCount = activeCounts[best.businessId] ?? 0;
      const currentCount = activeCounts[current.businessId] ?? 0;
      return currentCount < bestCount ? current : best;
    },
    eligible[0],
  );
}

export async function findEligibleStaffForAssignment(teamLeaderId?: string) {
  const filter: Record<string, unknown> = {
    role: "staff",
    staffStatus: "Active",
    availabilityStatus: "Available",
  };

  if (teamLeaderId) {
    filter.teamLeaderId = teamLeaderId;
  }

  const staff = await UserModel.find(filter).lean();
  const activeCountsAgg = await ApplicationModel.aggregate([
    {
      $match: {
        assignedStaffId: { $in: staff.map((member) => member.businessId) },
        status: { $in: ["Assigned", "In Progress"] },
      },
    },
    { $group: { _id: "$assignedStaffId", count: { $sum: 1 } } },
  ]);

  const activeCounts = Object.fromEntries(
    activeCountsAgg.map((item) => [String(item._id), Number(item.count)]),
  );

  return pickLeastActiveStaff(staff, activeCounts);
}

export async function assignApplicationToAvailableStaff(params: {
  applicationId: string;
  assignmentType: AssignmentType;
  assignedBy: string;
  assignedByName: string;
  teamLeaderId?: string;
  notifyApplicant?: boolean;
}): Promise<{ assigned: boolean; staff?: { businessId: string; name: string }; application?: any }> {
  const { applicationId, assignmentType, assignedBy, assignedByName, teamLeaderId, notifyApplicant = true } = params;
  const session = await mongoose.startSession();

  try {
    let result: { assigned: boolean; staff?: { businessId: string; name: string }; application?: any } = { assigned: false };

    await session.withTransaction(async () => {
      const current = await ApplicationModel.findOne({ businessId: applicationId }).session(session);
      if (!current) {
        result = { assigned: false };
        return;
      }

      if (current.assignedStaffId) {
        result = {
          assigned: true,
          application: current,
          staff: { businessId: current.assignedStaffId, name: current.assignedStaffName ?? "Assigned staff" },
        };
        return;
      }

      const staff = await UserModel.find({
        ...(teamLeaderId ? { teamLeaderId } : {}),
        role: "staff",
        staffStatus: "Active",
        availabilityStatus: "Available",
      }).session(session);

      const activeCountsAgg = await ApplicationModel.aggregate([
        {
          $match: {
            assignedStaffId: { $in: staff.map((member) => member.businessId) },
            status: { $in: ["Assigned", "In Progress"] },
          },
        },
        { $group: { _id: "$assignedStaffId", count: { $sum: 1 } } },
      ]).session(session as any);

      const activeCounts = Object.fromEntries(
        activeCountsAgg.map((entry) => [String(entry._id), Number(entry.count)]),
      );
      const selectedStaff = pickLeastActiveStaff(staff, activeCounts);

      if (!selectedStaff) {
        current.status = "Waiting for Staff";
        current.updatedOn = new Date();
        await current.save({ session });
        result = { assigned: false, application: current };
        return;
      }

      const selectedStaffName = selectedStaff.name ?? "Staff";
      const previousStaffId = current.assignedStaffId;
      current.assignedStaffId = selectedStaff.businessId;
      current.assignedStaffName = selectedStaffName;
      current.status = "Assigned";
      current.updatedOn = new Date();
      await current.save({ session });

      await ApplicationModel.updateOne(
        { _id: current._id, assignedStaffId: { $exists: false } },
        { $set: { assignedStaffId: selectedStaff.businessId, assignedStaffName: selectedStaffName, status: "Assigned", updatedOn: new Date() } },
        { session },
      );

      await Promise.all([
        TaskAssignmentLogModel.create(
          [{
            taskId: current.businessId,
            previousStaffId,
            newStaffId: selectedStaff.businessId,
            assignedBy,
            assignmentType,
          }],
          { session },
        ),
        recordActivity({
          actorId: assignedBy,
          actorName: assignedByName,
          action: `${assignmentType === "AUTO" ? "Auto-assigned" : "Reassigned"} task to ${selectedStaff.businessId}`,
          target: current.businessId,
          meta: { assignedStaffId: selectedStaff.businessId, assignmentType },
        }),
      ]);

      await pushNotification({
        recipientId: selectedStaff.businessId,
        title: assignmentType === "AUTO" ? "New task assigned" : "Task reassigned",
        description: `Task ${current.businessId} has been ${assignmentType === "AUTO" ? "auto-assigned" : "reassigned"} to you.`,
        type: "info",
        link: "/staff/tasks",
      });

      if (notifyApplicant) {
        await pushNotification({
          recipientId: current.applicantId,
          title: `Task ${current.businessId} assigned`,
          description: `Your application has been assigned to ${selectedStaffName}.`,
          type: "info",
          link: "/client/tasks",
        });
      }

      result = {
        assigned: true,
        staff: { businessId: selectedStaff.businessId, name: selectedStaffName },
        application: current,
      };
    });

    return result;
  } finally {
    await session.endSession();
  }
}

export async function reconcileWaitingTasks(): Promise<void> {
  const waitingApplications = await ApplicationModel.find({ status: "Waiting for Staff" });
  for (const application of waitingApplications) {
    const assignment = await assignApplicationToAvailableStaff({
      applicationId: application.businessId,
      assignmentType: "AUTO",
      assignedBy: "system",
      assignedByName: "System",
      notifyApplicant: false,
    });
    if (assignment.assigned) {
      application.status = "Assigned";
    }
  }
}
