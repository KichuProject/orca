"""
fetch_nasa_ocean.py
NASA EARTHDATA / OCEAN BIOLOGY FETCHER
Collects MODIS/Aqua Chlorophyll for Indian Ocean region.

Primary: NASA CMR API (metadata + download links)
Fallback: Cached metadata

Rules:
- Zero top-level execution
- Everything inside functions
- Dynamic dates/bbox
- TEST_* constants only inside __main__
- Primary -> fallback
"""
import os
import json
import requests
from pathlib import Path
from datetime import datetime, timedelta
from requests.auth import HTTPBasicAuth
from dotenv import load_dotenv
from pathlib import Path

# Automatically find and load the .env file from the backend folder
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(env_path)
# ================= PATHS =================
SAVE_DIR = Path(r"E:\sih\data\live_cache\nasa_ocean")
NASA_METADATA = SAVE_DIR / "nasa_ocean_metadata.json"
NASA_CHL_LINKS = SAVE_DIR / "nasa_chlorophyll_links.json"

# ================= CONFIG =================
# NASA CMR (Common Metadata Repository) - Open search API
CMR_SEARCH_URL = "https://cmr.earthdata.nasa.gov/search/collections.json"
CMR_GRANULES_URL = "https://cmr.earthdata.nasa.gov/search/granules.json"

# MODIS Aqua Level 3 Chlorophyll dataset
NASA_DATASET_SHORT_NAME = "MODISA_L3m_CHL"

# Indian Ocean bounding box
INDIA_BBOX = {
    "west": 60.0,
    "south": 0.0,
    "east": 100.0,
    "north": 30.0
}

# ================= TEST CONSTANTS =================
TEST_DAYS = 30
TEST_LIMIT = 10

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

def _get_earthdata_credentials():
    """Gets NASA Earthdata credentials from environment."""
    username = os.getenv("EARTHDATA_USERNAME", "")
    password = os.getenv("EARTHDATA_PASSWORD", "")
    if username and password:
        return (username, password)
    return None

# ================= 1. SEARCH DATASETS (No Auth Needed) =================
def search_nasa_ocean_datasets(days=TEST_DAYS, limit=TEST_LIMIT):
    """
    PRIMARY:
    Searches NASA CMR for MODIS Aqua Chlorophyll datasets
    covering Indian Ocean. No authentication needed for search.
    """
    _ensure_dirs()
    
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)
    
    params = {
        "short_name": NASA_DATASET_SHORT_NAME,
        "temporal": f"{start_date.strftime('%Y-%m-%dT%H:%M:%S')}Z,{end_date.strftime('%Y-%m-%dT%H:%M:%S')}Z",
        "page_size": limit,
        "sort_key": "-start_date"
    }
    
    print(f"🛰️ Searching NASA CMR for {NASA_DATASET_SHORT_NAME}...")
    print(f"   BBox: {INDIA_BBOX}")
    print(f"   Period: {start_date.date()} to {end_date.date()}")
    
    try:
        r = requests.get(CMR_SEARCH_URL, params=params, timeout=30)
        r.raise_for_status()
        data = r.json()
        
        entries = data.get("feed", {}).get("entry", [])
        datasets = []
        
        for entry in entries:
            datasets.append({
                "title": entry.get("title"),
                "short_name": entry.get("short_name"),
                "version_id": entry.get("version_id"),
                "time_start": entry.get("time_start"),
                "time_end": entry.get("time_end"),
                "dataset_id": entry.get("id"),
                "browse_url": entry.get("browse_url"),
                "opendap_url": next(
                    (link["href"] for link in entry.get("links", []) 
                     if "opendap" in str(link.get("href", "")).lower()),
                    None
                ),
                "download_url": next(
                    (link["href"] for link in entry.get("links", [])
                     if link.get("rel") == "http://esipfed.org/ns/fedsearch/1.1/data#"),
                    None
                )
            })
        
        result = {
            "status": "success",
            "source": "NASA CMR API",
            "dataset": NASA_DATASET_SHORT_NAME,
            "fetched_at": _now_iso(),
            "bounding_box": INDIA_BBOX,
            "temporal_range": f"{start_date.date()} to {end_date.date()}",
            "datasets_found": len(datasets),
            "datasets": datasets
        }
        
        _save_json(NASA_METADATA, result)
        print(f"   ✅ Found {len(datasets)} datasets")
        print(f"   💾 Saved: {NASA_METADATA}")
        return result
        
    except Exception as e:
        print(f"   ⚠️ NASA CMR search failed: {str(e)[:100]}")
        return fetch_nasa_ocean_fallback()

