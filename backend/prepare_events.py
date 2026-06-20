import json
import os
from pathlib import Path

import pandas as pd


PROJECT_ROOT = Path(__file__).resolve().parent.parent
CSV_PATH = PROJECT_ROOT / "cleaned_astram_events.csv"
PUBLIC_DIR = PROJECT_ROOT / "public"
OUTPUT_PATH = PUBLIC_DIR / "events.json"

KEEP_COLUMNS = [
    "id",
    "latitude",
    "longitude",
    "event_cause",
    "event_type",
    "status",
    "zone",
    "corridor",
    "junction",
    "address",
    "start_datetime",
    "end_datetime",
    "is_severe",
]


def main() -> None:
    df = pd.read_csv(CSV_PATH)
    df["latitude"] = pd.to_numeric(df["latitude"], errors="coerce")
    df["longitude"] = pd.to_numeric(df["longitude"], errors="coerce")
    df = df.dropna(subset=["latitude", "longitude"])

    existing_columns = [column for column in KEEP_COLUMNS if column in df.columns]
    df = df.loc[:, existing_columns].copy()
    df = df.where(pd.notnull(df), None)

    if "id" in df.columns:
        df["id"] = df["id"].astype(str)

    records = df.to_dict(orient="records")

    os.makedirs(PUBLIC_DIR, exist_ok=True)
    with OUTPUT_PATH.open("w", encoding="utf-8") as file:
        json.dump(records, file, ensure_ascii=False, indent=2, default=str)

    unique_event_causes = sorted(
        {
            str(value)
            for value in df.get("event_cause", pd.Series(dtype=str)).dropna().unique()
        }
    )

    print(f"Number of events: {len(records)}")
    print("Unique event_cause values:")
    for cause in unique_event_causes:
        print(cause)


if __name__ == "__main__":
    main()
