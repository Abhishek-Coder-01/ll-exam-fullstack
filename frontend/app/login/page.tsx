"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  ShieldCheck, 
  Mail, 
  Lock, 
  Loader2, 
  AlertCircle, 
  Eye, 
  EyeOff,
  ArrowRight,
  User,
  Building2,
  Users
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { authService, ApiError } from "@/services";
import type { Role } from "@/types";
import { cn } from "@/lib/utils";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});
type LoginForm = z.infer<typeof loginSchema>;

const roleConfig = {
  admin: {
    icon: ShieldCheck,
    color: "from-violet-600 to-purple-700",
    bgLight: "bg-violet-50",
    textColor: "text-violet-700",
    accentLight: "bg-violet-100",
    placeholder: "admin@llportal.gov.in",
  },
  staff: {
    icon: Building2,
    color: "from-blue-600 to-indigo-700",
    bgLight: "bg-blue-50",
    textColor: "text-blue-700",
    accentLight: "bg-blue-100",
    placeholder: "staff@llportal.gov.in",
  },
  client: {
    icon: Users,
    color: "from-emerald-600 to-teal-700",
    bgLight: "bg-emerald-50",
    textColor: "text-emerald-700",
    accentLight: "bg-emerald-100",
    placeholder: "client@llportal.gov.in",
  },
};

function RoleLoginForm({ role }: { role: Role }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const config = roleConfig[role];
  const IconComponent = config.icon;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ 
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    }
  });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    setLoading(true);
    try {
      const res = await authService.login({ 
        email: values.email, 
        password: values.password, 
        role 
      });
      
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(
          "ll_pending_login",
          JSON.stringify({
            phone: res.phone,
            role: res.role,
            email: values.email,
            purpose: "login",
            mockedCode: res.otp.mockedCode,
          }),
        );
      }
      router.push("/verify-otp");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Login failed. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Email Field */}
      <div className="space-y-1.5">
        <Label htmlFor={`${role}-email`} className="text-sm font-medium">
          Email address
        </Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id={`${role}-email`}
            type="email"
            placeholder={config.placeholder}
            className="pl-10 h-11"
            autoComplete="email"
            {...register("email")}
          />
        </div>
        {errors.email && (
          <p className="flex items-center gap-1.5 text-xs text-destructive">
            <AlertCircle className="h-3 w-3" />
            {errors.email.message}
          </p>
        )}
      </div>

      {/* Password Field with Eye Icon */}
      <div className="space-y-1.5">
        <Label htmlFor={`${role}-password`} className="text-sm font-medium">
          Password
        </Label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id={`${role}-password`}
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
            className="pl-10 pr-12 h-11"
            autoComplete="current-password"
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.password && (
          <p className="flex items-center gap-1.5 text-xs text-destructive">
            <AlertCircle className="h-3 w-3" />
            {errors.password.message}
          </p>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Remember Me & Forgot Password */}
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-muted-foreground text-sm">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-border"
          />
          Remember me
        </label>
        <Link 
          href="#" 
          className="text-sm font-medium text-primary hover:underline"
        >
          Forgot password?
        </Link>
      </div>

      {/* Submit Button */}
      <Button 
        type="submit" 
        className={cn(
          "w-full h-11 text-sm font-semibold bg-gradient-to-r text-white",
          config.color
        )}
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Signing in...
          </>
        ) : (
          <>
            <IconComponent className="h-4 w-4 mr-2" />
            Continue as {role.charAt(0).toUpperCase() + role.slice(1)}
            <ArrowRight className="h-4 w-4 ml-1" />
          </>
        )}
      </Button>

      {/* OTP Notice */}
      <div className={cn(
        "flex items-center gap-2 rounded-lg px-4 py-3 text-xs",
        config.accentLight,
        config.textColor
      )}>
        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" 
          />
        </svg>
        <span>We'll send a 6-digit OTP to your registered mobile number for verification.</span>
      </div>
    </form>
  );
}

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState<Role>("client");

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 px-4 py-10">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-700 shadow-lg">
            <ShieldCheck className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
          <p className="mt-2 text-sm text-muted-foreground">Sign in to your LL Exam Portal account</p>
        </div>

        {/* Card Container */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xl sm:p-8">
          <Tabs 
            defaultValue="client" 
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as Role)}
          >
            <TabsList className="grid w-full grid-cols-3 mb-6 bg-muted/50 p-1 rounded-xl">
              {(["admin", "staff", "client"] as Role[]).map((tab) => {
                const config = roleConfig[tab];
                const Icon = config.icon;
                return (
                  <TabsTrigger
                    key={tab}
                    value={tab}
                    className="flex items-center gap-2 py-2.5 text-sm font-medium rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </span>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            <TabsContent value="admin" className="mt-0">
              <RoleLoginForm role="admin" />
            </TabsContent>
            <TabsContent value="staff" className="mt-0">
              <RoleLoginForm role="staff" />
            </TabsContent>
            <TabsContent value="client" className="mt-0">
              <RoleLoginForm role="client" />
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer */}
        <div className="mt-6 space-y-3">
          <p className="text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link href="/register" className="font-semibold text-primary hover:underline">
              Register as Staff or Client
              <ArrowRight className="inline h-3 w-3 ml-1" />
            </Link>
          </p>
          <p className="text-center text-xs text-muted-foreground/60">
            Admin accounts are provisioned manually and cannot self-register.
          </p>
        </div>
      </div>
    </div>
  );
}