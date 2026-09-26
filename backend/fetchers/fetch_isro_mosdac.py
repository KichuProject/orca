"""
fetch_isro_mosdac.py — ISRO MOSDAC site file (function-based).
Covers: Ocean Surface Currents (ISRO_CURRENT_TOT via SSO download)
        + 6 satellite products refreshed via official mdapi (config.json):
          E06OCM_L4_AC (Oceansat-3 Chl) | E06SCT_L4_AWV6HOURLY (wind)
          E06SCT_L4_UI (upwelling)      | 3SIMG_L3B_SST_DLY (SST)
          3SIMG_L3G_IMR_DLY (rain)      | 3SIMG_L2B_CTP (cloud top / lightning)
Rules: zero top-level exec | per-variable functions | dynamic dates |
       TEST_* only in __main__ | primary -> fallback (fallback callable
       directly, never from __main__) | TEST RUN prints full result data.
"""
import json, os, subprocess, sys
from pathlib import Path
from datetime import datetime, timedelta
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parents[1] / ".env")
except ImportError:
    pass

import requests
from bs4 import BeautifulSoup as _BS

# ================= CONFIG (dynamic defaults) =================
MOSDAC_BASE = Path(r"E:\sih\data\live_cache\mosdac")
CUR_DIR     = MOSDAC_BASE / "mosdac_currents"
MDAPI_DIR   = Path(r"E:\sih\backend\mosdac_api")
for _d in (CUR_DIR, MDAPI_DIR):
    _d.mkdir(parents=True, exist_ok=True)

MOSDAC_CUR_URL = "https://www.mosdac.gov.in/opendata/ocean_surface_current/"
MOSDAC_USER = (os.getenv("MOSDAC_USERNAME") or os.getenv("EARTHDATA_USERNAME") or "").strip()
MOSDAC_PASS = (os.getenv("MOSDAC_PASSWORD") or os.getenv("EARTHDATA_PASSWORD") or "").strip()
DEFAULT_BBOX_STR = "68.0,5.0,94.0,25.0"

# (datasetId, subfolder, days_back, count) — count="1" = latest file only
DATASETS = [
    ("E06OCM_L4_AC",         "oceansat3_chl",   2, "1"),
    ("E06SCT_L4_AWV6HOURLY", "eos06_wind",      1, "1"),
    ("E06SCT_L4_UI",         "eos06_upwelling", 2, "1"),
    ("3SIMG_L3B_SST_DLY",    "insat3ds_sst",    2, "1"),
    ("3SIMG_L3G_IMR_DLY",    "insat3ds_rain",   2, "1"),
    ("3SIMG_L2B_CTP",        "insat3ds_ctp",    1, "1"),
]

# ---- Hardcoded TEST constants (used ONLY by __main__ test runs) ----
TEST_RUN_REFRESH = True      # set False to skip mdapi refresh during test run
TEST_BBOX_STR    = DEFAULT_BBOX_STR

# ================= HELPERS =================
def _latest_file(subfolder, exts=(".nc", ".nc4", ".h5")):
    cands = []
    for e in exts:
        cands += list((MOSDAC_BASE / subfolder).rglob(f"*{e}"))
    return sorted(cands, key=lambda p: p.stat().st_mtime)[-1] if cands else None

def _file_info(p):
    age_h = round((datetime.now().timestamp() - p.stat().st_mtime) / 3600, 1)
    return {"file": p.name, "path": str(p),
            "size_mb": round(p.stat().st_size / 1e6, 2), "age_hours": age_h}

