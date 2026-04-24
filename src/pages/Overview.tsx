// Code Sources and Provenance:
 // - Meta OpenSource (no date) useEffect. Available from: https://react.dev/reference/react/useEffect
 // - Meta OpenSource (No Date) useState. Available from: https://react.dev/reference/react/useState 
 // - Meta OpenSource (No Date) useMemo. Available from: https://react.dev/reference/react/useMemo
 // - npm (2026) framer-motion. Availble from: https://www.npmjs.com/package/framer-motion
 // - React (No Date) React. Available from: https://react.dev/
 // - Lucide (2026) Lucide. Available from: https://lucide.dev/
 // - geeksforgeeks (2025) Introduction to Tailwind CSS. Available from: https://www.geeksforgeeks.org/css/introduction-to-tailwind-css/


import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  MapPin,
  RefreshCw,
  Layers,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { MetricCard } from "@/components/ui/metric-card";
import { GlassCard } from "@/components/ui/glass-card";
import { KeyInsight } from "@/components/ui/key-insight";
import { SectionHeader } from "@/components/ui/section-header";
import BristolChoropleth from "@/components/maps/BristolChoropleth";
import { Link } from "react-router-dom";

// Shape of each deprivation row loaded from the Bristol IMD JSON file.
type BristolIMDRow = {
  lsoa_code: string;
  lsoa_name: string;
  imd_score: number;
  uk_rank: number;
  uk_decile: number;
  bristol_rank: number;
  bristol_decile: number;
  ward_name: string;
  ward_lsoa: string;
};

// Decile palette aligned with the dashboard legend.
const DECILE_COLORS: Record<number, string> = {
  1: "#F4EFFA",
  2: "#E6DAF6",
  3: "#D2BDF0",
  4: "#BE9BE8",
  5: "#A378DE",
  6: "#845EC9",
  7: "#5E5AB8",
  8: "#395F97",
  9: "#286379",
  10: "#429B7E",
};

