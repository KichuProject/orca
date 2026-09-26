"""
marine_intel.py

MASTER MARINE INTELLIGENCE AGGREGATOR - MULTI-SOURCE VERSION

Calls ALL tools and combines into one full JSON report.

Supports:
    source="all"        -> passes source="all" to every sub-tool
    source="openmeteo"  -> passes source="openmeteo" where applicable
    source="isro"       -> passes source="isro" where applicable
    source="copernicus" -> passes source="copernicus" where applicable

Tools aggregated:
    safety_tool       -> get_safety_conditions, get_wave_conditions, get_weather_forecast
    pfz_tool          -> get_nearest_pfz, get_sst_chlorophyll
    geofence_tool     -> check_geofence, get_coastline_distance, get_eco_restriction
    tide_tool         -> get_tide_prediction
    hazard_tool       -> get_cyclone_risk, get_lightning_risk
    navigation_tool   -> get_nearest_port, get_depth
    productivity_tool -> get_productivity_trend
    alerts_tool       -> get_local_imd_alert

Rules:
    Zero top-level execution
    Everything inside functions
    Dynamic lat/lon
    TEST_* constants only inside __main__
    TEST RUN prints full result data
"""

import sys
import json
from pathlib import Path
from datetime import datetime


# ================= BOOTSTRAP =================

TOOLS_DIR = Path(__file__).resolve().parent

if str(TOOLS_DIR) not in sys.path:
    sys.path.insert(0, str(TOOLS_DIR))


# ================= TEST CONSTANTS =================
# Used ONLY by __main__ test run

TEST_LAT = 13.05
TEST_LON = 80.30
TEST_SOURCE = "all"


# ================= HELPERS =================

def _now_iso():
    return datetime.now().isoformat()


def _safe_call(func, *args, **kwargs):
    """
    Safely calls a tool function.
    Returns error dict instead of crashing the full report.
    """
    try:
        return func(*args, **kwargs)
    except Exception as e:
        return {
            "status": "error",
            "error": str(e)[:120],
            "tool": getattr(func, "__module__", "unknown") + "." + getattr(func, "__name__", "unknown")
        }


# ================= MASTER AGGREGATOR =================

def get_full_marine_intel(lat, lon, source="all"):
    """
    AI Tool:
    Get complete marine intelligence report for any lat/lon.

    Aggregates:
        safety, waves, weather, pfz, ocean, geofence, coastline,
        eco_restriction, tides, cyclone, lightning, ports, depth,
        productivity, imd_alerts

    source param is passed through to all sub-tools that support it.
    """

    # Lazy imports to avoid circular dependencies at module level
    from safety_tool import get_safety_conditions, get_wave_conditions, get_weather_forecast
    from pfz_tool import get_nearest_pfz, get_sst_chlorophyll
    from geofence_tool import check_geofence, get_coastline_distance, get_eco_restriction
    from tide_tool import get_tide_prediction
    from hazard_tool import get_cyclone_risk, get_lightning_risk
    from navigation_tool import get_nearest_port, get_depth
    from productivity_tool import get_productivity_trend
    from alerts_tool import get_local_imd_alert

    report = {
        "tool": "marine_intel.get_full_marine_intel",
        "generated_at": _now_iso(),
        "source_requested": source,
        "location": {
            "lat": lat,
            "lon": lon
        },
        "safety": _safe_call(
            get_safety_conditions, lat, lon, source=source
        ),
        "waves": _safe_call(
            get_wave_conditions, lat, lon, source=source
        ),
        "weather": _safe_call(
            get_weather_forecast, lat, lon, source=source
        ),
        "pfz": _safe_call(
            get_nearest_pfz, lat, lon, source=source
        ),
        "ocean": _safe_call(
            get_sst_chlorophyll, lat, lon, source=source
        ),
        "geofence": _safe_call(
            check_geofence, lat, lon, source=source
        ),
        "coastline": _safe_call(
            get_coastline_distance, lat, lon, source=source
        ),
        "eco_restriction": _safe_call(
            get_eco_restriction, lat, lon, source=source
        ),
        "tides": _safe_call(
            get_tide_prediction, lat=lat, lon=lon, source=source
        ),
        "cyclone": _safe_call(
            get_cyclone_risk, lat, lon, source=source
        ),
        "lightning": _safe_call(
            get_lightning_risk, lat, lon, source=source
        ),
        "nearest_ports": _safe_call(
            get_nearest_port, lat, lon, source=source
        ),
        "depth": _safe_call(
            get_depth, lat, lon, source=source
        ),
        "productivity": _safe_call(
            get_productivity_trend, source=source
        ),
        "imd_alerts": _safe_call(
            get_local_imd_alert, lat, lon, source=source
        ),
    }

    # Build quick summary for AI agent
    safety_data = report.get("safety", {})
    geofence_data = report.get("geofence", {})
    pfz_data = report.get("pfz", {})
    tide_data = report.get("tides", {})
    depth_data = report.get("depth", {})
    port_data = report.get("nearest_ports", {})

    summary = {
        "verdict": safety_data.get("verdict", "UNKNOWN"),
        "risks": safety_data.get("risks", []),
        "zone": geofence_data.get("alert", "UNKNOWN"),
        "pfz_source": pfz_data.get("source", "NONE"),
        "pfz_confidence": pfz_data.get("confidence", "NONE"),
        "nearest_pfz_name": (pfz_data.get("nearest_pfz") or {}).get("name"),
        "nearest_pfz_distance_km": pfz_data.get("distance_km"),
        "tide_port": tide_data.get("port"),
        "tide_height_m": tide_data.get("current_height_m"),
        "tide_status": tide_data.get("tide_status"),
        "depth_m": depth_data.get("depth_m"),
        "nearest_port_name": (
            (port_data.get("ports") or [{}])[0].get("name")
            if port_data.get("ports")
            else None
        ),
    }

    report["summary"] = summary

    return report


