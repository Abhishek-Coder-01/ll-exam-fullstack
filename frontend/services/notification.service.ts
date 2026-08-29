import { api } from "./api";
import type { Notification } from "@/types";

interface RawNotification {
  businessId: string;
  recipientId: string;
  title: string;
  description: string;
  type: Notification["type"];
  read: boolean;
  link?: string;
  createdAt: string;
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr${h > 1 ? "s" : ""} ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} day${d > 1 ? "s" : ""} ago`;
  return new Date(iso).toLocaleDateString();
}

function toNotification(n: RawNotification): Notification & { link?: string } {
  return {
    id: n.businessId,
    title: n.title,
    description: n.description,
    time: timeAgo(n.createdAt),
    read: n.read,
    type: n.type,
    link: n.link,
  };
}

export async function listNotifications(params: {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
} = {}) {
  const { data, meta } = await api.get<RawNotification[]>("/notifications", {
    query: {
      page: params.page,
      limit: params.limit,
      unreadOnly: params.unreadOnly ? "true" : undefined,
    },
  });
  return {
    items: data.map(toNotification),
    total: Number(meta?.total ?? data.length),
    unreadCount: Number(meta?.unreadCount ?? data.filter((n) => !n.read).length),
  };
}

export async function markAsRead(businessId: string) {
  const { data } = await api.patch<RawNotification>(`/notifications/${businessId}/read`);
  return toNotification(data);
}

export async function markAllRead() {
  const { data } = await api.patch<{ modified: number }>("/notifications/read-all");
  return data.modified;
}

export async function deleteNotification(businessId: string) {
  await api.delete(`/notifications/${businessId}`);
}

export async function deleteNotifications(businessIds?: string[]) {
  const { data } = await api.delete<{ deleted: number }>(
    "/notifications/clear-all",
    businessIds && businessIds.length > 0 ? { businessIds } : undefined,
  );
  return data.deleted;
}