// Code Sources and Provenance:
 //- Meta OpenSource (No Date) useState. Available from: https://react.dev/reference/react/useState 
 //- Meta OpenSource (No Date) useMemo. Available from: https://react.dev/reference/react/useMemo
 //- npm (2026) framer-motion. Availble from: https://www.npmjs.com/package/framer-motion
 //- Recharts (2026) Recharts. Available from: https://recharts.github.io/
 //- geeksforgeeks (2025) Introduction to Tailwind CSS. Available from: https://www.geeksforgeeks.org/css/introduction-to-tailwind-css/

// Import libraries 
import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/glass-card";
import { SectionHeader } from "@/components/ui/section-header";
import {
  allIndicators, indicatorCategories,
  correlationMatrix, areaSummaries
} from "@/data/mockData";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Scatter, Cell, Line, ComposedChart,
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
    <div className="space-y-8 w-full">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
       <h1 className="text-4xl md:text-4xl font-bold text-foreground tracking-tight">
          Feature Analysis     
        </h1>
        <p className="text-muted-foreground text-lg md:text-xl leading-relaxed">
          Explore how public indicators contribute to the composite deprivation estimate
        </p>
      </motion.div>
{/* Category filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-3 py-1.5 rounded-lg text-lg font-medium transition-colors border ${
            !selectedCategory ? "bg-primary/15 text-primary border-primary/30" : "bg-muted/30 text-muted-foreground border-border/50 hover:bg-muted/50"
          }`}
        >
          All
        </button>
        {indicatorCategories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-lg font-medium transition-colors border ${
              selectedCategory === cat ? "bg-primary/15 text-primary border-primary/30" : "bg-muted/30 text-muted-foreground border-border/50 hover:bg-muted/50"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Row 1 - feature importance & score dist */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Feature Importance */}
        <GlassCard className="p-6">
          <SectionHeader title="Feature Importance" subtitle="Top 10 most important features" />
          <div className="mt-4 flex justify-center items-center h-[450px]">
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
 {/* Correlation Matrix */}
        <GlassCard className="p-6">
          <SectionHeader
            title="Correlation Matrix"
            subtitle="Correlation between individual domains"
          />

          <div className="mt-4 flex justify-center">
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

      {/* Indicator v Dep & Cor Matrix */}
      <div>

        {/* Indicator Scatter */}
<GlassCard className="p-6">
  <SectionHeader
    title="Indicator vs Deprivation"
    subtitle="Impact of Universal Credit Claims on Deprivation Scores"
  />

  <div className="h-80 mt-4 flex justify-center">
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart margin={{ top: 10, right: 30, left: 10, bottom: 30 }}>
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
           style={{textAnchor: "middle", fill: "hsl(215, 15%, 65%)", fontSize: 12}}
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
           style={{textAnchor: "middle", fill:"hsl(215, 15%, 65%)", fontSize: 12}}
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
  <div className="text-sm text-muted-foreground mt-2">
    Spearman’s ρ: {processed.rho.toFixed(2)}
  </div>
</GlassCard>
      </div>
    </div>
  );
}
