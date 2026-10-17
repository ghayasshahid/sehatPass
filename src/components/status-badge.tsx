import { Badge } from "@/components/ui/badge";
import type { ConfirmationStatus } from "@/lib/types";

const styles: Record<ConfirmationStatus, string> = {
  proposed: "border-border bg-muted text-foreground",
  confirmed: "border-primary/30 bg-secondary text-secondary-foreground",
  unresolved: "border-destructive/40 bg-card text-destructive",
};

const labels: Record<ConfirmationStatus, string> = {
  proposed: "Proposed",
  confirmed: "Confirmed",
  unresolved: "Unresolved",
};

export function StatusBadge({ status }: { status: ConfirmationStatus }) {
  return (
    <Badge variant="outline" className={`h-6 px-2 text-xs font-semibold ${styles[status]}`}>
      {labels[status]}
    </Badge>
  );
}
