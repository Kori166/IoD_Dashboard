import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowDown,
  ArrowUp,
  CalendarRange,
  Filter,
  MapPinned,
  TrendingUp,
} from "lucide-react";
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
import { SectionHeader } from "@/components/ui/section-header";
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

// Mock data for now.
// Replace this later with fetched JSON if you have a real time series dataset.
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

// Shared chart config for the dashboard chart wrapper.
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

function formatDisplayDate(date: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

function formatXAxisLabel(date: string, rangePreset: RangePreset) {
  const parsed = new Date(date);

  // For short views, show month labels instead of year labels.
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

function filterPointsByRange(points: TimePoint[], preset: RangePreset) {
  const start = getRangeStart(points, preset);
  if (!start) return points;
  return points.filter((point) => new Date(point.date) >= start);
}

function getIntegerDomain(values: number[], fallbackMax: number) {
  const maxValue = Math.max(...values, fallbackMax);
  return [0, Math.ceil(maxValue)];
}

export default function TimeSeries() {
  // Time window used to filter visible chart points.
  const [rangePreset, setRangePreset] = useState<RangePreset>("Max");

  // Selected LSOA in the sidebar dropdown.
  const [selectedLsoa, setSelectedLsoa] = useState<string>(mockSeries[0].code);

  // Comparison mode for the summary box.
  const [compareMode, setCompareMode] = useState<
    "previous_release" | "custom_year" | "custom_month"
  >("previous_release");

  // Chart sizing controls.
  const rankChartHeight = 260;
  const decileChartHeight = 220;
  const chartMaxWidthClass = "max-w-5xl";

  // Find the currently selected LSOA series.
  const selectedSeries = useMemo(() => {
    return mockSeries.find((item) => item.code === selectedLsoa) ?? mockSeries[0];
  }, [selectedLsoa]);

  // Filter the selected series by the active time range preset.
  const visiblePoints = useMemo(() => {
    return filterPointsByRange(selectedSeries.points, rangePreset);
  }, [selectedSeries, rangePreset]);

  // Current and previous points used for summaries and change indicators.
  const latestPoint = visiblePoints[visiblePoints.length - 1];
  const previousPoint =
    visiblePoints.length > 1 ? visiblePoints[visiblePoints.length - 2] : latestPoint;

  const allRanks = selectedSeries.points.map((point) => point.rank);
  const allDeciles = selectedSeries.points.map((point) => point.decile);

  const currentRank = latestPoint?.rank ?? 0;
  const currentDecile = latestPoint?.decile ?? 0;
  const mostDeprivedObservedRank = Math.min(...allRanks);
  const leastDeprivedObservedRank = Math.max(...allRanks);
  const minDecile = Math.min(...allDeciles);
  const maxDecile = Math.max(...allDeciles);

  const rankDelta = previousPoint ? currentRank - previousPoint.rank : 0;
  const decileDelta = previousPoint ? currentDecile - previousPoint.decile : 0;

  // Convert raw points into a format the charts can use directly.
  const chartData = useMemo(() => {
    return visiblePoints.map((point) => ({
      date: point.date,
      shortDate: formatDisplayDate(point.date),
      xLabel: formatXAxisLabel(point.date, rangePreset),
      rank: Math.round(point.rank),
      decile: Math.round(point.decile),
    }));
  }, [visiblePoints, rangePreset]);

  const rankYAxisDomain = useMemo(() => {
    return getIntegerDomain(chartData.map((point) => point.rank), 10);
  }, [chartData]);

  const decileYAxisDomain = useMemo(() => {
    return [0, 10];
  }, []);

  return (
    <div className="space-y-8 w-full max-w-none px-1 xl:px-2">
      {/* Page heading */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="space-y-4"
      >
        <h1 className="text-4xl md:text-4xl font-bold text-foreground tracking-tight">
          Time Series 2019-2025 LSOA rankings for {" "}
          <span className="text-primary glow-text-cyan">Bristol</span>
        </h1>
        <p className="text-muted-foreground text-lg md:text-xl leading-relaxed">
          Track how a selected Bristol LSOA changes over time by rank and decile,
          compare its current position to previous releases, and inspect the
          observed range across the series.
        </p>
      </motion.div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Selected Area
              </p>
              <p className="mt-2 text-2xl font-bold text-foreground">
                {selectedSeries.label}
              </p>
            </div>
            <MapPinned className="h-6 w-6 text-primary" />
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Current Rank
              </p>
              <p className="mt-2 text-2xl font-bold text-foreground">
                {Math.round(currentRank)}
              </p>
            </div>
            <TrendingUp className="h-6 w-6 text-primary" />
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Current Decile
            </p>
            <p className="mt-2 text-2xl font-bold text-foreground">
              {Math.round(currentDecile)}
            </p>
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Visible Range
              </p>
              <p className="mt-2 text-2xl font-bold text-foreground">
                {rangePreset}
              </p>
            </div>
            <CalendarRange className="h-6 w-6 text-primary" />
          </div>
        </GlassCard>
      </div>

      {/* Main two-column layout */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.75fr)_360px] gap-6 items-start">
        {/* Left column: both charts */}
        <GlassCard className="p-6">
          <div className="space-y-8">
            {/* Shared time range controls */}
            <div className="flex flex-wrap items-center justify-between gap-4">
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

            {/* Top chart: Rank */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Rank</h2>
                <p className="text-sm text-muted-foreground">
                  Integer ranking over time
                </p>
              </div>

              <div className={`w-full ${chartMaxWidthClass}`}>
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
                      <CartesianGrid
                        vertical={false}
                        strokeDasharray="3 3"
                        className="opacity-30"
                      />

                      <XAxis
                        dataKey="xLabel"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={10}
                        minTickGap={24}
                      />

                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickMargin={10}
                        allowDecimals={false}
                        domain={rankYAxisDomain}
                      />

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
                            formatter={(value) => [
                              <span className="font-medium text-foreground">
                                {Math.round(Number(value))}
                              </span>,
                              "Rank",
                            ]}
                          />
                        }
                      />

                      {latestPoint && (
                        <ReferenceLine
                          x={formatXAxisLabel(latestPoint.date, rangePreset)}
                          stroke="rgba(255,255,255,0.18)"
                        />
                      )}

                      <Line
                        type="monotone"
                        dataKey="rank"
                        name="rank"
                        stroke="var(--color-rank)"
                        strokeWidth={2.5}
                        dot={false}
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

            {/* Bottom chart: Decile */}
            <div className="space-y-3 border-t border-border/40 pt-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Decile</h2>
                <p className="text-sm text-muted-foreground">
                  Integer decile trend over time
                </p>
              </div>

              <div className={`w-full ${chartMaxWidthClass}`}>
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
                      <CartesianGrid
                        vertical={false}
                        strokeDasharray="3 3"
                        className="opacity-30"
                      />

                      <XAxis
                        dataKey="xLabel"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={10}
                        minTickGap={24}
                      />

                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickMargin={10}
                        allowDecimals={false}
                        domain={decileYAxisDomain}
                        ticks={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}
                      />

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
                            formatter={(value) => [
                              <span className="font-medium text-foreground">
                                {Math.round(Number(value))}
                              </span>,
                              "Decile",
                            ]}
                          />
                        }
                      />

                      {latestPoint && (
                        <ReferenceLine
                          x={formatXAxisLabel(latestPoint.date, rangePreset)}
                          stroke="rgba(255,255,255,0.18)"
                        />
                      )}

                      <Line
                        type="stepAfter"
                        dataKey="decile"
                        name="decile"
                        stroke="var(--color-decile)"
                        strokeWidth={2.5}
                        dot={false}
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

        {/* Right column: filter + summary */}
        <div className="space-y-6">
          {/* Filter card */}
          <GlassCard className="p-5">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">
                  Filter by LSOA
                </h2>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="lsoa-select"
                  className="text-sm font-medium text-muted-foreground"
                >
                  Select area
                </label>
                <select
                  id="lsoa-select"
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
            </div>
          </GlassCard>

          {/* Summary card */}
          <GlassCard className="p-6">
            <div className="space-y-5">
              <h2 className="text-2xl font-bold text-foreground">
                {selectedSeries.label}
              </h2>

              <div className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-3 text-sm md:text-base">
                <span className="text-muted-foreground">Current Rank</span>
                <span className="font-semibold text-foreground">
                  {Math.round(currentRank)} / 268
                </span>

                <span className="text-muted-foreground">Current Decile</span>
                <span className="font-semibold text-foreground">
                  {Math.round(currentDecile)}
                </span>

                <span className="text-muted-foreground">
                  Most deprived observed rank
                </span>
                <span className="font-semibold text-foreground">
                  {mostDeprivedObservedRank} / 268
                </span>

                <span className="text-muted-foreground">
                  Least deprived observed rank
                </span>
                <span className="font-semibold text-foreground">
                  {leastDeprivedObservedRank} / 268
                </span>

                <span className="text-muted-foreground">Decile range</span>
                <span className="font-semibold text-foreground">
                  {minDecile} to {maxDecile}
                </span>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="compare-mode"
                  className="text-sm font-medium text-muted-foreground"
                >
                  Change from
                </label>
                <select
                  id="compare-mode"
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

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="rounded-xl border border-border/40 bg-background/20 p-4">
                  <p className="text-sm text-muted-foreground">Rank</p>
                  <div className="mt-2 flex items-center gap-2">
                    {rankDelta <= 0 ? (
                      <ArrowDown className="h-6 w-6 text-destructive" />
                    ) : (
                      <ArrowUp className="h-6 w-6 text-success" />
                    )}
                    <span
                      className={`text-xl font-bold ${
                        rankDelta <= 0 ? "text-destructive" : "text-success"
                      }`}
                    >
                      {rankDelta > 0 ? `+${Math.round(rankDelta)}` : Math.round(rankDelta)}
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-border/40 bg-background/20 p-4">
                  <p className="text-sm text-muted-foreground">Decile</p>
                  <div className="mt-2 flex items-center gap-2">
                    {decileDelta >= 0 ? (
                      <ArrowUp className="h-6 w-6 text-success" />
                    ) : (
                      <ArrowDown className="h-6 w-6 text-destructive" />
                    )}
                    <span
                      className={`text-xl font-bold ${
                        decileDelta >= 0 ? "text-success" : "text-destructive"
                      }`}
                    >
                      {decileDelta > 0 ? `+${Math.round(decileDelta)}` : Math.round(decileDelta)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}