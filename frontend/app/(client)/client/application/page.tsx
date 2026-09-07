"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, Loader2, UploadCloud, AlertCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { applicationService, documentService, ApiError } from "@/services";

const FEE_MAP: Record<string, number> = {
  "Learner's License": 350,
  "Permanent License": 700,
  "Commercial License": 1200,
};

const applicationSchema = z.object({
  licenseType: z.enum(["Learner's License", "Permanent License", "Commercial License"]),
  fullName: z.string().min(2, "Enter your full name"),
  dob: z.string().superRefine((val, ctx) => {
    if (!val) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter your date of birth" });
      return;
    }
    const date = new Date(val);
    if (isNaN(date.getTime())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter a valid date" });
      return;
    }
    const year = date.getFullYear();
    const currentYear = new Date().getFullYear();
    if (year < 1920 || year > currentYear) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Year must be between 1920 and ${currentYear}`,
      });
      return;
    }
    const today = new Date();
    let age = today.getFullYear() - year;
    const m = today.getMonth() - date.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < date.getDate())) {
      age--;
    }
    if (age < 16) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Applicant must be at least 16 years old",
      });
    }
  }),
  address: z.string().min(5, "Enter your address"),
  vehicleClass: z.enum(["Motorcycle", "Light Motor Vehicle", "Heavy Motor Vehicle"]),
});
type ApplicationForm = z.infer<typeof applicationSchema>;

interface PendingFile {
  file: File;
  type: string;
}

interface DocSpec {
  type: string;
  label: string;
  description: string;
  required: boolean;
}

const DOC_SPECS: Record<string, DocSpec[]> = {
  "Learner's License": [
    { type: "Identity Proof", label: "Identity Proof", description: "Aadhaar Card, PAN Card, Passport, or Voter ID", required: true },
    { type: "Address Proof", label: "Address Proof", description: "Aadhaar Card, Electricity Bill, or Ration Card", required: true },
    { type: "Age Proof", label: "Age Proof", description: "Birth Certificate, School Certificate, or Passport", required: true },
    { type: "Photograph", label: "Passport Photograph", description: "Recent passport-sized photo (JPG/PNG)", required: true },
    { type: "Medical", label: "Medical Certificate", description: "Form 1A self-declaration / doctor certificate", required: false },
  ],
  "Permanent License": [
    { type: "Learner's License", label: "Learner's License Copy", description: "Valid LL Number / Certificate copy", required: true },
    { type: "Identity Proof", label: "Identity Proof", description: "Aadhaar Card or PAN Card", required: true },
    { type: "Address Proof", label: "Address Proof", description: "Current residential address proof", required: true },
    { type: "Photograph", label: "Passport Photograph", description: "Recent passport-sized photo", required: true },
    { type: "Medical", label: "Medical Certificate", description: "Form 1A medical fitness certificate (optional)", required: false },
  ],
  "Commercial License": [
    { type: "Identity Proof", label: "Identity Proof", description: "Aadhaar Card or PAN Card", required: true },
    { type: "Address Proof", label: "Address Proof", description: "Permanent address proof", required: true },
    { type: "Age Proof", label: "Age Proof", description: "Birth Certificate or School Certificate", required: true },
    { type: "Photograph", label: "Passport Photograph", description: "Recent passport-sized photo", required: true },
    { type: "Medical", label: "Medical Certificate (Form 1A)", description: "Mandatory certified Doctor Medical Fitness report", required: true },
  ],
};

export default function NewApplicationPage() {
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ApplicationForm>({
    resolver: zodResolver(applicationSchema),
    defaultValues: { licenseType: "Learner's License", vehicleClass: "Motorcycle" },
  });
  const licenseType = watch("licenseType");
  const docSpecs = DOC_SPECS[licenseType] ?? DOC_SPECS["Learner's License"];

  const maxDobDateString = new Date(new Date().setFullYear(new Date().getFullYear() - 16))
    .toISOString()
    .split("T")[0];

  const onFilePick = (file: File | null, type: string) => {
    if (!file) return;
    setFiles((prev) => [...prev.filter((f) => f.type !== type), { file, type }]);
  };

  const removeFileForType = (type: string) => {
    setFiles((prev) => prev.filter((f) => f.type !== type));
  };

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    setLoading(true);
    try {
      const app = await applicationService.createApplication({
        type: values.licenseType,
        fee: FEE_MAP[values.licenseType] ?? 500,
        remarks: `Applicant: ${values.fullName}; DOB: ${values.dob}; Address: ${values.address}; Vehicle class: ${values.vehicleClass}`,
      });

      // Upload attached files, if any
      for (const pf of files) {
        try {
          await documentService.uploadDocument({
            applicationId: app.id,
            type: pf.type,
            file: pf.file,
          });
        } catch (err) {
          console.warn("Document upload failed:", err);
        }
      }

      setSubmitted(app.id);
      reset();
      setFiles([]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to submit application");
    } finally {
      setLoading(false);
    }
  });

  if (submitted) {
    return (
      <div>
        <PageHeader title="New Application" />
        <Card>
          <CardContent className="flex flex-col items-center py-14 text-center">
            <CheckCircle2 className="mb-3 h-12 w-12 text-success" />
            <h3 className="text-base font-semibold">Application submitted successfully</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Your application <span className="font-mono font-medium">{submitted}</span> has been submitted and
              is now under review. Track its status anytime from your Client Dashboard.
            </p>
            <div className="mt-6 flex gap-3">
              <Button onClick={() => setSubmitted(null)}>Submit another application</Button>
              <Button asChild variant="outline">
                <Link href="/client/dashboard">Go to Dashboard</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="New Application"
        description="Submit a new learner's, permanent, or commercial license application."
      />
      <Card>
        <CardHeader>
          <CardTitle>Application details</CardTitle>
          <CardDescription>Fill in your details accurately as per your identity documents</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>License type</Label>
                <Select
                  defaultValue="Learner's License"
                  onValueChange={(v) => setValue("licenseType", v as ApplicationForm["licenseType"])}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select license type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Learner's License">Learner&apos;s License</SelectItem>
                    <SelectItem value="Permanent License">Permanent License</SelectItem>
                    <SelectItem value="Commercial License">Commercial License</SelectItem>
                  </SelectContent>
                </Select>
                {errors.licenseType && (
                  <p className="text-xs text-destructive">{errors.licenseType.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Vehicle class</Label>
                <Select
                  defaultValue="Motorcycle"
                  onValueChange={(v) =>
                    setValue("vehicleClass", v as ApplicationForm["vehicleClass"])
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select vehicle class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Motorcycle">Motorcycle</SelectItem>
                    <SelectItem value="Light Motor Vehicle">Light Motor Vehicle</SelectItem>
                    <SelectItem value="Heavy Motor Vehicle">Heavy Motor Vehicle</SelectItem>
                  </SelectContent>
                </Select>
                {errors.vehicleClass && (
                  <p className="text-xs text-destructive">{errors.vehicleClass.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="fullName">Full name (as per ID)</Label>
                <Input id="fullName" placeholder="Rahul Kulkarni" {...register("fullName")} />
                {errors.fullName && <p className="text-xs text-destructive">{errors.fullName.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dob">Date of birth</Label>
                <Input
                  id="dob"
                  type="date"
                  min="1920-01-01"
                  max={maxDobDateString}
                  {...register("dob")}
                />
                {errors.dob ? (
                  <p className="text-xs text-destructive font-medium">{errors.dob.message}</p>
                ) : (
                  <p className="text-[11px] text-muted-foreground">Applicant must be at least 16 years old</p>
                )}
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="address">Residential address</Label>
                <Input
                  id="address"
                  placeholder="House no, street, city, state, PIN"
                  {...register("address")}
                />
                {errors.address && <p className="text-xs text-destructive">{errors.address.message}</p>}
              </div>
            </div>

            <div className="rounded-md bg-primary/5 p-3 text-xs text-primary-700 border border-primary/20">
              Application fee: <strong className="text-foreground">₹{FEE_MAP[licenseType] ?? 500}</strong>. A pending payment
              record will be created upon submission — pay it anytime from the Payments page.
            </div>

            {/* Document Upload UI Redesign */}
            <div className="space-y-3 pt-2">
              <div>
                <h4 className="text-sm font-semibold">Attach Supporting Documents</h4>
                <p className="text-xs text-muted-foreground">
                  Upload clear copies (PDF/JPG/PNG, max 10MB each). Mandatory documents are marked as necessary.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {docSpecs.map((spec) => {
                  const attached = files.find((f) => f.type === spec.type);
                  return (
                    <div
                      key={spec.type}
                      className={cn(
                        "flex flex-col justify-between rounded-lg border p-3 text-xs transition-colors",
                        spec.required ? "border-amber-500/30 bg-amber-500/5" : "border-border bg-card",
                        attached && "border-success/40 bg-success/5"
                      )}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-foreground">{spec.label}</span>
                          {spec.required ? (
                            <span className="rounded bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400">
                              Necessary Document
                            </span>
                          ) : (
                            <span className="rounded bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                              Optional Document
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-[11px] text-muted-foreground">{spec.description}</p>
                      </div>

                      <div className="mt-3">
                        {attached ? (
                          <div className="flex items-center justify-between rounded border border-success/30 bg-background p-2">
                            <span className="truncate text-foreground font-medium">
                              {attached.file.name} ({(attached.file.size / 1024).toFixed(0)} KB)
                            </span>
                            <button
                              type="button"
                              onClick={() => removeFileForType(spec.type)}
                              className="ml-2 rounded p-1 text-destructive hover:bg-destructive/10"
                              title="Remove file"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded border border-dashed border-border bg-background py-2 text-center text-xs font-medium hover:bg-muted transition-colors">
                            <UploadCloud className="h-3.5 w-3.5 text-primary" /> Attach {spec.label}
                            <input
                              type="file"
                              className="hidden"
                              accept="application/pdf,image/*"
                              onChange={(e) => {
                                onFilePick(e.target.files?.[0] ?? null, spec.type);
                                e.target.value = "";
                              }}
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  reset();
                  setFiles([]);
                }}
              >
                Reset
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Submit application
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
