import { Schema, model, type Document, type Model } from "mongoose";
import type { Role } from "../types/domain";

export interface IChatThread extends Document {
  businessId: string; // THR-1
  clientId: string;
  clientName: string;
  staffId?: string;
  staffName?: string;
  lastMessage: string;
  lastMessageAt: Date;
  unreadForStaff: number;
  unreadForClient: number;
  createdAt: Date;
  updatedAt: Date;
}

const threadSchema = new Schema<IChatThread>(
  {
    businessId: { type: String, required: true, unique: true, index: true },
    clientId: { type: String, required: true, index: true },
    clientName: { type: String, required: true },
    staffId: { type: String, index: true },
    staffName: { type: String },
    lastMessage: { type: String, default: "" },
    lastMessageAt: { type: Date, default: Date.now },
    unreadForStaff: { type: Number, default: 0 },
    unreadForClient: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const ChatThreadModel: Model<IChatThread> = model<IChatThread>(
  "ChatThread",
  threadSchema,
);

export interface IChatMessage extends Document {
  businessId: string; // MSG-1
  threadId: string; // -> ChatThread.businessId
  senderId: string;
  senderName: string;
  senderRole: Role;
  message: string;
  readByRecipient: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IChatMessage>(
  {
    businessId: { type: String, required: true, unique: true, index: true },
    threadId: { type: String, required: true, index: true },
    senderId: { type: String, required: true },
    senderName: { type: String, required: true },
    senderRole: { type: String, required: true, enum: ["admin", "staff", "client"] },
    message: { type: String, required: true },
    readByRecipient: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const ChatMessageModel: Model<IChatMessage> = model<IChatMessage>(
  "ChatMessage",
  messageSchema,
);
