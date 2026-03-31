// ── Area Summary ──
export interface AreaSummary {
  area_id: string;
  area_name: string;
  geography_type: "LSOA" | "MSOA" | "Local Authority" | "Region";
  region: string;
  nation: string;
  deprivation_score: number;
  deprivation_decile: number;
  deprivation_rank: number;
  last_updated: string;
  urban_rural: "Urban" | "Rural";
}

export interface IndicatorValue {
  area_id: string;
  indicator_name: string;
  indicator_category: string;
  value: number;
  normalized_value: number;
  time_period: string;
  source_name: string;
}

export interface AreaTimeseries {
  area_id: string;
  date: string;
  deprivation_score: number;
}

export interface SourceMetadata {
  source_name: string;
  category: string;
  public_availability: boolean;
  update_frequency: string;
  description: string;
  status: "active" | "pending" | "deprecated";
  coverage: string;
  link: string;
}

const regions = ["London", "South East", "North West", "West Midlands", "Yorkshire and the Humber", "East Midlands", "South West", "North East", "East of England"];
const laNames = [
  "Tower Hamlets", "Hackney", "Newham", "Barking and Dagenham", "Knowsley",
  "Liverpool", "Manchester", "Birmingham", "Middlesbrough", "Blackpool",
  "Kingston upon Thames", "Richmond upon Thames", "Wokingham", "Hart",
  "Surrey Heath", "South Cambridgeshire", "Waverley", "Elmbridge",
  "Chiltern", "Mole Valley", "Burnley", "Hastings", "Thanet",
  "Bradford", "Sandwell", "Wolverhampton", "Nottingham", "Leicester",
  "Bristol", "Sheffield"
];

export const areaSummaries: AreaSummary[] = laNames.map((name, i) => ({
  area_id: `LA${String(i + 1).padStart(3, "0")}`,
  area_name: name,
  geography_type: "Local Authority" as const,
  region: regions[i % regions.length],
  nation: "England",
  deprivation_score: Math.round((Math.random() * 60 + 20) * 100) / 100,
  deprivation_decile: Math.ceil(Math.random() * 10),
  deprivation_rank: i + 1,
  last_updated: "2026-03-14",
  urban_rural: i % 4 === 0 ? "Rural" as const : "Urban" as const,
}));

// Sort by deprivation score descending
areaSummaries.sort((a, b) => b.deprivation_score - a.deprivation_score);
areaSummaries.forEach((a, i) => { a.deprivation_rank = i + 1; });

export const indicatorCategories = [
  "Income", "Employment", "Education", "Health",
  "Housing", "Access to Services", "Crime", "Environment"
];

export const indicatorNames: Record<string, string[]> = {
  "Income": ["Universal Credit Claims", "Child Poverty Rate", "Pension Credit Uptake"],
  "Employment": ["JSA Claimant Rate", "Economic Inactivity Rate", "Long-term Unemployment"],
  "Education": ["KS4 Attainment Gap", "Adult Skills Deprivation", "School Absence Rate"],
  "Health": ["Emergency Hospital Admissions", "Life Expectancy Gap", "Mental Health Prevalence"],
  "Housing": ["Overcrowding Rate", "Homelessness Applications", "Fuel Poverty %"],
  "Access to Services": ["Broadband Speed Score", "GP Distance Score", "Public Transport Access"],
  "Crime": ["Recorded Crime Rate", "Anti-social Behaviour Rate", "Domestic Abuse Rate"],
  "Environment": ["Air Quality Index", "Green Space Access", "Flood Risk Score"],
};

export const allIndicators = Object.entries(indicatorNames).flatMap(([cat, names]) =>
  names.map(name => ({ name, category: cat }))
);

export const indicatorValues: IndicatorValue[] = areaSummaries.flatMap(area =>
  allIndicators.map(ind => ({
    area_id: area.area_id,
    indicator_name: ind.name,
    indicator_category: ind.category,
    value: Math.round(Math.random() * 100 * 100) / 100,
    normalized_value: Math.round(Math.random() * 100) / 100,
    time_period: "2025-Q4",
    source_name: `${ind.category} Data Source`,
  }))
);

const months = ["2025-06", "2025-07", "2025-08", "2025-09", "2025-10", "2025-11", "2025-12", "2026-01", "2026-02", "2026-03"];

