"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, Loader2, UploadCloud, AlertCircle, X } from "lucide-react";
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
  dob: z.string().min(1, "Enter your date of birth"),
  address: z.string().min(5, "Enter your address"),
  vehicleClass: z.enum(["Motorcycle", "Light Motor Vehicle", "Heavy Motor Vehicle"]),
});
type ApplicationForm = z.infer<typeof applicationSchema>;

interface PendingFile {
  file: File;
  type: string;
}

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

  const onFilePick = (list: FileList | null, type: string) => {
    if (!list) return;
    const arr = Array.from(list).map((f) => ({ file: f, type }));
    setFiles((prev) => [...prev, ...arr]);
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
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
          // Non-fatal — user can retry from Documents page
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
              Your application <span className="font-mono">{submitted}</span> has been submitted and
              is now under review. You&apos;ll be notified once a staff member is assigned.
            </p>
            <div className="mt-6 flex gap-3">
              <Button onClick={() => setSubmitted(null)}>Submit another application</Button>
              <Button asChild variant="outline">
                <Link href="/client/applications">View my applications</Link>
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
          <form onSubmit={onSubmit} className="space-y-5">
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
                <Input id="dob" type="date" {...register("dob")} />
                {errors.dob && <p className="text-xs text-destructive">{errors.dob.message}</p>}
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

            <div className="rounded-md bg-primary/5 px-3 py-2 text-xs text-primary-700">
              Application fee: <strong>₹{FEE_MAP[licenseType] ?? 500}</strong>. A pending payment
              record will be created after submission — pay it from the Payments page.
            </div>

            <div className="space-y-1.5">
              <Label>Upload documents (optional)</Label>
              <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-secondary/30 px-6 py-8 text-center">
                <UploadCloud className="mb-3 h-8 w-8 text-primary-500" />
                <p className="text-sm font-medium">Attach supporting documents (PDF/JPG/PNG, max 10MB each)</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  You can also upload them later from the Documents page.
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {["Identity Proof", "Address Proof", "Photograph", "Medical", "Age Proof"].map(
                    (t) => (
                      <label
                        key={t}
                        className="cursor-pointer rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted"
                      >
                        + {t}
                        <input
                          type="file"
                          className="hidden"
                          accept="application/pdf,image/*"
                          onChange={(e) => {
                            onFilePick(e.target.files, t);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    ),
                  )}
                </div>
              </div>
              {files.length > 0 && (
                <ul className="mt-2 space-y-1 text-xs">
                  {files.map((f, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between rounded-md border border-border px-2 py-1"
                    >
                      <span className="truncate">
                        <strong>{f.type}:</strong> {f.file.name} ({(f.file.size / 1024).toFixed(0)}{" "}
                        KB)
                      </span>
                      <button
                        type="button"
                        className="rounded-md p-1 hover:bg-muted"
                        onClick={() => removeFile(i)}
                        aria-label="Remove file"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex justify-end gap-3">
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
