"""
fetch_copernicus_satellite.py — COPERNICUS MARINE site file (function-based).
Variables: SST | Chlorophyll (L4 gap-free) | Salinity | Water quality (no3+o2)
           | Ocean currents (uo/vo) | AI-generated PFZ (merged with INCOIS).
Rules: zero top-level exec | per-variable functions | dynamic dates/bbox |
       TEST_* only in __main__ | primary -> fallback (fallback callable directly,
       never from __main__) | TEST RUN prints full result data + call list.
"""
import json
from pathlib import Path
from datetime import datetime, timedelta, timezone

try:
    import copernicusmarine
except ImportError:
    copernicusmarine = None
try:
    import xarray as xr
    import numpy as np
except ImportError:
    xr = np = None

# ================= CONFIG (dynamic) =================
SAVE_DIR = Path(r"E:\sih\data\live_cache\sst")
CUR_DIR  = Path(r"E:\sih\data\live_cache\currents")
PFZ_DIR  = Path(r"E:\sih\data\live_cache\pfz")
for _d in (SAVE_DIR, CUR_DIR, PFZ_DIR):
    _d.mkdir(parents=True, exist_ok=True)

DEFAULT_BBOX = dict(min_lon=65.0, max_lon=95.0, min_lat=5.0, max_lat=25.0)

# ---- Hardcoded TEST constants (used ONLY by __main__ test runs) ----
TEST_BBOX = DEFAULT_BBOX
TEST_LAG  = 3

SECTORS = {
    "GUJARAT": (20.2, 24.5, 68.0, 73.5), "MAHARASHTRA": (15.0, 20.2, 71.5, 74.0),
    "GOA": (14.4, 16.0, 73.0, 74.5), "KARNATAKA": (11.5, 15.0, 73.5, 75.5),
    "KERALA": (7.5, 12.5, 74.0, 77.5), "SOUTH_TAMILNADU": (7.5, 10.5, 77.5, 80.0),
    "NORTH_TAMILNADU": (10.0, 13.6, 79.0, 80.6), "SOUTH_ANDHRA": (13.6, 16.2, 79.5, 82.5),
    "NORTH_ANDHRA": (16.0, 19.0, 82.3, 85.5), "ODISHA": (19.0, 21.7, 85.5, 88.5),
    "WEST_BENGAL": (21.7, 22.5, 87.0, 89.5), "ANDAMAN": (10.0, 14.0, 92.0, 94.0),
    "NICOBAR": (6.0, 10.0, 92.0, 94.0), "LAKSHADWEEP": (8.0, 14.0, 71.0, 74.0),
}

# ================= HELPERS =================
def _window(lag_days):
    t = datetime.utcnow() - timedelta(days=lag_days)
    return (t.strftime("%Y-%m-%dT00:00:00"), t.strftime("%Y-%m-%dT23:59:59"),
            t.strftime("%Y-%m-%d"))

def _subset(ds_id, variables, bbox, start, end, fname, out_dir=SAVE_DIR, extra=None):
    if copernicusmarine is None:
        raise RuntimeError("copernicusmarine not installed")
    #  delete old + "(1)" duplicates FIRST -> toolbox can never create "name (1).nc"
    stem = Path(fname).stem
    for old in out_dir.glob(f"{stem}*.nc"):
        try:
            old.unlink()
        except Exception:
            pass
    kwargs = dict(
        dataset_id=ds_id, variables=variables,
        minimum_longitude=bbox["min_lon"], maximum_longitude=bbox["max_lon"],
        minimum_latitude=bbox["min_lat"], maximum_latitude=bbox["max_lat"],
        start_datetime=start, end_datetime=end,
        output_filename=fname, output_directory=str(out_dir), overwrite=True)
    if extra:
        kwargs.update(extra)
    copernicusmarine.subset(**kwargs)
    return out_dir / fname

