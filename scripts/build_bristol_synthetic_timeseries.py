from pathlib import Path
import math
import json
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
UK_IMD_RANK_COL = "Index of Multiple Deprivation (IMD) Rank (where 1 is most deprived)"


def bristol_decile_from_rank(rank: int, total: int) -> int:
    """
    Convert Bristol-relative rank into a Bristol-relative decile.
    1 = most deprived, 10 = least deprived.
    """
    if total <= 0:
        return 0
    return min(10, max(1, math.ceil(rank * 10 / total)))


def build_year_frame(path: Path, date_label: str) -> pd.DataFrame:
    """
    Read one yearly synthetic CSV, filter to Bristol only,
    and compute Bristol-relative rank and decile.
    """
    if not path.exists():
        raise FileNotFoundError(f"Missing input file: {path}")

    df = pd.read_csv(path)

    required = {
        LSOA_CODE_COL,
        LSOA_NAME_COL,
        LAD_CODE_COL,
        UK_IMD_RANK_COL,
    }
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"{path.name} is missing columns: {sorted(missing)}")

    # Keep Bristol rows only.
    bristol = df.loc[df[LAD_CODE_COL] == BRISTOL_LAD24CD, [
        LSOA_CODE_COL,
        LSOA_NAME_COL,
        UK_IMD_RANK_COL,
    ]].copy()

    # Clean and sort by UK-wide deprivation rank so we can derive Bristol-relative order.
    bristol["uk_rank"] = pd.to_numeric(bristol[UK_IMD_RANK_COL], errors="coerce")
    bristol = bristol.dropna(subset=["uk_rank"]).copy()
    bristol["uk_rank"] = bristol["uk_rank"].round().astype(int)

    bristol = bristol.sort_values(
        by=["uk_rank", LSOA_NAME_COL, LSOA_CODE_COL],
        ascending=[True, True, True],
        kind="stable",
    ).reset_index(drop=True)

    total = len(bristol)
    if total != 268:
        raise ValueError(f"Expected 268 Bristol LSOAs in {path.name}, got {total}")

    # Bristol-relative rank: 1..268, where 1 is most deprived in Bristol.
    bristol["rank"] = range(1, total + 1)

    # Bristol-relative decile from Bristol rank.
    bristol["decile"] = bristol["rank"].apply(lambda r: bristol_decile_from_rank(r, total))

    # Add release date used by the frontend chart.
    bristol["date"] = date_label

    return bristol[[
        LSOA_CODE_COL,
        LSOA_NAME_COL,
        "date",
        "rank",
        "decile",
    ]].copy()


def main() -> None:
    yearly_frames = []

    for spec in INPUTS:
        path = DATA_DIR / spec["filename"]
        frame = build_year_frame(path, spec["date"])
        yearly_frames.append(frame)

    combined = pd.concat(yearly_frames, ignore_index=True)

    # Build frontend-ready structure grouped by LSOA.
    grouped = []
    for (lsoa_code, lsoa_name), group in combined.groupby(
        [LSOA_CODE_COL, LSOA_NAME_COL],
        sort=True,
    ):
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
        json.dumps(grouped, indent=2),
        encoding="utf-8",
    )

    print(f"Wrote {len(grouped)} Bristol LSOA series to {OUTPUT_PATH}")
    
if __name__ == "__main__":
    main()