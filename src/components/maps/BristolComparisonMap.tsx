import { useEffect, useMemo, useState } from "react";
import { GeoJSON, MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

import type { LsoaCurrentRow } from "@/types/dashboard-data";

type MapMetric =
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

type BristolComparisonMapProps = {
  metric: MapMetric;
  heightClassName?: string;
};

function getDecileColor(decile?: number | null) {
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

function getRankBucketColor(rank?: number | null, maxRank = 268) {
  if (!rank) return "#1f2937";

  const bucket = Math.min(10, Math.max(1, Math.ceil((rank / maxRank) * 10)));

  return getDecileColor(bucket);
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

function isRankMetric(metric: MapMetric) {
  return metric === "bristol_rank" || metric === "ons_bristol_rank" || metric === "ons_national_rank";
}

function isScoreMetric(metric: MapMetric) {
  return metric === "bristol_score" || metric === "ons_score";
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

function getMetricColor(metric: MapMetric, value?: number | null) {
  if (value == null) return "#1f2937";

  if (isDecileMetric(metric)) {
    return getDecileColor(value);
  }

  if (isRankMetric(metric)) {
    const maxRank = metric === "ons_national_rank" ? 32844 : 268;
    return getRankBucketColor(value, maxRank);
  }

  if (isScoreMetric(metric)) {
    return getScoreColor(value);
  }

  return "#1f2937";
}

function formatMetricValue(metric: MapMetric, value?: number | null) {
  if (value == null || !Number.isFinite(value)) return "N/A";

  if (metric === "bristol_score" || metric === "ons_score") {
    return Number(value).toFixed(2);
  }

  return Math.round(Number(value)).toString();
}

export default function BristolComparisonMap({
  metric,
  heightClassName = "h-[420px]",
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

        return {
          ...feature,
          properties: {
            ...props,
            ...row,
            active_value: activeValue ?? null,
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

              return {
                fillColor: getMetricColor(metric, value),
                weight: 0.7,
                opacity: 1,
                color: "hsl(220, 30%, 16%)",
                fillOpacity: value == null ? 0.25 : 0.9,
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
                  e.target.setStyle({
                    weight: 1.5,
                    color: "hsl(190, 95%, 55%)",
                    fillOpacity: 1,
                  });
                },
                mouseout: (e: any) => {
                  const value = props.active_value;

                  e.target.setStyle({
                    weight: 0.7,
                    color: "hsl(220, 30%, 16%)",
                    fillOpacity: value == null ? 0.25 : 0.9,
                  });
                },
              });
            }}
          />
        </MapContainer>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
        <span>Most deprived</span>

        <div className="flex items-center gap-1">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((bucket) => (
            <div key={bucket} className="flex flex-col items-center gap-1">
              <div
                className="h-5 w-5 rounded"
                style={{ background: getDecileColor(bucket) }}
                title={`Bucket ${bucket}`}
              />
              <span className="text-[10px]">{bucket}</span>
            </div>
          ))}
        </div>

        <span>Least deprived</span>
      </div>
    </div>
  );
}