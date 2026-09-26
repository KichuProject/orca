"""
safety_tool.py

SAFETY TOOL - MULTI-SOURCE VERSION

Supports:
    source="all"       -> Open-Meteo + IMD + INCOIS high-wave
    source="openmeteo" -> Open-Meteo only
    source="imd"       -> IMD fishermen warning only
    source="incois"    -> INCOIS high-wave only

Primary:
    fetch_openmeteo_marine.get_comprehensive_conditions(lat, lon)

Fallback:
    openmeteo_marine_forecast.json cache

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
import math
from pathlib import Path
from datetime import datetime, timedelta


# ================= BOOTSTRAP =================

TOOLS_DIR = Path(__file__).resolve().parent

if str(TOOLS_DIR) not in sys.path:
    sys.path.insert(0, str(TOOLS_DIR))


# ================= COMMON IMPORTS =================

try:
    from common import LIVE, load_json, nearest_coast

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


# ================= PATHS =================

WAVES_FILE = LIVE / "waves" / "openmeteo_marine_forecast.json"

ALERTS_DIR = LIVE / "alerts"

IMD_ALERTS_FILE = ALERTS_DIR / "imd_fishermen_alerts.json"
INCOIS_HIGH_WAVE_FILE = ALERTS_DIR / "incois_high_wave_alerts.json"


# ================= SAFETY THRESHOLDS =================

MAX_WAVE_HEIGHT = 1.5
MAX_WIND_SPEED = 30
MAX_GUSTS = 45
DANGEROUS_SWELL = 1.5
POOR_VISIBILITY = 2000
DANGEROUS_CAPE = 1500

THUNDER_CODES = (95, 96, 99)


# ================= REGION KEYS =================

REGION_KEYS = {
    "Chennai": [
        "tamil nadu",
        "chennai"
    ],
    "Kochi": [
        "kerala",
        "lakshadweep"
    ],
    "Mumbai": [
        "maharashtra",
        "mumbai"
    ],
    "Visakhapatnam": [
        "andhra"
    ],
    "Port_Blair": [
        "andaman",
        "nicobar"
    ],
    "Haldia": [
        "west bengal",
        "odisha",
        "orissa"
    ],
    "Tuticorin": [
        "tamil nadu"
    ],
    "Mangalore": [
        "karnataka"
    ]
}


# ================= TEST CONSTANTS =================
# Used ONLY by __main__ test run

TEST_LAT = 13.05
TEST_LON = 80.30
TEST_SOURCE = "all"


# ================= HELPERS =================

def _now_iso():
    return datetime.now().isoformat()


def _normalize_safety_source(source="all"):
    """
    Normalizes safety source names.
    """
    s = str(source or "all").strip().lower()
    s = s.replace("-", "_").replace(" ", "_")

    aliases = {
        "live": "openmeteo",
        "open_meteo": "openmeteo",
        "openmeteo_marine": "openmeteo",
        "openmeteo_weather": "openmeteo",
        "imd_alerts": "imd",
        "imd_warning": "imd",
        "incois_high_wave": "incois",
        "high_wave": "incois",
    }

    return aliases.get(s, s)


def _include(source, requested_source):
    """
    Checks whether a source should be included.
    """
    req = _normalize_safety_source(requested_source)

    if req == "all":
        return True

    return _normalize_safety_source(source) == req


# ================= FETCHER LOADER =================

_fetch_openmeteo_module = None


def _find_fetchers_dir():
    """
    Searches upward for fetchers folder containing fetch_openmeteo_marine.py.
    """
    current = Path(__file__).resolve().parent

    for _ in range(6):

        candidate = current / "fetchers"

        if (candidate / "fetch_openmeteo_marine.py").exists():
            return candidate

        if current.parent == current:
            break

        current = current.parent

    return None


def _get_fetch_openmeteo():
    """
    Lazily imports fetchers/fetch_openmeteo_marine.py.
    """
    global _fetch_openmeteo_module

    if _fetch_openmeteo_module is None:

        fetchers_dir = _find_fetchers_dir()

        if fetchers_dir:

            if str(fetchers_dir) not in sys.path:
                sys.path.insert(0, str(fetchers_dir))

            try:
                import fetch_openmeteo_marine as fom
                _fetch_openmeteo_module = fom

            except Exception:
                _fetch_openmeteo_module = False

        else:
            _fetch_openmeteo_module = False

    return _fetch_openmeteo_module if _fetch_openmeteo_module else None


# ================= OPEN-METEO PRIMARY =================

def _openmeteo_live(lat, lon):
    """
    PRIMARY:
    Live Open-Meteo marine + weather using fetch_openmeteo_marine.py.
    """
    ft = _get_fetch_openmeteo()

    if not ft or not hasattr(ft, "get_comprehensive_conditions"):
        raise RuntimeError(
            "fetch_openmeteo_marine.py not available"
        )

    entry = ft.get_comprehensive_conditions(
        float(lat),
        float(lon)
    )

    if not isinstance(entry, dict):
        raise RuntimeError("Invalid Open-Meteo response")

    if entry.get("marine_error") and entry.get("weather_error"):
        raise RuntimeError("Open-Meteo marine and weather both failed")

    coast, coast_distance = nearest_coast(float(lat), float(lon))

    return {
        "status": "success",
        "method": "live",
        "observation_coast": coast,
        "coast_distance_km": coast_distance,
        "entry": entry,
        "data_sources": [
            "Open-Meteo Marine API",
            "Open-Meteo Forecast API"
        ]
    }


# ================= OPEN-METEO FALLBACK =================

def _openmeteo_cache(lat, lon):
    """
    FALLBACK:
    Reads cached openmeteo_marine_forecast.json.
    Callable directly.
    """
    data = load_json(WAVES_FILE, {}) or {}

    locations = data.get("locations", {}) or {}

    if not locations:
        return {
            "status": "no_cache",
            "method": "cache",
            "file": str(WAVES_FILE),
            "entry": {}
        }

    coast, coast_distance = nearest_coast(lat, lon)

    entry = locations.get(coast)

    if not entry:

        coast = next(iter(locations))
        entry = locations.get(coast, {})
        coast_distance = None

    return {
        "status": "success",
        "method": "cache",
        "observation_coast": coast,
        "coast_distance_km": coast_distance,
        "entry": entry,
        "data_sources": [
            "Open-Meteo live cache"
        ]
    }


# ================= IMD SAFETY ALERTS =================

def _get_imd_safety_alerts(lat, lon):
    """
    Reads IMD fishermen warnings and filters for nearest coast.
    """
    coast, _ = nearest_coast(lat, lon)

    data = load_json(IMD_ALERTS_FILE, {}) or {}

    warnings_list = data.get("warnings", []) or []

    region_keys = REGION_KEYS.get(
        coast,
        [str(coast).lower()]
    )

    imd_hit = None
    checked_segments = 0

    for warning in warnings_list:

        if not isinstance(warning, str):
            continue

        segments = warning.replace("Read More", "\n").split("\n")

        for seg in segments:

            seg = seg.strip()
            checked_segments += 1

            if len(seg) < 20 or len(seg) > 400:
                continue

            low = seg.lower()

            if any(
                noise in low
                for noise in (
                    "copyright",
                    "sitemap",
                    "home",
                    "menu",
                    "read more"
                )
            ):
                continue

            has_region = any(k in low for k in region_keys)

            has_danger = any(
                danger in low
                for danger in (
                    "not to venture",
                    "squally",
                    "gale",
                    "rough",
                    "high wave"
                )
            )

            if has_region and has_danger:
                imd_hit = seg[:300]
                break

        if imd_hit:
            break

    return {
        "status": "success" if imd_hit else "no_alert",
        "source": "IMD fishermen warnings",
        "observation_coast": coast,
        "imd_warning_active": bool(imd_hit),
        "imd_top_warning": imd_hit,
        "segments_checked": checked_segments,
        "file": str(IMD_ALERTS_FILE)
    }


# ================= INCOIS HIGH-WAVE ALERTS =================

def _get_incois_high_wave_alerts():
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


# ================= WAVE CONDITIONS =================

def _format_wave(lat, lon, openmeteo_result):
    """
    Formats wave conditions from Open-Meteo result.
    """
    entry = openmeteo_result.get("entry", {}) or {}

    marine_current = entry.get("marine_current", {}) or {}
    marine_hourly = entry.get("marine_hourly", {}) or {}

    return {
        "tool": "safety_tool.get_wave_conditions",
        "generated_at": _now_iso(),
        "lat": lat,
        "lon": lon,
        "status": openmeteo_result.get("status", "success"),
        "observation_coast": openmeteo_result.get("observation_coast"),
        "coast_distance_km": openmeteo_result.get("coast_distance_km"),
        "method": openmeteo_result.get("method"),
        "wave_height_m": marine_current.get("wave_height"),
        "wave_direction_deg": marine_current.get("wave_direction"),
        "wave_period_s": marine_current.get("wave_period"),
        "swell_height_m": marine_current.get("swell_wave_height"),
        "wind_wave_height_m": marine_current.get("wind_wave_height"),
        "next_24h_waves_m": (
            marine_hourly.get("wave_height") or []
        )[:24],
        "data_sources": openmeteo_result.get(
            "data_sources",
            ["Open-Meteo Marine"]
        )
    }


def get_wave_conditions(lat, lon, source="all"):
    """
    AI Tool:
    Get wave conditions for lat/lon.
    """
    req = _normalize_safety_source(source)

    if not _include("openmeteo", req):

        return {
            "status": "unsupported_source",
            "message": "Wave conditions are available only from Open-Meteo",
            "source_requested": req
        }

    try:

        openmeteo_result = _openmeteo_live(lat, lon)

    except Exception as e:

        print(
            f"  ⚠️ Open-Meteo live failed ({str(e)[:80]}) -> cache fallback"
        )

        openmeteo_result = _openmeteo_cache(lat, lon)

    if openmeteo_result.get("status") != "success":

        return {
            "status": "no_wave_data",
            "lat": lat,
            "lon": lon,
            "file": str(WAVES_FILE)
        }

    return _format_wave(lat, lon, openmeteo_result)


# ================= WEATHER FORECAST =================

def _format_weather(lat, lon, openmeteo_result):
    """
    Formats weather forecast from Open-Meteo result.
    """
    entry = openmeteo_result.get("entry", {}) or {}

    weather_current = entry.get("weather_current", {}) or {}
    weather_daily = entry.get("weather_daily", {}) or {}
    weather_hourly = entry.get("weather_hourly", {}) or {}

    return {
        "tool": "safety_tool.get_weather_forecast",
        "generated_at": _now_iso(),
        "lat": lat,
        "lon": lon,
        "status": openmeteo_result.get("status", "success"),
        "observation_coast": openmeteo_result.get("observation_coast"),
        "coast_distance_km": openmeteo_result.get("coast_distance_km"),
        "method": openmeteo_result.get("method"),
        "temperature_c": weather_current.get("temperature_2m"),
        "humidity_pct": weather_current.get("relative_humidity_2m"),
        "wind_kmh": weather_current.get("wind_speed_10m"),
        "wind_dir_deg": weather_current.get("wind_direction_10m"),
        "gusts_kmh": weather_current.get("wind_gusts_10m"),
        "pressure_hpa": weather_current.get("pressure_msl"),
        "cloud_pct": weather_current.get("cloud_cover"),
        "visibility_m": weather_current.get("visibility"),
        "rain_mm": weather_current.get("precipitation"),
        "weather_code": weather_current.get("weather_code"),
        "rain_status": entry.get("rain_status"),
        "daily": weather_daily,
        "next_12h_weather_codes": (
            weather_hourly.get("weather_code") or []
        )[:12],
        "next_12h_cape": (
            weather_hourly.get("cape") or []
        )[:12],
        "next_24h_wind_kmh": (
            weather_hourly.get("wind_speed_10m") or []
        )[:24],
        "data_sources": openmeteo_result.get(
            "data_sources",
            ["Open-Meteo Forecast"]
        )
    }


def get_weather_forecast(lat, lon, source="all"):
    """
    AI Tool:
    Get weather forecast for lat/lon.
    """
    req = _normalize_safety_source(source)

    if not _include("openmeteo", req):

        return {
            "status": "unsupported_source",
            "message": "Weather forecast is available only from Open-Meteo",
            "source_requested": req
        }

    try:

        openmeteo_result = _openmeteo_live(lat, lon)

    except Exception as e:

        print(
            f"  ⚠️ Open-Meteo live failed ({str(e)[:80]}) -> cache fallback"
        )

        openmeteo_result = _openmeteo_cache(lat, lon)

    if openmeteo_result.get("status") != "success":

        return {
            "status": "no_weather_data",
            "lat": lat,
            "lon": lon,
            "file": str(WAVES_FILE)
        }

    return _format_weather(lat, lon, openmeteo_result)


# ================= SAFETY COMPOSER =================

def _compose_safety(
    lat,
    lon,
    requested_source,
    openmeteo_result,
    imd_result,
    incois_result,
    time_offset=0
):
    """
    Combines Open-Meteo + IMD + INCOIS into final safety verdict.
    Supports dynamic forecast time_offset (0h Live, +1h to +72h Forecast).
    """
    risks = []
    warnings = []

    entry = {}

    if isinstance(openmeteo_result, dict):
        entry = openmeteo_result.get("entry", {}) or {}

    marine_current = entry.get("marine_current", {}) or {}
    marine_hourly = entry.get("marine_hourly", {}) or {}
    weather_current = entry.get("weather_current", {}) or {}
    weather_hourly = entry.get("weather_hourly", {}) or {}

    # Check if a future forecast horizon is requested
    offset_h = max(0, min(72, int(time_offset or 0)))
    target_dt = datetime.now() + timedelta(hours=offset_h)
    target_time_iso = target_dt.isoformat()

    if offset_h > 0 and (marine_hourly or weather_hourly):
        idx = offset_h
        wave_list = marine_hourly.get("wave_height") or []
        swell_list = marine_hourly.get("swell_wave_height") or []
        spd_list = weather_hourly.get("wind_speed_10m") or []
        gust_list = weather_hourly.get("wind_gusts_10m") or []
        code_list = weather_hourly.get("weather_code") or []
        vis_list = weather_hourly.get("visibility") or []
        pres_list = weather_hourly.get("pressure_msl") or []
        temp_list = weather_hourly.get("temperature_2m") or []
        rain_list = weather_hourly.get("precipitation") or []
        time_list = weather_hourly.get("time") or marine_hourly.get("time") or []

        wave_height = wave_list[min(idx, len(wave_list) - 1)] if wave_list else marine_current.get("wave_height")
        swell = swell_list[min(idx, len(swell_list) - 1)] if swell_list else marine_current.get("swell_wave_height")
        wind_speed = spd_list[min(idx, len(spd_list) - 1)] if spd_list else weather_current.get("wind_speed_10m")
        gusts = gust_list[min(idx, len(gust_list) - 1)] if gust_list else weather_current.get("wind_gusts_10m")
        weather_code = code_list[min(idx, len(code_list) - 1)] if code_list else weather_current.get("weather_code")
        visibility = vis_list[min(idx, len(vis_list) - 1)] if vis_list else weather_current.get("visibility")
        pressure = pres_list[min(idx, len(pres_list) - 1)] if pres_list else weather_current.get("pressure_msl")
        temp_2m = temp_list[min(idx, len(temp_list) - 1)] if temp_list else weather_current.get("temperature_2m")
        rain_mm = rain_list[min(idx, len(rain_list) - 1)] if rain_list else weather_current.get("precipitation")
        if time_list and min(idx, len(time_list) - 1) >= 0:
            target_time_iso = time_list[min(idx, len(time_list) - 1)]
    else:
        wave_height = marine_current.get("wave_height")
        swell = marine_current.get("swell_wave_height")
        wind_speed = weather_current.get("wind_speed_10m")
        gusts = weather_current.get("wind_gusts_10m")
        weather_code = weather_current.get("weather_code")
        visibility = weather_current.get("visibility")
        pressure = weather_current.get("pressure_msl")
        temp_2m = weather_current.get("temperature_2m")
        rain_mm = weather_current.get("precipitation")

    # ---------- OPEN-METEO CHECKS ----------

    if _include("openmeteo", requested_source):

        if wave_height is not None and wave_height > MAX_WAVE_HEIGHT:
            risks.append(
                f"High waves {wave_height} m (limit {MAX_WAVE_HEIGHT} m)"
            )

        if wind_speed is not None and wind_speed > MAX_WIND_SPEED:
            risks.append(
                f"Strong wind {wind_speed} km/h (limit {MAX_WIND_SPEED})"
            )

        if gusts is not None and gusts > MAX_GUSTS:
            risks.append(
                f"Gusts {gusts} km/h (limit {MAX_GUSTS})"
            )

        if swell is not None and swell > DANGEROUS_SWELL:
            risks.append(
                f"Large swell {swell} m"
            )

        if weather_code in THUNDER_CODES:
            risks.append(
                "Thunderstorm/lightning active"
            )

        if visibility is not None and visibility < POOR_VISIBILITY:
            warnings.append(
                f"Poor visibility ({visibility} m)"
            )

        if (
            pressure is not None
            and pressure < 1000
            and wind_speed is not None
            and wind_speed > 30
        ):
            risks.append(
                f"Cyclonic conditions likely (pressure {pressure} hPa)"
            )

        cape_list = (weather_hourly.get("cape") or [])[:12]

        if any(
            c is not None and c > DANGEROUS_CAPE
            for c in cape_list
        ):
            warnings.append(
                "High lightning risk building (high CAPE)"
            )

        rain_status = entry.get("rain_status")

        if rain_status in ("HEAVY RAIN", "VERY HEAVY RAIN"):
            warnings.append(
                f"{rain_status} active"
            )

    # ---------- IMD CHECKS ----------

    if (
        _include("imd", requested_source)
        and isinstance(imd_result, dict)
        and imd_result.get("imd_warning_active")
    ):

        risks.append(
            "IMD WARNING: " + str(
                imd_result.get("imd_top_warning", "IMD warning active")
            )
        )

    # ---------- INCOIS CHECKS ----------

    if (
        _include("incois", requested_source)
        and isinstance(incois_result, dict)
        and incois_result.get("incois_high_wave_active")
    ):

        risks.append(
            "INCOIS HIGH WAVE ALERT ACTIVE"
        )

        top_alerts = incois_result.get("incois_top_alerts", [])

        if top_alerts:
            warnings.append(
                str(top_alerts[0])[:200]
            )

    # ---------- FINAL VERDICT ----------

    if not risks:
        verdict = "SAFE"

    elif len(risks) >= 2:
        verdict = "DO_NOT_VENTURE"

    elif any(
        "not to venture" in str(r).lower()
        for r in risks
    ):
        verdict = "DO_NOT_VENTURE"

    else:
        verdict = "CAUTION"

    data_sources = []

    if _include("openmeteo", requested_source):
        data_sources.append("Open-Meteo Marine")
        data_sources.append("Open-Meteo Weather")

    if _include("imd", requested_source):
        data_sources.append("IMD Fishermen Warnings")

    if _include("incois", requested_source):
        data_sources.append("INCOIS High Wave Alerts")

    return {
        "tool": "safety_tool.get_safety_conditions",
        "generated_at": _now_iso(),
        "lat": lat,
        "lon": lon,
        "source_requested": _normalize_safety_source(requested_source),
        "observation_coast": openmeteo_result.get("observation_coast")
        if isinstance(openmeteo_result, dict)
        else None,
        "coast_distance_km": openmeteo_result.get("coast_distance_km")
        if isinstance(openmeteo_result, dict)
        else None,
        "openmeteo_method": openmeteo_result.get("method")
        if isinstance(openmeteo_result, dict)
        else None,
        "verdict": verdict,
        "risks": risks,
        "warnings": warnings,
        "is_forecast": offset_h > 0,
        "forecast_offset_hours": offset_h,
        "target_time": target_time_iso,
        "conditions": {
            "wave_m": wave_height,
            "swell_m": swell,
            "wind_kmh": wind_speed,
            "gusts_kmh": gusts,
            "temp_c": temp_2m,
            "rain_mm": rain_mm,
            "pressure_hpa": pressure,
            "visibility_m": visibility,
            "weather_code": weather_code,
            "cape_j_per_kg": cape_list[0] if (cape_list and len(cape_list) > 0) else None,
            "is_forecast": offset_h > 0,
            "forecast_offset_hours": offset_h,
            "target_time": target_time_iso
        },
        "thresholds": {
            "wave_m": MAX_WAVE_HEIGHT,
            "wind_kmh": MAX_WIND_SPEED,
            "gusts_kmh": MAX_GUSTS,
            "swell_m": DANGEROUS_SWELL,
            "visibility_m": POOR_VISIBILITY,
            "cape_j_per_kg": DANGEROUS_CAPE
        },
        "imd": imd_result,
        "incois": incois_result,
        "data_sources": data_sources
    }


# ================= SAFETY PRIMARY =================

def get_safety_conditions_primary(lat, lon, source="all", time_offset=0):
    """
    PRIMARY:
    Live Open-Meteo + IMD + INCOIS (with optional forecast time_offset).
    """
    req = _normalize_safety_source(source)

    coast, coast_distance = nearest_coast(lat, lon)

    if _include("openmeteo", req):

        openmeteo_result = _openmeteo_live(lat, lon)

    else:

        openmeteo_result = {
            "status": "skipped",
            "method": None,
            "observation_coast": coast,
            "coast_distance_km": coast_distance,
            "entry": {}
        }

    if _include("imd", req):

        imd_result = _get_imd_safety_alerts(lat, lon)

    else:

        imd_result = {
            "status": "skipped"
        }

    if _include("incois", req):

        incois_result = _get_incois_high_wave_alerts()

    else:

        incois_result = {
            "status": "skipped"
        }

    result = _compose_safety(
        lat,
        lon,
        req,
        openmeteo_result,
        imd_result,
        incois_result,
        time_offset=time_offset
    )

    result["status"] = "success"

    return result


# ================= SAFETY FALLBACK =================

def get_safety_conditions_fallback(lat, lon, source="all", time_offset=0):
    """
    FALLBACK:
    Cached Open-Meteo + IMD + INCOIS.
    Callable directly.
    """
    req = _normalize_safety_source(source)

    coast, coast_distance = nearest_coast(lat, lon)

    if _include("openmeteo", req):

        openmeteo_result = _openmeteo_cache(lat, lon)

    else:

        openmeteo_result = {
            "status": "skipped",
            "method": None,
            "observation_coast": coast,
            "coast_distance_km": coast_distance,
            "entry": {}
        }

    if _include("imd", req):

        imd_result = _get_imd_safety_alerts(lat, lon)

    else:

        imd_result = {
            "status": "skipped"
        }

    if _include("incois", req):

        incois_result = _get_incois_high_wave_alerts()

    else:

        incois_result = {
            "status": "skipped"
        }

    result = _compose_safety(
        lat,
        lon,
        req,
        openmeteo_result,
        imd_result,
        incois_result,
        time_offset=time_offset
    )

    result["status"] = "stale_cache"
    result["source_note"] = (
        "Live Open-Meteo unavailable. Using cached Open-Meteo forecast."
    )

    return result


# ================= MAIN SAFETY TOOL =================

def get_safety_conditions(lat, lon, source="all", time_offset=0):
    """
    AI Tool:
    Get final safety verdict for lat/lon with optional forecast time_offset.

    source="all":
        Open-Meteo + IMD + INCOIS

    source="openmeteo":
        Open-Meteo only

    source="imd":
        IMD only

    source="incois":
        INCOIS high-wave only
    """
    try:

        return get_safety_conditions_primary(
            lat,
            lon,
            source,
            time_offset=time_offset
        )

    except Exception as e:

        print(
            f"  ⚠️ safety primary failed ({str(e)[:80]}) -> fallback"
        )

        return get_safety_conditions_fallback(
            lat,
            lon,
            source,
            time_offset=time_offset
        )


# ================= TEST RUN =================

if __name__ == "__main__":

    print("=" * 70)
    print("SAFETY TOOL - MULTI-SOURCE TEST RUN")
    print("=" * 70)

    wave_result = get_wave_conditions(
        lat=TEST_LAT,
        lon=TEST_LON,
        source=TEST_SOURCE
    )

    print("\n📦 get_wave_conditions =>")
    print(json.dumps(wave_result, indent=1))

    weather_result = get_weather_forecast(
        lat=TEST_LAT,
        lon=TEST_LON,
        source=TEST_SOURCE
    )

    print("\n📦 get_weather_forecast =>")
    print(json.dumps(weather_result, indent=1))

    safety_all = get_safety_conditions(
        lat=TEST_LAT,
        lon=TEST_LON,
        source="all"
    )

    print("\n📦 get_safety_conditions source='all' =>")
    print(json.dumps(safety_all, indent=1))

    safety_openmeteo = get_safety_conditions(
        lat=TEST_LAT,
        lon=TEST_LON,
        source="openmeteo"
    )

    print("\n📦 get_safety_conditions source='openmeteo' =>")
    print(json.dumps(safety_openmeteo, indent=1))

    safety_imd = get_safety_conditions(
        lat=TEST_LAT,
        lon=TEST_LON,
        source="imd"
    )

    print("\n📦 get_safety_conditions source='imd' =>")
    print(json.dumps(safety_imd, indent=1))

    safety_incois = get_safety_conditions(
        lat=TEST_LAT,
        lon=TEST_LON,
        source="incois"
    )

    print("\n📦 get_safety_conditions source='incois' =>")
    print(json.dumps(safety_incois, indent=1))

    print("\nCALL LIST:")
    print("  py .\\tools\\safety_tool.py")
    print("  py -c \"import sys; sys.path.insert(0,'tools'); from safety_tool import get_wave_conditions; import json; print(json.dumps(get_wave_conditions(13.05, 80.30), indent=1))\"")
    print("  py -c \"import sys; sys.path.insert(0,'tools'); from safety_tool import get_weather_forecast; import json; print(json.dumps(get_weather_forecast(13.05, 80.30), indent=1))\"")
    print("  py -c \"import sys; sys.path.insert(0,'tools'); from safety_tool import get_safety_conditions; import json; print(json.dumps(get_safety_conditions(13.05, 80.30, source='all'), indent=1))\"")
    print("  py -c \"import sys; sys.path.insert(0,'tools'); from safety_tool import get_safety_conditions; import json; print(json.dumps(get_safety_conditions(13.05, 80.30, source='openmeteo'), indent=1))\"")
    print("  py -c \"import sys; sys.path.insert(0,'tools'); from safety_tool import get_safety_conditions; import json; print(json.dumps(get_safety_conditions(13.05, 80.30, source='imd'), indent=1))\"")
    print("  py -c \"import sys; sys.path.insert(0,'tools'); from safety_tool import get_safety_conditions; import json; print(json.dumps(get_safety_conditions(13.05, 80.30, source='incois'), indent=1))\"")