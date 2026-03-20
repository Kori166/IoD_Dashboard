import { useEffect, useState } from "react";
import { GeoJSON, MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

type ChoroplethGeoJson = GeoJSON.FeatureCollection<
  GeoJSON.Geometry,
  {
    lsoa_code?: string;
    lsoa_name?: string;
    imd_rank?: number | null;
    imd_decile?: number | null;
    imd_score?: number | null;
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
  const [geojson, setGeojson] = useState<ChoroplethGeoJson | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setError(null);

        const res = await fetch("/data/bristol_imd_choropleth.geojson");
        if (!res.ok) {
          throw new Error(`Failed to fetch GeoJSON: ${res.status} ${res.statusText}`);
        }

        const data = await res.json();

        if (!data || data.type !== "FeatureCollection" || !Array.isArray(data.features)) {
          throw new Error("GeoJSON file is not a valid FeatureCollection");
        }

        setGeojson(data);
      } catch (err) {
        console.error("Error loading Bristol choropleth:", err);
        setError(err instanceof Error ? err.message : "Unknown error loading map");
      }
    }

    load();
  }, []);

  if (error) {
    return (
      <div className="h-[420px] flex items-center justify-center text-sm text-destructive">
        Error loading map: {error}
      </div>
    );
  }

  if (!geojson) {
    return (
      <div className="h-[420px] flex items-center justify-center text-sm text-muted-foreground">
        Loading Bristol IMD map...
      </div>
    );
  }

  return (
    <div className="space-y-3">
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
            data={geojson as any}
            style={(feature: any) => ({
              fillColor: getDecileColor(feature?.properties?.imd_decile),
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
                    IMD Rank: ${props.imd_rank ?? "N/A"}<br/>
                    IMD Decile: ${props.imd_decile ?? "N/A"}<br/>
                    IMD Score: ${props.imd_score ?? "N/A"}
                  </div>
                `,
                {
                  sticky: true,
                  opacity: 0.95,
                }
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
      </div>
    </div>
  );
}