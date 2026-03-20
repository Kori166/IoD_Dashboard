import pandas as pd
import json
import ast
from pathlib import Path

ROOT = Path(".")
geo_path = ROOT / "data" / "raw" / "geography_lookup.csv"
lookup_path = ROOT / "data" / "raw" / "lsoa_2011_2021_lookup.csv"
imd_path = ROOT / "data" / "raw" / "IoD2025_Ranks_Scores_Deciles.csv"

geojson_out_path = ROOT / "public" / "data" / "bristol_lsoa.geojson"
imd_out_path = ROOT / "public" / "data" / "bristol_imd.json"

geo = pd.read_csv(geo_path)
lookup = pd.read_csv(lookup_path)
imd = pd.read_csv(imd_path)

# Filter to Bristol only
imd_bristol = imd[
    imd["Local Authority District code (2024)"] == "E06000023"
].copy()

# Keep fields you need
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
        "Index of Multiple Deprivation (IMD) Rank (where 1 is most deprived)": "uk_rank",
        "Index of Multiple Deprivation (IMD) Decile (where 1 is most deprived 10% of LSOAs)": "uk_decile",
    }
)

# Bristol-only rank and decile
imd_bristol = imd_bristol.sort_values("uk_rank", ascending=True).reset_index(drop=True)
imd_bristol["bristol_rank"] = imd_bristol.index + 1

# 10 roughly equal Bristol deciles
imd_bristol["bristol_decile"] = pd.qcut(
    imd_bristol["bristol_rank"],
    10,
    labels=False,
    duplicates="drop"
) + 1

# Geometry join
merged_geo = geo.merge(
    lookup,
    left_on="lsoa_code",
    right_on="lsoa_code_21",
    how="left"
)

# Output 1: geometry
features = []
for _, row in merged_geo.iterrows():
    geometry = ast.literal_eval(row["geo_shape"])

    feature = {
        "type": "Feature",
        "geometry": geometry,
        "properties": {
            "lsoa_code": row["lsoa_code_21"] if pd.notna(row["lsoa_code_21"]) else row["lsoa_code"],
            "lsoa_name": row["lsoa_name_21"] if pd.notna(row["lsoa_name_21"]) else None,
            "lsoa_code_11": row["lsoa_code_11"] if pd.notna(row["lsoa_code_11"]) else None,
            "lsoa_name_11": row["lsoa_name_11"] if pd.notna(row["lsoa_name_11"]) else None,
            "longitude": float(row["longitude"]) if pd.notna(row["longitude"]) else None,
            "latitude": float(row["latitude"]) if pd.notna(row["latitude"]) else None,
        },
    }
    features.append(feature)

geojson = {
    "type": "FeatureCollection",
    "features": features,
}

# Output 2: Bristol IMD attributes with BOTH rank systems
imd_json = imd_bristol[
    [
        "lsoa_code_21",
        "lsoa_name_21",
        "imd_score",
        "uk_rank",
        "uk_decile",
        "bristol_rank",
        "bristol_decile",
    ]
].rename(
    columns={
        "lsoa_code_21": "lsoa_code",
        "lsoa_name_21": "lsoa_name",
    }
).to_dict(orient="records")

geojson_out_path.parent.mkdir(parents=True, exist_ok=True)

with open(geojson_out_path, "w", encoding="utf-8") as f:
    json.dump(geojson, f)

with open(imd_out_path, "w", encoding="utf-8") as f:
    json.dump(imd_json, f)

print(f"Wrote {len(features)} features to {geojson_out_path}")
print(f"Wrote {len(imd_json)} IMD rows to {imd_out_path}")