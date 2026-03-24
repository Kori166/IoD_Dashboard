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

  const activeRightMap = rightMapOptions.find(
    (option) => option.key === rightMapMode,
  ) ?? rightMapOptions[0];

  return (
    <div className="space-y-8 w-full max-w-none px-1 xl:px-2">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <SectionHeader
          title="Map Explorer"
          subtitle="Compare our Bristol LSOA ranks with alternative rank and decile views."
        />
      </motion.div>

      {/* Main comparison layout: left map, right map, and a slim control column */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_220px] gap-6 items-start">
        {/* Left map: always our LSOA ranks */}
        <GlassCard className="p-5">
          <div className="space-y-4">
            {/* Left map heading */}
            <div className="space-y-1">
              <h2 className="text-xl font-semibold text-foreground">
                Our LSOA Rankings for Bristol
              </h2>
              <p className="text-sm text-muted-foreground">
                Choropleth view using our Bristol LSOA rank estimates.
              </p>
            </div>

            {/* Left map component */}
            <BristolComparisonMap metric="bristol_rank" />

            {/* Left map caption */}
            <p className="text-sm text-muted-foreground">
              Left map is fixed to our LSOA rank view so users always have a stable baseline.
            </p>
          </div>
        </GlassCard>

        {/* Right map: changes based on selected button */}
        <GlassCard className="p-5">
          <div className="space-y-4">
            {/* Right map heading updates with the selected dataset */}
            <div className="space-y-1">
              <h2 className="text-xl font-semibold text-foreground">
                {activeRightMap.label}
              </h2>
              <p className="text-sm text-muted-foreground">
                {activeRightMap.description}
              </p>
            </div>

            {/* Right map component */}
            <BristolComparisonMap metric={rightMapMode} />

            {/* Right map caption */}
            <p className="text-sm text-muted-foreground">
              Use the buttons to switch the right map between alternative ranking and decile views.
            </p>
          </div>
        </GlassCard>

        {/* Button column controlling the right-hand map */}
        <div className="space-y-3">
          <GlassCard className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Layers className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">
                Right map layers
              </h3>
            </div>

            <div className="space-y-3">
              {rightMapOptions.map((option) => {
                const isActive = rightMapMode === option.key;

                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setRightMapMode(option.key)}
                    className={`w-full rounded-lg border px-4 py-3 text-left transition-colors ${
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
          </GlassCard>
        </div>
      </div>
    </div>
  );
}