import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {ArrowDown, ArrowUp, CalendarRange, Filter, MapPinned, TrendingUp} from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { SectionHeader } from "@/components/ui/section-header";

type Mode = "rank" | "decile";
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

const mockSeries: LsoaSeries[] = [
  {
    code: "E01014645",
    label: "Bristol 045C",
    points: [
      { date: "2019-01-01", rank: 8, decile: 1 },
      { date: "2019-07-01", rank: 11, decile: 1 },
      { date: "2020-01-01", rank: 9, decile: 2 },
      { date: "2020-07-01", rank: 11.5, decile: 2 },
      { date: "2021-01-01", rank: 5, decile: 3 },
      { date: "2021-07-01", rank: 7.5, decile: 4 },
      { date: "2022-01-01", rank: 6, decile: 2 },
      { date: "2022-07-01", rank: 10.5, decile: 2 },
      { date: "2023-01-01", rank: 8, decile: 1 },
      { date: "2023-07-01", rank: 13.5, decile: 1 },
      { date: "2024-01-01", rank: 11, decile: 1 },
      { date: "2024-07-01", rank: 14.5, decile: 1 },
      { date: "2025-01-01", rank: 11, decile: 1 },
      { date: "2025-07-18", rank: 12.2, decile: 1 },
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

function formatDisplayDate(date: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
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

function getMetricValue(point: TimePoint, mode: Mode) {
  return mode === "rank" ? point.rank : point.decile;
}

function buildChartPath(
  points: TimePoint[],
  mode: Mode,
  width: number,
  height: number,
  padding: { top: number; right: number; bottom: number; left: number },
) {
  if (!points.length) return "";

  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const values = points.map((point) => getMetricValue(point, mode));
  const minY = 0;
  const maxY = mode === "rank" ? Math.max(...values, 20) : 10;

  return points
    .map((point, index) => {
      const x =
        padding.left +
        (index / Math.max(points.length - 1, 1)) * innerWidth;

      const rawValue = getMetricValue(point, mode);
      const y =
        padding.top + innerHeight - ((rawValue - minY) / (maxY - minY || 1)) * innerHeight;

      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
}

function getPointPosition(
  points: TimePoint[],
  mode: Mode,
  width: number,
  height: number,
  padding: { top: number; right: number; bottom: number; left: number },
  pointIndex: number,
) {
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const values = points.map((point) => getMetricValue(point, mode));
  const minY = 0;
  const maxY = mode === "rank" ? Math.max(...values, 20) : 10;

  const x =
    padding.left +
    (pointIndex / Math.max(points.length - 1, 1)) * innerWidth;

  const rawValue = getMetricValue(points[pointIndex], mode);
  const y =
    padding.top + innerHeight - ((rawValue - minY) / (maxY - minY || 1)) * innerHeight;

  return { x, y };
}

export default function TimeSeries() {
  // Current chart mode: rank line or decile step/line.
  const [mode, setMode] = useState<Mode>("rank");

  // Time range preset for filtering visible points.
  const [rangePreset, setRangePreset] = useState<RangePreset>("Max");

  // Selected LSOA from the dropdown.
  const [selectedLsoa, setSelectedLsoa] = useState<string>(mockSeries[0].code);

  // Comparison basis for the summary deltas.
  const [compareMode, setCompareMode] = useState<
    "previous_release" | "custom_year" | "custom_month"
  >("previous_release");

  const selectedSeries = useMemo(() => {
    return mockSeries.find((item) => item.code === selectedLsoa) ?? mockSeries[0];
  }, [selectedLsoa]);

  const visiblePoints = useMemo(() => {
    return filterPointsByRange(selectedSeries.points, rangePreset);
  }, [selectedSeries, rangePreset]);

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

  const chartWidth = 760;
  const chartHeight = 420;
  const chartPadding = { top: 20, right: 24, bottom: 56, left: 56 };

  const path = buildChartPath(
    visiblePoints,
    mode,
    chartWidth,
    chartHeight,
    chartPadding,
  );

  const activeIndex = visiblePoints.length - 1;
  const activePos = getPointPosition(
    visiblePoints,
    mode,
    chartWidth,
    chartHeight,
    chartPadding,
    Math.max(activeIndex, 0),
  );

  const yMax = mode === "rank"
    ? Math.max(...visiblePoints.map((point) => point.rank), 20)
    : 10;

  const yearTicks = useMemo(() => {
    return visiblePoints.map((point, index) => {
      const year = new Date(point.date).getFullYear();
      const isFirstOfYear =
        index === 0 ||
        year !== new Date(visiblePoints[index - 1].date).getFullYear();

      return isFirstOfYear ? { index, year } : null;
    }).filter(Boolean) as { index: number; year: number }[];
  }, [visiblePoints]);

  return (
    <div className="space-y-8 w-full max-w-none px-1 xl:px-2">
      {/* Page heading */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="space-y-4"
      >
        <SectionHeader title="Time Series 2019-2025 LSOA rankings for Bristol" />
        <p className="text-muted-foreground max-w-5xl text-lg md:text-xl leading-relaxed">
          Track how a selected Bristol LSOA has changed over time by rank or decile,
          compare current position to previous releases, and inspect the observed range.
        </p>
      </motion.div>

      {/* Small summary cards to make the page feel consistent with the dashboard */}
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
                {currentRank.toFixed(1)}
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
              {currentDecile}
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

      {/* Main layout */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.75fr)_360px] gap-6 items-start">
        {/* Chart panel */}
        <GlassCard className="p-6">
          <div className="flex flex-col gap-5">
            {/* Top controls */}
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

              <div className="inline-flex rounded-lg border border-border/50 bg-background/30 p-1">
                <button
                  type="button"
                  onClick={() => setMode("rank")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    mode === "rank"
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Rank
                </button>
                <button
                  type="button"
                  onClick={() => setMode("decile")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    mode === "decile"
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Decile
                </button>
              </div>
            </div>

            {/* SVG chart */}
            <div className="w-full overflow-x-auto">
              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                className="w-full min-w-[680px]"
                role="img"
                aria-label="LSOA time series chart"
              >
                {/* Axes */}
                <line
                  x1={chartPadding.left}
                  y1={chartPadding.top}
                  x2={chartPadding.left}
                  y2={chartHeight - chartPadding.bottom}
                  stroke="currentColor"
                  className="text-border"
                  strokeWidth="1.2"
                />
                <line
                  x1={chartPadding.left}
                  y1={chartHeight - chartPadding.bottom}
                  x2={chartWidth - chartPadding.right}
                  y2={chartHeight - chartPadding.bottom}
                  stroke="currentColor"
                  className="text-border"
                  strokeWidth="1.2"
                />

                {/* Y labels */}
                <text
                  x="18"
                  y={chartHeight / 2}
                  transform={`rotate(-90, 18, ${chartHeight / 2})`}
                  className="fill-muted-foreground"
                  fontSize="14"
                >
                  {mode === "rank" ? "Rank" : "Decile"}
                </text>

                <text
                  x={chartPadding.left - 12}
                  y={chartPadding.top + 4}
                  textAnchor="end"
                  className="fill-muted-foreground"
                  fontSize="14"
                >
                  {yMax}
                </text>

                <text
                  x={chartPadding.left - 12}
                  y={chartHeight - chartPadding.bottom + 4}
                  textAnchor="end"
                  className="fill-muted-foreground"
                  fontSize="14"
                >
                  0
                </text>

                {/* Year ticks */}
                {yearTicks.map((tick) => {
                  const x =
                    chartPadding.left +
                    (tick.index / Math.max(visiblePoints.length - 1, 1)) *
                      (chartWidth - chartPadding.left - chartPadding.right);

                  return (
                    <text
                      key={`${tick.year}-${tick.index}`}
                      x={x}
                      y={chartHeight - 18}
                      textAnchor="middle"
                      className="fill-muted-foreground"
                      fontSize="14"
                    >
                      {tick.year}
                    </text>
                  );
                })}

                {/* Current point guide line */}
                <line
                  x1={activePos.x}
                  y1={chartPadding.top}
                  x2={activePos.x}
                  y2={chartHeight - chartPadding.bottom}
                  stroke="rgba(34,197,94,0.35)"
                  strokeDasharray="5 5"
                />

                {/* Main series path */}
                <path
                  d={path}
                  fill="none"
                  stroke={mode === "rank" ? "rgb(74 222 128)" : "rgb(34 211 238)"}
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />

                {/* Active point */}
                <circle
                  cx={activePos.x}
                  cy={activePos.y}
                  r="7"
                  fill="rgb(74 222 128)"
                />

                {/* Tooltip-style callout */}
                <foreignObject
                  x={Math.min(activePos.x + 10, chartWidth - 170)}
                  y={Math.max(activePos.y - 50, chartPadding.top + 8)}
                  width="150"
                  height="72"
                >
                  <div className="rounded-xl border border-border/60 bg-background/85 backdrop-blur-md px-3 py-2 shadow-lg">
                    <p className="text-lg font-semibold text-foreground">
                      {mode === "rank"
                        ? latestPoint.rank.toFixed(1)
                        : latestPoint.decile}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDisplayDate(latestPoint.date)}
                    </p>
                  </div>
                </foreignObject>
              </svg>
            </div>
          </div>
        </GlassCard>

        {/* Right sidebar */}
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
                  {currentRank.toFixed(1)} / 268
                </span>

                <span className="text-muted-foreground">Current Decile</span>
                <span className="font-semibold text-foreground">{currentDecile}</span>

                <span className="text-muted-foreground">Most deprived observed rank</span>
                <span className="font-semibold text-foreground">
                  {mostDeprivedObservedRank} / 268
                </span>

                <span className="text-muted-foreground">Least deprived observed rank</span>
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
                      e.target.value as "previous_release" | "custom_year" | "custom_month",
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
                      {rankDelta > 0 ? `+${rankDelta.toFixed(1)}` : rankDelta.toFixed(1)}
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
                      {decileDelta > 0 ? `+${decileDelta}` : decileDelta}
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