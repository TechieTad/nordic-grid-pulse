import pandas as pd
import pytest

from fetch_fingrid import combine_series

def series(values: dict[str, float]) -> pd.DataFrame:
    return pd.DataFrame(
        {"startTime": list(values.keys()), "value": list(values.values())}
    )

def test_combine_series_joins_on_timestamp() -> None:
    result = combine_series(
        {
            "consumption_mw": series({"t1": 100, "t2": 110}),
            "production_mw": series({"t1": 120, "t2": 115}),
        }
    )

    assert list(result.columns) == ["timestamp", "consumption_mw", "production_mw"]
    assert len(result) == 2

def test_combine_series_drops_timestamps_missing_from_any_dataset() -> None:
    result = combine_series(
        {
            "consumption_mw": series({"t1": 100, "t2": 110}),
            "production_mw": series({"t1": 120}),
        }
    )

    assert result["timestamp"].tolist() == ["t1"]

def test_combine_series_rejects_empty_input() -> None:
    with pytest.raises(ValueError):
        combine_series({})