# ================= 1. OCEAN SURFACE CURRENTS (SSO) =================
def _md_session():
    """Login via MOSDAC Keycloak SSO form -> authenticated session with cookies."""
    s = requests.Session()
    s.headers.update({"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
    r = s.get(MOSDAC_CUR_URL, allow_redirects=True, timeout=30)   # lands on login page
    form = _BS(r.text, "html.parser").find("form")
    if not form or not form.get("action"):
        print("  ⚠️ no login form found"); return None
    r2 = s.post(form.get("action"),
                data={"username": MOSDAC_USER, "password": MOSDAC_PASS},
                allow_redirects=True, timeout=30)
    print(f"  SSO login -> {r2.status_code}")
    return s if r2.status_code == 200 else None

def fetch_mosdac_currents_fallback():
    """FALLBACK: keep last good current file on disk. (callable directly)"""
    old = sorted(CUR_DIR.glob("ISRO_CURRENT_TOT_*.nc"), key=lambda p: p.stat().st_mtime)
    if old:
        return {"status": "stale_cache", "variable": "currents", **_file_info(old[-1])}
    return {"status": "failed", "variable": "currents", "error": "no MOSDAC current file on disk"}

def fetch_mosdac_currents():
    """PRIMARY: SSO login + probe latest daily file (site lags ~3 days)."""
    s = _md_session()
    if s:
        today = datetime.now()
        for lag in range(2, 21):                       # newest first
            d = today - timedelta(days=lag)
            y, dmy, ymd = d.strftime("%Y"), d.strftime("%d%m%Y"), d.strftime("%Y%m%d")
            fname = f"ISRO_CURRENT_TOT_{ymd}.nc"
            try:
                r = s.get(f"{MOSDAC_CUR_URL}{y}/{dmy}/{fname}", timeout=120)
            except Exception:
                continue
            if r.status_code == 200 and (r.content[:4] == b"\x89HDF" or r.content[:3] == b"CDF"):
                canon = CUR_DIR / fname
                canon.write_bytes(r.content)
                for old in CUR_DIR.glob("*.nc"):       # keep only latest (no '(1)')
                    if old.name != fname:
                        old.unlink()
                print(f"✅ MOSDAC current saved: {fname} ({canon.stat().st_size/1e6:.1f} MB)")
                return {"status": "success", "variable": "currents", **_file_info(canon)}
            print(f"  miss lag={lag} ({dmy}) status={r.status_code}")
    print("  ⚠️ currents primary failed -> fallback (last good file)")
    return fetch_mosdac_currents_fallback()

# ================= 2. mdapi REFRESH (6 satellite products) =================
def _write_mdapi_config(ds_id, start, end, count, out_dir, bbox):
    """Exact config.json structure required by official mdapi.py."""
    cfg = {
        "user_credentials": {"username/email": MOSDAC_USER, "password": MOSDAC_PASS},
        "search_parameters": {"datasetId": ds_id, "startTime": start, "endTime": end,
                              "count": count, "boundingBox": bbox, "gId": ""},
        "download_settings": {"download_path": str(out_dir), "organize_by_date": False,
                              "skip_user_input": True, "generate_error_logs": True,
                              "error_logs_dir": str(MDAPI_DIR / "error_logs")}
    }
    (MDAPI_DIR / "config.json").write_text(json.dumps(cfg, indent=4), encoding="utf-8")

def refresh_dataset_fallback(sub, ds_id=None):
    """FALLBACK: report last good file already on disk. (callable directly)"""
    f = _latest_file(sub)
    if f:
        return {"status": "stale_cache", "dataset": ds_id or sub, **_file_info(f)}
    return {"status": "failed", "dataset": ds_id or sub, "error": f"no file in {sub}"}

def _cleanup_old_files(subfolder, keep_all=False):
    """Keep only the latest data file in the subfolder, delete older dated ones."""
    if keep_all:
        return  # Skip cleanup if fetching a historical range
        
    folder = MOSDAC_BASE / subfolder
    if not folder.exists():
        return
    
    exts = (".nc", ".nc4", ".h5", ".hdf", ".tif", ".he5", ".bz2", ".gz")
    cands = []
    for e in exts:
        cands += list(folder.rglob(f"*{e}"))
        
    cands = list(set(cands))
    if not cands:
        return
        
    # Sort by modification time, newest first
    cands.sort(key=lambda p: p.stat().st_mtime, reverse=True)
    
    # Keep the newest, delete the rest
    for old_file in cands[1:]:
        try:
            old_file.unlink()
            print(f"  🧹 Removed old file: {old_file.name}")
        except Exception:
            pass
        
def refresh_dataset(ds_id, sub, days_back=2, count="1", bbox=DEFAULT_BBOX_STR, start_date=None, end_date=None):
    """
    PRIMARY: run official mdapi.py with generated config.
    - Default (no dates): Fetches the latest available file.
    - Custom (start_date/end_date): Fetches data for the specific date or range.
    """
    today = datetime.now()
    is_custom_range = (start_date is not None or end_date is not None)
    
    if not is_custom_range:
        # Default behavior: latest data
        start = (today - timedelta(days=days_back)).strftime("%Y-%m-%d")
        end   = today.strftime("%Y-%m-%d")
        fetch_count = count
    else:
        # Custom behavior: specific date or range
        start = start_date if start_date else end_date
        end   = end_date if end_date else start_date
        # Allow fetching multiple files if querying a range
        fetch_count = count if count != "1" else "30" 
        
    before = _latest_file(sub)
    try:
        _write_mdapi_config(ds_id, start, end, fetch_count, MOSDAC_BASE / sub, bbox)
        p = subprocess.run([sys.executable, str(MDAPI_DIR / "mdapi.py")],
                           cwd=MDAPI_DIR, input="y\n", text=True,
                           capture_output=True, timeout=600)
        
        # Only cleanup old files if we are just fetching the "latest"
        _cleanup_old_files(sub, keep_all=is_custom_range)
        
        after = _latest_file(sub)
        fresh = after and (before is None or after.stat().st_mtime > before.stat().st_mtime)
        
        if p.returncode == 0 and (fresh or is_custom_range):
            print(f"✅ {ds_id} -> {sub}: Fetched successfully")
            return {"status": "success", "dataset": ds_id, "query_range": f"{start} to {end}", **_file_info(after)}
        elif after:
            print(f"⚠️ {ds_id} -> {sub}: mdapi rc={p.returncode}, using latest on disk: {after.name}")
            return {"status": "stale_cache", "dataset": ds_id, **_file_info(after)}
        raise RuntimeError(f"mdapi rc={p.returncode} no_file_found=True")
    except Exception as e:
        print(f"  ⚠️ {ds_id} primary failed ({str(e)[:60]}) -> fallback")
        _cleanup_old_files(sub, keep_all=is_custom_range)
        return refresh_dataset_fallback(sub, ds_id)

def refresh_all_mosdac(bbox=DEFAULT_BBOX_STR):
    """Refresh all 6 satellite products (primary per dataset, auto-fallback). Defaults to LATEST."""
    results = {}
    for ds_id, sub, days, count in DATASETS:
        print(f"\n=== {ds_id} -> {sub} ===")
        results[sub] = refresh_dataset(ds_id, sub, days, count, bbox)
    return results

# ================= 3. STATUS SNAPSHOT =================
def mosdac_status():
    """Latest file per MOSDAC subfolder (proof of freshness for console/tests)."""
    out = {}
    for _, sub, _, _ in DATASETS:
        f = _latest_file(sub)
        out[sub] = _file_info(f) if f else {"status": "no_file"}
    f = _latest_file("mosdac_currents")
    out["mosdac_currents"] = _file_info(f) if f else {"status": "no_file"}
    return out

# ================= TEST RUN (prints full result data) =================
if __name__ == "__main__":
    print("=" * 70)
    print("ISRO MOSDAC SITE MODULE - TEST RUN (TEST_* constants)")
    print("=" * 70)
    r = fetch_mosdac_currents()
    print("\n📦 fetch_mosdac_currents =>")
    print(json.dumps(r, indent=1))
    if TEST_RUN_REFRESH:
        rr = refresh_all_mosdac(TEST_BBOX_STR)
        print("\n📦 refresh_all_mosdac =>")
        print(json.dumps(rr, indent=1))
    print("\n📦 mosdac_status =>")
    print(json.dumps(mosdac_status(), indent=1))
    print("\nCALL LIST (run any single one):")
    print("  py -c \"import sys; sys.path.insert(0,'fetchers'); from fetch_isro_mosdac import fetch_mosdac_currents; import json; print(json.dumps(fetch_mosdac_currents(), indent=1))\"")
    print("  py -c \"import sys; sys.path.insert(0,'fetchers'); from fetch_isro_mosdac import refresh_dataset; import json; print(json.dumps(refresh_dataset('3SIMG_L3B_SST_DLY','insat3ds_sst'), indent=1))\"")
    print("  py -c \"import sys; sys.path.insert(0,'fetchers'); from fetch_isro_mosdac import mosdac_status; import json; print(json.dumps(mosdac_status(), indent=1))\"")