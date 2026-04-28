import { useEffect, useMemo, useState } from "react";
import { GeoJSON, MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

import type { LsoaCurrentRow } from "@/types/dashboard-data";

type LsoaGeoJson = GeoJSON.FeatureCollection<
  GeoJSON.Geometry,
  {
    lsoa_code?: string;
    lsoa_name?: string;
    lsoa_code_11?: string | null;
    lsoa_name_11?: string | null;
    longitude?: number | null;
    latitude?: number | null;
    active_rank?: number | null;
    active_decile?: number | null;
  }
>;

type BristolChoroplethProps = {
  mode: "bristol" | "uk";
  highlightedDecile?: number | null;
  onLegendHoverChange?: (decile: number | null) => void;
  heightClassName = "h-[450px]",
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

function formatNumber(value?: number | null, digits = 2) {
  if (value == null || !Number.isFinite(value)) return "N/A";
  return Number(value).toFixed(digits);
}

export default function BristolChoropleth({
  mode,
  highlightedDecile = null,
  onLegendHoverChange,
  heightClassName = "h-[540px]",
}: BristolChoroplethProps) {
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
        console.error("Error loading Bristol choropleth data:", err);
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

        const activeRank =
          mode === "bristol"
            ? row?.bristol_rank ?? null
            : row?.ons_national_rank ?? null;

        const activeDecile =
          mode === "bristol"
            ? row?.bristol_decile ?? null
            : row?.ons_national_decile ?? null;

        return {
          ...feature,
          properties: {
            ...props,
            ...row,
            active_rank: activeRank,
            active_decile: activeDecile,
            lsoa_code: row?.code ?? code ?? null,
            lsoa_name: row?.label ?? props.lsoa_name ?? props.lsoa_name_11 ?? "Unknown LSOA",
            ward_name: row?.ward_name ?? null,
          },
        };
      }),
    };
  }, [geojson, lsoaByCode, mode]);

  if (error) {
    return (
      <div className="h-[540px] flex items-center justify-center text-sm text-destructive">
        Error loading map: {error}
      </div>
    );
  }

  if (!mergedGeojson) {
    return (
      <div className="h-[540px] flex items-center justify-center text-sm text-muted-foreground">
        Loading Bristol map...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="h-[540px] w-full overflow-hidden rounded-xl border border-border/40">
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
            key={`${mode}-${highlightedDecile ?? "none"}`}
            data={mergedGeojson as any}
            style={(feature: any) => {
              const featureDecile = feature?.properties?.active_decile;
              const isHighlighted =
                highlightedDecile !== null && featureDecile === highlightedDecile;
              const isDimmed =
                highlightedDecile !== null && featureDecile !== highlightedDecile;

              return {
                fillColor: getDecileColor(featureDecile),
                weight: isHighlighted ? 1.8 : 0.7,
                opacity: 1,
                color: isHighlighted ? "hsl(190, 95%, 55%)" : "hsl(220, 30%, 16%)",
                fillOpacity: isDimmed ? 0.28 : isHighlighted ? 1 : 0.9,
              };
            }}
            onEachFeature={(feature: any, layer: any) => {
              const props = feature.properties || {};
              const rankLabel = mode === "bristol" ? "Bristol Rank" : "UK Rank";
              const decileLabel = mode === "bristol" ? "Bristol Decile" : "UK Decile";
              const scoreLabel = mode === "bristol" ? "Bristol Score" : "ONS Score";
              const scoreValue =
                mode === "bristol" ? props.bristol_score : props.ons_score;

              layer.bindTooltip(
                `
                  <div style="font-size:12px;line-height:1.5;">
                    <strong>${props.lsoa_name ?? "Unknown LSOA"}</strong><br/>
                    Ward: ${props.ward_name ?? "N/A"}<br/>
                    Code: ${props.lsoa_code ?? "N/A"}<br/>
                    ${rankLabel}: ${props.active_rank ?? "N/A"}<br/>
                    ${decileLabel}: ${props.active_decile ?? "N/A"}<br/>
                    ${scoreLabel}: ${formatNumber(scoreValue)}
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
                    weight: 1.8,
                    color: "hsl(190, 95%, 55%)",
                    fillOpacity: 1,
                  });
                },
                mouseout: (e: any) => {
                  const featureDecile = props.active_decile;
                  const isHighlighted =
                    highlightedDecile !== null && featureDecile === highlightedDecile;
                  const isDimmed =
                    highlightedDecile !== null && featureDecile !== highlightedDecile;

                  e.target.setStyle({
                    weight: isHighlighted ? 1.8 : 0.7,
                    color: isHighlighted ? "hsl(190, 95%, 55%)" : "hsl(220, 30%, 16%)",
                    fillOpacity: isDimmed ? 0.28 : isHighlighted ? 1 : 0.9,
                  });
                },
              });
            }}
          />
        </MapContainer>
      </div>

      <div className="flex items-top gap-5 text-xs text-muted-foreground flex-wrap">
        <span>Most Deprived</span>

        <div className="flex items-center gap-1">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((decile) => (
            <div
              key={decile}
              className="flex flex-col items-center gap-1"
              onMouseEnter={() => onLegendHoverChange?.(decile)}
              onMouseLeave={() => onLegendHoverChange?.(null)}
            >
              <div
                className="h-5 w-5 rounded transition-all"
                style={{
                  background: getDecileColor(decile),
                  opacity:
                    highlightedDecile === null || highlightedDecile === decile ? 1 : 0.35,
                  outline:
                    highlightedDecile === decile
                      ? "1.5px solid rgba(255,255,255,0.9)"
                      : "none",
                  cursor: "pointer",
                }}
                title={`Decile ${decile}`}
              />
              <span className="text-[10px]">{decile}</span>
            </div>
          ))}
        </div>

        <span>Least Deprived</span>
      </div>
    </div>
  );
}