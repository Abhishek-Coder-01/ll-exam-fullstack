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
import type { ExcelExportType } from "@/services/report.service";
import type { ChartPoint } from "@/types";

export default function AdminReportsPage() {
  const [apps, setApps] = useState<ChartPoint[]>([]);
  const [pays, setPays] = useState<ChartPoint[]>([]);
  const [status, setStatus] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportType, setExportType] = useState<ExcelExportType>("all");

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

  const exportExcel = async () => {
    setExporting(true);
    try {
      const result = await reportService.downloadExcelExport(exportType);
      if (!result) throw new Error("Failed to download Excel export");
      const url = URL.createObjectURL(result.blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = result.filename ?? `ll-portal-${exportType}-${new Date().toISOString().slice(0, 10)}.xlsx`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to export Excel file");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Analytics across applications, registrations, and revenue."
        action={
          <div className="flex items-center gap-2">
            <select
              value={exportType}
              onChange={(event) => setExportType(event.target.value as ExcelExportType)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              disabled={loading || exporting}
              aria-label="Excel export type"
            >
              <option value="all">All data</option>
              <option value="team-leaders">Team Leaders</option>
              <option value="staff">Staff</option>
              <option value="clients">Clients</option>
              <option value="applications">Applications</option>
              <option value="payments">Payments</option>
            </select>
            <Button variant="outline" onClick={() => void exportExcel()} disabled={loading || exporting}>
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {exporting ? "Preparing Excel" : "Export Excel"}
            </Button>
          </div>
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
