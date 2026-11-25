from __future__ import annotations

import json
import os
import time
from datetime import datetime, timezone
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


def write_pipeline_run(
    client,
    started_at: datetime,
    finished_at: datetime,
    status: str,
    fetched_count: int,
    written_count: int,
    dropped_count: int,
    error_message: str | None,
) -> None:
    """Write one receipt row to pipeline_runs. Never raises, so a logging
    failure can't crash the pipeline."""
    try:
        client.table("pipeline_runs").insert({
            "started_at": started_at.isoformat(),
            "finished_at": finished_at.isoformat(),
            "status": status,
            "fetched_count": fetched_count,
            "written_count": written_count,
            "dropped_count": dropped_count,
            "error_message": error_message,
        }).execute()
    except Exception as exc:
        print(f"WARNING: could not write pipeline_runs row: {exc}")


def main() -> None:
    load_dotenv()

    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")

    if not url or not key:
        raise SystemExit(
            "SUPABASE_URL and SUPABASE_KEY must be set in pipeline/.env"
        )

    started = time.monotonic()
    started_at = datetime.now(timezone.utc)

    client = create_client(url, key)

    try:
        pipeline_directory = Path(__file__).resolve().parent
        project_directory = pipeline_directory.parent
        energy_path = project_directory / "web" / "src" / "data" / "energy.json"

        with energy_path.open("r", encoding="utf-8") as file:
            records = json.load(file)

        fetched = len(records)
        written = load_records_to_supabase(records, url, key)
        dropped = max(0, fetched - written)

        print(f"Upserted {written} records into Supabase.")

        finished_at = datetime.now(timezone.utc)
        duration_ms = round((time.monotonic() - started) * 1000)

        status = "partial" if dropped > 0 else "success"

        write_pipeline_run(
            client,
            started_at,
            finished_at,
            status,
            fetched,
            written,
            dropped,
            None,
        )

        print(
            f"Run logged: {status}, {fetched} fetched, "
            f"{written} written, {dropped} dropped "
            f"({duration_ms} ms)."
        )

    except Exception as exc:
        write_pipeline_run(
            client,
            started_at,
            datetime.now(timezone.utc),
            "error",
            0,
            0,
            0,
            str(exc),
        )
        raise


if __name__ == "__main__":
    main()
