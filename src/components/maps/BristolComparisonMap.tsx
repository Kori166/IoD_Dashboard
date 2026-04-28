import { useEffect, useMemo, useState } from "react";
import { GeoJSON, MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

import type { LsoaCurrentRow } from "@/types/dashboard-data";

export type MapMetric =
  | "bristol_rank"
  | "bristol_decile"
  | "bristol_score"
  | "ons_bristol_rank"
  | "ons_bristol_decile"
  | "ons_national_rank"
  | "ons_national_decile"
  | "ons_score";

type LsoaGeoJson = GeoJSON.FeatureCollection<
  GeoJSON.Geometry,
  {
    lsoa_code?: string;
    lsoa_name?: string;
    lsoa_code_11?: string | null;
    lsoa_name_11?: string | null;
    longitude?: number | null;
    latitude?: number | null;
    active_value?: number | null;
  }
>;

type HighlightedMapValue = {
  metric: MapMetric;
  value: number;
  mode: "exact" | "bucket";
} | null;

type BristolComparisonMapProps = {
  metric: MapMetric;
  heightClassName?: string;
  highlightedBucket?: number | null;
  highlightedValue?: HighlightedMapValue;
  onFeatureHover?: (payload: {
    metric: MapMetric;
    value: number | null;
    bucket: number | null;
    code: string | null;
    label: string | null;
  } | null) => void;
};

export function getDecileColor(decile?: number | null) {
  if (!decile) return "#1f2937";

  const palette: Record<number, string> = {
    1: "#f4effa",
    2: "#e6daf6",
    3: "#d2bdf0",
    4: "#be9be8",
    5: "#a378de",
    6: "#845ec9",
    7: "#5e5ab8",
    8: "#3f6aa9",
    9: "#2f7f98",
    10: "#4ab08b",
  };

  return palette[decile] ?? "#1f2937";
}

function getRankBucket(rank?: number | null, maxRank = 268) {
  if (!rank) return null;
  return Math.min(10, Math.max(1, Math.ceil((rank / maxRank) * 10)));
}

function getScoreBucket(score?: number | null, minScore = 0, maxScore = 75) {
  if (score == null || !Number.isFinite(score)) return null;

  const range = maxScore - minScore || 1;
  const normalised = Math.min(1, Math.max(0, (score - minScore) / range));

  // Higher score = more deprived, so high scores should use low/most-deprived colour buckets.
  return Math.min(10, Math.max(1, 11 - Math.ceil(normalised * 10)));
}

function getScoreColor(score?: number | null, minScore = 0, maxScore = 75) {
  if (score == null || !Number.isFinite(score)) return "#1f2937";

  const range = maxScore - minScore || 1;
  const normalised = Math.min(1, Math.max(0, (score - minScore) / range));
  const bucket = Math.min(10, Math.max(1, Math.ceil(normalised * 10)));

  return getDecileColor(bucket);
}

function isDecileMetric(metric: MapMetric) {
  return metric === "bristol_decile" || metric === "ons_bristol_decile" || metric === "ons_national_decile";
}

export function isRankMetric(metric: MapMetric) {
  return metric === "bristol_rank" || metric === "ons_bristol_rank" || metric === "ons_national_rank";
}

export function isScoreMetric(metric: MapMetric) {
  return metric === "bristol_score" || metric === "ons_score";
}

function isSameHighlightFamily(a: MapMetric, b: MapMetric) {
  if (isRankMetric(a) && isRankMetric(b)) return true;
  if (isScoreMetric(a) && isScoreMetric(b)) return true;
  if (a.includes("decile") && b.includes("decile")) return true;
  return a === b;
}

export function getRankMax(metric: MapMetric) {
  return metric === "ons_national_rank" ? 32844 : 268;
}

export function getScoreRange(metric: MapMetric) {
  if (metric === "bristol_score") {
    return { min: -1, max: 43 };
  }

  return { min: 0, max: 72 };
}

function getMetricValue(row: LsoaCurrentRow | undefined, metric: MapMetric) {
  if (!row) return null;

  switch (metric) {
    case "bristol_rank":
      return row.bristol_rank;
    case "bristol_decile":
      return row.bristol_decile;
    case "bristol_score":
      return row.bristol_score;
    case "ons_bristol_rank":
      return row.ons_bristol_rank;
    case "ons_bristol_decile":
      return row.ons_bristol_decile;
    case "ons_national_rank":
      return row.ons_national_rank;
    case "ons_national_decile":
      return row.ons_national_decile;
    case "ons_score":
      return row.ons_score;
    default:
      return null;
  }
}

function getMetricLabel(metric: MapMetric) {
  switch (metric) {
    case "bristol_rank":
      return "Our Bristol rank";
    case "bristol_decile":
      return "Our Bristol decile";
    case "bristol_score":
      return "Our Bristol score";
    case "ons_bristol_rank":
      return "ONS rank within Bristol";
    case "ons_bristol_decile":
      return "ONS decile within Bristol";
    case "ons_national_rank":
      return "ONS national rank";
    case "ons_national_decile":
      return "ONS national decile";
    case "ons_score":
      return "ONS score";
    default:
      return "Metric";
  }
}

export function getMetricBucket(metric: MapMetric, value?: number | null) {
  if (value == null) return null;

  if (isDecileMetric(metric)) {
    return Math.round(value);
  }

  if (isRankMetric(metric)) {
    return getRankBucket(value, getRankMax(metric));
  }

  if (isScoreMetric(metric)) {
    const { min, max } = getScoreRange(metric);
    return getScoreBucket(value, min, max);
  }

  return null;
}

function getMetricColor(metric: MapMetric, value?: number | null) {
  const bucket = getMetricBucket(metric, value);
  return bucket == null ? "#1f2937" : getDecileColor(bucket);
}

function formatMetricValue(metric: MapMetric, value?: number | null) {
  if (value == null || !Number.isFinite(value)) return "N/A";

  if (metric === "bristol_score" || metric === "ons_score") {
    return Number(value).toFixed(2);
  }

  return Math.round(Number(value)).toString();
}

export function getLegendTitle(metric: MapMetric) {
  if (isDecileMetric(metric)) return "Decile";
  if (isRankMetric(metric)) return "Rank bucket";
  if (isScoreMetric(metric)) return "Score bucket";
  return "Bucket";
}

export function getLegendStartLabel(metric: MapMetric) {
  if (isDecileMetric(metric)) return "Most deprived";
  if (isRankMetric(metric)) return "Highest deprivation rank";
  if (isScoreMetric(metric)) return "Highest score";
  return "High";
}

export function getLegendEndLabel(metric: MapMetric) {
  if (isDecileMetric(metric)) return "Least deprived";
  if (isRankMetric(metric)) return "Lowest deprivation rank";
  if (isScoreMetric(metric)) return "Lowest score";
  return "Low";
}

export function getLegendBucketTitle(metric: MapMetric, bucket: number) {
  if (isDecileMetric(metric)) {
    return `Decile ${bucket}`;
  }

  if (isRankMetric(metric)) {
    const maxRank = getRankMax(metric);
    const start = Math.floor(((bucket - 1) / 10) * maxRank) + 1;
    const end = Math.ceil((bucket / 10) * maxRank);
    return `Rank ${start} to ${end}`;
  }

  if (isScoreMetric(metric)) {
    const { min, max } = getScoreRange(metric);
    const step = (max - min) / 10;

    // Bucket 1 is highest score / most deprived.
    const high = max - (bucket - 1) * step;
    const low = max - bucket * step;

    return `Score ${low.toFixed(1)} to ${high.toFixed(1)}`;
  }

  return `Bucket ${bucket}`;
}

export default function BristolComparisonMap({
  metric,
  heightClassName = "h-[420px]",
  highlightedBucket = null,
  highlightedValue = null,
  onFeatureHover,
}: BristolComparisonMapProps) {
  const [geojson, setGeojson] = useState<LsoaGeoJson | null>(null);
  const [lsoaRows, setLsoaRows] = useState<LsoaCurrentRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setError(null);

        const [geoRes, lsoaRes] = await Promise.all([
          fetch("/data/bristol_lsoa.geojson"),
          fetch("/data/bristol_lsoa_current.json"),
        ]);

        if (!geoRes.ok) {
          throw new Error(
            `Failed to fetch bristol_lsoa.geojson: ${geoRes.status} ${geoRes.statusText}`,
          );
        }

        if (!lsoaRes.ok) {
          throw new Error(
            `Failed to fetch bristol_lsoa_current.json: ${lsoaRes.status} ${lsoaRes.statusText}`,
          );
        }

        const geoData = await geoRes.json();
        const lsoaData = await lsoaRes.json();

        if (
          !geoData ||
          geoData.type !== "FeatureCollection" ||
          !Array.isArray(geoData.features)
        ) {
          throw new Error("bristol_lsoa.geojson is not a valid FeatureCollection");
        }

        if (!Array.isArray(lsoaData)) {
          throw new Error("bristol_lsoa_current.json is not a valid array");
        }

        setGeojson(geoData);
        setLsoaRows(lsoaData);
      } catch (err) {
        console.error("Error loading Bristol comparison map:", err);
        setError(err instanceof Error ? err.message : "Unknown error loading map data");
      }
    }

    load();
  }, []);

  const lsoaByCode = useMemo(() => {
    return Object.fromEntries(lsoaRows.map((row) => [row.code, row]));
  }, [lsoaRows]);

  const mergedGeojson = useMemo(() => {
    if (!geojson) return null;

    return {
      ...geojson,
      features: geojson.features.map((feature: any) => {
        const props = feature.properties || {};
        const code = props.lsoa_code ?? props.lsoa_code_11;
        const row = lsoaByCode[code];
        const activeValue = getMetricValue(row, metric);
        const activeBucket = getMetricBucket(metric, activeValue);

        return {
          ...feature,
          properties: {
            ...props,
            ...row,
            active_value: activeValue ?? null,
            active_bucket: activeBucket ?? null,
            lsoa_code: row?.code ?? code ?? null,
            lsoa_name: row?.label ?? props.lsoa_name ?? props.lsoa_name_11 ?? "Unknown LSOA",
            ward_name: row?.ward_name ?? null,
          },
        };
      }),
    };
  }, [geojson, lsoaByCode, metric]);

  if (error) {
    return (
      <div className={`${heightClassName} flex items-center justify-center text-sm text-destructive`}>
        Error loading map: {error}
      </div>
    );
  }

  if (!mergedGeojson) {
    return (
      <div className={`${heightClassName} flex items-center justify-center text-sm text-muted-foreground`}>
        Loading Bristol map...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className={`${heightClassName} w-full overflow-hidden rounded-xl border border-border/40`}>
        <MapContainer
          center={[51.4545, -2.5879]}
          zoom={11}
          scrollWheelZoom={true}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution="&copy; OpenStreetMap contributors &copy; CARTO"
          />

          <GeoJSON
            key={metric}
            data={mergedGeojson as any}
            style={(feature: any) => {
              const value = feature?.properties?.active_value;
              const bucket = feature?.properties?.active_bucket;

              const exactHighlightApplies =
                highlightedValue !== null &&
                isSameHighlightFamily(highlightedValue.metric, metric) &&
                highlightedValue.mode === "exact" &&
                value !== null &&
                Number.isFinite(Number(value)) &&
                Math.round(Number(value)) === Math.round(highlightedValue.value);

              const bucketHighlightApplies =
                highlightedBucket !== null && bucket === highlightedBucket;

              const hasAnyHighlight =
                highlightedValue !== null || highlightedBucket !== null;

              const isHighlighted = exactHighlightApplies || bucketHighlightApplies;
              const isDimmed = hasAnyHighlight && !isHighlighted;

              return {
                fillColor: getMetricColor(metric, value),
                weight: isHighlighted ? 1.8 : 0.7,
                opacity: 1,
                color: isHighlighted ? "hsl(190, 95%, 55%)" : "hsl(220, 30%, 16%)",
                fillOpacity: value == null ? 0.25 : isDimmed ? 0.22 : isHighlighted ? 1 : 0.9,
              };
            }}

            onEachFeature={(feature: any, layer: any) => {
              const props = feature.properties || {};
              const metricLabel = getMetricLabel(metric);

              layer.bindTooltip(
                `
                  <div style="font-size:12px;line-height:1.5;">
                    <strong>${props.lsoa_name ?? "Unknown LSOA"}</strong><br/>
                    Ward: ${props.ward_name ?? "N/A"}<br/>
                    Code: ${props.lsoa_code ?? "N/A"}<br/>
                    ${metricLabel}: ${formatMetricValue(metric, props.active_value)}<br/>
                    Bristol rank: ${props.bristol_rank ?? "N/A"}<br/>
                    Bristol decile: ${props.bristol_decile ?? "N/A"}<br/>
                    Bristol score: ${
                      props.bristol_score == null ? "N/A" : Number(props.bristol_score).toFixed(2)
                    }<br/>
                    ONS Bristol rank: ${props.ons_bristol_rank ?? "N/A"}<br/>
                    ONS Bristol decile: ${props.ons_bristol_decile ?? "N/A"}<br/>
                    ONS national rank: ${props.ons_national_rank ?? "N/A"}<br/>
                    ONS national decile: ${props.ons_national_decile ?? "N/A"}<br/>
                    ONS score: ${
                      props.ons_score == null ? "N/A" : Number(props.ons_score).toFixed(2)
                    }
                  </div>
                `,
                {
                  sticky: true,
                  opacity: 0.95,
                },
              );

              layer.on({
                mouseover: (e: any) => {
                  onFeatureHover?.({
                    metric,
                    value: props.active_value ?? null,
                    bucket: props.active_bucket ?? null,
                    code: props.lsoa_code ?? null,
                    label: props.lsoa_name ?? null,
                  });

                  e.target.setStyle({
                    weight: 1.8,
                    color: "hsl(190, 95%, 55%)",
                    fillOpacity: 1,
                  });
                },
                mouseout: (e: any) => {
                  const value = props.active_value;
                  const bucket = props.active_bucket;

                  const exactHighlightApplies =
                    highlightedValue !== null &&
                    isSameHighlightFamily(highlightedValue.metric, metric) &&
                    highlightedValue.mode === "exact" &&
                    value !== null &&
                    Math.round(Number(value)) === Math.round(highlightedValue.value);

                  const bucketHighlightApplies =
                    highlightedBucket !== null && bucket === highlightedBucket;

                  const hasAnyHighlight =
                    highlightedValue !== null || highlightedBucket !== null;

                  const isHighlighted = exactHighlightApplies || bucketHighlightApplies;
                  const isDimmed = hasAnyHighlight && !isHighlighted;

                  e.target.setStyle({
                    weight: isHighlighted ? 1.8 : 0.7,
                    color: isHighlighted ? "hsl(190, 95%, 55%)" : "hsl(220, 30%, 16%)",
                    fillOpacity: value == null ? 0.25 : isDimmed ? 0.22 : isHighlighted ? 1 : 0.9,
                  });

                  onFeatureHover?.(null);
                },
              });
            }}
          />
        </MapContainer>
      </div>

      
    </div>
  );
}