def _mean(nc_path, var_candidates, kelvin=False):
    if xr is None:
        raise RuntimeError("xarray not installed")
    ds = xr.open_dataset(nc_path)
    var = next((v for v in var_candidates if v in ds.data_vars), None)
    if var is None:
        ds.close(); raise KeyError(f"none of {var_candidates} in {nc_path.name}")
    arr = ds[var]
    if "depth" in arr.dims:
        arr = arr.isel(depth=0)
    val = float(arr.mean().values)
    ds.close()
    if kelvin and val > 150:
        val -= 273.15
    return var, round(val, 4)

def _stale(var_candidates, fname, kelvin=False, key="value"):
    """Last-resort: read existing local file (demo-safe)."""
    p = SAVE_DIR / fname
    if p.exists():
        try:
            var, val = _mean(p, var_candidates, kelvin)
            return {"status": "stale_cache", "file": fname, "variable": var, key: val}
        except Exception:
            pass
    return None

# ================= 1. SST =================
def fetch_sst_primary(bbox=DEFAULT_BBOX, lag_days=3):
    """PRIMARY: Met Office L4 NRT analysed_sst."""
    s, e, day = _window(lag_days)
    p = _subset("METOFFICE-GLO-SST-L4-NRT-OBS-SST-V2", ["analysed_sst"], bbox, s, e,
                "india_coast_sst_live.nc")
    var, val = _mean(p, ["analysed_sst"], kelvin=True)
    return {"status": "success", "variable": "sst", "file": p.name,
            "average_celsius": val, "target_date": day,
            "dataset_id": "METOFFICE-GLO-SST-L4-NRT-OBS-SST-V2"}

def fetch_sst_fallback(bbox=DEFAULT_BBOX, lag_days=3):
    """FALLBACK: restructured CMEMS id, then stale cache. (callable directly)"""
    try:
        s, e, day = _window(lag_days)
        p = _subset("cmems_obs-sst_glo_phy-sst_L4-nrt_010_001", ["analysed_sst"],
                    bbox, s, e, "india_coast_sst_live.nc")
        var, val = _mean(p, ["analysed_sst"], kelvin=True)
        return {"status": "success", "variable": "sst", "file": p.name,
                "average_celsius": val, "target_date": day,
                "dataset_id": "cmems_obs-sst_glo_phy-sst_L4-nrt_010_001"}
    except Exception:
        old = _stale(["analysed_sst"], "india_coast_sst_live.nc", True, "average_celsius")
        if old:
            return old
        raise

def fetch_sst(bbox=TEST_BBOX, lag_days=TEST_LAG):
    try:
        return fetch_sst_primary(bbox, lag_days)
    except Exception as e1:
        print(f"  ⚠️ sst primary failed ({str(e1)[:70]}) -> fallback")
        try:
            return fetch_sst_fallback(bbox, lag_days)
        except Exception as e2:
            return {"status": "failed", "variable": "sst", "error": str(e2)[:100]}

# ================= 2. CHLOROPHYLL (L4 gap-free) =================
def fetch_chlorophyll_primary(bbox=DEFAULT_BBOX, lag_days=3):
    """PRIMARY: OC CCI/OLCI L4 gap-free 4 km (tries all known var names)."""
    s, e, day = _window(lag_days)
    ds_id = "cmems_obs-oc_glo_bgc-plankton_nrt_l4-gapfree-multi-4km_P1D"
    for var in ["CHL", "Chl", "chlor_a", "CHLA", "chl"]:
        try:
            p = _subset(ds_id, [var], bbox, s, e, "india_coast_chlorophyll_live.nc")
            _, val = _mean(p, [var])
            return {"status": "success", "variable": "chlorophyll", "file": p.name,
                    "average_mg_m3": val, "target_date": day, "dataset_id": ds_id}
        except Exception:
            continue
    raise RuntimeError("no CHL variable matched in primary dataset")

