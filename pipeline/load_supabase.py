from __future__ import annotations

import json
import os
from pathlib import Path

from dotenv import load_dotenv
from supabase import create_client

def load_records_to_supabase(
    records: list[dict],
    url: str,
    key: str,
) -> int:
    """Upsert records into Supabase and return how many were written."""
    client = create_client(url, key)

    result = (
        client.table("energy_records")
        .upsert(records, on_conflict="timestamp")
        .execute()
    )

    return len(result.data)

def main() -> None:
    load_dotenv()

    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")

    if not url or not key:
        raise SystemExit(
            "SUPABASE_URL and SUPABASE_KEY must be set in pipeline/.env"
        )

    pipeline_directory = Path(__file__).resolve().parent
    project_directory = pipeline_directory.parent
    energy_path = project_directory / "web" / "src" / "data" / "energy.json"

    with energy_path.open("r", encoding="utf-8") as file:
        records = json.load(file)

    count = load_records_to_supabase(records, url, key)
    print(f"Upserted {count} records into Supabase.")

if __name__ == "__main__":
    main()
