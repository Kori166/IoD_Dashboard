/*
  Feature analysis page for the dashboard.

  This page loads model feature importance data, ranks the most important indicators, and shows how a selected indicator relates to predicted deprivation scores across Bristol LSOAs.

  Provenance:
  - React (no date) ‘Built-in React Hooks’ [online]. Available from:
    https://react.dev/reference/react  
    Used for useState, useEffect, and useMemo state and data handling.

  - React (no date) ‘ElementType’ [online]. Available from:
    https://react.dev/reference/react 
    Used for typing the icon component passed into SummaryCard.

  - Motion (no date) ‘React animation’ [online]. Available from:
    https://motion.dev/docs/react 
    Used for the animated page heading.

  - Recharts (no date) ‘API’ [online]. Available from:
    https://recharts.org/en-US/api 
    Used for the scatter chart, trend line, axes, tooltip, and responsive container.

  - Lucide (no date) ‘Lucide React’ [online]. Available from:
    https://lucide.dev/guide/packages/lucide-react 
    Used for the page summary and information icons.

  - MDN (no date) ‘Fetch API’ [online]. Available from:
    https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API 
    Used for loading the feature importance JSON file.

  - MDN (no date) ‘Array.prototype.map()’ [online]. Available from:
    https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map
    Used for transforming raw feature data into chart-ready rows.

  - MDN (no date) ‘Array.prototype.sort()’ [online]. Available from:
    https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort
    Used for ranking features by absolute coefficient size.

  - Laerd Statistics (no date) ‘Spearman’s Rank-Order Correlation’ [online]. Available from:
    https://statistics.laerd.com/statistical-guides/spearmans-rank-order-correlation-statistical-guide.php
    Used for the Spearman correlation calculation.

  - MathWorld (no date) ‘Least Squares Fitting’ [online]. Available from:
    https://mathworld.wolfram.com/LeastSquaresFitting.html 
    Used for the linear trend line calculation.
*/

import { useEffect, useMemo, useState, type ElementType } from "react";
import { motion } from "framer-motion";
import { CartesianGrid, ComposedChart, Label, Line, ReferenceDot, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis} from "recharts";
import { Activity, Grid3X3, Info, Layers, LineChart, ShieldCheck} from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";

// Defines the raw JSON structure loaded from feature_imp.json
type RawFeatureImportance = Record<string, [number, [number, number][]]>;

// Defines the cleaned feature data used by the page
type FeatureRow = {
  feature: string;
  label: string;
  coefficient: number;
  absCoefficient: number;
  scaledImportance: number;
  direction: "positive" | "negative";
  points: {
    x: number;
    y: number;
  }[];
};

// Sets the shared tooltip styling for the Recharts chart
const chartTooltipStyle = {
  backgroundColor: "rgba(8, 15, 30, 0.96)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "12px",
  color: "white",
  fontSize: 12,
};

// Gives raw feature names clearer labels for display
const FEATURE_LABELS: Record<string, string> = {
  uc_claim_rate: "Universal Credit (UC) claim rate",
  uc_nwr_rate: "UC not working requirement rate",
  elderly_share: "Elderly population share",
  transactions_per_capita: "Housing transactions",
  youth_share: "Youth population share",
  detached_proportion: "Detached housing share",
  lsoa_median_price: "Median house price",
  lsoa_mean_price: "Mean house price",
  lsoa_price_inequality: "House price inequality",
  flats_proportion: "Flats proportion",
  terraced_proportion: "Terraced housing share",
  freehold_proportion: "Freehold housing share",
  landuse_industrial_0: "Industrial land use",
  landuse_residential_0: "Residential land use",
  landuse_commercial_0: "Commercial land use",
  resolution_rate: "Crime resolution rate",
  crime_rate_per_1000: "Crime rate per 1,000",
  violent_crime_rate: "Violent crime rate",
  burglary_rate: "Burglary rate",
  drugs_rate: "Drug offence rate",
  streetlit_percentage: "Streetlit road percentage",
  "%_claims_planfw": "Planning for work claims",
  "%_claims_sfw": "Searching for work claims",
};

// Converts raw feature names into readable labels
function formatFeatureLabel(feature: string) {
  return (
    FEATURE_LABELS[feature] ??
    feature
      .replaceAll("_", " ")
      .replaceAll("%", "Percentage")
      .replace(/\b\w/g, (char) => char.toUpperCase())
  );
}

