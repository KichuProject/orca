"""
fetch_tsunami_iteows.py
Collects Tsunami / ITEWS (Indian Tsunami Early Warning System) event data from INCOIS.
Fetches and recursively analyzes each event's detail bulletin JSON:
  - Official ITEWC threat evaluation (threat to India)
  - Public & Port advice
  - Ocean depth / epicentral coastal distance
  - Threat status classification (NO_THREAT, WATCH, ALERT, WARNING)
"""
import requests
import json
import math
import urllib3
import sys
from pathlib import Path
from datetime import datetime

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

SAVE_DIR = Path(r"E:\sih\data\live_cache\alerts")
DETAILS_DIR = SAVE_DIR / "tsunami_details"
SAVE_DIR.mkdir(parents=True, exist_ok=True)
DETAILS_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_FILE = SAVE_DIR / "tsunami_iteows_latest.json"

URL = "https://tsunami.incois.gov.in/itews/DSSProducts/OPR/past90days.json"
HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) ORCA-Marine-AI/2.0"}

# Representative Indian coastal reference coordinates for distance approximation
INDIAN_COASTAL_POINTS = [
    (13.08, 80.27), # Chennai
    (8.08, 77.55),  # Kanyakumari
    (17.68, 83.21), # Visakhapatnam
    (19.07, 72.87), # Mumbai
    (9.93, 76.26),  # Kochi
    (11.62, 92.72), # Port Blair, Andaman
    (7.00, 93.90),  # Great Nicobar
    (21.78, 88.06), # West Bengal
    (21.50, 69.60), # Gujarat
]

def haversine(lat1, lon1, lat2, lon2):
    R = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2)**2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2)**2
    return round(2 * R * math.asin(math.sqrt(a)), 1)

def _min_distance_to_india(lat, lon):
    try:
        return min(haversine(lat, lon, p[0], p[1]) for p in INDIAN_COASTAL_POINTS)
    except Exception:
        return None

def fetch_single_detail(evid, detail_url):
    """Fetches or loads cached detail bulletin JSON for an individual event."""
    cache_file = DETAILS_DIR / f"{evid}.json"
    if cache_file.exists():
        try:
            return json.loads(cache_file.read_text(encoding="utf-8"))
        except Exception:
            pass

    if not detail_url:
        return None

    try:
        res = requests.get(detail_url, headers=HEADERS, timeout=12, verify=False)
        if res.status_code == 200:
            data = res.json()
            cache_file.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
            return data
    except Exception as e:
        print(f"   ⚠️ Could not fetch detail for {evid}: {e}")
    return None

def parse_bulletin_info(detail_data):
    """Extracts evaluation, advice, depth, and threat classification from detail JSON."""
    if not detail_data or not isinstance(detail_data, list) or len(detail_data) == 0:
        return {}

    first_item = detail_data[0]
    event_info_list = first_item.get("event_info", []) if isinstance(first_item, dict) else []
    if not event_info_list or not isinstance(event_info_list, list) or len(event_info_list) == 0:
        return {}

    info = event_info_list[0]
    evaluation = info.get("evaluation", "") or ""
    advice = info.get("advice", "") or ""
    topo_bathy = info.get("topo_bathy", "") or ""
    bulletin_title = info.get("bulletinTitle", "") or "... EARTHQUAKE BULLETIN ..."
    bulletin_number = info.get("bulletinNumber", "1")
    bulletin_time = info.get("bulletinIssueTime") or info.get("thisDocGenerated", "")

    eval_lower = evaluation.lower()
    threat_exists_india = False
    
    # Check if threat exists for India
    if "threat does not exist for india" in eval_lower or "does not exist" in eval_lower:
        threat_status = "NO_THREAT"
        threat_exists_india = False
    elif "warning" in eval_lower or "warning" in bulletin_title.lower():
        threat_status = "WARNING"
        threat_exists_india = True
    elif "alert" in eval_lower:
        threat_status = "ALERT"
        threat_exists_india = True
    elif "watch" in eval_lower:
        threat_status = "WATCH"
        threat_exists_india = True
    elif "sea level changes" in eval_lower or "monitoring" in eval_lower:
        threat_status = "MONITORING"
        threat_exists_india = False
    else:
        threat_status = "INFORMATIONAL"
        threat_exists_india = False

    is_marine = "on land" not in topo_bathy.lower() and "nil" not in topo_bathy.lower()

    return {
        "evaluation": evaluation,
        "advice": advice,
        "bulletin_title": bulletin_title,
        "bulletin_number": bulletin_number,
        "bulletin_time": bulletin_time,
        "topo_bathy": topo_bathy,
        "is_marine_epicenter": is_marine,
        "threat_status": threat_status,
        "threat_exists_india": threat_exists_india,
    }

