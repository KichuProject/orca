"""
hazard_tool.py

HAZARD TOOL - MULTI-SOURCE VERSION

Supports:
    source="all"       -> Open-Meteo + IMD + INCOIS + NASA + NOAA + ISRO
    source="openmeteo" -> Open-Meteo pressure/wind + CAPE only
    source="imd"       -> IMD cyclone warnings only
    source="incois"    -> INCOIS high-wave only
    source="nasa"      -> NASA EONET only
    source="noaa"      -> IBTrACS only
    source="isro"      -> ISRO INSAT-3DS convection/lightning only

Primary:
    fetch_cyclone_track.detect_cyclone_from_weather()
    fetch_cyclone_track.detect_lightning_risk()

Fallback:
    cached cyclone_detection_result.json
    cached lightning_detection_result.json
    cached IMD / INCOIS / NASA / IBTrACS alert files

Rules:
    Zero top-level execution
    Everything inside functions
    Dynamic lat/lon/radius
    TEST_* constants only inside __main__
    Primary -> fallback
    Fallback callable directly
    TEST RUN prints full result data
"""

import sys
import json
import math
from pathlib import Path
from datetime import datetime


# ================= BOOTSTRAP =================

TOOLS_DIR = Path(__file__).resolve().parent

if str(TOOLS_DIR) not in sys.path:
    sys.path.insert(0, str(TOOLS_DIR))


# ================= COMMON IMPORTS =================

try:
    from common import (
        LIVE,
        STATIC,
        load_json,
        nearest_coast,
        md_read_point,
        haversine
    )

except ImportError:

    LIVE = Path(r"E:\sih\data\live_cache")
    STATIC = Path(r"E:\sih\data\static")

    def load_json(path, default=None):
        try:
            p = Path(path)

            if p.exists():
                return json.loads(p.read_text(encoding="utf-8"))

        except Exception:
            pass

        return default

    COASTS = {
        "Chennai": (13.0827, 80.2707),
        "Kochi": (9.9312, 76.2673),
        "Mumbai": (19.0760, 72.8777),
        "Visakhapatnam": (17.6868, 83.2185),
        "Port_Blair": (11.6230, 92.7265),
        "Haldia": (21.7800, 88.0600),
        "Tuticorin": (8.7642, 78.1348),
        "Mangalore": (12.9141, 74.8560),
    }

    def haversine(lat1, lon1, lat2, lon2):
        R = 6371.0

        p1 = math.radians(lat1)
        p2 = math.radians(lat2)

        dp = math.radians(lat2 - lat1)
        dl = math.radians(lon2 - lon1)

        a = (
            math.sin(dp / 2) ** 2
            + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
        )

        return round(2 * R * math.asin(math.sqrt(a)), 1)

    def nearest_coast(lat, lon):

        name = min(
            COASTS,
            key=lambda c: haversine(
                lat,
                lon,
                COASTS[c][0],
                COASTS[c][1]
            )
        )

        dist = haversine(
            lat,
            lon,
            COASTS[name][0],
            COASTS[name][1]
        )

        return name, dist

    def md_read_point(subfolder, lat, lon, var_candidates=()):
        return {
            "status": "no_common",
            "error": "common.py md_read_point not available"
        }


# ================= PATHS =================

ALERTS_DIR = LIVE / "alerts"

WAVES_FILE = LIVE / "waves" / "openmeteo_marine_forecast.json"

CYCLONE_DETECTION_FILE = ALERTS_DIR / "cyclone_detection_result.json"
LIGHTNING_DETECTION_FILE = ALERTS_DIR / "lightning_detection_result.json"

IMD_CYCLONE_FILE = ALERTS_DIR / "imd_cyclone_alerts.json"
INCOIS_HIGH_WAVE_FILE = ALERTS_DIR / "incois_high_wave_alerts.json"

NASA_SUMMARY_FILE = ALERTS_DIR / "nasa_cyclone_summary.json"
NASA_GEOJSON_FILE = ALERTS_DIR / "nasa_eonet_cyclones_live.geojson"
OLD_EONET_FILE = ALERTS_DIR / "cyclone_track_live.json"

IBTRACS_ACTIVE_FILE = ALERTS_DIR / "ibtracs_active_live.json"

CYCLONE_HISTORY_FILE = STATIC / "cyclones" / "india_cyclone_tracks.geojson"


# ================= TEST CONSTANTS =================
# Used ONLY by __main__ test run

TEST_LAT = 13.05
TEST_LON = 80.30
TEST_RADIUS_KM = 300
TEST_SOURCE = "all"


# ================= HELPERS =================

def _now_iso():
    return datetime.now().isoformat()


def _normalize_hazard_source(source="all"):
    """
    Normalizes hazard source names.
    """
    s = str(source or "all").strip().lower()
    s = s.replace("-", "_").replace(" ", "_")

    aliases = {
        "live": "openmeteo",
        "open_meteo": "openmeteo",
        "openmeteo_marine": "openmeteo",

        "eonet": "nasa",
        "nasa_eonet": "nasa",

        "ibtracs": "noaa",
        "noaa_ncei": "noaa",
        "ibtracs_active": "noaa",

        "high_wave": "incois",
        "incois_high_wave": "incois",
        "tsunami": "incois",
        "itews": "incois",
        "iteows": "incois",

        "imd_cyclone": "imd",

        "insat": "isro",
        "mosdac": "isro",
        "insat_3ds": "isro",
    }

    return aliases.get(s, s)


