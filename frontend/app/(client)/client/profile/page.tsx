"use client";

import { useEffect, useState } from "react";
import { Mail, Phone, IdCard, CalendarDays, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getInitials, formatDate } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { userService, ApiError } from "@/services";

export default function ClientProfilePage() {
  const { user, refresh } = useAuth();
  const [name, setName] = useState("");
  const [licenseType, setLicenseType] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setLicenseType(user.licenseType ?? "Learner's License");
    }
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    setMsg(null);
    try {
      await userService.updateProfile({
        name: name.trim() || user.name,
        licenseType,
      });
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

  const dirty = name !== user.name || licenseType !== (user.licenseType ?? "");

  return (
    <div>
      <PageHeader title="Profile" description="Your account details." />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardContent className="flex flex-col items-center p-6 text-center">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="text-xl">{getInitials(user.name)}</AvatarFallback>
            </Avatar>
            <h3 className="mt-4 text-base font-semibold">{user.name}</h3>
            <p className="text-sm text-muted-foreground">{user.licenseType ?? "—"}</p>
            <Badge variant="outline" className="mt-3">
              Client · {user.clientStatus ?? "Active"}
            </Badge>
            <div className="mt-6 w-full space-y-2 text-left text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <IdCard className="h-4 w-4" /> {user.businessId}
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" /> {user.email}
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4" /> {user.phone}
              </div>
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />{" "}
                Joined {user.createdAt ? formatDate(user.createdAt) : "—"}
              </div>
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
                <Label>License type</Label>
                <Select value={licenseType} onValueChange={setLicenseType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Learner's License">Learner&apos;s License</SelectItem>
                    <SelectItem value="Permanent License">Permanent License</SelectItem>
                    <SelectItem value="Commercial License">Commercial License</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Email (locked)</Label>
                <Input value={user.email} disabled />
              </div>
              <div className="space-y-1.5">
                <Label>Phone (locked)</Label>
                <Input value={user.phone} disabled />
              </div>
            </div>
            {msg && <p className="text-xs text-muted-foreground">{msg}</p>}
            <div className="flex justify-end">
              <Button onClick={save} disabled={saving || !dirty || !name.trim()}>
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
