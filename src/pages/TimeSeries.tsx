import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Info, TrendingUp } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

import { GlassCard } from "@/components/ui/glass-card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

type RangePreset = "6M" | "1Y" | "5Y" | "Max";

type TimePoint = {
  date: string;
  rank: number;
  decile: number;
};

type LsoaSeries = {
  code: string;
  label: string;
  points: TimePoint[];
};

// Mock data for layout and interaction.
// Replace this with fetched data once the real time-series source is available.
const mockSeries: LsoaSeries[] = [
  {
    code: "E01014645",
    label: "Bristol 045C",
    points: [
      { date: "2019-01-01", rank: 8, decile: 1 },
      { date: "2019-07-01", rank: 11, decile: 1 },
      { date: "2020-01-01", rank: 11, decile: 1 },
      { date: "2020-07-01", rank: 10, decile: 1 },
      { date: "2021-01-01", rank: 7, decile: 3 },
      { date: "2021-07-01", rank: 7, decile: 4 },
      { date: "2022-01-01", rank: 8, decile: 3 },
      { date: "2022-07-01", rank: 10, decile: 2 },
      { date: "2023-01-01", rank: 11, decile: 2 },
      { date: "2023-07-01", rank: 13, decile: 1 },
      { date: "2024-01-01", rank: 14, decile: 1 },
      { date: "2024-07-01", rank: 14, decile: 1 },
      { date: "2025-01-01", rank: 13, decile: 1 },
      { date: "2025-07-18", rank: 12, decile: 1 },
    ],
  },
  {
    code: "E01014601",
    label: "Bristol 001A",
    points: [
      { date: "2019-01-01", rank: 21, decile: 3 },
      { date: "2020-01-01", rank: 23, decile: 3 },
      { date: "2021-01-01", rank: 18, decile: 2 },
      { date: "2022-01-01", rank: 22, decile: 3 },
      { date: "2023-01-01", rank: 19, decile: 2 },
      { date: "2024-01-01", rank: 17, decile: 2 },
      { date: "2025-07-18", rank: 15, decile: 2 },
    ],
  },
  {
    code: "E01014602",
    label: "Bristol 001B",
    points: [
      { date: "2019-01-01", rank: 44, decile: 5 },
      { date: "2020-01-01", rank: 42, decile: 5 },
      { date: "2021-01-01", rank: 40, decile: 5 },
      { date: "2022-01-01", rank: 37, decile: 4 },
      { date: "2023-01-01", rank: 35, decile: 4 },
      { date: "2024-01-01", rank: 31, decile: 4 },
      { date: "2025-07-18", rank: 30, decile: 4 },
    ],
  },
];

// Shared chart configuration used by the dashboard chart wrapper.
const rankChartConfig = {
  rank: {
    label: "Rank",
    color: "#22d3ee",
  },
} satisfies ChartConfig;

const decileChartConfig = {
  decile: {
    label: "Decile",
    color: "#8b5cf6",
  },
} satisfies ChartConfig;

// Formats a full release date for tooltips and summaries.
function formatDisplayDate(date: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

// Formats x-axis labels.
// Short ranges use month labels, longer ranges use year labels.
function formatXAxisLabel(date: string, rangePreset: RangePreset) {
  const parsed = new Date(date);

  if (rangePreset === "6M" || rangePreset === "1Y") {
    return new Intl.DateTimeFormat("en-GB", {
      month: "short",
      year: "2-digit",
    }).format(parsed);
  }

  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
  }).format(parsed);
}

// Works out the start date for the selected time-range preset.
function getRangeStart(points: TimePoint[], preset: RangePreset) {
  if (!points.length) return null;

  const lastDate = new Date(points[points.length - 1].date);
  const start = new Date(lastDate);

  if (preset === "6M") start.setMonth(start.getMonth() - 6);
  if (preset === "1Y") start.setFullYear(start.getFullYear() - 1);
  if (preset === "5Y") start.setFullYear(start.getFullYear() - 5);
  if (preset === "Max") return null;

  return start;
}

// Filters points down to the currently selected visible time range.
function filterPointsByRange(points: TimePoint[], preset: RangePreset) {
  const start = getRangeStart(points, preset);
  if (!start) return points;
  return points.filter((point) => new Date(point.date) >= start);
}

// Builds an integer-only chart domain.
function getIntegerDomain(values: number[], fallbackMax: number) {
  const maxValue = Math.max(...values, fallbackMax);
  return [0, Math.ceil(maxValue)];
}