def _include(source, requested_source):
    """
    Checks whether a source should be included.
    """
    req = _normalize_hazard_source(requested_source)

    if req == "all":
        return True

    return _normalize_hazard_source(source) == req


# ================= FETCHER LOADER =================

_fetch_cyclone_module = None


def _find_fetchers_dir():
    """
    Searches upward for fetchers folder containing fetch_cyclone_track.py.
    """
    current = Path(__file__).resolve().parent

    for _ in range(6):

        candidate = current / "fetchers"

        if (candidate / "fetch_cyclone_track.py").exists():
            return candidate

        if current.parent == current:
            break

        current = current.parent

    return None


def _get_fetch_cyclone():
    """
    Lazily imports fetchers/fetch_cyclone_track.py.
    """
    global _fetch_cyclone_module

    if _fetch_cyclone_module is None:

        fetchers_dir = _find_fetchers_dir()

        if fetchers_dir:

            if str(fetchers_dir) not in sys.path:
                sys.path.insert(0, str(fetchers_dir))

            try:
                import fetch_cyclone_track as fct
                _fetch_cyclone_module = fct

            except Exception:
                _fetch_cyclone_module = False

        else:
            _fetch_cyclone_module = False

    return _fetch_cyclone_module if _fetch_cyclone_module else None


# ================= OPEN-METEO CYCLONE DETECTION =================

def _openmeteo_cyclone_detection_cache():
    """
    FALLBACK CACHE:
    Reads cached cyclone_detection_result.json.
    Callable directly.
    """
    data = load_json(CYCLONE_DETECTION_FILE, {}) or {}

    if data:
        data["method"] = "cache"
        data["source_file"] = str(CYCLONE_DETECTION_FILE)

    return data


def _openmeteo_cyclone_detection_live(lat, lon):
    """
    PRIMARY:
    Live Open-Meteo cyclone detection using fetch_cyclone_track.py.
    """
    ft = _get_fetch_cyclone()

    if not ft or not hasattr(ft, "detect_cyclone_from_weather"):
        raise RuntimeError(
            "fetch_cyclone_track.detect_cyclone_from_weather not available"
        )

    result = ft.detect_cyclone_from_weather(
        float(lat),
        float(lon)
    )

    if isinstance(result, dict) and result.get("status") in (
        "success",
        "stale_cache"
    ):
        result["method"] = "live"
        return result

    raise RuntimeError("Open-Meteo cyclone detection failed")


def _openmeteo_cyclone_detection(lat, lon):
    """
    Open-Meteo cyclone detection wrapper:
    live -> cache
    """
    try:

        return _openmeteo_cyclone_detection_live(lat, lon)

    except Exception as e:

        print(
            f"  ⚠️ Open-Meteo cyclone live failed ({str(e)[:80]}) -> cache"
        )

        cache = _openmeteo_cyclone_detection_cache()

        if cache:
            return cache

        return {
            "status": "no_openmeteo_cyclone_data",
            "error": str(e)[:120]
        }


# ================= OPEN-METEO LIGHTNING DETECTION =================

def _openmeteo_lightning_detection_cache():
    """
    FALLBACK CACHE:
    Reads cached lightning_detection_result.json.
    Callable directly.
    """
    data = load_json(LIGHTNING_DETECTION_FILE, {}) or {}

    if data:
        data["method"] = "cache"
        data["source_file"] = str(LIGHTNING_DETECTION_FILE)

    return data


def _openmeteo_lightning_detection_live(lat, lon):
    """
    PRIMARY:
    Live Open-Meteo lightning detection using fetch_cyclone_track.py.
    """
    ft = _get_fetch_cyclone()

    if not ft or not hasattr(ft, "detect_lightning_risk"):
        raise RuntimeError(
            "fetch_cyclone_track.detect_lightning_risk not available"
        )

    result = ft.detect_lightning_risk(
        float(lat),
        float(lon)
    )

    if isinstance(result, dict) and result.get("status") in (
        "success",
        "stale_cache"
    ):
        result["method"] = "live"
        return result

    raise RuntimeError("Open-Meteo lightning detection failed")


def _openmeteo_lightning_detection(lat, lon):
    """
    Open-Meteo lightning detection wrapper:
    live -> cache
    """
    try:

        return _openmeteo_lightning_detection_live(lat, lon)

    except Exception as e:

        print(
            f"  ⚠️ Open-Meteo lightning live failed ({str(e)[:80]}) -> cache"
        )

        cache = _openmeteo_lightning_detection_cache()

        if cache:
            return cache

        return {
            "status": "no_openmeteo_lightning_data",
            "error": str(e)[:120]
        }


# ================= IMD CYCLONE ALERTS =================

