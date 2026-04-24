// Code Sources and Provenance:
 //- npm (2026) framer-motion. Availble from: https://www.npmjs.com/package/framer-motion
 // - React (No Date) React. Available from: https://react.dev/
 // - Lucide (2026) Lucide. Available from: https://lucide.dev/
 //- geeksforgeeks (2025) Introduction to Tailwind CSS. Available from: https://www.geeksforgeeks.org/css/introduction-to-tailwind-css/

import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/glass-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { sourceMetadata } from "@/data/mockData";
import {
  ExternalLink,
  Database,
  Globe,
  Clock,
  Shield,
  CheckCircle,
  XCircle,
  Map,
} from "lucide-react";
import { MetricCard } from "@/components/ui/metric-card";

export default function DataSources() {
  return (
    <div className="space-y-8 w-full">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-4xl md:text-4xl font-bold text-foreground tracking-tight">
          Data Sources        
        </h1>
        <p className="text-muted-foreground text-lg md:text-xl leading-relaxed">
          All publically available datasets used in the deprivation estimation pipeline
        </p>
      </motion.div>

      {/* Summary cards*/}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <MetricCard
          label="Sources"
          value={String(sourceMetadata.length)}
          subtitle="Datasets used"
          icon={Database}
          glow="cyan"
        />

        <MetricCard
          label="Public Data"
          value={String(
            sourceMetadata.filter((s) => s.public_availability).length
          )}
          subtitle="Open datasets"
          icon={Globe}
          glow="violet"
        />

        <MetricCard
          label="Active"
          value={String(
            sourceMetadata.filter((s) => s.status === "active").length
          )}
          subtitle="Currently in use"
          icon={Shield}
          glow="cyan"
        />

        <MetricCard
          label="Update Types"
          value={String(
            new Set(sourceMetadata.map((s) => s.update_frequency)).size
          )}
          subtitle="Distinct schedules"
          icon={Clock}
          glow="magenta"
        />
      </motion.div>

      {/* Data source cards*/}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {sourceMetadata.map((source, i) => (
          <motion.div
            key={source.source_name}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
          >
            <GlassCard hover className="p-4 h-full">
              {/* Header */}
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {source.source_name}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {source.category}
                  </p>
                </div>
                <StatusBadge status={source.status} />
              </div>

              {/* Description */}
              <p className="text-sm text-muted-foreground leading-snug mb-3">
                {source.description}
              </p>

              <div className="grid grid-cols-3 gap-2 text-xs">
                {/* update frequency*/}
                <div>
                  <span className="text-muted-foreground/60 block mb-0.5">
                    Frequency
                  </span>
                  <span className="text-foreground font-medium flex items-center gap-1.5">
                    <Clock className="h-3 w-3 text-accent" />
                    {source.update_frequency}
                  </span>
                </div>

{/* coverage*/}
                <div>
                  <span className="text-muted-foreground/60 block mb-0.5">
                    Coverage
                  </span>
                  <span className="text-foreground font-medium flex items-center gap-1.5">
                    <Map className="h-3 w-3 text-secondary" />
                    {source.coverage}
                  </span>
                </div>

         {/*data accessibility*/}
                <div>
                  <span className="text-muted-foreground/60 block mb-0.5">
                    Access
                  </span>
                  <span className="font-medium flex items-center gap-1.5">
                    <Globe className="h-3 w-3 text-secondary" />
                    {source.public_availability ? (
                      <>
                        <CheckCircle className="h-3 w-3 text-success" />
                        <span className="text-success">Public</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          Restricted
                        </span>
                      </>
                    )}
                  </span>
                </div>
              </div>

              {/* link to data*/}
              <div className="mt-3 pt-2 border-t border-border/30">
                <a
                  href={source.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                  View source documentation
                </a>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>
            <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
      </motion.div>
    </div>
  );
}
