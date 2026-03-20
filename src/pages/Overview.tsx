import { motion } from "framer-motion";
import { BarChart3, MapPin, RefreshCw, Layers, TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import { MetricCard } from "@/components/ui/metric-card";
import { GlassCard } from "@/components/ui/glass-card";
import { KeyInsight } from "@/components/ui/key-insight";
import { SectionHeader } from "@/components/ui/section-header";
import { areaSummaries } from "@/data/mockData";
import BristolChoropleth from "@/components/maps/BristolChoropleth";
import { Link } from "react-router-dom";

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
  const [imdRows, setImdRows] = useState<BristolIMDRow[]>([]);
  const [rankMode, setRankMode] = useState<"bristol" | "uk">("bristol");

  useEffect(() => {
    async function load() {
      const res = await fetch("/data/bristol_imd.json");
      const data = await res.json();
      setImdRows(data);
    }

    load();
  }, []);

  const sortedRows = useMemo(() => {
    return [...imdRows].sort((a, b) =>
      rankMode === "bristol"
        ? a.bristol_rank - b.bristol_rank
        : a.uk_rank - b.uk_rank,
    );
  }, [imdRows, rankMode]);

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
    
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Indicators"
          value="24"
          subtitle="Across 8 domains"
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassCard className="lg:col-span-2 p-6">
          <SectionHeader
            title="Bristol IMD Choropleth"
            subtitle="Interactive LSOA-level deprivation map for Bristol"
          />
          <div className="mt-4">
            <BristolChoropleth />
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <SectionHeader
            title="Area Rankings"
            subtitle="Highest and lowest deprived areas in Bristol."
          />

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => setRankMode("bristol")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
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
              className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                rankMode === "uk"
                  ? "bg-primary/20 text-primary border-primary/30"
                  : "bg-background/40 text-muted-foreground border-border/50 hover:bg-background/60"
              }`}
            >
              UK rank
            </button>
          </div>

          <div className="mt-4 space-y-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-destructive font-medium mb-2 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> Most Deprived
              </p>
              <div className="space-y-1.5">
                {mostDeprived.map((row, i) => (
                  <div
                    key={row.lsoa_code}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-muted-foreground">
                      <span className="text-foreground font-medium">
                        {i + 1}.
                      </span>{" "}
                      {row.lsoa_name}
                    </span>
                    <span className="text-destructive font-mono text-xs">
                      {rankMode === "bristol"
                        ? `Bristol #${row.bristol_rank}`
                        : `UK #${row.uk_rank}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-border/50 pt-4">
              <p className="text-xs uppercase tracking-wider text-success font-medium mb-2 flex items-center gap-1">
                <TrendingDown className="h-3 w-3" /> Least Deprived
              </p>
              <div className="space-y-1.5">
                {leastDeprived.map((row, i) => (
                  <div
                    key={row.lsoa_code}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-muted-foreground">
                      <span className="text-foreground font-medium">
                        {i + 1}.
                      </span>{" "}
                      {row.lsoa_name}
                    </span>
                    <span className="text-success font-mono text-xs">
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
