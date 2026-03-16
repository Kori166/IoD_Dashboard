import { GlassCard } from "./glass-card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: "up" | "down" | "stable";
  glow?: "cyan" | "violet" | "magenta" | "none";
  className?: string;
}

export function MetricCard({ label, value, subtitle, icon: Icon, trend, glow = "cyan", className }: MetricCardProps) {
  return (
    <GlassCard glow={glow} className={cn("p-5", className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          {subtitle && (
            <p className={cn(
              "text-xs font-medium",
              trend === "up" && "text-destructive",
              trend === "down" && "text-success",
              trend === "stable" && "text-muted-foreground",
              !trend && "text-muted-foreground"
            )}>
              {subtitle}
            </p>
          )}
        </div>
        {Icon && (
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        )}
      </div>
    </GlassCard>
  );
}
