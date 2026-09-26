"""
engine/freshness_engine.py
PHASE B10 — DATA FRESHNESS / RELIABILITY LAYER
Checks actual file modification times and determines:
1. How old each dataset is (in minutes/hours/days)
2. Whether data is FRESH / RECENT / STALE / EXPIRED
3. Freshness score 0-100 for each source
4. Overall data reliability verdict

Rules:
- Zero top-level execution
- Everything inside functions
- Dynamic file scanning
- TEST_* constants only inside __main__
- TEST RUN prints full result data
"""
import json
from pathlib import Path
from datetime import datetime, timedelta

# ============================================================
# PATH SETUP
# ============================================================
DATA_DIR = Path(r"E:\sih\data")
STATIC_DIR = DATA_DIR / "static"
LIVE_DIR = DATA_DIR / "live_cache"

# ============================================================
# TEST CONSTANTS
# ============================================================
TEST_VERBOSE = True

# ============================================================
# DATASET REGISTRY
# Each entry: name, path(s), expected_refresh, category
# ============================================================
DATASET_REGISTRY = [
    # --- LIVE ALERTS ---
    {
        "name": "IMD Fishermen Warnings",
        "key": "imd_alerts",
        "paths": [LIVE_DIR / "alerts" / "imd_fishermen_alerts.json"],
        "expected_refresh_minutes": 360,  # 6 hours
        "category": "live_alert",
        "source": "IMD",
    },
    {
        "name": "IMD Cyclone Alerts",
        "key": "imd_cyclone",
        "paths": [LIVE_DIR / "alerts" / "imd_cyclone_alerts.json"],
        "expected_refresh_minutes": 360,
        "category": "live_alert",
        "source": "IMD",
    },
    {
        "name": "INCOIS High Wave Alerts",
        "key": "incois_high_wave",
        "paths": [LIVE_DIR / "alerts" / "incois_high_wave_alerts.json"],
        "expected_refresh_minutes": 360,
        "category": "live_alert",
        "source": "INCOIS",
    },
    {
        "name": "Cyclone Detection (Open-Meteo)",
        "key": "cyclone_detection",
        "paths": [LIVE_DIR / "alerts" / "cyclone_detection_result.json"],
        "expected_refresh_minutes": 180,  # 3 hours
        "category": "live_alert",
        "source": "Open-Meteo",
    },
    {
        "name": "Lightning Detection (Open-Meteo)",
        "key": "lightning_detection",
        "paths": [LIVE_DIR / "alerts" / "lightning_detection_result.json"],
        "expected_refresh_minutes": 180,
        "category": "live_alert",
        "source": "Open-Meteo",
    },
    {
        "name": "NASA EONET Cyclones",
        "key": "nasa_eonet",
        "paths": [LIVE_DIR / "alerts" / "nasa_cyclone_summary.json"],
        "expected_refresh_minutes": 1440,  # 24 hours
        "category": "live_alert",
        "source": "NASA EONET",
    },
    {
        "name": "IBTrACS Active Storms",
        "key": "ibtracs_active",
        "paths": [LIVE_DIR / "alerts" / "ibtracs_active_live.json"],
        "expected_refresh_minutes": 1440,
        "category": "live_alert",
        "source": "NOAA IBTrACS",
    },
    # --- OCEAN / SATELLITE ---
    {
        "name": "Copernicus SST NetCDF",
        "key": "copernicus_sst",
        "paths": [LIVE_DIR / "sst" / "india_coast_sst_live.nc"],
        "expected_refresh_minutes": 1440,  # daily
        "category": "satellite",
        "source": "Copernicus",
    },
    {
        "name": "Copernicus Chlorophyll NetCDF",
        "key": "copernicus_chl",
        "paths": [LIVE_DIR / "sst" / "india_coast_chlorophyll_live.nc"],
        "expected_refresh_minutes": 1440,
        "category": "satellite",
        "source": "Copernicus",
    },
    {
        "name": "Satellite Metadata",
        "key": "satellite_metadata",
        "paths": [LIVE_DIR / "sst" / "satellite_metadata.json"],
        "expected_refresh_minutes": 1440,
        "category": "satellite",
        "source": "Copernicus",
    },
    # --- PFZ ---
    {
        "name": "Unified PFZ (INCOIS + Copernicus)",
        "key": "unified_pfz",
        "paths": [LIVE_DIR / "pfz" / "unified_pfz_final.json"],
        "expected_refresh_minutes": 1440,
        "category": "advisory",
        "source": "INCOIS + Copernicus",
    },
    {
        "name": "INCOIS PFZ Live",
        "key": "incois_pfz",
        "paths": [LIVE_DIR / "pfz" / "incois_pfz_live.json"],
        "expected_refresh_minutes": 1440,
        "category": "advisory",
        "source": "INCOIS",
    },
    # --- WEATHER ---
    {
        "name": "Open-Meteo Marine Forecast",
        "key": "openmeteo_marine",
        "paths": [LIVE_DIR / "waves" / "openmeteo_marine_forecast.json"],
        "expected_refresh_minutes": 60,  # hourly
        "category": "live_weather",
        "source": "Open-Meteo",
    },
    # --- TIDES ---
    {
        "name": "Tide Predictions",
        "key": "tide_predictions",
        "paths": [LIVE_DIR / "tides" / "tide_predictions.json"],
        "expected_refresh_minutes": 1440,
        "category": "prediction",
        "source": "Open-Meteo + Harmonic",
    },
    # --- GFW ---
    {
        "name": "GFW Fleet Stats",
        "key": "gfw_fleet",
        "paths": [LIVE_DIR / "gfw" / "gfw_fleet_stats.json"],
        "expected_refresh_minutes": 4320,  # 3 days
        "category": "activity",
        "source": "Global Fishing Watch",
    },
    # --- MOSDAC / ISRO ---
    {
        "name": "ISRO INSAT-3DS SST",
        "key": "isro_sst",
        "paths": [LIVE_DIR / "mosdac" / "insat3ds_sst"],
        "expected_refresh_minutes": 360,  # 6 hours
        "category": "satellite",
        "source": "ISRO MOSDAC",
        "is_directory": True,
    },
    {
        "name": "ISRO Oceansat-3 Chlorophyll",
        "key": "isro_chl",
        "paths": [LIVE_DIR / "mosdac" / "oceansat3_chl"],
        "expected_refresh_minutes": 360,
        "category": "satellite",
        "source": "ISRO MOSDAC",
        "is_directory": True,
    },
    {
        "name": "ISRO EOS-06 Wind",
        "key": "isro_wind",
        "paths": [LIVE_DIR / "mosdac" / "eos06_wind"],
        "expected_refresh_minutes": 360,
        "category": "satellite",
        "source": "ISRO MOSDAC",
        "is_directory": True,
    },
    # --- STATIC (never expires) ---
    {
        "name": "Seasonal Fishing Ban",
        "key": "seasonal_ban",
        "paths": [STATIC_DIR / "fishban" / "seasonal_ban.json"],
        "expected_refresh_minutes": 10080,  # weekly
        "category": "regulatory",
        "source": "FSI/DoF",
    },
    {
        "name": "FAO Productivity Data",
        "key": "fao_productivity",
        "paths": [STATIC_DIR / "fao" / "india_capture.csv"],
        "expected_refresh_minutes": 43200,  # monthly
        "category": "static",
        "source": "FAO",
    },
    {
        "name": "OBIS Biodiversity",
        "key": "obis_biodiversity",
        "paths": [STATIC_DIR / "ecology" / "obis_india.csv"],
        "expected_refresh_minutes": 43200,
        "category": "static",
        "source": "OBIS",
    },
]

