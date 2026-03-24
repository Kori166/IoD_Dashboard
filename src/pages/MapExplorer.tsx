import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronRight, Layers } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { SectionHeader } from "@/components/ui/section-header";
import BristolComparisonMap from "@/components/maps/BristolComparisonMap";

type RightMapMode =
  | "uk_rank"
  | "bristol_decile"
  | "uk_decile";

const rightMapOptions: {
  key: RightMapMode;
  label: string;
  description: string;
}[] = [
  {
    key: "uk_rank",
    label: "ONS Rankings",
    description: "Official / UK-wide rank view for Bristol LSOAs.",
  },
  {
    key: "bristol_decile",
    label: "Top Feature 1",
    description: "Our Bristol-relative deprivation deciles.",
  },
  {
    key: "uk_decile",
    label: "Top Feature 2",
    description: "Official / UK-wide deprivation deciles.",
  },
];

export default function MapExplorer() {
  // Controls which dataset appears in the right-hand comparison map.
  const [rightMapMode, setRightMapMode] = useState<RightMapMode>("uk_rank");

  const activeRightMap =
    rightMapOptions.find((option) => option.key === rightMapMode) ??
    rightMapOptions[0];

  return (
    <div className="space-y-8 w-full max-w-none px-1 xl:px-2">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-4"
      >
        <h1 className="text-4xl md:text-4xl font-bold text-foreground tracking-tight">
          Map Explorer          
        </h1>
        <p className="text-muted-foreground text-lg md:text-xl leading-relaxed">
          Compare our Bristol LSOA ranks with alternative rank and decile views.
        </p>
        
      </motion.div>

      {/* Two map cards side by side */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-stretch">
        {/* Left map card */}
        <GlassCard className="p-5 h-full">
          <div className="h-full flex flex-col">
            {/* Header row with fixed spacing so both cards line up */}
            <div className="min-h-[72px] space-y-1 mb-4">
              <h2 className="text-xl font-semibold text-foreground">
                Our LSOA Rankings for Bristol
              </h2>
              <p className="text-sm text-muted-foreground">
                Choropleth view using our Bristol LSOA rank estimates.
              </p>
            </div>

            {/* Map area */}
            <div className="flex-1">
              <BristolComparisonMap
                metric="bristol_rank"
                heightClassName="h-[750px]"
              />
            </div>

            {/* Footer note */}
            <p className="text-sm text-muted-foreground mt-4">
              Left map is fixed to our LSOA rank view so users always have a stable baseline.
            </p>
          </div>
        </GlassCard>

        {/* Right map card */}
        <GlassCard className="p-5 h-full">
          <div className="h-full flex flex-col">
            {/* Header row with title on the left and buttons on the right */}
            <div className="min-h-[72px] mb-4 flex flex-col gap-4 2xl:flex-row 2xl:items-start 2xl:justify-between">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold text-foreground">
                  {activeRightMap.label}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {activeRightMap.description}
                </p>
              </div>

              {/* Buttons moved to the top-right area of the right card */}
              <div className="space-y-2 2xl:min-w-[360px]">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">
                    Right map layers
                  </h3>
                </div>

                <div className="flex flex-wrap gap-3 justify-start 2xl:justify-end">
                  {rightMapOptions.map((option) => {
                    const isActive = rightMapMode === option.key;

                    return (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => setRightMapMode(option.key)}
                        className={`rounded-lg border px-4 py-3 text-left transition-colors ${
                          isActive
                            ? "bg-primary/15 text-primary border-primary/30"
                            : "bg-muted/20 text-foreground border-border/50 hover:bg-muted/30"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium">{option.label}</span>
                          <ChevronRight className="h-4 w-4 shrink-0" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Map area */}
            <div className="flex-1">
              <BristolComparisonMap
                metric={rightMapMode}
                heightClassName="h-[750px]"
              />
            </div>

            {/* Footer note */}
            <p className="text-sm text-muted-foreground mt-4">
              Use the buttons above to switch the right map between alternative ranking and decile views.
            </p>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}