def fetch_tsunami_iteows(fetch_details=True, *args, **kwargs):
    """
    Primary fetcher: downloads past 90 days earthquakes/tsunamis from INCOIS ITEWS
    and recursively enriches each with its detailed bulletin evaluation.
    """
    print("🌊 Fetching Tsunami / ITEWS past 90 days events from INCOIS...")
    try:
        response = requests.get(URL, headers=HEADERS, timeout=25, verify=False)
        response.raise_for_status()
        data = response.json()

        if isinstance(data, dict):
            raw_events = data.get("datasets", []) or []
            title = (data.get("metadata", {}) or {}).get("title", "ITEWC - Past 90 days events")
        elif isinstance(data, list):
            raw_events = data
            title = "ITEWC - Past 90 days events"
        else:
            raw_events, title = [], "unknown"

        events = []
        for ev in raw_events:
            evid = ev.get("EVID")
            lat = float(ev.get("LATITUDE", 0)) if ev.get("LATITUDE") is not None else 0.0
            lon = float(ev.get("LONGITUDE", 0)) if ev.get("LONGITUDE") is not None else 0.0
            mag = float(ev.get("MAGNITUDE", 0)) if ev.get("MAGNITUDE") is not None else 0.0
            depth = float(ev.get("DEPTH", 0)) if ev.get("DEPTH") is not None else 0.0
            detail_url = ev.get("detail")
            
            # Fetch & parse detailed bulletin if requested
            bulletin_meta = {}
            if fetch_details and detail_url:
                det_data = fetch_single_detail(evid, detail_url)
                if det_data:
                    bulletin_meta = parse_bulletin_info(det_data)

            dist_india_km = _min_distance_to_india(lat, lon)

            events.append({
                "EVID": evid,
                "BULNO": ev.get("BULNO"),
                "ORIGINTIME": ev.get("ORIGINTIME"),
                "LATITUDE": lat,
                "LONGITUDE": lon,
                "MAGNITUDE": mag,
                "DEPTH": depth,
                "REGIONNAME": ev.get("REGIONNAME"),
                "detail_url": detail_url,
                "distance_to_india_km": dist_india_km,
                "evaluation": bulletin_meta.get("evaluation", "Historical data indicates no immediate threat to Indian mainland."),
                "advice": bulletin_meta.get("advice", "Standard coastal vigil; maintain normal fishing operations."),
                "bulletin_title": bulletin_meta.get("bulletin_title", "... EARTHQUAKE BULLETIN ..."),
                "bulletin_number": bulletin_meta.get("bulletin_number", "1"),
                "bulletin_time": bulletin_meta.get("bulletin_time", ev.get("ORIGINTIME")),
                "topo_bathy": bulletin_meta.get("topo_bathy", "Marine/Submarine"),
                "is_marine_epicenter": bulletin_meta.get("is_marine_epicenter", True),
                "threat_status": bulletin_meta.get("threat_status", "NO_THREAT"),
                "threat_exists_india": bulletin_meta.get("threat_exists_india", False),
            })

        result = {
            "status": "success",
            "source": "INCOIS ITEWS (Indian Tsunami Early Warning Centre)",
            "title": title,
            "fetched_at": datetime.now().isoformat(),
            "total_events": len(events),
            "threat_active_in_india": any(e.get("threat_exists_india") for e in events),
            "events": events,
        }

        with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
            json.dump(result, f, indent=2, ensure_ascii=False)

        print(f"✅ SUCCESS! Saved {len(events)} enriched events to: {OUTPUT_FILE}")
        return result

    except Exception as e:
        print(f"❌ Tsunami fetch failed: {e}")
        # Return cached if available
        if OUTPUT_FILE.exists():
            try:
                return json.loads(OUTPUT_FILE.read_text(encoding="utf-8"))
            except Exception:
                pass
        return {"status": "error", "error": str(e), "events": []}