# ============================================================
# HELPERS
# ============================================================
def _now_iso():
    return datetime.now().isoformat()

def _get_file_age_minutes(path):
    """Returns file age in minutes. Returns None if file missing."""
    try:
        p = Path(path)
        if p.exists():
            age_seconds = datetime.now().timestamp() - p.stat().st_mtime
            return round(age_seconds / 60, 1)
    except Exception:
        pass
    return None

def _get_dir_latest_age_minutes(dir_path):
    """Returns age of the newest file inside a directory."""
    try:
        d = Path(dir_path)
        if not d.exists():
            return None
        latest_mtime = 0
        for f in d.rglob("*"):
            if f.is_file():
                mtime = f.stat().st_mtime
                if mtime > latest_mtime:
                    latest_mtime = mtime
        if latest_mtime == 0:
            return None
        age_seconds = datetime.now().timestamp() - latest_mtime
        return round(age_seconds / 60, 1)
    except Exception:
        return None

def _age_to_label(age_minutes):
    """Converts age in minutes to human-readable label."""
    if age_minutes is None:
        return "MISSING"
    if age_minutes < 30:
        return f"{int(age_minutes)} min ago"
    elif age_minutes < 60:
        return f"{int(age_minutes)} min ago"
    elif age_minutes < 1440:
        hours = round(age_minutes / 60, 1)
        return f"{hours} hours ago"
    else:
        days = round(age_minutes / 1440, 1)
        return f"{days} days ago"

