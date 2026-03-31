from pathlib import Path
import math
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "public" / "data"
OUTPUT_PATH = DATA_DIR / "bristol_lsoa_timeseries_synthetic.json"

BRISTOL_LAD24CD = "E06000023"

INPUTS = [
    {"year": 2019, "filename": "IoD_synthetic_2019.csv", "date": "2019-07-01"},
    {"year": 2020, "filename": "IoD_synthetic_2020.csv", "date": "2020-07-01"},
    {"year": 2021, "filename": "IoD_synthetic_2021.csv", "date": "2021-07-01"},
    {"year": 2022, "filename": "IoD_synthetic_2022.csv", "date": "2022-07-01"},
    {"year": 2023, "filename": "IoD_synthetic_2023.csv", "date": "2023-07-01"},
    {"year": 2024, "filename": "IoD_synthetic_2024.csv", "date": "2024-07-01"},
]

LSOA_CODE_COL = "LSOA code (2021)"
LSOA_NAME_COL = "LSOA name (2021)"
LAD_CODE_COL = "Local Authority District code (2024)"
IMD_RANK_COL = "Index of Multiple Deprivation (IMD) Rank (where 1 is most deprived)"
IMD_DECILE_COL = "Index of Multiple Deprivation (IMD) Decile (where 1 is most deprived 10% of LSOAs)"


def clean_decile(value: float) -> int:
    """
    Synthetic file deciles are fractional. Convert to a clean 1-10 integer.
    """
    if pd.isna(value):
        return 0
    rounded = int(round(float(value)))
    return max(1, min(10, rounded))


def main() -> None:
    frames = []

    for spec in INPUTS:
        path = DATA_DIR / spec["filename"]
        if not path.exists():
          raise FileNotFoundError(f"Missing input file: {path}")

        df = pd.read_csv(path)

        required = {
            LSOA_CODE_COL,
            LSOA_NAME_COL,
            LAD_CODE_COL,
            IMD_RANK_COL,
            IMD_DECILE_COL,
        }
        missing = required - set(df.columns)
        if missing:
            raise ValueError(f"{path.name} is missing columns: {sorted(missing)}")

        bristol = df.loc[df[LAD_CODE_COL] == BRISTOL_LAD24CD, [
            LSOA_CODE_COL,
            LSOA_NAME_COL,
            IMD_RANK_COL,
            IMD_DECILE_COL,
        ]].copy()

        bristol["date"] = spec["date"]
        bristol["rank"] = bristol[IMD_RANK_COL].round().astype(int)
        bristol["decile"] = bristol[IMD_DECILE_COL].apply(clean_decile)

        frames.append(
            bristol[[
                LSOA_CODE_COL,
                LSOA_NAME_COL,
                "date",
                "rank",
                "decile",
            ]]
        )

    combined = pd.concat(frames, ignore_index=True)

    # Validate Bristol row counts year by year
    counts = combined.groupby("date")[LSOA_CODE_COL].nunique()
    if not (counts == 268).all():
        raise ValueError(
            "Expected 268 Bristol LSOAs per year, got:\n" + counts.to_string()
        )

    # Build frontend-ready structure
    grouped = []
    for (lsoa_code, lsoa_name), group in combined.groupby([LSOA_CODE_COL, LSOA_NAME_COL], sort=True):
        points = (
            group.sort_values("date")[["date", "rank", "decile"]]
            .to_dict(orient="records")
        )
        grouped.append({
            "code": lsoa_code,
            "label": lsoa_name,
            "points": points,
        })

    grouped = sorted(grouped, key=lambda x: x["label"])

    OUTPUT_PATH.write_text(
        pd.Series(grouped).to_json(orient="values", indent=2),
        encoding="utf-8",
    )

    print(f"Wrote {len(grouped)} Bristol LSOA series to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()