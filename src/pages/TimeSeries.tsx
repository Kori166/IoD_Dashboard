import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import {
  ArrowDown,
  ArrowUp,
  Check,
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
type SortMode = "az" | "most_deprived" | "least_deprived";

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
  currentDecile: number | null;
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

const MAX_SELECTION = 5;

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
  if (delta < 0) return "up";
  if (delta > 0) return "down";
  return "flat";
}

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace("#", "");
  const safe =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => char + char)
          .join("")
      : normalized;

  const bigint = Number.parseInt(safe, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function buildSparklinePoints(values: number[], width: number, height: number) {
  if (!values.length) return [];

  if (values.length === 1) {
    return [
      { x: 0, y: height / 2 },
      { x: width, y: height / 2 },
    ];
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = width / (values.length - 1);

  return values.map((value, index) => {
    const x = index * stepX;
    const y = height - ((value - min) / range) * height;
    return { x, y };
  });
}

function buildSparklinePath(values: number[], width: number, height: number) {
  const points = buildSparklinePoints(values, width, height);
  if (!points.length) return "";

  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");
}

function buildSparklineAreaPath(values: number[], width: number, height: number) {
  const points = buildSparklinePoints(values, width, height);
  if (!points.length) return "";

  const linePart = points
    .map((point) => `L ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");

  return `M ${points[0].x.toFixed(2)} ${height} ${linePart} L ${points[points.length - 1].x.toFixed(
    2,
  )} ${height} Z`;
}

function ChangeText({ delta }: { delta: number }) {
  if (delta < 0) {
    return <span className="font-medium text-red-300">{Math.abs(delta)} places (more deprived)</span>;
  }
  if (delta > 0) {
    return <span className="font-medium text-emerald-300">{delta} places (less deprived)</span>;
  }
  return <span className="text-muted-foreground">No net change</span>;
}

function TrendIcon({ direction }: { direction: ChangeDirection }) {
  if (direction === "up") return <ArrowUp className="h-4 w-4 text-red-500" />;
  if (direction === "down") return <ArrowDown className="h-4 w-4 text-emerald-500" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

export default function TimeSeries() {
  const [geographyMode, setGeographyMode] = useState<GeographyMode>("LSOA");
  const [rangePreset, setRangePreset] = useState<RangePreset>("Max");
  const [sortMode, setSortMode] = useState<SortMode>("az");

  const [selectedLsoas, setSelectedLsoas] = useState<string[]>([]);
  const [selectedWards, setSelectedWards] = useState<string[]>([]);

  const [primaryLsoaCode, setPrimaryLsoaCode] = useState<string>("");
  const [primaryWardCode, setPrimaryWardCode] = useState<string>("");

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

  const searchAnchorRef = useRef<HTMLDivElement | null>(null);
  const searchDropdownRef = useRef<HTMLDivElement | null>(null);

  const [dropdownRect, setDropdownRect] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const rankChartHeight = 380;
  const decileChartHeight = 180;

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
      const first = lsoaOptions[0].code;
      setSelectedLsoas([first]);
      setPrimaryLsoaCode(first);
    }
  }, [selectedLsoas.length, lsoaOptions]);

  useEffect(() => {
    if (!selectedWards.length && wardOptions.length) {
      const first = wardOptions[0].code;
      setSelectedWards([first]);
      setPrimaryWardCode(first);
    }
  }, [selectedWards.length, wardOptions]);

  useEffect(() => {
    if (!selectedLsoas.length) {
      setPrimaryLsoaCode("");
      return;
    }
    if (!primaryLsoaCode || !selectedLsoas.includes(primaryLsoaCode)) {
      setPrimaryLsoaCode(selectedLsoas[0]);
    }
  }, [selectedLsoas, primaryLsoaCode]);

  useEffect(() => {
    if (!selectedWards.length) {
      setPrimaryWardCode("");
      return;
    }
    if (!primaryWardCode || !selectedWards.includes(primaryWardCode)) {
      setPrimaryWardCode(selectedWards[0]);
    }
  }, [selectedWards, primaryWardCode]);

  const activeSelectedCodes = geographyMode === "LSOA" ? selectedLsoas : selectedWards;
  const primaryCode = geographyMode === "LSOA" ? primaryLsoaCode : primaryWardCode;

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

  const selectedSeriesMeta = useMemo<SelectedChartSeriesMeta[]>(
    () =>
      selectedSeries.map((series) => {
        const latest = getLatestVisiblePoint(series, rangePreset);
        const currentDecile = latest ? Math.round(latest.decile) : null;

        return {
          code: series.code,
          label: series.label,
          currentDecile,
          color: currentDecile ? DECILE_COLORS[currentDecile] ?? DECILE_COLORS[10] : DECILE_COLORS[10],
          wardName:
            geographyMode === "LSOA"
              ? lsoaWardByLsoaCode.get(series.code)?.ward_name?.trim() || null
              : null,
        };
      }),
    [selectedSeries, rangePreset, geographyMode, lsoaWardByLsoaCode],
  );

  const legendSeriesMeta = useMemo(
    () =>
      [...selectedSeriesMeta].sort((a, b) =>
        a.label.localeCompare(b.label, "en-GB", { sensitivity: "base" }),
      ),
    [selectedSeriesMeta],
  );

  const seriesColorMap = useMemo(() => {
    const map = new Map<string, string>();
    selectedSeriesMeta.forEach((series) => {
      map.set(series.code, series.color);
    });
    return map;
  }, [selectedSeriesMeta]);

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

  const primaryRangeStart = primaryVisiblePoints[0] ?? null;
  const primaryRangeDelta =
    primaryLatest && primaryRangeStart
      ? Math.round(primaryLatest.rank - primaryRangeStart.rank)
      : 0;

  const primaryRangeLabel = primaryRangeStart
    ? new Intl.DateTimeFormat("en-GB", { year: "numeric" }).format(new Date(primaryRangeStart.date))
    : "";

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

  const rankChartFloor = useMemo(() => Math.max(getIntegerDomain(mainRankValues, 10)[1], 10), [mainRankValues]);

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

  const currentFocusSparkline = useMemo(() => {
  if (!primaryVisiblePoints.length) {
    return {
      linePath: "",
      areaPath: "",
    };
  }

  const rankValues = primaryVisiblePoints.map((point) => Math.round(point.rank));

  return {
    linePath: buildSparklinePath(rankValues, 140, 40),
    areaPath: buildSparklineAreaPath(rankValues, 140, 40),
  };
}, [primaryVisiblePoints]);

  const activeSearchBase = useMemo(() => {
    if (geographyMode === "LSOA") {
      return lsoaOptions.map((option) => {
        const wardName = lsoaWardByLsoaCode.get(option.code)?.ward_name?.trim();
        return {
          kind: "LSOA" as const,
          code: option.code,
          label: option.label,
          subLabel: wardName ? `${option.code} · ${wardName}` : option.code,
          selected: selectedLsoas.includes(option.code),
        };
      });
    }

    return wardOptions.map((option) => ({
      kind: "Ward" as const,
      code: option.code,
      label: option.label,
      subLabel: option.code,
      selected: selectedWards.includes(option.code),
    }));
  }, [geographyMode, lsoaOptions, wardOptions, lsoaWardByLsoaCode, selectedLsoas, selectedWards]);

  const searchResults = useMemo(() => {
    const term = searchInput.trim().toLowerCase();

    return activeSearchBase.filter((item) => {
      return (
        !term ||
        item.label.toLowerCase().includes(term) ||
        item.code.toLowerCase().includes(term) ||
        item.subLabel.toLowerCase().includes(term)
      );
    });
  }, [searchInput, activeSearchBase]);

  useEffect(() => {
    if (!searchResults.length) {
      setActiveSearchIndex(0);
      return;
    }
    setActiveSearchIndex((current) => Math.min(current, searchResults.length - 1));
  }, [searchResults]);

  useEffect(() => {
    if (!searchOpen || !searchAnchorRef.current) return;

    const updatePosition = () => {
      const rect = searchAnchorRef.current?.getBoundingClientRect();
      if (!rect) return;

      setDropdownRect({
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [searchOpen]);

  useEffect(() => {
    if (!searchOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (searchAnchorRef.current?.contains(target)) return;
      if (searchDropdownRef.current?.contains(target)) return;
      setSearchOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [searchOpen]);

  const selectedAreasSummary = useMemo(() => {
    const rows = selectedSeriesMeta
      .map((meta) => {
        const series = activeSeriesByCode.get(meta.code);
        if (!series) return null;
        const points = filterPointsByRange(series.points, rangePreset);
        if (!points.length) return null;

        const start = points[0];
        const end = points[points.length - 1];
        const delta = Math.round(end.rank - start.rank);
        const sparkValues = points.map((point) => point.rank);

        return {
          code: meta.code,
          label: meta.label,
          wardName: meta.wardName,
          color: meta.color,
          startYear: new Date(start.date).getFullYear(),
          endYear: new Date(end.date).getFullYear(),
          startRank: Math.round(start.rank),
          endRank: Math.round(end.rank),
          currentRank: Math.round(end.rank),
          delta,
          sparklinePath: buildSparklinePath(sparkValues, 96, 24),
          sparklineAreaPath: buildSparklineAreaPath(sparkValues, 96, 24),
        };
      })
      .filter(Boolean) as {
      code: string;
      label: string;
      wardName: string | null;
      color: string;
      startYear: number;
      endYear: number;
      startRank: number;
      endRank: number;
      currentRank: number;
      delta: number;
      sparklinePath: string;
      sparklineAreaPath: string;
    }[];

    if (sortMode === "most_deprived") {
      return [...rows].sort((a, b) => a.currentRank - b.currentRank);
    }

    if (sortMode === "least_deprived") {
      return [...rows].sort((a, b) => b.currentRank - a.currentRank);
    }

    return [...rows].sort((a, b) =>
      a.label.localeCompare(b.label, "en-GB", { sensitivity: "base" }),
    );
  }, [selectedSeriesMeta, activeSeriesByCode, rangePreset, sortMode]);

  const selectedListData = useMemo(() => {
    const baseOptions = geographyMode === "LSOA" ? lsoaOptions : wardOptions;

    const selected = activeSelectedCodes
      .map((code) => baseOptions.find((option) => option.code === code))
      .filter(Boolean) as SelectOption[];

    return { selected };
  }, [activeSelectedCodes, geographyMode, lsoaOptions, wardOptions]);

  function setPrimarySelection(code: string) {
    if (geographyMode === "LSOA") {
      if (selectedLsoas.includes(code)) setPrimaryLsoaCode(code);
      return;
    }

    if (selectedWards.includes(code)) setPrimaryWardCode(code);
  }

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

    if (item.kind === "LSOA") {
      if (!selectedLsoas.includes(item.code) && selectedLsoas.length < MAX_SELECTION) {
        setSelectedLsoas((current) => [...current, item.code]);
      }
      setPrimaryLsoaCode(item.code);
    }

    if (item.kind === "Ward") {
      if (!selectedWards.includes(item.code) && selectedWards.length < MAX_SELECTION) {
        setSelectedWards((current) => [...current, item.code]);
      }
      setPrimaryWardCode(item.code);
    }

    setSearchOpen(false);
    setSearchInput("");
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
    setSortMode("az");
    setSearchInput("");
    setSearchOpen(false);

    const nextLsoa = lsoaOptions.length ? [lsoaOptions[0].code] : [];
    const nextWard = wardOptions.length ? [wardOptions[0].code] : [];

    setSelectedLsoas(nextLsoa);
    setSelectedWards(nextWard);
    setPrimaryLsoaCode(nextLsoa[0] ?? "");
    setPrimaryWardCode(nextWard[0] ?? "");
  }

  const searchDropdown =
    searchOpen && dropdownRect
      ? createPortal(
          <div
            ref={searchDropdownRef}
            className="fixed z-[100] rounded-xl border border-border/50 bg-background/95 p-2 shadow-2xl backdrop-blur-sm"
            style={{
              top: dropdownRect.top,
              left: dropdownRect.left,
              width: dropdownRect.width,
            }}
          >
            <div className="px-2 pb-2">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                {geographyMode === "LSOA" ? `LSOAs (${lsoaOptions.length} total)` : `Wards (${wardOptions.length} total)`}
              </p>
            </div>

            {searchResults.length ? (
              <div className="max-h-80 overflow-y-auto space-y-1">
                {searchResults.map((result, index) => {
                  const active = index === activeSearchIndex;

                  return (
                    <button
                      key={`${result.kind}-${result.code}`}
                      type="button"
                      onMouseEnter={() => setActiveSearchIndex(index)}
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
            ) : (
              <p className="px-2 py-8 text-center text-sm text-muted-foreground">
                No matching {geographyMode === "LSOA" ? "LSOAs" : "wards"}
              </p>
            )}
          </div>,
          document.body,
        )
      : null;

  return (
    <>
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
            Compare selected LSOAs and Wards over time with rank as the primary focus.
          </p>          

          {primaryLatest && primarySeries ? (
            <p className="text-sm text-muted-foreground">
              {primarySeries.label} · Rank {Math.round(primaryLatest.rank)} · Decile {Math.round(primaryLatest.decile)} ·{" "}
              <span className="text-foreground/90">
                {primaryDelta < 0
                  ? `↓ ${Math.abs(primaryDelta)} place`
                  : primaryDelta > 0
                    ? `↑ ${primaryDelta} place`
                    : "No change"}{" "}
                since last release
              </span>
            </p>
          ) : null}
        </motion.div>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.9fr)_360px] gap-6 items-start">
          <div className="space-y-6">
            <GlassCard className="p-6">
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-foreground">Rank and decile over time</h2>
                  <p className="text-xs text-muted-foreground">Lower rank = more deprived · Decile 1 = most deprived</p>
                </div>

                {!!legendSeriesMeta.length && (
                  <div className="flex flex-wrap gap-2">
                    {legendSeriesMeta.map((item) => (
                      <button
                        key={item.code}
                        type="button"
                        onMouseEnter={() => setHoveredCode(item.code)}
                        onMouseLeave={() => setHoveredCode(null)}
                        onFocus={() => setHoveredCode(item.code)}
                        onBlur={() => setHoveredCode(null)}
                        onClick={() => setPrimarySelection(item.code)}
                        className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 transition-colors ${
                          hoveredCode === item.code
                            ? "border-primary/60 bg-primary/10"
                            : "border-border/30 bg-background/20"
                        }`}
                      >
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-xs text-foreground">{item.label}</span>
                        {primaryCode === item.code ? (
                          <span className="text-[10px] uppercase tracking-wide text-primary">Primary</span>
                        ) : null}
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
                            {legendSeriesMeta.map((series) => (
                              <linearGradient
                                key={`gradient-${series.code}`}
                                id={`gradient-${series.code}`}
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                              >
                                <stop offset="0%" stopColor={series.color} stopOpacity={0.22} />
                                <stop offset="100%" stopColor={series.color} stopOpacity={0} />
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
                            domain={[rankChartFloor, 1]}
                            reversed
                          />

                          <Tooltip
                            cursor={{ stroke: "rgba(255,255,255,0.35)", strokeWidth: 1 }}
                            content={({ active, payload }) => {
                              if (!active || !payload?.length) return null;

                              const row = payload[0]?.payload as Record<string, unknown>;
                              const dateLabel = typeof row.shortDate === "string" ? row.shortDate : "";

                              const items = legendSeriesMeta
                                .map((series) => {
                                  const value = row[series.code];
                                  if (typeof value !== "number") return null;

                                  return {
                                    code: series.code,
                                    label: String(row[`${series.code}__label`] ?? series.label),
                                    ward: row[`${series.code}__ward`],
                                    decile: row[`${series.code}__decile`],
                                    rank: Math.round(value),
                                    color: series.color,
                                  };
                                })
                                .filter(Boolean)
                                .sort((a, b) => a!.rank - b!.rank);

                              return (
                                <div className="rounded-xl border border-border/50 bg-background/95 px-4 py-3 shadow-xl backdrop-blur-sm">
                                  <p className="mb-2 text-sm font-medium text-foreground">{dateLabel}</p>
                                  <div className="space-y-2">
                                    {items.map((item) => (
                                      <div key={item!.code} className="flex items-center justify-between gap-3">
                                        <div className="min-w-0">
                                          <div className="flex items-center gap-2">
                                            <span
                                              className="h-2.5 w-2.5 rounded-full"
                                              style={{ backgroundColor: item!.color }}
                                            />
                                            <span className="truncate text-sm text-foreground">{item!.label}</span>
                                            {primaryCode === item!.code ? (
                                              <span className="text-[10px] uppercase tracking-wide text-primary">Primary</span>
                                            ) : null}
                                          </div>
                                          {item!.ward ? (
                                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                                              {String(item!.ward)}
                                            </p>
                                          ) : null}
                                        </div>
                                        <p className="shrink-0 text-xs text-muted-foreground">
                                          Rank {item!.rank} · Decile {String(item!.decile ?? "n/a")}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            }}
                          />

                          {legendSeriesMeta.map((series) => (
                            <Area
                              key={`${series.code}-area`}
                              type="linear"
                              dataKey={series.code}
                              baseValue={rankChartFloor}
                              stroke="none"
                              fill={`url(#gradient-${series.code})`}
                              isAnimationActive={false}
                              fillOpacity={hoveredCode && hoveredCode !== series.code ? 0.05 : 1}
                            />
                          ))}

                          {legendSeriesMeta.map((series) => {
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
                                activeDot={{
                                  r: 5,
                                  fill: series.color,
                                  stroke: "rgba(255,255,255,0.9)",
                                  strokeWidth: 2,
                                }}
                                onClick={() => setPrimarySelection(series.code)}
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

                <div className="border-t border-border/40 pt-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-base font-semibold text-foreground">Main Selection Decile</h3>
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
                          <YAxis
                            tickLine={false}
                            axisLine={false}
                            tickMargin={10}
                            allowDecimals={false}
                            domain={[10, 1]}
                            reversed
                            ticks={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}
                          />
                          <Tooltip
                            cursor={{ stroke: "rgba(255,255,255,0.35)", strokeWidth: 1 }}
                            content={({ active, payload }) => {
                              if (!active || !payload?.length) return null;
                              const row = payload[0]?.payload as Record<string, unknown>;
                              return (
                                <div className="rounded-xl border border-border/50 bg-background/95 px-4 py-3 shadow-xl backdrop-blur-sm">
                                  <p className="text-sm font-medium text-foreground">{String(row.shortDate ?? "")}</p>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    Decile {Math.round(Number(row.decile))} · Rank {Math.round(Number(row.rank))} of {totalAreas}
                                  </p>
                                </div>
                              );
                            }}
                          />
                          <Line
                            type="stepAfter"
                            dataKey="decile"
                            stroke={
                              primaryLatest
                                ? DECILE_COLORS[Math.round(primaryLatest.decile)] ?? "var(--color-decile)"
                                : "var(--color-decile)"
                            }
                            strokeWidth={2.5}
                            dot={false}
                          />
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
              </div>
            </GlassCard>
          </div>

          <div className="space-y-6">
            <GlassCard className="p-5">
              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex rounded-lg border border-border/50 bg-background/30 p-1">
                  {(["LSOA", "Ward"] as GeographyMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => {
                        setGeographyMode(mode);
                        setSearchInput("");
                        setSearchOpen(false);
                      }}
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

              <div className="mt-3 text-xs text-muted-foreground">
                {lsoaOptions.length} LSOAs total · {wardOptions.length} wards total
              </div>

              <div className="mt-4" ref={searchAnchorRef}>
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
                      if (!searchResults.length && event.key !== "Escape") return;

                      if (event.key === "ArrowDown") {
                        event.preventDefault();
                        setSearchOpen(true);
                        setActiveSearchIndex((current) => (current + 1) % searchResults.length);
                      }

                      if (event.key === "ArrowUp") {
                        event.preventDefault();
                        setSearchOpen(true);
                        setActiveSearchIndex((current) =>
                          current === 0 ? searchResults.length - 1 : current - 1,
                        );
                      }

                      if (event.key === "Enter" && searchResults.length) {
                        event.preventDefault();
                        handleSearchSelect(searchResults[activeSearchIndex]);
                      }

                      if (event.key === "Escape") {
                        setSearchOpen(false);
                      }
                    }}
                    className="w-full rounded-xl border border-border/50 bg-background/30 px-10 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/40"
                    placeholder={`Search ${geographyMode === "LSOA" ? "LSOAs" : "Wards"}…`}
                    aria-label={`Search ${geographyMode === "LSOA" ? "LSOAs" : "Wards"}`}
                  />
                  {searchInput ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchInput("");
                        setSearchOpen(false);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground"
                      aria-label="Clear search"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-5">
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold text-foreground">Selected Areas Summary</h3>

                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Sort By</span>
                    <select
                      value={sortMode}
                      onChange={(event) => setSortMode(event.target.value as SortMode)}
                      className="rounded-md border border-border/50 bg-background/30 px-2.5 py-1.5 text-xs text-foreground outline-none"
                    >
                      <option value="az">A-Z</option>
                      <option value="most_deprived">Most deprived</option>
                      <option value="least_deprived">Least deprived</option>
                    </select>
                  </label>
                </div>

                <div className="space-y-2">
                  {selectedAreasSummary.map((item) => (
                    <button
                      key={item.code}
                      type="button"
                      onMouseEnter={() => setHoveredCode(item.code)}
                      onMouseLeave={() => setHoveredCode(null)}
                      onClick={() => setPrimarySelection(item.code)}
                      className={`w-full rounded-xl border px-3 py-3 text-left transition-colors ${
                        hoveredCode === item.code ? "border-primary/60 bg-primary/10" : "border-border/40 bg-background/20"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                            <p className="text-sm font-semibold text-foreground">{item.label}</p>
                            {primaryCode === item.code ? (
                              <span className="text-[10px] uppercase tracking-wide text-primary">Primary</span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {item.code}
                            {item.wardName ? ` · ${item.wardName}` : ""}
                          </p>
                        </div>
                        <div className="h-6 w-[98px]">
                          <svg viewBox="0 0 96 24" className="h-6 w-[98px]" role="img" aria-label={`Rank trend for ${item.label}`}>
                            <defs>
                              <linearGradient id={`spark-gradient-${item.code}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={hexToRgba(item.color, 0.24)} />
                                <stop offset="100%" stopColor={hexToRgba(item.color, 0)} />
                              </linearGradient>
                            </defs>
                            <path d={item.sparklineAreaPath} fill={`url(#spark-gradient-${item.code})`} />
                            <path
                              d={item.sparklinePath}
                              fill="none"
                              stroke={item.color}
                              strokeWidth="2"
                              strokeLinecap="round"
                            />
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
                    </button>
                  ))}
                </div>
              </div>
            </GlassCard>
          </div>

          <div className="space-y-6">
            <GlassCard className="p-5">
              <div className="space-y-4">                
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Main Selection</h3>

                  {primarySeries && primaryLatest ? (
                    <div className="mt-3 rounded-2xl border border-cyan-400/60 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.14),_rgba(0,0,0,0)_38%),linear-gradient(180deg,rgba(15,23,42,0.9),rgba(2,6,23,0.96))] p-4 shadow-[0_0_0_1px_rgba(34,211,238,0.06),0_10px_30px_rgba(0,0,0,0.35)]">
                      <div className="space-y-4">
                        <div className="min-w-0 w-full">
                          <p className="w-full text-3xl font-semibold leading-tight tracking-tight text-foreground break-words">
                            {primarySeries.label}
                          </p>

                          <p className="mt-2 w-full text-sm leading-5 text-muted-foreground break-words">
                            {primarySeries.code}
                            {geographyMode === "LSOA"
                              ? ` · ${lsoaWardByLsoaCode.get(primarySeries.code)?.ward_name?.trim() ?? "Ward n/a"}`
                              : ""}
                          </p>

                          <div className="mt-4 flex flex-wrap items-center gap-2">
                            <span className="rounded-lg border border-border/40 bg-background/30 px-3 py-2 text-2xl font-medium text-foreground">
                              Rank {Math.round(primaryLatest.rank)}
                            </span>

                            <span
                              className="rounded-lg border px-3 py-2 text-2xl font-medium"
                              style={{
                                borderColor: `${hexToRgba(
                                  DECILE_COLORS[Math.round(primaryLatest.decile)] ?? DECILE_COLORS[10],
                                  0.35,
                                )}`,
                                backgroundColor: `${hexToRgba(
                                  DECILE_COLORS[Math.round(primaryLatest.decile)] ?? DECILE_COLORS[10],
                                  0.12,
                                )}`,
                                color: DECILE_COLORS[Math.round(primaryLatest.decile)] ?? DECILE_COLORS[10],
                              }}
                            >
                              Decile {Math.round(primaryLatest.decile)}
                            </span>
                          </div>

                          <div className="mt-4 flex items-start gap-2 text-sm">
                            {primaryRangeDelta < 0 ? (
                              <span className="inline-flex items-center gap-1 font-bold text-red-500">
                                <ArrowUp className="h-4 w-4 shrink-0 text-red-500" />
                                <span>{Math.abs(primaryRangeDelta)}</span>
                              </span>
                            ) : primaryRangeDelta > 0 ? (
                              <span className="inline-flex items-center gap-1 font-bold text-emerald-300">
                                <ArrowDown className="h-4 w-4 shrink-0 text-emerald-400" />
                                <span>{primaryRangeDelta}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 font-medium text-muted-foreground">
                                <Minus className="h-4 w-4 shrink-0 text-muted-foreground" />
                                <span>0</span>
                              </span>
                            )}

                            <span className="leading-5 text-muted-foreground">
                              since {primaryRangeLabel || "start of range"}
                            </span>
                          </div>
                        </div>

                        <div className="flex w-full justify-center pt-1">
                          <svg
                            viewBox="0 0 140 40"
                            className="h-24 w-full max-w-[220px]"
                            role="img"
                            aria-label={`Rank trend for ${primarySeries.label}`}
                          >
                            <defs>
                              <linearGradient id="current-focus-spark" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={hexToRgba("#a78bfa", 0.28)} />
                                <stop offset="100%" stopColor={hexToRgba("#a78bfa", 0)} />
                              </linearGradient>
                            </defs>

                            <path d={currentFocusSparkline.areaPath} fill="url(#current-focus-spark)" />
                            <path
                              d={currentFocusSparkline.linePath}
                              fill="none"
                              stroke="#a78bfa"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 rounded-2xl border border-border/40 bg-background/20 p-4">
                      <p className="text-sm text-muted-foreground">No primary area selected.</p>
                    </div>
                  )}
                </div>
                
                <div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">Selected {geographyMode}s</h4>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Click a selected {geographyMode === "LSOA" ? "LSOA" : "ward"} to remove it
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">{activeSelectedCodes.length} of {MAX_SELECTION}</p>
                  </div>

                  <div className="mt-3 space-y-2">
                    {selectedListData.selected.map((item) => {
                      const checked = activeSelectedCodes.includes(item.code);
                      const meta = getOptionMeta(item);
                      const color = seriesColorMap.get(item.code) ?? DECILE_COLORS[10];
                      const active = hoveredCode === item.code;
                      return (
                        <button
                          key={item.code}
                          type="button"
                          onClick={() => handleSelectionToggle(item.code)}
                          onDoubleClick={() => setPrimarySelection(item.code)}
                          onMouseEnter={() => setHoveredCode(item.code)}
                          onMouseLeave={() => setHoveredCode(null)}
                          className={`w-full rounded-xl border px-3 py-2 text-left transition-colors ${
                            active ? "border-primary/60 bg-primary/10" : "border-border/40 bg-background/20 hover:border-red-400/30 hover:bg-red-500/5"
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
                            <div className="flex flex-col items-end gap-1">
                              {primaryCode === item.code ? (
                                <span className="text-[11px] font-medium text-primary">Primary</span>
                              ) : null}

                              {checked ? (
                                <span className="inline-flex items-center gap-1 rounded-md border border-red-400/25 bg-red-500/10 px-2 py-1 text-[11px] font-medium text-red-300">
                                  <X className="h-3 w-3" />
                                  Remove
                                </span>
                              ) : null}
                            </div>
                          </div>
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

      {searchDropdown}
    </>
  );
}