def _freshness_status(age_minutes, expected_refresh_minutes):
    """
    Determines freshness status.
    FRESH: within expected refresh window
    RECENT: within 2x expected window
    STALE: within 4x expected window
    EXPIRED: beyond 4x expected window
    """
    if age_minutes is None:
        return "MISSING"
    if age_minutes <= expected_refresh_minutes:
        return "FRESH"
    elif age_minutes <= expected_refresh_minutes * 2:
        return "RECENT"
    elif age_minutes <= expected_refresh_minutes * 4:
        return "STALE"
    else:
        return "EXPIRED"

def _freshness_score(age_minutes, expected_refresh_minutes):
    """
    Computes freshness score 0-100.
    100 = just updated
    0 = extremely stale or missing
    """
    if age_minutes is None:
        return 0
    if age_minutes <= 0:
        return 100
    ratio = age_minutes / expected_refresh_minutes
    if ratio <= 1.0:
        return round(100 - (ratio * 30))  # 70-100
    elif ratio <= 2.0:
        return round(70 - ((ratio - 1.0) * 30))  # 40-70
    elif ratio <= 4.0:
        return round(40 - ((ratio - 2.0) * 15))  # 10-40
    else:
        return max(0, round(10 - ((ratio - 4.0) * 2)))  # 0-10

# ============================================================
# MAIN FRESHNESS CHECK
# ============================================================
def check_all_data_freshness(verbose=False):
    """
    AI Tool / Background Task:
    Checks freshness of ALL registered datasets.
    Returns structured report with freshness scores.
    """
    results = []
    total_score = 0
    total_count = 0
    stale_count = 0
    expired_count = 0
    missing_count = 0

    for dataset in DATASET_REGISTRY:
        name = dataset["name"]
        key = dataset["key"]
        expected = dataset["expected_refresh_minutes"]
        is_dir = dataset.get("is_directory", False)

        # Get age
        age_minutes = None
        for path in dataset["paths"]:
            if is_dir:
                age_minutes = _get_dir_latest_age_minutes(path)
            else:
                age_minutes = _get_file_age_minutes(path)
            if age_minutes is not None:
                break

        # Compute status and score
        status = _freshness_status(age_minutes, expected)
        score = _freshness_score(age_minutes, expected)
        label = _age_to_label(age_minutes)

        total_score += score
        total_count += 1

        if status == "STALE":
            stale_count += 1
        elif status == "EXPIRED":
            expired_count += 1
        elif status == "MISSING":
            missing_count += 1

        entry = {
            "dataset": name,
            "key": key,
            "source": dataset["source"],
            "category": dataset["category"],
            "age_label": label,
            "age_minutes": age_minutes,
            "expected_refresh_minutes": expected,
            "freshness_status": status,
            "freshness_score": score,
        }
        results.append(entry)

        if verbose:
            icon = "✅" if status == "FRESH" else ("🟡" if status == "RECENT" else ("🟠" if status == "STALE" else ("🔴" if status == "EXPIRED" else "⚫")))
            print(f"  {icon} {name}: {label} [{status}] (score: {score})")

    # Overall verdict
    avg_score = round(total_score / total_count) if total_count > 0 else 0
    if avg_score >= 80 and expired_count == 0:
        overall_verdict = "RELIABLE"
    elif avg_score >= 60:
        overall_verdict = "MOSTLY_RELIABLE"
    elif avg_score >= 40:
        overall_verdict = "PARTIALLY_STALE"
    else:
        overall_verdict = "UNRELIABLE"

    return {
        "tool": "freshness_engine.check_all_data_freshness",
        "generated_at": _now_iso(),
        "datasets_checked": total_count,
        "overall_freshness_score": avg_score,
        "overall_verdict": overall_verdict,
        "stale_count": stale_count,
        "expired_count": expired_count,
        "missing_count": missing_count,
        "datasets": results,
    }