// Returns a simple decile label for the top summary card.
function getDecileLabel(decile: number) {
  return `${decile}`;
}

// Converts rank delta into clear direction language.
function getRankChangeText(delta: number) {
  if (delta < 0) return `More deprived by ${Math.abs(delta)} rank`;
  if (delta > 0) return `Less deprived by ${delta} rank`;
  return "No rank change";
}

// Converts decile delta into clear direction language.
function getDecileChangeText(delta: number) {
  if (delta < 0) return `More deprived by ${Math.abs(delta)} decile`;
  if (delta > 0) return `Less deprived by ${delta} decile`;
  return "No decile change";
}

// Builds a simple visible period label for the sidebar.
function getRangeLabel(points: TimePoint[]) {
  if (!points.length) return "No data";
  const first = new Date(points[0].date).getFullYear();
  const last = new Date(points[points.length - 1].date).getFullYear();
  return `${first} to ${last}`;
}

// Creates a plain-English summary of the selected area.
function buildAreaSummary(args: {
  label: string;
  currentRank: number;
  currentDecile: number;
  minRank: number;
  maxRank: number;
  minDecile: number;
  maxDecile: number;
}) {
  const {
    label,
    currentRank,
    currentDecile,
    minRank,
    maxRank,
    minDecile,
    maxDecile,
  } = args;

  return `${label} is currently in decile ${currentDecile} and ranks ${currentRank}th most deprived out of 268 Bristol LSOAs. Over the period shown, it has ranged between rank ${minRank} and rank ${maxRank}, and between deciles ${minDecile} and ${maxDecile}.`;
}

// Builds deduplicated x-axis ticks so each year appears only once in 5Y/Max views.
function getXAxisTicks(
  data: { date: string; xLabel: string }[],
  rangePreset: RangePreset,
) {
  if (rangePreset === "6M" || rangePreset === "1Y") {
    return data.map((point) => point.xLabel);
  }

  const seen = new Set<string>();
  const ticks: string[] = [];

  for (const point of data) {
    if (!seen.has(point.xLabel)) {
      seen.add(point.xLabel);
      ticks.push(point.xLabel);
    }
  }

  return ticks;
}

