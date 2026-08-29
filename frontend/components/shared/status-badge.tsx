import { cn } from "@/lib/utils";
import { STATUS_COLORS } from "@/lib/constants";

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        STATUS_COLORS[status] ?? "border-border bg-muted text-muted-foreground"
      )}
    >
      {status}
    </span>
  );
}
