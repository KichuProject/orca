"""
alerts_tool.py

ALERTS TOOL - MULTI-SOURCE VERSION

Supports:
    get_local_imd_alert(lat, lon)
    get_imd_text_alerts()
    get_imd_monsoon_status()

Sources:
    source="all"        -> IMD Vision Markdown + IMD Text Alerts
    source="imd_vision" -> Vision-extracted Markdown posters only
    source="imd_text"   -> IMD text scrape only

Rules:
    Zero top-level execution
    Everything inside functions
    Dynamic lat/lon
    TEST_* constants only inside __main__
    Primary -> fallback
    Fallback callable directly
    TEST RUN prints full result data
"""

import sys
import json
from pathlib import Path
from datetime import datetime


# ================= BOOTSTRAP =================

TOOLS_DIR = Path(__file__).resolve().parent

if str(TOOLS_DIR) not in sys.path:
    sys.path.insert(0, str(TOOLS_DIR))


# ================= COMMON IMPORTS =================

try:
    from common import LIVE, load_json, normalize_source, include_source

except ImportError:

    LIVE = Path(r"E:\sih\data\live_cache")

    def load_json(path, default=None):
        try:
            p = Path(path)
            if p.exists():
                return json.loads(p.read_text(encoding="utf-8"))
        except Exception:
            pass
        return default

    def normalize_source(source="all"):
        return str(source or "all").strip().lower()

    def include_source(source, requested_source="all"):
        req = normalize_source(requested_source)
        if req in ("all", "", "any"):
            return True
        return normalize_source(source) == req


# ================= PATHS =================

ALERTS_DIR = LIVE / "alerts"
WEATHER_DIR = LIVE / "weather"

VISION_DIR = ALERTS_DIR / "vision"
IMD_TEXT_FILE = ALERTS_DIR / "imd_fishermen_alerts.json"
IMD_MONSOON_FILE_ALERTS = ALERTS_DIR / "imd_monsoon_status.json"
IMD_MONSOON_FILE_WEATHER = WEATHER_DIR / "imd_monsoon_status.json"


# ================= REGION MAPPING =================

REGION_KEYWORDS = {
    "Tamil Nadu": ["tamil nadu", "chennai", "tuticorin", "nagapattinam"],
    "Kerala": ["kerala", "kochi", "trivandrum", "calicut"],
    "Karnataka": ["karnataka", "mangalore", "karwar", "bhatkal"],
    "Goa": ["goa"],
    "Maharashtra": ["maharashtra", "mumbai", "ratnagiri", "sindhudurg"],
    "Gujarat": ["gujarat", "kutch", "saurashtra", "surat"],
    "Andhra Pradesh": ["andhra pradesh", "visakhapatnam", "nellore", "kakinada"],
    "Odisha": ["odisha", "orissa", "paradip", "puri"],
    "West Bengal": ["west bengal", "kolkata", "haldia", "digha"],
    "Andaman": ["andaman", "nicobar", "port blair"],
    "Lakshadweep": ["lakshadweep"]
}


# ================= TEST CONSTANTS =================
# Used ONLY by __main__ test run

TEST_LAT = 13.05
TEST_LON = 80.30
TEST_SOURCE = "all"


# ================= HELPERS =================

def _now_iso():
    return datetime.now().isoformat()


def get_region_from_coords(lat: float, lon: float) -> str:
    """
    Rough bounding box mapping to Indian coastal states.
    """
    if 92 <= lon <= 95 and 6 <= lat <= 15: return "Andaman"
    if 71 <= lon <= 74 and 8 <= lat <= 14: return "Lakshadweep"
    if 8 <= lat < 12.5 and lon < 78: return "Kerala"
    if 12.5 <= lat < 15 and lon < 78: return "Karnataka"
    if 14.4 <= lat < 16 and lon < 75: return "Goa"
    if 15 <= lat < 20 and lon < 74: return "Maharashtra"
    if 20 <= lat < 24 and lon < 73: return "Gujarat"
    if 13.5 <= lat < 19 and lon >= 78: return "Andhra Pradesh"
    if 19 <= lat < 21.5 and lon >= 80: return "Odisha"
    if 21.5 <= lat < 23 and lon >= 85: return "West Bengal"
    if lat < 13.5 and lon >= 78: return "Tamil Nadu"
    return "Unknown"


