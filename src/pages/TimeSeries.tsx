import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Info, MapPinned, TrendingUp } from "lucide-react";
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

// Time range presets used by the page controls.
type RangePreset = "6M" | "1Y" | "5Y" | "Max";

// One point in the selected LSOA time series.
type TimePoint = {
  date: string;
  rank: number;
  decile: number;
};

// Frontend-ready time series structure for one LSOA.
type LsoaSeries = {
  code: string;
  label: string;
  points: TimePoint[];
};

// Ward lookup row loaded from public/data.
type LsoaWardLookupRow = {
  lsoa_code: string;
  lsoa_name?: string;
  ward_code?: string;
  ward_name?: string;
};

// Dropdown option shape.
type LsoaOption = {
  code: string;
  label: string;
};

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
  const maxValue = values.length ? Math.max(...values, fallbackMax) : fallbackMax;
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
  wardName?: string | null;
  hasSeriesData: boolean;
  currentRank: number;
  currentDecile: number;
  minRank: number;
  maxRank: number;
  minDecile: number;
  maxDecile: number;
}) {
  const {
    label,
    wardName,
    hasSeriesData,
    currentRank,
    currentDecile,
    minRank,
    maxRank,
    minDecile,
    maxDecile,
  } = args;

  const wardText = wardName ? ` It sits within ${wardName} ward (2020).` : "";

  if (!hasSeriesData) {
    return `${label}.${wardText} Ward data is available, but no time-series data is currently loaded for this LSOA.`;
  }

  return `${label} is currently in decile ${currentDecile} and ranks ${currentRank}th most deprived out of 268 Bristol LSOAs.${wardText} Over the period shown, it has ranged between rank ${minRank} and rank ${maxRank}, and between deciles ${minDecile} and ${maxDecile}.`;
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
  const [selectedLsoa, setSelectedLsoa] = useState<string>("");

  // Comparison basis used in the interpretation panel.
  const [compareMode, setCompareMode] = useState<
    "previous_release" | "custom_year" | "custom_month"
  >("previous_release");

  // Loaded synthetic time-series data.
  const [seriesData, setSeriesData] = useState<LsoaSeries[]>([]);
  const [seriesLoading, setSeriesLoading] = useState(true);

  // Loaded ward lookup data.
  const [lsoaWardLookup, setLsoaWardLookup] = useState<LsoaWardLookupRow[]>([]);
  const [lookupLoading, setLookupLoading] = useState(true);

  // Central chart sizing controls.
  const rankChartHeight = 260;
  const decileChartHeight = 220;

  // Load the synthetic time-series JSON generated from the yearly CSVs.
  useEffect(() => {
    let isMounted = true;

    async function loadSeriesData() {
      try {
        const response = await fetch("/data/bristol_lsoa_timeseries_synthetic.json");

        if (!response.ok) {
          throw new Error(`Failed to load synthetic time-series data: ${response.status}`);
        }

        const data = (await response.json()) as LsoaSeries[];

        if (isMounted) {
          setSeriesData(data);
        }
      } catch (error) {
        console.error("Could not load synthetic LSOA time-series data", error);
        if (isMounted) {
          setSeriesData([]);
        }
      } finally {
        if (isMounted) {
          setSeriesLoading(false);
        }
      }
    }

    loadSeriesData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Load the LSOA -> Ward lookup used by the sidebar card.
  useEffect(() => {
    let isMounted = true;

    async function loadWardLookup() {
      try {
        const response = await fetch("/data/bristol_lsoa21_ward20_lookup.json");

        if (!response.ok) {
          throw new Error(`Failed to load ward lookup: ${response.status}`);
        }

        const data = (await response.json()) as LsoaWardLookupRow[];

        if (isMounted) {
          setLsoaWardLookup(data);
        }
      } catch (error) {
        console.error("Could not load LSOA to Ward lookup", error);
        if (isMounted) {
          setLsoaWardLookup([]);
        }
      } finally {
        if (isMounted) {
          setLookupLoading(false);
        }
      }
    }

    loadWardLookup();

    return () => {
      isMounted = false;
    };
  }, []);

  // Fast lookup map for time-series data by LSOA code.
  const seriesByCode = useMemo(() => {
    return new Map(seriesData.map((item) => [item.code, item]));
  }, [seriesData]);

  // Build the dropdown from all known LSOAs.
  // Prefer lookup labels where available, then fall back to series labels.
  const lsoaOptions = useMemo<LsoaOption[]>(() => {
    const optionsMap = new Map<string, string>();

    for (const row of lsoaWardLookup) {
      const code = row.lsoa_code?.trim();
      const label = row.lsoa_name?.trim();

      if (code) {
        optionsMap.set(code, label || code);
      }
    }

    for (const series of seriesData) {
      if (!optionsMap.has(series.code)) {
        optionsMap.set(series.code, series.label);
      }
    }

    return Array.from(optionsMap.entries())
      .map(([code, label]) => ({ code, label }))
      .sort((a, b) => a.label.localeCompare(b.label, "en-GB"));
  }, [lsoaWardLookup, seriesData]);

  // Set a default selected LSOA once the option list is available.
  useEffect(() => {
    if (!selectedLsoa && lsoaOptions.length) {
      setSelectedLsoa(lsoaOptions[0].code);
    }
  }, [selectedLsoa, lsoaOptions]);

  // If the currently selected LSOA is no longer in the option list, reset it.
  useEffect(() => {
    if (!lsoaOptions.length) return;

    const stillExists = lsoaOptions.some((option) => option.code === selectedLsoa);

    if (!stillExists) {
      setSelectedLsoa(lsoaOptions[0].code);
    }
  }, [lsoaOptions, selectedLsoa]);

  // Current selected time-series record, if available.
  const selectedSeries = useMemo(() => {
    return seriesByCode.get(selectedLsoa) ?? null;
  }, [selectedLsoa, seriesByCode]);

  // Current selected ward lookup record, if available.
  const selectedWardLookup = useMemo(() => {
    return lsoaWardLookup.find((row) => row.lsoa_code === selectedLsoa) ?? null;
  }, [lsoaWardLookup, selectedLsoa]);

  // Best available label for the selected LSOA.
  const selectedLsoaLabel =
    selectedWardLookup?.lsoa_name?.trim() ||
    selectedSeries?.label ||
    lsoaOptions.find((option) => option.code === selectedLsoa)?.label ||
    selectedLsoa;

  // Selected ward data for the right-hand card.
  const selectedWardName = selectedWardLookup?.ward_name?.trim() || null;
  const selectedWardCode = selectedWardLookup?.ward_code?.trim() || null;

  // Use an empty series if the selected LSOA has no synthetic data yet.
  const selectedPoints = selectedSeries?.points ?? [];

  // Apply the selected time window to the visible chart data.
  const visiblePoints = useMemo(() => {
    return filterPointsByRange(selectedPoints, rangePreset);
  }, [selectedPoints, rangePreset]);

  // Find the latest and previous visible releases for change calculations.
  const latestPoint = visiblePoints[visiblePoints.length - 1];
  const previousPoint =
    visiblePoints.length > 1 ? visiblePoints[visiblePoints.length - 2] : latestPoint;

  // Pull rank/decile arrays from the full selected series for summary stats.
  const allRanks = selectedPoints.map((point) => point.rank);
  const allDeciles = selectedPoints.map((point) => point.decile);

  // Current visible values used throughout the page.
  const currentRank = latestPoint?.rank ?? 0;
  const currentDecile = latestPoint?.decile ?? 0;

  // Best and worst observed values across the selected area's full history.
  const mostDeprivedObservedRank = allRanks.length ? Math.min(...allRanks) : 0;
  const leastDeprivedObservedRank = allRanks.length ? Math.max(...allRanks) : 0;
  const minDecile = allDeciles.length ? Math.min(...allDeciles) : 0;
  const maxDecile = allDeciles.length ? Math.max(...allDeciles) : 0;

  // Change since the previous visible release.
  const rankDelta = previousPoint ? currentRank - previousPoint.rank : 0;
  const decileDelta = previousPoint ? currentDecile - previousPoint.decile : 0;

  // Rounded integer labels used everywhere in the UI.
  const roundedCurrentRank = Math.round(currentRank);
  const roundedCurrentDecile = Math.round(currentDecile);
  const roundedRankDelta = Math.round(rankDelta);
  const roundedDecileDelta = Math.round(decileDelta);

  // Human-readable summaries for the top cards and sidebar.
  const rankChangeText = selectedPoints.length
    ? getRankChangeText(roundedRankDelta)
    : "No time-series data";

  const decileChangeText = selectedPoints.length
    ? getDecileChangeText(roundedDecileDelta)
    : "No time-series data";

  const visibleRangeLabel = getRangeLabel(visiblePoints);

  // Summary paragraph for the selected area card.
  const areaSummary = buildAreaSummary({
    label: selectedLsoaLabel,
    wardName: selectedWardName,
    hasSeriesData: selectedPoints.length > 0,
    currentRank: roundedCurrentRank,
    currentDecile: roundedCurrentDecile,
    minRank: mostDeprivedObservedRank,
    maxRank: leastDeprivedObservedRank,
    minDecile,
    maxDecile,
  });

  // Convert visible points into chart-friendly objects with display labels.
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
      {/* Page title and explanatory intro */}
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

      {/* Top summary cards showing current selected LSOA metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard className="p-5">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Current rank
            </p>
            <p className="text-2xl font-bold text-foreground">
              {seriesLoading ? "Loading..." : selectedPoints.length ? `${roundedCurrentRank} of 268` : "No data"}
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
              {seriesLoading ? "Loading..." : selectedPoints.length ? getDecileLabel(roundedCurrentDecile) : "No data"}
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
              {seriesLoading ? "Loading..." : rankChangeText}
            </p>
            <p className="text-sm text-muted-foreground">
              {seriesLoading ? "Loading..." : decileChangeText}
            </p>
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Best / worst observed position
            </p>
            <p className="text-2xl font-bold text-foreground">
              {seriesLoading
                ? "Loading..."
                : selectedPoints.length
                  ? `${mostDeprivedObservedRank} to ${leastDeprivedObservedRank}`
                  : "No data"}
            </p>
            <p className="text-sm text-muted-foreground">
              Rank across the full series
            </p>
          </div>
        </GlassCard>
      </div>

      {/* Main page layout: charts, placeholder card, and selected-area sidebar */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.85fr)_380px] gap-6 items-start">
        {/* Main chart panel with LSOA selector and both charts */}
        <GlassCard className="p-6">
          <div className="space-y-8">
            {/* Unified control bar for LSOA, time range, and comparison mode */}
            <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 flex-1">
                {/* LSOA selector built from all known LSOAs */}
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
                    {lsoaOptions.map((item) => (
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

                {/* Comparison selector used in the guidance / summary panel */}
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

            {/* Rank chart */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Rank</h2>
                <p className="text-sm text-muted-foreground">Rank over time</p>
              </div>

              <div className="w-full">
                {seriesLoading ? (
                  <div
                    className="flex items-center justify-center rounded-xl border border-dashed border-border/40 bg-background/10 text-sm text-muted-foreground"
                    style={{ height: `${rankChartHeight}px` }}
                  >
                    Loading time-series data...
                  </div>
                ) : chartData.length ? (
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
                          ticks={xAxisTicks}
                        />

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

                        {latestPoint && (
                          <ReferenceLine
                            x={formatXAxisLabel(latestPoint.date, rangePreset)}
                            stroke="rgba(255,255,255,0.18)"
                          />
                        )}

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
                ) : (
                  <div
                    className="flex items-center justify-center rounded-xl border border-dashed border-border/40 bg-background/10 text-sm text-muted-foreground"
                    style={{ height: `${rankChartHeight}px` }}
                  >
                    No time-series data available for this LSOA yet
                  </div>
                )}
              </div>
            </div>

            {/* Decile chart */}
            <div className="space-y-3 border-t border-border/40 pt-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Decile</h2>
                <p className="text-sm text-muted-foreground">Decile over time</p>
              </div>

              <div className="w-full">
                {seriesLoading ? (
                  <div
                    className="flex items-center justify-center rounded-xl border border-dashed border-border/40 bg-background/10 text-sm text-muted-foreground"
                    style={{ height: `${decileChartHeight}px` }}
                  >
                    Loading time-series data...
                  </div>
                ) : chartData.length ? (
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
                          ticks={xAxisTicks}
                        />

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
                ) : (
                  <div
                    className="flex items-center justify-center rounded-xl border border-dashed border-border/40 bg-background/10 text-sm text-muted-foreground"
                    style={{ height: `${decileChartHeight}px` }}
                  >
                    No time-series data available for this LSOA yet
                  </div>
                )}
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Placeholder card reserved for future charts */}
        <GlassCard className="p-6 min-h-[775px]">
          <div className="h-full rounded-xl border border-dashed border-border/40 bg-background/10 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">
              Additional charts to be added
            </p>
          </div>
        </GlassCard>

        {/* Right-hand summary card for the selected LSOA */}
        <GlassCard className="p-6">
          <div className="space-y-5">
            <div className="space-y-3">
              <h2 className="text-2xl font-bold text-foreground">
                {selectedLsoaLabel || "Loading..."}
              </h2>

              <div className="rounded-xl border border-border/40 bg-background/20 p-4">
                <div className="flex items-start gap-3">
                  <MapPinned className="h-5 w-5 text-primary mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm uppercase tracking-wider text-muted-foreground">
                      Ward (2020)
                    </p>
                    <p className="text-base font-semibold text-foreground">
                      {lookupLoading ? "Loading..." : selectedWardName ?? "Ward not available"}
                    </p>
                    {selectedWardCode && (
                      <p className="text-sm text-muted-foreground">
                        Code: {selectedWardCode}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border/40 bg-background/20 p-4 space-y-3">
              <p className="text-lg leading-relaxed text-foreground">
                {seriesLoading ? "Loading area summary..." : areaSummary}
              </p>
              <p className="text-lg text-muted-foreground">
                Viewed range: {visibleRangeLabel}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div className="rounded-xl border border-border/40 bg-background/20 p-4">
                <p className="text-xl text-muted-foreground">Rank change</p>
                <p className="mt-2 text-lg font-semibold text-foreground">
                  {seriesLoading ? "Loading..." : rankChangeText}
                </p>
              </div>

              <div className="rounded-xl border border-border/40 bg-background/20 p-4">
                <p className="text-xl text-muted-foreground">Decile change</p>
                <p className="mt-2 text-lg font-semibold text-foreground">
                  {seriesLoading ? "Loading..." : decileChangeText}
                </p>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Guidance card explaining how to interpret the page */}
        <GlassCard className="p-5">
          <div className="space-y-4">
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
        </GlassCard>
      </div>
    </div>
  );
}