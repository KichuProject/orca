"""
tools/route_optimizer_tool.py
PHASE B6 — ROUTE OPTIMIZER TOOL (Agent-callable wrapper)
Wraps:
  engine/route_engine.py
Supports:
  source="all"     → fastest + safest + balanced routes
  source="fastest" → fastest route only
  source="safest"  → safest route only
  source="balanced"→ balanced route only
Rules:
  Zero top-level execution
  Everything inside functions
  Dynamic start/end/vessel_type
  TEST_* constants only inside __main__
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
# ENGINE IMPORT (lazy)
# ============================================================
_route_engine = None

def _get_route_engine():
    global _route_engine
    if _route_engine is None:
        try:
            from route_engine import calculate_optimized_routes, quick_route_check
            _route_engine = {
                "full": calculate_optimized_routes,
                "quick": quick_route_check
            }
        except Exception:
            try:
                from engine.route_engine import calculate_optimized_routes, quick_route_check
                _route_engine = {
                    "full": calculate_optimized_routes,
                    "quick": quick_route_check
                }
            except Exception:
                _route_engine = False
    return _route_engine if _route_engine else None

# ============================================================
# TEST CONSTANTS
# ============================================================
TEST_START_LAT = 13.05
TEST_START_LON = 80.30
TEST_END_LAT = 13.50
TEST_END_LON = 80.50
TEST_VESSEL_TYPE = "small_boat"
TEST_SOURCE = "all"

# ============================================================
# HELPERS
# ============================================================
def _now_iso():
    return datetime.now().isoformat()

def _normalize_route_source(source="all"):
    s = str(source or "all").strip().lower()
    aliases = {
        "fast": "fastest",
        "quick": "fastest",
        "safe": "safest",
        "secure": "safest",
        "optimal": "balanced",
        "best": "balanced",
    }
    return aliases.get(s, s)

# ============================================================
# MAIN ROUTE TOOL
# ============================================================
def get_optimized_route(
    start_lat, start_lon,
    end_lat, end_lon,
    vessel_type="small_boat",
    source="all"
):
    """
    AI Tool: Get optimized routes between two points.
    source="all"      → fastest + safest + balanced
    source="fastest"  → fastest only
    source="safest"   → safest only
    source="balanced" → balanced only
    """
    engine = _get_route_engine()
    if not engine:
        return {
            "status": "error",
            "error": "route_engine not available",
            "tool": "route_optimizer_tool.get_optimized_route"
        }

    req = _normalize_route_source(source)

    # Get full route calculation
    full_result = engine["full"](
        float(start_lat), float(start_lon),
        float(end_lat), float(end_lon),
        vessel_type
    )

    if not isinstance(full_result, dict):
        return {
            "status": "error",
            "error": "Route engine returned invalid data",
            "tool": "route_optimizer_tool.get_optimized_route"
        }

    # Filter by source
    if req == "all":
        result = full_result
    elif req in ("fastest", "safest", "balanced"):
        routes = full_result.get("routes", {})
        selected = routes.get(req, {})
        result = {
            "tool": "route_optimizer_tool.get_optimized_route",
            "generated_at": full_result.get("generated_at"),
            "origin": full_result.get("origin"),
            "destination": full_result.get("destination"),
            "vessel_type": vessel_type,
            "route_type": req,
            "route": selected,
            "overall_verdict": full_result.get("overall_verdict"),
            "clearance_status": full_result.get("multi_agent_clearance", {}).get("clearance_status"),
            "multi_agent_clearance": full_result.get("multi_agent_clearance"),
            "total_distance_km": full_result.get("total_distance_km"),
            "data_sources": full_result.get("data_sources", []),
        }
    else:
        result = full_result

    result["tool"] = "route_optimizer_tool.get_optimized_route"
    result["source_requested"] = req
    return result

# ============================================================
# QUICK ROUTE CHECK (lightweight)
# ============================================================
def get_quick_route_check(
    start_lat, start_lon,
    end_lat, end_lon,
    vessel_type="small_boat"
):
    """
    AI Tool: Quick route verdict without full GeoJSON.
    """
    engine = _get_route_engine()
    if not engine:
        return {
            "status": "error",
            "error": "route_engine not available",
            "tool": "route_optimizer_tool.get_quick_route_check"
        }

    result = engine["quick"](
        float(start_lat), float(start_lon),
        float(end_lat), float(end_lon),
        vessel_type
    )
    result["tool"] = "route_optimizer_tool.get_quick_route_check"
    return result

# ============================================================
# ROUTE GEOJSON (for frontend map rendering)
# ============================================================
def get_route_geojson(
    start_lat, start_lon,
    end_lat, end_lon,
    vessel_type="small_boat",
    route_type="balanced"
):
    """
    Returns GeoJSON LineString for frontend map rendering.
    route_type: fastest | safest | balanced
    """
    engine = _get_route_engine()
    if not engine:
        return {
            "status": "error",
            "error": "route_engine not available",
            "tool": "route_optimizer_tool.get_route_geojson"
        }

    full_result = engine["full"](
        float(start_lat), float(start_lon),
        float(end_lat), float(end_lon),
        vessel_type
    )

    routes = full_result.get("routes", {})
    selected = routes.get(route_type, routes.get("balanced", {}))

    return {
        "tool": "route_optimizer_tool.get_route_geojson",
        "generated_at": _now_iso(),
        "route_type": route_type,
        "geojson": selected.get("geojson"),
        "distance_km": selected.get("distance_km"),
        "risk_score": selected.get("risk_score"),
        "verdict": selected.get("verdict"),
        "hazards": selected.get("hazards", []),
    }

# ============================================================
# TEST RUN
# ============================================================
if __name__ == "__main__":
    print("=" * 70)
    print("ROUTE OPTIMIZER TOOL — PHASE B6 TEST RUN")
    print("=" * 70)

    # Test 1: Full route (all 3 options)
    print(f"\n📦 get_optimized_route source='all' =>")
    all_result = get_optimized_route(
        TEST_START_LAT, TEST_START_LON,
        TEST_END_LAT, TEST_END_LON,
        TEST_VESSEL_TYPE,
        source="all"
    )
    # Print summary
    summary = {
        "status": all_result.get("status"),
        "total_distance_km": all_result.get("total_distance_km"),
        "overall_verdict": all_result.get("overall_verdict"),
        "routes": {
            "fastest": {
                "distance_km": all_result["routes"]["fastest"]["distance_km"],
                "risk_score": all_result["routes"]["fastest"]["risk_score"],
                "verdict": all_result["routes"]["fastest"]["verdict"],
            },
            "safest": {
                "distance_km": all_result["routes"]["safest"]["distance_km"],
                "risk_score": all_result["routes"]["safest"]["risk_score"],
                "verdict": all_result["routes"]["safest"]["verdict"],
            },
            "balanced": {
                "distance_km": all_result["routes"]["balanced"]["distance_km"],
                "risk_score": all_result["routes"]["balanced"]["risk_score"],
                "verdict": all_result["routes"]["balanced"]["verdict"],
            },
        },
    }
    print(json.dumps(summary, indent=1, default=str))

    # Test 2: Safest route only
    print(f"\n📦 get_optimized_route source='safest' =>")
    safest_result = get_optimized_route(
        TEST_START_LAT, TEST_START_LON,
        TEST_END_LAT, TEST_END_LON,
        TEST_VESSEL_TYPE,
        source="safest"
    )
    print(json.dumps(safest_result, indent=1, default=str))

    # Test 3: Quick route check
    print(f"\n📦 get_quick_route_check =>")
    quick = get_quick_route_check(
        TEST_START_LAT, TEST_START_LON,
        TEST_END_LAT, TEST_END_LON,
        TEST_VESSEL_TYPE
    )
    print(json.dumps(quick, indent=1, default=str))

    # Test 4: GeoJSON for map
    print(f"\n📦 get_route_geojson route_type='balanced' =>")
    geojson = get_route_geojson(
        TEST_START_LAT, TEST_START_LON,
        TEST_END_LAT, TEST_END_LON,
        TEST_VESSEL_TYPE,
        route_type="balanced"
    )
    # Print without full coordinates
    geojson_summary = {k: v for k, v in geojson.items() if k != "geojson"}
    geojson_summary["geojson_coordinates_count"] = len(
        geojson.get("geojson", {}).get("coordinates", [])
    )
    print(json.dumps(geojson_summary, indent=1, default=str))

    print("\n✅ ROUTE OPTIMIZER TOOL TEST COMPLETE")
    print("\nCALL LIST:")
    print("  py .\\tools\\route_optimizer_tool.py")
    print('  py -c "import sys; sys.path.insert(0,\'tools\'); from route_optimizer_tool import get_optimized_route; import json; print(json.dumps(get_optimized_route(13.05, 80.30, 13.50, 80.50), indent=1, default=str))"')
    print('  py -c "import sys; sys.path.insert(0,\'tools\'); from route_optimizer_tool import get_quick_route_check; import json; print(json.dumps(get_quick_route_check(13.05, 80.30, 13.50, 80.50), indent=1, default=str))"')
    print('  py -c "import sys; sys.path.insert(0,\'tools\'); from route_optimizer_tool import get_route_geojson; import json; print(json.dumps(get_route_geojson(13.05, 80.30, 13.50, 80.50), indent=1, default=str))"')