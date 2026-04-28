# IoD Dashboard

An interactive React dashboard for exploring and communicating **Index of Deprivation-style analysis for Bristol** using publicly available data, Bristol LSOA geography, Bristol-relative model outputs, and ONS deprivation reference data.

The dashboard is designed as a public-facing analytical prototype. It focuses on making deprivation patterns easier to inspect through maps, rankings, time-series views, area comparisons, and methodology notes.

## Current dashboard features

The dashboard currently includes:

- **Overview** page
  - Bristol LSOA choropleth with a Bristol IoD / UK IoD toggle
  - local authority decile profile chart
  - most and least deprived area rankings
  - high-level dashboard summary cards

- **Map Explorer** page
  - side-by-side Bristol LSOA maps
  - left map: Bristol-relative model outputs
  - right map: ONS data ranked within Bristol
  - shared vertical legend
  - toggle between **decile** and **rank** views
  - rank legend hover highlights the matching LSOA rank on both maps

- **Time Series** page
  - LSOA and ward time-series views
  - rank and score chart toggle
  - decile trend chart for the primary selected area
  - searchable LSOA and ward selection
  - selected area summaries with metric-aware sparklines

- **Area Comparison** page
  - side-by-side comparison of selected areas

- **Feature / Indicator Analysis** page
  - dashboard views for understanding indicators and feature relationships

- **Pipeline & Methodology** page
  - explanation of the analytical process and dashboard methodology

- **Data Sources** page
  - documentation of the datasets used by the project

## Current data model

The dashboard now reads frontend-ready files from:

```text
public/data/
```

The key current data files are:

```text
public/data/bristol_lsoa.geojson
public/data/bristol_lsoa_current.json
public/data/bristol_ward_current.json
public/data/bristol_lsoa_timeseries.json
public/data/bristol_ward_timeseries.json
public/data/bristol_lsoa21_ward20_lookup.json
```

Older files such as `bristol_imd.json` or synthetic CSV exports may still exist in the repository, but the current dashboard pages should use the consolidated JSON files above where possible.

## Expected data contracts

### `bristol_lsoa.geojson`

GeoJSON `FeatureCollection` containing Bristol LSOA boundaries. Each feature should include at least one usable LSOA code field:

```json
{
  "properties": {
    "lsoa_code": "E01014601",
    "lsoa_name": "Bristol 001A"
  }
}
```

The dashboard can also handle older code/name property variants such as `lsoa_code_11` and `lsoa_name_11`.

### `bristol_lsoa_current.json`

One row per Bristol LSOA, combining Bristol-relative model outputs and ONS reference values.

Expected shape:

```json
{
  "code": "E01014601",
  "label": "Bristol 001A",
  "ward_name": "Henbury and Brentry",
  "bristol_rank": 160,
  "bristol_decile": 6,
  "bristol_score": 22.56,
  "ons_bristol_rank": 94,
  "ons_bristol_decile": 4,
  "ons_national_rank": 12345,
  "ons_national_decile": 4,
  "ons_score": 21.34
}
```

Used by:

- Overview choropleth
- Overview rankings
- Map Explorer left and right maps
- map tooltips and legends

### `bristol_ward_current.json`

One row per Bristol ward, used for ward-level summaries and rankings where needed.

Expected shape:

```json
{
  "code": "E05010899",
  "label": "Frome Vale",
  "bristol_rank": 11,
  "bristol_decile": 4,
  "bristol_score": 23.06,
  "ons_bristol_rank": 19,
  "ons_bristol_decile": 6,
  "ons_score": 22.41
}
```

### `bristol_lsoa_timeseries.json`

One object per LSOA with quarterly or annual points.

Expected shape:

```json
{
  "code": "E01014601",
  "label": "Bristol 001A",
  "points": [
    {
      "date": "2025-07-01",
      "rank": 160,
      "decile": 6,
      "score": 22.56
    }
  ]
}
```

Used by the Time Series page in LSOA mode.

### `bristol_ward_timeseries.json`

One object per ward with aggregated ward time-series points.

Expected shape:

```json
{
  "code": "E05010899",
  "label": "Frome Vale",
  "lsoas": [
    {
      "code": "E01014601",
      "label": "Bristol 001A"
    }
  ],
  "points": [
    {
      "date": "2025-07-01",
      "rank": 11,
      "decile": 4,
      "score": 23.06,
      "mean_lsoa_rank": 151.1,
      "mean_lsoa_decile": 6.1,
      "lsoa_count": 10,
      "score_min": 10.1,
      "score_median": 23.37,
      "score_max": 42.31
    }
  ]
}
```

Used by the Time Series page in Ward mode.

### `bristol_lsoa21_ward20_lookup.json`

Lookup table joining LSOAs to wards.

Expected shape:

```json
{
  "lsoa_code": "E01014601",
  "lsoa_name": "Bristol 001A",
  "ward_code": "E05010890",
  "ward_name": "Henbury and Brentry"
}
```

Used for:

- Time Series search labels
- LSOA-to-ward display text
- ward aggregation checks

## Current page behaviour

### Overview

The Overview page compares deprivation patterns across Bristol.

- **Bristol IoD** uses Bristol-relative model rank and decile fields.
- **UK IoD** uses ONS national rank and decile fields.
- The local authority profile shows the share of Bristol LSOAs in each decile.
- The ranking panel lists the most and least deprived LSOAs under the selected ranking mode.

### Map Explorer

The Map Explorer uses two maps:

- left map: `bristol_rank` / `bristol_decile`
- right map: `ons_bristol_rank` / `ons_bristol_decile`

The page currently exposes only:

```text
Decile
Rank
```