BAD_WORDS = [
    "sop",
    "download",
    "ministry",
    "copyright",
    "mandate",
    "brochure",
    "annual report",
    "training",
    "instrumentation",
    "telecommunication",
    "home",
    "about",
    "outlook",
    "bulletin",
    "interactive track",
    "preliminary reports",
    "storm surge warning",
    "wind warning",
    "track of cyclonic disturbance",
    "hourly bulletins",
    "national bulletin",
    "tropical weather outlook"
]

KEY_WORDS = [
    "depression",
    "cyclonic storm",
    "landfall",
    "gale warning",
    "storm surge",
    "cyclone warning",
    "deep depression",
    "very severe",
    "extremely severe"
]


def _get_imd_cyclone_alerts():
    """
    Reads IMD cyclone page alerts cache.
    """
    data = load_json(IMD_CYCLONE_FILE, {}) or {}

    warnings = data.get("cyclone_warnings", []) or []

    real_warnings = []

    for warning in warnings:

        if not isinstance(warning, str):
            continue

        low = warning.lower()

        if len(warning) > 400:
            continue

        has_keyword = any(k in low for k in KEY_WORDS)
        has_bad_word = any(b in low for b in BAD_WORDS)

        if has_keyword and not has_bad_word:
            real_warnings.append(warning)

    return {
        "status": "success" if real_warnings else "no_alert",
        "source": "IMD cyclone page",
        "imd_cyclone_active": len(real_warnings) > 0,
        "imd_top_warnings": real_warnings[:3],
        "total_raw_warnings": len(warnings),
        "file": str(IMD_CYCLONE_FILE)
    }


# ================= INCOIS HIGH-WAVE ALERTS =================

def _get_incois_high_wave():
    """
    Reads INCOIS high-wave alerts cache.
    """
    data = load_json(INCOIS_HIGH_WAVE_FILE, {}) or {}

    alerts = data.get("high_wave_alerts", []) or []

    active = bool(
        data.get("high_wave_active", False)
        and len(alerts) > 0
    )

    return {
        "status": "success" if active else "no_alert",
        "source": "INCOIS High Wave Alerts",
        "incois_high_wave_active": active,
        "incois_top_alerts": alerts[:3],
        "file": str(INCOIS_HIGH_WAVE_FILE)
    }


# ================= NASA EONET =================

def _get_nasa_eonet():
    """
    Reads NASA EONET cyclone cache.
    Supports new summary + old cyclone_track_live.json + GeoJSON.
    """
    summary = load_json(NASA_SUMMARY_FILE, {}) or {}

    if summary and isinstance(summary.get("active_cyclones"), list):

        cyclones = summary.get("active_cyclones", [])

        return {
            "status": "success" if cyclones else "no_alert",
            "source": "NASA EONET summary",
            "eonet_active_systems": len(cyclones),
            "eonet_cyclones": [
                c.get("name")
                for c in cyclones
            ][:3],
            "file": str(NASA_SUMMARY_FILE)
        }

    old = load_json(OLD_EONET_FILE, {}) or {}

    if old:

        cyclones = old.get("cyclones", []) or []

        return {
            "status": "success" if cyclones else "no_alert",
            "source": "NASA EONET old cache",
            "eonet_active_systems": old.get(
                "active_indian_ocean_systems",
                len(cyclones)
            ),
            "eonet_cyclones": [
                c.get("name")
                for c in cyclones
            ][:3],
            "file": str(OLD_EONET_FILE)
        }

    geo = load_json(NASA_GEOJSON_FILE, {}) or {}

    features = geo.get("features", []) or []

    if features:

        return {
            "status": "success",
            "source": "NASA EONET GeoJSON",
            "eonet_active_systems": len(features),
            "eonet_cyclones": [
                (f.get("properties", {}) or {}).get("title")
                for f in features
            ][:3],
            "file": str(NASA_GEOJSON_FILE)
        }

    return {
        "status": "no_cache",
        "source": "NASA EONET",
        "eonet_active_systems": 0,
        "eonet_cyclones": [],
        "files_checked": [
            str(NASA_SUMMARY_FILE),
            str(OLD_EONET_FILE),
            str(NASA_GEOJSON_FILE)
        ]
    }


# ================= IBTrACS ACTIVE =================

def _get_ibtracs_active():
    """
    Reads IBTrACS ACTIVE near-live best-track cache.
    """
    data = load_json(IBTRACS_ACTIVE_FILE, {}) or {}

    storms = data.get("storms", []) or []

    top_storms = []

    for s in storms[:3]:

        top_storms.append(
            {
                "name": s.get("name"),
                "lat": s.get("lat"),
                "lon": s.get("lon"),
                "wind_kt": s.get("wind_kt"),
                "pressure_hpa": s.get("pressure_hpa"),
                "category": s.get("category"),
                "last_update": s.get("last_update")
            }
        )

    return {
        "status": "success" if storms else "no_alert",
        "source": "IBTrACS ACTIVE near-live best track",
        "ibtracs_active_systems": data.get(
            "active_systems_indian_ocean",
            len(storms)
        ),
        "ibtracs_active_storms": top_storms,
        "file": str(IBTRACS_ACTIVE_FILE)
    }


