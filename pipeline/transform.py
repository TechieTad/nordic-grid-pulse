from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

REQUIRED_COLUMNS = {
    "timestamp",
    "consumption_mw",
    "production_mw",
    "wind_mw",
    "solar_mw",
}

def load_records(input_path: Path) -> pd.DataFrame:
    """Read energy records from a JSON file."""
    with input_path.open("r", encoding="utf-8") as file:
        records = json.load(file)

    if not isinstance(records, list):
        raise ValueError("Input JSON must contain a list of records.")

    return pd.DataFrame(records)

def validate_records(frame: pd.DataFrame) -> None:
    """Reject missing columns, invalid timestamps, duplicates and negatives."""
    missing_columns = REQUIRED_COLUMNS.difference(frame.columns)

    if missing_columns:
        missing_text = ", ".join(sorted(missing_columns))
        raise ValueError(f"Missing required columns: {missing_text}")

    if frame.empty:
        raise ValueError("The input dataset is empty.")

    parsed_timestamps = pd.to_datetime(
        frame["timestamp"],
        utc=True,
        errors="coerce",
    )

    if parsed_timestamps.isna().any():
        raise ValueError("One or more timestamps are invalid.")

    if parsed_timestamps.duplicated().any():
        raise ValueError("Duplicate timestamps were found.")

    numeric_columns = [
        "consumption_mw",
        "production_mw",
        "wind_mw",
        "solar_mw",
    ]

    for column in numeric_columns:
        values = pd.to_numeric(frame[column], errors="coerce")

        if values.isna().any():
            raise ValueError(f"Column '{column}' contains invalid numbers.")

        if (values < 0).any():
            raise ValueError(f"Column '{column}' contains negative values.")

def transform_records(frame: pd.DataFrame) -> pd.DataFrame:
    """Clean records and calculate dashboard metrics."""
    validate_records(frame)

    transformed = frame.copy()

    transformed["timestamp"] = pd.to_datetime(
        transformed["timestamp"],
        utc=True,
    )

    numeric_columns = [
        "consumption_mw",
        "production_mw",
        "wind_mw",
        "solar_mw",
    ]

    for column in numeric_columns:
        transformed[column] = pd.to_numeric(transformed[column])

    transformed = transformed.sort_values("timestamp").reset_index(drop=True)

    transformed["renewable_mw"] = (
        transformed["wind_mw"] + transformed["solar_mw"]
    )

    transformed["renewable_percentage"] = (
        transformed["renewable_mw"]
        .div(transformed["production_mw"].replace(0, pd.NA))
        .mul(100)
        .fillna(0)
        .round(2)
    )

    transformed["balance_mw"] = (
        transformed["production_mw"] - transformed["consumption_mw"]
    )

    transformed["timestamp"] = transformed["timestamp"].map(
        lambda value: value.isoformat().replace("+00:00", "Z")
    )

    return transformed

def export_records(frame: pd.DataFrame, output_path: Path) -> None:
    """Export records for the Next.js dashboard."""
    output_path.parent.mkdir(parents=True, exist_ok=True)

    records = frame.to_dict(orient="records")

    with output_path.open("w", encoding="utf-8") as file:
        json.dump(records, file, indent=2)

def main() -> None:
    pipeline_directory = Path(__file__).resolve().parent
    project_directory = pipeline_directory.parent

    input_path = pipeline_directory / "sample_input.json"
    output_path = project_directory / "web" / "src" / "data" / "energy.json"

    source_frame = load_records(input_path)
    transformed_frame = transform_records(source_frame)
    export_records(transformed_frame, output_path)

    print(f"Processed {len(transformed_frame)} records.")
    print(f"Dashboard data written to: {output_path}")

if __name__ == "__main__":
    main()
