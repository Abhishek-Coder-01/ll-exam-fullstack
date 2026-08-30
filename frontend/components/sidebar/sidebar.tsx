"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_NAME, type NavItem, type Role } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { VisuallyHidden } from "@/components/ui/visually-hidden";
import { useEffect, useRef, useState } from "react";

function RoleTag({ role }: { role: Role }) {
  const config = {
    admin: { label: "Admin Portal", color: "text-blue-200" },
    staff: { label: "Staff Portal", color: "text-blue-200" },
    team_leader: { label: "Team Leader Portal", color: "text-blue-200" },
    client: { label: "Client Portal", color: "text-blue-200" },
  };
  const { label, color } = config[role];
  return <span className={cn("text-[11px] font-medium", color)}>{label}</span>;
}

function NavLinkItem({
  item,
  onNavigate,
  loadingHref,
  onStartLoading,
}: {
  item: NavItem;
  onNavigate?: () => void;
  loadingHref: string | null;
  onStartLoading: (href: string) => void;
}) {
  const pathname = usePathname();

  const active = pathname === item.href || pathname?.startsWith(item.href + "/");
  const isLoading = loadingHref === item.href && !active;
  const Icon = item.icon;

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (active) {
      e.preventDefault();
      onNavigate?.();
      return;
    }
    onStartLoading(item.href);
    onNavigate?.();
  };

  return (
    <Link
      href={item.href}
      onClick={handleClick}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",
        active
          ? "bg-white/15 text-white shadow-sm"
          : isLoading
            ? "bg-white/10 text-white/70"
            : "text-blue-100/80 hover:bg-white/10 hover:text-white"
      )}
    >
      <Icon className={cn(
        "h-[18px] w-[18px] shrink-0",
        active ? "text-white" : "text-blue-200/70"
      )} />
      <span className="flex-1 truncate">{item.label}</span>
      {isLoading ? (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-blue-200" />
      ) : item.badge ? (
        <Badge
          variant="secondary"
          className={cn(
            "h-5 min-w-5 justify-center px-1.5 text-[10px] font-semibold",
            active
              ? "bg-white/20 text-white border-white/20"
              : "bg-white/10 text-blue-100 border-transparent"
          )}
        >
          {item.badge}
        </Badge>
      ) : active ? (
        <ChevronRight className="h-4 w-4 text-blue-200 shrink-0" />
      ) : null}
    </Link>
  );
}

function NavLinks({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  const [loadingHref, setLoadingHref] = useState<string | null>(null);
  const prevPathname = useRef(pathname);

  useEffect(() => {
    if (prevPathname.current !== pathname) {
      prevPathname.current = pathname;
      setLoadingHref(null);
    }
  }, [pathname]);

  return (
    <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
      {items.map((item) => (
        <NavLinkItem
          key={item.href}
          item={item}
          onNavigate={onNavigate}
          loadingHref={loadingHref}
          onStartLoading={setLoadingHref}
        />
      ))}
    </nav>
  );
}

function SidebarBrand({ role }: { role: Role }) {
  return (
    <div className="flex items-center gap-3 px-5 py-5 border-b border-blue-400/20">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
        <ShieldCheck className="h-5 w-5 text-white" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-white tracking-tight">{APP_NAME}</p>
        <RoleTag role={role} />
      </div>
    </div>
  );
}

function SidebarFooter() {
  return (
    <div className="border-t border-blue-400/20 px-5 py-4">
      <div className="flex items-center gap-2">
        <div className="h-1.5 w-1.5 rounded-full bg-blue-300" />
        <p className="text-[11px] leading-relaxed text-blue-100/80 font-medium">
          Government of India
        </p>
      </div>
      <p className="mt-1 text-[10px] text-blue-100/50 pl-4">
        Licensing & Learner Exam Division
      </p>
    </div>
  );
}

export function Sidebar({ items, role }: { items: NavItem[]; role: Role }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-gradient-to-b from-blue-700 to-blue-800 lg:flex">
      <SidebarBrand role={role} />
      <NavLinks items={items} />
      <SidebarFooter />
    </aside>
  );
}

export function MobileSidebar({
  items,
  role,
  open,
  onOpenChange,
}: {
  items: NavItem[];
  role: Role;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="flex flex-col bg-gradient-to-b from-blue-700 to-blue-800 p-0">
        <VisuallyHidden>
          <SheetTitle>Navigation menu</SheetTitle>
        </VisuallyHidden>
        <SidebarBrand role={role} />
        <NavLinks items={items} onNavigate={() => onOpenChange(false)} />
        <SidebarFooter />
      </SheetContent>
    </Sheet>
  );
}