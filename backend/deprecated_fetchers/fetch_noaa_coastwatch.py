"""
fetch_noaa_coastwatch.py
NOAA COASTWATCH / NCEI ERDDAP FETCHER
Collects OISST v2.1 (Optimum Interpolation SST) for Indian Ocean.

Primary: NOAA ERDDAP OPeNDAP / tabledap
Fallback: Cached data

NOAA ERDDAP is 100% OPEN - no authentication needed.

Rules:
- Zero top-level execution
- Everything inside functions
- Dynamic dates/bbox
- TEST_* constants only inside __main__
- Primary -> fallback
"""
import json
import requests
import xarray as xr
from pathlib import Path
from datetime import datetime, timedelta

# ================= PATHS =================
SAVE_DIR = Path(r"E:\sih\data\live_cache\noaa")
NOAA_SST_NC = SAVE_DIR / "noaa_oisst_india.nc"
NOAA_SST_JSON = SAVE_DIR / "noaa_oisst_metadata.json"
NOAA_SST_CSV = SAVE_DIR / "noaa_oisst_india.csv"

# ================= CONFIG =================
# NOAA NCEI ERDDAP server
ERDDAP_BASE = "https://coastwatch.pfeg.noaa.gov/erddap"
OISST_DATASET = "ncdcOisst21"

# Indian Ocean bounding box
INDIA_BBOX = {
    "min_lon": 60.0,
    "max_lon": 100.0,
    "min_lat": 0.0,
    "max_lat": 30.0
}

# ================= TEST CONSTANTS =================
TEST_DAYS = 7
TEST_LAT = 13.05
TEST_LON = 80.30

# ================= HELPERS =================
def _ensure_dirs():
    SAVE_DIR.mkdir(parents=True, exist_ok=True)

def _now_iso():
    return datetime.now().isoformat()

def _save_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(data, indent=1, ensure_ascii=False, default=str),
        encoding="utf-8"
    )
    return path

def _load_json(path):
    try:
        if path.exists():
            return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        pass
    return None

# ================= 1. FETCH SST DATA VIA OPeNDAP =================
def fetch_noaa_sst_opendap(days=TEST_DAYS, bbox=None):
    """
    PRIMARY:
    Downloads OISST v2.1 SST data via OPeNDAP (xarray).
    Returns xarray Dataset with SST for Indian Ocean.
    """
    _ensure_dirs()
    
    if bbox is None:
        bbox = INDIA_BBOX
    
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)
    
    # ERDDAP OPeNDAP URL
    opendap_url = f"{ERDDAP_BASE}/griddap/{OISST_DATASET}.nc"
    
    print(f"🌡️ Fetching NOAA OISST v2.1 via OPeNDAP...")
    print(f"   Period: {start_date.date()} to {end_date.date()}")
    print(f"   BBox: lon [{bbox['min_lon']}, {bbox['max_lon']}], lat [{bbox['min_lat']}, {bbox['max_lat']}]")
    
    try:
        # Build the constrained OPeNDAP URL so the server only sends the Indian Ocean subset
        # This prevents the massive global file from causing an I/O timeout
        time_str = f"({start_date.strftime('%Y-%m-%dT00:00:00Z')}):1:({end_date.strftime('%Y-%m-%dT00:00:00Z')})"
        lat_str = f"({bbox['min_lat']}):1:({bbox['max_lat']})"
        lon_str = f"({bbox['min_lon']}):1:({bbox['max_lon']})"
        
        # Try NCEI first, then CoastWatch
        urls_to_try = [
            f"https://www.ncei.noaa.gov/erddap/griddap/OISST_025deg_Daily.nc?sst[{time_str}][{lat_str}][{lon_str}]",
            f"https://coastwatch.pfeg.noaa.gov/erddap/griddap/ncdcOisst21.nc?sst[{time_str}][{lat_str}][{lon_str}]"
        ]
        
        ds_subset = None
        for url in urls_to_try:
            try:
                print(f"   Trying constrained URL...")
                ds_subset = xr.open_dataset(url)
                break # Success
            except Exception:
                continue
                
        if ds_subset is None:
            raise RuntimeError("All NOAA OPeNDAP servers rejected the subset request.")

        # Save to local NetCDF
        ds_subset.to_netcdf(NOAA_SST_NC)
        
        # Get metadata
        metadata = {
            "status": "success",
            "source": "NOAA OISST v2.1 (Constrained OPeNDAP)",
            "fetched_at": _now_iso(),
            "temporal_range": f"{start_date.date()} to {end_date.date()}",
            "spatial_extent": bbox,
            "variables": list(ds_subset.data_vars),
            "time_steps": len(ds_subset.time) if 'time' in ds_subset.dims else 1,
            "file_saved": str(NOAA_SST_NC),
            "file_size_mb": round(NOAA_SST_NC.stat().st_size / 1e6, 2)
        }
        
        _save_json(NOAA_SST_JSON, metadata)
        ds_subset.close()
        
        print(f"   ✅ Saved: {NOAA_SST_NC}")
        return metadata
        
    except Exception as e:
        print(f"   ⚠️ OPeNDAP failed: {str(e)[:100]}")
        return fetch_noaa_sst_fallback()

