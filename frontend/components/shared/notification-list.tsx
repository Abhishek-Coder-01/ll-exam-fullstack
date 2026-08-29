"use client";

import { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Info,
  TriangleAlert,
  Bell,
  Check,
  Trash2,
  X,
  Eye,
  EyeOff,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/states";
import { cn } from "@/lib/utils";
import type { Notification } from "@/types";

// ─── Icon / colour maps ───────────────────────────────────────────────────────

const iconByType: Record<Notification["type"], React.ElementType> = {
  info: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
  error: AlertCircle,
};

const iconBgByType: Record<Notification["type"], string> = {
  info: "bg-primary-50 text-primary-600 dark:bg-primary-950/30 dark:text-primary-400",
  success: "bg-success/10 text-success dark:bg-success/20",
  warning: "bg-warning/15 text-warning-foreground dark:bg-warning/20",
  error: "bg-destructive/10 text-destructive dark:bg-destructive/20",
};

const typePillByType: Record<Notification["type"], string> = {
  info: "bg-primary-50 text-primary-700 ring-1 ring-primary-200 dark:bg-primary-950/30 dark:text-primary-300 dark:ring-primary-800/50",
  success: "bg-success/10 text-success ring-1 ring-success/20",
  warning: "bg-warning/10 text-warning-foreground ring-1 ring-warning/30",
  error: "bg-destructive/10 text-destructive ring-1 ring-destructive/20",
};

const typeLabelByType: Record<Notification["type"], string> = {
  info: "Info",
  success: "Success",
  warning: "Warning",
  error: "Error",
};

const accentBorderByType: Record<Notification["type"], string> = {
  info: "border-l-primary-400",
  success: "border-l-success",
  warning: "border-l-warning",
  error: "border-l-destructive",
};

// ─── Filter tabs ─────────────────────────────────────────────────────────────

type FilterTab = "all" | "unread" | "read";

// ─── Props ───────────────────────────────────────────────────────────────────

interface NotificationListProps {
  notifications: Notification[];
  /** Called with a single id when user clicks the per-item delete button. */
  onDeleteOne?: (id: string) => void;
  /** Called with an array of selected ids when user clicks "Delete selected". */
  onDeleteMany?: (ids: string[]) => void;
  /** Called when user confirms "Clear All". */
  onClearAll?: () => void;
  /** Called with a single id to toggle read state (locally or via API). */
  onToggleRead?: (id: string, read: boolean) => void;
  /** Called to mark all items as read. */
  onMarkAllRead?: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function NotificationList({
  notifications,
  onDeleteOne,
  onDeleteMany,
  onClearAll,
  onToggleRead,
  onMarkAllRead,
}: NotificationListProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  // ─── Derived values ────────────────────────────────────────────────────────

  const unreadCount = notifications.filter((n) => !n.read).length;

  const filteredItems =
    activeTab === "unread"
      ? notifications.filter((n) => !n.read)
      : activeTab === "read"
      ? notifications.filter((n) => n.read)
      : notifications;

  const allFilteredSelected =
    filteredItems.length > 0 && filteredItems.every((n) => selectedIds.includes(n.id));
  const someFilteredSelected =
    filteredItems.some((n) => selectedIds.includes(n.id)) && !allFilteredSelected;

  const selectedCount = selectedIds.filter((id) => filteredItems.some((n) => n.id === id)).length;

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedIds((prev) => prev.filter((id) => !filteredItems.some((n) => n.id === id)));
    } else {
      const newIds = filteredItems.map((n) => n.id);
      setSelectedIds((prev) => Array.from(new Set([...prev, ...newIds])));
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
    );
  };

  const handleDeleteSelected = () => {
    if (onDeleteMany) onDeleteMany(selectedIds);
    setSelectedIds([]);
  };

  const handleMarkReadSelected = () => {
    const unreadSelected = selectedIds.filter((id) => {
      const n = notifications.find((x) => x.id === id);
      return n && !n.read;
    });
    unreadSelected.forEach((id) => onToggleRead?.(id, true));
    setSelectedIds([]);
  };

  const handleClearAll = () => {
    onClearAll?.();
    setSelectedIds([]);
    setConfirmClearAll(false);
  };

  // ─── Empty state ───────────────────────────────────────────────────────────

  if (notifications.length === 0) {
    return (
      <EmptyState
        icon={Bell}
        title="You're all caught up"
        description="New notifications will appear here."
      />
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* ── Filter Tabs ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 border-b border-border pb-3">
        {(
          [
            { key: "all", label: "All", count: notifications.length },
            { key: "unread", label: "Unread", count: unreadCount },
            { key: "read", label: "Read", count: notifications.length - unreadCount },
          ] as { key: FilterTab; label: string; count: number }[]
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key);
              setSelectedIds([]);
              setConfirmClearAll(false);
            }}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              activeTab === tab.key
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            {tab.label}
            <span
              className={cn(
                "inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-xs leading-none font-semibold tabular-nums min-w-[18px]",
                activeTab === tab.key
                  ? "bg-white/20 text-white"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* ── Control Bar ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">

        {/* Left: Select All checkbox */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleSelectAll}
            className={cn(
              "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              allFilteredSelected
                ? "bg-primary border-primary text-primary-foreground"
                : someFilteredSelected
                ? "bg-primary/20 border-primary"
                : "border-input hover:border-primary bg-background"
            )}
            aria-label="Select all notifications"
          >
            {allFilteredSelected ? (
              <Check className="h-3 w-3 stroke-[3]" />
            ) : someFilteredSelected ? (
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            ) : null}
          </button>
          <span className="text-sm text-muted-foreground select-none">
            {selectedCount > 0 ? (
              <span className="font-medium text-foreground">
                {selectedCount} of {filteredItems.length} selected
              </span>
            ) : (
              "Select All"
            )}
          </span>
        </div>

        {/* Right: Action buttons */}
        <div className="flex items-center gap-2">
          {selectedCount > 0 ? (
            <>
              {onToggleRead && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMarkReadSelected}
                  className="h-8 px-3 text-xs flex items-center gap-1.5"
                >
                  <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                  Mark Read
                </Button>
              )}
              {onDeleteMany && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDeleteSelected}
                  className="h-8 px-3 text-xs flex items-center gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/5 hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete ({selectedCount})
                </Button>
              )}
            </>
          ) : confirmClearAll ? (
            /* ── Inline "Are you sure?" confirmation ── */
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />
              <span className="text-xs text-destructive font-medium">Clear all notifications?</span>
              <div className="flex items-center gap-1.5 ml-1">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleClearAll}
                  className="h-6 px-2.5 text-xs"
                >
                  Clear All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmClearAll(false)}
                  className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              {onMarkAllRead && unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onMarkAllRead}
                  className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground hover:bg-muted flex items-center gap-1.5 transition-colors"
                >
                  <EyeOff className="h-3.5 w-3.5" />
                  Mark All Read
                </Button>
              )}
              {onClearAll && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmClearAll(true)}
                  className="h-8 px-3 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/5 flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear All
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Notification Items (or filtered empty state) ─────────────────── */}
      {filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-secondary/30 px-6 py-12 text-center">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary-50">
            <Bell className="h-5 w-5 text-primary-600" />
          </div>
          <p className="text-sm font-medium text-foreground">
            No {activeTab !== "all" ? activeTab : ""} notifications
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {activeTab === "unread"
              ? "You've read all your notifications."
              : activeTab === "read"
              ? "No notifications have been read yet."
              : "Nothing to show."}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredItems.map((n) => {
            const Icon = iconByType[n.type];
            const isSelected = selectedIds.includes(n.id);
            return (
              <Card
                key={n.id}
                className={cn(
                  "group relative overflow-hidden border-l-4 transition-all duration-200",
                  "hover:shadow-md hover:-translate-y-px",
                  n.read ? "border-l-transparent" : accentBorderByType[n.type],
                  isSelected && "ring-2 ring-primary/30 ring-offset-1"
                )}
              >
                <CardContent className="flex items-start gap-3 p-4">

                  {/* Checkbox */}
                  <div className="pt-0.5 flex-shrink-0">
                    <button
                      onClick={() => handleSelectOne(n.id)}
                      className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                        isSelected
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-input hover:border-primary bg-background"
                      )}
                      aria-label="Select notification"
                    >
                      {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                    </button>
                  </div>

                  {/* Icon */}
                  <div
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                      iconBgByType[n.type]
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1 pr-16">
                    {/* Title row */}
                    <div className="flex flex-wrap items-center gap-2 mb-0.5">
                      <p
                        className={cn(
                          "text-sm leading-snug",
                          !n.read
                            ? "font-semibold text-foreground"
                            : "font-medium text-muted-foreground"
                        )}
                      >
                        {n.title}
                      </p>
                      {/* Unread dot */}
                      {!n.read && (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                      )}
                      {/* Type pill */}
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                          typePillByType[n.type]
                        )}
                      >
                        {typeLabelByType[n.type]}
                      </span>
                    </div>
                    {/* Description */}
                    <p className="text-sm text-muted-foreground line-clamp-2 sm:line-clamp-none">
                      {n.description}
                    </p>
                    {/* Timestamp */}
                    <p className="mt-1.5 text-xs text-muted-foreground/60">{n.time}</p>
                  </div>

                  {/* Per-item actions: visible on touch, fade-in on hover for desktop */}
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity bg-gradient-to-l from-card via-card/95 to-transparent pl-4 py-1">
                    {onToggleRead && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onToggleRead(n.id, !n.read)}
                        className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
                        title={n.read ? "Mark as unread" : "Mark as read"}
                      >
                        {n.read ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Check className="h-4 w-4 stroke-[2.5]" />
                        )}
                      </Button>
                    )}
                    {onDeleteOne && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDeleteOne(n.id)}
                        className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/5"
                        title="Delete notification"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

    </div>
  );
}
