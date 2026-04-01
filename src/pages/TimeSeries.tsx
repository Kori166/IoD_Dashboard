import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Info,
  MapPinned,
  Minus,
  RotateCcw,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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

type RangePreset = "5Y" | "Max";
type SelectionMetric = "rank" | "decile";

type TimePoint = {
  date: string;
  rank: number;
  decile: number;
};

type AreaSeries = {
  code: string;
  label: string;
  points: TimePoint[];
};

type LsoaWardLookupRow = {
  lsoa_code: string;
  lsoa_name?: string;
  ward_code?: string;
  ward_name?: string;
};

type SelectOption = {
  code: string;
  label: string;
};

type GeographyMode = "LSOA" | "Ward";

type SelectedChartSeriesMeta = {
  code: string;
  label: string;
  currentDecile: number | null;
  color: string;
  wardName: string | null;
};

type ChangeDirection = "up" | "down" | "flat";

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

const DECILE_COLORS: Record<number, string> = {
  1: "#F4EFFA",
  2: "#E6DAF6",
  3: "#D2BDF0",
  4: "#BE9BE8",
  5: "#A378DE",
  6: "#845EC9",
  7: "#5E5AB8",
  8: "#395F97",
  9: "#286379",
  10: "#429B7E",
};

function formatDisplayDate(date: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

function formatXAxisLabel(date: string) {
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
  }).format(new Date(date));
}

function filterPointsByRange(points: TimePoint[], preset: RangePreset) {
  if (!points.length) return [];
  if (preset === "Max") return points;

  const latestYear = Math.max(...points.map((point) => new Date(point.date).getFullYear()));
  const startYear = latestYear - 4;

  return points.filter((point) => {
    const year = new Date(point.date).getFullYear();
    return year >= startYear && year <= latestYear;
  });
}

function getIntegerDomain(values: number[], fallbackMax: number) {
  const maxValue = values.length ? Math.max(...values, fallbackMax) : fallbackMax;
  return [1, Math.ceil(maxValue)];
}

function getDecileLabel(decile: number) {
  return `${decile}`;
}

function getRankChangeText(delta: number) {
  if (delta < 0) return `More deprived by ${Math.abs(delta)} rank`;
  if (delta > 0) return `Less deprived by ${delta} rank`;
  return "No rank change";
}

function getDecileChangeText(delta: number) {
  if (delta < 0) return `More deprived by ${Math.abs(delta)} decile`;
  if (delta > 0) return `Less deprived by ${delta} decile`;
  return "No decile change";
}

function getRangeLabel(points: TimePoint[]) {
  if (!points.length) return "No data";
  const first = new Date(points[0].date).getFullYear();
  const last = new Date(points[points.length - 1].date).getFullYear();
  return `${first} to ${last}`;
}

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

