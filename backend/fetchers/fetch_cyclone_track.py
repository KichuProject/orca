"""
fetch_cyclone_track.py

UNIFIED CYCLONE MODULE - CLEAN FUNCTION-BASED VERSION

Absorbs:
    fetch_nasa_cyclones.py
    useful cyclone/lightning logic from fetch_cyclone_lightning.py

Covers:
    Tier 1  NASA EONET live cyclone events
    Tier 2  IBTrACS ACTIVE near-live best-track
    Tier 3  IBTrACS NI historical cyclone tracks
    Tier 4  IMD cyclone page warnings
    Tier 5  Open-Meteo pressure/wind cyclone detection
    Tier 6  Open-Meteo CAPE lightning risk

Important:
    INCOIS high-wave alerts are NOT included here.
    They already live in fetch_incois_pfz.py.

Rules:
    Zero top-level execution
    Everything inside functions
    Dynamic lat/lon/days/limit where possible
    TEST_* constants only inside __main__
    Primary -> fallback pattern
    Fallback functions are callable directly
    TEST RUN prints full result data
"""

import requests
import json
import csv
from pathlib import Path
from datetime import datetime

try:
    from bs4 import BeautifulSoup
except ImportError:
    BeautifulSoup = None


# ================= PATHS =================

SAVE_DIR = Path(r"E:\sih\data\live_cache\alerts")
STATIC_CYCLONES = Path(r"E:\sih\data\static\cyclones")

BASE = "https://www.ncei.noaa.gov/data/international-best-track-archive-for-climate-stewardship-ibtracs/v04r01/access/csv/"

NI_URL = BASE + "ibtracs.NI.list.v04r01.csv"
ACTIVE_URL = BASE + "ibtracs.ACTIVE.list.v04r01.csv"

NI_CSV = STATIC_CYCLONES / "ibtracs.NI.list.v04r01.csv"
ACTIVE_CSV = STATIC_CYCLONES / "ibtracs.ACTIVE.list.v04r01.csv"

NASA_GEOJSON = SAVE_DIR / "nasa_eonet_cyclones_live.geojson"
NASA_SUMMARY = SAVE_DIR / "nasa_cyclone_summary.json"
ACTIVE_JSON = SAVE_DIR / "ibtracs_active_live.json"
IMD_CYCLONE_JSON = SAVE_DIR / "imd_cyclone_alerts.json"
CYCLONE_DETECT_JSON = SAVE_DIR / "cyclone_detection_result.json"
LIGHTNING_JSON = SAVE_DIR / "lightning_detection_result.json"
MODULE_JSON = SAVE_DIR / "cyclone_module_result.json"


# ================= DEFAULTS =================

DEFAULT_INDIA_BBOX = {
    "min_lat": -10,
    "max_lat": 30,
    "min_lon": 50,
    "max_lon": 100
}

# NASA EONET bbox format:
# min_lon, max_lat, max_lon, min_lat
EONET_BBOX = "50,30,100,0"

MIN_YEAR = 1980

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
}

CYCLONE_KEYWORDS = [
    "cyclone",
    "storm",
    "depression",
    "typhoon",
    "hurricane",
    "tropical",
    "low pressure"
]

IMD_KEYWORDS = [
    "cyclone",
    "depression",
    "storm",
    "wind",
    "warning",
    "alert",
    "coast",
    "sea",
    "fishermen",
    "landfall",
    "intensif"
]


# ================= TEST CONSTANTS =================
# Used ONLY by __main__ test run

TEST_LAT = 13.0827
TEST_LON = 80.2707
TEST_DAYS = 14
TEST_LIMIT = 100
TEST_CLEAR = True


# ================= HELPERS =================

def _ensure_dirs():
    SAVE_DIR.mkdir(parents=True, exist_ok=True)
    STATIC_CYCLONES.mkdir(parents=True, exist_ok=True)


def _now():
    return datetime.now().isoformat()


def _save_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(data, indent=2, ensure_ascii=False),
        encoding="utf-8"
    )
    return path


