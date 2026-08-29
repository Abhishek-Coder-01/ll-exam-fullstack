"use client";

import { useEffect, useState, useCallback } from "react";
import { MoreHorizontal, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/shared/status-badge";
import { DataTable, type Column } from "@/components/tables/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { userService, ApiError } from "@/services";
import type { Client, StaffMember } from "@/types";
import { getInitials, formatDate } from "@/lib/utils";

export default function AdminClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [c, s] = await Promise.all([
        userService.listClients({ limit: 200 }),
        userService.listStaff({ limit: 200, status: "Approved" }),
      ]);
      setClients(c.items);
      setStaff(s.items);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load clients");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const assign = async (clientId: string) => {
    const staffId = window.prompt(
      `Enter staff Business ID to assign (approved staff only).\nAvailable: ${staff.map((s) => `${s.id} (${s.name})`).join(", ") || "none"}`,
    );
    if (!staffId) return;
    try {
      await userService.assignStaffToClient(clientId, staffId.trim());
      await load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to assign staff");
    }
  };

  const columns: Column<Client>[] = [
    {
      key: "name",
      header: "Client",
      render: (c) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">{getInitials(c.name)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium">{c.name}</p>
            <p className="text-xs text-muted-foreground">{c.email}</p>
          </div>
        </div>
      ),
    },
    { key: "id", header: "Client ID", render: (c) => <span className="text-sm">{c.id}</span> },
    { key: "phone", header: "Phone", render: (c) => <span className="text-sm">{c.phone}</span> },
    { key: "licenseType", header: "License Type", render: (c) => <span className="text-sm">{c.licenseType}</span> },
    { key: "assignedStaff", header: "Assigned Staff", render: (c) => <span className="text-sm">{c.assignedStaff ?? "—"}</span> },
    { key: "applications", header: "Applications", render: (c) => <span className="text-sm">{c.applications}</span> },
    { key: "createdAt", header: "Joined", render: (c) => <span className="text-sm">{formatDate(c.createdAt)}</span> },
    { key: "status", header: "Status", render: (c) => <StatusBadge status={c.status} /> },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (c) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => assign(c.id)}>Assign staff</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Client Management" description="View and manage registered client accounts." />
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
              data={clients}
              searchKeys={["name", "email", "id", "licenseType"]}
              searchPlaceholder="Search clients by name, email, or ID..."
              emptyTitle="No clients registered yet"
              emptyDescription="Clients will appear here after they complete registration."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
