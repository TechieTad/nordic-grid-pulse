from __future__ import annotations

import json
import os
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pandas as pd
import requests
from dotenv import load_dotenv

from transform import export_records, transform_records

BASE_URL = "https://data.fingrid.fi/api/datasets/{dataset_id}/data"
PAGE_SIZE = 1000
SECONDS_BETWEEN_REQUESTS = 2.5  # Fingrid allows 1 request per 2 seconds
HOURS_TO_FETCH = 24

# Dashboard column -> Fingrid dataset ID. All four are 15-minute series.
DATASETS = {
    "consumption_mw": 124,
    "production_mw": 74,
    "wind_mw": 75,
    "solar_mw": 248,  # forecast, not a measurement
}

def format_time(value: datetime) -> str:
    return value.strftime("%Y-%m-%dT%H:%M:%SZ")

def fetch_dataset(
    dataset_id: int,
    start: datetime,
    end: datetime,
    api_key: str,
) -> pd.DataFrame:
    """Download one dataset, following pagination until the last page."""
    rows: list[dict] = []
    page = 1

    while True:
        response = requests.get(
            BASE_URL.format(dataset_id=dataset_id),
            headers={"x-api-key": api_key},
            params={
                "startTime": format_time(start),
                "endTime": format_time(end),
                "format": "json",
                "pageSize": PAGE_SIZE,
                "page": page,
            },
            timeout=30,
        )
        response.raise_for_status()
        payload = response.json()

        rows.extend(payload["data"])
        next_page = payload["pagination"]["nextPage"]

        if next_page is None:
            break

        page = next_page
        time.sleep(SECONDS_BETWEEN_REQUESTS)

    return pd.DataFrame(rows, columns=["startTime", "value"])

def combine_series(series: dict[str, pd.DataFrame]) -> pd.DataFrame:
    """Join the per-dataset frames into one row per timestamp."""
    combined: pd.DataFrame | None = None

    for column, frame in series.items():
        renamed = frame.rename(columns={"startTime": "timestamp", "value": column})

        if combined is None:
            combined = renamed
        else:
            combined = combined.merge(renamed, on="timestamp", how="inner")

    if combined is None:
        raise ValueError("No series were provided.")

    return combined

def main() -> None:
    load_dotenv()
    api_key = os.getenv("FINGRID_API_KEY")

    if not api_key:
        raise SystemExit("FINGRID_API_KEY is not set. Add it to pipeline/.env")

    pipeline_directory = Path(__file__).resolve().parent
    project_directory = pipeline_directory.parent
    raw_path = project_directory / "data" / "fingrid_latest.json"
    stats_path = project_directory / "data" / "fingrid_run_stats.json"
    output_path = project_directory / "web" / "src" / "data" / "energy.json"

    end = datetime.now(timezone.utc).replace(second=0, microsecond=0)
    start = end - timedelta(hours=HOURS_TO_FETCH)

    series: dict[str, pd.DataFrame] = {}

    for index, (column, dataset_id) in enumerate(DATASETS.items()):
        if index > 0:
            time.sleep(SECONDS_BETWEEN_REQUESTS)

        frame = fetch_dataset(dataset_id, start, end, api_key)
        print(f"Dataset {dataset_id} ({column}): {len(frame)} rows")
        series[column] = frame

    combined = combine_series(series)
    print(f"Rows present in all four datasets: {len(combined)}")

    raw_path.parent.mkdir(parents=True, exist_ok=True)
    with raw_path.open("w", encoding="utf-8") as file:
        json.dump(combined.to_dict(orient="records"), file, indent=2)

    transformed = transform_records(combined)
    export_records(transformed, output_path)

    # Real run statistics, handed to load_supabase.py so pipeline_runs
    # doesn't report a fake "0 dropped".
    join_dropped = max(0, max(len(frame) for frame in series.values()) - len(combined))
    fetched_count = len(combined) + join_dropped
    dropped_count = fetched_count - len(transformed)

    with stats_path.open("w", encoding="utf-8") as file:
        json.dump(
            {
                "fetched_count": fetched_count,
                "written_count": len(transformed),
                "dropped_count": dropped_count,
            },
            file,
            indent=2,
        )

    print(f"Processed {len(transformed)} records.")
    print(f"Fetched {fetched_count} timestamps, dropped {dropped_count}.")
    print(f"Dashboard data written to: {output_path}")

if __name__ == "__main__":
    main()
