import pandas as pd
import json
import ast
from pathlib import Path

ROOT = Path(".")
geo_path = ROOT / "data" / "raw" / "geography_lookup.csv"
lookup_path = ROOT / "data" / "raw" / "lsoa_2011_2021_lookup.csv"
imd_path = ROOT / "data" / "raw" / "IoD2025_Ranks_Scores_Deciles.csv"
out_path = ROOT / "public" / "data" / "bristol_imd_choropleth.geojson"

# Load files
geo = pd.read_csv(geo_path)
lookup = pd.read_csv(lookup_path)
imd = pd.read_csv(imd_path)

# Filter IMD to Bristol only
imd_bristol = imd[
    imd["Local Authority District code (2024)"] == "E06000023"
].copy()

# Keep only needed IMD columns
imd_bristol = imd_bristol[
    [
        "LSOA code (2021)",
        "LSOA name (2021)",
        "Index of Multiple Deprivation (IMD) Score",
        "Index of Multiple Deprivation (IMD) Rank (where 1 is most deprived)",
        "Index of Multiple Deprivation (IMD) Decile (where 1 is most deprived 10% of LSOAs)",
    ]
].rename(
    columns={
        "LSOA code (2021)": "lsoa_code_21",
        "LSOA name (2021)": "lsoa_name_21",
        "Index of Multiple Deprivation (IMD) Score": "imd_score",
        "Index of Multiple Deprivation (IMD) Rank (where 1 is most deprived)": "imd_rank",
        "Index of Multiple Deprivation (IMD) Decile (where 1 is most deprived 10% of LSOAs)": "imd_decile",
    }
)

# Join lookup to geometry
merged = geo.merge(
    lookup,
    left_on="lsoa_code",
    right_on="lsoa_code_21",
    how="left"
)

# Join IMD data with explicit suffixes
merged = merged.merge(
    imd_bristol,
    on="lsoa_code_21",
    how="left",
    suffixes=("_lookup", "_imd")
)

# Optional debug
print(merged.columns.tolist())

# Build GeoJSON features
features = []
for _, row in merged.iterrows():
    geometry = ast.literal_eval(row["geo_shape"])

    lsoa_name = None
    if pd.notna(row.get("lsoa_name_21_imd")):
        lsoa_name = row["lsoa_name_21_imd"]
    elif pd.notna(row.get("lsoa_name_21_lookup")):
        lsoa_name = row["lsoa_name_21_lookup"]

    feature = {
        "type": "Feature",
        "geometry": geometry,
        "properties": {
            "lsoa_code": row["lsoa_code_21"] if pd.notna(row["lsoa_code_21"]) else row["lsoa_code"],
            "lsoa_name": lsoa_name,
            "lsoa_code_11": row["lsoa_code_11"] if pd.notna(row["lsoa_code_11"]) else None,
            "lsoa_name_11": row["lsoa_name_11"] if pd.notna(row["lsoa_name_11"]) else None,
            "imd_score": float(row["imd_score"]) if pd.notna(row["imd_score"]) else None,
            "imd_rank": int(row["imd_rank"]) if pd.notna(row["imd_rank"]) else None,
            "imd_decile": int(row["imd_decile"]) if pd.notna(row["imd_decile"]) else None,
            "longitude": float(row["longitude"]) if pd.notna(row["longitude"]) else None,
            "latitude": float(row["latitude"]) if pd.notna(row["latitude"]) else None,
        },
    }
    features.append(feature)

geojson = {
    "type": "FeatureCollection",
    "features": features,
}

out_path.parent.mkdir(parents=True, exist_ok=True)
with open(out_path, "w", encoding="utf-8") as f:
    json.dump(geojson, f)

print(f"Wrote {len(features)} features to {out_path}")