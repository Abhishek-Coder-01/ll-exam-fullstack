"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Menu, Search, Bell, LogOut, Settings, UserRound } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { getInitials } from "@/lib/utils";
import { notificationService } from "@/services";
import type { Role } from "@/lib/constants";
import type { BreadcrumbItem } from "@/components/shared/breadcrumb";
import { Breadcrumb } from "@/components/shared/breadcrumb";
import type { Notification } from "@/types";

export function Navbar({
  role,
  userName,
  userEmail,
  breadcrumbs,
  onMenuClick,
  profileHref,
  onLogout,
}: {
  role: Role;
  userName: string;
  userEmail: string;
  breadcrumbs: BreadcrumbItem[];
  onMenuClick: () => void;
  profileHref: string;
  onLogout: () => void | Promise<void>;
}) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await notificationService.listNotifications({ page: 1, limit: 8 });
        if (cancelled) return;
        setNotifications(res.items);
        setUnread(res.unreadCount);
      } catch {
        if (!cancelled) {
          setNotifications([]);
          setUnread(0);
        }
      }
    }
    void load();
    const interval = setInterval(load, 30_000); // refresh every 30s
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-card/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-card/80 lg:px-6">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick} aria-label="Open menu">
        <Menu className="h-5 w-5" />
      </Button>

      <div className="hidden lg:block">
        <Breadcrumb items={breadcrumbs} />
      </div>

      <div className="relative ml-auto hidden max-w-xs flex-1 md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search applications, clients..." className="pl-9" />
      </div>

      <div className="ml-auto flex items-center gap-1.5 md:ml-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
              <Bell className="h-5 w-5" />
              {unread > 0 && (
                <span className="absolute right-1.5 top-1.5 flex h-2 w-2 rounded-full bg-destructive" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between text-sm font-semibold text-foreground">
              Notifications
              {unread > 0 && <Badge variant="destructive">{unread} new</Badge>}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="max-h-80 overflow-y-auto scrollbar-thin">
              {notifications.length === 0 ? (
                <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                  No notifications yet.
                </p>
              ) : (
                notifications.map((n) => (
                  <DropdownMenuItem
                    key={n.id}
                    className="flex-col items-start gap-0.5 whitespace-normal py-2.5"
                    onClick={() => {
                      void notificationService.markAsRead(n.id).catch(() => undefined);
                      router.push(`/${role}/notifications`);
                    }}
                  >
                    <div className="flex w-full items-center justify-between gap-2">
                      <span className="text-sm font-medium">{n.title}</span>
                      {!n.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
                    </div>
                    <span className="text-xs text-muted-foreground">{n.description}</span>
                    <span className="text-[11px] text-muted-foreground/70">{n.time}</span>
                  </DropdownMenuItem>
                ))
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-muted transition-colors">
              <Avatar className="h-8 w-8">
                <AvatarFallback>{getInitials(userName)}</AvatarFallback>
              </Avatar>
              <span className="hidden text-left text-sm leading-tight md:block">
                <span className="block font-medium">{userName}</span>
                <span className="block text-xs capitalize text-muted-foreground">{role}</span>
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <span className="block font-medium">{userName}</span>
              <span className="block text-xs font-normal text-muted-foreground">{userEmail}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push(profileHref)}>
              <UserRound className="h-4 w-4" /> Profile
            </DropdownMenuItem>
            {role === "admin" && (
              <DropdownMenuItem onClick={() => router.push("/admin/settings")}>
                <Settings className="h-4 w-4" /> Settings
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => void onLogout()}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="h-4 w-4" /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

export function useMobileSidebar() {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [open, setOpen] = useState(false);
  return { open, setOpen };
}