def _load_json(path):
    try:
        if path.exists():
            return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None
    return None


def _fnum(value):
    try:
        if value is None or value == "":
            return None
        return float(value)
    except (ValueError, TypeError):
        return None


def sshs_category(wind_kt):
    """
    IMD/Saffir-Simpson style category helper.
    """
    if wind_kt is None:
        return "UNKNOWN"
    if wind_kt < 34:
        return "DEPRESSION"
    if wind_kt < 64:
        return "CYCLONIC STORM"
    if wind_kt < 83:
        return "CATEGORY 1"
    if wind_kt < 96:
        return "CATEGORY 2"
    if wind_kt < 113:
        return "CATEGORY 3"
    if wind_kt < 137:
        return "CATEGORY 4"
    return "CATEGORY 5"


# ================= CLEAN OLD OUTPUTS =================

def clear_old_data():
    """
    Clears previously generated cyclone outputs.
    Does NOT clear raw IBTrACS CSV downloads.
    """
    _ensure_dirs()

    deleted = []

    targets = [
        NASA_GEOJSON,
        NASA_SUMMARY,
        ACTIVE_JSON,
        SAVE_DIR / "cyclone_track_live.json",
        IMD_CYCLONE_JSON,
        CYCLONE_DETECT_JSON,
        LIGHTNING_JSON,
        MODULE_JSON,
        STATIC_CYCLONES / "india_cyclone_tracks.geojson",
        STATIC_CYCLONES / "cyclones_summary.csv"
    ]

    for p in targets:
        try:
            if p.exists():
                p.unlink()
                deleted.append(p.name)
        except Exception:
            pass

    print(f"🧹 Cleared {len(deleted)} old cyclone output files")

    return {
        "status": "success",
        "deleted": deleted
    }


# ================= CSV DOWNLOADER =================

def download_csv(url, dest, timeout=600):
    """
    Downloads CSV safely.
    If download fails but old CSV exists, keeps old CSV.
    """
    _ensure_dirs()

    print(f"⬇️ Downloading {dest.name} ...")

    try:
        r = requests.get(
            url,
            headers=HEADERS,
            timeout=timeout,
            stream=True
        )
        r.raise_for_status()

        tmp = dest.with_name(dest.name + ".download")

        with open(tmp, "wb") as f:
            for chunk in r.iter_content(chunk_size=1 << 20):
                if chunk:
                    f.write(chunk)

        tmp.replace(dest)

        size_mb = round(dest.stat().st_size / 1e6, 1)
        print(f"   ✅ saved {dest.name} ({size_mb} MB)")

        return True

    except Exception as e:
        print(f"   ⚠️ download failed: {str(e)[:80]}")

        if dest.exists():
            print(f"   ♻️ keeping last good {dest.name}")
            return True

        return False


# ================= 1. NASA EONET LIVE =================

def _is_cyclone_feature(feature):
    props = feature.get("properties", {}) or {}
    title = (props.get("title") or "").lower()

    categories = []
    for c in props.get("categories", []) or []:
        categories.append((c.get("title") or "").lower())

    if any(kw in title for kw in CYCLONE_KEYWORDS):
        return True

    if any(
        "storm" in c or "cyclone" in c or "severe" in c
        for c in categories
    ):
        return True

    return False


def _latest_coordinate(geometry):
    """
    Extract latest/latest-known coordinate from GeoJSON geometry.
    """
    if not geometry:
        return [None, None]

    gtype = geometry.get("type")
    coords = geometry.get("coordinates", [])

    try:
        if gtype == "LineString" and coords:
            return coords[-1]

        if gtype == "Point" and coords:
            return coords

        if gtype == "MultiLineString" and coords:
            return coords[-1][-1]

        if gtype == "MultiPoint" and coords:
            return coords[-1]

        if gtype == "Polygon" and coords:
            return coords[0][0]

        if gtype == "MultiPolygon" and coords:
            return coords[0][0][0]

    except Exception:
        pass

    return [None, None]


