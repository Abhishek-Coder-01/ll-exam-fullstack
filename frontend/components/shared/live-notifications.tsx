"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { NotificationList } from "@/components/shared/notification-list";
import { notificationService, ApiError } from "@/services";
import type { Notification } from "@/types";

export function LiveNotifications() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ─── Fetch ──────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    try {
      const res = await notificationService.listNotifications({ limit: 50 });
      setItems(res.items);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // ─── Handlers (optimistic + rollback) ───────────────────────────────────────

  /** Toggle a single notification's read state. */
  const handleToggleRead = async (id: string, read: boolean) => {
    const prev = items;
    setItems((cur) => cur.map((n) => (n.id === id ? { ...n, read } : n)));
    try {
      await notificationService.markAsRead(id);
    } catch {
      setItems(prev); // rollback
    }
  };

  /** Mark all notifications as read. */
  const handleMarkAllRead = async () => {
    const prev = items;
    setItems((cur) => cur.map((n) => ({ ...n, read: true })));
    try {
      await notificationService.markAllRead();
    } catch {
      setItems(prev); // rollback
    }
  };

  /** Delete a single notification. */
  const handleDeleteOne = async (id: string) => {
    const prev = items;
    setItems((cur) => cur.filter((n) => n.id !== id));
    try {
      await notificationService.deleteNotification(id);
    } catch {
      setItems(prev); // rollback
    }
  };

  /** Delete multiple selected notifications. */
  const handleDeleteMany = async (ids: string[]) => {
    const prev = items;
    setItems((cur) => cur.filter((n) => !ids.includes(n.id)));
    try {
      await notificationService.deleteNotifications(ids);
    } catch {
      setItems(prev); // rollback
    }
  };

  /** Delete all notifications (clear all). */
  const handleClearAll = async () => {
    const prev = items;
    setItems([]);
    try {
      await notificationService.deleteNotifications(); // no ids = clear all
    } catch {
      setItems(prev); // rollback
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <p className="py-6 text-center text-sm text-destructive">{error}</p>
    );
  }

  return (
    <NotificationList
      notifications={items}
      onDeleteOne={handleDeleteOne}
      onDeleteMany={handleDeleteMany}
      onClearAll={handleClearAll}
      onToggleRead={handleToggleRead}
      onMarkAllRead={handleMarkAllRead}
    />
  );
}