def fetch_chlorophyll_fallback(bbox=DEFAULT_BBOX, lag_days=3):
    """FALLBACK: legacy OceanColour id, then stale cache. (callable directly)"""
    try:
        s, e, day = _window(lag_days)
        p = _subset("OCEANCOLOUR_GLO_BGC_L4_NRT_009_101", ["chl"], bbox, s, e,
                    "india_coast_chlorophyll_live.nc")
        _, val = _mean(p, ["chl"])
        return {"status": "success", "variable": "chlorophyll", "file": p.name,
                "average_mg_m3": val, "target_date": day,
                "dataset_id": "OCEANCOLOUR_GLO_BGC_L4_NRT_009_101"}
    except Exception:
        old = _stale(["CHL", "chl"], "india_coast_chlorophyll_live.nc", False, "average_mg_m3")
        if old:
            return old
        raise

def fetch_chlorophyll(bbox=TEST_BBOX, lag_days=TEST_LAG):
    try:
        return fetch_chlorophyll_primary(bbox, lag_days)
    except Exception as e1:
        print(f"  ⚠️ chl primary failed ({str(e1)[:70]}) -> fallback")
        try:
            return fetch_chlorophyll_fallback(bbox, lag_days)
        except Exception as e2:
            return {"status": "failed", "variable": "chlorophyll", "error": str(e2)[:100]}

# ================= 3. SALINITY =================
def fetch_salinity_primary(bbox=DEFAULT_BBOX, lag_days=3):
    s, e, day = _window(lag_days)
    p = _subset("cmems_mod_glo_phy-so_anfc_0.083deg_P1D-m", ["so"], bbox, s, e,
                "india_coast_salinity_live.nc")
    _, val = _mean(p, ["so"])
    return {"status": "success", "variable": "salinity", "file": p.name,
            "average_psu": val, "target_date": day,
            "dataset_id": "cmems_mod_glo_phy-so_anfc_0.083deg_P1D-m"}

def fetch_salinity_fallback(bbox=DEFAULT_BBOX, lag_days=3):
    try:
        s, e, day = _window(lag_days)
        p = _subset("GLOBAL_ANALYSISFORECAST_PHY_001_024", ["so"], bbox, s, e,
                    "india_coast_salinity_live.nc")
        _, val = _mean(p, ["so"])
        return {"status": "success", "variable": "salinity", "file": p.name,
                "average_psu": val, "target_date": day,
                "dataset_id": "GLOBAL_ANALYSISFORECAST_PHY_001_024"}
    except Exception:
        old = _stale(["so"], "india_coast_salinity_live.nc", False, "average_psu")
        if old:
            return old
        raise

def fetch_salinity(bbox=TEST_BBOX, lag_days=TEST_LAG):
    try:
        return fetch_salinity_primary(bbox, lag_days)
    except Exception as e1:
        print(f"  ⚠️ salinity primary failed ({str(e1)[:70]}) -> fallback")
        try:
            return fetch_salinity_fallback(bbox, lag_days)
        except Exception as e2:
            return {"status": "failed", "variable": "salinity", "error": str(e2)[:100]}

# ================= 4. WATER QUALITY / POLLUTION (BGC) =================
def fetch_water_quality_primary(bbox=DEFAULT_BBOX, lag_days=3):
    """PRIMARY: split BGC datasets (nitrate + oxygen)."""
    s, e, day = _window(lag_days)
    jobs = [("cmems_mod_glo_bgc-nut_anfc_0.25deg_P1D-m", "no3", "india_coast_nitrate_live.nc"),
            ("cmems_mod_glo_bgc-bio_anfc_0.25deg_P1D-m", "o2", "india_coast_oxygen_live.nc")]
    vals = {}
    for ds_id, var, fname in jobs:
        p = _subset(ds_id, [var], bbox, s, e, fname)
        _, val = _mean(p, [var])
        vals[var] = val
    return {"status": "success", "variable": "water_quality",
            "averages_mmol_m3": vals, "target_date": day,
            "interpretation": "High nitrate + low oxygen = eutrophication / pollution risk"}

