import type { Request, Response } from "express";
import { ChatThreadModel, ChatMessageModel } from "../models/Chat.model";
import { UserModel } from "../models/User.model";
import { ApiError } from "../utils/ApiError";
import { ok, created } from "../utils/ApiResponse";
import { generateThreadId, generateMessageId } from "../utils/idGenerator";
import { pushNotification } from "../services/notification.service";

export async function listThreads(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized();
  const filter: Record<string, unknown> = {};
  if (req.user.role === "staff") filter.staffId = req.user.userId;
  if (req.user.role === "client") filter.clientId = req.user.userId;

  const threads = await ChatThreadModel.find(filter).sort({ lastMessageAt: -1 });
  ok(res, threads);
}

export async function createOrGetThread(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized();
  const { clientId } = req.body as { clientId: string };
  const client = await UserModel.findOne({ businessId: clientId, role: "client" });
  if (!client) throw ApiError.notFound("Client not found");

  const staffId =
    req.user.role === "staff"
      ? req.user.userId
      : client.assignedStaffId ?? undefined;
  if (!staffId) {
    throw ApiError.badRequest(
      "This client has no staff assigned yet. Please ask an admin to assign a staff member.",
    );
  }
  const staff = await UserModel.findOne({ businessId: staffId, role: "staff" });
  if (!staff) throw ApiError.notFound("Staff not found");

  let thread = await ChatThreadModel.findOne({ clientId: client.businessId, staffId: staff.businessId });
  if (!thread) {
    thread = await ChatThreadModel.create({
      businessId: generateThreadId(),
      clientId: client.businessId,
      clientName: client.name,
      staffId: staff.businessId,
      staffName: staff.name,
      lastMessage: "",
      lastMessageAt: new Date(),
      unreadForStaff: 0,
      unreadForClient: 0,
    });
  }
  created(res, thread.toObject(), "Thread ready");
}

export async function listMessages(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized();
  const { businessId } = req.params;
  const thread = await ChatThreadModel.findOne({ businessId });
  if (!thread) throw ApiError.notFound("Thread not found");

  if (req.user.role === "client" && thread.clientId !== req.user.userId) throw ApiError.forbidden();
  if (req.user.role === "staff" && thread.staffId !== req.user.userId) throw ApiError.forbidden();

  const messages = await ChatMessageModel.find({ threadId: businessId }).sort({ createdAt: 1 });

  // Mark as read for the current viewer
  if (req.user.role === "staff" && thread.unreadForStaff > 0) {
    thread.unreadForStaff = 0;
    await thread.save();
  } else if (req.user.role === "client" && thread.unreadForClient > 0) {
    thread.unreadForClient = 0;
    await thread.save();
  }

  ok(res, messages);
}

export async function sendMessage(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized();
  const { threadId, message } = req.body as { threadId: string; message: string };
  const thread = await ChatThreadModel.findOne({ businessId: threadId });
  if (!thread) throw ApiError.notFound("Thread not found");

  if (req.user.role === "client" && thread.clientId !== req.user.userId) throw ApiError.forbidden();
  if (req.user.role === "staff" && thread.staffId !== req.user.userId) throw ApiError.forbidden();

  const sender = await UserModel.findOne({ businessId: req.user.userId });
  if (!sender) throw ApiError.notFound("Sender not found");

  const msg = await ChatMessageModel.create({
    businessId: generateMessageId(),
    threadId,
    senderId: sender.businessId,
    senderName: sender.name,
    senderRole: sender.role,
    message,
    readByRecipient: false,
  });

  thread.lastMessage = message;
  thread.lastMessageAt = new Date();
  if (sender.role === "client") {
    thread.unreadForStaff += 1;
    if (thread.staffId) {
      await pushNotification({
        recipientId: thread.staffId,
        title: `New message from ${sender.name}`,
        description: message.slice(0, 120),
        type: "info",
        link: "/staff/chat",
      });
    }
  } else if (sender.role === "staff") {
    thread.unreadForClient += 1;
    await pushNotification({
      recipientId: thread.clientId,
      title: `Message from ${sender.name}`,
      description: message.slice(0, 120),
      type: "info",
      link: "/client/notifications",
    });
  }
  await thread.save();

  created(res, msg.toObject(), "Message sent");
}
