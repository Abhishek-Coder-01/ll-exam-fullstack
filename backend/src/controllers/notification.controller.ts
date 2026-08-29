import type { Request, Response } from "express";
import { NotificationModel } from "../models/Notification.model";
import { ApiError } from "../utils/ApiError";
import { ok } from "../utils/ApiResponse";

export async function listNotifications(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized();
  const { page = 1, limit = 20, unreadOnly } = req.query as Record<string, string | undefined>;
  const filter: Record<string, unknown> = { recipientId: req.user.userId };
  if (unreadOnly === "true") filter.read = false;
  const p = Number(page);
  const l = Number(limit);
  const [items, total, unreadCount] = await Promise.all([
    NotificationModel.find(filter).sort({ createdAt: -1 }).skip((p - 1) * l).limit(l),
    NotificationModel.countDocuments(filter),
    NotificationModel.countDocuments({ recipientId: req.user.userId, read: false }),
  ]);
  ok(res, items, "Notifications", 200, { total, page: p, limit: l, unreadCount });
}

export async function markAsRead(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized();
  const { businessId } = req.params;
  const n = await NotificationModel.findOne({ businessId, recipientId: req.user.userId });
  if (!n) throw ApiError.notFound("Notification not found");
  n.read = true;
  await n.save();
  ok(res, n.toObject(), "Marked as read");
}

export async function markAllRead(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized();
  const result = await NotificationModel.updateMany(
    { recipientId: req.user.userId, read: false },
    { $set: { read: true } },
  );
  ok(res, { modified: result.modifiedCount }, "All notifications marked as read");
}

export async function deleteNotification(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized();
  const { businessId } = req.params;
  const n = await NotificationModel.findOne({ businessId, recipientId: req.user.userId });
  if (!n) throw ApiError.notFound("Notification not found");
  await n.deleteOne();
  ok(res, null, "Notification deleted");
}

export async function deleteManyNotifications(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized();
  const { businessIds } = req.body as { businessIds?: string[] };

  const filter: Record<string, unknown> = { recipientId: req.user.userId };
  if (businessIds && businessIds.length > 0) {
    filter.businessId = { $in: businessIds };
  }

  const result = await NotificationModel.deleteMany(filter);
  ok(res, { deleted: result.deletedCount }, `${result.deletedCount} notification(s) deleted`);
}