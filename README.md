# IoD Dashboard

This is an interactive React dashboard for exploring deprivation patterns in Bristol.

It uses publicly available data, Bristol LSOA boundaries, Bristol-relative model results, and ONS deprivation data.

The dashboard is a public-facing analytical prototype. It helps people inspect deprivation patterns through maps, rankings, time-series charts, area comparisons, and methodology notes.

## Current dashboard features

The dashboard currently includes:

### Overview

- Bristol LSOA map with a toggle between Bristol IoD and UK IoD
- local authority decile profile chart
- most and least deprived area rankings
- high-level summary cards

### Map Explorer

- two Bristol LSOA maps shown side by side
- left map showing Bristol-relative model results
- right map showing ONS data ranked within Bristol
- vertical legend
- toggle between decile and rank views
- rank legend hover, which highlights the matching LSOA rank on both maps

### Time Series

- LSOA and ward time-series views
- toggle between rank and score charts
- decile trend chart for the selected main area
- searchable LSOA and ward selector
- selected area summaries with sparklines that adapt to the chosen metric

### Area Comparison

- side-by-side comparison of selected areas

### Feature / Indicator Analysis

- views for exploring indicators and relationships between features

### Data Sources

- documentation for the datasets used in the project

## Current data model

The dashboard reads data files from:

```text
public/data/
```

The main current data files are:

```text
public/data/bristol_lsoa.geojson
public/data/bristol_lsoa_current.json
public/data/bristol_ward_current.json
public/data/bristol_lsoa_timeseries.json
public/data/bristol_ward_timeseries.json
public/data/bristol_lsoa21_ward20_lookup.json
```

Older files, such as `bristol_imd.json` or synthetic CSV exports, may still exist in the repository. Where possible, the current dashboard pages should use the consolidated JSON files listed above.

## Expected data formats

### `bristol_lsoa.geojson`

This file contains Bristol LSOA boundaries as a GeoJSON `FeatureCollection`.

Each feature should include at least one usable LSOA code field:

```json
{
  "properties": {
    "lsoa_code": "E01014601",
    "lsoa_name": "Bristol 001A"
  }
}
```

The dashboard can also handle older field names, such as `lsoa_code_11` and `lsoa_name_11`.

### `bristol_lsoa_current.json`

This file contains one row per Bristol LSOA.

It combines Bristol-relative model results with ONS reference values.

Expected format:

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

- Overview map
- Overview rankings
- Map Explorer maps
- map tooltips and legends

### `bristol_ward_current.json`

This file contains one row per Bristol ward.

It is used for ward-level summaries and rankings where needed.

Expected format:

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

This file contains one object per LSOA, with quarterly or annual data points.

Expected format:

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

This file contains one object per ward, with aggregated ward-level time-series data.

Expected format:

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

This file links LSOAs to wards.

Expected format:

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
- showing which ward an LSOA belongs to
- checking ward aggregations

## Current page behaviour

### Overview

The Overview page compares deprivation patterns across Bristol.

- **Bristol IoD** uses Bristol-relative model ranks and deciles.
- **UK IoD** uses ONS national ranks and deciles.
- The local authority profile shows the share of Bristol LSOAs in each decile.
- The rankings panel lists the most and least deprived LSOAs for the selected mode.

### Map Explorer

The Map Explorer shows two maps:

- left map: `bristol_rank` / `bristol_decile`
- right map: `ons_bristol_rank` / `ons_bristol_decile`

The page currently only shows these view options:

```text
Decile
Rank
```

Score has been removed from the Map Explorer UI on purpose. Score is still available in the data and is still used elsewhere, especially on the Time Series page.

### Time Series

The Time Series page supports:

- LSOA mode
- Ward mode
- rank chart view
- score chart view
- decile trend for the main selected area
- selected area summaries
- search
- saved selected-area state

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
/map           Map Explorer
/time-series   Time Series
/compare       Area Comparison
/feature       Feature Analysis
/sources       Data Sources
```

Check `src/App.tsx` if the route names change.

## Data flow

The dashboard is designed to use processed outputs from a separate data pipeline.

Recommended flow:

```text
raw public datasets
→ pipeline processing and modelling
→ dashboard-ready JSON / GeoJSON
→ public/data/
→ React dashboard fetches static files at runtime
```

The dashboard should not depend on Python scripts during deployment.

Any Python or CSV processing should happen before files are committed or copied into `public/data/`.

## Connecting pipeline outputs

The companion pipeline should generate the frontend-ready files listed in the data model section.

Recommended process:

1. run the pipeline outside the dashboard build step
2. export JSON / GeoJSON files using the agreed formats
3. place those files in `public/data/`
4. run the dashboard locally and check each page
5. commit the generated dashboard-ready files when appropriate

This keeps the dashboard focused on presentation, while the pipeline handles data processing.

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

The app should not run Python data-generation scripts during the Vercel build.

The required data should already be available in `public/data/` before deployment.

## Development notes

### Static data and source data

Keep raw source files and large intermediate files out of the frontend app where possible.

Recommended separation:

```text
raw source files                  → pipeline repository or data/raw/
processed analytical outputs       → pipeline repository
frontend-ready JSON / GeoJSON      → public/data/
```

### `public/data/`

Files in `public/data/` can be fetched directly by the browser.

This is why the dashboard uses static JSON and GeoJSON files for maps, rankings, and time-series charts.

### Config files

The project currently keeps both:

```text
vite.config.ts
vitest.config.ts
```

They do different jobs and should stay separate unless the test setup is deliberately changed.

## Testing and quality

The repository includes:

- **ESLint** for linting
- **Vitest** for unit and integration tests

## Current status

The dashboard is moving from a styled prototype into a data-connected analytical app.

Current known state:

- Overview, Map Explorer, and Time Series are connected to consolidated Bristol JSON files.
- Map Explorer no longer includes Score mode.
- Time Series still supports both Rank and Score views.
- Some copy, explanatory text, and lower-priority pages may still need review.
- Some older data files may remain in `public/data/` until the data contract is fully stable.

## Contributing

When making changes:

1. create a branch from `main`
2. make focused changes
3. test locally with `npm run dev`
4. run `npm run build`
5. run lint and tests where relevant
6. open a pull request

Use clear branch names, for example:

```bash
git checkout -b feature/map-explorer-rank-legend
git checkout -b fix/overview-responsive-layout
git checkout -b docs/update-readme
```

## License

This is an open source prototype.