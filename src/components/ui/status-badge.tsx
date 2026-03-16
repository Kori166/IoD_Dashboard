import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: "active" | "pending" | "deprecated" | "fresh" | "stale";
  label?: string;
}

const statusConfig = {
  active: { bg: "bg-success/15", text: "text-success", dot: "bg-success" },
  fresh: { bg: "bg-success/15", text: "text-success", dot: "bg-success" },
  pending: { bg: "bg-warning/15", text: "text-warning", dot: "bg-warning" },
  stale: { bg: "bg-warning/15", text: "text-warning", dot: "bg-warning" },
  deprecated: { bg: "bg-destructive/15", text: "text-destructive", dot: "bg-destructive" },
};

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium", config.bg, config.text)}>
      <span className={cn("h-1.5 w-1.5 rounded-full animate-pulse-glow", config.dot)} />
      {label || status}
    </span>
  );
}
