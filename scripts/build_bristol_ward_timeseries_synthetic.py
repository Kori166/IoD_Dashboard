from pathlib import Path
import json
import math
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "public" / "data"

LSOA_TIMESERIES_PATH = DATA_DIR / "bristol_lsoa_timeseries_synthetic.json"
LSOA_WARD_LOOKUP_PATH = DATA_DIR / "bristol_lsoa21_ward20_lookup.json"
OUTPUT_PATH = DATA_DIR / "bristol_ward_timeseries_synthetic.json"


def bristol_decile_from_rank(rank: int, total: int) -> int:
    """
    Convert Bristol-relative rank into a Bristol-relative decile.
    1 = most deprived, 10 = least deprived.
    """
    if total <= 0:
        return 0
    return min(10, max(1, math.ceil(rank * 10 / total)))


def main() -> None:
    if not LSOA_TIMESERIES_PATH.exists():
        raise FileNotFoundError(
            f"Missing required LSOA synthetic time-series file: {LSOA_TIMESERIES_PATH}"
        )

    if not LSOA_WARD_LOOKUP_PATH.exists():
        raise FileNotFoundError(
            f"Missing required LSOA -> Ward lookup file: {LSOA_WARD_LOOKUP_PATH}"
        )

    lsoa_series = json.loads(LSOA_TIMESERIES_PATH.read_text(encoding="utf-8"))
    lsoa_lookup = json.loads(LSOA_WARD_LOOKUP_PATH.read_text(encoding="utf-8"))

    # Flatten LSOA time series into rows.
    series_rows = []
    for item in lsoa_series:
        lsoa_code = item["code"]
        lsoa_label = item["label"]
        for point in item["points"]:
            series_rows.append(
                {
                    "lsoa_code": lsoa_code,
                    "lsoa_label": lsoa_label,
                    "date": point["date"],
                    "lsoa_rank": point["rank"],
                    "lsoa_decile": point["decile"],
                }
            )

    series_df = pd.DataFrame(series_rows)
    lookup_df = pd.DataFrame(lsoa_lookup)

    required_lookup_cols = {"lsoa_code", "ward_code", "ward_name"}
    missing_lookup = required_lookup_cols - set(lookup_df.columns)
    if missing_lookup:
        raise ValueError(
            f"Lookup file is missing required columns: {sorted(missing_lookup)}"
        )

    merged = series_df.merge(
        lookup_df[["lsoa_code", "ward_code", "ward_name"]],
        on="lsoa_code",
        how="left",
        validate="many_to_one",
    )

    missing_ward = merged["ward_code"].isna().sum()
    if missing_ward:
        raise ValueError(
            f"{missing_ward} LSOA time-series rows could not be matched to a ward."
        )

    ward_year_frames = []

    # Build yearly ward values by aggregating the LSOAs in each ward.
    for date_value, group in merged.groupby("date", sort=True):
        ward_agg = (
            group.groupby(["ward_code", "ward_name"], as_index=False)
            .agg(
                mean_lsoa_rank=("lsoa_rank", "mean"),
                mean_lsoa_decile=("lsoa_decile", "mean"),
                lsoa_count=("lsoa_code", "nunique"),
            )
            .sort_values(
                by=["mean_lsoa_rank", "ward_name", "ward_code"],
                ascending=[True, True, True],
                kind="stable",
            )
            .reset_index(drop=True)
        )

        total_wards = len(ward_agg)
        ward_agg["rank"] = range(1, total_wards + 1)
        ward_agg["decile"] = ward_agg["rank"].apply(
            lambda r: bristol_decile_from_rank(r, total_wards)
        )
        ward_agg["date"] = date_value

        ward_year_frames.append(
            ward_agg[["ward_code", "ward_name", "date", "rank", "decile"]]
        )

    combined = pd.concat(ward_year_frames, ignore_index=True)

    grouped = []
    for (ward_code, ward_name), group in combined.groupby(
        ["ward_code", "ward_name"], sort=True
    ):
        points = (
            group.sort_values("date")[["date", "rank", "decile"]]
            .to_dict(orient="records")
        )

        grouped.append(
            {
                "code": ward_code,
                "label": ward_name,
                "points": points,
            }
        )

    grouped = sorted(grouped, key=lambda x: x["label"])

    OUTPUT_PATH.write_text(json.dumps(grouped, indent=2), encoding="utf-8")

    print(f"Wrote {len(grouped)} Ward series to {OUTPUT_PATH}")   


if __name__ == "__main__":
    main()