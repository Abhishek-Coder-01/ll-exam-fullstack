"use client";

import { useEffect, useState } from "react";
import { Mail, Phone, Building2, CalendarDays, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getInitials, formatDate } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { userService, ApiError } from "@/services";

export default function TeamLeaderProfilePage() {
  const { user, refresh } = useAuth();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [teamMemberCount, setTeamMemberCount] = useState<number | null>(null);

  useEffect(() => {
    if (user) setName(user.name);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const currentUser = user;
    let cancelled = false;
    async function loadStats() {
      try {
        const res = await userService.listStaff({ limit: 200, status: "Active" });
        if (cancelled) return;
        const teamMembers = res.items.filter((s) => (s as any).teamLeaderId === currentUser.businessId);
        setTeamMemberCount(teamMembers.length);
      } catch {
        // silent — stats are optional
      }
    }
    void loadStats();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const save = async () => {
    if (!user || !name.trim() || name === user.name) return;
    setSaving(true);
    setMsg(null);
    try {
      await userService.updateProfile({ name: name.trim() });
      await refresh();
      setMsg("Profile updated");
    } catch (err) {
      setMsg(err instanceof ApiError ? err.message : "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Profile" description="Your account details and team leadership role." />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardContent className="flex flex-col items-center p-6 text-center">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="text-xl">{getInitials(user.name)}</AvatarFallback>
            </Avatar>
            <h3 className="mt-4 text-base font-semibold">{user.name}</h3>
            <p className="text-sm text-muted-foreground">{user.department ?? "—"}</p>
            <Badge variant="outline" className="mt-3">
              Team Leader
            </Badge>
            <div className="mt-6 w-full rounded-lg border border-border p-3">
              <p className="text-[11px] text-muted-foreground">Team Members</p>
              <p className="text-lg font-semibold">
                {teamMemberCount === null ? "…" : teamMemberCount}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Account details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Full name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input value={user.email} disabled />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={user.phone} disabled />
              </div>
              <div className="space-y-1.5">
                <Label>Team Leader ID</Label>
                <Input value={user.businessId} disabled />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" /> {user.email}
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4" /> {user.phone}
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4" /> {user.department ?? "—"}
              </div>
              <div className="flex items-center gap-2 sm:col-span-3">
                <CalendarDays className="h-4 w-4" /> Joined {user.createdAt ? formatDate(user.createdAt) : "—"}
              </div>
            </div>
            {msg && <p className="text-xs text-muted-foreground">{msg}</p>}
            <div className="flex justify-end">
              <Button onClick={save} disabled={saving || !name.trim() || name === user.name}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Save changes
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