function getXAxisTicks(data: { date: string; xLabel: string }[]) {
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

function getLatestVisiblePoint(series: AreaSeries, rangePreset: RangePreset) {
  const points = filterPointsByRange(series.points, rangePreset);
  return points.length ? points[points.length - 1] : null;
}

function getInstabilityScore(series: AreaSeries) {
  if (!series.points.length) return 0;
  const ranks = series.points.map((point) => point.rank);
  return Math.max(...ranks) - Math.min(...ranks);
}

function getDecileColor(decile: number | null | undefined) {
  if (!decile) return DECILE_COLORS[10];
  return DECILE_COLORS[decile] ?? DECILE_COLORS[10];
}

function getChangeDirection(delta: number): ChangeDirection {
  if (delta > 0) return "up";
  if (delta < 0) return "down";
  return "flat";
}

function ChangeIndicator({
  direction,
  text,
}: {
  direction: ChangeDirection;
  text: string;
}) {
  const icon =
    direction === "up" ? (
      <ArrowUp className="h-4 w-4 text-emerald-400" />
    ) : direction === "down" ? (
      <ArrowDown className="h-4 w-4 text-red-400" />
    ) : (
      <Minus className="h-4 w-4 text-muted-foreground" />
    );

  return (
    <div className="mt-2 flex items-center gap-2">
      {icon}
      <p className="text-base font-semibold text-foreground">{text}</p>
    </div>
  );
}

export default function TimeSeries() {
  const [geographyMode, setGeographyMode] = useState<GeographyMode>("LSOA");
  const [rangePreset, setRangePreset] = useState<RangePreset>("Max");
  const [selectionMetric, setSelectionMetric] = useState<SelectionMetric>("rank");

  // Selected comparison sets. The first item acts as the primary item.
  const [selectedLsoas, setSelectedLsoas] = useState<string[]>([]);
  const [selectedWards, setSelectedWards] = useState<string[]>([]);

  const [lsoaSeriesData, setLsoaSeriesData] = useState<AreaSeries[]>([]);
  const [wardSeriesData, setWardSeriesData] = useState<AreaSeries[]>([]);
  const [lsoaWardLookup, setLsoaWardLookup] = useState<LsoaWardLookupRow[]>([]);

  const [lsoaLoading, setLsoaLoading] = useState(true);
  const [wardLoading, setWardLoading] = useState(true);
  const [lookupLoading, setLookupLoading] = useState(true);

  const rankChartHeight = 360;
  const decileChartHeight = 220;
  const barChartHeight = 340;

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

  const pageLoading = lsoaLoading || wardLoading || lookupLoading;

  const lsoaSeriesByCode = useMemo(() => {
    return new Map(lsoaSeriesData.map((item) => [item.code, item]));
  }, [lsoaSeriesData]);

  const wardSeriesByCode = useMemo(() => {
    return new Map(wardSeriesData.map((item) => [item.code, item]));
  }, [wardSeriesData]);

  const lsoaWardByLsoaCode = useMemo(() => {
    return new Map(lsoaWardLookup.map((row) => [row.lsoa_code, row]));
  }, [lsoaWardLookup]);

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

  const lsoaOptions = useMemo<SelectOption[]>(() => {
    const optionMap = new Map<string, string>();

    for (const row of lsoaWardLookup) {
      const code = row.lsoa_code?.trim();
      const label = row.lsoa_name?.trim();
      if (code) optionMap.set(code, label || code);
    }

    for (const series of lsoaSeriesData) {
      if (!optionMap.has(series.code)) {
        optionMap.set(series.code, series.label);
      }
    }

    return Array.from(optionMap.entries())
      .map(([code, label]) => ({ code, label }))
      .sort((a, b) => a.label.localeCompare(b.label, "en-GB"));
  }, [lsoaWardLookup, lsoaSeriesData]);

  useEffect(() => {
    if (!selectedLsoas.length && lsoaOptions.length) {
      setSelectedLsoas([lsoaOptions[0].code]);
    }
  }, [selectedLsoas.length, lsoaOptions]);

  useEffect(() => {
    if (!selectedWards.length && wardOptions.length) {
      setSelectedWards([wardOptions[0].code]);
    }
  }, [selectedWards.length, wardOptions]);

  useEffect(() => {
    const allowedCodes = new Set(lsoaOptions.map((item) => item.code));
    setSelectedLsoas((current) => {
      const next = current.filter((code) => allowedCodes.has(code));
      return next.length ? Array.from(new Set(next)).slice(0, 5) : current;
    });
  }, [lsoaOptions]);

  useEffect(() => {
    const allowedCodes = new Set(wardOptions.map((item) => item.code));
    setSelectedWards((current) => {
      const next = current.filter((code) => allowedCodes.has(code));
      return next.length ? Array.from(new Set(next)).slice(0, 5) : current;
    });
  }, [wardOptions]);

  const primarySelectedLsoa = selectedLsoas[0] ?? "";
  const primarySelectedWard = selectedWards[0] ?? "";

  const activeSeriesData = geographyMode === "LSOA" ? lsoaSeriesData : wardSeriesData;
  const totalAreas = activeSeriesData.length;

  const selectedAreaSeries = useMemo(() => {
    if (geographyMode === "LSOA") {
      return primarySelectedLsoa
        ? lsoaSeriesByCode.get(primarySelectedLsoa) ?? null
        : null;
    }

    return primarySelectedWard
      ? wardSeriesByCode.get(primarySelectedWard) ?? null
      : null;
  }, [
    geographyMode,
    primarySelectedLsoa,
    primarySelectedWard,
    lsoaSeriesByCode,
    wardSeriesByCode,
  ]);

  const selectedWardLookup = useMemo(() => {
    if (geographyMode !== "LSOA" || !primarySelectedLsoa) return null;
    return lsoaWardByLsoaCode.get(primarySelectedLsoa) ?? null;
  }, [geographyMode, primarySelectedLsoa, lsoaWardByLsoaCode]);

  const selectedAreaLabel =
    selectedAreaSeries?.label ||
    (geographyMode === "LSOA"
      ? lsoaOptions.find((item) => item.code === primarySelectedLsoa)?.label
      : wardOptions.find((item) => item.code === primarySelectedWard)?.label) ||
    "No area selected";

  const selectedAreaWardName = selectedWardLookup?.ward_name?.trim() || null;
  const selectedAreaWardCode = selectedWardLookup?.ward_code?.trim() || null;

  const visiblePoints = useMemo(() => {
    return filterPointsByRange(selectedAreaSeries?.points ?? [], rangePreset);
  }, [selectedAreaSeries, rangePreset]);

  const latestPoint = visiblePoints[visiblePoints.length - 1];
  const previousPoint =
    visiblePoints.length > 1 ? visiblePoints[visiblePoints.length - 2] : latestPoint;

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

  const rankChangeDirection = getChangeDirection(roundedRankDelta);
  const decileChangeDirection = getChangeDirection(roundedDecileDelta);

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

  const mainChartSeries = useMemo(() => {
    if (geographyMode === "LSOA") {
      return selectedLsoas
        .slice(0, 5)
        .map((code) => lsoaSeriesByCode.get(code))
        .filter(Boolean) as AreaSeries[];
    }

    return selectedWards
      .slice(0, 5)
      .map((code) => wardSeriesByCode.get(code))
      .filter(Boolean) as AreaSeries[];
  }, [
    geographyMode,
    selectedLsoas,
    selectedWards,
    lsoaSeriesByCode,
    wardSeriesByCode,
  ]);

  const mainChartSeriesMeta = useMemo<SelectedChartSeriesMeta[]>(() => {
    return mainChartSeries.map((series) => {
      const latestVisible = getLatestVisiblePoint(series, rangePreset);
      const currentVisibleDecile = latestVisible?.decile ?? null;
      const wardName =
        geographyMode === "LSOA"
          ? lsoaWardByLsoaCode.get(series.code)?.ward_name?.trim() || null
          : null;

      return {
        code: series.code,
        label: series.label,
        currentDecile: currentVisibleDecile,
        color: getDecileColor(currentVisibleDecile),
        wardName,
      };
    });
  }, [mainChartSeries, rangePreset, geographyMode, lsoaWardByLsoaCode]);

  const mainRankChartData = useMemo(() => {
    if (!mainChartSeries.length) return [];

    const pointsByDate = new Map<string, Record<string, string | number | null>>();

    for (const series of mainChartSeries) {
      const filteredPoints = filterPointsByRange(series.points, rangePreset);
      const wardName =
        geographyMode === "LSOA"
          ? lsoaWardByLsoaCode.get(series.code)?.ward_name?.trim() || null
          : null;

      for (const point of filteredPoints) {
        const key = point.date;
        const existing = pointsByDate.get(key) ?? {
          date: point.date,
          shortDate: formatDisplayDate(point.date),
          xLabel: formatXAxisLabel(point.date),
        };

        existing[series.code] = point.rank;
        existing[`${series.code}__decile`] = point.decile;
        existing[`${series.code}__label`] = series.label;
        existing[`${series.code}__ward`] = wardName;
        pointsByDate.set(key, existing);
      }
    }

    return Array.from(pointsByDate.values()).sort((a, b) => {
      return new Date(String(a.date)).getTime() - new Date(String(b.date)).getTime();
    });
  }, [mainChartSeries, rangePreset, geographyMode, lsoaWardByLsoaCode]);

  const xAxisTicks = useMemo(() => {
    return getXAxisTicks(mainRankChartData as { date: string; xLabel: string }[]);
  }, [mainRankChartData]);

  const mainRankValues = useMemo(() => {
    const values: number[] = [];

    for (const row of mainRankChartData) {
      for (const meta of mainChartSeriesMeta) {
        const value = row[meta.code];
        if (typeof value === "number") values.push(value);
      }
    }

    return values;
  }, [mainRankChartData, mainChartSeriesMeta]);

  const rankYAxisDomain = useMemo(() => {
    return getIntegerDomain(mainRankValues, 10);
  }, [mainRankValues]);

  const decileChartData = useMemo(() => {
    return visiblePoints.map((point) => ({
      date: point.date,
      shortDate: formatDisplayDate(point.date),
      xLabel: formatXAxisLabel(point.date),
      rank: Math.round(point.rank),
      decile: Math.round(point.decile),
    }));
  }, [visiblePoints]);

  const rankedSnapshot = useMemo(() => {
    const snapshot = activeSeriesData
      .map((series) => {
        const latest = getLatestVisiblePoint(series, rangePreset);
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
  }, [activeSeriesData, rangePreset]);

  const highestRankedArea = rankedSnapshot[0] ?? null;
  const lowestRankedArea = rankedSnapshot[rankedSnapshot.length - 1] ?? null;

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

  const selectedLsoaComparisonSnapshot = useMemo(() => {
    return selectedLsoas
      .slice(0, 5)
      .map((code) => {
        const series = lsoaSeriesByCode.get(code);
        if (!series) return null;

        const latest = getLatestVisiblePoint(series, rangePreset);
        if (!latest) return null;

        const ward = lsoaWardByLsoaCode.get(code);

        return {
          code,
          label: series.label,
          rank: latest.rank,
          decile: latest.decile,
          wardName: ward?.ward_name?.trim() || null,
        };
      })
      .filter(Boolean) as {
      code: string;
      label: string;
      rank: number;
      decile: number;
      wardName: string | null;
    }[];
  }, [selectedLsoas, lsoaSeriesByCode, rangePreset, lsoaWardByLsoaCode]);

  const comparisonMostDeprivedSelectedLsoa =
    selectedLsoaComparisonSnapshot.length
      ? [...selectedLsoaComparisonSnapshot].sort((a, b) => a.rank - b.rank)[0]
      : null;

  const comparisonLeastDeprivedSelectedLsoa =
    selectedLsoaComparisonSnapshot.length
      ? [...selectedLsoaComparisonSnapshot].sort((a, b) => b.rank - a.rank)[0]
      : null;

  const selectionBarData = useMemo(() => {
    const source =
      geographyMode === "LSOA"
        ? selectedLsoas
            .slice(0, 5)
            .map((code) => lsoaSeriesByCode.get(code))
            .filter(Boolean) as AreaSeries[]
        : selectedWards
            .slice(0, 5)
            .map((code) => wardSeriesByCode.get(code))
            .filter(Boolean) as AreaSeries[];

    return source
      .map((series) => {
        const latest = getLatestVisiblePoint(series, rangePreset);
        if (!latest) return null;

        return {
          code: series.code,
          label: series.label,
          rank: latest.rank,
          decile: latest.decile,
          value: selectionMetric === "rank" ? latest.rank : latest.decile,
          color: getDecileColor(latest.decile),
        };
      })
      .filter(Boolean)
      .sort((a, b) => Number(a?.value) - Number(b?.value)) as {
      code: string;
      label: string;
      rank: number;
      decile: number;
      value: number;
      color: string;
    }[];
  }, [
    geographyMode,
    selectedLsoas,
    selectedWards,
    lsoaSeriesByCode,
    wardSeriesByCode,
    rangePreset,
    selectionMetric,
  ]);

  function toggleSelectedLsoa(code: string) {
    setSelectedLsoas((current) => {
      const deduped = Array.from(new Set(current));

      if (deduped.includes(code)) {
        const next = deduped.filter((item) => item !== code);
        return next.length ? next : deduped;
      }

      if (deduped.length >= 5) {
        return deduped;
      }

      return [...deduped, code];
    });
  }

  function toggleSelectedWard(code: string) {
    setSelectedWards((current) => {
      const deduped = Array.from(new Set(current));

      if (deduped.includes(code)) {
        const next = deduped.filter((item) => item !== code);
        return next.length ? next : deduped;
      }

      if (deduped.length >= 5) {
        return deduped;
      }

      return [...deduped, code];
    });
  }

  function resetFilters() {
    setGeographyMode("LSOA");
    setRangePreset("Max");
    setSelectionMetric("rank");
    setSelectedLsoas(lsoaOptions.length ? [lsoaOptions[0].code] : []);
    setSelectedWards(wardOptions.length ? [wardOptions[0].code] : []);
  }

  return (
    <div className="space-y-8 w-full max-w-none px-1 xl:px-2">
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

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.9fr)_380px] gap-6 items-start">
        {/* Left column: charts */}
        <GlassCard className="p-6">
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Rank</h2>
                <p className="text-sm text-muted-foreground">
                  {geographyMode === "LSOA"
                    ? "Compare up to 5 selected LSOAs"
                    : "Compare up to 5 selected wards"}
                </p>
              </div>

              {!!mainChartSeriesMeta.length && (
                <div className="rounded-xl border border-border/40 bg-background/20 p-4">
                  <div className="flex flex-wrap gap-3">
                    {mainChartSeriesMeta.map((item) => (
                      <div
                        key={item.code}
                        className="flex items-center gap-2 rounded-lg border border-border/30 bg-background/20 px-3 py-2"
                      >
                        <span
                          className="h-3 w-3 rounded-full border border-white/20"
                          style={{ backgroundColor: item.color }}
                        />
                        <div className="leading-tight">
                          <p className="text-sm font-medium text-foreground">
                            {item.label} ({item.code})
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Decile {item.currentDecile ?? "n/a"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="w-full">
                {pageLoading ? (
                  <div
                    className="flex items-center justify-center rounded-xl border border-dashed border-border/40 bg-background/10 text-sm text-muted-foreground"
                    style={{ height: `${rankChartHeight}px` }}
                  >
                    Loading time-series data...
                  </div>
                ) : !mainChartSeries.length ? (
                  <div
                    className="flex items-center justify-center rounded-xl border border-dashed border-border/40 bg-background/10 text-sm text-muted-foreground"
                    style={{ height: `${rankChartHeight}px` }}
                  >
                    No areas selected
                  </div>
                ) : mainRankChartData.length ? (
                  <ChartContainer
                    config={rankChartConfig}
                    className="w-full"
                    style={{ height: `${rankChartHeight}px` }}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={mainRankChartData}
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
                          domain={[Math.max(rankYAxisDomain[1], 10), 1]}
                          reversed
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

                        <Tooltip
                          cursor={{
                            stroke: "rgba(255,255,255,0.35)",
                            strokeWidth: 1,
                          }}
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;

                            const row = payload[0]?.payload as Record<string, unknown>;
                            const dateLabel =
                              typeof row.shortDate === "string" ? row.shortDate : "";

                            const items = payload
                              .filter((item) => typeof item.value === "number")
                              .sort((a, b) => Number(a.value) - Number(b.value));

                            return (
                              <div className="rounded-xl border border-border/50 bg-background/95 px-4 py-3 shadow-xl backdrop-blur-sm">
                                <p className="text-sm font-medium text-foreground mb-2">
                                  {dateLabel}
                                </p>

                                <div className="space-y-2">
                                  {items.map((item) => {
                                    const code = String(item.dataKey);
                                    const label = String(row[`${code}__label`] ?? code);
                                    const decile = row[`${code}__decile`];
                                    const ward = row[`${code}__ward`];

                                    return (
                                      <div key={code} className="flex flex-col gap-0.5">
                                        <div className="flex items-center gap-2">
                                          <span
                                            className="h-2.5 w-2.5 rounded-full border border-white/20"
                                            style={{ backgroundColor: item.color }}
                                          />
                                          <span className="text-sm font-medium text-foreground">
                                            {label} ({code})
                                          </span>
                                        </div>
                                        <span className="text-xs text-muted-foreground">
                                          Rank: {Math.round(Number(item.value))}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                          Decile: {decile ?? "n/a"}
                                        </span>
                                        {ward ? (
                                          <span className="text-xs text-muted-foreground">
                                            Ward: {String(ward)}
                                          </span>
                                        ) : null}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          }}
                        />

                        {mainChartSeriesMeta.map((series) => (
                          <Line
                            key={series.code}
                            type="linear"
                            dataKey={series.code}
                            name={series.label}
                            stroke={series.color}
                            strokeWidth={2.5}
                            dot={{
                              r: 3,
                              fill: series.color,
                              stroke: "rgba(255,255,255,0.55)",
                              strokeWidth: 1,
                            }}
                            activeDot={{
                              r: 5,
                              fill: series.color,
                              stroke: "rgba(255,255,255,0.95)",
                              strokeWidth: 2,
                            }}
                            connectNulls={false}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                ) : (
                  <div
                    className="flex items-center justify-center rounded-xl border border-dashed border-border/40 bg-background/10 text-sm text-muted-foreground"
                    style={{ height: `${rankChartHeight}px` }}
                  >
                    No time-series data available for the selected set
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3 border-t border-border/40 pt-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Decile</h2>
                <p className="text-sm text-muted-foreground">
                  Primary selected {geographyMode.toLowerCase()} decile over time
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
                ) : decileChartData.length ? (
                  <ChartContainer
                    config={decileChartConfig}
                    className="w-full"
                    style={{ height: `${decileChartHeight}px` }}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={decileChartData}
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
                        />

                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          tickMargin={10}
                          allowDecimals={false}
                          domain={[10, 1]}
                          reversed
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
                            x={formatXAxisLabel(latestPoint.date)}
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
                          connectNulls={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                ) : (
                  <div
                    className="flex items-center justify-center rounded-xl border border-dashed border-border/40 bg-background/10 text-sm text-muted-foreground"
                    style={{ height: `${decileChartHeight}px` }}
                  >
                    No time-series data available for the primary selected area
                  </div>
                )}
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Middle column: filters and supporting panels */}
        <div className="space-y-6">
          <GlassCard className="p-5">
            <div className="space-y-5">
              <div className="flex items-end justify-between gap-4">
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

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    Time range
                  </label>
                  <div className="inline-flex rounded-lg border border-border/50 bg-background/30 p-1">
                    {(["5Y", "Max"] as RangePreset[]).map((preset) => (
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

                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex items-center gap-2 rounded-lg border border-border/50 bg-background/30 px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground hover:border-primary/40"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </button>
              </div>

              {geographyMode === "LSOA" ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-sm font-medium text-muted-foreground">
                      Compare LSOAs
                    </label>
                    <p className="text-xs text-muted-foreground">
                      {selectedLsoas.length} of 5 shown
                    </p>
                  </div>

                  <div className="rounded-xl border border-border/40 bg-background/20 p-3 max-h-56 overflow-y-auto">
                    <div className="grid grid-cols-1 gap-2">
                      {lsoaOptions.map((lsoa) => {
                        const checked = selectedLsoas.includes(lsoa.code);
                        const disableUnchecked = !checked && selectedLsoas.length >= 5;

                        return (
                          <label
                            key={lsoa.code}
                            className={`flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-sm transition-colors ${
                              disableUnchecked
                                ? "opacity-50 cursor-not-allowed"
                                : "cursor-pointer hover:bg-background/30"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={disableUnchecked}
                                onChange={() => toggleSelectedLsoa(lsoa.code)}
                                className="accent-cyan-400"
                              />
                              <span className="text-foreground">{lsoa.label}</span>
                            </div>
                            {selectedLsoas[0] === lsoa.code ? (
                              <span className="text-[11px] text-primary">Primary</span>
                            ) : null}
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    You can compare up to 5 LSOAs at a time. The first selected LSOA is used for the summary card and KPI details.
                  </p>
                </div>
              ) : null}

              {geographyMode === "Ward" ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-sm font-medium text-muted-foreground">
                      Compare Wards
                    </label>
                    <p className="text-xs text-muted-foreground">
                      {selectedWards.length} of 5 shown
                    </p>
                  </div>

                  <div className="rounded-xl border border-border/40 bg-background/20 p-3 max-h-56 overflow-y-auto">
                    <div className="grid grid-cols-1 gap-2">
                      {wardOptions.map((ward) => {
                        const checked = selectedWards.includes(ward.code);
                        const disableUnchecked = !checked && selectedWards.length >= 5;

                        return (
                          <label
                            key={ward.code}
                            className={`flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-sm transition-colors ${
                              disableUnchecked
                                ? "opacity-50 cursor-not-allowed"
                                : "cursor-pointer hover:bg-background/30"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={disableUnchecked}
                                onChange={() => toggleSelectedWard(ward.code)}
                                className="accent-cyan-400"
                              />
                              <span className="text-foreground">{ward.label}</span>
                            </div>
                            {selectedWards[0] === ward.code ? (
                              <span className="text-[11px] text-primary">Primary</span>
                            ) : null}
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    You can compare up to 5 wards at a time. The first selected ward is used for the summary card and KPI details.
                  </p>
                </div>
              ) : null}
            </div>
          </GlassCard>

          {/* Current selection bar chart */}
          <GlassCard className="p-5">
            <div className="space-y-4">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    Current selection
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Horizontal comparison of selected {geographyMode === "LSOA" ? "LSOAs" : "wards"}
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    View
                  </label>
                  <div className="inline-flex rounded-lg border border-border/50 bg-background/30 p-1">
                    {(["rank", "decile"] as SelectionMetric[]).map((metric) => (
                      <button
                        key={metric}
                        type="button"
                        onClick={() => setSelectionMetric(metric)}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                          selectionMetric === metric
                            ? "bg-primary/15 text-primary"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {metric === "rank" ? "Rank" : "Decile"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ height: barChartHeight }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={selectionBarData}
                    layout="vertical"
                    margin={{ top: 8, right: 16, left: 16, bottom: 8 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      horizontal={false}
                      className="opacity-20"
                    />
                    <XAxis
                      type="number"
                      domain={
                        selectionMetric === "rank"
                          ? [0, "dataMax + 1"]
                          : [0, 10]
                      }
                    />
                    <YAxis
                      type="category"
                      dataKey="label"
                      width={140}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip
                      formatter={(value, _name, item) => {
                        if (selectionMetric === "rank") {
                          return [`Rank ${value}`, item.payload.label];
                        }
                        return [`Decile ${value}`, item.payload.label];
                      }}
                    />
                    <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                      {selectionBarData.map((item) => (
                        <Cell key={item.code} fill={item.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </GlassCard>

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
          <GlassCard className="p-6">
            <div className="space-y-5">
              <div className="space-y-3">
                <h2 className="text-2xl font-bold text-foreground">
                  {selectedAreaLabel || "Loading..."}
                </h2>

                {geographyMode === "LSOA" && selectedLsoas.length === 1 ? (
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
                ) : null}
              </div>

              {geographyMode === "LSOA" && selectedLsoas.length > 1 ? (
                <div className="space-y-4">
                  <div className="rounded-xl border border-border/40 bg-background/20 p-4 space-y-3">
                    <p className="text-base leading-relaxed text-foreground">
                      Comparing {selectedLsoaComparisonSnapshot.length} selected LSOAs across Bristol.
                      The current primary area is <span className="font-semibold">{selectedAreaLabel}</span>.
                    </p>
                    <p className="text-base text-muted-foreground">
                      Viewed range: {visibleRangeLabel}
                    </p>
                  </div>

                  {(comparisonMostDeprivedSelectedLsoa || comparisonLeastDeprivedSelectedLsoa) && (
                    <div className="grid grid-cols-1 gap-3">
                      {comparisonMostDeprivedSelectedLsoa ? (
                        <div className="rounded-xl border border-border/40 bg-background/20 p-4">
                          <p className="text-sm uppercase tracking-wider text-muted-foreground">
                            Most deprived in selection
                          </p>
                          <p className="mt-2 text-base font-semibold text-foreground">
                            {comparisonMostDeprivedSelectedLsoa.label}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Rank {comparisonMostDeprivedSelectedLsoa.rank}, decile {comparisonMostDeprivedSelectedLsoa.decile}
                          </p>
                        </div>
                      ) : null}

                      {comparisonLeastDeprivedSelectedLsoa ? (
                        <div className="rounded-xl border border-border/40 bg-background/20 p-4">
                          <p className="text-sm uppercase tracking-wider text-muted-foreground">
                            Least deprived in selection
                          </p>
                          <p className="mt-2 text-base font-semibold text-foreground">
                            {comparisonLeastDeprivedSelectedLsoa.label}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Rank {comparisonLeastDeprivedSelectedLsoa.rank}, decile {comparisonLeastDeprivedSelectedLsoa.decile}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  )}

                  <div className="rounded-xl border border-border/40 bg-background/20 p-4 space-y-3">
                    <p className="text-sm uppercase tracking-wider text-muted-foreground">
                      Selected LSOAs
                    </p>

                    <div className="space-y-2">
                      {selectedLsoaComparisonSnapshot.map((item) => (
                        <div
                          key={item.code}
                          className="flex items-start justify-between gap-3 rounded-lg border border-border/30 bg-background/20 px-3 py-2"
                        >
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {item.label}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {item.code}
                              {item.wardName ? ` • ${item.wardName}` : ""}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-foreground">
                              Rank {item.rank}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Decile {item.decile}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <>
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
                      <ChangeIndicator
                        direction={rankChangeDirection}
                        text={pageLoading ? "Loading..." : rankChangeText}
                      />
                    </div>

                    <div className="rounded-xl border border-border/40 bg-background/20 p-4">
                      <p className="text-lg text-muted-foreground">Decile change</p>
                      <ChangeIndicator
                        direction={decileChangeDirection}
                        text={pageLoading ? "Loading..." : decileChangeText}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </GlassCard>

          <GlassCard className="p-5">
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">
                Highest vs lowest ranked
              </h2>

              {highestRankedArea && lowestRankedArea ? (
                <div className="space-y-3">
                  <div className="rounded-xl border border-border/40 bg-background/20 p-4 flex items-start gap-3">
                    <ArrowUp className="h-5 w-5 text-red-400 mt-0.5" />
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
                    <ArrowDown className="h-5 w-5 text-emerald-400 mt-0.5" />
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
                <p className="text-sm text-muted-foreground">
                  No ranked comparison available.
                </p>
              )}
            </div>
          </GlassCard>

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
    </div>
  );
}