# ================= CYCLONE RISK COMPOSER =================

def _compose_cyclone_risk(
    lat,
    lon,
    requested_source,
    detection,
    imd,
    incois,
    eonet,
    ibtracs
):
    """
    Combines cyclone hazard sources into one JSON.
    """
    risks = []
    data_sources = []

    detection = detection if isinstance(detection, dict) else {}
    imd = imd if isinstance(imd, dict) else {}
    incois = incois if isinstance(incois, dict) else {}
    eonet = eonet if isinstance(eonet, dict) else {}
    ibtracs = ibtracs if isinstance(ibtracs, dict) else {}

    risk_level = None
    cyclone_category = None
    recommended_action = None
    pressure_hpa = None
    wind_kmh = None

    # ---------- OPEN-METEO ----------

    if _include("openmeteo", requested_source):

        risk_level = detection.get("risk_level")
        cyclone_category = detection.get("cyclone_category")
        recommended_action = detection.get("recommended_action")
        pressure_hpa = detection.get("pressure_hpa")
        wind_kmh = detection.get("wind_speed_kmh") or detection.get("wind_kmh")

        data_sources.append("Open-Meteo pressure/wind")

    # ---------- IMD ----------

    imd_active = False

    if _include("imd", requested_source):

        imd_active = bool(imd.get("imd_cyclone_active"))

        if imd_active:
            risks.append("IMD cyclone warning active")

        data_sources.append("IMD cyclone page")

    # ---------- INCOIS ----------

    high_wave_active = False

    if _include("incois", requested_source):

        high_wave_active = bool(incois.get("incois_high_wave_active"))

        if high_wave_active:
            risks.append("INCOIS high-wave alert active")

        data_sources.append("INCOIS high-wave alerts")

    # ---------- NASA EONET ----------

    eonet_count = 0

    if _include("nasa", requested_source):

        eonet_count = int(eonet.get("eonet_active_systems", 0) or 0)

        if eonet_count > 0:
            risks.append(
                f"NASA EONET active systems: {eonet_count}"
            )

        data_sources.append("NASA EONET live satellite")

    # ---------- IBTrACS ----------

    ibtracs_count = 0

    if _include("noaa", requested_source):

        ibtracs_count = int(
            ibtracs.get("ibtracs_active_systems", 0) or 0
        )

        if ibtracs_count > 0:
            risks.append(
                f"IBTrACS ACTIVE systems: {ibtracs_count}"
            )

        data_sources.append("IBTrACS ACTIVE near-live best track")

    # ---------- FINAL RISK LEVEL ----------

    if risk_level is None:

        if imd_active or ibtracs_count > 0 or eonet_count > 0:
            risk_level = "ALERT - ACTIVE CYCLONE SOURCES"

        elif high_wave_active:
            risk_level = "HIGH WAVE ALERT"

        else:

            req = _normalize_hazard_source(requested_source)

            if req == "imd":
                risk_level = "NO IMD CYCLONE WARNING"

            elif req == "incois":
                risk_level = "NO INCOIS HIGH WAVE ALERT"

            elif req in ("nasa", "noaa"):
                risk_level = "NO ACTIVE SYSTEM"

            else:
                risk_level = "NO ACTIVE SIGNAL"

    status = "success"

    if not any(
        [
            detection.get("status") == "success",
            imd_active,
            high_wave_active,
            eonet_count > 0,
            ibtracs_count > 0
        ]
    ):
        status = "no_active_hazard_data"

    return {
        "tool": "hazard_tool.get_cyclone_risk",
        "generated_at": _now_iso(),
        "lat": lat,
        "lon": lon,
        "source_requested": _normalize_hazard_source(requested_source),
        "status": status,
        "risk_level": risk_level,
        "cyclone_category": cyclone_category,
        "recommended_action": recommended_action,
        "pressure_hpa": pressure_hpa,
        "wind_kmh": wind_kmh,
        "risks": risks,
        "imd_cyclone_active": imd_active,
        "imd_top_warnings": imd.get("imd_top_warnings", []),
        "incois_high_wave_active": high_wave_active,
        "incois_top_alerts": incois.get("incois_top_alerts", []),
        "eonet_active_systems": eonet_count,
        "eonet_cyclones": eonet.get("eonet_cyclones", []),
        "ibtracs_active_systems": ibtracs_count,
        "ibtracs_active_storms": ibtracs.get("ibtracs_active_storms", []),
        "openmeteo": detection,
        "imd": imd,
        "incois": incois,
        "nasa": eonet,
        "ibtracs": ibtracs,
        "data_sources": data_sources
    }


# ================= CYCLONE RISK PRIMARY / FALLBACK =================

