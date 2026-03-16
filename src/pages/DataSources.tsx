import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/glass-card";
import { SectionHeader } from "@/components/ui/section-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { sourceMetadata } from "@/data/mockData";
import { ExternalLink, Database, Globe, Clock, Shield } from "lucide-react";

export default function DataSources() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <SectionHeader
          title="Data Sources"
          subtitle="All publicly available datasets used in the deprivation estimation pipeline"
        />
      </motion.div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GlassCard className="p-4 text-center">
          <Database className="h-5 w-5 text-primary mx-auto mb-2" />
          <p className="text-xl font-bold text-foreground">{sourceMetadata.length}</p>
          <p className="text-xs text-muted-foreground">Total Sources</p>
        </GlassCard>
        <GlassCard className="p-4 text-center">
          <Globe className="h-5 w-5 text-secondary mx-auto mb-2" />
          <p className="text-xl font-bold text-foreground">{sourceMetadata.filter(s => s.public_availability).length}</p>
          <p className="text-xs text-muted-foreground">Publicly Available</p>
        </GlassCard>
        <GlassCard className="p-4 text-center">
          <Shield className="h-5 w-5 text-success mx-auto mb-2" />
          <p className="text-xl font-bold text-foreground">{sourceMetadata.filter(s => s.status === "active").length}</p>
          <p className="text-xs text-muted-foreground">Active Sources</p>
        </GlassCard>
        <GlassCard className="p-4 text-center">
          <Clock className="h-5 w-5 text-accent mx-auto mb-2" />
          <p className="text-xl font-bold text-foreground">
            {new Set(sourceMetadata.map(s => s.update_frequency)).size}
          </p>
          <p className="text-xs text-muted-foreground">Update Frequencies</p>
        </GlassCard>
      </div>

      {/* Source Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sourceMetadata.map((source, i) => (
          <motion.div
            key={source.source_name}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
          >
            <GlassCard hover className="p-5 h-full">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{source.source_name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{source.category}</p>
                </div>
                <StatusBadge status={source.status} />
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">{source.description}</p>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground/60 block mb-0.5">Frequency</span>
                  <span className="text-foreground font-medium">{source.update_frequency}</span>
                </div>
                <div>
                  <span className="text-muted-foreground/60 block mb-0.5">Coverage</span>
                  <span className="text-foreground font-medium">{source.coverage}</span>
                </div>
                <div>
                  <span className="text-muted-foreground/60 block mb-0.5">Access</span>
                  <span className="text-success font-medium flex items-center gap-1">
                    <Globe className="h-3 w-3" /> Public
                  </span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-border/30">
                <a href={source.link} className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
                  <ExternalLink className="h-3 w-3" /> View source documentation
                </a>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
