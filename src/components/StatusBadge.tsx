import { STATUS_LABEL, cn } from "@/lib/utils";

const color: Record<string, string> = {
  pending: "bg-warning/15 text-amber-300 border-warning/30",
  approved: "bg-success/15 text-green-300 border-success/30",
  active: "bg-success/15 text-green-300 border-success/30",
  live: "bg-danger/15 text-red-300 border-danger/30",
  rejected: "bg-danger/15 text-red-300 border-danger/30",
  suspended: "bg-danger/15 text-red-300 border-danger/30",
  upcoming: "bg-brand/15 text-brand-light border-brand/30",
};

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-block rounded-md border px-2 py-0.5 text-xs font-semibold",
        color[status] ?? "border-edge bg-raised text-muted",
      )}
    >
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}