def fetch_nasa_eonet_cyclones_primary(
    days=TEST_DAYS,
    limit=TEST_LIMIT,
    bbox=EONET_BBOX,
    status="open"
):
    """
    PRIMARY:
    Fetch live NASA EONET cyclone/storm events for Indian Ocean region.
    Saves GeoJSON + AI summary JSON.
    """
    _ensure_dirs()

    url = "https://eonet.gsfc.nasa.gov/api/v3/events/geojson"

    params = {
        "bbox": bbox,
        "status": status,
        "days": days,
        "limit": limit
    }

    print(f"📡 Querying NASA EONET bbox={bbox}, days={days}...")

    r = requests.get(
        url,
        params=params,
        headers=HEADERS,
        timeout=30
    )
    r.raise_for_status()

    features = r.json().get("features", []) or []
    cyclone_features = [
        f for f in features
        if _is_cyclone_feature(f)
    ]

    geojson = {
        "type": "FeatureCollection",
        "features": cyclone_features,
        "metadata": {
            "source": "NASA EONET (Earth Observatory Natural Event Tracker)",
            "fetched_at": _now(),
            "bbox": bbox,
            "active_systems": len(cyclone_features)
        }
    }

    _save_json(NASA_GEOJSON, geojson)

    ai_summary = []

    for f in cyclone_features:
        props = f.get("properties", {}) or {}
        geom = f.get("geometry", {}) or {}

        latest = _latest_coordinate(geom)

        ai_summary.append({
            "name": props.get("title"),
            "status": "ACTIVE",
            "latest_lon": latest[0] if len(latest) > 0 else None,
            "latest_lat": latest[1] if len(latest) > 1 else None,
            "magnitude": props.get("magnitudeValue"),
            "magnitude_unit": props.get("magnitudeUnit"),
            "link": props.get("link")
        })

    _save_json(
        NASA_SUMMARY,
        {
            "source": "NASA EONET",
            "generated_at": _now(),
            "active_cyclones": ai_summary
        }
    )

    return {
        "status": "success",
        "source": "NASA EONET",
        "total_events": len(features),
        "cyclone_systems": len(ai_summary),
        "files": [
            NASA_GEOJSON.name,
            NASA_SUMMARY.name
        ],
        "active_cyclones": ai_summary
    }


def fetch_nasa_eonet_cyclones_fallback():
    """
    FALLBACK:
    Use last saved NASA EONET output if live API fails.
    Callable directly.
    """
    summary = _load_json(NASA_SUMMARY)
    geo = _load_json(NASA_GEOJSON)

    if summary or geo:
        active = (summary or {}).get("active_cyclones", [])

        return {
            "status": "stale_cache",
            "source": "NASA EONET",
            "cyclone_systems": len(active),
            "files": [
                NASA_GEOJSON.name,
                NASA_SUMMARY.name
            ],
            "active_cyclones": active
        }

    return {
        "status": "failed",
        "source": "NASA EONET",
        "error": "no NASA EONET live/cache data available"
    }


def fetch_nasa_eonet_cyclones(
    days=TEST_DAYS,
    limit=TEST_LIMIT,
    bbox=EONET_BBOX,
    status="open"
):
    """
    NASA EONET wrapper:
    primary -> fallback
    """
    try:
        return fetch_nasa_eonet_cyclones_primary(
            days=days,
            limit=limit,
            bbox=bbox,
            status=status
        )
    except Exception as e:
        print(f"  ⚠️ NASA EONET primary failed ({str(e)[:70]}) -> fallback")
        return fetch_nasa_eonet_cyclones_fallback()


# ================= 2. IBTrACS ACTIVE =================

