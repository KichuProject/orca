"""
tools/spatial_temporal_tool.py
PHASE B2 — SPATIO-TEMPORAL TOOL (Agent-callable wrapper)
Wraps:
  engine/spatial_engine.py
  engine/temporal_engine.py
Supports:
  source="all"       → spatial + temporal combined
  source="spatial"   → spatial queries only
  source="temporal"  → temporal queries only
Rules:
  Zero top-level execution
  Everything inside functions
  Dynamic lat/lon/time
  TEST_* constants only inside __main__
  Primary -> fallback
  TEST RUN prints full result data
"""
import sys
import json
from pathlib import Path
from datetime import datetime

# ============================================================
# PATH SETUP
# ============================================================
TOOLS_DIR = Path(__file__).resolve().parent
APP_DIR = TOOLS_DIR.parent
ENGINE_DIR = APP_DIR / "engine"

for p in [str(TOOLS_DIR), str(APP_DIR), str(ENGINE_DIR)]:
    if p not in sys.path:
        sys.path.insert(0, p)

# ============================================================
# ENGINE IMPORTS
# ============================================================
_spatial_engine = None
_temporal_engine = None

def _get_spatial_engine():
    global _spatial_engine
    if _spatial_engine is None:
        try:
            import spatial_engine as se
            _spatial_engine = se
        except Exception:
            _spatial_engine = False
    return _spatial_engine if _spatial_engine else None

def _get_temporal_engine():
    global _temporal_engine
    if _temporal_engine is None:
        try:
            import temporal_engine as te
            _temporal_engine = te
        except Exception:
            _temporal_engine = False
    return _temporal_engine if _temporal_engine else None

# ============================================================
# TEST CONSTANTS
# ============================================================
TEST_LAT = 13.05
TEST_LON = 80.30
TEST_SOURCE = "all"

# ============================================================
# HELPERS
# ============================================================
def _now_iso():
    return datetime.now().isoformat()

def _safe_call(fn, *args, **kwargs):
    """Safely calls an engine function."""
    if fn is None:
        return {"status": "engine_not_available"}
    try:
        return fn(*args, **kwargs)
    except Exception as e:
        return {"status": "error", "error": str(e)[:150]}

# ============================================================
# 1. SPATIAL QUERIES
# ============================================================
def spatial_query(lat, lon, radius_km=50.0, source="all"):
    """
    AI Tool: Spatial reasoning for a location.
    Returns zones, ports, hazards, and spatial summary.
    """
    se = _get_spatial_engine()
    if not se:
        return {"status": "error", "error": "spatial_engine not available"}

    result = {
        "tool": "spatial_temporal_tool.spatial_query",
        "generated_at": _now_iso(),
        "lat": lat,
        "lon": lon,
        "radius_km": radius_km,
    }

    # Zones (EEZ, MPA, restricted, etc.)
    result["zones"] = _safe_call(se.check_point_in_layers, lat, lon)

    # Nearest ports
    result["nearest_ports"] = _safe_call(se.find_nearest_ports, lat, lon)

    # Hazard overlap
    result["hazards"] = _safe_call(se.check_hazard_overlap, lat, lon, radius_km)

    # Determine overall spatial alert
    zones_inside = result.get("zones", {}).get("zones_inside", [])
    hazards_found = result.get("hazards", {}).get("hazards_found", [])

    alerts = []
    for z in zones_inside:
        layer = z.get("layer", "")
        name = z.get("name", "")
        if "restricted" in layer.lower() or "mpa" in layer.lower():
            alerts.append(f"Inside restricted/protected zone: {name}")
        elif "eez" in layer.lower():
            alerts.append("Inside India EEZ")

    for h in hazards_found:
        htype = h.get("type", "")
        alerts.append(f"Active hazard: {htype}")

    result["spatial_alerts"] = alerts
    result["spatial_verdict"] = "RESTRICTED" if any("restricted" in a.lower() for a in alerts) else (
        "HAZARD_ACTIVE" if hazards_found else "CLEAR"
    )
    result["data_sources"] = ["Marine Regions GeoJSON", "OSM Ports", "Live hazard caches"]
    return result