# ================= QUICK SUMMARY (lightweight) =================

def get_quick_marine_summary(lat, lon, source="all"):
    """
    AI Tool:
    Lightweight summary without full data dumps.
    Useful for fast agent responses.
    """
    full = get_full_marine_intel(lat, lon, source=source)

    return {
        "tool": "marine_intel.get_quick_marine_summary",
        "generated_at": _now_iso(),
        "location": {"lat": lat, "lon": lon},
        "source_requested": source,
        "summary": full.get("summary", {}),
        "data_sources": [
            "Open-Meteo Marine",
            "Open-Meteo Weather",
            "IMD Fishermen Warnings",
            "INCOIS PFZ",
            "Copernicus AI PFZ",
            "Marine Regions / WDPA",
            "GEBCO Bathymetry",
            "OSM Ports",
            "Harmonic Tides",
            "NASA EONET / IBTrACS",
            "FAO Productivity",
        ]
    }


# ================= TEST RUN =================

if __name__ == "__main__":

    print("=" * 70)
    print("MARINE INTEL - MASTER AGGREGATOR TEST RUN")
    print("=" * 70)

    # Test 1: Full report
    full_report = get_full_marine_intel(
        lat=TEST_LAT,
        lon=TEST_LON,
        source=TEST_SOURCE
    )

    print("\n📦 get_full_marine_intel =>")
    print(json.dumps(full_report, indent=1))

    # Test 2: Quick summary
    quick = get_quick_marine_summary(
        lat=TEST_LAT,
        lon=TEST_LON,
        source=TEST_SOURCE
    )

    print("\n📦 get_quick_marine_summary =>")
    print(json.dumps(quick, indent=1))

    print("\nCALL LIST:")
    print("  py .\\tools\\marine_intel.py")
    print("  py -c \"import sys; sys.path.insert(0,'tools'); from marine_intel import get_full_marine_intel; import json; print(json.dumps(get_full_marine_intel(13.05, 80.30), indent=1))\"")
    print("  py -c \"import sys; sys.path.insert(0,'tools'); from marine_intel import get_quick_marine_summary; import json; print(json.dumps(get_quick_marine_summary(13.05, 80.30), indent=1))\"")
    print("  py -c \"import sys; sys.path.insert(0,'tools'); from marine_intel import get_full_marine_intel; import json; print(json.dumps(get_full_marine_intel(9.93, 76.26, source='isro'), indent=1))\"")