"use client";

import { useEffect, useState } from "react";
import { MessageSquare, MoreHorizontal, Loader2 } from "lucide-react";
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
import { userService, chatService, ApiError } from "@/services";
import type { Client } from "@/types";
import { getInitials } from "@/lib/utils";
import { useRouter } from "next/navigation";

export default function StaffClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const items = await userService.listAssignedClients();
        if (!cancelled) setClients(items);
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Failed to load clients");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const openChat = async (clientId: string) => {
    try {
      await chatService.createOrGetThread(clientId, "staff");
      router.push("/staff/chat");
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to open chat");
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
    { key: "applications", header: "Applications", render: (c) => <span className="text-sm">{c.applications}</span> },
    { key: "status", header: "Status", render: (c) => <StatusBadge status={c.status} /> },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (c) => (
        <div className="flex justify-end gap-1.5">
          <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => openChat(c.id)}>
            <MessageSquare className="h-3.5 w-3.5" /> Chat
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push("/staff/applications")}>
                View applications
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/staff/documents")}>
                View documents
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Assigned Clients" description="Clients assigned to you." />
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
              searchPlaceholder="Search clients..."
              emptyTitle="No clients assigned yet"
              emptyDescription="An admin can assign clients to you."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
