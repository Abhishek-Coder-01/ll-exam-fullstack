import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TimelineStep } from "@/types";

export function ApplicationTimeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start">
      {steps.map((step, i) => (
        <div key={step.label} className="flex flex-1 sm:flex-col sm:items-center">
          <div className="flex flex-col items-center sm:contents">
            <div
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold",
                step.status === "completed" && "border-success bg-success text-success-foreground",
                step.status === "current" && "border-primary bg-primary text-primary-foreground",
                step.status === "upcoming" && "border-border bg-card text-muted-foreground"
              )}
            >
              {step.status === "completed" ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "sm:mt-0 sm:h-0.5 sm:w-full sm:flex-1 my-1 h-8 w-0.5 flex-1",
                  step.status === "completed" ? "bg-success" : "bg-border"
                )}
              />
            )}
          </div>
          <div className="ml-3 mb-3 sm:ml-0 sm:mt-2 sm:text-center">
            <p
              className={cn(
                "text-xs font-medium",
                step.status === "upcoming" ? "text-muted-foreground" : "text-foreground"
              )}
            >
              {step.label}
            </p>
            {step.date && <p className="text-[11px] text-muted-foreground">{step.date}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
