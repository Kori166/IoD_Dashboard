# IoD Dashboard

An interactive dashboard for exploring and communicating **Index of Deprivation-style analysis for Bristol**, using publicly available data and LSOA-level geography.

The app is designed to present deprivation patterns, rankings, and indicator analysis in a clear visual interface, with an emphasis on choropleth mapping and transparent, reproducible data inputs.

## What this dashboard does

The dashboard currently includes:

- an **Overview** page with high-level metrics and a Bristol deprivation choropleth
- a **Map Explorer** for interactive spatial exploration
- an **Indicator Analysis** page for exploring feature importance and relationships
- an **Area Comparison** page for comparing selected areas side by side
- a **Pipeline & Methodology** page explaining the analytical process
- a **Data Sources** page documenting the underlying datasets

## Tech stack

This project uses:

- **Vite**
- **React**
- **TypeScript**
- **React Router**
- **Tailwind CSS**
- **Recharts**
- **Framer Motion**

The project scripts currently support development, build, preview, linting, and tests.

## Repository structure

```text
IoD_Dashboard/
├── public/
│   └── data/                     # frontend-ready JSON / GeoJSON data files
├── src/
│   ├── components/               # reusable UI and layout components
│   ├── data/                     # mock or local in-app data
│   ├── hooks/                    # custom React hooks
│   ├── lib/                      # utilities
│   ├── pages/                    # route-level pages
│   ├── App.tsx                   # app shell and routing
│   ├── main.tsx                  # app entry point
│   └── index.css                 # global styling
├── README.md
└── package.json

## App routes

The dashboard currently defines these routes:

- / → Overview
- /map → Map Explorer
- /indicators → Indicator Analysis
- /compare → Area Comparison
- /pipeline → Pipeline & Methodology
- /sources → Data Sources

## Data flow

The dashboard is designed to consume frontend-ready static data files from:

public/data/

For the Bristol choropleth, the app expects files such as:

public/data/bristol_lsoa.geojson
public/data/bristol_imd.json

These files are fetched in the frontend and joined by lsoa_code.

## Expected map data contract
bristol_lsoa.geojson

A valid GeoJSON FeatureCollection containing Bristol LSOA geometries with at least:

- properties.lsoa_code
- optional properties.lsoa_name
- bristol_imd.json

A JSON array with one row per Bristol LSOA, for example:

[
  {
    "lsoa_code": "E01014686",
    "lsoa_name": "Bristol 017C",
    "uk_rank": 32903,
    "uk_decile": 10,
    "bristol_rank": 281,
    "bristol_decile": 10
  }
]

These files are used to support:

- Bristol-relative ranking and deciles
- UK-relative ranking and deciles
- choropleth colouring by active decile mode
- tooltip and ranking display

## Connecting pipeline outputs

This dashboard is intended to consume processed outputs from the companion pipeline repository:

bristol-fused-indicators/imd_dataset_pipeline

The recommended integration pattern is:

run the pipeline
export dashboard-ready files
write them into:
public/data/

This keeps the dashboard focused on presentation while the pipeline remains responsible for data production.

## Getting started
### 1. Install dependencies

    Using npm via a terminal or Gitbash:

    npm install

If you are using Bun:

    bun install

### 2. Start the development server
    npm run dev

This starts the Vite development server, usually at:

http://localhost:5173
3. Build for production
npm run build
4. Preview the production build
npm run preview
Available scripts

Common scripts from package.json:

npm run dev
npm run build
npm run build:dev
npm run lint
npm run preview
npm run test
npm run test:watch
Development notes
Static data vs source data

Keep raw source CSVs out of the frontend app.

Recommended separation:

raw source files → pipeline repo or data/raw/
processed analytical outputs → pipeline repo
dashboard-ready JSON / GeoJSON → public/data/
Why public/data

Files in public/data/ can be fetched directly by the browser, which is ideal for map layers and derived JSON outputs.

## Map mode switching

The Bristol choropleth supports switching between:

Bristol view: colour and rank by Bristol-specific deciles
UK view: colour and rank by UK-wide deciles

## Current status

The dashboard is actively evolving from a styled prototype into a data-connected analytical app.

That means some parts may still contain:

- placeholder copy
- mock values
- static metric cards
- interim UI logic while the pipeline-to-dashboard contract is being finalized

## Testing and quality

The repository includes:

- ESLint for linting
- Vitest for unit/integration tests
- Playwright config for end-to-end testing support

## Next priorities

Suggested next development steps:

- replace any remaining mock ranking content with pipeline outputs
- standardize the dashboard data schema across all pages
- add automated syncing from the pipeline repository into public/data/
- improve responsive layout and use of widescreen space
- document deployment and refresh workflows

## Contributing

When making changes:

  1. create a branch from main
  2. make focused changes
  3. test locally with npm run dev
  4. run lint/tests where relevant
  5. open a pull request

Use clear branch names, for example:

git checkout -b feature/bristol-choropleth
git checkout -b fix/ranking-toggle
git checkout -b docs/update-readme

## License

A couple of tweaks you may want depending on how polished you want it:
- rename the repo in the title to `UK Deprivation Dashboard` if that is the public-facing product name
- add screenshots near the top, because humans do in fact like seeing the thing before reading about it
- add a short deployment section if you’re hosting it anywhere
