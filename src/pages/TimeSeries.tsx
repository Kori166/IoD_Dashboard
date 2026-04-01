import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Info,
  MapPinned,
  TrendingUp,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
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

// Supported time range controls for this page.
type RangePreset = "Year" | "5Y" | "Max";

// Single point in a rank/decile time series.
type TimePoint = {
  date: string;
  rank: number;
  decile: number;
};

// Generic time series structure used by both LSOAs and wards.
type AreaSeries = {
  code: string;
  label: string;
  points: TimePoint[];
};

// LSOA -> Ward lookup row loaded from public/data.
type LsoaWardLookupRow = {
  lsoa_code: string;
  lsoa_name?: string;
  ward_code?: string;
  ward_name?: string;
};

// Simple select option shape.
type SelectOption = {
  code: string;
  label: string;
};

// Active geography mode for the page.
type GeographyMode = "LSOA" | "Ward";

// Shared chart configuration used by the chart wrapper.
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

const comparisonChartConfig = {
  rank: {
    label: "Rank",
    color: "#22d3ee",
  },
} satisfies ChartConfig;

// Format a full release date for tooltips and summaries.
function formatDisplayDate(date: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

// Format x-axis labels depending on time range.
function formatXAxisLabel(date: string, rangePreset: RangePreset) {
  const parsed = new Date(date);

  if (rangePreset === "Year") {
    return new Intl.DateTimeFormat("en-GB", {
      year: "numeric",
    }).format(parsed);
  }

  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
  }).format(parsed);
}

// Return all years present in the data.
function getAvailableYears(series: AreaSeries[]) {
  const years = new Set<number>();

  for (const item of series) {
    for (const point of item.points) {
      years.add(new Date(point.date).getFullYear());
    }
  }

  return Array.from(years).sort((a, b) => a - b);
}

// Filter points based on selected year/range.
function filterPointsByRange(
  points: TimePoint[],
  preset: RangePreset,
  selectedYear: number | null,
) {
  if (!points.length) return [];

  if (preset === "Max") return points;

  if (!selectedYear) return points;

  if (preset === "Year") {
    return points.filter(
      (point) => new Date(point.date).getFullYear() === selectedYear,
    );
  }

  const startYear = selectedYear - 4;
  return points.filter((point) => {
    const year = new Date(point.date).getFullYear();
    return year >= startYear && year <= selectedYear;
  });
}

// Build an integer-only chart domain.
function getIntegerDomain(values: number[], fallbackMax: number) {
  const maxValue = values.length ? Math.max(...values, fallbackMax) : fallbackMax;
  return [0, Math.ceil(maxValue)];
}

// Label for decile card.
function getDecileLabel(decile: number) {
  return `${decile}`;
}

// Rank change text.
function getRankChangeText(delta: number) {
  if (delta < 0) return `More deprived by ${Math.abs(delta)} rank`;
  if (delta > 0) return `Less deprived by ${delta} rank`;
  return "No rank change";
}

// Decile change text.
function getDecileChangeText(delta: number) {
  if (delta < 0) return `More deprived by ${Math.abs(delta)} decile`;
  if (delta > 0) return `Less deprived by ${delta} decile`;
  return "No decile change";
}

// Visible period label.
function getRangeLabel(points: TimePoint[]) {
  if (!points.length) return "No data";
  const first = new Date(points[0].date).getFullYear();
  const last = new Date(points[points.length - 1].date).getFullYear();
  return `${first} to ${last}`;
}

