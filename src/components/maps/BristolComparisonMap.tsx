import { useEffect, useMemo, useState } from "react";
import { GeoJSON, MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

type IMDRow = {
  lsoa_code: string;
  lsoa_name?: string;
  uk_rank?: number | null;
  uk_decile?: number | null;
  bristol_rank?: number | null;
  bristol_decile?: number | null;
};

type MapMetric = "bristol_rank" | "uk_rank" | "bristol_decile" | "uk_decile";

type LsoaGeoJson = GeoJSON.FeatureCollection<
  GeoJSON.Geometry,
  {
    lsoa_code?: string;
    lsoa_name?: string;
    lsoa_code_11?: string | null;
    lsoa_name_11?: string | null;
    longitude?: number | null;
    latitude?: number | null;
    uk_rank?: number | null;
    uk_decile?: number | null;
    bristol_rank?: number | null;
    bristol_decile?: number | null;
    active_value?: number | null;
  }
>;

type BristolComparisonMapProps = {
  metric: MapMetric;
  heightClassName?: string;
};

// Colour scale for deciles.
// Lower deciles are more deprived.
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

// Converts a rank into a decile-like colour bucket so rank views can still be shown
// as a choropleth without inventing a second colour system.
function getRankBucketColor(rank?: number | null, maxRank = 268) {
  if (!rank) return "#1f2937";

  const bucket = Math.min(
    10,
    Math.max(1, Math.ceil((rank / maxRank) * 10)),
  );

  return getDecileColor(bucket);
}

function isDecileMetric(metric: MapMetric) {
  return metric === "bristol_decile" || metric === "uk_decile";
}

function getMetricLabel(metric: MapMetric) {
  switch (metric) {
    case "bristol_rank":
      return "Our LSOA rank";
    case "uk_rank":
      return "ONS / UK rank";
    case "bristol_decile":
      return "Our LSOA decile";
    case "uk_decile":
      return "ONS / UK decile";
    default:
      return "Metric";
  }
}

export default function BristolComparisonMap({
  metric,
  heightClassName = "h-[420px]",
}: BristolComparisonMapProps) {
  // Raw map boundaries.
  const [geojson, setGeojson] = useState<LsoaGeoJson | null>(null);

  // Raw deprivation/rank rows.
  const [imdRows, setImdRows] = useState<IMDRow[]>([]);

  // Friendly error state.
  const [error, setError] = useState<string | null>(null);

  // Load the Bristol boundaries and IMD data once.
  useEffect(() => {
    async function load() {
      try {
        setError(null);

        const [geoRes, imdRes] = await Promise.all([
          fetch("/data/bristol_lsoa.geojson"),
          fetch("/data/bristol_imd.json"),
        ]);

        if (!geoRes.ok) {
          throw new Error(
            `Failed to fetch bristol_lsoa.geojson: ${geoRes.status} ${geoRes.statusText}`,
          );
        }

        if (!imdRes.ok) {
          throw new Error(
            `Failed to fetch bristol_imd.json: ${imdRes.status} ${imdRes.statusText}`,
          );
        }

        const geoData = await geoRes.json();
        const imdData = await imdRes.json();

        if (
          !geoData ||
          geoData.type !== "FeatureCollection" ||
          !Array.isArray(geoData.features)
        ) {
          throw new Error("bristol_lsoa.geojson is not a valid FeatureCollection");
        }

        if (!Array.isArray(imdData)) {
          throw new Error("bristol_imd.json is not a valid array");
        }

        setGeojson(geoData);
        setImdRows(imdData);
      } catch (err) {
        console.error("Error loading Bristol comparison map:", err);
        setError(
          err instanceof Error ? err.message : "Unknown error loading map data",
        );
      }
    }

    load();
  }, []);

  // Fast lookup by LSOA code so each feature can be merged with its rank data.
  const imdByCode = useMemo(() => {
    return Object.fromEntries(imdRows.map((row) => [row.lsoa_code, row]));
  }, [imdRows]);

  // Merge rank/decile values into the GeoJSON features and expose the selected metric.
  const mergedGeojson = useMemo(() => {
    if (!geojson) return null;

    return {
      ...geojson,
      features: geojson.features.map((feature: any) => {
        const props = feature.properties || {};
        const code = props.lsoa_code;
        const imd = imdByCode[code];

        const activeValue =
          metric === "bristol_rank"
            ? imd?.bristol_rank
            : metric === "uk_rank"
              ? imd?.uk_rank
              : metric === "bristol_decile"
                ? imd?.bristol_decile
                : imd?.uk_decile;

        return {
          ...feature,
          properties: {
            ...props,
            uk_rank: imd?.uk_rank ?? null,
            uk_decile: imd?.uk_decile ?? null,
            bristol_rank: imd?.bristol_rank ?? null,
            bristol_decile: imd?.bristol_decile ?? null,
            active_value: activeValue ?? null,
            lsoa_name: imd?.lsoa_name ?? props.lsoa_name ?? "Unknown LSOA",
          },
        };
      }),
    };
  }, [geojson, imdByCode, metric]);

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
      {/* Main choropleth map */}
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
                fillColor: isDecileMetric(metric)
                  ? getDecileColor(value)
                  : getRankBucketColor(value),
                weight: 0.7,
                opacity: 1,
                color: "hsl(220, 30%, 16%)",
                fillOpacity: 0.9,
              };
            }}
            onEachFeature={(feature: any, layer: any) => {
              const props = feature.properties || {};
              const metricLabel = getMetricLabel(metric);

              layer.bindTooltip(
                `
                  <div style="font-size:12px;line-height:1.5;">
                    <strong>${props.lsoa_name ?? "Unknown LSOA"}</strong><br/>
                    Code: ${props.lsoa_code ?? "N/A"}<br/>
                    ${metricLabel}: ${props.active_value ?? "N/A"}
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
                  e.target.setStyle({
                    weight: 0.7,
                    color: "hsl(220, 30%, 16%)",
                    fillOpacity: 0.9,
                  });
                },
              });
            }}
          />
        </MapContainer>
      </div>

      {/* Shared legend */}
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