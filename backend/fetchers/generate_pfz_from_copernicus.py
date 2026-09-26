import xarray as xr
import numpy as np
import json
from pathlib import Path
from datetime import datetime

# ============================================================
# PATHS
# ============================================================
SST_FILE = Path(r"E:\sih\data\live_cache\sst\india_coast_sst_live.nc")
CHL_FILE = Path(r"E:\sih\data\live_cache\sst\india_coast_chlorophyll_live.nc")
INCOIS_FILE = Path(r"E:\sih\data\live_cache\pfz\india_pfz_live.json")
OUT_DIR = Path(r"E:\sih\data\live_cache\pfz")
OUT_DIR.mkdir(parents=True, exist_ok=True)

# ============================================================
# SCIENTIFIC THRESHOLDS (Same logic INCOIS uses)
# ============================================================
SST_MIN = 26.0    # °C - Fish prefer warm water
SST_MAX = 30.5    # °C - Too hot = fish go deeper
CHL_MIN = 0.2     # mg/m³ - Minimum plankton for fish aggregation
MIN_PIXELS = 5    # Minimum pixels to form a valid zone

# ============================================================
# SECTOR BOUNDING BOXES (Same as INCOIS scraper)
# ============================================================
SECTORS = {
    "GUJARAT":         (20.2, 24.5, 68.0, 73.5),
    "MAHARASHTRA":     (15.0, 20.2, 71.5, 74.0),
    "GOA":             (14.4, 16.0, 73.0, 74.5),
    "KARNATAKA":       (11.5, 15.0, 73.5, 75.5),
    "KERALA":          (7.5, 12.5, 74.0, 77.5),
    "SOUTH_TAMILNADU": (7.5, 10.5, 77.5, 80.0),
    "NORTH_TAMILNADU": (10.0, 13.6, 79.0, 80.6),
    "SOUTH_ANDHRA":    (13.6, 16.2, 79.5, 82.5),
    "NORTH_ANDHRA":    (16.0, 19.0, 82.3, 85.5),
    "ODISHA":          (19.0, 21.7, 85.5, 88.5),
    "WEST_BENGAL":     (21.7, 22.5, 87.0, 89.5),
    "ANDAMAN":         (10.0, 14.0, 92.0, 94.0),
    "NICOBAR":         (6.0, 10.0, 92.0, 94.0),
    "LAKSHADWEEP":     (8.0, 14.0, 71.0, 74.0),
}

