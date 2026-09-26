"""
tools/argo_tool.py
Tool for querying in-situ subsurface Argo profiling float telemetry in the Indian Ocean.
Wraps fetch_argo_auto.py:
  - Nearest float search
  - CTD vertical profiles (Temperature / Salinity vs Depth)
  - Thermocline and mixed-layer depth analysis
"""
import sys
import json
from pathlib import Path

APP_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = APP_DIR.parent
FETCHERS_DIR = BACKEND_DIR / "fetchers"

for p in [str(APP_DIR), str(BACKEND_DIR), str(FETCHERS_DIR)]:
    if p not in sys.path:
        sys.path.insert(0, p)

try:
    from fetch_argo_auto import (
        get_active_argo_floats,
        get_argo_float_profile,
        get_nearest_argo_float,
        build_argo_summary_cache
    )
except Exception:
    try:
        from backend.fetchers.fetch_argo_auto import (
            get_active_argo_floats,
            get_argo_float_profile,
            get_nearest_argo_float,
            build_argo_summary_cache
        )
    except Exception:
        get_active_argo_floats = get_argo_float_profile = get_nearest_argo_float = build_argo_summary_cache = None

def get_argo_telemetry(lat: float, lon: float, radius_km: float = 600):
    """
    Returns nearest Argo profiling float observations and subsurface CTD profile.
    """
    if not get_nearest_argo_float:
        return {"status": "error", "error": "argo fetcher not available"}

    nearest = get_nearest_argo_float(lat, lon)
    if nearest.get("status") == "success":
        fl = nearest.get("profile") or {}
        return {
            "status": "success",
            "lat": lat,
            "lon": lon,
            "platform_number": fl.get("platform_number"),
            "distance_km": nearest.get("nearest_float", {}).get("distance_km"),
            "observation_time": fl.get("latest_time"),
            "surface_temp_c": fl.get("surface_temp_c"),
            "surface_salinity_psu": fl.get("surface_salinity_psu"),
            "thermocline_depth_m": fl.get("thermocline_depth_m"),
            "max_depth_m": fl.get("max_depth_m"),
            "profile_levels_count": fl.get("profile_levels_count"),
            "vertical_profile": fl.get("vertical_profile", [])[:10],
            "data_sources": ["INCOIS / Ifremer Argo Indian Ocean Array"]
        }
    return {
        "status": "no_floats_in_radius",
        "lat": lat,
        "lon": lon,
        "message": f"No Argo floats within {radius_km} km"
    }

if __name__ == "__main__":
    res = get_argo_telemetry(13.05, 80.30)
    print("Argo Telemetry for Chennai:")
    print(json.dumps(res, indent=2))