# ================= 1. LOCAL IMD ALERT (VISION PRIMARY) =================

def get_local_imd_alert_primary(lat: float, lon: float) -> dict:
    """
    PRIMARY:
    Reads the official IMD Vision-extracted Markdown warning for the user's specific coast.
    """
    region = get_region_from_coords(lat, lon)
    keywords = REGION_KEYWORDS.get(region, [region.lower()])

    if not VISION_DIR.exists():
        raise FileNotFoundError(f"Vision alerts folder not found: {VISION_DIR}")

    md_files = list(VISION_DIR.glob("*.md"))

    if not md_files:
        raise FileNotFoundError("No IMD markdown alerts found in vision folder.")

    for md_file in md_files:
        try:
            content = md_file.read_text(encoding="utf-8").lower()

            if any(kw in content for kw in keywords):
                full_text = md_file.read_text(encoding="utf-8")

                return {
                    "status": "success",
                    "method": "imd_vision",
                    "region": region,
                    "alert_text": full_text,
                    "source_file": md_file.name,
                    "data_sources": ["IMD Vision-extracted Markdown"]
                }
        except Exception:
            continue

    raise RuntimeError(f"No specific IMD vision poster found for {region}.")


# ================= 2. LOCAL IMD ALERT (TEXT FALLBACK) =================

def get_local_imd_alert_fallback(lat: float, lon: float) -> dict:
    """
    FALLBACK:
    Reads IMD text scrape cache and filters for the user's region.
    Callable directly.
    """
    region = get_region_from_coords(lat, lon)
    keywords = REGION_KEYWORDS.get(region, [region.lower()])

    data = load_json(IMD_TEXT_FILE, {}) or {}
    warnings_list = data.get("warnings", []) or []

    matched_warnings = []

    for warning in warnings_list:
        if not isinstance(warning, str):
            continue

        low = warning.lower()

        if any(kw in low for kw in keywords):
            matched_warnings.append(warning)

    if matched_warnings:
        return {
            "status": "success",
            "method": "imd_text_fallback",
            "region": region,
            "alert_text": "\n\n".join(matched_warnings[:3]),
            "matched_warnings_count": len(matched_warnings),
            "source_file": str(IMD_TEXT_FILE),
            "data_sources": ["IMD Fishermen Text Warnings"]
        }

    return {
        "status": "no_alert",
        "method": "imd_text_fallback",
        "region": region,
        "alert_text": f"No specific IMD text warning found for {region}.",
        "total_warnings_checked": len(warnings_list),
        "source_file": str(IMD_TEXT_FILE),
        "data_sources": ["IMD Fishermen Text Warnings"]
    }


# ================= MAIN LOCAL ALERT TOOL =================

def get_local_imd_alert(lat: float, lon: float, source="all") -> dict:
    """
    AI Tool:
    Get local IMD alert for lat/lon.
    """
    req = normalize_source(source)

    result = {
        "tool": "alerts_tool.get_local_imd_alert",
        "generated_at": _now_iso(),
        "lat": lat,
        "lon": lon,
        "source_requested": req,
        "region_detected": get_region_from_coords(lat, lon)
    }

    if req == "imd_text":
        fb = get_local_imd_alert_fallback(lat, lon)
        result.update(fb)
        return result

    if req == "imd_vision":
        try:
            pr = get_local_imd_alert_primary(lat, lon)
            result.update(pr)
            return result
        except Exception as e:
            result["status"] = "no_vision_data"
            result["error"] = str(e)[:120]
            return result

    # source="all" -> primary -> fallback
    try:
        pr = get_local_imd_alert_primary(lat, lon)
        result.update(pr)
        return result

    except Exception as e:
        print(f"  ⚠️ IMD vision primary failed ({str(e)[:80]}) -> text fallback")
        fb = get_local_imd_alert_fallback(lat, lon)
        result.update(fb)
        result["note"] = "Vision posters unavailable. Using IMD text scrape fallback."
        return result


# ================= 3. ALL IMD TEXT ALERTS =================

