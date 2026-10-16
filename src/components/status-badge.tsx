import { Badge } from "@/components/ui/badge";
import type { ConfirmationStatus } from "@/lib/types";

const styles: Record<ConfirmationStatus, string> = {
  proposed: "border-sky-200 bg-sky-100 text-sky-950",
  confirmed: "border-teal-200 bg-teal-100 text-teal-950",
  unresolved: "border-amber-300 bg-amber-100 text-amber-950",
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