def _parse_ibtracs_active_csv():
    """
    Parses IBTrACS ACTIVE CSV and saves Indian Ocean active systems.
    """
    if not ACTIVE_CSV.exists():
        raise FileNotFoundError(f"missing {ACTIVE_CSV.name}")

    tracks = {}

    with open(ACTIVE_CSV, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):

            basin = (row.get("BASIN") or "").strip()
            lat = _fnum(row.get("LAT"))
            lon = _fnum(row.get("LON"))

            if lat is None or lon is None:
                continue

            in_box = (
                DEFAULT_INDIA_BBOX["min_lat"] <= lat <= DEFAULT_INDIA_BBOX["max_lat"]
                and
                DEFAULT_INDIA_BBOX["min_lon"] <= lon <= DEFAULT_INDIA_BBOX["max_lon"]
            )

            if basin != "NI" and not in_box:
                continue

            sid = (row.get("SID") or "").strip()

            t = tracks.setdefault(sid, {
                "name": "",
                "basin": basin,
                "pts": [],
                "rows": []
            })

            name = (row.get("NAME") or "").strip()
            if name and name != "NOTNAMED":
                t["name"] = name

            t["pts"].append([lon, lat])
            t["rows"].append(row)

    storms = []

    for sid, t in tracks.items():

        if not t["rows"] or not t["pts"]:
            continue

        last = t["rows"][-1]

        # FIXED BUG:
        # Previously used last loop lat/lon variables.
        # Now uses this storm's actual last track point.
        last_lon, last_lat = t["pts"][-1]

        wind = _fnum(last.get("USA_WIND") or last.get("WMO_WIND"))

        storms.append({
            "source": "IBTrACS ACTIVE (near-live best track)",
            "sid": sid,
            "name": t["name"] or f"ACTIVE-{sid}",
            "basin": t["basin"],
            "last_update": last.get("ISO_TIME", ""),
            "lat": last_lat,
            "lon": last_lon,
            "wind_kt": wind,
            "pressure_hpa": _fnum(
                last.get("USA_PRES") or last.get("WMO_PRES")
            ),
            "category": sshs_category(wind),
            "track_points": len(t["pts"]),
            "track_start": t["rows"][0].get("ISO_TIME", ""),
            "track": t["pts"]
        })

    data = {
        "source": "IBTrACS ACTIVE (NOAA NCEI)",
        "generated_at": _now(),
        "active_systems_indian_ocean": len(storms),
        "storms": storms
    }

    _save_json(ACTIVE_JSON, data)

    print(f"✅ IBTrACS ACTIVE parsed: {len(storms)} systems")

    return {
        "status": "success",
        "source": "IBTrACS ACTIVE",
        "active_systems": len(storms),
        "storms": storms
    }


def fetch_ibtracs_active():
    """
    IBTrACS ACTIVE wrapper:
    download latest ACTIVE CSV -> parse.
    If download fails, use last CSV/cache.
    """
    try:
        if not download_csv(ACTIVE_URL, ACTIVE_CSV, timeout=120):
            raise RuntimeError("ACTIVE CSV unavailable")

        return _parse_ibtracs_active_csv()

    except Exception as e1:
        print(f"  ⚠️ IBTrACS ACTIVE primary failed ({str(e1)[:70]}) -> fallback")

        try:
            if ACTIVE_CSV.exists():
                r = _parse_ibtracs_active_csv()
                r["status"] = "stale_cache"
                return r

            old = _load_json(ACTIVE_JSON)
            if old:
                return {
                    "status": "stale_cache",
                    "source": old.get("source"),
                    "active_systems": old.get(
                        "active_systems_indian_ocean",
                        0
                    ),
                    "storms": old.get("storms", [])
                }

        except Exception as e2:
            return {
                "status": "failed",
                "source": "IBTrACS ACTIVE",
                "error": str(e2)[:120]
            }

        return {
            "status": "failed",
            "source": "IBTrACS ACTIVE",
            "error": "no ACTIVE CSV/cache available"
        }


# ================= 3. IBTrACS HISTORY =================