def get_dataset_freshness(dataset_key):
    """
    Returns freshness for a single dataset by key.
    """
    for dataset in DATASET_REGISTRY:
        if dataset["key"] == dataset_key:
            is_dir = dataset.get("is_directory", False)
            age_minutes = None
            for path in dataset["paths"]:
                if is_dir:
                    age_minutes = _get_dir_latest_age_minutes(path)
                else:
                    age_minutes = _get_file_age_minutes(path)
                if age_minutes is not None:
                    break

            expected = dataset["expected_refresh_minutes"]
            return {
                "dataset": dataset["name"],
                "key": dataset_key,
                "source": dataset["source"],
                "age_label": _age_to_label(age_minutes),
                "age_minutes": age_minutes,
                "freshness_status": _freshness_status(age_minutes, expected),
                "freshness_score": _freshness_score(age_minutes, expected),
            }

    return {"error": f"Dataset key '{dataset_key}' not found"}

def format_freshness_for_llm(freshness_report):
    """
    Formats freshness report into a concise LLM prompt injection.
    """
    if not freshness_report:
        return "No freshness data available."

    lines = [
        f"📅 DATA FRESHNESS (Overall: {freshness_report['overall_freshness_score']}/100 — {freshness_report['overall_verdict']})",
    ]

    for d in freshness_report.get("datasets", []):
        status = d.get("freshness_status", "UNKNOWN")
        if status in ("STALE", "EXPIRED", "MISSING"):
            icon = "🟠" if status == "STALE" else ("🔴" if status == "EXPIRED" else "⚫")
            lines.append(
                f"  {icon} {d['dataset']}: {d['age_label']} [{status}]"
            )

    stale = freshness_report.get("stale_count", 0)
    expired = freshness_report.get("expired_count", 0)
    missing = freshness_report.get("missing_count", 0)

    if stale + expired + missing == 0:
        lines.append("  ✅ All datasets are fresh and reliable.")
    else:
        lines.append(f"  ⚠️ {stale} stale, {expired} expired, {missing} missing.")

    return "\n".join(lines)

# ============================================================
# TEST RUN
# ============================================================
if __name__ == "__main__":
    print("=" * 70)
    print("FRESHNESS ENGINE — PHASE B10 TEST RUN")
    print("=" * 70)

    print("\n📦 check_all_data_freshness (verbose) =>")
    report = check_all_data_freshness(verbose=True)

    # Print summary
    print(f"\n📊 Summary:")
    print(f"   Datasets checked: {report['datasets_checked']}")
    print(f"   Overall score: {report['overall_freshness_score']}/100")
    print(f"   Overall verdict: {report['overall_verdict']}")
    print(f"   Stale: {report['stale_count']}")
    print(f"   Expired: {report['expired_count']}")
    print(f"   Missing: {report['missing_count']}")

    # Print LLM format
    print(f"\n📦 format_freshness_for_llm =>")
    formatted = format_freshness_for_llm(report)
    print(formatted)

    # Test single dataset
    print(f"\n📦 get_dataset_freshness('imd_alerts') =>")
    imd_freshness = get_dataset_freshness("imd_alerts")
    print(json.dumps(imd_freshness, indent=1))

    print(f"\n📦 get_dataset_freshness('copernicus_sst') =>")
    cop_freshness = get_dataset_freshness("copernicus_sst")
    print(json.dumps(cop_freshness, indent=1))

    print("\n✅ FRESHNESS ENGINE TEST COMPLETE")
    print("\nCALL LIST:")
    print("  py .\\engine\\freshness_engine.py")
    print('  py -c "import sys; sys.path.insert(0,\'engine\'); from freshness_engine import check_all_data_freshness; import json; print(json.dumps(check_all_data_freshness(), indent=1))"')
    print('  py -c "import sys; sys.path.insert(0,\'engine\'); from freshness_engine import get_dataset_freshness; import json; print(json.dumps(get_dataset_freshness(\'imd_alerts\'), indent=1))"')