// Formats chart numbers so labels stay readable
function formatNumber(value: number) {
  if (!Number.isFinite(value)) return "0";

  if (Math.abs(value) >= 1000) {
    return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
  }

  if (Math.abs(value) >= 10) {
    return value.toFixed(1);
  }

  if (Math.abs(value) >= 1) {
    return value.toFixed(2);
  }

  return value.toFixed(3);
}

// Calculates Spearman rank correlation for the selected feature points
function calculateSpearman(data: { x: number; y: number }[]) {
  if (data.length < 2) return 0;

  const rank = (values: number[]) => {
    return values
      .map((value, index) => ({ value, index }))
      .sort((a, b) => a.value - b.value)
      .reduce<number[]>((ranks, item, index) => {
        ranks[item.index] = index + 1;
        return ranks;
      }, []);
  };

  const xRanks = rank(data.map((row) => row.x));
  const yRanks = rank(data.map((row) => row.y));
  const n = data.length;

  const squaredDifferenceSum = xRanks.reduce((sum, xRank, index) => {
    const difference = xRank - yRanks[index];
    return sum + difference * difference;
  }, 0);

  return 1 - (6 * squaredDifferenceSum) / (n * (n * n - 1));
}

// Calculates a simple linear trend line for the scatter plot
function calculateTrendLine(data: { x: number; y: number }[]) {
  if (data.length < 2) return [];

  const n = data.length;
  const sumX = data.reduce((sum, row) => sum + row.x, 0);
  const sumY = data.reduce((sum, row) => sum + row.y, 0);
  const sumXY = data.reduce((sum, row) => sum + row.x * row.y, 0);
  const sumXX = data.reduce((sum, row) => sum + row.x * row.x, 0);

  const denominator = n * sumXX - sumX * sumX;

  if (denominator === 0) return [];

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  const sorted = [...data].sort((a, b) => a.x - b.x);
  const minX = sorted[0].x;
  const maxX = sorted[sorted.length - 1].x;

  return [
    { x: minX, y: slope * minX + intercept },
    { x: maxX, y: slope * maxX + intercept },
  ];
}

// Displays one summary statistic card at the top of the page
function SummaryCard({
  icon: Icon,
  label,
  value,
}: {
  icon: ElementType;
  label: string;
  value: string;
}) {
  return (
    <GlassCard className="p-5">
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-cyan-400/15 text-cyan-300 shadow-[0_0_24px_rgba(34,211,238,0.18)]">
          <Icon className="h-7 w-7" />
        </div>

        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-xl font-bold text-foreground">{value}</p>
        </div>
      </div>
    </GlassCard>
  );
}