def fetch_water_quality_fallback(bbox=DEFAULT_BBOX, lag_days=3):
    """FALLBACK: static ITOPF shipping-lane proxy. (callable directly)"""
    return {"status": "static_proxy", "variable": "water_quality",
            "source": "ITOPF High-Risk Shipping Lanes (static)",
            "message": "BGC unavailable; shipping-lane risk used as pollution proxy"}

def fetch_water_quality(bbox=TEST_BBOX, lag_days=TEST_LAG):
    try:
        return fetch_water_quality_primary(bbox, lag_days)
    except Exception as e1:
        print(f"  ⚠️ water-quality primary failed ({str(e1)[:70]}) -> fallback")
        return fetch_water_quality_fallback(bbox, lag_days)

# ================= 5. OCEAN CURRENTS (uo/vo) =================
# ================= 5. OCEAN CURRENTS (uo/vo) =================
SURFACE_DEPTH = 0.49402499198913574
MOSDAC_CUR_DIR = Path(r"E:\sih\data\live_cache\mosdac\mosdac_currents")
CURRENTS_JSON = CUR_DIR / "currents_live_summary.json"

def _generate_currents_summary(start, end):
    """Lightweight JSON summary for AI tools (same as old fetch_ocean_currents.py)."""
    if xr is None or np is None:
        return {"status": "no_xarray"}
    try:
        ds = xr.open_dataset(CUR_DIR / "ocean_currents_latest.nc")
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
            "netcdf_path": str(CUR_DIR / "ocean_currents_latest.nc"),
            "status": "SUCCESS",
        }
        CURRENTS_JSON.write_text(json.dumps(summary, indent=2), encoding="utf-8")
        ds.close()
        return summary
    except Exception as e:
        print(f"  ⚠️ currents summary failed: {str(e)[:60]}")
        return {}

def fetch_currents_primary(bbox=dict(min_lon=55.0, max_lon=95.0, min_lat=5.0, max_lat=25.0)):
    """PRIMARY: ANFC hourly uo/vo, live window now->+24h, surface depth pinned."""
    now = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
    p = _subset("cmems_mod_glo_phy_anfc_0.083deg_PT1H-m", ["uo", "vo"], bbox,
                now.isoformat(), (now + timedelta(hours=24)).isoformat(),
                "ocean_currents_latest.nc", out_dir=CUR_DIR,
                extra=dict(dataset_version="202406",
                           minimum_depth=SURFACE_DEPTH, maximum_depth=SURFACE_DEPTH,
                           force_download=True, disable_progress_bar=True,
                           netcdf_compression_level=1,
                           coordinates_selection_method="strict-inside"))
    summary = _generate_currents_summary(now, now + timedelta(hours=24))
    return {"status": "success", "variable": "currents", "file": p.name,
            "window_utc": f"{now.isoformat()} → +24h",
            "dataset_id": "cmems_mod_glo_phy_anfc_0.083deg_PT1H-m",
            "summary": summary}

def fetch_currents_fallback():
    """FALLBACK: last good Copernicus nc, else ISRO MOSDAC current. (callable directly)"""
    old = sorted(CUR_DIR.glob("ocean_currents_latest*.nc"), key=lambda q: q.stat().st_mtime)
    if old:
        out = {"status": "stale_cache", "variable": "currents", "file": old[-1].name,
               "source": "Copernicus (last good fetch)"}
        if CURRENTS_JSON.exists():
            try:
                out["summary"] = json.loads(CURRENTS_JSON.read_text(encoding="utf-8"))
            except Exception:
                pass
        return out
    isro = sorted(MOSDAC_CUR_DIR.glob("ISRO_CURRENT_TOT_*.nc"), key=lambda q: q.stat().st_mtime)
    if isro:
        return {"status": "stale_cache", "variable": "currents", "file": isro[-1].name,
                "source": "ISRO MOSDAC (last good fetch)"}
    return {"status": "failed", "variable": "currents", "error": "no currents file available"}