Score has intentionally been removed from the Map Explorer UI. Score remains available in the underlying data and is still used elsewhere, especially Time Series.

### Time Series

The Time Series page supports:

- LSOA mode
- Ward mode
- Rank chart view
- Score chart view
- decile trend for the primary selected area
- selected area summaries
- search and persistent selected-area state

Time-series data is loaded from:

```text
/data/bristol_lsoa_timeseries.json
/data/bristol_ward_timeseries.json
/data/bristol_lsoa21_ward20_lookup.json
```

## Tech stack

This project uses:

- **Vite**
- **React**
- **TypeScript**
- **React Router**
- **Tailwind CSS**
- **Recharts**
- **React Leaflet / Leaflet**
- **Framer Motion**
- **Lucide React**
- **Vitest**
- **Playwright**

## Repository structure

```text
IoD_Dashboard/
├── public/
│   ├── data/                     # dashboard-ready JSON / GeoJSON data files
│   └── favicon-dep.ico
├── src/
│   ├── components/               # reusable UI, chart, layout, and map components
│   ├── config/                   # dashboard configuration
│   ├── context/                  # shared app context, including active LAD state
│   ├── data/                     # local app data where still needed
│   ├── hooks/                    # custom React hooks
│   ├── lib/                      # utilities
│   ├── pages/                    # route-level pages
│   ├── test/                     # test setup files
│   ├── App.tsx                   # app shell and routing
│   ├── main.tsx                  # app entry point
│   └── index.css                 # global styling
├── scripts/                      # optional local data build scripts, if retained
├── README.md
├── package.json
├── vite.config.ts
└── vitest.config.ts
```

## App routes

The main dashboard routes are:

```text
/              Overview
/map          Map Explorer
/time-series  Time Series
/compare      Area Comparison
/indicators   Feature / Indicator Analysis
/pipeline     Pipeline & Methodology
/sources      Data Sources
```

The exact route names should be checked against `src/App.tsx` if routing changes.

## Data flow

The dashboard is intended to consume processed outputs from the companion data pipeline. The recommended workflow is:

```text
raw public datasets
→ pipeline processing and modelling
→ dashboard-ready JSON / GeoJSON
→ public/data/
→ React dashboard fetches static files at runtime
```

The dashboard should not rely on Python scripts during deployment. Any Python or CSV processing should happen before files are committed or copied into `public/data/`.

## Connecting pipeline outputs

The companion pipeline should generate the frontend-ready files listed in the data model section.

Recommended approach:

1. run the pipeline outside the dashboard build step
2. export JSON / GeoJSON files using the agreed schemas
3. place those files in `public/data/`
4. run the dashboard locally and check each page
5. commit the generated dashboard-ready files when appropriate

This keeps the dashboard focused on presentation while the pipeline remains responsible for data production.

## Getting started

### 1. Install dependencies

Using npm:

```bash
npm install
```

### 2. Start the development server

```bash
npm run dev
```

The local Vite server usually runs at:

```text
http://localhost:8080/
```

or another port shown in the terminal.

### 3. Build for production

```bash
npm run build
```

### 4. Preview the production build

```bash
npm run preview
```

## Available scripts

Common scripts from `package.json`:

```bash
npm run dev
npm run build
npm run build:dev
npm run lint
npm run preview
npm run test
npm run test:watch
```

## Deployment

The dashboard is currently suitable for static deployment on Vercel.

Recommended Vercel settings:

```text
Framework preset: Vite
Build command: npm run build
Output directory: dist
Install command: npm install
```

The app should not run Python data-generation scripts as part of the Vercel build. Data should already exist in `public/data/` before deployment.

## Development notes

### Static data vs source data

Keep raw source files and large intermediate processing files out of the frontend app where possible.

Recommended separation:

```text
raw source files                  → pipeline repository or data/raw/
processed analytical outputs       → pipeline repository
frontend-ready JSON / GeoJSON      → public/data/
```

### `public/data/`

Files in `public/data/` can be fetched directly by the browser. This is why the dashboard uses static JSON and GeoJSON files for maps, rankings, and time-series charts.

### Config files

The project currently keeps both:

```text
vite.config.ts
vitest.config.ts
```

They serve different purposes and should remain separate unless the test setup is deliberately redesigned.

## Testing and quality

The repository includes:

- **ESLint** for linting
- **Vitest** for unit/integration tests
- **Playwright** configuration for end-to-end testing support

Generated test output such as `test-results/.last-run.json` and `playwright-report/` should not be committed unless there is a specific reason.

## Current status

The dashboard is actively evolving from a styled prototype into a data-connected analytical app.

Current known state:

- Overview, Map Explorer, and Time Series are now connected to consolidated Bristol JSON files.
- Map Explorer no longer exposes Score mode.
- Time Series still supports both Rank and Score views.
- Some copy, explanatory text, and lower-priority pages may still need final review.
- Some older data files may remain in `public/data/` until the data contract is fully stabilised.

## Next priorities

Suggested next development steps:

- complete responsive layout polish across Overview and Map Explorer
- remove stale synthetic data files once replacements are verified
- standardise all page fetch paths against the consolidated data contract
- add schema validation for dashboard-ready JSON files
- document the pipeline export process in the pipeline repository
- add screenshots to this README
- add a short public interpretation note explaining model limitations

## Contributing

When making changes:

1. create a branch from `main`
2. make focused changes
3. test locally with `npm run dev`
4. run `npm run build`
5. run lint/tests where relevant
6. open a pull request

Use clear branch names, for example:

```bash
git checkout -b feature/map-explorer-rank-legend
git checkout -b fix/overview-responsive-layout
git checkout -b docs/update-readme
```

## License

License information has not yet been finalised.
