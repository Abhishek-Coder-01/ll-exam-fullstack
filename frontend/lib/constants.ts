import {
  LayoutDashboard,
  Users,
  UserCog,
  FileText,
  Wallet,
  BarChart3,
  Bell,
  Settings,
  FolderOpen,
  MessageSquare,
  User,
  FilePlus2,
  CreditCard,
  type LucideIcon,
} from "lucide-react";

export type Role = "admin" | "staff" | "team_leader" | "client";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Optional badge count — dynamically populated where relevant (kept undefined by default). */
  badge?: number;
}

export const APP_NAME = "LL Exam Portal";

export const ADMIN_NAV: NavItem[] = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Team Leaders", href: "/admin/team-leaders", icon: UserCog },
  { label: "Staff Management", href: "/admin/staff", icon: UserCog },
  { label: "Client Management", href: "/admin/clients", icon: Users },
  { label: "Applications", href: "/admin/applications", icon: FileText },
  { label: "Payments", href: "/admin/payments", icon: Wallet },
  { label: "Reports", href: "/admin/reports", icon: BarChart3 },
  { label: "Notifications", href: "/admin/notifications", icon: Bell },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

export const STAFF_NAV: NavItem[] = [
  { label: "Dashboard", href: "/staff/dashboard", icon: LayoutDashboard },
  { label: "Assigned Clients", href: "/staff/clients", icon: Users },
  { label: "Applications", href: "/staff/applications", icon: FileText },
  { label: "Documents", href: "/staff/documents", icon: FolderOpen },
  { label: "Chat", href: "/staff/chat", icon: MessageSquare },
  { label: "Notifications", href: "/staff/notifications", icon: Bell },
  { label: "Profile", href: "/staff/profile", icon: User },
];

export const CLIENT_NAV: NavItem[] = [
  { label: "Dashboard", href: "/client/dashboard", icon: LayoutDashboard },
  { label: "New Application", href: "/client/application", icon: FilePlus2 },
  { label: "My Applications", href: "/client/applications", icon: FileText },
  { label: "Documents", href: "/client/documents", icon: FolderOpen },
  { label: "Payments", href: "/client/payments", icon: CreditCard },
  { label: "Notifications", href: "/client/notifications", icon: Bell },
  { label: "Profile", href: "/client/profile", icon: User },
];

export const TEAM_LEADER_NAV: NavItem[] = [
  { label: "Dashboard", href: "/team-leader/dashboard", icon: LayoutDashboard },
  { label: "Team Staff", href: "/team-leader/staff", icon: Users },
  { label: "Applications", href: "/team-leader/applications", icon: FileText },
  { label: "Notifications", href: "/team-leader/notifications", icon: Bell },
  { label: "Profile", href: "/team-leader/profile", icon: User },
];

export const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  admin: ADMIN_NAV,
  staff: STAFF_NAV,
  team_leader: TEAM_LEADER_NAV,
  client: CLIENT_NAV,
};

export const STATUS_COLORS: Record<string, string> = {
  Pending: "bg-warning/15 text-warning-foreground border-warning/30",
  "In Progress": "bg-primary/10 text-primary-700 border-primary/30",
  "Under Review": "bg-primary/10 text-primary-700 border-primary/30",
  "Assigned Staff": "bg-primary/10 text-primary-700 border-primary/30",
  Submitted: "bg-primary/10 text-primary-700 border-primary/30",
  Verified: "bg-success/10 text-success border-success/30",
  Approved: "bg-success/10 text-success border-success/30",
  Completed: "bg-success/10 text-success border-success/30",
  Rejected: "bg-destructive/10 text-destructive border-destructive/30",
  Failed: "bg-destructive/10 text-destructive border-destructive/30",
  Active: "bg-success/10 text-success border-success/30",
  Inactive: "bg-muted text-muted-foreground border-border",
};