# ================= 2. SEARCH GRANULES (Actual Data Files) =================
def search_nasa_granules(days=TEST_DAYS, limit=TEST_LIMIT):
    """
    Searches for actual downloadable granules (files) of MODIS chlorophyll.
    Returns download links for the Indian Ocean region.
    """
    _ensure_dirs()
    
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)
    
    params = {
        "short_name": NASA_DATASET_SHORT_NAME,
        "bounding_box": f"{INDIA_BBOX['west']},{INDIA_BBOX['south']},{INDIA_BBOX['east']},{INDIA_BBOX['north']}",
        "temporal": f"{start_date.strftime('%Y-%m-%dT%H:%M:%S')}Z,{end_date.strftime('%Y-%m-%dT%H:%M:%S')}Z",
        "page_size": limit,
        "sort_key": "-start_date"
    }
    
    print(f"🛰️ Searching NASA granules (actual files)...")
    
    try:
        r = requests.get(CMR_GRANULES_URL, params=params, timeout=30)
        r.raise_for_status()
        data = r.json()
        
        entries = data.get("feed", {}).get("entry", [])
        granules = []
        
        for entry in entries:
            # Get download links
            links = entry.get("links", [])
            download_links = [
                link for link in links
                if link.get("rel") == "http://esipfed.org/ns/fedsearch/1.1/data#"
                or "https" in str(link.get("href", ""))
            ]
            
            granules.append({
                "title": entry.get("title"),
                "producer_granule_id": entry.get("producer_granule_id"),
                "time_start": entry.get("time_start"),
                "time_end": entry.get("time_end"),
                "size_mb": entry.get("granule_size"),
                "download_links": [
                    {"href": link.get("href"), "type": link.get("type")}
                    for link in download_links[:3]
                ]
            })
        
        result = {
            "status": "success",
            "source": "NASA CMR Granules API",
            "dataset": NASA_DATASET_SHORT_NAME,
            "fetched_at": _now_iso(),
            "granules_found": len(granules),
            "granules": granules,
            "note": "To download files, use Earthdata credentials or OPeNDAP"
        }
        
        _save_json(NASA_CHL_LINKS, result)
        print(f"   ✅ Found {len(granules)} granules with download links")
        print(f"   💾 Saved: {NASA_CHL_LINKS}")
        return result
        
    except Exception as e:
        print(f"   ⚠️ Granule search failed: {str(e)[:100]}")
        old = _load_json(NASA_CHL_LINKS)
        if old:
            old["status"] = "stale_cache"
            return old
        return {"status": "failed", "error": str(e)[:150]}

