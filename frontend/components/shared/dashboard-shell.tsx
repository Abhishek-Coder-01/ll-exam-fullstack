"use client";

import { useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Sidebar, MobileSidebar } from "@/components/sidebar/sidebar";
import { Navbar } from "@/components/navbar/navbar";
import { NAV_BY_ROLE, type Role } from "@/lib/constants";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import type { BreadcrumbItem } from "@/components/shared/breadcrumb";

function ShellInner({
  role,
  breadcrumbs,
  profileHref,
  children,
}: {
  role: Role;
  breadcrumbs: BreadcrumbItem[];
  profileHref: string;
  children: ReactNode;
}) {
  const { user, loading, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navItems = NAV_BY_ROLE[role];

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar items={navItems} role={role} />
      <MobileSidebar items={navItems} role={role} open={mobileOpen} onOpenChange={setMobileOpen} />
      <div className="lg:pl-64">
        <Navbar
          role={role}
          userName={user.name}
          userEmail={user.email}
          breadcrumbs={breadcrumbs}
          onMenuClick={() => setMobileOpen(true)}
          profileHref={profileHref}
          onLogout={logout}
        />
        <main className="px-4 py-6 lg:px-6 lg:py-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}

export function DashboardShell({
  role,
  breadcrumbs,
  profileHref,
  children,
}: {
  role: Role;
  /** Kept for backwards compatibility; ignored — real values come from /auth/me */
  userName?: string;
  userEmail?: string;
  breadcrumbs: BreadcrumbItem[];
  profileHref: string;
  children: ReactNode;
}) {
  return (
    <AuthProvider requireRole={role}>
      <ShellInner role={role} breadcrumbs={breadcrumbs} profileHref={profileHref}>
        {children}
      </ShellInner>
    </AuthProvider>
  );
}