// Displays the ranked list of the top feature coefficients
function FeatureImportanceListCompact({
  features,
  selectedFeatureName,
  onSelectFeature,
}: {
  features: FeatureRow[];
  selectedFeatureName: string;
  onSelectFeature: (feature: string) => void;
}) {
  return (
    <div className="mt-4">    
      <div className="mt-3 max-h-[500px] space-y-2 overflow-y-auto pr-1">
        {features.map((feature, index) => {
          const isSelected = feature.feature === selectedFeatureName;
          const isPositive = feature.direction === "positive";

          return (
            <button
              key={feature.feature}
              type="button"
              onClick={() => onSelectFeature(feature.feature)}
              className={`w-full rounded-lg border px-3 py-3 text-left transition-all ${
                isSelected
                  ? "border-cyan-400/40 bg-cyan-400/10"
                  : "border-transparent bg-white/[0.025] hover:border-border/60 hover:bg-white/[0.045]"
              }`}
            >
              <div className="grid grid-cols-[28px_minmax(0,1fr)_65px] items-center gap-3">
                <span className="text-xs font-semibold text-muted-foreground">
                  {String(index + 1).padStart(2, "0")}
                </span>

                <div className="min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {feature.label}
                    </p>

                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        isPositive
                          ? "bg-cyan-400/10 text-cyan-300"
                          : "bg-orange-400/10 text-orange-300"
                      }`}
                    >
                      {isPositive ? "+" : "−"}
                    </span>
                  </div>

                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-background/80">
                    <div
                      className={`h-full rounded-full ${
                        isPositive ? "bg-cyan-400" : "bg-orange-400"
                      }`}
                      style={{ width: `${feature.scaledImportance * 100}%` }}
                    />
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-sm font-bold text-foreground">
                    {formatNumber(feature.coefficient)}
                  </p>                  
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function FeatureAnalysis() {
  // Stores the loaded features, selected feature, and hovered chart point
  const [features, setFeatures] = useState<FeatureRow[]>([]);
  const [selectedFeatureName, setSelectedFeatureName] = useState<string>("");
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number } | null>(null);

  // Loads and prepares the feature importance data
  useEffect(() => {
    async function loadFeatureImportance() {
      const response = await fetch("/data/feature_imp.json");

      if (!response.ok) {
        throw new Error("Could not load feature_imp.json");
      }

      const raw = (await response.json()) as RawFeatureImportance;

      const baseFeatures = Object.entries(raw)
        .map(([feature, [coefficient, points]]) => ({
          feature,
          label: formatFeatureLabel(feature),
          coefficient,
          absCoefficient: Math.abs(coefficient),
          scaledImportance: 0,
          direction: coefficient >= 0 ? "positive" : "negative",
          points: points.map(([x, y]) => ({ x, y })),
        }))
        .sort((a, b) => b.absCoefficient - a.absCoefficient);

      const maxCoefficient = Math.max(
        ...baseFeatures.map((feature) => feature.absCoefficient),
        1,
      );

      const parsedFeatures = baseFeatures.map((feature) => ({
        ...feature,
        scaledImportance: feature.absCoefficient / maxCoefficient,
      })) as FeatureRow[];

      setFeatures(parsedFeatures);
      setSelectedFeatureName(parsedFeatures[0]?.feature ?? "");
    }

    loadFeatureImportance().catch((error) => {
      console.error(error);
      setFeatures([]);
      setSelectedFeatureName("");
    });
  }, []);

  // Keeps the top ten strongest features for the ranked list
  const topFeatures = useMemo(() => features.slice(0, 10), [features]);

  // Finds the currently selected feature row
  const selectedFeature = useMemo(() => {
    return (
      features.find((feature) => feature.feature === selectedFeatureName) ??
      features[0]
    );
  }, [features, selectedFeatureName]);

  // Gets the scatter plot data for the selected feature
  const scatterData = useMemo(
    () => selectedFeature?.points ?? [],
    [selectedFeature],
  );

  // Clears the hovered point when the selected feature changes
  useEffect(() => {
  setHoveredPoint(null);
}, [selectedFeatureName]);

// Calculates the trend line for the scatter plot
  const trendLine = useMemo(
    () => calculateTrendLine(scatterData),
    [scatterData],
  );

  // Calculates the rank correlation between feature values and predicted scores
  const spearman = useMemo(
    () => calculateSpearman(scatterData),
    [scatterData],
  );

  // Sets a padded y-axis range for the scatter chart
  const yDomain = useMemo(() => {
    if (!scatterData.length) return [0, 100];

    const values = scatterData.map((row) => row.y);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const padding = Math.max((max - min) * 0.08, 2);

    return [Math.floor(min - padding), Math.ceil(max + padding)];
  }, [scatterData]);

  return (
    <div className="space-y-6 w-full max-w-none px-1 xl:px-2">
      {/* Animated page heading and description */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="space-y-3"
      >
        <h1 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight">
          Feature Analysis
        </h1>

        <p className="max-w-full text-muted-foreground text-lg md:text-xl leading-relaxed">
          Exploration of which indicators most influence the deprivation estimate and
          how they relate to deprivation across Bristol.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-4 gap-4">
        <SummaryCard icon={LineChart} label="Model" value="Linear Regression" />
        <SummaryCard icon={ShieldCheck} label="Validation" value="Spatial CV" />
        <SummaryCard icon={Layers} label="Feature Set" value="Reduced Features & Rates Set" />
        <SummaryCard
          icon={Grid3X3}
          label="Features Used"
          value={features.length ? String(features.length) : "—"}
        />
      </div>

      {/* Short guide explaining how to interpret the charts */}
      <GlassCard className="border-cyan-400/20 bg-cyan-400/[0.025] p-4">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-cyan-300" />

          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">
              How to read this page
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              The left chart ranks the indicators the model relied on most. The
              right chart shows how the selected indicator varies against predicted
              deprivation scores across Bristol LSOAs. Feature importance shows
              model influence, not direct causation.
            </p>
          </div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 2xl:grid-cols-[minmax(360px,0.85fr)_minmax(0,1.15fr)] gap-6">
        {/* List of the strongest model features */}
        <GlassCard className="p-5 min-w-0">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              Top 10 Feature Importance
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Absolute coefficients, scaled to the strongest feature.
            </p>
          </div>

          <FeatureImportanceListCompact
            features={topFeatures}
            selectedFeatureName={selectedFeatureName}
            onSelectFeature={setSelectedFeatureName}
          />
        </GlassCard>

        {/* Scatter plot for the selected feature */}
        <GlassCard className="p-6 min-w-0">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground">
                Selected Feature vs Predicted Score
              </h2>
              <p className="mt-1 text-base text-muted-foreground">
                Relationship for:{" "}
                <span className="text-foreground">
                  {selectedFeature?.label ?? "selected feature"}
                </span>
              </p>
            </div>

            {/* Feature selector and correlation summary */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <select
                value={selectedFeatureName}
                onChange={(event) => setSelectedFeatureName(event.target.value)}
                className="rounded-lg border border-border/60 bg-background/70 px-3 py-2 text-sm text-foreground outline-none transition-colors hover:bg-background"
              >
                {topFeatures.map((feature) => (
                  <option key={feature.feature} value={feature.feature}>
                    {feature.label}
                  </option>
                ))}
              </select>

              <div className="rounded-lg border border-cyan-400/40 bg-cyan-400/10 px-3 py-2 text-sm font-semibold text-cyan-300">
                Spearman&apos;s ρ: {spearman.toFixed(2)}
              </div>
            </div>
          </div>

          <div className="mt-5 h-[500px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={scatterData}
                margin={{ top: 12, right: 28, left: 18, bottom: 48 }}
                onMouseMove={(state) => {
                  const activePayload = state?.activePayload?.[0]?.payload;

                  if (
                    activePayload &&
                    typeof activePayload.x === "number" &&
                    typeof activePayload.y === "number"
                  ) {
                    setHoveredPoint({
                      x: activePayload.x,
                      y: activePayload.y,
                    });
                  }
                }}
                onMouseLeave={() => setHoveredPoint(null)}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.1)"
                />

                {/* X-axis shows the selected feature values */}
                <XAxis
                  type="number"
                  dataKey="x"
                  domain={["dataMin", "dataMax"]}
                  tickFormatter={(value) => formatNumber(Number(value))}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  axisLine={{ stroke: "rgba(255,255,255,0.25)" }}
                  tickLine={false}
                >
                  <Label
                    value={selectedFeature?.label ?? "Selected feature"}
                    position="insideBottom"
                    offset={-32}
                    style={{
                      fill: "hsl(var(--foreground))",
                      fontSize: 14,
                      fontWeight: 700,
                    }}
                  />
                </XAxis>

                {/* Y-axis shows the predicted deprivation score */}
                <YAxis
                  type="number"
                  dataKey="y"
                  domain={yDomain}
                  tickFormatter={(value) => formatNumber(Number(value))}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  axisLine={{ stroke: "rgba(255,255,255,0.25)" }}
                  tickLine={false}
                >
                  <Label
                    value="Predicted Score"
                    angle={-90}
                    position="insideLeft"
                    style={{
                      textAnchor: "middle",
                      fill: "hsl(var(--foreground))",
                      fontSize: 14,
                      fontWeight: 700,
                    }}
                  />
                </YAxis>

                {/* Tooltip shows formatted feature and score values */}
                <Tooltip
                  cursor={{
                    stroke: "rgba(34,211,238,0.35)",
                    strokeDasharray: "4 4",
                  }}
                  contentStyle={chartTooltipStyle}
                  formatter={(value: number, name: string) => [
                    formatNumber(value),
                    name === "x"
                      ? selectedFeature?.label ?? "Feature value"
                      : "Predicted score",
                  ]}
                />

                {/* Scatter points show each Bristol LSOA */}
                <Scatter
                  data={scatterData}
                  fill="hsl(190, 95%, 55%)"
                  opacity={0.72}
                  shape={(props: any) => {
                    const { cx, cy, fill } = props;

                    return (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={4}
                        fill={fill}
                        opacity={0.75}
                      />
                    );
                  }}
                />
                
                {/* Trend line summarises the overall relationship */}
                <Line
                  type="linear"
                  data={trendLine}
                  dataKey="y"
                  stroke="hsl(190, 95%, 55%)"
                  strokeWidth={3}
                  dot={false}
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Short chart notes and selected coefficient value */}
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3 text-m text-muted-foreground">
            <span>Each point represents one Bristol LSOA</span>
            <span>
              Coefficient:{" "}
              <span className="font-semibold text-foreground">
                {selectedFeature ? formatNumber(selectedFeature.coefficient) : "—"}
              </span>
            </span>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}