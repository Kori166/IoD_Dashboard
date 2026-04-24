// Code Sources and Provenance:
 //- npm (2026) framer-motion. Availble from: https://www.npmjs.com/package/framer-motion
 // - React (No Date) React. Available from: https://react.dev/
 // - Lucide (2026) Lucide. Available from: https://lucide.dev/

import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/glass-card";
import { SectionHeader } from "@/components/ui/section-header";
import { pipelineSteps } from "@/data/mockData";
import {
  Download, Filter, MapPin, Layers, Calculator, Database,
  AlertTriangle, Clock, Code2, GitBranch
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const iconMap: Record<string, any> = {
  download: Download,
  filter: Filter,
  "map-pin": MapPin,
  layers: Layers,
  calculator: Calculator,
  database: Database,
};

const colorMap: Record<string, string> = {
  cyan: "text-primary bg-primary/10 border-primary/20",
  violet: "text-secondary bg-secondary/10 border-secondary/20",
  magenta: "text-accent bg-accent/10 border-accent/20",
};

export default function PipelineMethod() {
  return (
    <div className="space-y-8 w-full">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <h1 className="text-4xl md:text-4xl font-bold text-foreground tracking-tight">
          Pipeline & Methodology      
        </h1>
        <p className="text-muted-foreground text-lg md:text-xl leading-relaxed">
          How we fetch, process, and combine public data into deprivation estimates
        </p>
      </motion.div>

      // pipeline flow
      <GlassCard className="p-6">
        <SectionHeader title="Data Pipeline" subtitle="End-to-end processing flow" />
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pipelineSteps.map((step, i) => {
            const Icon = iconMap[step.icon] || Database;
            return (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
              >
                <div className={`glass-panel p-5 h-full border ${colorMap[step.color] || ""}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`p-2 rounded-lg border ${colorMap[step.color]}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="text-lg font-mono text-muted-foreground">Step {step.id}</span>
                      <h3 className="text-sm font-semibold text-foreground">{step.title}</h3>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </GlassCard>

      // Architecture cards
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GlassCard glow="cyan" className="p-5">
          <Code2 className="h-5 w-5 text-primary mb-3" />
          <h3 className="text-lg font-semibold text-foreground mb-1">Modular Python Pipeline</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Each data source has its own fetcher and processor module, making the pipeline extensible and maintainable.
          </p>
        </GlassCard>
        <GlassCard glow="violet" className="p-5">
          <GitBranch className="h-5 w-5 text-secondary mb-3" />
          <h3 className="text-lg font-semibold text-foreground mb-1">Orchestration Layer</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            A central orchestrator coordinates fetching, processing, and output generation on a configurable schedule.
          </p>
        </GlassCard>
        <GlassCard glow="magenta" className="p-5">
          <Clock className="h-5 w-5 text-accent mb-3" />
          <h3 className="text-lg font-semibold text-foreground mb-1">Frequent Refresh</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Unlike the official IMD (updated every ~5 years), our pipeline can refresh monthly as new public data becomes available.
          </p>
        </GlassCard>
      </div>

      // Why public data cards
      <GlassCard className="p-6">
        <SectionHeader title="Why Public Data?" />
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h4 className="text-lg font-semibold text-primary">Reducing Survey Dependence</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Traditional deprivation indices rely on expensive, infrequent surveys and restricted administrative data.
              By using publicly available datasets, we can create more timely estimates at a fraction of the cost while
              maintaining transparency and reproducibility.
            </p>
          </div>
          <div className="space-y-3">
            <h4 className="text-lg font-semibold text-secondary">Update Cadence</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Many public datasets (DWP, ONS, Police.uk) are updated monthly or quarterly. This allows our pipeline to
              produce near real-time deprivation estimates, capturing rapid changes in economic and social conditions.
            </p>
          </div>
        </div>
      </GlassCard>

      // Accordian cards - scoring, transformation, indicators, caveats
      <GlassCard className="p-6">
        <SectionHeader title="Detailed Methodology" subtitle="Expand sections for technical detail" />
        <Accordion type="single" collapsible className="mt-4">
          <AccordionItem value="methodology" className="border-border/50">
            <AccordionTrigger className="text-lg font-medium text-foreground hover:text-primary">
              Scoring Methodology
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
              Indicators are first normalized to a common scale (0-100) using min-max normalization within each geography level.
              Domain scores are computed as weighted averages of constituent indicators. The overall deprivation score uses
              an exponential transformation to emphasize the most deprived end of the distribution, consistent with the
              official IMD methodology. Weights are estimated using principal component analysis on the normalized indicator data.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="transforms" className="border-border/50">
            <AccordionTrigger className="text-lg font-medium text-foreground hover:text-primary">
              Transformation Steps
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
              Raw data undergoes: (1) schema validation and type coercion, (2) temporal alignment to a common reference period,
              (3) geographic lookup and boundary matching using OS Open Geography, (4) outlier detection and capping,
              (5) imputation of missing values using spatial interpolation where appropriate, and (6) final normalization.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="indicators" className="border-border/50">
            <AccordionTrigger className="text-lg font-medium text-foreground hover:text-primary">
              Indicator Engineering
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
              Some indicators are derived from raw data: e.g., the "overcrowding rate" is computed from Census occupancy
              ratings; "broadband deprivation" is inverted from Ofcom speed data. Composite indicators within domains may
              combine multiple source variables using factor loadings estimated from PCA.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="caveats" className="border-border/50">
            <AccordionTrigger className="text-lg font-medium text-foreground hover:text-primary">
              <span className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                Caveats & Limitations
              </span>
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
              <ul className="list-disc pl-5 space-y-1">
                <li>Public data may not capture all dimensions of deprivation equally</li>
                <li>Some indicators have lower geographic resolution than LSOA-level</li>
                <li>Temporal misalignment between sources introduces uncertainty</li>
                <li>The model approximates but does not replicate the official IMD methodology exactly</li>
                <li>Missing data is imputed, which may introduce bias in areas with sparse coverage</li>
                <li>Results should be interpreted as estimates, not definitive deprivation measures</li>
              </ul>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </GlassCard>
    </div>
  );
}
