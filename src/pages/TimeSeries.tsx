import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronsUpDown,
  Minus,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { GlassCard } from "@/components/ui/glass-card";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";

type RangePreset = "5Y" | "Max";
type GeographyMode = "LSOA" | "Ward";
type SortMode = "selection" | "change";

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

type SearchResult = {
  kind: GeographyMode;
  code: string;
  label: string;
  subLabel: string;
  selected: boolean;
};

type SelectedChartSeriesMeta = {
  code: string;
  label: string;
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

const SERIES_PALETTE = [
  "#22d3ee",
  "#a78bfa",
  "#f472b6",
  "#34d399",
  "#f59e0b",
] as const;

const MAX_SELECTION = 5;

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

function getXAxisTicks(data: { xLabel: string }[]) {
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

function getChangeDirection(delta: number): ChangeDirection {
  if (delta > 0) return "up";
  if (delta < 0) return "down";
  return "flat";
}

function buildSparklinePath(values: number[], width: number, height: number) {
  if (!values.length) return "";
  if (values.length === 1) return `M 0 ${height / 2} L ${width} ${height / 2}`;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = width / (values.length - 1);

  return values
    .map((value, index) => {
      const x = index * stepX;
      const y = height - ((value - min) / range) * height;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function ChangeText({ delta }: { delta: number }) {
  if (delta < 0) {
    return <span className="text-red-300">↓ {Math.abs(delta)} places (more deprived)</span>;
  }
  if (delta > 0) {
    return <span className="text-emerald-300">↑ {delta} places (less deprived)</span>;
  }
  return <span className="text-muted-foreground">No net change</span>;
}

function TrendIcon({ direction }: { direction: ChangeDirection }) {
  if (direction === "up") return <ArrowUp className="h-4 w-4 text-emerald-400" />;
  if (direction === "down") return <ArrowDown className="h-4 w-4 text-red-400" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

export default function TimeSeries() {
  const [geographyMode, setGeographyMode] = useState<GeographyMode>("LSOA");
  const [rangePreset, setRangePreset] = useState<RangePreset>("Max");
  const [sortMode, setSortMode] = useState<SortMode>("selection");

  const [selectedLsoas, setSelectedLsoas] = useState<string[]>([]);
  const [selectedWards, setSelectedWards] = useState<string[]>([]);

  const [hoveredCode, setHoveredCode] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeSearchIndex, setActiveSearchIndex] = useState(0);

  const [lsoaSeriesData, setLsoaSeriesData] = useState<AreaSeries[]>([]);
  const [wardSeriesData, setWardSeriesData] = useState<AreaSeries[]>([]);
  const [lsoaWardLookup, setLsoaWardLookup] = useState<LsoaWardLookupRow[]>([]);

  const [lsoaLoading, setLsoaLoading] = useState(true);
  const [wardLoading, setWardLoading] = useState(true);
  const [lookupLoading, setLookupLoading] = useState(true);

  const rankChartHeight = 380;
  const decileChartHeight = 220;

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

  const lsoaSeriesByCode = useMemo(() => new Map(lsoaSeriesData.map((item) => [item.code, item])), [lsoaSeriesData]);
  const wardSeriesByCode = useMemo(() => new Map(wardSeriesData.map((item) => [item.code, item])), [wardSeriesData]);
  const lsoaWardByLsoaCode = useMemo(() => new Map(lsoaWardLookup.map((row) => [row.lsoa_code, row])), [lsoaWardLookup]);

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

  const activeSelectedCodes = geographyMode === "LSOA" ? selectedLsoas : selectedWards;
  const primaryCode = activeSelectedCodes[0] ?? "";

  const activeSeriesByCode = geographyMode === "LSOA" ? lsoaSeriesByCode : wardSeriesByCode;
  const totalAreas = geographyMode === "LSOA" ? lsoaSeriesData.length : wardSeriesData.length;

  const selectedSeries = useMemo(
    () =>
      activeSelectedCodes
        .slice(0, MAX_SELECTION)
        .map((code) => activeSeriesByCode.get(code))
        .filter(Boolean) as AreaSeries[],
    [activeSelectedCodes, activeSeriesByCode],
  );

  const seriesColorMap = useMemo(() => {
    const map = new Map<string, string>();
    activeSelectedCodes.slice(0, MAX_SELECTION).forEach((code, index) => {
      map.set(code, SERIES_PALETTE[index % SERIES_PALETTE.length]);
    });
    return map;
  }, [activeSelectedCodes]);

  const selectedSeriesMeta = useMemo<SelectedChartSeriesMeta[]>(
    () =>
      selectedSeries.map((series) => ({
        code: series.code,
        label: series.label,
        color: seriesColorMap.get(series.code) ?? SERIES_PALETTE[0],
        wardName:
          geographyMode === "LSOA"
            ? lsoaWardByLsoaCode.get(series.code)?.ward_name?.trim() || null
            : null,
      })),
    [selectedSeries, seriesColorMap, geographyMode, lsoaWardByLsoaCode],
  );

  const primarySeries = primaryCode ? activeSeriesByCode.get(primaryCode) ?? null : null;
  const primaryVisiblePoints = useMemo(
    () => filterPointsByRange(primarySeries?.points ?? [], rangePreset),
    [primarySeries, rangePreset],
  );
  const primaryLatest = primaryVisiblePoints[primaryVisiblePoints.length - 1] ?? null;
  const primaryPrevious =
    primaryVisiblePoints.length > 1
      ? primaryVisiblePoints[primaryVisiblePoints.length - 2]
      : primaryLatest;

  const primaryDelta = primaryLatest && primaryPrevious ? Math.round(primaryLatest.rank - primaryPrevious.rank) : 0;

  const mainRankChartData = useMemo(() => {
    if (!selectedSeries.length) return [];

    const pointsByDate = new Map<string, Record<string, string | number | null>>();

    for (const series of selectedSeries) {
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

    return Array.from(pointsByDate.values()).sort(
      (a, b) => new Date(String(a.date)).getTime() - new Date(String(b.date)).getTime(),
    );
  }, [selectedSeries, rangePreset, geographyMode, lsoaWardByLsoaCode]);

  const xAxisTicks = useMemo(() => getXAxisTicks(mainRankChartData as { xLabel: string }[]), [mainRankChartData]);

  const mainRankValues = useMemo(() => {
    const values: number[] = [];
    for (const row of mainRankChartData) {
      for (const meta of selectedSeriesMeta) {
        const value = row[meta.code];
        if (typeof value === "number") values.push(value);
      }
    }
    return values;
  }, [mainRankChartData, selectedSeriesMeta]);

  const rankYAxisDomain = useMemo(() => getIntegerDomain(mainRankValues, 10), [mainRankValues]);

  const decileChartData = useMemo(
    () =>
      primaryVisiblePoints.map((point) => ({
        date: point.date,
        shortDate: formatDisplayDate(point.date),
        xLabel: formatXAxisLabel(point.date),
        rank: Math.round(point.rank),
        decile: Math.round(point.decile),
      })),
    [primaryVisiblePoints],
  );

  const lsoaSearchBase = useMemo(() => {
    return lsoaOptions.map((option) => {
      const wardName = lsoaWardByLsoaCode.get(option.code)?.ward_name?.trim();
      return {
        kind: "LSOA" as const,
        code: option.code,
        label: option.label,
        subLabel: wardName ? `${option.code} · ${wardName}` : option.code,
      };
    });
  }, [lsoaOptions, lsoaWardByLsoaCode]);

  const wardSearchBase = useMemo(
    () =>
      wardOptions.map((option) => ({
        kind: "Ward" as const,
        code: option.code,
        label: option.label,
        subLabel: option.code,
      })),
    [wardOptions],
  );

  const searchResults = useMemo(() => {
    const term = searchInput.trim().toLowerCase();

    const matches = (item: { label: string; code: string; subLabel: string }) =>
      !term ||
      item.label.toLowerCase().includes(term) ||
      item.code.toLowerCase().includes(term) ||
      item.subLabel.toLowerCase().includes(term);

    const lsoaResults: SearchResult[] = lsoaSearchBase
      .filter(matches)
      .slice(0, 12)
      .map((item) => ({ ...item, selected: selectedLsoas.includes(item.code) }));

    const wardResults: SearchResult[] = wardSearchBase
      .filter(matches)
      .slice(0, 12)
      .map((item) => ({ ...item, selected: selectedWards.includes(item.code) }));

    return { lsoaResults, wardResults };
  }, [searchInput, lsoaSearchBase, wardSearchBase, selectedLsoas, selectedWards]);

  const flattenedSearchResults = useMemo(
    () => [...searchResults.lsoaResults, ...searchResults.wardResults],
    [searchResults],
  );

  useEffect(() => {
    if (!flattenedSearchResults.length) {
      setActiveSearchIndex(0);
      return;
    }
    setActiveSearchIndex((current) => Math.min(current, flattenedSearchResults.length - 1));
  }, [flattenedSearchResults]);

  const selectedAreasSummary = useMemo(() => {
    const rows = selectedSeriesMeta
      .map((meta, index) => {
        const series = activeSeriesByCode.get(meta.code);
        if (!series) return null;
        const points = filterPointsByRange(series.points, rangePreset);
        if (!points.length) return null;

        const start = points[0];
        const end = points[points.length - 1];
        const delta = Math.round(end.rank - start.rank);

        return {
          index,
          code: meta.code,
          label: meta.label,
          wardName: meta.wardName,
          color: meta.color,
          startYear: new Date(start.date).getFullYear(),
          endYear: new Date(end.date).getFullYear(),
          startRank: Math.round(start.rank),
          endRank: Math.round(end.rank),
          delta,
          sparklinePath: buildSparklinePath(
            points.map((point) => point.rank),
            96,
            24,
          ),
        };
      })
      .filter(Boolean) as {
      index: number;
      code: string;
      label: string;
      wardName: string | null;
      color: string;
      startYear: number;
      endYear: number;
      startRank: number;
      endRank: number;
      delta: number;
      sparklinePath: string;
    }[];

    if (sortMode === "change") {
      return [...rows].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
    }

    return rows.sort((a, b) => a.index - b.index);
  }, [selectedSeriesMeta, activeSeriesByCode, rangePreset, sortMode]);

  const selectedListData = useMemo(() => {
    const selectedSet = new Set(activeSelectedCodes);
    const baseOptions = geographyMode === "LSOA" ? lsoaOptions : wardOptions;

    const selected = activeSelectedCodes
      .map((code) => baseOptions.find((option) => option.code === code))
      .filter(Boolean) as SelectOption[];

    const available = baseOptions.filter((option) => !selectedSet.has(option.code));
    return { selected, available };
  }, [activeSelectedCodes, geographyMode, lsoaOptions, wardOptions]);

  function toggleSelectedLsoa(code: string) {
    setSelectedLsoas((current) => {
      const deduped = Array.from(new Set(current));
      if (deduped.includes(code)) {
        const next = deduped.filter((item) => item !== code);
        return next.length ? next : deduped;
      }
      if (deduped.length >= MAX_SELECTION) return deduped;
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
      if (deduped.length >= MAX_SELECTION) return deduped;
      return [...deduped, code];
    });
  }

  function handleSearchSelect(item: SearchResult) {
    setGeographyMode(item.kind);

    if (item.kind === "LSOA") toggleSelectedLsoa(item.code);
    if (item.kind === "Ward") toggleSelectedWard(item.code);

    setSearchOpen(false);
  }

  function handleSelectionToggle(code: string) {
    if (geographyMode === "LSOA") toggleSelectedLsoa(code);
    if (geographyMode === "Ward") toggleSelectedWard(code);
  }

  function getOptionMeta(option: SelectOption) {
    const series = activeSeriesByCode.get(option.code);
    const latest = series ? getLatestVisiblePoint(series, rangePreset) : null;

    if (!latest) {
      return {
        secondary:
          geographyMode === "LSOA"
            ? `${option.code} · ${lsoaWardByLsoaCode.get(option.code)?.ward_name?.trim() ?? "Ward n/a"}`
            : option.code,
        rankDecile: "No time-series data",
      };
    }

    return {
      secondary:
        geographyMode === "LSOA"
          ? `${option.code} · ${lsoaWardByLsoaCode.get(option.code)?.ward_name?.trim() ?? "Ward n/a"}`
          : option.code,
      rankDecile: `Rank ${Math.round(latest.rank)} · Decile ${Math.round(latest.decile)}`,
    };
  }

  function resetFilters() {
    setGeographyMode("LSOA");
    setRangePreset("Max");
    setSortMode("selection");
    setSearchInput("");
    setSelectedLsoas(lsoaOptions.length ? [lsoaOptions[0].code] : []);
    setSelectedWards(wardOptions.length ? [wardOptions[0].code] : []);
  }

  return (
    <div className="space-y-6 w-full max-w-none px-1 xl:px-2">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="space-y-3"
      >
        <h1 className="text-4xl md:text-4xl font-bold text-foreground tracking-tight">
          Time Series 2019-2025 rankings for <span className="text-primary glow-text-cyan">Bristol</span>
        </h1>

        <p className="text-muted-foreground text-base md:text-lg">
          Compare selected LSOAs and wards over time with rank as the primary focus.
        </p>

        {primaryLatest && primarySeries ? (
          <p className="text-sm text-muted-foreground">
            {primarySeries.label} · Rank {Math.round(primaryLatest.rank)} · Decile {Math.round(primaryLatest.decile)} ·{" "}
            <span className="text-foreground/90">
              {primaryDelta < 0 ? `↓ ${Math.abs(primaryDelta)} place` : primaryDelta > 0 ? `↑ ${primaryDelta} place` : "No change"} since last release
            </span>
          </p>
        ) : null}
      </motion.div>

      <GlassCard className="p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-lg border border-border/50 bg-background/30 p-1">
            {(["LSOA", "Ward"] as GeographyMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setGeographyMode(mode)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  geographyMode === mode ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          <div className="inline-flex rounded-lg border border-border/50 bg-background/30 p-1">
            {(["5Y", "Max"] as RangePreset[]).map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setRangePreset(preset)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  rangePreset === preset ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {preset}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={resetFilters}
            className="ml-auto inline-flex items-center gap-2 rounded-lg border border-border/50 bg-background/30 px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground hover:border-primary/40"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>
        </div>

        <div className="mt-4 relative">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={searchInput}
              onFocus={() => setSearchOpen(true)}
              onChange={(event) => {
                setSearchInput(event.target.value);
                setSearchOpen(true);
              }}
              onKeyDown={(event) => {
                if (!flattenedSearchResults.length) return;

                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setSearchOpen(true);
                  setActiveSearchIndex((current) => (current + 1) % flattenedSearchResults.length);
                }

                if (event.key === "ArrowUp") {
                  event.preventDefault();
                  setSearchOpen(true);
                  setActiveSearchIndex((current) =>
                    current === 0 ? flattenedSearchResults.length - 1 : current - 1,
                  );
                }

                if (event.key === "Enter") {
                  event.preventDefault();
                  handleSearchSelect(flattenedSearchResults[activeSearchIndex]);
                }

                if (event.key === "Escape") {
                  setSearchOpen(false);
                }
              }}
              className="w-full rounded-xl border border-border/50 bg-background/30 px-10 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/40"
              placeholder="Search LSOAs or Wards…"
              aria-label="Search LSOAs or Wards"
            />
            {searchInput ? (
              <button
                type="button"
                onClick={() => setSearchInput("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          {searchOpen ? (
            <div className="absolute z-20 mt-2 w-full rounded-xl border border-border/50 bg-background/95 p-2 shadow-2xl backdrop-blur-sm">
              {flattenedSearchResults.length ? (
                <div className="max-h-72 overflow-y-auto space-y-2">
                  <div>
                    <p className="px-2 pb-1 text-[11px] uppercase tracking-wide text-muted-foreground">LSOAs</p>
                    <div className="space-y-1">
                      {searchResults.lsoaResults.map((result) => {
                        const flatIndex = flattenedSearchResults.findIndex(
                          (item) => item.kind === result.kind && item.code === result.code,
                        );
                        const active = flatIndex === activeSearchIndex;

                        return (
                          <button
                            key={`${result.kind}-${result.code}`}
                            type="button"
                            onMouseEnter={() => setActiveSearchIndex(flatIndex)}
                            onClick={() => handleSearchSelect(result)}
                            className={`w-full rounded-lg px-3 py-2 text-left transition-colors ${
                              active ? "bg-primary/15" : "hover:bg-background/50"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-medium text-foreground">{result.label}</span>
                              {result.selected ? <Check className="h-4 w-4 text-primary" /> : null}
                            </div>
                            <p className="text-xs text-muted-foreground">{result.subLabel}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <p className="px-2 pb-1 text-[11px] uppercase tracking-wide text-muted-foreground">Wards</p>
                    <div className="space-y-1">
                      {searchResults.wardResults.map((result) => {
                        const flatIndex = flattenedSearchResults.findIndex(
                          (item) => item.kind === result.kind && item.code === result.code,
                        );
                        const active = flatIndex === activeSearchIndex;

                        return (
                          <button
                            key={`${result.kind}-${result.code}`}
                            type="button"
                            onMouseEnter={() => setActiveSearchIndex(flatIndex)}
                            onClick={() => handleSearchSelect(result)}
                            className={`w-full rounded-lg px-3 py-2 text-left transition-colors ${
                              active ? "bg-primary/15" : "hover:bg-background/50"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-medium text-foreground">{result.label}</span>
                              {result.selected ? <Check className="h-4 w-4 text-primary" /> : null}
                            </div>
                            <p className="text-xs text-muted-foreground">{result.subLabel}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="px-2 py-8 text-center text-sm text-muted-foreground">No matching LSOAs or wards</p>
              )}
            </div>
          ) : null}
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.45fr)_360px] gap-6 items-start">
        <div className="space-y-6">
          <GlassCard className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-foreground">Rank over time</h2>
                <p className="text-xs text-muted-foreground">Lower rank = more deprived</p>
              </div>

              {!!selectedSeriesMeta.length && (
                <div className="flex flex-wrap gap-2">
                  {selectedSeriesMeta.map((item) => (
                    <button
                      key={item.code}
                      type="button"
                      onMouseEnter={() => setHoveredCode(item.code)}
                      onMouseLeave={() => setHoveredCode(null)}
                      onFocus={() => setHoveredCode(item.code)}
                      onBlur={() => setHoveredCode(null)}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 transition-colors ${
                        hoveredCode === item.code
                          ? "border-primary/60 bg-primary/10"
                          : "border-border/30 bg-background/20"
                      }`}
                    >
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-xs text-foreground">{item.label}</span>
                    </button>
                  ))}
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
                ) : !selectedSeries.length ? (
                  <div
                    className="flex items-center justify-center rounded-xl border border-dashed border-border/40 bg-background/10 text-sm text-muted-foreground"
                    style={{ height: `${rankChartHeight}px` }}
                  >
                    No areas selected
                  </div>
                ) : mainRankChartData.length ? (
                  <ChartContainer config={rankChartConfig} className="w-full" style={{ height: `${rankChartHeight}px` }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={mainRankChartData} margin={{ top: 10, right: 18, left: 4, bottom: 6 }}>
                        <defs>
                          {selectedSeriesMeta.map((series) => (
                            <linearGradient key={`gradient-${series.code}`} id={`gradient-${series.code}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={series.color} stopOpacity={0.2} />
                              <stop offset="100%" stopColor={series.color} stopOpacity={0.02} />
                            </linearGradient>
                          ))}
                        </defs>

                        <CartesianGrid vertical={false} strokeDasharray="3 3" className="opacity-30" />
                        <XAxis dataKey="xLabel" tickLine={false} axisLine={false} tickMargin={10} ticks={xAxisTicks} />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          tickMargin={10}
                          allowDecimals={false}
                          domain={[Math.max(rankYAxisDomain[1], 10), 1]}
                          reversed
                        />

                        <Tooltip
                          cursor={{ stroke: "rgba(255,255,255,0.35)", strokeWidth: 1 }}
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;

                            const row = payload[0]?.payload as Record<string, unknown>;
                            const dateLabel = typeof row.shortDate === "string" ? row.shortDate : "";
                            const items = payload
                              .filter((item) => typeof item.value === "number" && !String(item.dataKey).includes("__area"))
                              .sort((a, b) => Number(a.value) - Number(b.value));

                            return (
                              <div className="rounded-xl border border-border/50 bg-background/95 px-4 py-3 shadow-xl backdrop-blur-sm">
                                <p className="text-sm font-medium text-foreground mb-2">{dateLabel}</p>
                                <div className="space-y-2">
                                  {items.map((item) => {
                                    const code = String(item.dataKey).replace("__line", "");
                                    const label = String(row[`${code}__label`] ?? code);
                                    const decile = row[`${code}__decile`];
                                    return (
                                      <div key={code} className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2">
                                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                                          <span className="text-sm text-foreground">{label}</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                          Rank {Math.round(Number(item.value))} · Decile {decile ?? "n/a"}
                                        </p>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          }}
                        />

                        {selectedSeriesMeta.map((series) => (
                          <Area
                            key={`${series.code}-area`}
                            type="linear"
                            dataKey={series.code}
                            stroke="none"
                            fill={`url(#gradient-${series.code})`}
                            isAnimationActive={false}
                            fillOpacity={hoveredCode && hoveredCode !== series.code ? 0.05 : 1}
                          />
                        ))}

                        {selectedSeriesMeta.map((series) => {
                          const muted = hoveredCode && hoveredCode !== series.code;
                          return (
                            <Line
                              key={`${series.code}-line`}
                              type="linear"
                              dataKey={series.code}
                              stroke={series.color}
                              strokeWidth={muted ? 1.5 : 2.8}
                              strokeOpacity={muted ? 0.25 : 1}
                              dot={false}
                              activeDot={{ r: 5, fill: series.color, stroke: "rgba(255,255,255,0.9)", strokeWidth: 2 }}
                              connectNulls={false}
                            />
                          );
                        })}
                      </ComposedChart>
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
          </GlassCard>

          <GlassCard className="p-5">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">Selected areas summary</h3>
                <button
                  type="button"
                  onClick={() => setSortMode((current) => (current === "selection" ? "change" : "selection"))}
                  className="inline-flex items-center gap-2 rounded-md border border-border/50 bg-background/30 px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  <ChevronsUpDown className="h-3.5 w-3.5" />
                  {sortMode === "selection" ? "Selection order" : "Largest change"}
                </button>
              </div>

              <div className="space-y-2">
                {selectedAreasSummary.map((item) => (
                  <div
                    key={item.code}
                    onMouseEnter={() => setHoveredCode(item.code)}
                    onMouseLeave={() => setHoveredCode(null)}
                    className={`rounded-xl border px-3 py-3 transition-colors ${
                      hoveredCode === item.code ? "border-primary/60 bg-primary/10" : "border-border/40 bg-background/20"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                          <p className="text-sm font-semibold text-foreground">{item.label}</p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {item.code}
                          {item.wardName ? ` · ${item.wardName}` : ""}
                        </p>
                      </div>
                      <div className="h-6 w-[98px]">
                        <svg viewBox="0 0 96 24" className="h-6 w-[98px]" role="img" aria-label={`Rank trend for ${item.label}`}>
                          <path d={item.sparklinePath} fill="none" stroke={item.color} strokeWidth="2" strokeLinecap="round" />
                        </svg>
                      </div>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                      <span className="text-muted-foreground">
                        {item.startYear} → {item.endYear}: {item.startRank} → {item.endRank}
                      </span>
                      <TrendIcon direction={getChangeDirection(item.delta)} />
                      <ChangeText delta={item.delta} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-5">
            <div className="space-y-3 border-t border-border/0">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-foreground">Decile (secondary)</h2>
                <p className="text-xs text-muted-foreground">1 = most deprived, 10 = least deprived</p>
              </div>

              {pageLoading ? (
                <div
                  className="flex items-center justify-center rounded-xl border border-dashed border-border/40 bg-background/10 text-sm text-muted-foreground"
                  style={{ height: `${decileChartHeight}px` }}
                >
                  Loading time-series data...
                </div>
              ) : decileChartData.length ? (
                <ChartContainer config={decileChartConfig} className="w-full" style={{ height: `${decileChartHeight}px` }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={decileChartData} margin={{ top: 10, right: 18, left: 4, bottom: 6 }}>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="xLabel" tickLine={false} axisLine={false} tickMargin={10} />
                      <YAxis tickLine={false} axisLine={false} tickMargin={10} allowDecimals={false} domain={[10, 1]} reversed ticks={[1,2,3,4,5,6,7,8,9,10]} />
                      <Tooltip
                        cursor={{ stroke: "rgba(255,255,255,0.35)", strokeWidth: 1 }}
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const row = payload[0]?.payload as Record<string, unknown>;
                          return (
                            <div className="rounded-xl border border-border/50 bg-background/95 px-4 py-3 shadow-xl backdrop-blur-sm">
                              <p className="text-sm font-medium text-foreground">{String(row.shortDate ?? "")}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Decile {Math.round(Number(row.decile))} · Rank {Math.round(Number(row.rank))} of {totalAreas}
                              </p>
                            </div>
                          );
                        }}
                      />
                      <Line type="stepAfter" dataKey="decile" stroke="var(--color-decile)" strokeWidth={2.5} dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </ChartContainer>
              ) : (
                <div
                  className="flex items-center justify-center rounded-xl border border-dashed border-border/40 bg-background/10 text-sm text-muted-foreground"
                  style={{ height: `${decileChartHeight}px` }}
                >
                  No decile data for the primary selected area
                </div>
              )}
            </div>
          </GlassCard>
        </div>

        <div className="space-y-6">
          <GlassCard className="p-5">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Primary selected {geographyMode}</h3>
                {primarySeries && primaryLatest ? (
                  <div className="mt-2 rounded-xl border border-border/40 bg-background/20 p-3">
                    <p className="text-sm font-semibold text-foreground">{primarySeries.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">{primarySeries.code}</p>
                    {geographyMode === "LSOA" ? (
                      <p className="text-xs text-muted-foreground mt-1">
                        Ward: {lsoaWardByLsoaCode.get(primarySeries.code)?.ward_name?.trim() ?? "Not available"}
                      </p>
                    ) : null}
                    <p className="text-sm text-foreground mt-2">
                      Rank {Math.round(primaryLatest.rank)} · Decile {Math.round(primaryLatest.decile)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Lower rank indicates higher deprivation.</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground mt-2">No primary area selected.</p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-foreground">Selected {geographyMode}s</h4>
                  <p className="text-xs text-muted-foreground">{activeSelectedCodes.length} of {MAX_SELECTION}</p>
                </div>

                <div className="mt-2 space-y-2">
                  {selectedListData.selected.map((item) => {
                    const checked = activeSelectedCodes.includes(item.code);
                    const meta = getOptionMeta(item);
                    const color = seriesColorMap.get(item.code) ?? SERIES_PALETTE[0];
                    const active = hoveredCode === item.code;
                    return (
                      <button
                        key={item.code}
                        type="button"
                        onClick={() => handleSelectionToggle(item.code)}
                        onMouseEnter={() => setHoveredCode(item.code)}
                        onMouseLeave={() => setHoveredCode(null)}
                        className={`w-full rounded-xl border px-3 py-2 text-left transition-colors ${
                          active ? "border-primary/60 bg-primary/10" : "border-border/40 bg-background/20 hover:bg-background/30"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex items-start gap-2">
                            <span className="mt-1 h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-foreground">{item.label}</p>
                              <p className="truncate text-xs text-muted-foreground">{meta.secondary}</p>
                              <p className="truncate text-xs text-muted-foreground">{meta.rankDecile}</p>
                            </div>
                          </div>
                          <span className="text-xs text-primary">{checked ? "Selected" : ""}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-border/40 pt-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Available</p>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {selectedListData.available.map((item) => {
                    const meta = getOptionMeta(item);
                    const disableUnchecked = activeSelectedCodes.length >= MAX_SELECTION;
                    return (
                      <button
                        key={item.code}
                        type="button"
                        disabled={disableUnchecked}
                        onClick={() => handleSelectionToggle(item.code)}
                        className={`w-full rounded-lg border border-border/30 px-3 py-2 text-left transition-colors ${
                          disableUnchecked ? "opacity-50 cursor-not-allowed" : "bg-background/20 hover:bg-background/30"
                        }`}
                      >
                        <p className="truncate text-sm text-foreground">{item.label}</p>
                        <p className="truncate text-xs text-muted-foreground">{meta.secondary}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