# ================= 3. FETCH WITH AUTH (Download Actual Files) =================
def download_nasa_chlorophyll(days=TEST_DAYS, limit=3):
    """
    Downloads actual MODIS Aqua chlorophyll files using Earthdata credentials.
    Requires EARTHDATA_USERNAME and EARTHDATA_PASSWORD in .env
    """
    _ensure_dirs()
    
    creds = _get_earthdata_credentials()
    if not creds:
        return {
            "status": "no_credentials",
            "message": "Set EARTHDATA_USERNAME and EARTHDATA_PASSWORD in .env",
            "hint": "Create free account at https://urs.earthdata.nasa.gov/users/new"
        }
    
    # First get granule links
    granules_result = search_nasa_granules(days=days, limit=limit)
    granules = granules_result.get("granules", [])
    
    if not granules:
        return {
            "status": "no_granules",
            "message": "No granules found for download"
        }
    
    downloaded = []
    download_dir = SAVE_DIR / "downloads"
    download_dir.mkdir(parents=True, exist_ok=True)
    
    for granule in granules[:limit]:
        for link in granule.get("download_links", []):
            href = link.get("href")
            if not href or not href.startswith("http"):
                continue
            
            filename = href.split("/")[-1]
            filepath = download_dir / filename
            
            if filepath.exists():
                downloaded.append({"file": filename, "status": "already_exists"})
                continue
            
            print(f"   ⬇️ Downloading: {filename}")
            try:
                r = requests.get(
                    href,
                    auth=HTTPBasicAuth(creds[0], creds[1]),
                    timeout=120,
                    stream=True
                )
                r.raise_for_status()
                
                with open(filepath, "wb") as f:
                    for chunk in r.iter_content(chunk_size=1 << 20):
                        if chunk:
                            f.write(chunk)
                
                size_mb = round(filepath.stat().st_size / 1e6, 2)
                downloaded.append({"file": filename, "status": "success", "size_mb": size_mb})
                print(f"      ✅ Saved ({size_mb} MB)")
                
            except Exception as e:
                downloaded.append({"file": filename, "status": "failed", "error": str(e)[:100]})
                print(f"      ⚠️ Failed: {str(e)[:80]}")
    
    result = {
        "status": "success",
        "source": "NASA Earthdata Download",
        "fetched_at": _now_iso(),
        "downloaded_count": len([d for d in downloaded if d["status"] == "success"]),
        "files": downloaded,
        "save_dir": str(download_dir)
    }
    
    print(f"   ✅ Download complete: {result['downloaded_count']} files")
    return result

# ================= FALLBACK =================
def fetch_nasa_ocean_fallback():
    """FALLBACK: Use cached NASA metadata."""
    old = _load_json(NASA_METADATA)
    if old:
        old["status"] = "stale_cache"
        return old
    return {
        "status": "failed",
        "source": "NASA Earthdata",
        "error": "No NASA metadata cache available"
    }

# ================= MASTER RUNNER =================
def fetch_all_nasa_ocean(days=TEST_DAYS, download=False):
    """
    Master runner for NASA Ocean data collection.
    Set download=True to actually download files (requires credentials).
    """
    results = {
        "dataset_search": search_nasa_ocean_datasets(days=days),
        "granule_search": search_nasa_granules(days=days),
    }
    
    if download:
        results["downloads"] = download_nasa_chlorophyll(days=days)
    
    return results

# ================= TEST RUN =================
if __name__ == "__main__":
    print("=" * 70)
    print("NASA OCEAN BIOLOGY - TEST RUN")
    print("=" * 70)
    
    # Step 1: Search datasets (no auth needed)
    print("\n📦 Step 1: Search Datasets")
    result1 = search_nasa_ocean_datasets(days=TEST_DAYS)
    print(json.dumps(result1, indent=1, default=str))
    
    # Step 2: Search granules (no auth needed)
    print("\n📦 Step 2: Search Granules")
    result2 = search_nasa_granules(days=TEST_DAYS)
    print(json.dumps(result2, indent=1, default=str))
    
    # Step 3: Download (requires credentials)
    print("\n📦 Step 3: Download Files")
    result3 = download_nasa_chlorophyll(days=TEST_DAYS, limit=2)
    print(json.dumps(result3, indent=1, default=str))
    
    print("\n✅ NASA OCEAN TEST COMPLETE")
    print("\nCALL LIST:")
    print("  py .\\fetchers\\fetch_nasa_ocean.py")
    print('  py -c "import sys; sys.path.insert(0,\'fetchers\'); from fetch_nasa_ocean import search_nasa_ocean_datasets; import json; print(json.dumps(search_nasa_ocean_datasets(), indent=1))"')
    print('  py -c "import sys; sys.path.insert(0,\'fetchers\'); from fetch_nasa_ocean import download_nasa_chlorophyll; import json; print(json.dumps(download_nasa_chlorophyll(), indent=1))"')