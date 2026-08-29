import { api } from "./api";
import type { ChatMessage, ChatThread, Role } from "@/types";

interface RawThread {
  businessId: string;
  clientId: string;
  clientName: string;
  staffId?: string;
  staffName?: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadForStaff: number;
  unreadForClient: number;
}

interface RawMessage {
  businessId: string;
  threadId: string;
  senderId: string;
  senderName: string;
  senderRole: Role;
  message: string;
  readByRecipient: boolean;
  createdAt: string;
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  if (isToday) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString();
}

export function toThread(t: RawThread, viewerRole: Role): ChatThread & {
  clientId: string;
  staffId?: string;
} {
  const unread = viewerRole === "staff" ? t.unreadForStaff : t.unreadForClient;
  const displayName = viewerRole === "client" ? (t.staffName ?? "Support") : t.clientName;
  return {
    id: t.businessId,
    clientName: displayName,
    lastMessage: t.lastMessage || "No messages yet",
    time: fmtTime(t.lastMessageAt),
    unread,
    clientId: t.clientId,
    staffId: t.staffId,
  };
}

function toMessage(m: RawMessage, selfId: string): ChatMessage {
  return {
    id: m.businessId,
    sender: m.senderName,
    senderRole: m.senderRole,
    message: m.message,
    time: fmtTime(m.createdAt),
    isOwn: m.senderId === selfId,
  };
}

export async function listThreads(viewerRole: Role) {
  const { data } = await api.get<RawThread[]>("/chat/threads");
  return data.map((t) => toThread(t, viewerRole));
}

export async function createOrGetThread(clientId: string, viewerRole: Role) {
  const { data } = await api.post<RawThread>("/chat/threads", { clientId });
  return toThread(data, viewerRole);
}

export async function listMessages(threadBusinessId: string, selfBusinessId: string) {
  const { data } = await api.get<RawMessage[]>(`/chat/threads/${threadBusinessId}/messages`);
  return data.map((m) => toMessage(m, selfBusinessId));
}

export async function sendMessage(threadId: string, message: string, selfBusinessId: string) {
  const { data } = await api.post<RawMessage>("/chat/messages", { threadId, message });
  return toMessage(data, selfBusinessId);
}