def process_ibtracs_history():
    """
    Parses IBTrACS NI historical CSV.
    Saves GeoJSON tracks + CSV summary.
    """
    if not NI_CSV.exists():
        raise FileNotFoundError(f"missing {NI_CSV.name}")

    tracks = {}

    with open(NI_CSV, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):

            try:
                year = int(row.get("SEASON", 0))
                lat = float(row.get("LAT"))
                lon = float(row.get("LON"))
            except (ValueError, TypeError):
                continue

            if year < MIN_YEAR:
                continue

            sid = (row.get("SID") or "").strip()

            t = tracks.setdefault(sid, {
                "name": "",
                "year": year,
                "pts": [],
                "max_wind": 0,
                "min_pres": 9999
            })

            name = (row.get("NAME") or "").strip()
            if name and name != "NOTNAMED":
                t["name"] = name

            t["pts"].append([lon, lat])

            w = _fnum(row.get("USA_WIND") or row.get("WMO_WIND"))
            if w and w > t["max_wind"]:
                t["max_wind"] = w

            p = _fnum(row.get("USA_PRES") or row.get("WMO_PRES"))
            if p and p < t["min_pres"]:
                t["min_pres"] = p

    features = []
    summary = []

    for sid, t in tracks.items():

        if len(t["pts"]) < 2:
            continue

        cat = sshs_category(t["max_wind"] or None)

        features.append({
            "type": "Feature",
            "properties": {
                "sid": sid,
                "name": t["name"] or f"NI-{t['year']}",
                "year": t["year"],
                "max_wind_kt": t["max_wind"],
                "category": cat
            },
            "geometry": {
                "type": "LineString",
                "coordinates": t["pts"]
            }
        })

        summary.append([
            sid,
            t["name"] or f"NI-{t['year']}",
            t["year"],
            t["max_wind"],
            cat,
            t["min_pres"] if t["min_pres"] < 9999 else ""
        ])

    _save_json(
        STATIC_CYCLONES / "india_cyclone_tracks.geojson",
        {
            "type": "FeatureCollection",
            "features": features
        }
    )

    with open(
        STATIC_CYCLONES / "cyclones_summary.csv",
        "w",
        newline="",
        encoding="utf-8"
    ) as f:
        wtr = csv.writer(f)
        wtr.writerow([
            "sid",
            "name",
            "year",
            "max_wind_kt",
            "category",
            "min_pres_hpa"
        ])
        wtr.writerows(summary)

    print(f"✅ IBTrACS history processed: {len(features)} tracks")

    return {
        "status": "success",
        "source": "IBTrACS NI history",
        "tracks": len(features),
        "min_year": MIN_YEAR,
        "files": [
            "india_cyclone_tracks.geojson",
            "cyclones_summary.csv"
        ]
    }


def fetch_ibtracs_history():
    """
    IBTrACS history wrapper:
    download NI CSV -> process.
    If download fails, use last CSV/cache.
    """
    try:
        if not download_csv(NI_URL, NI_CSV, timeout=900):
            raise RuntimeError("NI CSV unavailable")

        return process_ibtracs_history()

    except Exception as e1:
        print(f"  ⚠️ IBTrACS history primary failed ({str(e1)[:70]}) -> fallback")

        try:
            if NI_CSV.exists():
                r = process_ibtracs_history()
                r["status"] = "stale_cache"
                return r

            old_geo = _load_json(
                STATIC_CYCLONES / "india_cyclone_tracks.geojson"
            )

            if old_geo:
                return {
                    "status": "stale_cache",
                    "source": "IBTrACS NI history",
                    "tracks": len(old_geo.get("features", []))
                }

        except Exception as e2:
            return {
                "status": "failed",
                "source": "IBTrACS NI history",
                "error": str(e2)[:120]
            }

        return {
            "status": "failed",
            "source": "IBTrACS NI history",
            "error": "no NI CSV/cache available"
        }


# ================= 4. IMD CYCLONE PAGE =================

