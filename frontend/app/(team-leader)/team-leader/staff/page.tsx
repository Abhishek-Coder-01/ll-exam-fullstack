"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/tables/data-table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { userService, ApiError } from "@/services";
import { useAuth } from "@/lib/auth-context";
import { getInitials } from "@/lib/utils";

interface TeamStaff {
  id: string;
  businessId: string;
  name: string;
  email: string;
  department?: string;
  availabilityStatus: string;
}

export default function TeamLeaderStaffPage() {
  const { user } = useAuth();
  const [staff, setStaff] = useState<TeamStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const currentUser = user;
    let cancelled = false;
    async function load() {
      try {
        const res = await userService.listStaff({ limit: 200, status: "Active" });
        if (!cancelled) {
          const teamMembers = res.items.filter((s) => (s as any).teamLeaderId === currentUser.businessId);
          setStaff(
            teamMembers.map((member) => ({
              id: member.id,
              businessId: member.id,
              name: member.name,
              email: member.email,
              department: member.department,
              availabilityStatus: (member as any).availabilityStatus ?? "Available",
            })),
          );
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Failed to load staff");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const getStatusColor = (status: string) => {
    if (status === "Available") return "bg-success/10 text-success";
    if (status === "Busy") return "bg-warning/10 text-warning";
    if (status === "Break") return "bg-orange-500/10 text-orange-700";
    return "bg-muted text-muted-foreground";
  };

  const columns: Column<TeamStaff>[] = [
    {
      key: "name",
      header: "Staff Member",
      render: (s) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">{getInitials(s.name)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium">{s.name}</p>
            <p className="text-xs text-muted-foreground">{s.email}</p>
          </div>
        </div>
      ),
    },
    { key: "businessId", header: "Staff ID", render: (s) => <span className="text-sm">{s.businessId}</span> },
    { key: "department", header: "Department", render: (s) => <span className="text-sm">{s.department ?? "—"}</span> },
    {
      key: "availabilityStatus",
      header: "Status",
      render: (s) => (
        <Badge variant="outline" className={getStatusColor(s.availabilityStatus)}>
          {s.availabilityStatus}
        </Badge>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Team Staff" description="Manage and review your assigned staff members." />

      <Card>
        <CardHeader>
          <CardTitle>Staff Directory</CardTitle>
          <CardDescription>Your team members and their availability status</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : error ? (
            <p className="py-6 text-center text-sm text-destructive">{error}</p>
          ) : staff.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No staff members assigned to your team yet.</p>
          ) : (
            <DataTable
              columns={columns}
              data={staff}
              searchKeys={["name", "email", "businessId"]}
              searchPlaceholder="Search staff by name, email, or ID..."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