export default function TimeSeries() {
  // Selected visible time range for both charts.
  const [rangePreset, setRangePreset] = useState<RangePreset>("Max");

  // Selected LSOA code from the control bar.
  const [selectedLsoa, setSelectedLsoa] = useState<string>(mockSeries[0].code);

  // Comparison basis used in the interpretation panel.
  const [compareMode, setCompareMode] = useState<
    "previous_release" | "custom_year" | "custom_month"
  >("previous_release");

  // Central chart sizing controls.
  const rankChartHeight = 260;
  const decileChartHeight = 220;

  // Looks up the selected LSOA series.
  const selectedSeries = useMemo(() => {
    return mockSeries.find((item) => item.code === selectedLsoa) ?? mockSeries[0];
  }, [selectedLsoa]);

  // Applies the selected time window to the series.
  const visiblePoints = useMemo(() => {
    return filterPointsByRange(selectedSeries.points, rangePreset);
  }, [selectedSeries, rangePreset]);

  // Finds the latest and previous visible releases for change calculations.
  const latestPoint = visiblePoints[visiblePoints.length - 1];
  const previousPoint =
    visiblePoints.length > 1 ? visiblePoints[visiblePoints.length - 2] : latestPoint;

  // Pulls rank/decile arrays from the full selected series for summary stats.
  const allRanks = selectedSeries.points.map((point) => point.rank);
  const allDeciles = selectedSeries.points.map((point) => point.decile);

  // Latest current values used across the page.
  const currentRank = latestPoint?.rank ?? 0;
  const currentDecile = latestPoint?.decile ?? 0;

  // Best and worst observed values across the selected area's full history.
  const mostDeprivedObservedRank = Math.min(...allRanks);
  const leastDeprivedObservedRank = Math.max(...allRanks);
  const minDecile = Math.min(...allDeciles);
  const maxDecile = Math.max(...allDeciles);

  // Change since the previous visible release.
  const rankDelta = previousPoint ? currentRank - previousPoint.rank : 0;
  const decileDelta = previousPoint ? currentDecile - previousPoint.decile : 0;

  // Rounded integer labels used everywhere in the UI.
  const roundedCurrentRank = Math.round(currentRank);
  const roundedCurrentDecile = Math.round(currentDecile);
  const roundedRankDelta = Math.round(rankDelta);
  const roundedDecileDelta = Math.round(decileDelta);

  // Human-readable summaries for the top cards and sidebar.
  const rankChangeText = getRankChangeText(roundedRankDelta);
  const decileChangeText = getDecileChangeText(roundedDecileDelta);
  const visibleRangeLabel = getRangeLabel(visiblePoints);

  // Plain-English interpretation block shown in the sidebar.
  const areaSummary = buildAreaSummary({
    label: selectedSeries.label,
    currentRank: roundedCurrentRank,
    currentDecile: roundedCurrentDecile,
    minRank: mostDeprivedObservedRank,
    maxRank: leastDeprivedObservedRank,
    minDecile,
    maxDecile,
  });

  // Converts visible points into chart-friendly objects with display labels.
  const chartData = useMemo(() => {
    return visiblePoints.map((point) => ({
      date: point.date,
      shortDate: formatDisplayDate(point.date),
      xLabel: formatXAxisLabel(point.date, rangePreset),
      rank: Math.round(point.rank),
      decile: Math.round(point.decile),
    }));
  }, [visiblePoints, rangePreset]);

  // Deduplicated axis ticks so long-range views only show each year once.
  const xAxisTicks = useMemo(() => {
    return getXAxisTicks(chartData, rangePreset);
  }, [chartData, rangePreset]);

  // Rank chart domain stays integer-only.
  const rankYAxisDomain = useMemo(() => {
    return getIntegerDomain(chartData.map((point) => point.rank), 10);
  }, [chartData]);

  return (
    <div className="space-y-8 w-full max-w-none px-1 xl:px-2">
      {/* Page title and short explanatory intro */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="space-y-4"
      >
        <h1 className="text-4xl md:text-4xl font-bold text-foreground tracking-tight">
          Time Series 2019-2025 LSOA rankings for{" "}
          <span className="text-primary glow-text-cyan">Bristol</span>
        </h1>

        <p className="text-muted-foreground text-lg md:text-xl leading-relaxed">
          Track how a selected Bristol LSOA changes over time by rank and decile,
          compare its current position to earlier releases, and see whether it
          has become more or less deprived over time.
        </p>
      </motion.div>

      {/* Top-level insight cards focused on current meaning, not UI state */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard className="p-5">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Current rank
            </p>
            <p className="text-2xl font-bold text-foreground">
              {roundedCurrentRank} of 268
            </p>
            <p className="text-sm text-muted-foreground">
              Lower rank = more deprived
            </p>
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Current decile
            </p>
            <p className="text-2xl font-bold text-foreground">
              {getDecileLabel(roundedCurrentDecile)}
            </p>
            <p className="text-sm text-muted-foreground">
              1 = most deprived, 10 = least deprived
            </p>
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Change since previous release
            </p>
            <p className="text-2xl font-bold text-foreground">
              {rankChangeText}
            </p>
            <p className="text-sm text-muted-foreground">
              {decileChangeText}
            </p>
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Best / worst observed position
            </p>
            <p className="text-2xl font-bold text-foreground">
              {mostDeprivedObservedRank} to {leastDeprivedObservedRank}
            </p>
            <p className="text-sm text-muted-foreground">
              Rank across the full series
            </p>
          </div>
        </GlassCard>
      </div>

      {/* Main page layout with the charts in the wider column and interpretation on the right */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.75fr)_360px] gap-6 items-start">
        {/* Main chart card containing controls and both charts */}
        <GlassCard className="p-6">
          <div className="space-y-8">
            {/* Unified control bar so filters live in one obvious place */}
            <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 flex-1">
                {/* LSOA selector */}
                <div className="space-y-2">
                  <label
                    htmlFor="lsoa-select-inline"
                    className="text-sm font-medium text-muted-foreground"
                  >
                    LSOA
                  </label>
                  <select
                    id="lsoa-select-inline"
                    value={selectedLsoa}
                    onChange={(e) => setSelectedLsoa(e.target.value)}
                    className="w-full rounded-lg border border-border/50 bg-background/40 px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary/50"
                  >
                    {mockSeries.map((item) => (
                      <option key={item.code} value={item.code}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Shared time range buttons controlling both charts */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    Time range
                  </label>
                  <div className="inline-flex rounded-lg border border-border/50 bg-background/30 p-1">
                    {(["6M", "1Y", "5Y", "Max"] as RangePreset[]).map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setRangePreset(preset)}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                          rangePreset === preset
                            ? "bg-primary/15 text-primary"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Comparison mode selector used by the interpretation panel */}
                <div className="space-y-2">
                  <label
                    htmlFor="compare-mode-inline"
                    className="text-sm font-medium text-muted-foreground"
                  >
                    Compare to
                  </label>
                  <select
                    id="compare-mode-inline"
                    value={compareMode}
                    onChange={(e) =>
                      setCompareMode(
                        e.target.value as
                          | "previous_release"
                          | "custom_year"
                          | "custom_month",
                      )
                    }
                    className="w-full rounded-lg border border-border/50 bg-background/40 px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary/50"
                  >
                    <option value="previous_release">Previous release</option>
                    <option value="custom_year">Custom year</option>
                    <option value="custom_month">Custom month</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Primary rank chart */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Rank</h2>
                <p className="text-sm text-muted-foreground">Rank over time</p>
              </div>

              {/* Full-width chart wrapper so the chart stretches across the card */}
              <div className="w-full">
                <ChartContainer
                  config={rankChartConfig}
                  className="w-full"
                  style={{ height: `${rankChartHeight}px` }}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={chartData}
                      margin={{ top: 10, right: 18, left: 4, bottom: 6 }}
                    >
                      {/* Subtle gridlines make the dark chart easier to read */}
                      <CartesianGrid
                        vertical={false}
                        strokeDasharray="3 3"
                        className="opacity-30"
                      />

                      {/* Deduplicated x-axis ticks so each year only appears once in longer views */}
                      <XAxis
                        dataKey="xLabel"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={10}
                        minTickGap={24}
                        ticks={xAxisTicks}
                      />

                      {/* Reversed y-axis so lower ranks appear higher up on the chart */}
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickMargin={10}
                        allowDecimals={false}
                        domain={[1, Math.max(rankYAxisDomain[1], 10)]}
                        label={{
                         value: "Rank",
                            angle: -90,
                            position: "insideLeft",
                            style: {
                            fill: "hsl(var(--muted-foreground))",
                            fontSize: 12,
                            },
                        }}
                        />

                      {/* Tooltip shows both rank and decile for the selected release */}
                      <ChartTooltip
                        cursor={{
                          stroke: "rgba(255,255,255,0.35)",
                          strokeWidth: 1,
                        }}
                        content={
                          <ChartTooltipContent
                            labelFormatter={(_, payload) => {
                              const point = payload?.[0]?.payload;
                              return point?.shortDate ?? "";
                            }}
                            formatter={(value, _name, item) => [
                              <div className="flex flex-col gap-1">
                                <span className="font-medium text-foreground">
                                  Rank: {Math.round(Number(value))} of 268
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  Decile: {item.payload.decile}
                                </span>
                              </div>,
                              "Release",
                            ]}
                          />
                        }
                      />

                      {/* Marks the latest visible release */}
                      {latestPoint && (
                        <ReferenceLine
                          x={formatXAxisLabel(latestPoint.date, rangePreset)}
                          stroke="rgba(255,255,255,0.18)"
                        />
                      )}

                      {/* Straight line plus dots suits release-based data better than smoothing */}
                      <Line
                        type="linear"
                        dataKey="rank"
                        name="rank"
                        stroke="var(--color-rank)"
                        strokeWidth={2.5}
                        dot={{
                          r: 3,
                          fill: "var(--color-rank)",
                          stroke: "rgba(255,255,255,0.55)",
                          strokeWidth: 1,
                        }}
                        activeDot={{
                          r: 5,
                          fill: "var(--color-rank)",
                          stroke: "rgba(255,255,255,0.9)",
                          strokeWidth: 2,
                        }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </div>

            {/* Secondary decile chart */}
            <div className="space-y-3 border-t border-border/40 pt-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Decile</h2>
                <p className="text-sm text-muted-foreground">Decile over time</p>
              </div>

              {/* Full-width chart wrapper so the chart stretches across the card */}
              <div className="w-full">
                <ChartContainer
                  config={decileChartConfig}
                  className="w-full"
                  style={{ height: `${decileChartHeight}px` }}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={chartData}
                      margin={{ top: 10, right: 18, left: 4, bottom: 6 }}
                    >
                      {/* Subtle gridlines improve readability on the dark background */}
                      <CartesianGrid
                        vertical={false}
                        strokeDasharray="3 3"
                        className="opacity-30"
                      />

                      {/* Deduplicated x-axis ticks so each year only appears once in longer views */}
                      <XAxis
                        dataKey="xLabel"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={10}
                        minTickGap={24}
                        ticks={xAxisTicks}
                      />

                      {/* Reversed y-axis so lower deciles appear higher up on the chart */}
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickMargin={10}
                        allowDecimals={false}
                        domain={[1, 10]}
                        ticks={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}
                        label={{
                            value: "Decile",
                            angle: -90,
                            position: "insideLeft",
                            style: {
                            fill: "hsl(var(--muted-foreground))",
                            fontSize: 12,
                            },
                        }}
                        />

                      {/* Tooltip shows decile and rank together for context */}
                      <ChartTooltip
                        cursor={{
                          stroke: "rgba(255,255,255,0.35)",
                          strokeWidth: 1,
                        }}
                        content={
                          <ChartTooltipContent
                            labelFormatter={(_, payload) => {
                              const point = payload?.[0]?.payload;
                              return point?.shortDate ?? "";
                            }}
                            formatter={(value, _name, item) => [
                              <div className="flex flex-col gap-1">
                                <span className="font-medium text-foreground">
                                  Decile: {Math.round(Number(value))}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  Rank: {item.payload.rank} of 268
                                </span>
                              </div>,
                              "Release",
                            ]}
                          />
                        }
                      />

                      {/* Marks the latest visible release */}
                      {latestPoint && (
                        <ReferenceLine
                          x={formatXAxisLabel(latestPoint.date, rangePreset)}
                          stroke="rgba(255,255,255,0.18)"
                        />
                      )}

                      {/* Step line is a better fit for banded decile changes */}
                      <Line
                        type="stepAfter"
                        dataKey="decile"
                        name="decile"
                        stroke="var(--color-decile)"
                        strokeWidth={2.5}
                        dot={{
                          r: 3,
                          fill: "var(--color-decile)",
                          stroke: "rgba(255,255,255,0.55)",
                          strokeWidth: 1,
                        }}
                        activeDot={{
                          r: 5,
                          fill: "var(--color-decile)",
                          stroke: "rgba(255,255,255,0.9)",
                          strokeWidth: 2,
                        }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </div>
          </div>
        </GlassCard>

                {/* Sidebar summary card */}
        <div>
          <GlassCard className="p-6">
            <div className="space-y-5">
              <h2 className="text-2xl font-bold text-foreground">
                {selectedSeries.label}
              </h2>

              {/* Plain-English narrative summary */}
              <div className="rounded-xl border border-border/40 bg-background/20 p-4 space-y-3">
                <p className="text-sm leading-relaxed text-foreground">
                  {areaSummary}
                </p>
                <p className="text-sm text-muted-foreground">
                  Viewed range: {visibleRangeLabel}
                </p>
              </div>

              {/* Explicit change interpretation so users do not have to decode sign direction */}
              <div className="grid grid-cols-1 gap-3">
                <div className="rounded-xl border border-border/40 bg-background/20 p-4">
                  <p className="text-sm text-muted-foreground">Rank change</p>
                  <p className="mt-2 text-base font-semibold text-foreground">
                    {rankChangeText}
                  </p>
                </div>

                <div className="rounded-xl border border-border/40 bg-background/20 p-4">
                  <p className="text-sm text-muted-foreground">Decile change</p>
                  <p className="mt-2 text-base font-semibold text-foreground">
                    {decileChangeText}
                  </p>
                </div>

                {/* Small glossary for terms that are not obvious to every user */}
                <div className="rounded-xl border border-border/40 bg-background/20 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-primary" />
                    <p className="text-sm font-medium text-foreground">
                      Definitions
                    </p>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    LSOA: Lower Layer Super Output Area
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Rank: Bristol position, where lower means more deprived
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Decile: grouped band from 1 to 10, where 1 is most deprived
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Comparison: {compareMode.replaceAll("_", " ")}
                  </p>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Reading guide placed underneath the full two-column layout */}
      <GlassCard className="p-5">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h3 className="text-base font-semibold text-foreground">
              Reading this page
            </h3>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed">
            The rank chart shows Bristol position over time, where lower
            values mean greater deprivation. The decile chart shows whether
            the area has moved between broader deprivation bands.
          </p>
        </div>
      </GlassCard>        
      </div>
    </div>
  );
}