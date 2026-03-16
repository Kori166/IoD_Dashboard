import { Lightbulb } from "lucide-react";
import { GlassCard } from "./glass-card";

interface KeyInsightProps {
  insights: string[];
}

export function KeyInsight({ insights }: KeyInsightProps) {
  return (
    <GlassCard glow="violet" className="p-4">
      <div className="flex items-start gap-3">
        <div className="p-1.5 rounded-md bg-secondary/20 mt-0.5">
          <Lightbulb className="h-4 w-4 text-secondary" />
        </div>
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-secondary">Key Insight</p>
          {insights.map((insight, i) => (
            <p key={i} className="text-sm text-muted-foreground leading-relaxed">{insight}</p>
          ))}
        </div>
      </div>
    </GlassCard>
  );
}
