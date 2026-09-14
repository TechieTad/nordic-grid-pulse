import pandas as pd
import pytest

from transform import transform_records

def valid_frame() -> pd.DataFrame:
    return pd.DataFrame(
        [
            {
                "timestamp": "2026-08-30T08:00:00Z",
                "consumption_mw": 100,
                "production_mw": 120,
                "wind_mw": 30,
                "solar_mw": 10,
            }
        ]
    )

def test_transform_calculates_expected_metrics() -> None:
    result = transform_records(valid_frame())

    assert result.loc[0, "renewable_mw"] == 40
    assert result.loc[0, "renewable_percentage"] == 33.33
    assert result.loc[0, "balance_mw"] == 20

def test_negative_values_are_rejected() -> None:
    frame = valid_frame()
    frame.loc[0, "wind_mw"] = -1

    with pytest.raises(ValueError, match="negative values"):
        transform_records(frame)

def test_missing_columns_are_rejected() -> None:
    frame = valid_frame().drop(columns=["solar_mw"])

    with pytest.raises(ValueError, match="Missing required columns"):
        transform_records(frame)

def test_duplicate_timestamps_are_rejected() -> None:
    frame = pd.concat([valid_frame(), valid_frame()], ignore_index=True)

    with pytest.raises(ValueError, match="Duplicate timestamps"):
        transform_records(frame)