def fetch_imd_cyclone_page_primary(
    url="https://mausam.imd.gov.in/imd_latest/contents/cyclone.php"
):
    """
    PRIMARY:
    Scrape IMD cyclone warning page.
    """
    if BeautifulSoup is None:
        raise RuntimeError("beautifulsoup4 not installed")

    response = requests.get(
        url,
        headers=HEADERS,
        timeout=30
    )
    response.raise_for_status()

    soup = BeautifulSoup(response.text, "html.parser")

    warnings = []

    for tag in soup.find_all([
        "p", "font", "b", "td", "div", "h2", "h3", "a"
    ]):
        text = tag.get_text(strip=True)

        if text and len(text) > 15:
            if any(kw in text.lower() for kw in IMD_KEYWORDS):
                warnings.append(text)

    data = {
        "source": "IMD Cyclone Page",
        "url": url,
        "scraped_at": _now(),
        "cyclone_warnings": warnings,
        "cyclone_active": len(warnings) > 0
    }

    _save_json(IMD_CYCLONE_JSON, data)

    return {
        "status": "success",
        "source": "IMD Cyclone Page",
        "url": url,
        "cyclone_warning_entries": len(warnings),
        "cyclone_active": len(warnings) > 0,
        "warnings": warnings[:30]
    }


def fetch_imd_cyclone_page_fallback():
    """
    FALLBACK:
    Use last saved IMD cyclone alerts JSON.
    Callable directly.
    """
    old = _load_json(IMD_CYCLONE_JSON)

    if old:
        old["status"] = "stale_cache"
        return old

    return {
        "status": "failed",
        "source": "IMD Cyclone Page",
        "error": "no IMD cyclone cache available"
    }


def fetch_imd_cyclone_page():
    """
    IMD cyclone page wrapper:
    primary -> fallback
    """
    try:
        return fetch_imd_cyclone_page_primary()
    except Exception as e:
        print(f"  ⚠️ IMD cyclone page primary failed ({str(e)[:70]}) -> fallback")
        return fetch_imd_cyclone_page_fallback()


# ================= 5. CYCLONE DETECTION FROM WEATHER =================

def detect_cyclone_from_weather_primary(lat, lon):
    """
    PRIMARY:
    Detect cyclone risk using Open-Meteo pressure + wind.
    """
    url = "https://api.open-meteo.com/v1/forecast"

    params = {
        "latitude": lat,
        "longitude": lon,
        "current": ",".join([
            "pressure_msl",
            "surface_pressure",
            "wind_speed_10m",
            "wind_gusts_10m",
            "weather_code"
        ]),
        "hourly": ",".join([
            "pressure_msl",
            "wind_speed_10m",
            "cape"
        ]),
        "forecast_days": 1,
        "timezone": "Asia/Kolkata",
        "wind_speed_unit": "ms"
    }

    response = requests.get(url, params=params, timeout=30)
    response.raise_for_status()

    data = response.json()
    current = data.get("current", {}) or {}

    pressure = current.get("pressure_msl")
    if pressure is None:
        pressure = current.get("surface_pressure")

    pressure = float(pressure or 1013.0)

    wind_speed_ms = float(current.get("wind_speed_10m") or 0.0)
    wind_gusts_ms = float(current.get("wind_gusts_10m") or 0.0)
    weather_code = int(current.get("weather_code") or 0)

    wind_speed_kmh = wind_speed_ms * 3.6
    wind_gusts_kmh = wind_gusts_ms * 3.6

    risk_level = "SAFE"
    category = "No Cyclonic Activity"
    action = "Normal operations permitted"

    if pressure < 960 and wind_speed_kmh > 118:
        risk_level = "EXTREME DANGER"
        category = "SUPER CYCLONIC STORM"
        action = "ALL VESSELS MUST RETURN IMMEDIATELY. Life-threatening conditions."

    elif pressure < 970 and wind_speed_kmh > 89:
        risk_level = "EXTREME DANGER"
        category = "VERY SEVERE CYCLONIC STORM"
        action = "ALL VESSELS MUST RETURN IMMEDIATELY."

    elif pressure < 980 and wind_speed_kmh > 63:
        risk_level = "DANGER"
        category = "SEVERE CYCLONIC STORM"
        action = "Do NOT venture into sea. Return to nearest port."

    elif pressure < 990 and wind_speed_kmh > 45:
        risk_level = "HIGH RISK"
        category = "CYCLONIC STORM"
        action = "Do NOT venture into sea. Cyclonic conditions developing."

    elif pressure < 1000 and wind_speed_kmh > 30:
        risk_level = "MODERATE RISK"
        category = "DEEP DEPRESSION / CYCLONIC ACTIVITY LIKELY"
        action = "Caution advised. Monitor IMD updates closely."

    elif pressure < 1005 and wind_speed_kmh > 20:
        risk_level = "LOW RISK"
        category = "DEPRESSION FORMING"
        action = "Stay alert. Check IMD for updates before venturing."

    elif weather_code >= 95:
        risk_level = "THUNDERSTORM"
        category = "THUNDERSTORM / LIGHTNING"
        action = "Do NOT venture. Lightning risk detected."

    result = {
        "status": "success",
        "source": "Cyclone Detection Algorithm (Pressure + Wind)",
        "detected_at": _now(),
        "latitude": lat,
        "longitude": lon,
        "pressure_hpa": pressure,
        "wind_speed_kmh": round(wind_speed_kmh, 1),
        "wind_gusts_kmh": round(wind_gusts_kmh, 1),
        "weather_code": weather_code,
        "risk_level": risk_level,
        "cyclone_category": category,
        "recommended_action": action,
        "is_cyclone_detected": pressure < 990 and wind_speed_kmh > 45,
        "is_thunderstorm": weather_code >= 95
    }

    _save_json(CYCLONE_DETECT_JSON, result)

    print(f"[OK] Cyclone detection: {risk_level} - {category}")

    return result


