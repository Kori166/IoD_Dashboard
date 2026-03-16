import { useState } from "react";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/glass-card";
import { SectionHeader } from "@/components/ui/section-header";
import { KeyInsight } from "@/components/ui/key-insight";
import { StatusBadge } from "@/components/ui/status-badge";
import { areaSummaries, indicatorCategories } from "@/data/mockData";
import { MapPin, Layers, Filter, X, ChevronRight } from "lucide-react";

// Simplified UK outline as SVG regions for visual effect
function UKMapVisualization({ selectedArea, onAreaClick }: { selectedArea: string | null; onAreaClick: (id: string) => void }) {
  // Create a grid-based cartogram representing UK areas
  const cols = 6;
  const cellSize = 52;
  const gap = 3;

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <svg
        viewBox={`0 0 ${cols * (cellSize + gap)} ${Math.ceil(areaSummaries.length / cols) * (cellSize + gap)}`}
        className="w-full h-full max-h-[600px]"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="depGrad1" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="hsl(190, 95%, 55%)" />
            <stop offset="100%" stopColor="hsl(260, 60%, 55%)" />
          </linearGradient>
        </defs>
        {areaSummaries.map((area, i) => {
          const col = i % cols;
          const row = Math.floor(i / cols);
          const x = col * (cellSize + gap);
          const y = row * (cellSize + gap);
          const intensity = area.deprivation_score / 80;
          const isSelected = selectedArea === area.area_id;

          return (
            <g key={area.area_id} onClick={() => onAreaClick(area.area_id)} className="cursor-pointer">
              <rect
                x={x} y={y}
                width={cellSize} height={cellSize}
                rx={6}
                fill={`hsl(${190 + intensity * 120}, ${50 + intensity * 40}%, ${55 - intensity * 25}%)`}
                opacity={isSelected ? 1 : 0.7}
                stroke={isSelected ? "hsl(190, 95%, 55%)" : "hsl(220, 30%, 16%)"}
                strokeWidth={isSelected ? 2 : 0.5}
                className="transition-all duration-200 hover:opacity-100"
              />
              <text
                x={x + cellSize / 2} y={y + cellSize / 2 - 4}
                textAnchor="middle"
                fill="hsl(210, 20%, 92%)"
                fontSize="7"
                fontWeight="600"
                fontFamily="Inter"
              >
                {area.area_name.length > 10 ? area.area_name.slice(0, 9) + "…" : area.area_name}
              </text>
              <text
                x={x + cellSize / 2} y={y + cellSize / 2 + 10}
                textAnchor="middle"
                fill="hsl(210, 20%, 75%)"
                fontSize="9"
                fontFamily="JetBrains Mono"
              >
                {area.deprivation_score}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function MapExplorer() {
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [geoType, setGeoType] = useState("Local Authority");
  const [layerType, setLayerType] = useState("Overall Score");

  const selectedData = areaSummaries.find(a => a.area_id === selectedArea);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <SectionHeader
          title="Map Explorer"
          subtitle="Interactive choropleth view of estimated deprivation across the UK"
        />
      </motion.div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3">
        {["LSOA", "MSOA", "Local Authority", "Region"].map(geo => (
          <button
            key={geo}
            onClick={() => setGeoType(geo)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
              geoType === geo
                ? "bg-primary/15 text-primary border-primary/30"
                : "bg-muted/30 text-muted-foreground border-border/50 hover:bg-muted/50"
            }`}
          >
            {geo}
          </button>
        ))}
        <div className="w-px bg-border/50 mx-1" />
        {["Overall Score", "Income", "Employment", "Health", "Education"].map(layer => (
          <button
            key={layer}
            onClick={() => setLayerType(layer)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
              layerType === layer
                ? "bg-secondary/15 text-secondary border-secondary/30"
                : "bg-muted/30 text-muted-foreground border-border/50 hover:bg-muted/50"
            }`}
          >
            {layer}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Map */}
        <GlassCard className="lg:col-span-3 p-4 min-h-[500px]">
          <UKMapVisualization selectedArea={selectedArea} onAreaClick={setSelectedArea} />
          {/* Legend */}
          <div className="flex items-center gap-4 mt-4 px-2">
            <span className="text-xs text-muted-foreground">Less deprived</span>
            <div className="flex-1 h-2 rounded-full" style={{
              background: "linear-gradient(to right, hsl(190, 70%, 50%), hsl(260, 60%, 45%), hsl(310, 70%, 40%))"
            }} />
            <span className="text-xs text-muted-foreground">More deprived</span>
          </div>
        </GlassCard>

        {/* Side Panel */}
        <div className="space-y-4">
          {selectedData ? (
            <GlassCard glow="cyan" className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-base font-semibold text-foreground">{selectedData.area_name}</h3>
                  <p className="text-xs text-muted-foreground">{selectedData.region} · {selectedData.geography_type}</p>
                </div>
                <button onClick={() => setSelectedArea(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Deprivation Score</span>
                  <span className="font-mono font-bold text-primary">{selectedData.deprivation_score}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Rank</span>
                  <span className="font-mono">{selectedData.deprivation_rank} / {areaSummaries.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Decile</span>
                  <span className="font-mono">{selectedData.deprivation_decile}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Type</span>
                  <StatusBadge status={selectedData.urban_rural === "Urban" ? "active" : "pending"} label={selectedData.urban_rural} />
                </div>
                <div className="border-t border-border/50 pt-3">
                  <p className="text-xs text-muted-foreground mb-2">vs National Average (44.5)</p>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min((selectedData.deprivation_score / 80) * 100, 100)}%`,
                        background: "linear-gradient(to right, hsl(190, 95%, 55%), hsl(260, 60%, 55%))"
                      }}
                    />
                  </div>
                </div>
              </div>
            </GlassCard>
          ) : (
            <GlassCard className="p-5 text-center">
              <MapPin className="h-8 w-8 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-sm text-muted-foreground">Click an area on the map to view details</p>
            </GlassCard>
          )}

          <KeyInsight insights={["The highest deprivation concentration appears in Northern England and inner London boroughs."]} />
        </div>
      </div>
    </div>
  );
}
