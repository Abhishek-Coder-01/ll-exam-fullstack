"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  UserCog,
  FileClock,
  FileCheck2,
  Wallet,
  TrendingUp,
  UserPlus,
  ClipboardList,
  UserCheck,
  BadgeIndianRupee,
  Loader2,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/cards/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ApplicationsOverviewChart,
  PaymentAnalyticsChart,
} from "@/components/charts/charts";
import {
  userService,
  applicationService,
  paymentService,
  reportService,
} from "@/services";
import type { AdminStats } from "@/services/user.service";
import type { RecentActivityItem } from "@/services/report.service";
import type { Application, Payment, ChartPoint } from "@/types";
import { formatCurrency, formatDate, getInitials } from "@/lib/utils";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [activity, setActivity] = useState<RecentActivityItem[]>([]);
  const [appChart, setAppChart] = useState<ChartPoint[]>([]);
  const [payChart, setPayChart] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [s, apps, pays, act, ac, pc] = await Promise.all([
          userService.fetchAdminStats(),
          applicationService.listApplications({ limit: 5 }),
          paymentService.listPayments({ limit: 5 }),
          reportService.recentActivity(),
          reportService.applicationsOverTime(),
          reportService.paymentsOverTime(),
        ]);
        if (cancelled) return;
        setStats(s);
        setApplications(apps.items);
        setPayments(pays.items);
        setActivity(act);
        setAppChart(ac);
        setPayChart(pc);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load dashboard");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader title="Admin Dashboard" description="Overview of licensing operations." />
        <Card>
          <CardContent className="py-10 text-center text-sm text-destructive">{error}</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Admin Dashboard"
        description="Overview of licensing operations, staff activity, and payments."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Total Clients" value={String(stats?.totalClients ?? 0)} icon={Users} />
        <StatCard
          label="Total Staff"
          value={String(stats?.totalStaff ?? 0)}
          icon={UserCog}
          tone="success"
        />
        <StatCard
          label="Pending Applications"
          value={String((stats?.totalApplications ?? 0) - (stats?.completedApplications ?? 0))}
          icon={FileClock}
          tone="warning"
        />
        <StatCard
          label="Completed Applications"
          value={String(stats?.completedApplications ?? 0)}
          icon={FileCheck2}
          tone="success"
        />
        <StatCard
          label="Pending Payments"
          value={String(stats?.pendingPayments ?? 0)}
          icon={Wallet}
          tone="warning"
        />
        <StatCard
          label="Total Revenue"
          value={formatCurrency(stats?.totalRevenue ?? 0)}
          icon={TrendingUp}
          tone="primary"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Applications Overview</CardTitle>
            <CardDescription>Submissions across the year</CardDescription>
          </CardHeader>
          <CardContent>
            {appChart.length > 0 ? (
              <ApplicationsOverviewChart data={appChart} />
            ) : (
              <p className="py-16 text-center text-sm text-muted-foreground">
                No application data yet.
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <Button asChild variant="outline" className="h-auto flex-col gap-2 py-4">
              <Link href="/admin/staff">
                <UserPlus className="h-5 w-5 text-primary" />
                <span className="text-xs font-medium">Manage Staff</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto flex-col gap-2 py-4">
              <Link href="/admin/applications">
                <ClipboardList className="h-5 w-5 text-primary" />
                <span className="text-xs font-medium">Applications</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto flex-col gap-2 py-4">
              <Link href="/admin/clients">
                <UserCheck className="h-5 w-5 text-primary" />
                <span className="text-xs font-medium">Clients</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto flex-col gap-2 py-4">
              <Link href="/admin/payments">
                <BadgeIndianRupee className="h-5 w-5 text-primary" />
                <span className="text-xs font-medium">Payments</span>
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Payment Analytics</CardTitle>
            <CardDescription>Revenue collected per month</CardDescription>
          </CardHeader>
          <CardContent>
            {payChart.length > 0 ? (
              <PaymentAnalyticsChart data={payChart} />
            ) : (
              <p className="py-16 text-center text-sm text-muted-foreground">No payments yet.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {activity.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No activity yet.</p>
            ) : (
              activity.slice(0, 6).map((a) => (
                <div key={a.id} className="flex items-start gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">{getInitials(a.actor)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm">
                      <span className="font-medium">{a.actor}</span> {a.action}{" "}
                      <span className="font-medium">{a.target}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">{a.time}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Latest Applications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {applications.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No applications yet.</p>
            ) : (
              applications.map((app) => (
                <div key={app.id} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{app.applicantName}</p>
                    <p className="text-xs text-muted-foreground">
                      {app.id} · {app.type}
                    </p>
                  </div>
                  <StatusBadge status={app.status} />
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Latest Payments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {payments.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No payments yet.</p>
            ) : (
              payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{p.clientName}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.invoiceNo} · {formatDate(p.date)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{formatCurrency(p.amount)}</p>
                    <StatusBadge status={p.status} />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}