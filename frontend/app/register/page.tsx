"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { 
  ShieldCheck, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Eye,
  EyeOff,
  User,
  Mail,
  Phone,
  Building2,
  FileText,
  Lock,
  Users,
  UserPlus,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { authService, ApiError } from "@/services";
import { cn } from "@/lib/utils";

const phoneRegex = /^\+?\d{10,15}$/;

const registerSchema = z
  .object({
    fullName: z.string().min(2, "Enter your full name"),
    email: z.string().email("Enter a valid email address"),
    phone: z
      .string()
      .transform((v) => v.replace(/[\s-]/g, ""))
      .pipe(z.string().regex(phoneRegex, "Enter a valid phone number with country code, e.g. +919820011234")),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

const staffRegisterSchema = registerSchema.and(
  z.object({
    department: z.enum(["Licensing", "Verification", "Payments"]),
  }),
);

const clientRegisterSchema = registerSchema.and(
  z.object({
    licenseType: z.enum(["Learner's License", "Permanent License", "Commercial License"]),
  }),
);

type StaffForm = z.infer<typeof staffRegisterSchema>;
type ClientForm = z.infer<typeof clientRegisterSchema>;

function StaffRegisterForm() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<StaffForm>({
    resolver: zodResolver(staffRegisterSchema),
    defaultValues: { department: "Licensing" },
  });

  if (submitted) {
    return (
      <div className="flex flex-col items-center py-8 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
          <CheckCircle2 className="h-8 w-8 text-success" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">Registration submitted</h3>
        <p className="mt-2 text-sm text-muted-foreground max-w-xs">
          Your staff account status is{" "}
          <span className="font-semibold text-amber-600">Pending</span>. You can log in once
          an Admin approves your account.
        </p>
        <Button asChild variant="outline" className="mt-6">
          <Link href="/login">
            Back to login
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    );
  }

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    setLoading(true);
    try {
      await authService.registerStaff({
        name: values.fullName,
        email: values.email,
        phone: values.phone,
        password: values.password,
        department: values.department,
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="staff-name" className="text-sm font-medium">Full name</Label>
        <div className="relative">
          <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="staff-name"
            placeholder="Ananya Sharma"
            className={cn("pl-10 h-11", errors.fullName && "border-destructive")}
            {...register("fullName")}
          />
        </div>
        {errors.fullName && <p className="text-xs text-destructive">{errors.fullName.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="staff-email" className="text-sm font-medium">Email address</Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="staff-email"
            type="email"
            placeholder="ananya.sharma@llportal.gov.in"
            className={cn("pl-10 h-11", errors.email && "border-destructive")}
            {...register("email")}
          />
        </div>
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="staff-phone" className="text-sm font-medium">Phone number</Label>
        <div className="relative">
          <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="staff-phone"
            placeholder="+919820011234"
            className={cn("pl-10 h-11", errors.phone && "border-destructive")}
            {...register("phone")}
          />
        </div>
        {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Department</Label>
        <Select
          defaultValue="Licensing"
          onValueChange={(v) => setValue("department", v as StaffForm["department"])}
        >
          <SelectTrigger className="h-11">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Licensing">Licensing</SelectItem>
            <SelectItem value="Verification">Verification</SelectItem>
            <SelectItem value="Payments">Payments</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="staff-password" className="text-sm font-medium">Password</Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="staff-password"
              type={showPassword ? "text" : "password"}
              className={cn("pl-10 pr-10 h-11", errors.password && "border-destructive")}
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
          {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="staff-confirm" className="text-sm font-medium">Confirm</Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="staff-confirm"
              type={showConfirmPassword ? "text" : "password"}
              className={cn("pl-10 pr-10 h-11", errors.confirmPassword && "border-destructive")}
              {...register("confirmPassword")}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              tabIndex={-1}
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <p className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
        Your account status will remain <strong>Pending</strong> until an Admin approves it.
      </p>

      <Button 
        type="submit" 
        className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Registering...
          </>
        ) : (
          <>
            <UserPlus className="h-4 w-4 mr-2" />
            Submit registration
          </>
        )}
      </Button>
    </form>
  );
}

function ClientRegisterForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ClientForm>({
    resolver: zodResolver(clientRegisterSchema),
    defaultValues: { licenseType: "Learner's License" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    setLoading(true);
    try {
      const res = await authService.registerClient({
        name: values.fullName,
        email: values.email,
        phone: values.phone,
        password: values.password,
        licenseType: values.licenseType,
      });
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(
          "ll_pending_registration",
          JSON.stringify({
            phone: res.phone,
            purpose: "register",
            mockedCode: res.otp.mockedCode,
          }),
        );
      }
      router.push("/verify-otp");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="client-name" className="text-sm font-medium">Full name</Label>
        <div className="relative">
          <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="client-name"
            placeholder="Rahul Kulkarni"
            className={cn("pl-10 h-11", errors.fullName && "border-destructive")}
            {...register("fullName")}
          />
        </div>
        {errors.fullName && <p className="text-xs text-destructive">{errors.fullName.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="client-email" className="text-sm font-medium">Email address</Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="client-email"
            type="email"
            placeholder="rahul.kulkarni@gmail.com"
            className={cn("pl-10 h-11", errors.email && "border-destructive")}
            {...register("email")}
          />
        </div>
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="client-phone" className="text-sm font-medium">Phone number</Label>
        <div className="relative">
          <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="client-phone"
            placeholder="+919021011111"
            className={cn("pl-10 h-11", errors.phone && "border-destructive")}
            {...register("phone")}
          />
        </div>
        {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label className="text-sm font-medium">License type</Label>
        <Select
          defaultValue="Learner's License"
          onValueChange={(v) => setValue("licenseType", v as ClientForm["licenseType"])}
        >
          <SelectTrigger className="h-11">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Learner's License">Learner&apos;s License</SelectItem>
            <SelectItem value="Permanent License">Permanent License</SelectItem>
            <SelectItem value="Commercial License">Commercial License</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="client-password" className="text-sm font-medium">Password</Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="client-password"
              type={showPassword ? "text" : "password"}
              className={cn("pl-10 pr-10 h-11", errors.password && "border-destructive")}
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
          {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="client-confirm" className="text-sm font-medium">Confirm</Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="client-confirm"
              type={showConfirmPassword ? "text" : "password"}
              className={cn("pl-10 pr-10 h-11", errors.confirmPassword && "border-destructive")}
              {...register("confirmPassword")}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              tabIndex={-1}
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Button 
        type="submit" 
        className="w-full h-11 bg-gradient-to-r from-emerald-600 to-teal-600 text-white"
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Registering...
          </>
        ) : (
          <>
            <UserPlus className="h-4 w-4 mr-2" />
            Continue to OTP verification
          </>
        )}
      </Button>
    </form>
  );
}

export default function RegisterPage() {
  const [activeTab, setActiveTab] = useState<string>("client");

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-primary-50 to-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-700 shadow-lg">
            <ShieldCheck className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Create your account</h1>
          <p className="mt-2 text-sm text-muted-foreground">Register as Staff or Client to get started</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-xl sm:p-8">
          <Tabs 
            defaultValue="client" 
            value={activeTab}
            onValueChange={setActiveTab}
          >
            <TabsList className="grid w-full grid-cols-2 mb-6">
              {[
                { value: "client", icon: Users, label: "Client" },
                { value: "staff", icon: Building2, label: "Staff" },
              ].map(({ value, icon: Icon, label }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="flex items-center gap-2 py-2.5 text-sm font-medium"
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="client" className="mt-0">
              <ClientRegisterForm />
            </TabsContent>
            <TabsContent value="staff" className="mt-0">
              <StaffRegisterForm />
            </TabsContent>
          </Tabs>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Sign in
            <ArrowRight className="inline h-3 w-3 ml-1" />
          </Link>
        </p>
      </div>
    </div>
  );
}