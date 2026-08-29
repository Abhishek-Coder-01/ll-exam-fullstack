"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { userService, ApiError } from "@/services";

function Switch({ defaultChecked }: { defaultChecked?: boolean }) {
  return (
    <SwitchPrimitive.Root
      defaultChecked={defaultChecked}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full bg-secondary transition-colors data-[state=checked]:bg-primary",
      )}
    >
      <SwitchPrimitive.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white shadow-sm transition-transform data-[state=checked]:translate-x-[22px]" />
    </SwitchPrimitive.Root>
  );
}

export default function AdminSettingsPage() {
  const { user, refresh } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const saveProfile = async () => {
    if (!name.trim()) return;
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

  return (
    <div>
      <PageHeader title="Settings" description="Manage portal configuration and preferences." />

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Admin profile</CardTitle>
              <CardDescription>Your admin account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Full name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input value={user?.email ?? ""} disabled />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone</Label>
                  <Input value={user?.phone ?? ""} disabled />
                </div>
                <div className="space-y-1.5">
                  <Label>Admin ID</Label>
                  <Input value={user?.businessId ?? ""} disabled />
                </div>
              </div>
              {msg && (
                <p className="text-xs text-muted-foreground">{msg}</p>
              )}
              <div className="flex justify-end">
                <Button onClick={saveProfile} disabled={saving || !name.trim() || name === user?.name}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security preferences</CardTitle>
              <CardDescription>Portal-wide access requirements (server-enforced)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Require OTP for every login</p>
                  <p className="text-xs text-muted-foreground">Always on — every role must complete OTP verification</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Manual staff approval</p>
                  <p className="text-xs text-muted-foreground">New staff accounts require Admin approval before login</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Refresh-token rotation</p>
                  <p className="text-xs text-muted-foreground">Every refresh issues a new token pair</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification preferences</CardTitle>
              <CardDescription>UI toggle preview (server-side triggers are always on).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                "New application submitted",
                "Payment verified",
                "Staff registration pending",
                "Application rejected",
              ].map((item) => (
                <div key={item} className="flex items-center justify-between">
                  <p className="text-sm font-medium">{item}</p>
                  <Switch defaultChecked />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
