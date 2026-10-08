from datetime import datetime, timedelta, timezone

import pytest

from app.cost import hourly_cost, parse_cpu, parse_memory_gib, session_cost

T0 = datetime(2026, 10, 8, 10, 0, tzinfo=timezone.utc)


@pytest.mark.parametrize(
    ("cpu", "memory", "expected"),
    [("1", "1Gi", 0.072), ("1", "2Gi", 0.079), ("2", "4Gi", 0.158)],
)
def test_hourly_cost_sanity_values(cpu, memory, expected):
    assert hourly_cost(cpu, memory) == expected


@pytest.mark.parametrize(
    ("value", "expected"),
    [("1", 1.0), ("2", 2.0), ("0.5", 0.5), ("1000m", 1.0), ("250m", 0.25), (" 4 ", 4.0)],
)
def test_parse_cpu(value, expected):
    assert parse_cpu(value) == pytest.approx(expected)


@pytest.mark.parametrize(
    ("value", "expected"),
    [
        ("512Mi", 0.5),
        ("1Gi", 1.0),
        ("2Gi", 2.0),
        ("4Gi", 4.0),
        ("0.5Gi", 0.5),
        ("1048576Ki", 1.0),
        ("1G", 1e9 / 2**30),
        ("512M", 512e6 / 2**30),
        (str(2**30), 1.0),
    ],
)
def test_parse_memory_gib(value, expected):
    assert parse_memory_gib(value) == pytest.approx(expected)


@pytest.mark.parametrize("bad", ["", "abc", "2x", "-1", "1.2.3"])
def test_parse_cpu_rejects_garbage(bad):
    with pytest.raises(ValueError):
        parse_cpu(bad)


@pytest.mark.parametrize("bad", ["", "Gi", "2Gb", "-1Gi", "2 GiB"])
def test_parse_memory_rejects_garbage(bad):
    with pytest.raises(ValueError):
        parse_memory_gib(bad)


def test_session_cost_full_hour_matches_hourly():
    assert session_cost("2", "4Gi", T0, T0 + timedelta(hours=1)) == pytest.approx(0.1584)


def test_session_cost_partial_rounded_to_4_decimals():
    # 90 s x (1 x 0.000018 + 1 x 0.000002) = 0.0018
    assert session_cost("1", "1Gi", T0, T0 + timedelta(seconds=90)) == 0.0018
    # 1234 s x 0.000022 = 0.027148 -> 0.0271
    assert session_cost("1", "2Gi", T0, T0 + timedelta(seconds=1234)) == 0.0271


def test_session_cost_zero_and_negative_durations():
    assert session_cost("2", "4Gi", T0, T0) == 0.0
    assert session_cost("2", "4Gi", T0, T0 - timedelta(minutes=5)) == 0.0


def test_session_cost_accepts_naive_and_other_timezones():
    ist = timezone(timedelta(hours=5, minutes=30))
    start = datetime(2026, 10, 8, 15, 30, tzinfo=ist)  # == T0
    naive_end = datetime(2026, 10, 8, 11, 0)  # treated as UTC
    assert session_cost("1", "1Gi", start, naive_end) == 0.072


def test_prices_read_from_env_at_call_time(monkeypatch):
    monkeypatch.setenv("PRICE_VCPU_SEC", "0.0001")
    monkeypatch.setenv("PRICE_GIB_SEC", "0")
    assert hourly_cost("1", "1Gi") == 0.36
    monkeypatch.setenv("PRICE_GIB_SEC", "0.0001")
    assert hourly_cost("1", "1Gi") == 0.72


def test_invalid_env_price_falls_back_to_default(monkeypatch):
    monkeypatch.setenv("PRICE_VCPU_SEC", "not-a-number")
    monkeypatch.setenv("PRICE_GIB_SEC", "")
    assert hourly_cost("1", "1Gi") == 0.072
