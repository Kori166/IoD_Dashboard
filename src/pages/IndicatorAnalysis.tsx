import { useState } from "react";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/glass-card";
import { SectionHeader } from "@/components/ui/section-header";
import { KeyInsight } from "@/components/ui/key-insight";
import {
  allIndicators, indicatorCategories, indicatorValues,
  correlationMatrix, deprivationDistribution, areaSummaries
} from "@/data/mockData";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, Cell, AreaChart, Area,
} from "recharts";

const chartTooltipStyle = {
  backgroundColor: "hsl(220, 40%, 9%)",
  border: "1px solid hsl(220, 30%, 20%)",
  borderRadius: "8px",
  color: "hsl(210, 20%, 92%)",
  fontSize: 12,
};

// Mock indicator importance
const indicatorImportance = allIndicators.map(ind => ({
  name: ind.name.length > 20 ? ind.name.slice(0, 18) + "…" : ind.name,
  fullName: ind.name,
  category: ind.category,
  weight: Math.round(Math.random() * 100) / 10,
  change: Math.round((Math.random() - 0.5) * 4 * 10) / 10,
})).sort((a, b) => b.weight - a.weight).slice(0, 12);

// Mock scatter data
const scatterData = areaSummaries.map(a => ({
  x: Math.round(Math.random() * 80 * 10) / 10,
  y: a.deprivation_score,
  name: a.area_name,
}));

export default function IndicatorAnalysis() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredImportance = selectedCategory
    ? indicatorImportance.filter(i => i.category === selectedCategory)
    : indicatorImportance;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <SectionHeader
          title="Indicator Analysis"
          subtitle="Explore how public indicators contribute to the composite deprivation estimate"
        />
      </motion.div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
            !selectedCategory ? "bg-primary/15 text-primary border-primary/30" : "bg-muted/30 text-muted-foreground border-border/50 hover:bg-muted/50"
          }`}
        >
          All
        </button>
        {indicatorCategories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
              selectedCategory === cat ? "bg-primary/15 text-primary border-primary/30" : "bg-muted/30 text-muted-foreground border-border/50 hover:bg-muted/50"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>
      
      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar chart - indicator importance */}
        <GlassCard className="p-6">
          <SectionHeader title="Feature Importance" subtitle="Top 10 important features" />
          <div className="h-80 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={filteredImportance} layout="vertical" margin={{ left: 10, right: 20 }}>
                <XAxis type="number" stroke="hsl(215, 15%, 35%)" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" stroke="hsl(215, 15%, 35%)" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={120} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Bar dataKey="weight" radius={[0, 4, 4, 0]} fill="hsl(190, 95%, 55%)" opacity={0.8} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Scatter plot */}
        <GlassCard className="p-6">
          <SectionHeader title="Indicator vs Deprivation" subtitle="Universal Credit Claims vs Overall Score" />
          <div className="h-80 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ bottom: 10 }}>
                <XAxis dataKey="x" name="Indicator" stroke="hsl(215, 15%, 35%)" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} label={{ value: "Indicator Value", position: "bottom", fill: "hsl(215, 15%, 45%)", fontSize: 11 }} />
                <YAxis dataKey="y" name="Score" stroke="hsl(215, 15%, 35%)" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} label={{ value: "Deprivation Score", angle: -90, position: "insideLeft", fill: "hsl(215, 15%, 45%)", fontSize: 11 }} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Scatter data={scatterData}>
                  {scatterData.map((_, i) => (
                    <Cell key={i} fill={`hsl(${190 + (i * 3) % 120}, 70%, 55%)`} opacity={0.6} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>

      {/* Distribution + Correlation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribution */}
        <GlassCard className="p-6">
          <SectionHeader title="Score Distribution" subtitle="Density of deprivation scores across areas" />
          <div className="h-64 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={deprivationDistribution}>
                <defs>
                  <linearGradient id="distGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(190, 95%, 55%)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(190, 95%, 55%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="distGrad2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(260, 60%, 55%)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(260, 60%, 55%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="score" stroke="hsl(215, 15%, 35%)" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis stroke="hsl(215, 15%, 35%)" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Area type="monotone" dataKey="count" stroke="hsl(190, 95%, 55%)" fill="url(#distGrad)" strokeWidth={2} name="All Areas" />
                <Area type="monotone" dataKey="countUrban" stroke="hsl(260, 60%, 55%)" fill="url(#distGrad2)" strokeWidth={1.5} name="Urban" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Correlation Heatmap */}
        <GlassCard className="p-6">
          <SectionHeader title="Correlation Matrix" subtitle="Inter-indicator domain correlations" />
          <div className="mt-4 overflow-x-auto">
            <div className="min-w-[400px]">
              <div className="grid gap-0.5" style={{ gridTemplateColumns: `80px repeat(${indicatorCategories.length}, 1fr)` }}>
                <div />
                {indicatorCategories.map(cat => (
                  <div key={cat} className="text-[9px] text-muted-foreground text-center font-medium truncate px-0.5">
                    {cat.slice(0, 5)}
                  </div>
                ))}
                {correlationMatrix.map((row, i) => (
                  <>
                    <div key={`label-${i}`} className="text-[9px] text-muted-foreground font-medium flex items-center truncate">
                      {indicatorCategories[i].slice(0, 8)}
                    </div>
                    {row.map((val, j) => (
                      <div
                        key={`${i}-${j}`}
                        className="aspect-square rounded-sm flex items-center justify-center text-[9px] font-mono"
                        style={{
                          backgroundColor: `hsl(${190 + val * 70}, ${40 + val * 40}%, ${15 + val * 20}%)`,
                          color: val > 0.6 ? "hsl(210, 20%, 92%)" : "hsl(215, 15%, 50%)",
                        }}
                        title={`${indicatorCategories[i]} × ${indicatorCategories[j]}: ${val}`}
                      >
                        {val.toFixed(1)}
                      </div>
                    ))}
                  </>
                ))}
              </div>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Ranked Table */}
      <GlassCard className="p-6">
        <SectionHeader title="Indicator Table" subtitle="All indicators ranked by estimated contribution weight" />
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left py-2 px-3 text-xs text-muted-foreground font-medium">Indicator</th>
                <th className="text-left py-2 px-3 text-xs text-muted-foreground font-medium">Category</th>
                <th className="text-right py-2 px-3 text-xs text-muted-foreground font-medium">Weight</th>
                <th className="text-right py-2 px-3 text-xs text-muted-foreground font-medium">Change</th>
              </tr>
            </thead>
            <tbody>
              {indicatorImportance.map((ind, i) => (
                <tr key={i} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                  <td className="py-2.5 px-3 font-medium text-foreground">{ind.fullName}</td>
                  <td className="py-2.5 px-3 text-muted-foreground">{ind.category}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-primary">{ind.weight}</td>
                  <td className={`py-2.5 px-3 text-right font-mono ${ind.change > 0 ? "text-destructive" : "text-success"}`}>
                    {ind.change > 0 ? "+" : ""}{ind.change}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>

      <KeyInsight insights={[
        "Income and Employment indicators have the highest average weight in the composite score.",
        "Housing and Access to Services show the most geographic variance."
      ]} />
    </div>
  );
}
