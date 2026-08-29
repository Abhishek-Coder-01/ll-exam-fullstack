"use client";

import { useCallback, useEffect, useState } from "react";
import { CreditCard, Loader2, Wallet } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { DataTable, type Column } from "@/components/tables/data-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { paymentService, ApiError } from "@/services";
import type { Payment } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function ClientPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState<string | null>(null);
  const [method, setMethod] = useState<string>("UPI");

  const load = useCallback(async () => {
    try {
      const res = await paymentService.listPayments({ limit: 100 });
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

  const payNow = async (payment: Payment) => {
    setPaying(payment.id);
    try {
      // 1. Create order (works with stub provider)
      const order = await paymentService.createPaymentOrder(payment.applicationId, method);
      // 2. Verify payment (stub provider always verifies successfully)
      await paymentService.verifyPayment({
        orderId: order.order.orderId,
        paymentId: `pay_${Date.now()}`,
        signature: "stub_signature",
      });
      await load();
      alert(`Payment of ${formatCurrency(payment.amount)} successful.`);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Payment failed");
    } finally {
      setPaying(null);
    }
  };

  const pending = payments.filter((p) => p.status === "Pending");
  const totalPaid = payments
    .filter((p) => p.status === "Completed" || p.status === "Verified")
    .reduce((s, p) => s + p.amount, 0);

  const columns: Column<Payment>[] = [
    { key: "invoiceNo", header: "Invoice", render: (p) => <span className="text-sm font-medium">{p.invoiceNo}</span> },
    { key: "applicationId", header: "Application", render: (p) => <span className="text-sm">{p.applicationId}</span> },
    { key: "amount", header: "Amount", render: (p) => <span className="text-sm">{formatCurrency(p.amount)}</span> },
    { key: "method", header: "Method", render: (p) => <span className="text-sm">{p.method}</span> },
    { key: "date", header: "Date", render: (p) => <span className="text-sm">{formatDate(p.date)}</span> },
    { key: "status", header: "Status", render: (p) => <StatusBadge status={p.status} /> },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (p) => (
        <div className="flex justify-end">
          {p.status === "Pending" ? (
            <Button size="sm" onClick={() => payNow(p)} disabled={paying === p.id}>
              {paying === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CreditCard className="h-3.5 w-3.5" />}
              Pay now
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Payments"
        description="View and pay your outstanding application fees."
      />

      {pending.length > 0 && (
        <Card className="mb-4 border-warning/30 bg-warning/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-warning-foreground">
              <Wallet className="h-5 w-5" /> {pending.length} pending payment{pending.length > 1 ? "s" : ""}
            </CardTitle>
            <CardDescription>
              Total due: {formatCurrency(pending.reduce((s, p) => s + p.amount, 0))} · Paid to date:{" "}
              {formatCurrency(totalPaid)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-[180px]">
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UPI">UPI</SelectItem>
                    <SelectItem value="Net Banking">Net Banking</SelectItem>
                    <SelectItem value="Debit Card">Debit Card</SelectItem>
                    <SelectItem value="Credit Card">Credit Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">
                Choose a payment method, then click <strong>Pay now</strong> next to any pending
                invoice below.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

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
              searchKeys={["invoiceNo", "applicationId"]}
              searchPlaceholder="Search your payments..."
              emptyTitle="No payments yet"
              emptyDescription="Payments are created automatically after you submit an application."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
