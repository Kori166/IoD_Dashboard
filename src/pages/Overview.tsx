import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { BarChart3, MapPin, RefreshCw, Layers, TrendingUp, TrendingDown, ArrowRight} from "lucide-react";
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
};

export default function Overview() {
  // Stores the full set of IMD rows used across the page.
  const [imdRows, setImdRows] = useState<BristolIMDRow[]>([]);

  // Controls whether rankings are shown relative to Bristol or the whole UK.
  const [rankMode, setRankMode] = useState<"bristol" | "uk">("bristol");

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

  return (
    <div className="space-y-8 w-full max-w-none px-1 xl:px-2">
      {/* Intro header with a small entrance animation. */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="space-y-4"
      >
        <h1 className="text-4xl md:text-4xl font-bold text-foreground tracking-tight">
          Replicating the Index of Deprivation for{" "}
          <span className="text-primary glow-text-cyan">Bristol</span>
        </h1>
        <p className="text-muted-foreground text-lg md:text-xl leading-relaxed">
          Estimating the Index of Multiple Deprivation for Bristol using only
          publicly available datasets to reduce reliance on expensive surveys
          while maintaining analytical fidelity.
        </p>
      </motion.div>

      {/* High-level summary metrics shown as dashboard cards. */}
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

      {/* Main content area: map on the left, ranked area lists on the right. */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassCard className="lg:col-span-2 p-6">
          {/* Section heading for the choropleth map. */}
          <div className="space-y-2">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">
              Deprivation Across Bristol
            </h2>
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
              Interactive LSOA-level map comparing Bristol’s deprivation locally and nationally.
            </p>
          </div>

          {/* Embedded map component that visualises LSOA deprivation levels. */}
          <div className="mt-4">
            <BristolChoropleth />
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          {/* Section heading for the ranked area lists. */}
          <div className="space-y-2">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">
              Area Rankings
            </h2>
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
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
              {/* Top-ranked deprived areas. */}
              <p className="text-xl uppercase tracking-wider text-destructive font-bold mb-2 flex items-center gap-3">
                <TrendingUp className="h-10 w-10" /> Most Deprived Areas 
              </p>
              <div className="space-y-1.5">
                {mostDeprived.map((row, i) => (
                  <div
                    key={row.lsoa_code}
                    className="flex items-center justify-between text-base md:text-lg"
                  >
                    <span className="text-muted-foreground">
                      <span className="text-foreground font-medium">
                        {i + 1}.
                      </span>{" "}
                      {row.lsoa_name}
                    </span>
                    <span className="text-destructive font-bold text-sm md:text-base">
                      {rankMode === "bristol"
                        ? `Bristol #${row.bristol_rank}`
                        : `UK #${row.uk_rank}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-border/50 pt-4">
              {/* Bottom-ranked deprived areas, meaning the least deprived. */}
              <p className="text-xl uppercase tracking-wider text-success font-bold mb-2 flex items-center gap-3">
                <TrendingDown className="h-10 w-10" /> Least Deprived Areas
              </p>
              <div className="space-y-1.5">
                {leastDeprived.map((row, i) => (
                  <div
                    key={row.lsoa_code}
                    className="flex items-center justify-between text-base md:text-lg"
                  >
                    <span className="text-muted-foreground">
                      <span className="text-foreground font-medium">
                        {i + 1}.
                      </span>{" "}
                      {row.lsoa_name}
                    </span>
                    <span className="text-success font-bold text-sm md:text-base">
                      {rankMode === "bristol"
                        ? `Bristol #${row.bristol_rank}`
                        : `UK #${row.uk_rank}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Short callout box summarising the key takeaways from the page. */}
      <KeyInsight
        insights={[
          "- Bristol rankings are now driven from the loaded IMD JSON rather than mock area summaries.",
          "- You can switch between Bristol-relative and UK-wide ranking to compare local and national deprivation patterns.",
        ]}
      />

      <GlassCard className="p-6">
        {/* Context section explaining why the project is useful. */}
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

      {/* Navigation links to deeper parts of the app. */}
      <div className="flex gap-4">
        <Link
          to="/map"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary/15 text-primary text-sm font-medium hover:bg-primary/25 transition-colors border border-primary/20"
        >
          Explore the Map <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          to="/indicators"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-secondary/15 text-secondary text-sm font-medium hover:bg-secondary/25 transition-colors border border-secondary/20"
        >
          Analyze Indicators <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}