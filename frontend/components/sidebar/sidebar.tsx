"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck, ChevronRight, Loader2, } from "lucide-react";
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

function ClientSupportButton() {
  const whatsappSupportNumber = "+917499949407"; // Replace with the actual support number
  const whatsappMessage = "Hello Sir, I need help regarding my LL exam/application. Please assist me.";

  const openWhatsApp = () => {
    const url = `https://wa.me/${whatsappSupportNumber}?text=${encodeURIComponent(whatsappMessage)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (

<button
  type="button"
  onClick={openWhatsApp}
  className="mx-5 mb-3 flex items-center justify-center gap-2 rounded-xl border border-green-300/60 bg-green-500 px-3 py-2.5 text-sm font-semibold text-white shadow-lg shadow-green-900/20 transition hover:bg-green-600"
  aria-label="Contact support on WhatsApp"
>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className="h-5 w-5 shrink-0"
    aria-hidden="true"
  >
    <path d="M20.52 3.48A11.86 11.86 0 0 0 12.08 0C5.53 0 .2 5.33.2 11.88c0 2.09.55 4.13 1.59 5.93L.1 24l6.33-1.66a11.83 11.83 0 0 0 5.65 1.44h.01c6.55 0 11.88-5.33 11.88-11.88 0-3.17-1.23-6.15-3.45-8.42ZM12.09 21.8h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.76.99 1-3.67-.23-.38a9.87 9.87 0 1 1 8.39 4.65Zm5.41-7.4c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.47-.89-.79-1.49-1.76-1.66-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.49s1.07 2.89 1.22 3.09c.15.2 2.1 3.2 5.08 4.49.71.31 1.27.49 1.7.63.71.23 1.35.2 1.86.12.57-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35Z" />
  </svg>

  WhatsApp Help
</button>


  );
}

function SidebarFooter({ role }: { role: Role }) {
  return (
    <div className="border-t border-blue-400/20 px-5 py-4">
      {role === "client" && <ClientSupportButton />}
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
      <SidebarFooter role={role} />
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
        <SidebarFooter role={role} />
      </SheetContent>
    </Sheet>
  );
}