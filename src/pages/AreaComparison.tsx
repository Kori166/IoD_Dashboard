// Code Sources and Provenance:
 // - npm (2026) framer-motion. Availble from: https://www.npmjs.com/package/framer-motion
 // - React (No Date) React. Available from: https://react.dev/
 // - Lucide (2026) Lucide. Available from: https://lucide.dev/
 // - Recharts (2026) Recharts. Available from: https://recharts.github.io/

import { useState } from "react";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/glass-card";
import { SectionHeader } from "@/components/ui/section-header";
import { KeyInsight } from "@/components/ui/key-insight";
import { areaSummaries, indicatorCategories, areaTimeseries } from "@/data/mockData";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip, LineChart, Line, XAxis, YAxis, Legend,
  BarChart, Bar, Cell,
} from "recharts";
import { X, Plus, ArrowUpDown } from "lucide-react";

const chartTooltipStyle = {
  backgroundColor: "hsl(220, 40%, 9%)",
  border: "1px solid hsl(220, 30%, 20%)",
  borderRadius: "8px",
  color: "hsl(210, 20%, 92%)",
  fontSize: 12,
};

const areaColors = ["hsl(190, 95%, 55%)", "hsl(260, 60%, 55%)", "hsl(310, 70%, 55%)", "hsl(35, 90%, 55%)"];

export default function AreaComparison() {
  const [selectedIds, setSelectedIds] = useState<string[]>(["LA001", "LA003", "LA013"]);

  const selectedAreas = selectedIds.map(id => areaSummaries.find(a => a.area_id === id)!).filter(Boolean);

  const toggleArea = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else if (selectedIds.length < 4) {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // Radar data
  const radarData = indicatorCategories.map(cat => {
    const point: Record<string, string | number> = { domain: cat.length > 8 ? cat.slice(0, 7) + "…" : cat };
    selectedAreas.forEach(area => {
      point[area.area_name] = Math.round(Math.random() * 80 + 20);
    });
    return point;
  });

  // Trend data
  const trendData = areaTimeseries
    .filter(t => selectedIds.includes(t.area_id))
    .reduce((acc, t) => {
      let entry = acc.find(e => e.date === t.date);
      if (!entry) {
        entry = { date: t.date };
        acc.push(entry);
      }
      const area = areaSummaries.find(a => a.area_id === t.area_id);
      if (area) entry[area.area_name] = t.deprivation_score;
      return acc;
    }, [] as Record<string, any>[])
    .sort((a, b) => a.date.localeCompare(b.date));

  // Bar comparison
  const barData = selectedAreas.map(area => ({
    name: area.area_name.length > 12 ? area.area_name.slice(0, 11) + "…" : area.area_name,
    score: area.deprivation_score,
    rank: area.deprivation_rank,
  }));

  // Auto-generated insight
  const insight = selectedAreas.length >= 2
    ? `${selectedAreas[0].area_name} scores ${Math.abs(selectedAreas[0].deprivation_score - selectedAreas[1].deprivation_score).toFixed(1)} points ${selectedAreas[0].deprivation_score > selectedAreas[1].deprivation_score ? "higher" : "lower"} than ${selectedAreas[1].area_name} in overall deprivation.`
    : "Select at least two areas to generate comparison insights.";

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <SectionHeader
          title="Area Comparison"
          subtitle="Compare deprivation profiles across multiple areas side by side"
        />
      </motion.div>

      {/*area selector*/}
      <GlassCard className="p-5">
        <div className="flex items-center gap-3 mb-3">
          <Plus className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-foreground">Select areas to compare (max 4)</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {areaSummaries.slice(0, 15).map(area => (
            <button
              key={area.area_id}
              onClick={() => toggleArea(area.area_id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                selectedIds.includes(area.area_id)
                  ? "bg-primary/15 text-primary border-primary/30"
                  : "bg-muted/20 text-muted-foreground border-border/50 hover:bg-muted/40"
              }`}
            >
              {area.area_name}
              {selectedIds.includes(area.area_id) && <X className="h-3 w-3 inline ml-1.5" />}
            </button>
          ))}
        </div>
      </GlassCard>
     
      {/*Scorecards*/}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {selectedAreas.map((area, i) => (
          <GlassCard key={area.area_id} glow={i === 0 ? "cyan" : i === 1 ? "violet" : "magenta"} className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: areaColors[i] }} />
              <h3 className="text-sm font-semibold text-foreground">{area.area_name}</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Score</span>
                <span className="font-mono font-bold text-primary">{area.deprivation_score}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Rank</span>
                <span className="font-mono">{area.deprivation_rank}/{areaSummaries.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Decile</span>
                <span className="font-mono">{area.deprivation_decile}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Region</span>
                <span className="text-xs">{area.region}</span>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      {/*Charts*/}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        //Radar
        <GlassCard className="p-6">
          <SectionHeader title="Indicator Profile" subtitle="Domain scores by area" />
          <div className="h-80 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(220, 30%, 16%)" />
                <PolarAngleAxis dataKey="domain" tick={{ fontSize: 10, fill: "hsl(215, 15%, 55%)" }} />
                <PolarRadiusAxis tick={{ fontSize: 9, fill: "hsl(215, 15%, 40%)" }} />
                <Tooltip contentStyle={chartTooltipStyle} />
                {selectedAreas.map((area, i) => (
                  <Radar
                    key={area.area_id}
                    name={area.area_name}
                    dataKey={area.area_name}
                    stroke={areaColors[i]}
                    fill={areaColors[i]}
                    fillOpacity={0.15}
                    strokeWidth={2}
                  />
                ))}
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/*Trends*/}
        <GlassCard className="p-6">
          <SectionHeader title="Score Trend" subtitle="Deprivation score over time" />
          <div className="h-80 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <XAxis dataKey="date" stroke="hsl(215, 15%, 35%)" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis stroke="hsl(215, 15%, 35%)" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {selectedAreas.map((area, i) => (
                  <Line
                    key={area.area_id}
                    type="monotone"
                    dataKey={area.area_name}
                    stroke={areaColors[i]}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>

      <KeyInsight insights={[insight]} />

      {/*Bar chart comparison*/}
      <GlassCard className="p-6">
        <SectionHeader title="Score Comparison" subtitle="Side-by-side deprivation scores" />
        <div className="h-48 mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData}>
              <XAxis dataKey="name" stroke="hsl(215, 15%, 35%)" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis stroke="hsl(215, 15%, 35%)" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                {barData.map((_, i) => (
                  <Cell key={i} fill={areaColors[i % areaColors.length]} opacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>
    </div>
  );
}
