from pathlib import Path
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
INPUT_DIR = ROOT / "data" / "input"
OUTPUT_DIR = ROOT / "public" / "data"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

LSOA_LOOKUP_PATH = INPUT_DIR / "lsoa_2011_2021_lookup.csv"
WARD_LOOKUP_PATH = INPUT_DIR / "lsoa11_ward20_lookup.csv"

OUTPUT_JSON_PATH = OUTPUT_DIR / "bristol_lsoa21_ward20_lookup.json"
OUTPUT_CSV_PATH = OUTPUT_DIR / "bristol_lsoa21_ward20_lookup.csv"

BRISTOL_LAD20CD = "E06000023"


def main() -> None:
    lsoa = pd.read_csv(LSOA_LOOKUP_PATH)
    ward = pd.read_csv(WARD_LOOKUP_PATH)

    required_lsoa_cols = {"lsoa_code_11", "lsoa_name_11", "lsoa_code_21", "lsoa_name_21"}
    required_ward_cols = {"LSOA11CD", "LSOA11NM", "WD20CD", "WD20NM", "LAD20CD"}

    missing_lsoa = required_lsoa_cols - set(lsoa.columns)
    missing_ward = required_ward_cols - set(ward.columns)

    if missing_lsoa:
        raise ValueError(f"Missing columns in {LSOA_LOOKUP_PATH.name}: {sorted(missing_lsoa)}")
    if missing_ward:
        raise ValueError(f"Missing columns in {WARD_LOOKUP_PATH.name}: {sorted(missing_ward)}")

    ward_bristol = ward.loc[ward["LAD20CD"] == BRISTOL_LAD20CD].copy()

    merged = lsoa.merge(
        ward_bristol[["LSOA11CD", "WD20CD", "WD20NM"]],
        left_on="lsoa_code_11",
        right_on="LSOA11CD",
        how="left",
        validate="many_to_one",
    )

    output = (
        merged[["lsoa_code_21", "lsoa_name_21", "WD20CD", "WD20NM"]]
        .rename(
            columns={
                "lsoa_code_21": "lsoa_code",
                "lsoa_name_21": "lsoa_name",
                "WD20CD": "ward_code",
                "WD20NM": "ward_name",
            }
        )
        .drop_duplicates()
        .sort_values(["lsoa_code", "ward_code"], kind="stable")
        .reset_index(drop=True)
    )

    missing_matches = output["ward_code"].isna().sum()
    if missing_matches:
        missing_rows = output.loc[output["ward_code"].isna(), ["lsoa_code", "lsoa_name"]]
        raise ValueError(
            f"{missing_matches} LSOA21 rows did not match a Ward 2020 row.\n"
            f"{missing_rows.to_string(index=False)}"
        )

    ward_counts = output.groupby("lsoa_code")["ward_code"].nunique()
    conflicting = ward_counts[ward_counts > 1]
    if not conflicting.empty:
        raise ValueError(
            "Some LSOA21 codes map to multiple Ward20 codes. "
            "Review before using this as a single-ward card lookup.\n"
            + conflicting.to_string()
        )

    output.to_json(OUTPUT_JSON_PATH, orient="records", indent=2)

    print(f"Wrote {len(output)} rows")
    print(f"JSON: {OUTPUT_JSON_PATH}")
    print(f"CSV:  {OUTPUT_CSV_PATH}")


if __name__ == "__main__":
    main()