# ================= 2. FETCH SST AS CSV (Lightweight) =================
def fetch_noaa_sst_csv(days=TEST_DAYS, bbox=None):
    """
    Fetches OISST data as CSV via ERDDAP tabledap.
    Lighter weight than NetCDF, good for quick analysis.
    """
    _ensure_dirs()
    
    if bbox is None:
        bbox = INDIA_BBOX
    
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)
    
    # ERDDAP tabledap URL for CSV download
    url = f"{ERDDAP_BASE}/griddap/{OISST_DATASET}.csv"
    
    params = {
        "sst": f"[({start_date.strftime('%Y-%m-%dT00:00:00Z')}):1:({end_date.strftime('%Y-%m-%dT00:00:00Z')})][({bbox['min_lat']}):1:({bbox['max_lat']})][({bbox['min_lon']}):1:({bbox['max_lon']})]"
    }
    
    print(f"🌡️ Fetching NOAA OISST as CSV...")
    
    try:
        r = requests.get(url, params=params, timeout=120)
        r.raise_for_status()
        
        # Save CSV
        NOAA_SST_CSV.write_text(r.text, encoding="utf-8")
        
        # Count rows
        lines = r.text.strip().split("\n")
        row_count = len(lines) - 1  # minus header
        
        result = {
            "status": "success",
            "source": "NOAA ERDDAP tabledap (CSV)",
            "dataset": OISST_DATASET,
            "fetched_at": _now_iso(),
            "rows": row_count,
            "file_saved": str(NOAA_SST_CSV),
            "file_size_kb": round(NOAA_SST_CSV.stat().st_size / 1e3, 1) if NOAA_SST_CSV.exists() else 0
        }
        
        print(f"   ✅ Saved: {NOAA_SST_CSV}")
        print(f"   📊 Rows: {row_count}")
        return result
        
    except Exception as e:
        print(f"   ⚠️ CSV fetch failed: {str(e)[:100]}")
        return {"status": "failed", "error": str(e)[:150]}

# ================= 3. READ SST AT POINT =================
def read_noaa_sst_at_point(lat, lon):
    """
    Reads SST value at a specific lat/lon from downloaded NOAA data.
    """
    if not NOAA_SST_NC.exists():
        return {
            "status": "no_data",
            "message": "Run fetch_noaa_sst_opendap() first"
        }
    
    try:
        ds = xr.open_dataset(NOAA_SST_NC)
        
        # Get SST at point (nearest neighbor)
        sst_values = ds["sst"].sel(
            latitude=lat,
            longitude=lon,
            method="nearest"
        )
        
        # Get latest value
        latest_sst = float(sst_values.values[-1])
        
        # Convert Kelvin to Celsius if needed
        if latest_sst > 150:
            latest_sst = latest_sst - 273.15
        
        ds.close()
        
        return {
            "status": "success",
            "lat": lat,
            "lon": lon,
            "sst_celsius": round(latest_sst, 2),
            "source": "NOAA OISST v2.1",
            "resolution": "0.25 degrees (~28 km)"
        }
        
    except Exception as e:
        return {
            "status": "error",
            "error": str(e)[:150]
        }

