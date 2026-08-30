"use client";

import { useEffect, useState, useCallback } from "react";
import { UserPlus, MoreHorizontal, Loader2, Power, Edit2, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DataTable, type Column } from "@/components/tables/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { userService, ApiError } from "@/services";
import type { TeamLeader } from "@/services/user.service";
import { getInitials } from "@/lib/utils";

export default function AdminTeamLeadersPage() {
  const [teamLeaders, setTeamLeaders] = useState<TeamLeader[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    department: "Licensing",
  });

  const load = useCallback(async () => {
    try {
      const res = await userService.listTeamLeaders({ limit: 100 });
      setTeamLeaders(res.items);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load team leaders");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreateDialog = () => {
    setDialogMode("create");
    setEditingId(null);
    setFormData({
      name: "",
      email: "",
      phone: "",
      password: "",
      department: "Licensing",
    });
    setShowDialog(true);
  };

  const openEditDialog = (tl: TeamLeader) => {
    setDialogMode("edit");
    setEditingId(tl.id);
    setFormData({
      name: tl.name,
      email: tl.email,
      phone: tl.phone,
      password: "",
      department: tl.department || "Licensing",
    });
    setShowDialog(true);
  };

  const handleSubmit = async () => {
    setBusy("form");
    try {
      if (dialogMode === "create") {
        await userService.createTeamLeader({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
          department: formData.department,
        });
      } else if (editingId) {
        await userService.updateTeamLeader(editingId, {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          department: formData.department,
        });
      }
      setShowDialog(false);
      await load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to save team leader");
    } finally {
      setBusy(null);
    }
  };

  const toggleActive = async (id: string, currentStatus: string) => {
    setBusy(id);
    try {
      const isActive = currentStatus === "Active";
      await userService.toggleTeamLeaderActive(id, !isActive);
      await load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to update team leader");
    } finally {
      setBusy(null);
    }
  };

  const deleteTeamLeader = async (id: string) => {
    if (!confirm("Are you sure you want to delete this team leader?")) return;
    setBusy(id);
    try {
      await userService.deleteTeamLeader(id);
      await load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to delete team leader");
    } finally {
      setBusy(null);
    }
  };

  const columns: Column<TeamLeader>[] = [
    {
      key: "name",
      header: "Team Leader",
      render: (tl) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">{getInitials(tl.name)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium">{tl.name}</p>
            <p className="text-xs text-muted-foreground">{tl.email}</p>
          </div>
        </div>
      ),
    },
    { key: "id", header: "ID", render: (tl) => <span className="text-sm">{tl.id}</span> },
    {
      key: "department",
      header: "Department",
      render: (tl) => <span className="text-sm">{tl.department}</span>,
    },
    {
      key: "teamMemberCount",
      header: "Team Members",
      render: (tl) => <span className="text-sm font-medium">{tl.teamMemberCount}</span>,
    },
    {
      key: "activeTasks",
      header: "Active Tasks",
      render: (tl) => <span className="text-sm">{tl.activeTasks}</span>,
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (tl) => (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="h-8 w-8" disabled={busy === tl.id}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openEditDialog(tl)}>
                <Edit2 className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toggleActive(tl.id, tl.staffStatus ?? "Active")}>
                <Power className="mr-2 h-4 w-4" />
                {tl.staffStatus === "Active" ? "Deactivate" : "Activate"}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => deleteTeamLeader(tl.id)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Team Leaders"
        description="Create and manage team leaders. Assign staff to team leaders for better task management."
        action={
          <Button onClick={openCreateDialog}>
            <UserPlus className="h-4 w-4" /> Add Team Leader
          </Button>
        }
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
              data={teamLeaders}
              searchKeys={["name", "email", "id"]}
              searchPlaceholder="Search by name, email, or ID..."
              emptyTitle="No team leaders yet"
              emptyDescription="Create a team leader to manage staff and tasks."
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{dialogMode === "create" ? "Add Team Leader" : "Edit Team Leader"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Rajesh Kumar"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="e.g., rajesh@example.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="e.g., +919876543210"
              />
            </div>
            {dialogMode === "create" && (
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Min 6 characters"
                />
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="department">Department</Label>
              <Select value={formData.department} onValueChange={(v) => setFormData({ ...formData, department: v })}>
                <SelectTrigger id="department">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Licensing">Licensing</SelectItem>
                  <SelectItem value="Verification">Verification</SelectItem>
                  <SelectItem value="Payments">Payments</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={busy === "form"}>
              {busy === "form" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {dialogMode === "create" ? "Create" : "Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
