// Code Sources and Provenance:
// - npm (2026) framer-motion. Available from: https://www.npmjs.com/package/framer-motion
// - React (No Date) React. Available from: https://react.dev/
// - Lucide (2026) Lucide. Available from: https://lucide.dev/

import { type MouseEvent, useState } from "react";
import { motion } from "framer-motion";
import { Layers } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import BristolComparisonMap, { getDecileColor, getRankMax, isRankMetric, type MapMetric} from "@/components/maps/BristolComparisonMap";

type MapMeasure = "decile" | "rank";

const measureOptions: MapMeasure[] = ["decile", "rank"];

function toBristolMetric(measure: MapMeasure) {
  if (measure === "rank") return "bristol_rank";
  return "bristol_decile";
}

function toOnsBristolMetric(measure: MapMeasure) {
  if (measure === "rank") return "ons_bristol_rank";
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

function SharedMapLegend({
  metric,
  highlightedBucket,
  highlightedValue,
  legendHover,
  onHighlightBucket,
  onHighlightValue,
  onLegendHover,
}: {
  metric: MapMetric;
  highlightedBucket: number | null;
  highlightedValue: { metric: MapMetric; value: number; mode: "exact" | "bucket" } | null;
  legendHover: { metric: MapMetric; value: number; y: number } | null;
  onHighlightBucket: (bucket: number | null) => void;
  onHighlightValue: (value: { metric: MapMetric; value: number; mode: "exact" | "bucket" } | null) => void;
  onLegendHover: (value: { metric: MapMetric; value: number; y: number } | null) => void;
}) {
  const isDecile = metric.includes("decile");
  const isRank = isRankMetric(metric);
  const rankMax = getRankMax(metric);

  const gradient = `linear-gradient(to bottom,
    ${getDecileColor(1)} 0%,
    ${getDecileColor(2)} 10%,
    ${getDecileColor(3)} 20%,
    ${getDecileColor(4)} 30%,
    ${getDecileColor(5)} 40%,
    ${getDecileColor(6)} 50%,
    ${getDecileColor(7)} 60%,
    ${getDecileColor(8)} 70%,
    ${getDecileColor(9)} 80%,
    ${getDecileColor(10)} 100%)`;

  function handleGradientMove(event: MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const rawRatio = (event.clientY - rect.top) / rect.height;
    const ratio = Math.min(1, Math.max(0, rawRatio));

    if (!isRank) return;

    const value = Math.round(1 + ratio * (rankMax - 1));

    onLegendHover({
      metric,
      y: ratio * 100,
      value,
    });

    onHighlightBucket(null);
    onHighlightValue({
      metric,
      value,
      mode: "exact",
    });
  }

  function clearGradientHover() {
    onLegendHover(null);
    onHighlightValue(null);
    onHighlightBucket(null);
  }

  const shownHover = legendHover && legendHover.metric === metric ? legendHover : null;

  return (
    <GlassCard className="h-full p-4">
      <div className="flex h-full flex-col">
        <div>
          <p className="text-xl font-semibold text-foreground">Legend</p>
          <p className="mt-1 text-s text-muted-foreground">
            
          </p>
        </div>

        {isDecile ? (
          <div className="mt-6 flex flex-1 flex-col">
            <p className="mb-4 text-m font-medium text-muted-foreground">
              Most deprived
            </p>

            <div className="flex flex-1 flex-col justify-between">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((decile) => (
                <button
                  key={decile}
                  type="button"
                  onMouseEnter={() => {
                    onHighlightValue(null);
                    onHighlightBucket(decile);
                  }}
                  onMouseLeave={() => onHighlightBucket(null)}
                  onFocus={() => {
                    onHighlightValue(null);
                    onHighlightBucket(decile);
                  }}
                  onBlur={() => onHighlightBucket(null)}
                  className="group flex w-full items-center justify-between gap-4 rounded-md px-1 py-1 text-left transition-colors hover:bg-background/40"
                  title={`Decile ${decile}`}
                  aria-label={`Highlight decile ${decile}`}
                >
                  <span
                    className={`h-10 flex-1 rounded-md border transition-all ${
                      highlightedBucket === decile
                        ? "scale-[1.03] border-white shadow-[0_0_14px_rgba(34,211,238,0.65)]"
                        : "border-border/40"
                    }`}
                    style={{ background: getDecileColor(decile) }}
                  />

                  <span className="w-7 text-right text-2xl font-bold leading-none text-foreground">
                    {decile}
                  </span>
                </button>
              ))}
            </div>

            <p className="mt-4 text-m font-medium text-muted-foreground">
              Least deprived
            </p>
          </div>
        ) : (
          <div className="mt-6 flex flex-1 flex-col">
            <div className="mb-4">
              <p className="text-sm font-semibold text-foreground">Rank 1</p>
              <p className="text-xs text-muted-foreground">Most deprived</p>
            </div>

            <div className="flex min-h-0 flex-1 gap-4">
              <div
                className="relative h-full w-12 cursor-crosshair rounded-lg border border-border/50"
                style={{ background: gradient }}
                onMouseMove={handleGradientMove}
                onMouseLeave={clearGradientHover}
              >
                {shownHover ? (
                  <>
                    <div
                      className="pointer-events-none absolute left-0 right-0 h-0.5 bg-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.85)]"
                      style={{ top: `${shownHover.y}%` }}
                    />

                    <div
                      className="pointer-events-none absolute left-14 -translate-y-1/2 whitespace-nowrap rounded-md border border-cyan-300/40 bg-background/95 px-2 py-1 text-xs font-bold text-foreground shadow-xl"
                      style={{ top: `${shownHover.y}%` }}
                    >
                      Rank {Math.round(shownHover.value)}
                    </div>
                  </>
                ) : null}
              </div>

              <div className="relative flex-1">
                {[
                  { label: "1", top: "0%" },
                  { label: String(Math.round(rankMax * 0.25)), top: "25%" },
                  { label: String(Math.round(rankMax * 0.5)), top: "50%" },
                  { label: String(Math.round(rankMax * 0.75)), top: "75%" },
                  { label: String(rankMax), top: "100%" },
                ].map((tick) => (
                  <div
                    key={tick.label}
                    className="absolute left-0 flex w-full -translate-y-1/2 items-center gap-2"
                    style={{ top: tick.top }}
                  >
                    <span className="h-px w-5 bg-border" />
                    <span className="text-xs font-bold text-foreground">
                      {tick.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <p className="text-sm font-semibold text-foreground">
                Rank {rankMax}
              </p>
              <p className="text-xs text-muted-foreground">Least deprived</p>
            </div>
          </div>
        )}
      </div>
    </GlassCard>
  );
}

export default function MapComparison() {
  const [selectedMeasure, setSelectedMeasure] = useState<MapMeasure>("decile");
  const [highlightedBucket, setHighlightedBucket] = useState<number | null>(null);

  const [highlightedValue, setHighlightedValue] = useState<{
    metric: MapMetric;
    value: number;
    mode: "exact" | "bucket";
  } | null>(null);

  const [legendHover, setLegendHover] = useState<{
    metric: MapMetric;
    value: number;
    y: number;
    label?: string | null;
  } | null>(null);

  const leftMetric = toBristolMetric(selectedMeasure) as MapMetric;
  const rightMetric = toOnsBristolMetric(selectedMeasure) as MapMetric;

  return (
    <div className="space-y-8 w-full max-w-none px-1 xl:px-2">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-4"
      >
        <h1 className="text-4xl md:text-4xl font-bold text-foreground tracking-tight">
          Map Comparison
        </h1>

        <p className="text-muted-foreground text-lg md:text-xl leading-relaxed">
          Compare our Bristol-relative IoD outputs with ONS data ranked within Bristol.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_160px] gap-6 items-start">
        <GlassCard className="p-5 h-full">
          <div className="h-full flex flex-col">
            <div className="min-h-[112px] mb-4 flex flex-col gap-4 2xl:flex-row 2xl:items-start 2xl:justify-between">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold text-foreground">
                  Our Bristol IoD
                </h2>

                <p className="text-sm text-muted-foreground">
                  Choropleth view using our Bristol-relative model outputs.
                </p>
              </div>

              <div className="space-y-2 2xl:min-w-[260px]">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">
                    Left map measure
                  </h3>
                </div>

                <MeasureToggle value={selectedMeasure} onChange={setSelectedMeasure} />
              </div>
            </div>

            <div className="flex-1"> 
              <BristolComparisonMap
                metric={leftMetric}
                highlightedBucket={highlightedBucket}
                highlightedValue={highlightedValue}
                heightClassName="h-[750px]"
              />
            </div>

            <p className="text-sm text-muted-foreground mt-4">
              Left map uses our Bristol-relative model outputs, coloured by the selected measure.
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

                <MeasureToggle value={selectedMeasure} onChange={setSelectedMeasure} />
              </div>
            </div>

            <div className="flex-1">
              <BristolComparisonMap
                metric={rightMetric}
                highlightedBucket={highlightedBucket}
                highlightedValue={highlightedValue}
                heightClassName="h-[750px]"
              />
            </div>

            <p className="text-sm text-muted-foreground mt-4">
              Right map uses ONS data ranked within Bristol, coloured by the selected measure.
            </p>
          </div>
        </GlassCard>
        <SharedMapLegend
          metric={leftMetric}
          highlightedBucket={highlightedBucket}
          highlightedValue={highlightedValue}
          legendHover={legendHover}
          onHighlightBucket={setHighlightedBucket}
          onHighlightValue={setHighlightedValue}
          onLegendHover={setLegendHover}
        />
      </div>
    </div>
  );
}