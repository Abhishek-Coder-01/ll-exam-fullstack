import { Check, Clock, AlertTriangle, FileText, UserCheck, ShieldCheck, Award, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ApplicationStatus, TimelineStep } from "@/types";

export const STAGES = [
  {
    key: "submitted",
    label: "Submitted",
    description: "Application received successfully",
    icon: FileText,
  },
  {
    key: "review",
    label: "Under Review",
    description: "Staff assigned & verifying details",
    icon: UserCheck,
  },
  {
    key: "verified",
    label: "Documents Verified",
    description: "All documents checked & approved",
    icon: ShieldCheck,
  },
  {
    key: "approved",
    label: "Final Approval",
    description: "Approved by RTO officer / TL",
    icon: Award,
  },
  {
    key: "completed",
    label: "Completed",
    description: "License generated & issued",
    icon: CheckCircle2,
  },
];

export function getStageIndex(status?: ApplicationStatus): number {
  if (!status) return 0;
  switch (status) {
    case "Submitted":
      return 0;
    case "Waiting for Staff":
    case "Assigned Staff":
    case "Assigned":
    case "Under Review":
    case "In Progress":
      return 1;
    case "Verified":
      return 2;
    case "Approved":
      return 3;
    case "Completed":
      return 4;
    case "Rejected":
    case "Cancelled":
      return -1;
    default:
      return 0;
  }
}

interface ApplicationTimelineProps {
  steps?: TimelineStep[];
  status?: ApplicationStatus;
  submittedOn?: string;
  assignedStaff?: string;
  remarks?: string;
  className?: string;
}

export function ApplicationTimeline({
  steps,
  status = "Submitted",
  submittedOn,
  assignedStaff,
  remarks,
  className,
}: ApplicationTimelineProps) {
  // If status is Rejected or Cancelled
  if (status === "Rejected" || status === "Cancelled") {
    return (
      <div className={cn("rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-xs", className)}>
        <div className="flex items-center gap-2.5 text-destructive font-semibold text-sm">
          <XCircle className="h-5 w-5 shrink-0" />
          <span>Application {status}</span>
        </div>
        <p className="mt-1 text-muted-foreground">
          {status === "Rejected"
            ? "Your application was reviewed and rejected. Please review feedback or submit a new application with updated documents."
            : "This application has been cancelled."}
        </p>
        {status === "Rejected" && remarks && (
          <p className="mt-3 rounded-md border border-destructive/20 bg-background/70 px-3 py-2 text-sm text-foreground">
            <strong>Reason:</strong> {remarks}
          </p>
        )}
      </div>
    );
  }

  const currentStageIdx = getStageIndex(status);
  const progressPercent = Math.round(((currentStageIdx + 1) / STAGES.length) * 100);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Progress Header */}
      <div className="flex items-center justify-between text-xs font-medium">
        <span className="text-muted-foreground">
          Current Stage: <strong className="text-foreground">{STAGES[currentStageIdx]?.label ?? status}</strong>
        </span>
        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 font-semibold text-primary">
          {progressPercent}% Tracked
        </span>
      </div>

      {/* Progress Bar */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full bg-primary transition-all duration-500 ease-in-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Timeline Steps */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
        {STAGES.map((stage, idx) => {
          const isCompleted = idx < currentStageIdx || (status === "Completed" && idx === currentStageIdx);
          const isCurrent = idx === currentStageIdx && status !== "Completed";
          const isUpcoming = idx > currentStageIdx;
          const Icon = stage.icon;

          // Check if custom steps date was passed for step 0
          const customStep = steps?.[idx];
          const stepDate = customStep?.date || (idx === 0 ? submittedOn : undefined);

          return (
            <div
              key={stage.key}
              className={cn(
                "relative flex flex-col justify-between rounded-lg border p-3 transition-all",
                isCurrent && "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20",
                isCompleted && "border-success/40 bg-success/5",
                isUpcoming && "border-border/60 bg-muted/20 opacity-70"
              )}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors",
                      isCompleted && "bg-success text-success-foreground",
                      isCurrent && "bg-primary text-primary-foreground animate-pulse",
                      isUpcoming && "bg-muted text-muted-foreground"
                    )}
                  >
                    {isCompleted ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                  </div>

                  <span
                    className={cn(
                      "text-[10px] font-semibold uppercase tracking-wider",
                      isCompleted && "text-success",
                      isCurrent && "text-primary font-bold",
                      isUpcoming && "text-muted-foreground"
                    )}
                  >
                    {isCompleted ? "Done" : isCurrent ? "Active" : `Step ${idx + 1}`}
                  </span>
                </div>

                <div className="mt-2.5">
                  <p className={cn("text-xs font-semibold", isCurrent ? "text-primary" : "text-foreground")}>
                    {stage.label}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">
                    {stage.description}
                  </p>
                </div>
              </div>

              {isCurrent && assignedStaff && idx === 1 && (
                <div className="mt-2.5 rounded bg-background/80 px-2 py-1 text-[10px] text-muted-foreground border border-border">
                  Assigned to: <strong className="text-foreground">{assignedStaff}</strong>
                </div>
              )}

              {stepDate && (
                <div className="mt-2 text-[10px] text-muted-foreground">
                  {stepDate}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