export default function Overview() {
  // Stores the full set of IMD rows used across the page.
  const [imdRows, setImdRows] = useState<BristolIMDRow[]>([]);

  // Controls whether rankings are shown relative to Bristol or the whole UK.
  const [rankMode, setRankMode] = useState<"bristol" | "uk">("bristol");

  // Shared hover state so the profile bars and map legend can both highlight the map.
  const [hoveredDecile, setHoveredDecile] = useState<number | null>(null);

  // Load the IMD data once when the page first renders.
  useEffect(() => {
    async function load() {
      const res = await fetch("/data/bristol_imd.json");
      const data = await res.json();
      setImdRows(data);
    }

    load();
  }, []);

  // Sort rows by the currently selected ranking mode so the top/bottom lists
  // can be derived from one shared ordered dataset.
  const sortedRows = useMemo(() => {
    return [...imdRows].sort((a, b) =>
      rankMode === "bristol"
        ? a.bristol_rank - b.bristol_rank
        : a.uk_rank - b.uk_rank,
    );
  }, [imdRows, rankMode]);

  // Top 5 most deprived areas based on the active sort mode.
  const mostDeprived = sortedRows.slice(0, 5);

  // Bottom 5 least deprived areas, reversed so the least deprived shows first.
  const leastDeprived = [...sortedRows].slice(-5).reverse();

  // Build the local authority profile showing the share of Bristol LSOAs in each decile.
  const localAuthorityProfileData = useMemo(() => {
    const total = imdRows.length;

    return Array.from({ length: 10 }, (_, index) => {
      const decile = index + 1;
      const count = imdRows.filter((row) => row.bristol_decile === decile).length;
      const percentage = total ? (count / total) * 100 : 0;

      return {
        decile,
        label: `Decile ${decile}`,
        count,
        percentage: Number(percentage.toFixed(1)),
        color: DECILE_COLORS[decile],
      };
    });
  }, [imdRows]);

  return (
    <div className="space-y-8 w-full max-w-none px-1 xl:px-2">
     {/*animated intro header*/}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="space-y-4"
      >
        <h1 className="text-3xl md:text-3xl font-bold text-foreground tracking-tight">
          Replicating the Index of Deprivation for{" "}
          <span className="text-primary glow-text-cyan">Bristol</span>
        </h1>
        <p className="text-muted-foreground text-lg md:text-xl leading-relaxed">
          Estimating the Index of Multiple Deprivation for Bristol using only
          publicly available datasets to reduce reliance on expensive surveys
          while maintaining analytical fidelity.
        </p>
      </motion.div>

      {/*High level summary as dashboard cards*/}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Indicators"
          value="24"
          subtitle="Across 7 domains"
          icon={BarChart3}
          glow="cyan"
        />
        <MetricCard
          label="LSOAs Covered"
          value={imdRows.length ? String(imdRows.length) : "267"}
          subtitle="LSOAs"
          icon={MapPin}
          glow="violet"
        />
        <MetricCard
          label="Last Refresh"
          value="Mar 19 2026"
          subtitle="Pipeline v2.3"
          icon={RefreshCw}
          glow="cyan"
        />
        <MetricCard
          label="Model Version"
          value="2.3.1"
          subtitle="Weighted composite"
          icon={Layers}
          glow="magenta"
        />
      </div>

      {/*Map, local authority information, and rankings*/}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,0.9fr)_minmax(0,0.9fr)] gap-6 items-stretch xl:auto-rows-[720px]">

        <GlassCard className="p-6">
          <div className="space-y-2">
            <h2 className="text-xl md:text-2xl font-bold text-foreground">
              Deprivation Across Bristol
            </h2>
            <p className="text-base md:text-m text-muted-foreground leading-relaxed">
              Interactive LSOA-level map comparing Bristol’s deprivation locally and nationally.
            </p>
          </div>

          {/* Embedded map component with a taller display area. */}
          <div className="mt-4 min-h-[555px]">
            <BristolChoropleth
              highlightedDecile={hoveredDecile}
              onLegendHoverChange={setHoveredDecile}
            />
          </div>
        </GlassCard>

        {/* Local Authority Profile card showing the share of LSOAs by Bristol decile. */}
        <GlassCard className="p-6">
          <div className="space-y-2">
            <h2 className="text-xl md:text-2xl font-bold text-foreground">
              Local Authority Profile
            </h2>
            <p className="text-base md:text-m text-muted-foreground leading-relaxed">
              % of Bristol LSOAs in each Bristol-relative deprivation decile.
            </p>
          </div>

          <div className="mt-5 space-y-3">
            <p className="text-sm text-muted-foreground">More deprived</p>

            <div style={{ height: 460 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={localAuthorityProfileData}
                  layout="vertical"
                  margin={{ top: 8, right: 18, left: 8, bottom: 2 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={false}
                    className="opacity-20"
                  />

                  <XAxis
                    type="number"
                    tickFormatter={(value) => `${value}%`}
                    domain={[0, "dataMax + 2"]}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />

                  <YAxis
                    type="category"
                    dataKey="label"
                    width={72}
                    tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />

                  <Tooltip
                    cursor={{ fill: "rgba(255,255,255,0.04)" }}
                    formatter={(value, _name, item) => [
                      `${value}% (${item.payload.count} LSOAs)`,
                      item.payload.label,
                    ]}
                    contentStyle={{
                      backgroundColor: "rgba(8, 15, 30, 0.96)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: "12px",
                      color: "white",
                    }}
                  />

                  <Bar dataKey="percentage" radius={[0, 6, 6, 0]}>
                    {localAuthorityProfileData.map((row) => (
                      <Cell
                        key={row.decile}
                        fill={row.color}
                        fillOpacity={
                          hoveredDecile === null || hoveredDecile === row.decile ? 1 : 0.35
                        }
                        stroke={
                          hoveredDecile === row.decile ? "rgba(255,255,255,0.85)" : "none"
                        }
                        strokeWidth={hoveredDecile === row.decile ? 1.5 : 0}
                        style={{ cursor: "pointer" }}
                        onMouseEnter={() => setHoveredDecile(row.decile)}
                        onMouseLeave={() => setHoveredDecile(null)}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <p className="text-sm text-muted-foreground">Less deprived</p>
          </div>
        </GlassCard>

        {/* Rankings card remains the right-hand column. */}
        <GlassCard className="p-6">
          <div className="space-y-2">
            <h2 className="text-xl md:text-2xl font-bold text-foreground">
              Area Rankings
            </h2>
            <p className="text-base md:text-m text-muted-foreground leading-relaxed">
              Highest and lowest deprived areas in Bristol.
            </p>
          </div>

          {/* Toggle buttons for switching between Bristol and UK ranking views. */}
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => setRankMode("bristol")}
              className={`px-3 py-2 rounded-md text-m font-semibold border transition-colors ${
                rankMode === "bristol"
                  ? "bg-primary/20 text-primary border-primary/30"
                  : "bg-background/40 text-muted-foreground border-border/50 hover:bg-background/60"
              }`}
            >
              Bristol rank
            </button>
            <button
              type="button"
              onClick={() => setRankMode("uk")}
              className={`px-3 py-2 rounded-md text-m font-semibold border transition-colors ${
                rankMode === "uk"
                  ? "bg-primary/20 text-primary border-primary/30"
                  : "bg-background/40 text-muted-foreground border-border/50 hover:bg-background/60"
              }`}
            >
              UK rank
            </button>
          </div>

          {/* Lists of the highest and lowest deprived areas under the selected mode. */}
<div className="mt-5 space-y-6">
  <div>
    <p className="text-xl uppercase tracking-wider text-destructive font-bold mb-2 flex items-center gap-3">
      <TrendingUp className="h-10 w-10" /> Most Deprived Areas
    </p>
    <div className="space-y-1.5">
      {mostDeprived.map((row, i) => (
        <div
          key={row.ward_lsoa}
          className="flex w-full items-start gap-2 text-base md:text-xs"
        >
          <div className="flex-1 min-w-0">
            <span className="text-muted-foreground text-sm md:text-base leading-tight">
              <span className="text-foreground font-medium">
                {i + 1}.
              </span>{" "}
              {row.ward_lsoa}
            </span>
          </div>

          <div className="text-right flex-shrink-0">
            <span className="text-destructive font-bold text-xs md:text-base whitespace-nowrap">
              {rankMode === "bristol"
                ? `#${row.bristol_rank}`
                : `#${row.uk_rank}`}
            </span>
          </div>
        </div>
      ))}
    </div>
  </div>

  <div className="border-t border-border/50 pt-4">
    <p className="text-xl uppercase tracking-wider text-success font-bold mb-2 flex items-center gap-3">
      <TrendingDown className="h-10 w-10" /> Least Deprived Areas
    </p>
    <div className="space-y-1.5">
      {leastDeprived.map((row, i) => (
        <div
          key={row.ward_lsoa}
          className="flex w-full items-start gap-2 overflow-hidden text-base md:text-xs"
        >
          <div className="flex-1 min-w-0">
            <span className="text-muted-foreground text-sm md:text-base leading-tight">
              <span className="text-foreground font-medium">
                {i + 1}.
              </span>{" "}
              {row.ward_lsoa}
            </span>
          </div>

          <div className="text-right flex-shrink-0">
            <span className="text-success font-bold text-xs md:text-base whitespace-nowrap">
              {rankMode === "bristol"
                ? `#${row.bristol_rank}`
                : `#${row.uk_rank}`}
            </span>
          </div>
        </div>
      ))}
    </div>
  </div>
</div>
</GlassCard>
</div>
      <GlassCard className="p-6">
        <SectionHeader title="Why This Matters" />
        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-primary">
              Cost Reduction
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Official deprivation indices rely on expensive survey-based data
              collection. Our approach uses freely available public datasets to
              approximate these measures.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-secondary">Timeliness</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The official IMD is updated roughly every 4-5 years. Our pipeline
              can refresh indicators monthly, providing near real-time
              deprivation estimates.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-accent">
              Transparency
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Every data source is publicly available. The methodology is open
              and reproducible, enabling scrutiny and community contributions.
            </p>
          </div>
        </div>
      </GlassCard>

    </div>
  );
}