"use client";

import { useEffect, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ApplicationsOverviewChart,
  PaymentAnalyticsChart,
  ApplicationStatusPie,
} from "@/components/charts/charts";
import { reportService, ApiError } from "@/services";
import type { ChartPoint } from "@/types";

export default function AdminReportsPage() {
  const [apps, setApps] = useState<ChartPoint[]>([]);
  const [pays, setPays] = useState<ChartPoint[]>([]);
  const [status, setStatus] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [a, p, s] = await Promise.all([
          reportService.applicationsOverTime(),
          reportService.paymentsOverTime(),
          reportService.applicationStatusBreakdown(),
        ]);
        if (cancelled) return;
        setApps(a);
        setPays(p);
        setStatus(s);
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Failed to load reports");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const exportJson = () => {
    const payload = { applicationsOverTime: apps, paymentsOverTime: pays, statusBreakdown: status };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ll-portal-reports-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Analytics across applications, registrations, and revenue."
        action={
          <Button variant="outline" onClick={exportJson} disabled={loading}>
            <Download className="h-4 w-4" /> Export report
          </Button>
        }
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : error ? (
        <p className="py-6 text-center text-sm text-destructive">{error}</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle>Applications Overview</CardTitle>
                <CardDescription>Applications submitted per month</CardDescription>
              </CardHeader>
              <CardContent>
                {apps.length > 0 ? (
                  <ApplicationsOverviewChart data={apps} />
                ) : (
                  <p className="py-16 text-center text-sm text-muted-foreground">No data yet.</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Application Status Split</CardTitle>
                <CardDescription>Current distribution</CardDescription>
              </CardHeader>
              <CardContent>
                {status.length > 0 ? (
                  <ApplicationStatusPie data={status} />
                ) : (
                  <p className="py-16 text-center text-sm text-muted-foreground">No data yet.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Payment Analytics</CardTitle>
                <CardDescription>Revenue collected per month</CardDescription>
              </CardHeader>
              <CardContent>
                {pays.length > 0 ? (
                  <PaymentAnalyticsChart data={pays} />
                ) : (
                  <p className="py-16 text-center text-sm text-muted-foreground">
                    No payments yet.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