def get_tsunami_events(lat=None, lon=None, radius_km=None):
    """
    Returns latest parsed tsunami/earthquake events.
    Optionally filters by proximity to (lat, lon).
    """
    if not OUTPUT_FILE.exists():
        fetch_tsunami_iteows(fetch_details=True)

    try:
        data = json.loads(OUTPUT_FILE.read_text(encoding="utf-8"))
        events = data.get("events", [])
        
        if lat is not None and lon is not None:
            for ev in events:
                ev_lat, ev_lon = ev.get("LATITUDE", 0), ev.get("LONGITUDE", 0)
                ev["distance_to_vessel_km"] = haversine(lat, lon, ev_lat, ev_lon)
            events.sort(key=lambda x: x.get("distance_to_vessel_km", 999999))
            if radius_km:
                events = [e for e in events if e.get("distance_to_vessel_km", 999999) <= radius_km]
                
        return {
            "status": "success",
            "source": data.get("source", "INCOIS ITEWS"),
            "total_events": len(events),
            "threat_active_in_india": data.get("threat_active_in_india", False),
            "events": events
        }
    except Exception as e:
        return {"status": "error", "error": str(e), "events": []}

def get_tsunami_threat_summary(lat=None, lon=None):
    """Summarizes tsunami threat level for tactical safety dashboards."""
    ev_data = get_tsunami_events(lat, lon)
    events = ev_data.get("events", [])
    if not events:
        return {
            "threat_level": "NORMAL",
            "threat_active": False,
            "headline": "No active tsunami threats or major offshore seismic events",
            "latest_event": None
        }

    latest = events[0]
    threat_active = ev_data.get("threat_active_in_india", False) or latest.get("threat_exists_india", False)
    
    # Check if close (< 1000 km) and high magnitude (>= 7.0)
    close_event = None
    if lat is not None and lon is not None:
        for e in events:
            if e.get("distance_to_vessel_km", 9999) < 1200 and e.get("MAGNITUDE", 0) >= 6.8:
                close_event = e
                break

    threat_level = "WARNING" if threat_active else ("ADVISORY" if close_event else "SAFE")
    headline = (
        f"TSUNAMI WARNING ACTIVE: M{latest.get('MAGNITUDE')} at {latest.get('REGIONNAME')}"
        if threat_active
        else (
            f"Recent Offshore Seismic Activity: M{latest.get('MAGNITUDE')} in {latest.get('REGIONNAME')}. INCOIS Evaluation: Threat does not exist for India."
        )
    )

    return {
        "threat_level": threat_level,
        "threat_active": threat_active,
        "headline": headline,
        "latest_event": latest,
        "recent_count": len(events),
        "source": "INCOIS Indian Tsunami Early Warning Centre (ITEWS)"
    }

if __name__ == "__main__":
    fetch_tsunami_iteows(fetch_details=True)
    summary = get_tsunami_threat_summary(13.05, 80.30)
    print("\nSummary for Chennai (13.05N, 80.30E):")
    print(json.dumps(summary, indent=2))