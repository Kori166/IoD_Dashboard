import { motion } from "framer-motion";
import { BarChart3, MapPin, RefreshCw, Layers, TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import { MetricCard } from "@/components/ui/metric-card";
import { GlassCard } from "@/components/ui/glass-card";
import { KeyInsight } from "@/components/ui/key-insight";
import { SectionHeader } from "@/components/ui/section-header";
import { areaSummaries, areaTimeseries } from "@/data/mockData";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { Link } from "react-router-dom";

const trendData = [
  { month: "Oct", score: 42.3 },
  { month: "Nov", score: 43.1 },
  { month: "Dec", score: 41.8 },
  { month: "Jan", score: 44.2 },
  { month: "Feb", score: 43.7 },
  { month: "Mar", score: 44.5 },
];

const mostDeprived = areaSummaries.slice(0, 5);
const leastDeprived = [...areaSummaries].sort((a, b) => a.deprivation_score - b.deprivation_score).slice(0, 5);

export default function Overview() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="space-y-3"
      >
        <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
          Replicating the Index of Deprivation for{" "}
          <span className="text-primary glow-text-cyan">Bristol</span>
        </h1>
        <p className="text-muted-foreground max-w-2xl text-base leading-relaxed">
          Estimating the Index of Multiple Deprivation for Bristol using only publicly available datasets to reduce reliance on expensive surveys while maintaining analytical fidelity.
        </p>
      </motion.div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Indicators" value="24" subtitle="Across 8 domains" icon={BarChart3} glow="cyan" />
        <MetricCard label="LSOAs Covered" value="267" subtitle="LSOAs" icon={MapPin} glow="violet" />
        <MetricCard label="Last Refresh" value="Mar 19 2026" subtitle="Pipeline v2.3" icon={RefreshCw} glow="cyan" />
        <MetricCard label="Model Version" value="2.3.1" subtitle="Weighted composite" icon={Layers} glow="magenta" />
      </div>
    
      {/* Trend Chart + Rankings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend */}
        <GlassCard className="lg:col-span-2 p-6">
          <SectionHeader title="Deprivation Score Trend" subtitle="National average over recent months" />
          <div className="h-64 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(190, 95%, 55%)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(190, 95%, 55%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke="hsl(215, 15%, 35%)" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis stroke="hsl(215, 15%, 35%)" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} domain={[38, 48]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(220, 40%, 9%)",
                    border: "1px solid hsl(220, 30%, 20%)",
                    borderRadius: "8px",
                    color: "hsl(210, 20%, 92%)",
                    fontSize: 12,
                  }}
                />
                <Area type="monotone" dataKey="score" stroke="hsl(190, 95%, 55%)" strokeWidth={2} fill="url(#scoreGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Rankings */}
        <GlassCard className="p-6">
          <SectionHeader title="Area Rankings" subtitle="Highest and lowest deprived areas in Bristol." />
          <div className="mt-4 space-y-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-destructive font-medium mb-2 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> Most Deprived
              </p>
              <div className="space-y-1.5">
                {mostDeprived.map((area, i) => (
                  <div key={area.area_id} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      <span className="text-foreground font-medium">{i + 1}.</span> {area.area_name}
                    </span>
                    <span className="text-destructive font-mono text-xs">{area.deprivation_score}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="border-t border-border/50 pt-4">
              <p className="text-xs uppercase tracking-wider text-success font-medium mb-2 flex items-center gap-1">
                <TrendingDown className="h-3 w-3" /> Least Deprived
              </p>
              <div className="space-y-1.5">
                {leastDeprived.map((area, i) => (
                  <div key={area.area_id} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      <span className="text-foreground font-medium">{i + 1}.</span> {area.area_name}
                    </span>
                    <span className="text-success font-mono text-xs">{area.deprivation_score}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Key Insight */}
      <KeyInsight insights={[
        "- Tower Hamlets and Knowsley show the highest estimated deprivation scores, consistent with official IMD rankings.",
        "- Housing and Income indicators contribute most to score variance across Local Authorities."
      ]} />

      {/* Why This Matters */}
      <GlassCard className="p-6">
        <SectionHeader title="Why This Matters" />
        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-primary">Cost Reduction</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Official deprivation indices rely on expensive survey-based data collection. Our approach uses freely available public datasets to approximate these measures.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-secondary">Timeliness</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The official IMD is updated roughly every 4-5 years. Our pipeline can refresh indicators monthly, providing near real-time deprivation estimates.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-accent">Transparency</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Every data source is publicly available. The methodology is open and reproducible, enabling scrutiny and community contributions.
            </p>
          </div>
        </div>
      </GlassCard>

      {/* Explore CTA */}
      <div className="flex gap-4">
        <Link to="/map" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary/15 text-primary text-sm font-medium hover:bg-primary/25 transition-colors border border-primary/20">
          Explore the Map <ArrowRight className="h-4 w-4" />
        </Link>
        <Link to="/indicators" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-secondary/15 text-secondary text-sm font-medium hover:bg-secondary/25 transition-colors border border-secondary/20">
          Analyze Indicators <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
