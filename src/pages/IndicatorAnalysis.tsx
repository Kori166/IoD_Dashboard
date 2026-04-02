import { useState, useMemo } from "react";
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
  ScatterChart, Scatter, Cell, Line, AreaChart, Area, ComposedChart,
  Label,
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
})).sort((a, b) => b.weight - a.weight).slice(0, 10);

// Mock scatter data
const scatterData = areaSummaries.map(a => ({
  x: a.deprivation_score,
  y: Math.round(Math.random() * 80 * 10) / 10,
  name: a.area_name,
}))
.sort((a,b) => a.x - b.x);

// Spearman 
const getSpearman = (data) => {
  const rank = (arr) => {
    const sorted = [...arr]
      .map((v, i) => ({ v, i }))
      .sort((a, b) => a.v - b.v);

    const ranks = Array(arr.length);
    sorted.forEach((item, idx) => {
      ranks[item.i] = idx + 1;
    });

    return ranks;
  };

  const xRanks = rank(data.map(d => d.x));
  const yRanks = rank(data.map(d => d.y));

  const n = data.length;

  const dSquaredSum = xRanks.reduce((sum, r, i) => {
    const d = r - yRanks[i];
    return sum + d * d;
  }, 0);

  return 1 - (6 * dSquaredSum) / (n * (n * n - 1));
};

// LOWESS 
const lowess = (data, bandwidth = 0.3) => {
  const sorted = [...data].sort((a, b) => a.x - b.x);
  const n = sorted.length;
  const result = [];

  const tricube = (t) => {
    const absT = Math.abs(t);
    if (absT >= 1) return 0;
    return Math.pow(1 - Math.pow(absT, 3), 3);
  };

  for (let i = 0; i < n; i++) {
    const x0 = sorted[i].x;

    const distances = sorted.map(d => Math.abs(d.x - x0));
    const maxDist = distances.sort((a, b) => a - b)[Math.floor(bandwidth * n)];

    let sumWeights = 0;
    let sumWX = 0;
    let sumWY = 0;

    for (let j = 0; j < n; j++) {
      const dist = Math.abs(sorted[j].x - x0) / maxDist;
      const w = tricube(dist);

      sumWeights += w;
      sumWX += w * sorted[j].x;
      sumWY += w * sorted[j].y;
    }

    const y0 = sumWY / sumWeights;

    result.push({ x: x0, y: y0 });
  }

  return result;
};

