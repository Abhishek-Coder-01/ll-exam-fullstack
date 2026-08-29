"use client";

import { useEffect, useState, useCallback } from "react";
import { Check, MoreHorizontal, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { DataTable, type Column } from "@/components/tables/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { paymentService, ApiError } from "@/services";
import type { Payment, PaymentStatus } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await paymentService.listPayments({ limit: 200 });
      setPayments(res.items);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load payments");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const updateStatus = async (id: string, status: PaymentStatus) => {
    setBusy(id);
    try {
      await paymentService.updatePaymentStatus(id, status);
      await load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to update payment");
    } finally {
      setBusy(null);
    }
  };

  const totalRevenue = payments.reduce(
    (sum, p) => (p.status !== "Failed" ? sum + p.amount : sum),
    0,
  );

  const columns: Column<Payment>[] = [
    { key: "invoiceNo", header: "Invoice", render: (p) => <span className="text-sm font-medium">{p.invoiceNo}</span> },
    { key: "clientName", header: "Client", render: (p) => <span className="text-sm">{p.clientName}</span> },
    { key: "applicationId", header: "Application", render: (p) => <span className="text-sm">{p.applicationId}</span> },
    { key: "method", header: "Method", render: (p) => <span className="text-sm">{p.method}</span> },
    { key: "amount", header: "Amount", render: (p) => <span className="text-sm font-medium">{formatCurrency(p.amount)}</span> },
    { key: "date", header: "Date", render: (p) => <span className="text-sm">{formatDate(p.date)}</span> },
    { key: "status", header: "Status", render: (p) => <StatusBadge status={p.status} /> },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (p) => (
        <div className="flex justify-end gap-1.5">
          {p.status === "Pending" && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1 border-success/30 text-success hover:bg-success/10"
              onClick={() => updateStatus(p.id, "Verified")}
              disabled={busy === p.id}
            >
              <Check className="h-3.5 w-3.5" /> Verify
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {p.status !== "Completed" && (
                <DropdownMenuItem onClick={() => updateStatus(p.id, "Completed")}>
                  Mark completed
                </DropdownMenuItem>
              )}
              {p.status !== "Failed" && (
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => updateStatus(p.id, "Failed")}
                >
                  Mark failed
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Payments"
        description={`Track and verify client payments · Total collected ${formatCurrency(totalRevenue)}`}
      />
      <Card>
        <CardContent className="p-5">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : error ? (
            <p className="py-6 text-center text-sm text-destructive">{error}</p>
          ) : (
            <DataTable
              columns={columns}
              data={payments}
              searchKeys={["invoiceNo", "clientName", "applicationId"]}
              searchPlaceholder="Search by invoice, client, or application..."
              emptyTitle="No payments recorded"
              emptyDescription="Payments will appear once clients complete transactions."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