def get_cyclone_risk_primary(lat, lon, source="all"):
    """
    PRIMARY:
    Live Open-Meteo detection + cached IMD/INCOIS/NASA/IBTrACS layers.
    """
    req = _normalize_hazard_source(source)

    if _include("openmeteo", req):

        detection = _openmeteo_cyclone_detection(lat, lon)

    else:

        detection = {
            "status": "skipped"
        }

    if _include("imd", req):

        imd = _get_imd_cyclone_alerts()

    else:

        imd = {
            "status": "skipped"
        }

    if _include("incois", req):

        incois = _get_incois_high_wave()

    else:

        incois = {
            "status": "skipped"
        }

    if _include("nasa", req):

        eonet = _get_nasa_eonet()

    else:

        eonet = {
            "status": "skipped"
        }

    if _include("noaa", req):

        ibtracs = _get_ibtracs_active()

    else:

        ibtracs = {
            "status": "skipped"
        }

    return _compose_cyclone_risk(
        lat,
        lon,
        req,
        detection,
        imd,
        incois,
        eonet,
        ibtracs
    )


def get_cyclone_risk_fallback(lat, lon, source="all"):
    """
    FALLBACK:
    Uses cached cyclone detection + cached hazard layers only.
    Callable directly.
    """
    req = _normalize_hazard_source(source)

    if _include("openmeteo", req):

        detection = _openmeteo_cyclone_detection_cache()

        if not detection:

            detection = {
                "status": "no_cache",
                "method": "cache"
            }

    else:

        detection = {
            "status": "skipped"
        }

    if _include("imd", req):

        imd = _get_imd_cyclone_alerts()

    else:

        imd = {
            "status": "skipped"
        }

    if _include("incois", req):

        incois = _get_incois_high_wave()

    else:

        incois = {
            "status": "skipped"
        }

    if _include("nasa", req):

        eonet = _get_nasa_eonet()

    else:

        eonet = {
            "status": "skipped"
        }

    if _include("noaa", req):

        ibtracs = _get_ibtracs_active()

    else:

        ibtracs = {
            "status": "skipped"
        }

    result = _compose_cyclone_risk(
        lat,
        lon,
        req,
        detection,
        imd,
        incois,
        eonet,
        ibtracs
    )

    result["status"] = "stale_cache"
    result["source_note"] = (
        "Live Open-Meteo unavailable. Using cached hazard layers."
    )

    return result


def get_cyclone_risk(lat, lon, source="all"):
    """
    AI Tool:
    Get cyclone risk for lat/lon.
    """
    try:

        return get_cyclone_risk_primary(
            lat,
            lon,
            source
        )

    except Exception as e:

        print(
            f"  ⚠️ cyclone risk primary failed ({str(e)[:80]}) -> fallback"
        )

        return get_cyclone_risk_fallback(
            lat,
            lon,
            source
        )


# ================= LIGHTNING HELPERS =================

def _get_openmeteo_weather_code(lat, lon):
    """
    Reads current weather code from cached Open-Meteo marine forecast.
    """
    data = load_json(WAVES_FILE, {}) or {}

    try:

        coast, _ = nearest_coast(lat, lon)

    except Exception:

        return None

    locations = data.get("locations", {}) or {}

    location_data = locations.get(coast, {}) or {}

    weather_current = location_data.get("weather_current", {}) or {}

    return weather_current.get("weather_code")


def _rank_lightning(risk_string):
    """
    Ranks lightning risk strings.
    """
    s = str(risk_string or "").upper()

    if "EXTREME" in s or "THUNDERSTORM ACTIVE" in s:
        return 4

    if "HIGH" in s:
        return 3

    if "MODERATE" in s:
        return 2

    if "LOW" in s:
        return 1

    if "NONE" in s or "MINIMAL" in s or "CLEAR SKY" in s:
        return 0

    return -1


def _combined_lightning_risk(openmeteo_risk, isro_risk):
    """
    Chooses the stronger lightning risk label.
    """
    ranks = [
        r for r in (
            _rank_lightning(openmeteo_risk),
            _rank_lightning(isro_risk)
        )
        if r >= 0
    ]

    if not ranks:
        return "UNKNOWN"

    highest = max(ranks)

    if highest >= 4:
        return "EXTREME"

    if highest == 3:
        return "HIGH"

    if highest == 2:
        return "MODERATE"

    if highest == 1:
        return "LOW"

    return "MINIMAL"


# ================= LIGHTNING RISK COMPOSER =================