def fetch_currents():
    try:
        return fetch_currents_primary()
    except Exception as e1:
        print(f"  ⚠️ currents primary failed ({str(e1)[:70]}) -> fallback")
        return fetch_currents_fallback()

# backward-compatible aliases (old fetch_ocean_currents.py names)
fetch_ocean_currents = fetch_currents
fetch_current_ocean_currents = fetch_currents

# ================= 6. AI-GENERATED PFZ (SST+Chl, merged with INCOIS) =================
SST_MIN, SST_MAX, CHL_MIN, MIN_PIXELS = 26.0, 30.5, 0.2, 5

def generate_pfz():
    """SST+Chl thresholding → zones → merge with INCOIS live (fills cloud gaps)."""
    if xr is None or np is None:
        return {"status": "failed", "error": "xarray/numpy missing"}
    try:
        ds_sst = xr.open_dataset(SAVE_DIR / "india_coast_sst_live.nc")
        ds_chl = xr.open_dataset(SAVE_DIR / "india_coast_chlorophyll_live.nc")
    except FileNotFoundError as e:
        return {"status": "failed", "error": f"run fetch_sst/fetch_chlorophyll first: {e}"}
    sv = "analysed_sst" if "analysed_sst" in ds_sst else list(ds_sst.data_vars)[0]
    cv = "CHL" if "CHL" in ds_chl else list(ds_chl.data_vars)[0]
    sst = ds_sst[sv].values
    chl = ds_chl[cv].values
    lats = ds_sst["latitude"].values if "latitude" in ds_sst.dims else ds_sst["lat"].values
    lons = ds_sst["longitude"].values if "longitude" in ds_sst.dims else ds_sst["lon"].values
    if sst.ndim == 3: sst = sst[-1]
    if chl.ndim == 3: chl = chl[-1]
    if np.nanmean(sst) > 150: sst = sst - 273.15
    r, c = min(sst.shape[0], chl.shape[0]), min(sst.shape[1], chl.shape[1])
    mask = ((sst[:r, :c] > SST_MIN) & (sst[:r, :c] < SST_MAX) &
            (chl[:r, :c] > CHL_MIN) & ~np.isnan(sst[:r, :c]) & ~np.isnan(chl[:r, :c]))
    ys, xs = np.where(mask)
    zones = {}
    for y, x in zip(ys, xs):
        key = f"{round(float(lats[y]) * 2) / 2}_{round(float(lons[x]) * 2) / 2}"
        zones.setdefault(key, []).append((float(lats[y]), float(lons[x]),
                                          float(sst[y, x]), float(chl[y, x])))
    feats = []
    for key, pts in zones.items():
        if len(pts) < MIN_PIXELS:
            continue
        clat = sum(p[0] for p in pts) / len(pts)
        clon = sum(p[1] for p in pts) / len(pts)
        sec = next((n for n, (a, b, c2, d) in SECTORS.items()
                    if a <= clat <= b and c2 <= clon <= d), "OPEN_OCEAN")
        d = 0.25
        feats.append({"type": "Feature",
                      "properties": {"zone_id": key, "sector": sec, "pixels": len(pts),
                                     "avg_sst_c": round(sum(p[2] for p in pts) / len(pts), 2),
                                     "avg_chl": round(sum(p[3] for p in pts) / len(pts), 3),
                                     "source": "Copernicus L4 (AI-generated PFZ)"},
                      "geometry": {"type": "Polygon", "coordinates": [
                          [[clon - d, clat - d], [clon + d, clat - d], [clon + d, clat + d],
                           [clon - d, clat + d], [clon - d, clat - d]]]}})
    (PFZ_DIR / "self_generated_pfz.geojson").write_text(
        json.dumps({"type": "FeatureCollection", "features": feats}, indent=1),
        encoding="utf-8")
    incois = {}
    if (PFZ_DIR / "india_pfz_live.json").exists():
        incois = json.loads((PFZ_DIR / "india_pfz_live.json").read_text(encoding="utf-8")).get("sectors", {})
    merged = {"title": "Unified PFZ (INCOIS + Copernicus AI fallback)",
              "generated_at": datetime.now().isoformat(), "sectors": {}}
    for name in SECTORS:
        isc = incois.get(name, {})
        if isc.get("status") == "live" and isc.get("pfz_count", 0) > 0:
            merged["sectors"][name] = {"source": "INCOIS_LIVE", "confidence": "HIGH",
                                       "pfz_count": isc["pfz_count"],
                                       "advisories": isc.get("advisories", [])}
        else:
            z = [f for f in feats if f["properties"]["sector"] == name]
            merged["sectors"][name] = ({"source": "COPERNICUS_AI", "confidence": "MODERATE",
                                        "pfz_count": len(z), "zones": z} if z else
                                       {"source": "NO_DATA", "confidence": "NONE", "pfz_count": 0})
    (PFZ_DIR / "unified_pfz_final.json").write_text(json.dumps(merged, indent=1),
                                                    encoding="utf-8")
    hi = sum(1 for s in merged["sectors"].values() if s["source"] == "INCOIS_LIVE")
    ai = sum(1 for s in merged["sectors"].values() if s["source"] == "COPERNICUS_AI")
    return {"status": "success", "variable": "pfz", "zones_generated": len(feats),
            "incois_live_sectors": hi, "copernicus_filled_sectors": ai}

