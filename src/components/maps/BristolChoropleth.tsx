import { useEffect, useMemo, useState } from "react";
import { GeoJSON, MapContainer, TileLayer, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";

type IMDRecord = {
  lsoa_code: string;
  lsoa_name: string;
  imd_rank: number;
  imd_decile: number;
  imd_score?: number;
};

type GeoJsonFeature = GeoJSON.Feature<GeoJSON.Geometry, Record<string, any>>;
type GeoJsonCollection = GeoJSON.FeatureCollection<GeoJSON.Geometry, Record<string, any>>;

function getDecileColor(decile?: number) {
  if (!decile) return "hsl(220, 20%, 18%)";

  // Dark-theme friendly purple -> cyan/green style
  if (decile === 1) return "#f3eefc";
  if (decile === 2) return "#ddd0f7";
  if (decile === 3) return "#c4acef";
  if (decile === 4) return "#a57fe5";
  if (decile === 5) return "#8557d5";
  if (decile === 6) return "#5e49ba";
  if (decile === 7) return "#2d5f98";
  if (decile === 8) return "#287a9a";
  if (decile === 9) return "#2e948d";
  return "#46b38a";
}

export default function BristolChoropleth() {
  const [geojson, setGeojson] = useState<GeoJsonCollection | null>(null);
  const [imdRows, setImdRows] = useState<IMDRecord[]>([]);

  useEffect(() => {
    async function load() {
      const [geoRes, imdRes] = await Promise.all([
        fetch("/data/bristol_lsoa.geojson"),
        fetch("/data/bristol_imd.json"),
      ]);

      const geo = await geoRes.json();
      const imd = await imdRes.json();

      setGeojson(geo);
      setImdRows(imd);
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
      features: geojson.features.map((feature: GeoJsonFeature) => {
        const props = feature.properties || {};
        const code =
          props.LSOA21CD ||
          props.LSOA11CD ||
          props.lsoa_code;

        const imd = imdByCode[code];

        return {
          ...feature,
          properties: {
            ...props,
            lsoa_code: code,
            lsoa_name:
              props.LSOA21NM ||
              props.LSOA11NM ||
              props.lsoa_name ||
              imd?.lsoa_name ||
              "Unknown LSOA",
            imd_rank: imd?.imd_rank ?? null,
            imd_decile: imd?.imd_decile ?? null,
            imd_score: imd?.imd_score ?? null,
          },
        };
      }),
    } as GeoJsonCollection;
  }, [geojson, imdByCode]);

  if (!mergedGeojson) {
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
          style={{ height: "100%", width: "100%", background: "transparent" }}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; OpenStreetMap &copy; CARTO'
          />

          <GeoJSON
            data={mergedGeojson as any}
            style={(feature: any) => {
              const decile = feature?.properties?.imd_decile;

              return {
                fillColor: getDecileColor(decile),
                weight: 0.7,
                opacity: 1,
                color: "hsl(220, 30%, 16%)",
                fillOpacity: 0.88,
              };
            }}
            onEachFeature={(feature: any, layer: any) => {
              const {
                lsoa_name,
                lsoa_code,
                imd_rank,
                imd_decile,
                imd_score,
              } = feature.properties;

              layer.bindTooltip(
                `
                  <div style="font-size:12px;line-height:1.5;">
                    <strong>${lsoa_name}</strong><br/>
                    Code: ${lsoa_code}<br/>
                    IMD Rank: ${imd_rank ?? "N/A"}<br/>
                    IMD Decile: ${imd_decile ?? "N/A"}<br/>
                    IMD Score: ${imd_score ?? "N/A"}
                  </div>
                `,
                {
                  sticky: true,
                  direction: "top",
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
                    fillOpacity: 0.88,
                  });
                },
              });
            }}
          />
        </MapContainer>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
        <span>Most deprived</span>
        <div className="h-2 w-8 rounded" style={{ background: "#f3eefc" }} />
        <div className="h-2 w-8 rounded" style={{ background: "#c4acef" }} />
        <div className="h-2 w-8 rounded" style={{ background: "#8557d5" }} />
        <div className="h-2 w-8 rounded" style={{ background: "#2d5f98" }} />
        <div className="h-2 w-8 rounded" style={{ background: "#46b38a" }} />
        <span>Least deprived</span>
      </div>
    </div>
  );
}