def get_imd_text_alerts() -> dict:
    """
    AI Tool:
    Get all raw IMD text warnings from cache.
    """
    data = load_json(IMD_TEXT_FILE, {}) or {}

    if not data:
        return {
            "tool": "alerts_tool.get_imd_text_alerts",
            "generated_at": _now_iso(),
            "status": "no_data",
            "message": "IMD text alerts cache missing. Run fetch_imd_alerts.py",
            "file": str(IMD_TEXT_FILE)
        }

    return {
        "tool": "alerts_tool.get_imd_text_alerts",
        "generated_at": _now_iso(),
        "status": "success",
        "source": data.get("source", "IMD Official Fishermen Warning"),
        "scraped_at": data.get("scraped_at"),
        "warning_count": len(data.get("warnings", [])),
        "warnings": data.get("warnings", []),
        "pdf_links": data.get("pdf_links", []),
        "file": str(IMD_TEXT_FILE)
    }


# ================= 4. IMD MONSOON STATUS =================

def get_imd_monsoon_status() -> dict:
    """
    AI Tool:
    Get IMD monsoon status from cache.
    """
    data = load_json(IMD_MONSOON_FILE_ALERTS, {}) or load_json(IMD_MONSOON_FILE_WEATHER, {}) or {}

    if not data:
        return {
            "tool": "alerts_tool.get_imd_monsoon_status",
            "generated_at": _now_iso(),
            "status": "no_data",
            "message": "IMD monsoon cache missing. Run fetch_imd_alerts.py or fetch_openmeteo_marine.py",
            "files_checked": [
                str(IMD_MONSOON_FILE_ALERTS),
                str(IMD_MONSOON_FILE_WEATHER)
            ]
        }

    return {
        "tool": "alerts_tool.get_imd_monsoon_status",
        "generated_at": _now_iso(),
        "status": "success",
        "source": data.get("source", "IMD Monsoon Scrape"),
        "scraped_at": data.get("scraped_at"),
        "entries_count": len(data.get("monsoon_info", [])),
        "monsoon_info": data.get("monsoon_info", [])
    }


# ================= TEST RUN =================

if __name__ == "__main__":

    print("=" * 70)
    print("ALERTS TOOL - MULTI-SOURCE TEST RUN")
    print("=" * 70)

    local_all = get_local_imd_alert(
        lat=TEST_LAT,
        lon=TEST_LON,
        source="all"
    )

    print("\n📦 get_local_imd_alert source='all' =>")
    print(json.dumps(local_all, indent=1))

    local_text = get_local_imd_alert(
        lat=TEST_LAT,
        lon=TEST_LON,
        source="imd_text"
    )

    print("\n📦 get_local_imd_alert source='imd_text' =>")
    print(json.dumps(local_text, indent=1))

    text_alerts = get_imd_text_alerts()

    print("\n📦 get_imd_text_alerts =>")
    
    # Print summary instead of massive list
    text_summary = {k: v for k, v in text_alerts.items() if k != "warnings"}
    text_summary["warnings_preview"] = text_alerts.get("warnings", [])[:2]
    print(json.dumps(text_summary, indent=1))

    monsoon = get_imd_monsoon_status()

    print("\n📦 get_imd_monsoon_status =>")
    
    # Print summary
    monsoon_summary = {k: v for k, v in monsoon.items() if k != "monsoon_info"}
    monsoon_summary["monsoon_info_preview"] = monsoon.get("monsoon_info", [])[:3]
    print(json.dumps(monsoon_summary, indent=1))

    print("\nCALL LIST:")
    print("  py .\\tools\\alerts_tool.py")
    print("  py -c \"import sys; sys.path.insert(0,'tools'); from alerts_tool import get_local_imd_alert; import json; print(json.dumps(get_local_imd_alert(13.05, 80.30, source='all'), indent=1))\"")
    print("  py -c \"import sys; sys.path.insert(0,'tools'); from alerts_tool import get_local_imd_alert; import json; print(json.dumps(get_local_imd_alert(19.07, 72.87, source='imd_text'), indent=1))\"")
    print("  py -c \"import sys; sys.path.insert(0,'tools'); from alerts_tool import get_imd_text_alerts; import json; print(json.dumps(get_imd_text_alerts(), indent=1))\"")
    print("  py -c \"import sys; sys.path.insert(0,'tools'); from alerts_tool import get_imd_monsoon_status; import json; print(json.dumps(get_imd_monsoon_status(), indent=1))\"")