# ================= 7. METADATA SAVER =================
def save_satellite_metadata(results):
    metadata = {"source": "Copernicus Marine Service (live)",
                "scraped_at": datetime.now().isoformat(),
                "bounding_box": DEFAULT_BBOX, "datasets": results}
    (SAVE_DIR / "satellite_metadata.json").write_text(json.dumps(metadata, indent=2),
                                                      encoding="utf-8")
    return metadata

# ================= TEST RUN (prints full result data) =================
if __name__ == "__main__":
    print("=" * 70)
    print("COPERNICUS SITE MODULE - TEST RUN (TEST_* constants)")
    print("=" * 70)
    results = {}
    for fn in (fetch_sst, fetch_chlorophyll, fetch_salinity,
               fetch_water_quality, fetch_currents):
        r = fn()
        results[fn.__name__] = r
        print(f"\n📦 {fn.__name__} =>")
        print(json.dumps(r, indent=1))
    pz = generate_pfz()
    results["generate_pfz"] = pz
    print("\n📦 generate_pfz =>")
    print(json.dumps(pz, indent=1))
    save_satellite_metadata(results)
    print("\n💾 satellite_metadata.json saved")
    print("\nCALL LIST (run any single variable alone):")
    print("  py -c \"import sys; sys.path.insert(0,'fetchers'); from fetch_copernicus_satellite import fetch_salinity; import json; print(json.dumps(fetch_salinity(), indent=1))\"")
    print("  py -c \"import sys; sys.path.insert(0,'fetchers'); from fetch_copernicus_satellite import fetch_sst, fetch_chlorophyll; import json; print(json.dumps(fetch_sst(), indent=1)); print(json.dumps(fetch_chlorophyll(), indent=1))\"")
    print("  py -c \"import sys; sys.path.insert(0,'fetchers'); from fetch_copernicus_satellite import fetch_water_quality, fetch_currents, generate_pfz; import json; print(json.dumps(fetch_water_quality(), indent=1)); print(json.dumps(fetch_currents(), indent=1)); print(json.dumps(generate_pfz(), indent=1))\"")