def _compose_lightning_risk(
    lat,
    lon,
    requested_source,
    openmeteo_lightning,
    isro_lightning
):
    """
    Combines Open-Meteo + ISRO lightning sources.
    """
    data_sources = []

    openmeteo_lightning = (
        openmeteo_lightning
        if isinstance(openmeteo_lightning, dict)
        else {}
    )

    isro_lightning = (
        isro_lightning
        if isinstance(isro_lightning, dict)
        else {}
    )

    openmeteo_risk = None
    cape = None
    recommended_action = None

    if _include("openmeteo", requested_source):

        openmeteo_risk = openmeteo_lightning.get("lightning_risk")
        cape = openmeteo_lightning.get("cape_j_per_kg")
        recommended_action = openmeteo_lightning.get("recommended_action")

        data_sources.append("Open-Meteo CAPE")

    isro_risk = None
    isro_action = None
    cloud_top_c = None

    if _include("isro", requested_source):

        isro_risk = isro_lightning.get("lightning_risk_isro")
        isro_action = isro_lightning.get("action")
        cloud_top_c = isro_lightning.get("cloud_top_c")

        data_sources.append("ISRO INSAT-3DS Cloud Top Properties")

    thunderstorm_code_now = openmeteo_lightning.get("weather_code")

    if thunderstorm_code_now is None:

        thunderstorm_code_now = _get_openmeteo_weather_code(lat, lon)

    try:

        coast, coast_distance = nearest_coast(lat, lon)

    except Exception:

        coast = None
        coast_distance = None

    return {
        "tool": "hazard_tool.get_lightning_risk",
        "generated_at": _now_iso(),
        "lat": lat,
        "lon": lon,
        "source_requested": _normalize_hazard_source(requested_source),
        "nearest_coast": coast,
        "coast_distance_km": coast_distance,
        "lightning_risk_openmeteo": openmeteo_risk,
        "cape_j_per_kg": cape,
        "recommended_action": recommended_action,
        "lightning_risk_isro": isro_risk,
        "isro_action": isro_action,
        "cloud_top_c": cloud_top_c,
        "combined_lightning_risk": _combined_lightning_risk(
            openmeteo_risk,
            isro_risk
        ),
        "thunderstorm_code_now": thunderstorm_code_now,
        "openmeteo": openmeteo_lightning,
        "isro": isro_lightning,
        "data_sources": data_sources
    }


# ================= LIGHTNING RISK PRIMARY / FALLBACK =================

def get_lightning_risk_primary(lat, lon, source="all"):
    """
    PRIMARY:
    Live Open-Meteo lightning + ISRO INSAT lightning.
    """
    req = _normalize_hazard_source(source)

    if _include("openmeteo", req):

        openmeteo_lightning = _openmeteo_lightning_detection(lat, lon)

    else:

        openmeteo_lightning = {
            "status": "skipped"
        }

    if _include("isro", req):

        isro_lightning = get_isro_lightning(lat, lon, source="isro")

    else:

        isro_lightning = {
            "status": "skipped"
        }

    return _compose_lightning_risk(
        lat,
        lon,
        req,
        openmeteo_lightning,
        isro_lightning
    )


def get_lightning_risk_fallback(lat, lon, source="all"):
    """
    FALLBACK:
    Cached Open-Meteo lightning + ISRO INSAT lightning.
    Callable directly.
    """
    req = _normalize_hazard_source(source)

    if _include("openmeteo", req):

        openmeteo_lightning = _openmeteo_lightning_detection_cache()

        if not openmeteo_lightning:

            openmeteo_lightning = {
                "status": "no_cache",
                "method": "cache"
            }

    else:

        openmeteo_lightning = {
            "status": "skipped"
        }

    if _include("isro", req):

        isro_lightning = get_isro_lightning(lat, lon, source="isro")

    else:

        isro_lightning = {
            "status": "skipped"
        }

    result = _compose_lightning_risk(
        lat,
        lon,
        req,
        openmeteo_lightning,
        isro_lightning
    )

    result["status"] = "stale_cache"
    result["source_note"] = (
        "Live Open-Meteo unavailable. Using cached lightning layers."
    )

    return result


def get_lightning_risk(lat, lon, source="all"):
    """
    AI Tool:
    Get lightning risk for lat/lon.
    """
    try:

        return get_lightning_risk_primary(
            lat,
            lon,
            source
        )

    except Exception as e:

        print(
            f"  ⚠️ lightning risk primary failed ({str(e)[:80]}) -> fallback"
        )

        return get_lightning_risk_fallback(
            lat,
            lon,
            source
        )


# ================= CYCLONE HISTORY =================

def get_cyclone_history(lat, lon, radius_km=TEST_RADIUS_KM, source="all"):
    """
    Reads historical IBTrACS cyclone tracks near lat/lon.
    """
    req = _normalize_hazard_source(source)

    if not (
        _include("noaa", req)
        or _include("static", req)
    ):

        return {
            "status": "unsupported_source",
            "message": (
                "Cyclone history is available only from NOAA IBTrACS/static"
            ),
            "source_requested": req
        }

    geo = load_json(CYCLONE_HISTORY_FILE, {}) or {}

    features = geo.get("features", []) or []

    hits = []

    for feature in features:

        geometry = feature.get("geometry", {}) or {}
        coords = geometry.get("coordinates", []) or []

        if not coords:
            continue

        min_distance = min(
            haversine(lat, lon, point[1], point[0])
            for point in coords[::3]
        )

        if min_distance <= radius_km:

            properties = dict(feature.get("properties", {}) or {})
            properties["min_distance_km"] = round(min_distance, 1)

            hits.append(properties)

    hits.sort(
        key=lambda item: item.get("min_distance_km", 1e9)
    )

    return {
        "tool": "hazard_tool.get_cyclone_history",
        "generated_at": _now_iso(),
        "lat": lat,
        "lon": lon,
        "radius_km": radius_km,
        "status": "success" if hits else "no_history",
        "historical_cyclones_nearby": len(hits),
        "top_events": hits[:10],
        "file": str(CYCLONE_HISTORY_FILE),
        "data_sources": [
            "NOAA NCEI IBTrACS v04r01 (North Indian Ocean, 1980+)"
        ]
    }