export const areaTimeseries: AreaTimeseries[] = areaSummaries.flatMap(area =>
  months.map((date, i) => ({
    area_id: area.area_id,
    date,
    deprivation_score: Math.round((area.deprivation_score + (Math.random() - 0.5) * 8 + (i - 5) * 0.3) * 100) / 100,
  }))
);

export const sourceMetadata: SourceMetadata[] = [
  { source_name: "DWP Stat-Xplore", category: "Income", public_availability: true, update_frequency: "Monthly", description: "Universal Credit and Benefit Claimant Data from DWP", status: "active", coverage: "England & Wales", link: "https://stat-xplore.dwp.gov.uk/webapi/jsf/dataCatalogueExplorer.xhtml" },
  { source_name: "Police.UK Open Data", category: "Crime", public_availability: true, update_frequency: "Monthly", description: "Street Level Crime and Anti-Social Behaviour", status: "active", coverage: "England & Wales", link: "https://data.police.uk/data/statistical-data/" },
  { source_name: "Open Street Map", category: "Education", public_availability: true, update_frequency: "Annual", description: "School performance, absence rates, and attainment data", status: "active", coverage: "England", link: "https://wiki.openstreetmap.org/wiki/Overpass_API" },
  { source_name: "Land Registry", category: "Housing", public_availability: true, update_frequency: "Decennial", description: "Overcrowding, tenure, and household composition data", status: "active", coverage: "England & Wales", link: "https://landregistry.data.gov.uk/" },
  { source_name: "Gov.UK Connectivity", category: "Access to Services", public_availability: true, update_frequency: "Annual", description: "Broadband coverage and speed data by area", status: "active", coverage: "UK-wide", link: "https://assets.publishing.service.gov.uk/media/68c966fc07d9e92bc5517b80/connectivity_metrics_2025.ods" },
  { source_name: "West of England Open Data Population Look-Up", category: "Social", public_availability: true, update_frequency: "Annual", description: "Population by Age Band and LSOA", status: "active", coverage: "England", link: "https://opendata.westofengland-ca.gov.uk/explore/assets/population-by-age-band-and-lsoa/" },
  { source_name: "Arcgis LSOA Look-Up", category: "Geography", public_availability: true, update_frequency: "Quarterly", description: "Boundary data and geographic lookups for LSOA/MSOA/LA", status: "active", coverage: "UK-wide", link: "https://hub.arcgis.com/api/v3/datasets/cbfe64cc03d74af982c1afec639bafd1_0/downloads/data?format=csv&spatialRefId=4326&where=1%3D1" },
];

// Correlation matrix mock (8x8 for indicator categories)
export const correlationMatrix = indicatorCategories.map((cat1, i) =>
  indicatorCategories.map((cat2, j) => {
    if (i === j) return 1;
    const base = 0.3 + Math.random() * 0.5;
    return Math.round(base * 100) / 100;
  })
);

// Pipeline steps
export const pipelineSteps = [
  { id: 1, title: "Fetch Data", description: "Automated retrieval from 10+ public APIs and datasets", icon: "download", color: "cyan" },
  { id: 2, title: "Clean & Standardize", description: "Handle missing values, normalize formats, validate schemas", icon: "filter", color: "cyan" },
  { id: 3, title: "Geographic Joins", description: "Link data to LSOA/MSOA/LA boundaries via lookup tables", icon: "map-pin", color: "violet" },
  { id: 4, title: "Combine Indicators", description: "Merge indicators across domains into unified area profiles", icon: "layers", color: "violet" },
  { id: 5, title: "Compute Scores", description: "Calculate composite deprivation scores using weighted aggregation", icon: "calculator", color: "magenta" },
  { id: 6, title: "Output Dataset", description: "Export dashboard-ready JSON/CSV with versioned metadata", icon: "database", color: "magenta" },
];

// Distribution data for ridgeline
export const deprivationDistribution = Array.from({ length: 50 }, (_, i) => ({
  score: i * 2,
  count: Math.round(Math.exp(-Math.pow((i * 2 - 50) / 20, 2) / 2) * 100 + Math.random() * 15),
  countUrban: Math.round(Math.exp(-Math.pow((i * 2 - 55) / 18, 2) / 2) * 80 + Math.random() * 10),
  countRural: Math.round(Math.exp(-Math.pow((i * 2 - 40) / 22, 2) / 2) * 60 + Math.random() * 10),
}));