def detect_cyclone_from_weather(lat=TEST_LAT, lon=TEST_LON):
    """
    Cyclone weather detection wrapper:
    primary -> stale cache fallback
    """
    try:
        return detect_cyclone_from_weather_primary(lat, lon)
    except Exception as e:
        print(f"  ⚠️ cyclone weather detection failed ({str(e)[:70]}) -> fallback")

        old = _load_json(CYCLONE_DETECT_JSON)
        if old:
            old["status"] = "stale_cache"
            return old

        return {
            "status": "failed",
            "source": "Cyclone Detection Algorithm",
            "error": str(e)[:120]
        }


# ================= 6. LIGHTNING RISK =================

def detect_lightning_risk_primary(lat, lon):
    """
    PRIMARY:
    Detect lightning risk using Open-Meteo CAPE + weather code.
    """
    url = "https://api.open-meteo.com/v1/forecast"

    params = {
        "latitude": lat,
        "longitude": lon,
        "current": ",".join([
            "weather_code",
            "cape"
        ]),
        "hourly": ",".join([
            "cape",
            "weather_code",
            "precipitation_probability"
        ]),
        "forecast_days": 1,
        "timezone": "Asia/Kolkata"
    }

    response = requests.get(url, params=params, timeout=30)
    response.raise_for_status()

    data = response.json()
    current = data.get("current", {}) or {}

    weather_code = int(current.get("weather_code") or 0)

    cape = current.get("cape")

    if cape is None:
        hourly = data.get("hourly", {}) or {}
        cape_list = hourly.get("cape") or []
        cape = cape_list[0] if cape_list else 0

    cape = float(cape or 0)

    if weather_code >= 95:
        risk = "HIGH - THUNDERSTORM ACTIVE"
        action = "DO NOT venture. Lightning strikes likely."

    elif cape > 2500:
        risk = "HIGH - SEVERE CONVECTION"
        action = "Thunderstorms likely within hours. Avoid open sea."

    elif cape > 1000:
        risk = "MODERATE - CONVECTION BUILDING"
        action = "Monitor weather. Thunderstorms possible."

    elif cape > 500:
        risk = "LOW - SLIGHT CONVECTION"
        action = "Generally safe, but monitor for changes."

    else:
        risk = "MINIMAL"
        action = "No significant lightning risk detected."

    result = {
        "status": "success",
        "source": "Lightning Risk Detection (CAPE + Weather Code)",
        "detected_at": _now(),
        "latitude": lat,
        "longitude": lon,
        "cape_j_per_kg": cape,
        "weather_code": weather_code,
        "lightning_risk": risk,
        "recommended_action": action
    }

    _save_json(LIGHTNING_JSON, result)

    print(f"[OK] Lightning risk: {risk}")

    return result