# ================= 4. COMPARE WITH COPERNICUS =================
def compare_noaa_vs_copernicus(lat, lon):
    """
    Cross-validates NOAA OISST vs Copernicus L4 SST at a point.
    Returns agreement score.
    """
    noaa = read_noaa_sst_at_point(lat, lon)
    
    # Try to read Copernicus
    copernicus_sst = None
    try:
        cop_nc = Path(r"E:\sih\data\live_cache\sst\india_coast_sst_live.nc")
        if cop_nc.exists():
            ds = xr.open_dataset(cop_nc)
            var = "analysed_sst" if "analysed_sst" in ds else list(ds.data_vars)[0]
            val = float(ds[var].sel(latitude=lat, longitude=lon, method="nearest").values[-1])
            if val > 150:
                val = val - 273.15
            copernicus_sst = round(val, 2)
            ds.close()
    except Exception:
        pass
    
    result = {
        "lat": lat,
        "lon": lon,
        "noaa_sst_c": noaa.get("sst_celsius"),
        "copernicus_sst_c": copernicus_sst,
    }
    
    if result["noaa_sst_c"] and result["copernicus_sst_c"]:
        diff = abs(result["noaa_sst_c"] - result["copernicus_sst_c"])
        result["difference_c"] = round(diff, 2)
        result["agreement"] = "HIGH" if diff <= 1.0 else ("MODERATE" if diff <= 2.0 else "LOW")
    
    return result

# ================= FALLBACK =================
def fetch_noaa_sst_fallback():
    """FALLBACK: Use cached NOAA data."""
    old = _load_json(NOAA_SST_JSON)
    if old:
        old["status"] = "stale_cache"
        return old
    return {
        "status": "failed",
        "source": "NOAA CoastWatch",
        "error": "No NOAA cache available"
    }

# ================= MASTER RUNNER =================
def fetch_all_noaa(days=TEST_DAYS):
    """Master runner for NOAA data collection."""
    results = {
        "opendap": fetch_noaa_sst_opendap(days=days),
        "csv": fetch_noaa_sst_csv(days=days),
    }
    return results

# ================= TEST RUN =================
if __name__ == "__main__":
    print("=" * 70)
    print("NOAA COASTWATCH / OISST - TEST RUN")
    print("=" * 70)
    
    # Step 1: Fetch via OPeNDAP
    print("\n📦 Step 1: Fetch OISST via OPeNDAP")
    result1 = fetch_noaa_sst_opendap(days=TEST_DAYS)
    print(json.dumps(result1, indent=1, default=str))
    
    # Step 2: Read at test point
    print("\n📦 Step 2: Read SST at Chennai")
    result2 = read_noaa_sst_at_point(TEST_LAT, TEST_LON)
    print(json.dumps(result2, indent=1))
    
    # Step 3: Compare with Copernicus
    print("\n📦 Step 3: Cross-validate NOAA vs Copernicus")
    result3 = compare_noaa_vs_copernicus(TEST_LAT, TEST_LON)
    print(json.dumps(result3, indent=1))
    
    print("\n✅ NOAA TEST COMPLETE")
    print("\nCALL LIST:")
    print("  py .\\fetchers\\fetch_noaa_coastwatch.py")
    print('  py -c "import sys; sys.path.insert(0,\'fetchers\'); from fetch_noaa_coastwatch import fetch_noaa_sst_opendap; import json; print(json.dumps(fetch_noaa_sst_opendap(), indent=1))"')
    print('  py -c "import sys; sys.path.insert(0,\'fetchers\'); from fetch_noaa_coastwatch import read_noaa_sst_at_point; import json; print(json.dumps(read_noaa_sst_at_point(13.05, 80.30), indent=1))"')
    print('  py -c "import sys; sys.path.insert(0,\'fetchers\'); from fetch_noaa_coastwatch import compare_noaa_vs_copernicus; import json; print(json.dumps(compare_noaa_vs_copernicus(13.05, 80.30), indent=1))"')