# ================= ISRO CONVECTION =================

def get_isro_convection(lat, lon, source="all"):
    """
    ISRO INSAT-3DS cloud-top + rain reader.
    """
    req = _normalize_hazard_source(source)

    if not _include("isro", req):

        return {
            "status": "unsupported_source",
            "message": "ISRO convection is available only from source=isro",
            "source_requested": req
        }

    ctp = md_read_point(
        "insat3ds_ctp",
        lat,
        lon,
        ["ctt", "ctp", "cloud_top_temperature"]
    )

    rain = md_read_point(
        "insat3ds_rain",
        lat,
        lon,
        ["imr", "rain", "rainfall", "precip"]
    )

    out = {
        "tool": "hazard_tool.get_isro_convection",
        "generated_at": _now_iso(),
        "lat": lat,
        "lon": lon,
        "source": "INSAT-3DS Cloud Top Properties + IMR Rain",
        "data_sources": [
            "ISRO MOSDAC INSAT-3DS"
        ]
    }

    if ctp.get("status") == "ok":

        value = ctp.get("value")

        if value is not None:

            value = float(value)

            cloud_top_c = value - 273.15 if value > 150 else value

            out["cloud_top_c"] = round(cloud_top_c, 1)

            if cloud_top_c <= -60:
                out["lightning_risk_isro"] = "HIGH - DEEP CONVECTION"

            elif cloud_top_c <= -40:
                out["lightning_risk_isro"] = "MODERATE"

            else:
                out["lightning_risk_isro"] = "LOW"

    elif ctp.get("status") == "all_nan":

        out["cloud_top_c"] = None
        out["lightning_risk_isro"] = "NONE - CLEAR SKY"

    else:

        out["ctp_status"] = ctp.get("status")
        out["lightning_risk_isro"] = "UNKNOWN"

    if rain.get("status") == "ok":

        rain_value = rain.get("value")

        if rain_value is not None:
            out["rain_mm"] = round(float(rain_value), 1)

    else:

        out["rain_status"] = rain.get("status")

    return out


# ================= ISRO LIGHTNING =================

def get_isro_lightning(lat, lon, source="all"):
    """
    ISRO INSAT-3DS lightning/convection reader with clear-sky awareness.
    """
    req = _normalize_hazard_source(source)

    if not _include("isro", req):

        return {
            "status": "unsupported_source",
            "message": "ISRO lightning is available only from source=isro",
            "source_requested": req
        }

    ctp = md_read_point(
        "insat3ds_ctp",
        lat,
        lon,
        ["ctt", "ctp", "cloud_top_temperature", "TIR1"]
    )

    out = {
        "tool": "hazard_tool.get_isro_lightning",
        "generated_at": _now_iso(),
        "lat": lat,
        "lon": lon,
        "source": "INSAT-3DS Cloud Top Properties (MOSDAC)",
        "data_sources": [
            "ISRO MOSDAC INSAT-3DS"
        ]
    }

    if ctp.get("status") == "all_nan":

        out["cloud_top_c"] = None
        out["lightning_risk_isro"] = "NONE - CLEAR SKY"
        out["action"] = (
            "No clouds detected by INSAT-3DS at this location. "
            "Safe conditions."
        )

        return out

    if ctp.get("status") == "ok":

        value = ctp.get("value")

        if value is None:

            out["lightning_risk_isro"] = "UNKNOWN"
            return out

        value = float(value)

        cloud_top_c = value - 273.15 if value > 150 else value

        out["cloud_top_c"] = round(cloud_top_c, 1)

        if cloud_top_c <= -70:

            out["lightning_risk_isro"] = (
                "EXTREME - ELECTRIFIED DEEP CONVECTION"
            )
            out["action"] = (
                "DO NOT venture. Severe thunderstorm, frequent lightning."
            )

        elif cloud_top_c <= -60:

            out["lightning_risk_isro"] = "HIGH - DEEP CONVECTION"
            out["action"] = "Lightning likely. Avoid open sea."

        elif cloud_top_c <= -40:

            out["lightning_risk_isro"] = "MODERATE - CONVECTIVE CLOUDS"
            out["action"] = "Monitor. Isolated lightning possible."

        else:

            out["lightning_risk_isro"] = "LOW - SHALLOW CLOUDS"
            out["action"] = "No significant convective lightning risk."

        return out

    out["ctp_status"] = ctp.get("status")
    out["lightning_risk_isro"] = "UNKNOWN"


# ================= INCOIS TSUNAMI EARLY WARNING =================