# ============================================================
# 2. TEMPORAL QUERIES
# ============================================================
def temporal_query(lat, lon, time_reference="now", hours=24, source="all"):
    """
    AI Tool: Temporal reasoning for a location.
    time_reference: "now", "tomorrow morning", "5 AM", "next 6 hours", etc.
    """
    te = _get_temporal_engine()
    if not te:
        return {"status": "error", "error": "temporal_engine not available"}

    result = {
        "tool": "spatial_temporal_tool.temporal_query",
        "generated_at": _now_iso(),
        "lat": lat,
        "lon": lon,
        "time_reference": time_reference,
    }

    # Resolve time
    time_info = _safe_call(te.resolve_time_reference, time_reference)
    result["time_resolution"] = time_info

    target_time = time_info.get("target_time") if isinstance(time_info, dict) else None

    if target_time:
        # Conditions at that specific time
        result["conditions_at_time"] = _safe_call(
            te.get_conditions_at_time, lat, lon, target_time
        )
    else:
        # Forecast window
        result["forecast_window"] = _safe_call(
            te.get_forecast_window, lat, lon, hours
        )

    # Trend detection
    result["trend"] = _safe_call(te.detect_condition_trend, lat, lon, hours)

    result["data_sources"] = ["fetch_openmeteo_marine.get_comprehensive_conditions()"]
    return result

# ============================================================
# 3. DEPARTURE / RETURN EVALUATION
# ============================================================
def trip_evaluation(lat, lon, departure_hour=5, return_hour=15, vessel_type="small_boat"):
    """
    AI Tool: Evaluate conditions at departure AND return times.
    Example: "Is it safe to leave at 5 AM and return by 3 PM?"
    """
    te = _get_temporal_engine()
    if not te:
        return {"status": "error", "error": "temporal_engine not available"}

    result = _safe_call(
        te.evaluate_departure_return,
        lat, lon, departure_hour, return_hour, vessel_type
    )
    result["tool"] = "spatial_temporal_tool.trip_evaluation"
    result["generated_at"] = _now_iso()
    return result

# ============================================================
# 4. BEST DEPARTURE WINDOW
# ============================================================
def best_departure(lat, lon, search_hours=48, vessel_type="small_boat"):
    """
    AI Tool: Find the safest departure window in the next N hours.
    """
    te = _get_temporal_engine()
    if not te:
        return {"status": "error", "error": "temporal_engine not available"}

    result = _safe_call(
        te.find_best_departure_window,
        lat, lon, search_hours, vessel_type
    )
    result["tool"] = "spatial_temporal_tool.best_departure"
    result["generated_at"] = _now_iso()
    return result

# ============================================================
# 5. ROUTE INTERSECTION CHECK
# ============================================================
def route_check(route_coords, source="all"):
    """
    AI Tool: Check if a route intersects any restricted/hazard zones.
    route_coords: list of [lon, lat] pairs.
    """
    se = _get_spatial_engine()
    if not se:
        return {"status": "error", "error": "spatial_engine not available"}

    result = _safe_call(se.check_route_intersections, route_coords)
    result["tool"] = "spatial_temporal_tool.route_check"
    result["generated_at"] = _now_iso()
    return result

