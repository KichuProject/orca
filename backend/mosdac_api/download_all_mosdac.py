import json, os, subprocess, sys
from pathlib import Path
from datetime import datetime, timedelta
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parents[1] / ".env")
except ImportError:
    pass

MDAPI_DIR = Path(__file__).parent

# Credentials from .env (never hardcode in source)
USERNAME = (os.getenv("MOSDAC_USERNAME") or os.getenv("EARTHDATA_USERNAME") or "").strip()
PASSWORD = (os.getenv("MOSDAC_PASSWORD") or os.getenv("EARTHDATA_PASSWORD") or "").strip()

BASE = Path(r"E:/sih/data/live_cache/mosdac")

# (datasetId, subfolder, days_back, count)
# (datasetId, subfolder, days_back, count)
# count="1" ensures we ONLY download the single latest file!
DATASETS = [
    ("E06OCM_L4_AC",         "oceansat3_chl",   2, "1"),  # Latest daily Chlorophyll
    ("E06SCT_L4_AWV6HOURLY", "eos06_wind",      1, "1"),  # Latest 6-hourly Wind
    ("E06SCT_L4_UI",         "eos06_upwelling", 2, "1"),  # Latest daily Upwelling
    ("3SIMG_L3B_SST_DLY",    "insat3ds_sst",    2, "1"),  # Latest daily SST
    ("3SIMG_L3G_IMR_DLY",    "insat3ds_rain",   2, "1"),  # Latest daily Rain
    ("3SIMG_L2B_CTP",        "insat3ds_ctp",    1, "1"),  # Latest half-hourly Cloud Top
]

def download_all():
    today = datetime.now()
    for ds_id, sub, days, count in DATASETS:
        start_date = (today - timedelta(days=days)).strftime("%Y-%m-%d")
        end_date = today.strftime("%Y-%m-%d")
        
        # Exact JSON structure required by mdapi
        cfg = {
            "user_credentials": {
                "username/email": USERNAME,
                "password": PASSWORD
            },
            "search_parameters": {
                "datasetId": ds_id,
                "startTime": start_date,
                "endTime": end_date,
                "count": count,
                "boundingBox": "68.0,5.0,94.0,25.0",
                "gId": ""
            },
            "download_settings": {
                "download_path": str(BASE / sub),
                "organize_by_date": False,
                "skip_user_input": True,       # True for background automation
                "generate_error_logs": True,
                "error_logs_dir": str(MDAPI_DIR / "error_logs")
            }
        }
        
        # Write config.json
        (MDAPI_DIR / "config.json").write_text(json.dumps(cfg, indent=4))
        print(f"\n=== {ds_id} -> {sub} ===")
        
        # Run mdapi.py (auto-answers "y" just in case the prompt still appears)
        subprocess.run([sys.executable, str(MDAPI_DIR / "mdapi.py")],
                       cwd=MDAPI_DIR,
                       input="y\n",
                       text=True,
                       timeout=900)

    print("\n✅ ALL MOSDAC DOWNLOADS COMPLETE")

if __name__ == "__main__":
    download_all()