// Summary paragraph for the selected card.
function buildAreaSummary(args: {
  label: string;
  geographyMode: GeographyMode;
  wardName?: string | null;
  hasSeriesData: boolean;
  currentRank: number;
  currentDecile: number;
  minRank: number;
  maxRank: number;
  minDecile: number;
  maxDecile: number;
  totalAreas: number;
}) {
  const {
    label,
    geographyMode,
    wardName,
    hasSeriesData,
    currentRank,
    currentDecile,
    minRank,
    maxRank,
    minDecile,
    maxDecile,
    totalAreas,
  } = args;

  const geographyLabel = geographyMode === "LSOA" ? "Bristol LSOAs" : "Bristol wards";
  const wardText =
    geographyMode === "LSOA" && wardName
      ? ` It sits within ${wardName} ward (2020).`
      : "";

  if (!hasSeriesData) {
    return `${label}.${wardText} Data is not currently available for the selected time range.`;
  }

  return `${label} is currently in decile ${currentDecile} and ranks ${currentRank}th most deprived out of ${totalAreas} ${geographyLabel}.${wardText} Over the period shown, it has ranged between rank ${minRank} and rank ${maxRank}, and between deciles ${minDecile} and ${maxDecile}.`;
}

// Build deduplicated x-axis ticks.
function getXAxisTicks(
  data: { date: string; xLabel: string }[],
  _rangePreset: RangePreset,
) {
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

// Return the latest visible point from a series.
function getLatestVisiblePoint(
  series: AreaSeries,
  rangePreset: RangePreset,
  selectedYear: number | null,
) {
  const points = filterPointsByRange(series.points, rangePreset, selectedYear);
  return points.length ? points[points.length - 1] : null;
}

// Rank spread over the full available time series.
function getInstabilityScore(series: AreaSeries) {
  if (!series.points.length) return 0;
  const ranks = series.points.map((point) => point.rank);
  return Math.max(...ranks) - Math.min(...ranks);
}

export default function TimeSeries() {
  // Core page controls.
  const [geographyMode, setGeographyMode] = useState<GeographyMode>("LSOA");
  const [rangePreset, setRangePreset] = useState<RangePreset>("Max");
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedWard, setSelectedWard] = useState<string>("ALL");
  const [selectedLsoa, setSelectedLsoa] = useState<string>("");
  const [comparisonLsoas, setComparisonLsoas] = useState<string[]>([]);

  // Loaded data states.
  const [lsoaSeriesData, setLsoaSeriesData] = useState<AreaSeries[]>([]);
  const [wardSeriesData, setWardSeriesData] = useState<AreaSeries[]>([]);
  const [lsoaWardLookup, setLsoaWardLookup] = useState<LsoaWardLookupRow[]>([]);

  const [lsoaLoading, setLsoaLoading] = useState(true);
  const [wardLoading, setWardLoading] = useState(true);
  const [lookupLoading, setLookupLoading] = useState(true);

  // Layout sizing.
  const rankChartHeight = 260;
  const decileChartHeight = 220;
  const barChartHeight = 340;
  const comparisonChartHeight = 360;

  // Load LSOA synthetic time series.
  useEffect(() => {
    let isMounted = true;

    async function loadLsoaSeriesData() {
      try {
        const response = await fetch("/data/bristol_lsoa_timeseries_synthetic.json");
        if (!response.ok) {
          throw new Error(`Failed to load LSOA time-series data: ${response.status}`);
        }

        const data = (await response.json()) as AreaSeries[];
        if (isMounted) setLsoaSeriesData(data);
      } catch (error) {
        console.error("Could not load LSOA time-series data", error);
        if (isMounted) setLsoaSeriesData([]);
      } finally {
        if (isMounted) setLsoaLoading(false);
      }
    }

    loadLsoaSeriesData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Load Ward synthetic time series.
  useEffect(() => {
    let isMounted = true;

    async function loadWardSeriesData() {
      try {
        const response = await fetch("/data/bristol_ward_timeseries_synthetic.json");
        if (!response.ok) {
          throw new Error(`Failed to load Ward time-series data: ${response.status}`);
        }

        const data = (await response.json()) as AreaSeries[];
        if (isMounted) setWardSeriesData(data);
      } catch (error) {
        console.error("Could not load Ward time-series data", error);
        if (isMounted) setWardSeriesData([]);
      } finally {
        if (isMounted) setWardLoading(false);
      }
    }

    loadWardSeriesData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Load LSOA -> Ward lookup.
  useEffect(() => {
    let isMounted = true;

    async function loadLookupData() {
      try {
        const response = await fetch("/data/bristol_lsoa21_ward20_lookup.json");
        if (!response.ok) {
          throw new Error(`Failed to load LSOA/Ward lookup: ${response.status}`);
        }

        const data = (await response.json()) as LsoaWardLookupRow[];
        if (isMounted) setLsoaWardLookup(data);
      } catch (error) {
        console.error("Could not load LSOA/Ward lookup", error);
        if (isMounted) setLsoaWardLookup([]);
      } finally {
        if (isMounted) setLookupLoading(false);
      }
    }

    loadLookupData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Combined loading flag.
  const pageLoading = lsoaLoading || wardLoading || lookupLoading;

  // Fast maps for lookups.
  const lsoaSeriesByCode = useMemo(() => {
    return new Map(lsoaSeriesData.map((item) => [item.code, item]));
  }, [lsoaSeriesData]);

  const wardSeriesByCode = useMemo(() => {
    return new Map(wardSeriesData.map((item) => [item.code, item]));
  }, [wardSeriesData]);

  const lsoaWardByLsoaCode = useMemo(() => {
    return new Map(lsoaWardLookup.map((row) => [row.lsoa_code, row]));
  }, [lsoaWardLookup]);

  // Available years across both LSOA and Ward series.
  const availableYears = useMemo(() => {
    return getAvailableYears([...lsoaSeriesData, ...wardSeriesData]);
  }, [lsoaSeriesData, wardSeriesData]);

  // Initialise selected year once data is loaded.
  useEffect(() => {
    if (!selectedYear && availableYears.length) {
      setSelectedYear(String(availableYears[availableYears.length - 1]));
    }
  }, [selectedYear, availableYears]);

  const selectedYearNumber = selectedYear ? Number(selectedYear) : null;

  // Build ward filter options from lookup data.
  const wardOptions = useMemo<SelectOption[]>(() => {
    const wardMap = new Map<string, string>();

    for (const row of lsoaWardLookup) {
      const code = row.ward_code?.trim();
      const name = row.ward_name?.trim();
      if (code && name) wardMap.set(code, name);
    }

    return Array.from(wardMap.entries())
      .map(([code, label]) => ({ code, label }))
      .sort((a, b) => a.label.localeCompare(b.label, "en-GB"));
  }, [lsoaWardLookup]);

  // Build LSOA options based on selected ward.
  const lsoaOptions = useMemo<SelectOption[]>(() => {
    const filtered = selectedWard === "ALL"
      ? lsoaWardLookup
      : lsoaWardLookup.filter((row) => row.ward_code === selectedWard);

    const optionMap = new Map<string, string>();
    for (const row of filtered) {
      const code = row.lsoa_code?.trim();
      const label = row.lsoa_name?.trim();
      if (code) optionMap.set(code, label || code);
    }

    for (const series of lsoaSeriesData) {
      if (!optionMap.has(series.code)) {
        if (selectedWard === "ALL") {
          optionMap.set(series.code, series.label);
        }
      }
    }

    return Array.from(optionMap.entries())
      .map(([code, label]) => ({ code, label }))
      .sort((a, b) => a.label.localeCompare(b.label, "en-GB"));
  }, [selectedWard, lsoaWardLookup, lsoaSeriesData]);

  // Set default selected LSOA from filtered list.
  useEffect(() => {
    if (geographyMode !== "LSOA") return;
    if (!selectedLsoa && lsoaOptions.length) {
      setSelectedLsoa(lsoaOptions[0].code);
    }
  }, [selectedLsoa, lsoaOptions, geographyMode]);

  // Keep selected LSOA valid when Ward filter changes.
  useEffect(() => {
    if (geographyMode !== "LSOA") return;
    if (!lsoaOptions.length) {
      setSelectedLsoa("");
      return;
    }

    const exists = lsoaOptions.some((option) => option.code === selectedLsoa);
    if (!exists) {
      setSelectedLsoa(lsoaOptions[0].code);
    }
  }, [lsoaOptions, selectedLsoa, geographyMode]);

  // Keep comparison LSOAs in sync with current Ward filter.
  useEffect(() => {
    const allowedCodes = new Set(lsoaOptions.map((item) => item.code));
    setComparisonLsoas((current) =>
      current.filter((code) => allowedCodes.has(code)).slice(0, 4),
    );
  }, [lsoaOptions]);

  // Active dataset depends on geography mode.
  const activeSeriesData = geographyMode === "LSOA" ? lsoaSeriesData : wardSeriesData;
  const totalAreas = activeSeriesData.length;

  // Current selected area for the left charts / right summary.
  const selectedAreaSeries = useMemo(() => {
    if (geographyMode === "LSOA") {
      return selectedLsoa ? lsoaSeriesByCode.get(selectedLsoa) ?? null : null;
    }

    const wardCode = selectedWard !== "ALL" ? selectedWard : wardOptions[0]?.code;
    return wardCode ? wardSeriesByCode.get(wardCode) ?? null : null;
  }, [
    geographyMode,
    selectedLsoa,
    selectedWard,
    lsoaSeriesByCode,
    wardSeriesByCode,
    wardOptions,
  ]);

  // Selected ward details for LSOA card.
  const selectedWardLookup = useMemo(() => {
    if (geographyMode !== "LSOA" || !selectedLsoa) return null;
    return lsoaWardByLsoaCode.get(selectedLsoa) ?? null;
  }, [geographyMode, selectedLsoa, lsoaWardByLsoaCode]);

  const selectedAreaLabel =
    selectedAreaSeries?.label ||
    (geographyMode === "LSOA"
      ? lsoaOptions.find((item) => item.code === selectedLsoa)?.label
      : wardOptions.find((item) => item.code === selectedWard)?.label) ||
    "No area selected";

  const selectedAreaWardName = selectedWardLookup?.ward_name?.trim() || null;
  const selectedAreaWardCode = selectedWardLookup?.ward_code?.trim() || null;

  // Visible points for the selected area charts.
  const visiblePoints = useMemo(() => {
    return filterPointsByRange(
      selectedAreaSeries?.points ?? [],
      rangePreset,
      selectedYearNumber,
    );
  }, [selectedAreaSeries, rangePreset, selectedYearNumber]);

  // Latest and previous visible points for change calculations.
  const latestPoint = visiblePoints[visiblePoints.length - 1];
  const previousPoint =
    visiblePoints.length > 1 ? visiblePoints[visiblePoints.length - 2] : latestPoint;

  // Summary stats from the full visible selected series.
  const allRanks = visiblePoints.map((point) => point.rank);
  const allDeciles = visiblePoints.map((point) => point.decile);

  const currentRank = latestPoint?.rank ?? 0;
  const currentDecile = latestPoint?.decile ?? 0;

  const mostDeprivedObservedRank = allRanks.length ? Math.min(...allRanks) : 0;
  const leastDeprivedObservedRank = allRanks.length ? Math.max(...allRanks) : 0;
  const minDecile = allDeciles.length ? Math.min(...allDeciles) : 0;
  const maxDecile = allDeciles.length ? Math.max(...allDeciles) : 0;

  const rankDelta = previousPoint ? currentRank - previousPoint.rank : 0;
  const decileDelta = previousPoint ? currentDecile - previousPoint.decile : 0;

  const roundedCurrentRank = Math.round(currentRank);
  const roundedCurrentDecile = Math.round(currentDecile);
  const roundedRankDelta = Math.round(rankDelta);
  const roundedDecileDelta = Math.round(decileDelta);

  const rankChangeText = visiblePoints.length
    ? getRankChangeText(roundedRankDelta)
    : "No data in selected range";

  const decileChangeText = visiblePoints.length
    ? getDecileChangeText(roundedDecileDelta)
    : "No data in selected range";

  const visibleRangeLabel = getRangeLabel(visiblePoints);

  const areaSummary = buildAreaSummary({
    label: selectedAreaLabel,
    geographyMode,
    wardName: selectedAreaWardName,
    hasSeriesData: visiblePoints.length > 0,
    currentRank: roundedCurrentRank,
    currentDecile: roundedCurrentDecile,
    minRank: mostDeprivedObservedRank,
    maxRank: leastDeprivedObservedRank,
    minDecile,
    maxDecile,
    totalAreas,
  });

  // Main line chart data.
  const chartData = useMemo(() => {
    return visiblePoints.map((point) => ({
      date: point.date,
      shortDate: formatDisplayDate(point.date),
      xLabel: formatXAxisLabel(point.date, rangePreset),
      rank: Math.round(point.rank),
      decile: Math.round(point.decile),
    }));
  }, [visiblePoints, rangePreset]);

  const xAxisTicks = useMemo(() => {
    return getXAxisTicks(chartData, rangePreset);
  }, [chartData, rangePreset]);

  const rankYAxisDomain = useMemo(() => {
    return getIntegerDomain(chartData.map((point) => point.rank), 10);
  }, [chartData]);

  // Snapshot of latest point in selected range for all active areas.
  const rankedSnapshot = useMemo(() => {
    const snapshot = activeSeriesData
      .map((series) => {
        const latest = getLatestVisiblePoint(series, rangePreset, selectedYearNumber);
        if (!latest) return null;

        return {
          code: series.code,
          label: series.label,
          rank: latest.rank,
          decile: latest.decile,
        };
      })
      .filter(Boolean) as { code: string; label: string; rank: number; decile: number }[];

    return snapshot.sort((a, b) => a.rank - b.rank);
  }, [activeSeriesData, rangePreset, selectedYearNumber]);

  // Top and bottom groups for the bar charts.
  const top10Areas = useMemo(() => rankedSnapshot.slice(0, 10), [rankedSnapshot]);
  const bottom10Areas = useMemo(
    () => [...rankedSnapshot].slice(-10).reverse(),
    [rankedSnapshot],
  );

  // Highest vs lowest comparison card.
  const highestRankedArea = rankedSnapshot[0] ?? null;
  const lowestRankedArea = rankedSnapshot[rankedSnapshot.length - 1] ?? null;

  // Most dynamic 5 LSOAs across full available data.
  const dynamicLsoas = useMemo(() => {
    return [...lsoaSeriesData]
      .map((series) => ({
        code: series.code,
        label: series.label,
        instability: getInstabilityScore(series),
      }))
      .sort((a, b) => b.instability - a.instability)
      .slice(0, 5);
  }, [lsoaSeriesData]);

  // Multi-LSOA comparison chart data.
  const comparisonSeries = useMemo(() => {
    return comparisonLsoas
      .map((code) => lsoaSeriesByCode.get(code))
      .filter(Boolean) as AreaSeries[];
  }, [comparisonLsoas, lsoaSeriesByCode]);

  const comparisonChartData = useMemo(() => {
    if (!comparisonSeries.length) return [];

    const pointsByDate = new Map<string, Record<string, string | number>>();

    for (const series of comparisonSeries) {
      const filteredPoints = filterPointsByRange(
        series.points,
        rangePreset,
        selectedYearNumber,
      );

      for (const point of filteredPoints) {
        const key = point.date;
        const existing = pointsByDate.get(key) ?? {
          date: point.date,
          xLabel: formatXAxisLabel(point.date, rangePreset),
          shortDate: formatDisplayDate(point.date),
        };

        existing[series.code] = point.rank;
        pointsByDate.set(key, existing);
      }
    }

    return Array.from(pointsByDate.values()).sort((a, b) =>
      new Date(String(a.date)).getTime() - new Date(String(b.date)).getTime(),
    );
  }, [comparisonSeries, rangePreset, selectedYearNumber]);

  return (
    <div className="space-y-8 w-full max-w-none px-1 xl:px-2">
      {/* Page title and intro */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="space-y-4"
      >
        <h1 className="text-4xl md:text-4xl font-bold text-foreground tracking-tight">
          Time Series 2019-2025 rankings for{" "}
          <span className="text-primary glow-text-cyan">Bristol</span>
        </h1>

        <p className="text-muted-foreground text-lg md:text-xl leading-relaxed">
          Compare deprivation rank and decile over time across Bristol LSOAs and wards,
          explore the strongest and weakest performers, and identify areas with the
          greatest change over time.
        </p>
      </motion.div>

      {/* Main controls row */}
      <GlassCard className="p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4">
          {/* Geography toggle */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Geography
            </label>
            <div className="inline-flex rounded-lg border border-border/50 bg-background/30 p-1">
              {(["LSOA", "Ward"] as GeographyMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setGeographyMode(mode)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    geographyMode === mode
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Selected year */}
          <div className="space-y-2">
            <label
              htmlFor="selected-year"
              className="text-sm font-medium text-muted-foreground"
            >
              Selected year
            </label>
            <select
              id="selected-year"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full rounded-lg border border-border/50 bg-background/40 px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary/50"
            >
              {availableYears.map((year) => (
                <option key={year} value={String(year)}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          {/* Time range */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Time range
            </label>
            <div className="inline-flex rounded-lg border border-border/50 bg-background/30 p-1">
              {(["Year", "5Y", "Max"] as RangePreset[]).map((preset) => (
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

          {/* Ward filter */}
          <div className="space-y-2">
            <label
              htmlFor="ward-filter"
              className="text-sm font-medium text-muted-foreground"
            >
              Ward filter
            </label>
            <select
              id="ward-filter"
              value={selectedWard}
              onChange={(e) => setSelectedWard(e.target.value)}
              className="w-full rounded-lg border border-border/50 bg-background/40 px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary/50"
            >
              <option value="ALL">All wards</option>
              {wardOptions.map((ward) => (
                <option key={ward.code} value={ward.code}>
                  {ward.label}
                </option>
              ))}
            </select>
          </div>

          {/* LSOA subfilter */}
          <div className="space-y-2">
            <label
              htmlFor="lsoa-filter"
              className="text-sm font-medium text-muted-foreground"
            >
              LSOA subfilter
            </label>
            <select
              id="lsoa-filter"
              value={selectedLsoa}
              onChange={(e) => setSelectedLsoa(e.target.value)}
              disabled={geographyMode !== "LSOA"}
              className="w-full rounded-lg border border-border/50 bg-background/40 px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary/50 disabled:opacity-50"
            >
              {lsoaOptions.map((lsoa) => (
                <option key={lsoa.code} value={lsoa.code}>
                  {lsoa.label}
                </option>
              ))}
            </select>
          </div>

          {/* Multi-LSOA comparison select */}
          <div className="space-y-2">
            <label
              htmlFor="comparison-lsoas"
              className="text-sm font-medium text-muted-foreground"
            >
              Compare 2-4 LSOAs
            </label>
            <select
              id="comparison-lsoas"
              multiple
              value={comparisonLsoas}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions).map(
                  (option) => option.value,
                );
                setComparisonLsoas(selected.slice(0, 4));
              }}
              className="w-full rounded-lg border border-border/50 bg-background/40 px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary/50 min-h-[110px]"
            >
              {lsoaOptions.map((lsoa) => (
                <option key={lsoa.code} value={lsoa.code}>
                  {lsoa.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </GlassCard>

      {/* Top summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard className="p-5">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Current rank
            </p>
            <p className="text-2xl font-bold text-foreground">
              {pageLoading
                ? "Loading..."
                : visiblePoints.length
                  ? `${roundedCurrentRank} of ${totalAreas}`
                  : "No data"}
            </p>
            <p className="text-sm text-muted-foreground">
              Lower rank = more deprived in Bristol
            </p>
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Current decile
            </p>
            <p className="text-2xl font-bold text-foreground">
              {pageLoading
                ? "Loading..."
                : visiblePoints.length
                  ? getDecileLabel(roundedCurrentDecile)
                  : "No data"}
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
              {pageLoading ? "Loading..." : rankChangeText}
            </p>
            <p className="text-sm text-muted-foreground">
              {pageLoading ? "Loading..." : decileChangeText}
            </p>
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Best / worst observed position
            </p>
            <p className="text-2xl font-bold text-foreground">
              {pageLoading
                ? "Loading..."
                : visiblePoints.length
                  ? `${mostDeprivedObservedRank} to ${leastDeprivedObservedRank}`
                  : "No data"}
            </p>
            <p className="text-sm text-muted-foreground">
              Across the selected visible range
            </p>
          </div>
        </GlassCard>
      </div>

      {/* Main upper layout */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.95fr)_380px] gap-6 items-start">
        {/* Left column: rank and decile charts */}
        <GlassCard className="p-6">
          <div className="space-y-8">
            {/* Rank chart */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Rank</h2>
                <p className="text-sm text-muted-foreground">
                  {geographyMode} rank over time
                </p>
              </div>

              <div className="w-full">
                {pageLoading ? (
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
                                    Rank: {Math.round(Number(value))} of {totalAreas}
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
                    No time-series data available for the selected area
                  </div>
                )}
              </div>
            </div>

            {/* Decile chart */}
            <div className="space-y-3 border-t border-border/40 pt-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Decile</h2>
                <p className="text-sm text-muted-foreground">
                  {geographyMode} decile over time
                </p>
              </div>

              <div className="w-full">
                {pageLoading ? (
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
                                    Rank: {item.payload.rank} of {totalAreas}
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
                    No time-series data available for the selected area
                  </div>
                )}
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Middle column: ranked lists and instability */}
        <div className="space-y-6">
          {/* Top 10 chart */}
          <GlassCard className="p-5">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">
                  Top 10 {geographyMode === "LSOA" ? "LSOAs" : "Wards"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Lowest ranks in Bristol
                </p>
              </div>

              <div style={{ height: barChartHeight }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[...top10Areas].reverse()}
                    layout="vertical"
                    margin={{ top: 8, right: 16, left: 16, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} className="opacity-20" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="label" width={120} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="rank" radius={[0, 6, 6, 0]}>
                      {top10Areas.map((_, index) => (
                        <Cell key={`top-${index}`} fill="rgba(34,211,238,0.85)" />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </GlassCard>

          {/* Bottom 10 chart */}
          <GlassCard className="p-5">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">
                  Bottom 10 {geographyMode === "LSOA" ? "LSOAs" : "Wards"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Highest ranks in Bristol
                </p>
              </div>

              <div style={{ height: barChartHeight }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={bottom10Areas}
                    layout="vertical"
                    margin={{ top: 8, right: 16, left: 16, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} className="opacity-20" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="label" width={120} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="rank" radius={[0, 6, 6, 0]}>
                      {bottom10Areas.map((_, index) => (
                        <Cell key={`bottom-${index}`} fill="rgba(139,92,246,0.85)" />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </GlassCard>

          {/* Most dynamic LSOAs */}
          <GlassCard className="p-5">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">
                  5 Most Dynamic LSOAs
                </h2>
              </div>

              <div className="space-y-3">
                {dynamicLsoas.map((item) => (
                  <div
                    key={item.code}
                    className="rounded-xl border border-border/40 bg-background/20 p-3 flex items-center justify-between gap-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.code}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-foreground">
                        {item.instability} rank change
                      </p>
                      <p className="text-xs text-muted-foreground">Full period spread</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Right summary column */}
        <div className="space-y-6">
          {/* Selected area summary */}
          <GlassCard className="p-6">
            <div className="space-y-5">
              <div className="space-y-3">
                <h2 className="text-2xl font-bold text-foreground">
                  {selectedAreaLabel || "Loading..."}
                </h2>

                {geographyMode === "LSOA" && (
                  <div className="rounded-xl border border-border/40 bg-background/20 p-4">
                    <div className="flex items-start gap-3">
                      <MapPinned className="h-5 w-5 text-primary mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-sm uppercase tracking-wider text-muted-foreground">
                          Ward (2020)
                        </p>
                        <p className="text-base font-semibold text-foreground">
                          {lookupLoading ? "Loading..." : selectedAreaWardName ?? "Ward not available"}
                        </p>
                        {selectedAreaWardCode && (
                          <p className="text-sm text-muted-foreground">
                            Code: {selectedAreaWardCode}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-border/40 bg-background/20 p-4 space-y-3">
                <p className="text-base leading-relaxed text-foreground">
                  {pageLoading ? "Loading area summary..." : areaSummary}
                </p>
                <p className="text-base text-muted-foreground">
                  Viewed range: {visibleRangeLabel}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div className="rounded-xl border border-border/40 bg-background/20 p-4">
                  <p className="text-lg text-muted-foreground">Rank change</p>
                  <p className="mt-2 text-base font-semibold text-foreground">
                    {pageLoading ? "Loading..." : rankChangeText}
                  </p>
                </div>

                <div className="rounded-xl border border-border/40 bg-background/20 p-4">
                  <p className="text-lg text-muted-foreground">Decile change</p>
                  <p className="mt-2 text-base font-semibold text-foreground">
                    {pageLoading ? "Loading..." : decileChangeText}
                  </p>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Highest vs lowest comparison */}
          <GlassCard className="p-5">
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">
                Highest vs lowest ranked
              </h2>

              {highestRankedArea && lowestRankedArea ? (
                <div className="space-y-3">
                  <div className="rounded-xl border border-border/40 bg-background/20 p-4 flex items-start gap-3">
                    <ArrowUp className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="text-sm uppercase tracking-wider text-muted-foreground">
                        Most deprived
                      </p>
                      <p className="text-base font-semibold text-foreground">
                        {highestRankedArea.label}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Rank {highestRankedArea.rank}, decile {highestRankedArea.decile}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/40 bg-background/20 p-4 flex items-start gap-3">
                    <ArrowDown className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="text-sm uppercase tracking-wider text-muted-foreground">
                        Least deprived
                      </p>
                      <p className="text-base font-semibold text-foreground">
                        {lowestRankedArea.label}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Rank {lowestRankedArea.rank}, decile {lowestRankedArea.decile}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No ranked comparison available.</p>
              )}
            </div>
          </GlassCard>

          {/* Guidance */}
          <GlassCard className="p-5">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-primary" />
                <h3 className="text-base font-semibold text-foreground">
                  Reading this page
                </h3>
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed">
                The line charts show Bristol-relative rank and decile over time.
                Lower rank means greater deprivation within Bristol for the selected
                geography.
              </p>

              <div className="rounded-xl border border-border/40 bg-background/20 p-4 space-y-2">
                <p className="text-sm text-muted-foreground">
                  LSOA: Lower Layer Super Output Area
                </p>
                <p className="text-sm text-muted-foreground">
                  Rank: Bristol-relative position, where lower means more deprived
                </p>
                <p className="text-sm text-muted-foreground">
                  Decile: grouped Bristol-relative band from 1 to 10
                </p>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Bottom section: direct LSOA comparison */}
      <GlassCard className="p-6">
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                Direct LSOA comparison
              </h2>
              <p className="text-sm text-muted-foreground">
                Select between two and four LSOAs to compare their rank trajectories
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              {comparisonLsoas.length} selected
            </p>
          </div>

          {comparisonLsoas.length >= 2 ? (
            <ChartContainer
              config={comparisonChartConfig}
              className="w-full"
              style={{ height: `${comparisonChartHeight}px` }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={comparisonChartData}
                  margin={{ top: 10, right: 24, left: 4, bottom: 6 }}
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
                  />

                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={10}
                    allowDecimals={false}
                    domain={[1, Math.max(totalAreas, 10)]}
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

                  <Tooltip />

                  <Legend />

                  {comparisonSeries.map((series, index) => (
                    <Line
                      key={series.code}
                      type="linear"
                      dataKey={series.code}
                      name={series.label}
                      stroke={[
                        "#22d3ee",
                        "#8b5cf6",
                        "#10b981",
                        "#f59e0b",
                      ][index % 4]}
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          ) : (
            <div className="rounded-xl border border-dashed border-border/40 bg-background/10 p-8 text-sm text-muted-foreground text-center">
              Select at least two LSOAs in the multi-select control above to compare them side by side.
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );
}