export default function IndicatorAnalysis() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const processed = useMemo(() => {
    const sorted = [...scatterData].sort((a, b) => a.x - b.x);

    return {
      sortedData: sorted,
      lowessLine: lowess(sorted, 0.3),
      rho: getSpearman(sorted),
    };
  }, [scatterData]);

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
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* Insights */}
        <div className="lg:col-span-2">
          <KeyInsight insights={[
            "Income and Employment indicators have the highest average weight in the composite score.",
            "Housing and Access to Services show the most geographic variance.",
            "More Interesting Facts",
            "more",
            "MORE",
            "Have another"
          ]} />
        </div>

        {/* Top 5 indicator table */}
        <GlassCard className="p-4">
          <SectionHeader
            title="Top 5 Indicators"
            subtitle="Highest contribution weights"
          />

          <div className="mt-3">
            <table className="w-full text-xs">
              <tbody>
                {indicatorImportance.slice(0, 5).map((ind, i) => (
                  <tr key={i} className="border-b border-border/30">
                    <td className="py-1 pr-2 truncate">{ind.fullName}</td>
                    <td className="py-1 text-right font-mono text-primary">
                      {ind.weight}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>

      </div>

      {/* Row 1 - feature importance & score dist */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Feature Importance */}
        <GlassCard className="p-6">
          <SectionHeader title="Feature Importance" subtitle="Top 10 most important features" />
          <div className="h-80 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={filteredImportance} layout="vertical" margin={{right: 20, left : 10}}>
                <XAxis type="number" stroke="hsl(215, 15%, 35%)" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="fullName" width={120} stroke="hsl(215, 15%, 35%)" tick={{fontSize: 10}} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Bar dataKey="weight" radius={[0, 4, 4, 0]} fill="hsl(190, 95%, 55%)" opacity={0.8} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Score Distribution */}
        <GlassCard className="p-6">
          <SectionHeader title="Score Distribution" subtitle="Density of deprivation scores across areas" />
          <div className="h-80 mt-4">
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
      </div>

      {/* Indicator v Dep & Cor Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

        {/* Indicator Scatter */}
<GlassCard className="p-6">
  <SectionHeader
    title="Indicator vs Deprivation"
    subtitle="Impact of Universal Credit Claims on Deprivation Scores"
  />

  <div className="h-80 mt-4">
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart margin={{ bottom: 10 }}>
        <XAxis
          type="number"
          dataKey="x"
          domain={['dataMin', 'dataMax']}
          stroke="hsl(215, 15%, 35%)"
          tick={{ fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        >
          <Label
           value="Number of Universal Credit Claimants"
           position="insideBottom"
           offset={-5}
           style={{textAnchor: "middle", fill: "hsl(215, 15%, 65%", fontSize: 12}}
          />
        </XAxis>
        <YAxis
          type="number"
          dataKey="y"
          stroke="hsl(215, 15%, 35%)"
          tick={{ fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        >
         <Label
           value="Deprivation Score"
           angle={-90}
           position="insideLeft"
           style={{textAnchor: "middle", fill:"hsl(215, 15%, 65%", fontSize: 12}}
         />
        </YAxis>
        <Tooltip contentStyle={chartTooltipStyle} />

        {/* Scatter points */}
        <Scatter data={processed.sortedData}>
          {processed.sortedData.map((_, i) => (
            <Cell
              key={i}
              fill={`hsl(${190 + (i * 3) % 120}, 70%, 55%)`}
              opacity={0.6}
            />
          ))}
        </Scatter>

        {/* ✅ LOWESS line */}
        <Line
          type="monotone"
          data={processed.lowessLine}
          dataKey="y"
          stroke="white"
          dot={false}
          strokeWidth={2}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  </div>

  {/* Spearman correlation */}
  <div className="text-xs text-muted-foreground mt-2">
    Spearman’s ρ: {processed.rho.toFixed(2)}
  </div>
</GlassCard>

        {/* Correlation Matrix */}
        <GlassCard className="p-6">
          <SectionHeader
            title="Correlation Matrix"
            subtitle="Correlation between individual domains"
          />

          <div className="mt-4 overflow-x-auto">
            <div className="min-w-[600px]">
              <div
                className="grid gap-0.5"
                style={{
                  gridTemplateColumns: `80px repeat(${indicatorCategories.length}, 90px)`
                }}
              >
                <div />

                {indicatorCategories.map(cat => (
                  <div
                    key={cat}
                    className="text-[9px] text-muted-foreground text-center font-medium px-1 origin-bottom whitespace-nowrap"
                  >
                    {cat}
                  </div>
                ))}

                {correlationMatrix.map((row, i) => (
                  <div key={i} className="contents">
                    <div className="text-[9px] text-muted-foreground font-medium flex items-center pr-2 whitespace-normal break-words">
                      {indicatorCategories[i]}
                    </div>

                    {row.map((val, j) => (
                      <div
                        key={`${i}-${j}`}
                        className="aspect-square rounded-sm flex items-center justify-center text-[9px] font-mono"
                        style={{
                          backgroundColor: `hsl(${190 + val * 70}, ${40 + val * 40}%, ${15 + val * 20}%)`,
                          color: val > 0.6
                            ? "hsl(210, 20%, 92%)"
                            : "hsl(215, 15%, 50%)",
                        }}
                        title={`${indicatorCategories[i]} × ${indicatorCategories[j]}: ${val}`}
                      >
                        {val.toFixed(1)}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </GlassCard>

      </div>
    </div>
  );
}
