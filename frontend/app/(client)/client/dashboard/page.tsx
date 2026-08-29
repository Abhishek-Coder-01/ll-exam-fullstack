"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, FileClock, CreditCard, Bell, Plus, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/cards/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { ApplicationTimeline } from "@/components/shared/application-timeline";
import {
  applicationService,
  paymentService,
  notificationService,
  documentService,
  ApiError,
} from "@/services";
import type { Application, DocumentItem, Payment, TimelineStep } from "@/types";
import { formatDate } from "@/lib/utils";

const TIMELINE_ORDER = [
  "Submitted",
  "Under Review",
  "Assigned Staff",
  "Verified",
  "Approved",
  "Completed",
];

function timelineFor(app: Application): TimelineStep[] {
  const currentIdx = TIMELINE_ORDER.indexOf(app.status);
  return TIMELINE_ORDER.map((label, idx) => ({
    label,
    status:
      idx < currentIdx
        ? "completed"
        : idx === currentIdx
          ? "current"
          : "upcoming",
    date: idx === 0 ? formatDate(app.submittedOn) : undefined,
  }));
}

export default function ClientDashboardPage() {
  const [apps, setApps] = useState<Application[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [a, p, d, n] = await Promise.all([
          applicationService.listApplications({ limit: 100 }),
          paymentService.listPayments({ limit: 100 }),
          documentService.listDocuments(),
          notificationService.listNotifications({ limit: 1, unreadOnly: true }),
        ]);
        if (cancelled) return;
        setApps(a.items);
        setPayments(p.items);
        setDocs(d);
        setUnreadCount(n.unreadCount);
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Failed to load dashboard");
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
        <PageHeader title="Client Dashboard" />
        <Card>
          <CardContent className="py-10 text-center text-sm text-destructive">{error}</CardContent>
        </Card>
      </div>
    );
  }

  const activeApp = apps.find(
    (a) => a.status !== "Completed" && a.status !== "Rejected",
  ) ?? apps[0];
  const pendingPayment = payments.find((p) => p.status === "Pending");
  const pendingDocs = docs.filter((d) => d.status !== "Verified");

  return (
    <div>
      <PageHeader
        title="Client Dashboard"
        description="Track your applications, documents, and payments."
        action={
          <Button asChild>
            <Link href="/client/application">
              <Plus className="h-4 w-4" /> New Application
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="My Applications" value={String(apps.length)} icon={FileText} />
        <StatCard
          label="Pending Documents"
          value={String(pendingDocs.length)}
          icon={FileClock}
          tone="warning"
        />
        <StatCard
          label="Payment Status"
          value={pendingPayment ? "Pending" : payments.length > 0 ? "Cleared" : "—"}
          icon={CreditCard}
          tone={pendingPayment ? "warning" : "success"}
        />
        <StatCard
          label="Unread Notifications"
          value={String(unreadCount)}
          icon={Bell}
          tone="primary"
        />
      </div>

      {activeApp && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Application Timeline</CardTitle>
            <CardDescription>
              {activeApp.id} · {activeApp.type} · <StatusBadge status={activeApp.status} />
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <ApplicationTimeline steps={timelineFor(activeApp)} />
          </CardContent>
        </Card>
      )}

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>My Applications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {apps.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              You have no applications yet.{" "}
              <Link href="/client/application" className="text-primary hover:underline">
                Submit one now
              </Link>
              .
            </p>
          ) : (
            apps.slice(0, 5).map((app) => (
              <div
                key={app.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border p-3"
              >
                <div>
                  <p className="text-sm font-medium">{app.type}</p>
                  <p className="text-xs text-muted-foreground">
                    {app.id} · Submitted {formatDate(app.submittedOn)}
                  </p>
                </div>
                <StatusBadge status={app.status} />
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
