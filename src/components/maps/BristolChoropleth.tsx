import { useEffect, useMemo, useState } from "react";
import { GeoJSON, MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

type IMDRow = {
  lsoa_code: string;
  lsoa_name?: string;
  imd_score?: number | null;
  uk_rank?: number | null;
  uk_decile?: number | null;
  bristol_rank?: number | null;
  bristol_decile?: number | null;
};

type LsoaGeoJson = GeoJSON.FeatureCollection<
  GeoJSON.Geometry,
  {
    lsoa_code?: string;
    lsoa_name?: string;
    lsoa_code_11?: string | null;
    lsoa_name_11?: string | null;
    longitude?: number | null;
    latitude?: number | null;
    imd_score?: number | null;
    uk_rank?: number | null;
    uk_decile?: number | null;
    bristol_rank?: number | null;
    bristol_decile?: number | null;
    active_rank?: number | null;
    active_decile?: number | null;
  }
>;

function getDecileColor(decile?: number | null) {
  if (!decile) return "#1f2937";
  const palette: Record<number, string> = {
    1: "#f4effa",
    2: "#e3d6f5",
    3: "#cbb4ee",
    4: "#ae88e2",
    5: "#8e60d2",
    6: "#6f4ebf",
    7: "#4a53ab",
    8: "#2f669f",
    9: "#2f887f",
    10: "#49b08b",
  };
  return palette[decile] ?? "#1f2937";
}

export default function BristolChoropleth() {
  const [geojson, setGeojson] = useState<LsoaGeoJson | null>(null);
  const [imdRows, setImdRows] = useState<IMDRow[]>([]);
  const [rankMode, setRankMode] = useState<"bristol" | "uk">("bristol");
  const [error, setError] = useState<string | null>(null);

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
        console.error("Error loading Bristol choropleth data:", err);
        setError(
          err instanceof Error ? err.message : "Unknown error loading map data",
        );
      }
    }

    load();
  }, []);

  const imdByCode = useMemo(() => {
    return Object.fromEntries(imdRows.map((row) => [row.lsoa_code, row]));
  }, [imdRows]);

  const mergedGeojson = useMemo(() => {
    if (!geojson) return null;

    return {
      ...geojson,
      features: geojson.features.map((feature: any) => {
        const props = feature.properties || {};
        const code = props.lsoa_code;
        const imd = imdByCode[code];

        const activeRank =
          rankMode === "bristol" ? imd?.bristol_rank : imd?.uk_rank;
        const activeDecile =
          rankMode === "bristol" ? imd?.bristol_decile : imd?.uk_decile;

        return {
          ...feature,
          properties: {
            ...props,
            imd_score: imd?.imd_score ?? null,
            uk_rank: imd?.uk_rank ?? null,
            uk_decile: imd?.uk_decile ?? null,
            bristol_rank: imd?.bristol_rank ?? null,
            bristol_decile: imd?.bristol_decile ?? null,
            active_rank: activeRank ?? null,
            active_decile: activeDecile ?? null,
            lsoa_name: imd?.lsoa_name ?? props.lsoa_name ?? "Unknown LSOA",
          },
        };
      }),
    };
  }, [geojson, imdByCode, rankMode]);

  if (error) {
    return (
      <div className="h-[420px] flex items-center justify-center text-sm text-destructive">
        Error loading map: {error}
      </div>
    );
  }

  if (!mergedGeojson) {
    return (
      <div className="h-[420px] flex items-center justify-center text-sm text-muted-foreground">
        Loading Bristol IMD map...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => setRankMode("bristol")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
            rankMode === "bristol"
              ? "bg-primary/15 text-primary border-primary/30"
              : "bg-muted/30 text-muted-foreground border-border/50"
          }`}
        >
          Bristol Rank
        </button>

        <button
          onClick={() => setRankMode("uk")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
            rankMode === "uk"
              ? "bg-primary/15 text-primary border-primary/30"
              : "bg-muted/30 text-muted-foreground border-border/50"
          }`}
        >
          UK Rank
        </button>
      </div>

      <div className="h-[420px] w-full overflow-hidden rounded-xl border border-border/40">
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
            data={mergedGeojson as any}
            style={(feature: any) => ({
              fillColor: getDecileColor(feature?.properties?.active_decile),
              weight: 0.7,
              opacity: 1,
              color: "hsl(220, 30%, 16%)",
              fillOpacity: 0.9,
            })}
            onEachFeature={(feature: any, layer: any) => {
              const props = feature.properties || {};

              layer.bindTooltip(
                `
                  <div style="font-size:12px;line-height:1.5;">
                    <strong>${props.lsoa_name ?? "Unknown LSOA"}</strong><br/>
                    Code: ${props.lsoa_code ?? "N/A"}<br/>
                    IMD Score: ${props.imd_score ?? "N/A"}<br/>
                    UK Rank: ${props.uk_rank ?? "N/A"}<br/>
                    Bristol Rank: ${props.bristol_rank ?? "N/A"}<br/>
                    Active Mode: ${rankMode === "bristol" ? "Bristol" : "UK"}
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

      <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
        <span>Most deprived</span>
        <div className="h-2 w-8 rounded" style={{ background: "#f4effa" }} />
        <div className="h-2 w-8 rounded" style={{ background: "#cbb4ee" }} />
        <div className="h-2 w-8 rounded" style={{ background: "#8e60d2" }} />
        <div className="h-2 w-8 rounded" style={{ background: "#2f669f" }} />
        <div className="h-2 w-8 rounded" style={{ background: "#49b08b" }} />
        <span>Least deprived</span>
        <span className="ml-2">
          Viewing by: {rankMode === "bristol" ? "Bristol rank" : "UK rank"}
        </span>
      </div>
    </div>
  );
}