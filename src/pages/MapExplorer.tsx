// Code Sources and Provenance:
// - npm (2026) framer-motion. Available from: https://www.npmjs.com/package/framer-motion
// - React (No Date) React. Available from: https://react.dev/
// - Lucide (2026) Lucide. Available from: https://lucide.dev/

import { useState } from "react";
import { motion } from "framer-motion";
import { Layers } from "lucide-react";

import { GlassCard } from "@/components/ui/glass-card";
import BristolComparisonMap from "@/components/maps/BristolComparisonMap";

type MapMeasure = "decile" | "rank" | "score";

const measureOptions: MapMeasure[] = ["decile", "rank", "score"];

function toBristolMetric(measure: MapMeasure) {
  if (measure === "rank") return "bristol_rank";
  if (measure === "score") return "bristol_score";
  return "bristol_decile";
}

function toOnsBristolMetric(measure: MapMeasure) {
  if (measure === "rank") return "ons_bristol_rank";
  if (measure === "score") return "ons_score";
  return "ons_bristol_decile";
}

function MeasureToggle({
  value,
  onChange,
}: {
  value: MapMeasure;
  onChange: (value: MapMeasure) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {measureOptions.map((measure) => (
        <button
          key={measure}
          type="button"
          onClick={() => onChange(measure)}
          className={`rounded-lg border px-3 py-2 text-sm font-medium capitalize transition-colors ${
            value === measure
              ? "bg-primary/15 text-primary border-primary/30"
              : "bg-muted/20 text-foreground border-border/50 hover:bg-muted/30"
          }`}
        >
          {measure}
        </button>
      ))}
    </div>
  );
}

export default function MapExplorer() {
  const [leftMeasure, setLeftMeasure] = useState<MapMeasure>("decile");
  const [rightMeasure, setRightMeasure] = useState<MapMeasure>("decile");

  return (
    <div className="space-y-8 w-full max-w-none px-1 xl:px-2">
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
          Compare our Bristol-relative IoD outputs with ONS data ranked within Bristol.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-stretch">
        <GlassCard className="p-5 h-full">
          <div className="h-full flex flex-col">
            <div className="min-h-[112px] space-y-3 mb-4">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold text-foreground">
                  Our Bristol IoD
                </h2>

                <p className="text-sm text-muted-foreground">
                  Choropleth view using our Bristol-relative model outputs.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">
                    Left map measure
                  </h3>
                </div>

                <MeasureToggle value={leftMeasure} onChange={setLeftMeasure} />
              </div>
            </div>

            <div className="flex-1">
              <BristolComparisonMap
                metric={toBristolMetric(leftMeasure)}
                heightClassName="h-[750px]"
              />
            </div>

            <p className="text-sm text-muted-foreground mt-4">
              Left map uses our Bristol-relative model outputs.
            </p>
          </div>
        </GlassCard>

        <GlassCard className="p-5 h-full">
          <div className="h-full flex flex-col">
            <div className="min-h-[112px] mb-4 flex flex-col gap-4 2xl:flex-row 2xl:items-start 2xl:justify-between">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold text-foreground">
                  ONS IoD within Bristol
                </h2>

                <p className="text-sm text-muted-foreground">
                  Choropleth view using ONS data ranked relative to Bristol LSOAs.
                </p>
              </div>

              <div className="space-y-2 2xl:min-w-[260px]">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">
                    Right map measure
                  </h3>
                </div>

                <MeasureToggle value={rightMeasure} onChange={setRightMeasure} />
              </div>
            </div>

            <div className="flex-1">
              <BristolComparisonMap
                metric={toOnsBristolMetric(rightMeasure)}
                heightClassName="h-[750px]"
              />
            </div>

            <p className="text-sm text-muted-foreground mt-4">
              Use the buttons above to switch the ONS map between decile, rank and score.
            </p>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}