def get_tsunami_alerts(lat=0.0, lon=0.0, radius_km=1500.0, source="all"):
    """
    AI Tool / Hazard Module:
    Reads INCOIS ITEWS tsunami alerts with detailed NTWC bulletin evaluations.
    """
    req = _normalize_hazard_source(source)
    if req not in ("all", "incois", "tsunami", "iteows", "itews"):
        return {
            "status": "unsupported_source",
            "message": "Tsunami alerts available from INCOIS ITEWS",
            "source_requested": req
        }

    try:
        fetchers_dir = _find_fetchers_dir()
        if fetchers_dir and str(fetchers_dir) not in sys.path:
            sys.path.insert(0, str(fetchers_dir))
        import fetch_tsunami_iteows as fti
        return fti.get_tsunami_threat_summary(lat, lon)
    except Exception as e:
        tsunami_file = ALERTS_DIR / "tsunami_iteows_latest.json"
        data = load_json(tsunami_file, {}) or {}
        events = data.get("events", []) or []
        return {
            "status": "cached" if events else "no_cache",
            "threat_active": False,
            "threat_level": "NO_ACTIVE_THREAT",
            "headline": "No active tsunami threats for Indian coastline.",
            "recent_count": len(events),
            "events": events[:5],
            "source": "INCOIS ITEWS (fallback cache)",
            "error": str(e)[:100]
        }


# ================= TEST RUN =================

if __name__ == "__main__":

    print("=" * 70)
    print("HAZARD TOOL - MULTI-SOURCE TEST RUN")
    print("=" * 70)

    cyclone_all = get_cyclone_risk(
        lat=TEST_LAT,
        lon=TEST_LON,
        source="all"
    )

    print("\n📦 get_cyclone_risk source='all' =>")
    print(json.dumps(cyclone_all, indent=1))

    cyclone_openmeteo = get_cyclone_risk(
        lat=TEST_LAT,
        lon=TEST_LON,
        source="openmeteo"
    )

    print("\n📦 get_cyclone_risk source='openmeteo' =>")
    print(json.dumps(cyclone_openmeteo, indent=1))

    cyclone_imd = get_cyclone_risk(
        lat=TEST_LAT,
        lon=TEST_LON,
        source="imd"
    )

    print("\n📦 get_cyclone_risk source='imd' =>")
    print(json.dumps(cyclone_imd, indent=1))

    lightning_all = get_lightning_risk(
        lat=TEST_LAT,
        lon=TEST_LON,
        source="all"
    )

    print("\n📦 get_lightning_risk source='all' =>")
    print(json.dumps(lightning_all, indent=1))

    lightning_isro = get_lightning_risk(
        lat=TEST_LAT,
        lon=TEST_LON,
        source="isro"
    )

    print("\n📦 get_lightning_risk source='isro' =>")
    print(json.dumps(lightning_isro, indent=1))

    cyclone_history = get_cyclone_history(
        lat=TEST_LAT,
        lon=TEST_LON,
        radius_km=TEST_RADIUS_KM
    )

    print("\n📦 get_cyclone_history =>")
    print(json.dumps(cyclone_history, indent=1))

    isro_convection = get_isro_convection(
        lat=TEST_LAT,
        lon=TEST_LON
    )

    print("\n📦 get_isro_convection =>")
    print(json.dumps(isro_convection, indent=1))

    isro_lightning = get_isro_lightning(
        lat=TEST_LAT,
        lon=TEST_LON
    )

    print("\n📦 get_isro_lightning =>")
    print(json.dumps(isro_lightning, indent=1))

    print("\nCALL LIST:")
    print("  py .\\tools\\hazard_tool.py")
    print("  py -c \"import sys; sys.path.insert(0,'tools'); from hazard_tool import get_cyclone_risk; import json; print(json.dumps(get_cyclone_risk(13.05, 80.30, source='all'), indent=1))\"")
    print("  py -c \"import sys; sys.path.insert(0,'tools'); from hazard_tool import get_cyclone_risk; import json; print(json.dumps(get_cyclone_risk(13.05, 80.30, source='openmeteo'), indent=1))\"")
    print("  py -c \"import sys; sys.path.insert(0,'tools'); from hazard_tool import get_cyclone_risk; import json; print(json.dumps(get_cyclone_risk(13.05, 80.30, source='imd'), indent=1))\"")
    print("  py -c \"import sys; sys.path.insert(0,'tools'); from hazard_tool import get_lightning_risk; import json; print(json.dumps(get_lightning_risk(13.05, 80.30, source='all'), indent=1))\"")
    print("  py -c \"import sys; sys.path.insert(0,'tools'); from hazard_tool import get_lightning_risk; import json; print(json.dumps(get_lightning_risk(13.05, 80.30, source='isro'), indent=1))\"")
    print("  py -c \"import sys; sys.path.insert(0,'tools'); from hazard_tool import get_cyclone_history; import json; print(json.dumps(get_cyclone_history(13.05, 80.30, 300), indent=1))\"")
    print("  py -c \"import sys; sys.path.insert(0,'tools'); from hazard_tool import get_isro_convection; import json; print(json.dumps(get_isro_convection(13.05, 80.30), indent=1))\"")
    print("  py -c \"import sys; sys.path.insert(0,'tools'); from hazard_tool import get_isro_lightning; import json; print(json.dumps(get_isro_lightning(13.05, 80.30), indent=1))\"")