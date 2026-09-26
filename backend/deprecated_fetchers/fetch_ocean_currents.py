"""
fetch_ocean_currents.py  (refactored - same filename)
LIVE ocean currents (uo, vo) from Copernicus Marine Global Physics ANFC.
Rules: no top-level exec | dynamic window | TEST_* only in __main__ |
       primary -> fallback (fallback callable directly, never from __main__) |
       TEST RUN prints full result data.
"""
import json
from pathlib import Path
from datetime import datetime, timedelta, timezone

try:
    import copernicusmarine
except ImportError:
    copernicusmarine = None
try:
    import numpy as np
    import xarray as xr
    HAS_XR = True
except ImportError:
    HAS_XR = False

# ================= CONFIG (dynamic) =================
SAVE_DIR = Path(r"E:\sih\data\live_cache\currents")
SAVE_DIR.mkdir(parents=True, exist_ok=True)
MOSDAC_CUR_DIR = Path(r"E:\sih\data\live_cache\mosdac\mosdac_currents")

OUTPUT_NC = SAVE_DIR / "ocean_currents_latest.nc"
OUTPUT_JSON = SAVE_DIR / "currents_live_summary.json"

DEFAULT_BBOX = dict(min_lon=55.0, max_lon=95.0, min_lat=5.0, max_lat=25.0)
SURFACE_DEPTH = 0.49402499198913574

# ---- Hardcoded TEST constants (used ONLY by __main__ test runs) ----
TEST_BBOX = DEFAULT_BBOX

# ================= HELPERS =================
def get_live_window():
    """Dynamic UTC window: now -> now+24h (ANFC forecast always available)."""
    now = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
    return now, now + timedelta(hours=24)

def generate_summary(start, end):
    """Lightweight JSON summary (stats) for AI tools; returns dict."""
    if not HAS_XR:
        return {"status": "no_xarray"}
    ds = xr.open_dataset(OUTPUT_NC)
    dims = [d for d in ("time", "depth") if d in ds["uo"].dims]
    u = ds["uo"].mean(dim=dims).values
    v = ds["vo"].mean(dim=dims).values
    speed = np.sqrt(u ** 2 + v ** 2)
    summary = {
        "source": "Copernicus Marine (Global Physics ANFC)",
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "window_start_utc": start.isoformat(),
        "window_end_utc": end.isoformat(),
        "region": "Indian EEZ (55E-95E, 5N-25N)",
        "depth": "surface (~0.5 m)",
        "avg_speed_ms": round(float(np.nanmean(speed)), 3),
        "max_speed_ms": round(float(np.nanmax(speed)), 3),
        "netcdf_path": str(OUTPUT_NC),
        "status": "SUCCESS",
    }
    OUTPUT_JSON.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    return summary

# ================= PRIMARY =================
def fetch_currents_primary(bbox=DEFAULT_BBOX):
    """PRIMARY: Copernicus ANFC hourly uo/vo, live window now->+24h."""
    if copernicusmarine is None:
        raise RuntimeError("copernicusmarine not installed")
    start, end = get_live_window()
    print(f"[INFO] Fetching LIVE ocean currents: {start.isoformat()} -> {end.isoformat()}")
    copernicusmarine.subset(
        dataset_id="cmems_mod_glo_phy_anfc_0.083deg_PT1H-m",
        dataset_version="202406",
        variables=["uo", "vo"],
        minimum_longitude=bbox["min_lon"], maximum_longitude=bbox["max_lon"],
        minimum_latitude=bbox["min_lat"], maximum_latitude=bbox["max_lat"],
        minimum_depth=SURFACE_DEPTH, maximum_depth=SURFACE_DEPTH,
        start_datetime=start.isoformat(), end_datetime=end.isoformat(),
        output_filename=str(OUTPUT_NC),
        force_download=True, disable_progress_bar=True,
        netcdf_compression_level=1,
        coordinates_selection_method="strict-inside",
    )
    summary = {}
    try:
        summary = generate_summary(start, end)
    except Exception as e:
        print(f"  ⚠️ summary generation failed: {str(e)[:60]}")
    return {"status": "success", "variable": "currents", "file": OUTPUT_NC.name,
            "window_utc": f"{start.isoformat()} → {end.isoformat()}",
            "dataset_id": "cmems_mod_glo_phy_anfc_0.083deg_PT1H-m",
            "summary": summary}

# ================= FALLBACK (callable directly, never from __main__) =================
def fetch_currents_fallback():
    """FALLBACK: keep last good local file (Copernicus nc, else ISRO MOSDAC current)."""
    if OUTPUT_NC.exists():
        out = {"status": "stale_cache", "variable": "currents", "file": OUTPUT_NC.name,
               "source": "Copernicus (last good fetch)"}
        if OUTPUT_JSON.exists():
            try:
                out["summary"] = json.loads(OUTPUT_JSON.read_text(encoding="utf-8"))
            except Exception:
                pass
        return out
    isro = sorted(MOSDAC_CUR_DIR.glob("ISRO_CURRENT_TOT_*.nc"),
                  key=lambda p: p.stat().st_mtime)
    if isro:
        return {"status": "stale_cache", "variable": "currents", "file": isro[-1].name,
                "source": "ISRO MOSDAC (last good fetch)"}
    return {"status": "failed", "variable": "currents",
            "error": "no currents file available"}

# ================= COMBINED (primary -> fallback) =================
def fetch_ocean_currents(bbox=TEST_BBOX):
    try:
        return fetch_currents_primary(bbox)
    except Exception as e1:
        print(f"  ⚠️ currents primary failed ({str(e1)[:70]}) -> fallback")
        return fetch_currents_fallback()

# backward-compatible alias (old name used elsewhere)
fetch_current_ocean_currents = fetch_ocean_currents

# ================= TEST RUN (prints full result data) =================
if __name__ == "__main__":
    print("=" * 70)
    print("OCEAN CURRENTS MODULE - TEST RUN (TEST_* constants)")
    print("=" * 70)
    r = fetch_ocean_currents()
    print("\n📦 fetch_ocean_currents =>")
    print(json.dumps(r, indent=1))
    print("\nCALL LIST (run any single one):")
    print("  py -c \"import sys; sys.path.insert(0,'fetchers'); from fetch_ocean_currents import fetch_ocean_currents; import json; print(json.dumps(fetch_ocean_currents(), indent=1))\"")
    print("  py -c \"import sys; sys.path.insert(0,'fetchers'); from fetch_ocean_currents import fetch_currents_fallback; import json; print(json.dumps(fetch_currents_fallback(), indent=1))\"")