def detect_lightning_risk(lat=TEST_LAT, lon=TEST_LON):
    """
    Lightning detection wrapper:
    primary -> stale cache fallback
    """
    try:
        return detect_lightning_risk_primary(lat, lon)
    except Exception as e:
        print(f"  ⚠️ lightning detection failed ({str(e)[:70]}) -> fallback")

        old = _load_json(LIGHTNING_JSON)
        if old:
            old["status"] = "stale_cache"
            return old

        return {
            "status": "failed",
            "source": "Lightning Risk Detection",
            "error": str(e)[:120]
        }


# ================= MASTER CYCLONE FETCH =================

def fetch_all_cyclone_data(
    lat=TEST_LAT,
    lon=TEST_LON,
    clear_old=False
):
    """
    Master cyclone module runner.

    Calls:
        NASA EONET
        IBTrACS ACTIVE
        IBTrACS history
        IMD cyclone page
        cyclone weather detection
        lightning risk detection
    """
    _ensure_dirs()

    if clear_old:
        clear_old_data()

    results = {
        "nasa_eonet": fetch_nasa_eonet_cyclones(),
        "ibtracs_active": fetch_ibtracs_active(),
        "ibtracs_history": fetch_ibtracs_history(),
        "imd_cyclone_page": fetch_imd_cyclone_page(),
        "cyclone_weather_detection": detect_cyclone_from_weather(lat, lon),
        "lightning_detection": detect_lightning_risk(lat, lon)
    }

    _save_json(
        MODULE_JSON,
        {
            "generated_at": _now(),
            "coordinates": {
                "lat": lat,
                "lon": lon
            },
            "results": results
        }
    )

    print(f"💾 Saved cyclone module summary: {MODULE_JSON}")

    return results


# ================= TEST RUN =================

if __name__ == "__main__":

    print("=" * 70)
    print("CYCLONE MODULE - TEST RUN")
    print("=" * 70)

    if TEST_CLEAR:
        clear_result = clear_old_data()
        print(json.dumps(clear_result, indent=1))

    final_result = fetch_all_cyclone_data(
        lat=TEST_LAT,
        lon=TEST_LON,
        clear_old=False
    )

    print(json.dumps(final_result, indent=1))

    print("\nCALL LIST:")
    print("  py -c \"import sys; sys.path.insert(0,'fetchers'); from fetch_cyclone_track import fetch_nasa_eonet_cyclones; import json; print(json.dumps(fetch_nasa_eonet_cyclones(), indent=1))\"")
    print("  py -c \"import sys; sys.path.insert(0,'fetchers'); from fetch_cyclone_track import fetch_ibtracs_active; import json; print(json.dumps(fetch_ibtracs_active(), indent=1))\"")
    print("  py -c \"import sys; sys.path.insert(0,'fetchers'); from fetch_cyclone_track import fetch_ibtracs_history; import json; print(json.dumps(fetch_ibtracs_history(), indent=1))\"")
    print("  py -c \"import sys; sys.path.insert(0,'fetchers'); from fetch_cyclone_track import fetch_imd_cyclone_page; import json; print(json.dumps(fetch_imd_cyclone_page(), indent=1))\"")
    print("  py -c \"import sys; sys.path.insert(0,'fetchers'); from fetch_cyclone_track import detect_cyclone_from_weather; import json; print(json.dumps(detect_cyclone_from_weather(13.0827, 80.2707), indent=1))\"")
    print("  py -c \"import sys; sys.path.insert(0,'fetchers'); from fetch_cyclone_track import detect_lightning_risk; import json; print(json.dumps(detect_lightning_risk(13.0827, 80.2707), indent=1))\"")
    print("  py -c \"import sys; sys.path.insert(0,'fetchers'); from fetch_cyclone_track import fetch_all_cyclone_data; import json; print(json.dumps(fetch_all_cyclone_data(), indent=1))\"")