def generate_unified_pfz(verbose=True):
    """
    Generates PFZ clusters from Copernicus SST + Chlorophyll L4 NetCDFs
    and merges them with INCOIS live data as fallback.
    """
    if verbose:
        print("=" * 60)
        print("🛰️  PHASE 1 GAP FIXER: Generating PFZ from Copernicus")
        print("=" * 60)
        print("\n📂 Loading Copernicus satellite data...")

    if not SST_FILE.exists() or not CHL_FILE.exists():
        if verbose:
            print("   ❌ NetCDF files missing. Run fetch_copernicus_satellite.py first!")
        return {"status": "error", "message": "Copernicus NetCDF files missing"}

    ds_sst = xr.open_dataset(SST_FILE)
    ds_chl = xr.open_dataset(CHL_FILE)
    if verbose:
        print("   ✅ Both NetCDF files loaded")

    # Get variable names dynamically
    sst_var = "analysed_sst" if "analysed_sst" in ds_sst else list(ds_sst.data_vars)[0]
    chl_var = "CHL" if "CHL" in ds_chl else list(ds_chl.data_vars)[0]

    # Extract arrays
    sst_data = ds_sst[sst_var].values
    chl_data = ds_chl[chl_var].values

    if "latitude" in ds_sst.dims:
        lats = ds_sst["latitude"].values
        lons = ds_sst["longitude"].values
    elif "lat" in ds_sst.dims:
        lats = ds_sst["lat"].values
        lons = ds_sst["lon"].values
    else:
        lats = ds_sst[list(ds_sst.dims)[0]].values
        lons = ds_sst[list(ds_sst.dims)[-1]].values

    if sst_data.ndim == 3:
        sst_data = sst_data[-1]
    if chl_data.ndim == 3:
        chl_data = chl_data[-1]

    if np.nanmean(sst_data) > 150:
        sst_data = sst_data - 273.15

    ds_sst.close()
    ds_chl.close()

    sst_good = (sst_data > SST_MIN) & (sst_data < SST_MAX) & ~np.isnan(sst_data)
    chl_good = (chl_data > CHL_MIN) & ~np.isnan(chl_data)

    min_rows = min(sst_good.shape[0], chl_good.shape[0])
    min_cols = min(sst_good.shape[1], chl_good.shape[1])
    sst_mask = sst_good[:min_rows, :min_cols]
    chl_mask = chl_good[:min_rows, :min_cols]
    sst_vals = sst_data[:min_rows, :min_cols]
    chl_vals = chl_data[:min_rows, :min_cols]
    lats_grid = lats[:min_rows]
    lons_grid = lons[:min_cols]

    pfz_mask = sst_mask & chl_mask
    total_good = int(np.sum(pfz_mask))
    if verbose:
        print(f"   ✅ Found {total_good} 'perfect' pixels for fishing")

    ys, xs = np.where(pfz_mask)
    zones = {}
    for y, x in zip(ys, xs):
        lat = float(lats_grid[y])
        lon = float(lons_grid[x])
        zone_key = f"{round(lat * 2) / 2}_{round(lon * 2) / 2}"
        if zone_key not in zones:
            zones[zone_key] = {"lats": [], "lons": [], "sst": [], "chl": []}
        zones[zone_key]["lats"].append(lat)
        zones[zone_key]["lons"].append(lon)
        zones[zone_key]["sst"].append(float(sst_vals[y, x]))
        zones[zone_key]["chl"].append(float(chl_vals[y, x]))

    features = []
    sector_counts = {s: 0 for s in SECTORS}

    for zone_key, data in zones.items():
        if len(data["lats"]) < MIN_PIXELS:
            continue

        center_lat = float(np.mean(data["lats"]))
        center_lon = float(np.mean(data["lons"]))
        avg_sst = float(np.mean(data["sst"]))
        avg_chl = float(np.mean(data["chl"]))

        assigned_sector = "OPEN_OCEAN"
        for sec_name, (lat_min, lat_max, lon_min, lon_max) in SECTORS.items():
            if lat_min <= center_lat <= lat_max and lon_min <= center_lon <= lon_max:
                assigned_sector = sec_name
                sector_counts[sec_name] += 1
                break

        d = 0.25
        ring = [
            [center_lon - d, center_lat - d],
            [center_lon + d, center_lat - d],
            [center_lon + d, center_lat + d],
            [center_lon - d, center_lat + d],
            [center_lon - d, center_lat - d],
        ]

        features.append({
            "type": "Feature",
            "properties": {
                "zone_id": zone_key,
                "sector": assigned_sector,
                "source": "Copernicus L4 Satellite (AI-Generated PFZ)",
                "confidence": "MODERATE",
                "reason": f"SST {avg_sst:.1f}°C + Chl {avg_chl:.2f} mg/m³ = Fish aggregation conditions",
                "avg_sst_celsius": round(avg_sst, 2),
                "avg_chlorophyll_mg_m3": round(avg_chl, 4),
                "pixel_count": len(data["lats"]),
                "generated_at": datetime.now().isoformat(),
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [ring],
            },
        })

    self_pfz_geojson = {
        "type": "FeatureCollection",
        "metadata": {
            "title": "AI-Generated Potential Fishing Zones (Copernicus Satellite)",
            "generated_at": datetime.now().isoformat(),
            "algorithm": f"SST({SST_MIN}-{SST_MAX}°C) + Chl(>{CHL_MIN} mg/m³) thresholding",
            "satellite_source": "Copernicus Marine L4 Gap-Free (cloud-penetrating)",
            "purpose": "Fills INCOIS gaps when optical satellites are blind due to clouds",
            "confidence_note": "MODERATE — L4 interpolated data, not direct optical observation",
        },
        "features": features,
    }

    out_self = OUT_DIR / "self_generated_pfz.geojson"
    out_self.write_text(json.dumps(self_pfz_geojson, indent=1, ensure_ascii=False), encoding="utf-8")

    incois_data = {}
    if INCOIS_FILE.exists():
        try:
            incois_data = json.loads(INCOIS_FILE.read_text(encoding="utf-8"))
        except Exception:
            pass

    merged = {
        "title": "Unified PFZ Advisory (INCOIS + Copernicus AI Fallback)",
        "generated_at": datetime.now().isoformat(),
        "sectors": {},
    }

    for sec_name in SECTORS:
        incois_sector = incois_data.get("sectors", {}).get(sec_name, {})
        incois_status = incois_sector.get("status", "unknown")
        incois_count = incois_sector.get("pfz_count", 0)

        if incois_status == "live" and incois_count > 0:
            merged["sectors"][sec_name] = {
                "source": "INCOIS_LIVE",
                "confidence": "HIGH",
                "pfz_count": incois_count,
                "advisories": incois_sector.get("advisories", []),
                "note": "Official INCOIS advisory (direct satellite observation)",
            }
        else:
            copernicus_zones = [f for f in features if f["properties"]["sector"] == sec_name]
            if copernicus_zones:
                merged["sectors"][sec_name] = {
                    "source": "COPERNICUS_AI_GENERATED",
                    "confidence": "MODERATE",
                    "incois_status": incois_status,
                    "pfz_count": len(copernicus_zones),
                    "zones": copernicus_zones,
                    "note": f"INCOIS status: '{incois_status}'. Generated from Copernicus L4 gap-free satellite data.",
                }
            else:
                merged["sectors"][sec_name] = {
                    "source": "NO_DATA",
                    "confidence": "NONE",
                    "pfz_count": 0,
                    "note": f"No PFZ available (INCOIS: '{incois_status}', Copernicus: no suitable conditions)",
                }

    out_merged = OUT_DIR / "unified_pfz_final.json"
    out_merged.write_text(json.dumps(merged, indent=1, ensure_ascii=False), encoding="utf-8")

    if verbose:
        print("\n" + "=" * 60)
        print("📊 FINAL PFZ STATUS PER SECTOR:")
        print("-" * 60)
        for sec_name, sec_data in merged["sectors"].items():
            src = sec_data["source"]
            conf = sec_data["confidence"]
            count = sec_data["pfz_count"]
            icon = "🟢" if conf == "HIGH" else ("🟡" if conf == "MODERATE" else "🔴")
            print(f"  {icon} {sec_name:<18} {src:<25} {conf:<12} {count}")
        print("=" * 60)

    return {
        "status": "success",
        "zones_count": len(features),
        "unified_pfz_file": str(out_merged),
        "self_generated_file": str(out_self)
    }

if __name__ == "__main__":
    generate_unified_pfz(verbose=True)