# ============================================================
# 6. COMBINED SPATIO-TEMPORAL QUERY
# ============================================================
def spatio_temporal_query(
    lat, lon,
    time_reference="now",
    radius_km=50.0,
    departure_hour=None,
    return_hour=None,
    vessel_type="small_boat",
    source="all"
):
    """
    AI Tool: Master spatio-temporal query combining spatial + temporal.
    Use for complex queries like:
    "Is it safe to leave at 5 AM tomorrow and return by 3 PM?"
    """
    result = {
        "tool": "spatial_temporal_tool.spatio_temporal_query",
        "generated_at": _now_iso(),
        "lat": lat,
        "lon": lon,
        "source_requested": source,
    }

    # Spatial component
    result["spatial"] = spatial_query(lat, lon, radius_km)

    # Temporal component
    if departure_hour is not None and return_hour is not None:
        result["temporal"] = trip_evaluation(
            lat, lon, departure_hour, return_hour, vessel_type
        )
    else:
        result["temporal"] = temporal_query(lat, lon, time_reference)

    # Combined verdict
    spatial_verdict = result.get("spatial", {}).get("spatial_verdict", "UNKNOWN")
    temporal_verdict = "UNKNOWN"

    temporal_data = result.get("temporal", {})
    if "trip_verdict" in temporal_data:
        temporal_verdict = temporal_data.get("trip_verdict", "UNKNOWN")
    elif "conditions_at_time" in temporal_data:
        temporal_verdict = temporal_data.get("conditions_at_time", {}).get("verdict", "UNKNOWN")
    elif "forecast_window" in temporal_data:
        temporal_verdict = temporal_data.get("forecast_window", {}).get("verdict", "UNKNOWN")

    # Final combined verdict (safety-first)
    if spatial_verdict == "RESTRICTED" or temporal_verdict == "DANGEROUS":
        combined = "DANGEROUS"
    elif spatial_verdict == "HAZARD_ACTIVE" or temporal_verdict == "CAUTION":
        combined = "CAUTION"
    elif spatial_verdict == "CLEAR" and temporal_verdict == "SAFE":
        combined = "SAFE"
    else:
        combined = "CAUTION"

    result["combined_verdict"] = combined
    result["spatial_verdict"] = spatial_verdict
    result["temporal_verdict"] = temporal_verdict
    result["data_sources"] = [
        "spatial_engine (GeoJSON layers, ports, hazards)",
        "temporal_engine (Open-Meteo forecast via fetcher)"
    ]
    return result

# ============================================================
# TEST RUN
# ============================================================
if __name__ == "__main__":
    print("=" * 70)
    print("SPATIO-TEMPORAL TOOL — TEST RUN")
    print("=" * 70)

    # Test 1: Spatial query
    print("\n📦 spatial_query =>")
    sq = spatial_query(TEST_LAT, TEST_LON)
    print(json.dumps(sq, indent=1, default=str))

    # Test 2: Temporal query
    print("\n📦 temporal_query (tomorrow morning) =>")
    tq = temporal_query(TEST_LAT, TEST_LON, "tomorrow morning")
    print(json.dumps(tq, indent=1, default=str))

    # Test 3: Trip evaluation
    print("\n📦 trip_evaluation (5 AM → 3 PM) =>")
    te_result = trip_evaluation(TEST_LAT, TEST_LON, 5, 15)
    print(json.dumps(te_result, indent=1, default=str))

    # Test 4: Best departure
    print("\n📦 best_departure (next 48h) =>")
    bd = best_departure(TEST_LAT, TEST_LON, 48)
    print(json.dumps(bd, indent=1, default=str))

    # Test 5: Combined spatio-temporal
    print("\n📦 spatio_temporal_query (combined) =>")
    stq = spatio_temporal_query(
        TEST_LAT, TEST_LON,
        departure_hour=5,
        return_hour=15,
        vessel_type="small_boat"
    )
    # Print summary only
    summary = {
        "tool": stq.get("tool"),
        "combined_verdict": stq.get("combined_verdict"),
        "spatial_verdict": stq.get("spatial_verdict"),
        "temporal_verdict": stq.get("temporal_verdict"),
        "data_sources": stq.get("data_sources"),
    }
    print(json.dumps(summary, indent=1, default=str))

    print("\n✅ SPATIO-TEMPORAL TOOL TEST COMPLETE")
    print("\nCALL LIST:")
    print("  py .\\tools\\spatial_temporal_tool.py")
    print("  py -c \"import sys; sys.path.insert(0,'tools'); from spatial_temporal_tool import spatial_query; import json; print(json.dumps(spatial_query(13.05, 80.30), indent=1, default=str))\"")
    print("  py -c \"import sys; sys.path.insert(0,'tools'); from spatial_temporal_tool import temporal_query; import json; print(json.dumps(temporal_query(13.05, 80.30, 'tomorrow morning'), indent=1, default=str))\"")
    print("  py -c \"import sys; sys.path.insert(0,'tools'); from spatial_temporal_tool import spatio_temporal_query; import json; print(json.dumps(spatio_temporal_query(13.05, 80.30, departure_hour=5, return_hour=15), indent=1, default=str))\"")