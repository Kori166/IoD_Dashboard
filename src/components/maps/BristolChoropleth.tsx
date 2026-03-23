import { useEffect, useMemo, useState } from "react";
import { GeoJSON, MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

// Shape of each IMD record loaded from the JSON data file.
type IMDRow = {
  lsoa_code: string;
  lsoa_name?: string;
  uk_rank?: number | null;
  uk_decile?: number | null;
  bristol_rank?: number | null;
  bristol_decile?: number | null;
};

// GeoJSON structure for Bristol LSOA boundaries plus the extra properties
// we attach after merging in the IMD dataset.
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
    active_rank?: number | null;
    active_decile?: number | null;
  }
>;

// Returns a fill colour for a given deprivation decile.
// Lower deciles are more deprived, higher deciles are less deprived.
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

export default function BristolChoropleth() {
  const [geojson, setGeojson] = useState<LsoaGeoJson | null>(null); // Raw GeoJSON map boundary data.
  const [imdRows, setImdRows] = useState<IMDRow[]>([]); // Raw IMD rows loaded from the companion JSON file.
  const [rankMode, setRankMode] = useState<"bristol" | "uk">("bristol"); // Controls whether the map colours and labels use Bristol ranking or UK ranking.
  const [error, setError] = useState<string | null>(null); // Stores any loading or parsing error so we can show a friendly message in the UI.

  // Load both the boundary GeoJSON and IMD data once when the component mounts.
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

  // Build a lookup table so IMD rows can be found quickly by LSOA code.
  const imdByCode = useMemo(() => {
    return Object.fromEntries(imdRows.map((row) => [row.lsoa_code, row]));
  }, [imdRows]);

  // Merge the GeoJSON features with the IMD lookup table and attach whichever
  // rank/decile is currently active based on the selected mode.
  const mergedGeojson = useMemo(() => {
    if (!geojson) return null;

    return {
      ...geojson,
      features: geojson.features.map((feature: any) => {
        const props = feature.properties || {};
        const code = props.lsoa_code;
        const imd = imdByCode[code];

        const activeRank =
          rankMode === "bristol"
            ? (imd?.bristol_rank ?? null)
            : (imd?.uk_rank ?? null);

        const activeDecile =
          rankMode === "bristol"
            ? (imd?.bristol_decile ?? null)
            : (imd?.uk_decile ?? null);

        return {
          ...feature,
          properties: {
            ...props,
            uk_rank: imd?.uk_rank ?? null,
            uk_decile: imd?.uk_decile ?? null,
            bristol_rank: imd?.bristol_rank ?? null,
            bristol_decile: imd?.bristol_decile ?? null,
            active_rank: activeRank,
            active_decile: activeDecile,
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
      {/* Mode switcher for choosing whether the map uses Bristol or UK rank data. */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => setRankMode("bristol")}
          className={`px-3 py-2 rounded-lg text-M font-medium border ${
            rankMode === "bristol"
              ? "bg-primary/15 text-primary border-primary/30"
              : "bg-muted/30 text-muted-foreground border-border/50"
          }`}
        >
          Bristol IoD
        </button>

        <button
          onClick={() => setRankMode("uk")}
          className={`px-3 py-2 rounded-lg text-M font-medium border ${
            rankMode === "uk"
              ? "bg-primary/15 text-primary border-primary/30"
              : "bg-muted/30 text-muted-foreground border-border/50"
          }`}
        >
          UK IoD
        </button>
      </div>

      {/* Main map container with fixed height and clipped rounded border. */}
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
            key={rankMode}
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
              const rankLabel = rankMode === "bristol" ? "Bristol Rank" : "UK Rank";
              const decileLabel =
                rankMode === "bristol" ? "Bristol Decile" : "UK Decile";

              layer.bindTooltip(
                `
                  <div style="font-size:12px;line-height:1.5;">
                    <strong>${props.lsoa_name ?? "Unknown LSOA"}</strong><br/>
                    Code: ${props.lsoa_code ?? "N/A"}<br/>
                    ${rankLabel}: ${props.active_rank ?? "N/A"}<br/>
                    ${decileLabel}: ${props.active_decile ?? "N/A"}
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

      {/* Legend showing the decile colour scale and the currently selected mode. */}
      <div className="flex items-top gap-5 text-m text-muted-foreground flex-wrap">
        <span>Most Deprived</span>

        <div className="flex items-center gap-1">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((decile) => (
            <div key={decile} className="flex flex-col items-center gap-1">
              <div
                className="h-5 w-5 rounded"
                style={{ background: getDecileColor(decile) }}
                title={`Decile ${decile}`}
              />
              <span className="text-[10px]">{decile}</span>
            </div>
          ))}
        </div>

        <span>Least Deprived</span>
        <span className="ml-2">
          Viewing by: {rankMode === "bristol" ? "Bristol decile" : "UK decile"}
        </span>
      </div>
    </div>
  );
}