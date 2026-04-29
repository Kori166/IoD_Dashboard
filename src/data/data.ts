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

export const sourceMetadata: SourceMetadata[] = [
  { source_name: "DWP Stat-Xplore", category: "Income & Employment", public_availability: true, update_frequency: "Monthly", description: "Universal Credit and Benefit Claimant Data from DWP", status: "active", coverage: "England & Wales", link: "https://stat-xplore.dwp.gov.uk/webapi/jsf/dataCatalogueExplorer.xhtml" },
  { source_name: "Police.UK Open Data", category: "Crime", public_availability: true, update_frequency: "Monthly", description: "Street Level Crime and Anti-Social Behaviour", status: "active", coverage: "England & Wales", link: "https://data.police.uk/data/statistical-data/" },
  { source_name: "Open Street Map", category: "Geography & Access to Services", public_availability: true, update_frequency: "Real-Time", description: "Location Data for Amenities, Shops, Landuse, and Highways", status: "active", coverage: "UK-Wide", link: "https://wiki.openstreetmap.org/wiki/Overpass_API" },
  { source_name: "Land Registry", category: "Housing", public_availability: true, update_frequency: "Monthly", description: "House Property Prices & Transaction Dates", status: "active", coverage: "England & Wales", link: "https://landregistry.data.gov.uk/" },
  { source_name: "Gov.UK Connectivity", category: "Health & Living Environment", public_availability: true, update_frequency: "Annual", description: "Accessibility of Services such as GP Practices and Green Spaces", status: "active", coverage: "UK-wide", link: "https://assets.publishing.service.gov.uk/media/68c966fc07d9e92bc5517b80/connectivity_metrics_2025.ods" },
  { source_name: "West of England Open Data Population Look-Up", category: "Demographic", public_availability: true, update_frequency: "Decennial", description: "Population by Age Band and LSOA", status: "active", coverage: "West of England", link: "https://opendata.westofengland-ca.gov.uk/explore/assets/population-by-age-band-and-lsoa/" },
  { source_name: "Arcgis LSOA Look-Up", category: "Geography", public_availability: true, update_frequency: "Variable", description: "Boundary data and geographic lookups for LSOA/MSOA/LA", status: "active", coverage: "UK-wide", link: "https://hub.arcgis.com/api/v3/datasets/cbfe64cc03d74af982c1afec639bafd1_0/downloads/data?format=csv&spatialRefId=4326&where=1%3D1" },
  { source_name: "Indices of Deprivation", category: "Socioeconomic", public_availability: true, update_frequency: "5 years", description: "The Deprivation scores by LSOA published by the Government", status: "active", coverage: "UK-wide", link: "https://view.officeapps.live.com/op/view.aspx?src=https%3A%2F%2Fassets.publishing.service.gov.uk%2Fmedia%2F691dece32c6b98ecdbc500d5%2FFile_1_IoD2025_Index_of_Multiple_Deprivation.xlsx&wdOrigin=BROWSELINK" },
  { source_name: "Indices of Deprivation - Bristol", category: "Socioeconomic", public_availability: true, update_frequency: "5 years", description: "The Deprivation scores for Bristol LSOAs published by the Government", status: "active", coverage: "UK-wide", link: "https://view.officeapps.live.com/op/view.aspx?src=https%3A%2F%2Fassets.publishing.service.gov.uk%2Fmedia%2F691dece32c6b98ecdbc500d5%2FFile_1_IoD2025_Index_of_Multiple_Deprivation.xlsx&wdOrigin=BROWSELINK" },
];

// Pipeline steps
export const pipelineSteps = [
  { id: 1, title: "Fetch Data", description: "Automated retrieval from 10+ public APIs and datasets", icon: "download", color: "cyan" },
  { id: 2, title: "Clean & Standardize", description: "Handle missing values, normalize formats, validate schemas", icon: "filter", color: "cyan" },
  { id: 3, title: "Geographic Joins", description: "Link data to LSOA/MSOA/LA boundaries via lookup tables", icon: "map-pin", color: "violet" },
  { id: 4, title: "Combine Indicators", description: "Merge indicators across domains into unified area profiles", icon: "layers", color: "violet" },
  { id: 5, title: "Compute Scores", description: "Calculate composite deprivation scores using weighted aggregation", icon: "calculator", color: "magenta" },
  { id: 6, title: "Output Dataset", description: "Export dashboard-ready JSON/CSV with versioned metadata", icon: "database", color: "magenta" },
];