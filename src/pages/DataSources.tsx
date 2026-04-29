
import { useEffect, useMemo, useState, type ElementType } from "react";
import { motion } from "framer-motion";
import { Banknote, Building2, Database, ExternalLink, FileText, Grid3X3, Home, Landmark, Map, MapPinned, Route, Search, Shield, Users} from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";

type DataSource = {
  id: string;
  name: string;
  category: string;
  icon: string;
  description: string;
  used_for: string;
  url: string;
};

const CATEGORY_ORDER = [
  "All sources",
  "Official reference",
  "Socioeconomic",
  "Housing",
  "Crime",
  "Geography & services",
  "Geography",
  "Demographics",
];

const CATEGORY_ICONS: Record<string, ElementType> = {
  "All sources": Grid3X3,
  "Official reference": FileText,
  Socioeconomic: Users,
  Housing: Home,
  Crime: Shield,
  "Geography & services": MapPinned,
  Geography: Map,
  Demographics: Users,
};

const SOURCE_ICONS: Record<string, ElementType> = {
  benefits: Banknote,
  crime: Shield,
  map: MapPinned,
  housing: Home,
  connectivity: Route,
  population: Users,
  boundaries: Map,
  reference: Landmark,
  bristol: Building2,
};

function getCategoryStyle(category: string) {
  switch (category) {
    case "Official reference":
      return {
        glow: "shadow-[0_0_36px_rgba(168,85,247,0.22)]",
        iconBg: "bg-violet-400/15",
        iconText: "text-violet-300",
        border: "border-violet-400/20",
      };
    case "Socioeconomic":
      return {
        glow: "shadow-[0_0_36px_rgba(34,211,238,0.22)]",
        iconBg: "bg-cyan-400/15",
        iconText: "text-cyan-300",
        border: "border-cyan-400/20",
      };
    case "Housing":
      return {
        glow: "shadow-[0_0_36px_rgba(45,212,191,0.20)]",
        iconBg: "bg-teal-400/15",
        iconText: "text-teal-300",
        border: "border-teal-400/20",
      };
    case "Crime":
      return {
        glow: "shadow-[0_0_36px_rgba(96,165,250,0.22)]",
        iconBg: "bg-blue-400/15",
        iconText: "text-blue-300",
        border: "border-blue-400/20",
      };
    case "Geography & services":
    case "Geography":
      return {
        glow: "shadow-[0_0_36px_rgba(20,184,166,0.20)]",
        iconBg: "bg-emerald-400/15",
        iconText: "text-emerald-300",
        border: "border-emerald-400/20",
      };
    case "Demographics":
      return {
        glow: "shadow-[0_0_36px_rgba(244,114,182,0.18)]",
        iconBg: "bg-pink-400/15",
        iconText: "text-pink-300",
        border: "border-pink-400/20",
      };
    default:
      return {
        glow: "shadow-[0_0_36px_rgba(34,211,238,0.18)]",
        iconBg: "bg-cyan-400/15",
        iconText: "text-cyan-300",
        border: "border-cyan-400/20",
      };
  }
}

function SourceCard({
  source,
  featured = false,
}: {
  source: DataSource;
  featured?: boolean;
}) {
  const Icon = SOURCE_ICONS[source.icon] ?? FileText;
  const style = getCategoryStyle(source.category);

  return (
    <GlassCard
      hover
      className={`h-full overflow-hidden p-5 ${style.border} ${
        featured ? "xl:col-span-1" : ""
      }`}
    >
      <div className="flex h-full flex-col">
        <div className="flex gap-4">
          <div
            className={`flex shrink-0 items-center justify-center rounded-full ${style.iconBg} ${style.iconText} ${style.glow} ${
              featured ? "h-24 w-24" : "h-20 w-20"
            }`}
          >
            <Icon className={featured ? "h-11 w-11" : "h-9 w-9"} />
          </div>

          <div className="min-w-0">
            <h2 className="text-xl font-bold leading-tight text-foreground">
              {source.name}
            </h2>
            <p className={`mt-1 text-sm font-semibold ${style.iconText}`}>
              {source.category}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {source.description}
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-border/40 bg-background/35 p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Used for
          </p>
          <p className="mt-1 text-sm leading-relaxed text-foreground">
            {source.used_for}
          </p>
        </div>

        <div className="mt-auto pt-4">
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-300 transition-colors hover:text-cyan-200"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            View source
          </a>
        </div>
      </div>
    </GlassCard>
  );
}

export default function DataSources() {
  const [sources, setSources] = useState<DataSource[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("All sources");
  const [query, setQuery] = useState("");

  useEffect(() => {
    async function loadSources() {
      const response = await fetch("/data/data_sources.json");

      if (!response.ok) {
        throw new Error("Could not load data_sources.json");
      }

      const data = (await response.json()) as DataSource[];
      setSources(data);
    }

    loadSources().catch((error) => {
      console.error(error);
      setSources([]);
    });
  }, []);

  const categories = useMemo(() => {
    const availableCategories = Array.from(
      new Set(sources.map((source) => source.category)),
    );

    const sortedCategories = availableCategories.sort((a, b) => {
      const aIndex = CATEGORY_ORDER.indexOf(a);
      const bIndex = CATEGORY_ORDER.indexOf(b);

      if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;

      return aIndex - bIndex;
    });

    return ["All sources", ...sortedCategories];
  }, [sources]);

  const filteredSources = useMemo(() => {
    const normalisedQuery = query.trim().toLowerCase();

    return sources.filter((source) => {
      const matchesCategory =
        selectedCategory === "All sources" ||
        source.category === selectedCategory;

      const searchableText = [
        source.name,
        source.category,
        source.description,
        source.used_for,
      ]
        .join(" ")
        .toLowerCase();

      const matchesQuery =
        normalisedQuery.length === 0 ||
        searchableText.includes(normalisedQuery);

      return matchesCategory && matchesQuery;
    });
  }, [sources, selectedCategory, query]);

  return (
    <div className="space-y-6 w-full max-w-none px-1 xl:px-2">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="space-y-3"
      >
        <h1 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight">
          Data Sources
        </h1>

        <p className="max-w-full text-muted-foreground text-lg md:text-xl leading-relaxed">
          Public datasets used to build and explain the Bristol deprivation estimation pipeline.
        </p>
      </motion.div>      

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => {
            const Icon = CATEGORY_ICONS[category] ?? FileText;
            const isSelected = selectedCategory === category;

            return (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                  isSelected
                    ? "border-cyan-400/50 bg-cyan-400/15 text-cyan-300"
                    : "border-border/50 bg-white/[0.025] text-muted-foreground hover:bg-white/[0.05] hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {category}
              </button>
            );
          })}
        </div>

        <label className="relative w-full xl:w-[320px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search sources..."
            className="w-full rounded-full border border-border/50 bg-background/70 py-2 pl-9 pr-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground hover:bg-background focus:border-cyan-400/50"
          />
        </label>
      </div>

      {filteredSources.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 2xl:grid-cols-3">
          {filteredSources.map((source, index) => (
            <motion.div
              key={source.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.035 }}
            >
              <SourceCard source={source} featured={index < 3} />
            </motion.div>
          ))}
        </div>
      ) : (
        <GlassCard className="p-8 text-center">
          <Database className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-lg font-semibold text-foreground">
            No sources found
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Try changing the category filter or search term.
          </p>
        </GlassCard>
      )}
      
    </div>
  );
}