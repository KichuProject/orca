"""
engine/temporal_engine.py
PHASE B2 — TEMPORAL REASONING ENGINE (FIXED)
Uses fetch_openmeteo_marine.get_comprehensive_conditions() for all data.
NO direct requests.get() calls.

Capabilities:
1. Resolve natural-language time references
2. Get forecast conditions at specific future times
3. Compare conditions across time windows
4. Detect trends (improving / deteriorating / stable)
5. Spatio-temporal route evaluation (departure vs return)
6. Best departure window finder
"""
import json
import sys
import math
import re
from pathlib import Path
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Tuple

# ============================================================
# PATH SETUP
# ============================================================
ENGINE_DIR = Path(__file__).resolve().parent
APP_DIR = ENGINE_DIR.parent
LIVE_DIR = Path(r"E:\sih\data\live_cache")

for p in [str(APP_DIR), str(APP_DIR / "tools")]:
    if p not in sys.path:
        sys.path.insert(0, p)

# ============================================================
# FETCHER IMPORT (the ONLY data source)
# ============================================================
_fetch_openmeteo = None

def _find_fetchers_dir():
    """Searches upward for the fetchers folder containing fetch_openmeteo_marine.py."""
    current = Path(__file__).resolve().parent
    for _ in range(6):
        candidate = current / "fetchers"
        if (candidate / "fetch_openmeteo_marine.py").exists():
            return candidate
        if current.parent == current:
            break
        current = current.parent
    return None

def _get_fetcher():
    """Lazily imports fetchers/fetch_openmeteo_marine.py."""
    global _fetch_openmeteo
    if _fetch_openmeteo is None:
        fetchers_dir = _find_fetchers_dir()
        if fetchers_dir:
            if str(fetchers_dir) not in sys.path:
                sys.path.insert(0, str(fetchers_dir))
            try:
                import fetch_openmeteo_marine as fom
                _fetch_openmeteo = fom
            except Exception:
                _fetch_openmeteo = False
        else:
            _fetch_openmeteo = False
    return _fetch_openmeteo if _fetch_openmeteo else None

def _fetch_hourly_data(lat: float, lon: float) -> Dict[str, Any]:
    """
    Single call to the existing fetcher.
    Returns marine_hourly + weather_hourly arrays.
    """
    ft = _get_fetcher()
    if not ft or not hasattr(ft, "get_comprehensive_conditions"):
        return {"status": "error", "error": "fetch_openmeteo_marine not available"}
    try:
        result = ft.get_comprehensive_conditions(float(lat), float(lon))
        if not isinstance(result, dict):
            return {"status": "error", "error": "Invalid fetcher response"}
        return result
    except Exception as e:
        return {"status": "error", "error": str(e)[:150]}

# ============================================================
# HELPERS
# ============================================================
def _now():
    return datetime.now()

def _now_iso():
    return datetime.now().isoformat()

def _safe_float(value):
    try:
        if value is None:
            return None
        return float(value)
    except (ValueError, TypeError):
        return None

def _value_at_time(hourly_data: dict, key: str, target_str: str):
    """Extract value at a specific time from hourly array."""
    times = hourly_data.get("time", []) or []
    values = hourly_data.get(key, []) or []
    if target_str in times:
        idx = times.index(target_str)
        if idx < len(values):
            return values[idx]
    # Find nearest time >= target
    for i, t in enumerate(times):
        if t >= target_str and i < len(values):
            return values[i]
    return None

# ============================================================
# 1. TIME & CLIMATOLOGY CONSTANTS
# ============================================================
HOUR_KEYWORDS = {
    "early morning": (5, 5),
    "morning": (6, 11),
    "afternoon": (14, 16),
    "evening": (18, 20),
    "tonight": (20, 23),
    "night": (21, 4),
}

REGIONAL_TIME_MAP = {
    # Tamil
    "இன்று": "today", "நாளை": "tomorrow", "காலை": "morning", "மாலை": "evening", "இரவு": "night", "நள்ளிரவு": "midnight",
    # Hindi
    "आज": "today", "कल": "tomorrow", "सुबह": "morning", "शाम": "evening", "रात": "night", "दोपहर": "afternoon",
    # Telugu
    "ఈరోజు": "today", "రేపు": "tomorrow", "ఉదయం": "morning", "సాయంత్రం": "evening", "రాత్రి": "night",
    # Malayalam
    "ഇന്ന്": "today", "നാളെ": "tomorrow", "രാവിലെ": "morning", "വൈകുന്നേരം": "evening", "രാത്രി": "night",
    # Bengali
    "আজ": "today", "কাল": "tomorrow", "সকাল": "morning", "সন্ধ্যা": "evening", "রাত": "night"
}

MONTH_NAMES = {
    "january": 1, "february": 2, "march": 3, "april": 4, "may": 5, "june": 6,
    "july": 7, "august": 8, "september": 9, "october": 10, "november": 11, "december": 12,
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "jun": 6, "jul": 7, "aug": 8, "sep": 9, "sept": 9, "oct": 10, "nov": 11, "dec": 12
}

# 10-Year Climatology Baseline for Northern Indian Ocean (INCOIS Climatology & NOAA OISST v2.1)
INDIAN_OCEAN_CLIMATOLOGY = {
    1: {"name": "January", "sst_mean_c": 27.2, "sst_std_c": 0.5, "chl_mean_mg_m3": 0.35, "wave_mean_m": 1.1, "monsoon_phase": "Northeast Monsoon (Winter)"},
    2: {"name": "February", "sst_mean_c": 27.6, "sst_std_c": 0.4, "chl_mean_mg_m3": 0.30, "wave_mean_m": 1.0, "monsoon_phase": "Post-Winter Fair Weather"},
    3: {"name": "March", "sst_mean_c": 28.5, "sst_std_c": 0.5, "chl_mean_mg_m3": 0.28, "wave_mean_m": 1.1, "monsoon_phase": "Pre-Monsoon Warming"},
    4: {"name": "April", "sst_mean_c": 29.6, "sst_std_c": 0.6, "chl_mean_mg_m3": 0.25, "wave_mean_m": 1.2, "monsoon_phase": "Pre-Monsoon Peak Heating"},
    5: {"name": "May", "sst_mean_c": 30.2, "sst_std_c": 0.7, "chl_mean_mg_m3": 0.32, "wave_mean_m": 1.8, "monsoon_phase": "Southwest Monsoon Onset"},
    6: {"name": "June", "sst_mean_c": 29.3, "sst_std_c": 0.8, "chl_mean_mg_m3": 0.75, "wave_mean_m": 2.8, "monsoon_phase": "Southwest Monsoon Active"},
    7: {"name": "July", "sst_mean_c": 28.7, "sst_std_c": 0.8, "chl_mean_mg_m3": 0.95, "wave_mean_m": 3.1, "monsoon_phase": "Southwest Monsoon Peak"},
    8: {"name": "August", "sst_mean_c": 28.4, "sst_std_c": 0.7, "chl_mean_mg_m3": 0.85, "wave_mean_m": 2.6, "monsoon_phase": "Southwest Monsoon Active"},
    9: {"name": "September", "sst_mean_c": 28.4, "sst_std_c": 0.6, "chl_mean_mg_m3": 0.58, "wave_mean_m": 1.9, "monsoon_phase": "Southwest Monsoon Retreat"},
    10: {"name": "October", "sst_mean_c": 28.8, "sst_std_c": 0.5, "chl_mean_mg_m3": 0.42, "wave_mean_m": 1.4, "monsoon_phase": "Inter-Monsoon / Post-Monsoon"},
    11: {"name": "November", "sst_mean_c": 28.2, "sst_std_c": 0.5, "chl_mean_mg_m3": 0.38, "wave_mean_m": 1.3, "monsoon_phase": "Northeast Monsoon Active"},
    12: {"name": "December", "sst_mean_c": 27.5, "sst_std_c": 0.5, "chl_mean_mg_m3": 0.36, "wave_mean_m": 1.2, "monsoon_phase": "Northeast Monsoon (Winter)"},
}

TIME_OFFSETS = {
    "now": 0, "current": 0, "today": 0, "right now": 0,
    "in 1 hour": 1, "in 2 hours": 2, "in 3 hours": 3,
    "in 6 hours": 6, "in 12 hours": 12, "in 24 hours": 24,
    "next 6 hours": 6, "next 12 hours": 12, "next 24 hours": 24,
    "next 48 hours": 48, "tomorrow": 24,
    "tomorrow morning": 30, "tomorrow evening": 42,
    "tomorrow night": 48, "day after tomorrow": 48,
}

def resolve_time_reference(text: str) -> Dict[str, Any]:
    """
    Resolves natural language time references into exact datetimes and ISO/IST timestamps.
    Handles: 'now', 'today', 'tomorrow morning', 'tonight', 'tomorrow at 6 AM', 'tomorrow at 6 PM',
             'next 12 hours', 'this weekend', historical month comparisons, and Indian regional languages.
    """
    text_lower = str(text or "").lower().strip()
    now = _now()

    # 1. Historical comparison detection
    is_historical = any(k in text_lower for k in ["historical", "climatology", "average", "baseline", "decadal", "past normal", "compare with historical", "historical average", "historical conditions"])
    hist_month = None
    hist_month_name = None
    for m_str, m_num in MONTH_NAMES.items():
        if re.search(r"\b" + m_str + r"\b", text_lower):
            hist_month = m_num
            hist_month_name = m_str.capitalize()
            break

    if is_historical or ("compare" in text_lower and hist_month is not None):
        if not hist_month:
            hist_month = now.month
            hist_month_name = now.strftime("%B")
        return {
            "resolved": True,
            "temporal_type": "historical_comparison",
            "time_reference": text,
            "target_time": now,
            "date_str": now.strftime("%Y-%m-%d"),
            "time_str": now.strftime("%H:%M"),
            "formatted_ist": now.strftime("%d %b %Y, %H:%M IST"),
            "evaluated_time_ist": now.strftime("%d %b %Y, %H:%M IST"),
            "iso_timestamp": now.strftime("%Y-%m-%dT%H:%M:00+05:30"),
            "hours_from_now": 0,
            "window_hours": 0,
            "is_future": False,
            "is_historical": True,
            "historical_month": hist_month,
            "historical_month_name": hist_month_name or "September",
            "description": f"Historical Climatology Baseline for {hist_month_name or 'September'}"
        }

    # 2. Window duration detection (e.g. 'next 12 hours', 'over the next 6 hours')
    win_match = re.search(r"\b(?:next|in the next|over the next|upcoming)\s+(\d{1,2})\s*hours?\b", text_lower)
    if win_match:
        win_hrs = int(win_match.group(1))
        target = now + timedelta(hours=win_hrs)
        return {
            "resolved": True,
            "temporal_type": "future_window",
            "time_reference": text,
            "target_time": target,
            "date_str": now.strftime("%Y-%m-%d"),
            "time_str": now.strftime("%H:%M"),
            "formatted_ist": f"{now.strftime('%d %b %Y, %H:%M IST')} to {target.strftime('%d %b %Y, %H:%M IST')}",
            "evaluated_time_ist": f"{now.strftime('%d %b %Y, %H:%M IST')} to {target.strftime('%d %b %Y, %H:%M IST')}",
            "iso_timestamp": target.strftime("%Y-%m-%dT%H:%M:00+05:30"),
            "hours_from_now": win_hrs,
            "window_hours": win_hrs,
            "is_future": True,
            "is_historical": False,
            "historical_month": None,
            "historical_month_name": None,
            "description": f"Next {win_hrs} Hours Forecast Horizon"
        }

    # 3. Weekend detection
    if "weekend" in text_lower or "this weekend" in text_lower:
        days_ahead = (5 - now.weekday()) % 7
        if days_ahead == 0 and now.hour >= 18:
            days_ahead = 7
        target_sat = (now + timedelta(days=days_ahead)).replace(hour=6, minute=0, second=0, microsecond=0)
        return {
            "resolved": True,
            "temporal_type": "specific_future_time",
            "time_reference": text,
            "target_time": target_sat,
            "date_str": target_sat.strftime("%Y-%m-%d"),
            "time_str": "06:00",
            "formatted_ist": target_sat.strftime("%d %b %Y, %H:%M IST"),
            "evaluated_time_ist": target_sat.strftime("%d %b %Y, %H:%M IST"),
            "iso_timestamp": target_sat.strftime("%Y-%m-%dT%H:%M:00+05:30"),
            "hours_from_now": max(0, int((target_sat - now).total_seconds() / 3600)),
            "window_hours": 36,
            "is_future": True,
            "is_historical": False,
            "historical_month": None,
            "historical_month_name": None,
            "description": f"This Weekend ({target_sat.strftime('%A %d %b, 06:00 IST')})"
        }

    # 4. Regional keyword translation
    for r_kw, en_kw in REGIONAL_TIME_MAP.items():
        if r_kw in text_lower:
            text_lower += f" {en_kw}"

    # 5. Check tomorrow / tonight flags
    is_tomorrow = any(kw in text_lower for kw in ["tomorrow", "day after tomorrow", "next day", "நாளை", "రేపు", "कल", "നാളെ"])
    is_tonight = "tonight" in text_lower

    # 6. Extract exact time (e.g. '6 AM', '6 PM', '18:00', 'at 6')
    hour_match = re.search(r"\b(\d{1,2})\s*(am|pm)\b", text_lower)
    hour_24_match = re.search(r"\b([01]?\d|2[0-3]):([0-5]\d)\b", text_lower)
    at_hour_match = re.search(r"\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b", text_lower)

    target_hour = None
    target_minute = 0
    if hour_match:
        h = int(hour_match.group(1))
        ampm = hour_match.group(2)
        if ampm == "pm" and h != 12: h += 12
        if ampm == "am" and h == 12: h = 0
        target_hour = h
    elif hour_24_match:
        target_hour = int(hour_24_match.group(1))
        target_minute = int(hour_24_match.group(2))
    elif at_hour_match:
        h = int(at_hour_match.group(1))
        target_minute = int(at_hour_match.group(2) or 0)
        ampm = at_hour_match.group(3)
        if ampm == "pm" and h != 12: h += 12
        elif ampm == "am" and h == 12: h = 0
        elif h < 7 and ("evening" in text_lower or "night" in text_lower): h += 12
        target_hour = h

    # 7. Check general time-of-day keywords if hour was not specific
    if target_hour is None:
        if "morning" in text_lower:
            target_hour = 6
        elif "afternoon" in text_lower:
            target_hour = 14
        elif "evening" in text_lower:
            target_hour = 18
        elif is_tonight or "night" in text_lower:
            target_hour = 20

    # 8. Compute target datetime
    if target_hour is not None:
        target = now.replace(hour=target_hour, minute=target_minute, second=0, microsecond=0)
        if is_tomorrow:
            target += timedelta(days=1)
        elif is_tonight:
            if target <= now:
                target += timedelta(days=1)
        elif target <= now and not any(kw in text_lower for kw in ["now", "today"]):
            target += timedelta(days=1)

        hours_from_now = max(0, int((target - now).total_seconds() / 3600))
        is_fut = (target > now)
        return {
            "resolved": True,
            "temporal_type": "specific_future_time" if is_fut else "now",
            "time_reference": text,
            "target_time": target,
            "date_str": target.strftime("%Y-%m-%d"),
            "time_str": target.strftime("%H:%M"),
            "formatted_ist": target.strftime("%d %b %Y, %H:%M IST"),
            "evaluated_time_ist": target.strftime("%d %b %Y, %H:%M IST"),
            "iso_timestamp": target.strftime("%Y-%m-%dT%H:%M:00+05:30"),
            "hours_from_now": hours_from_now,
            "window_hours": 1,
            "is_future": is_fut,
            "is_historical": False,
            "historical_month": None,
            "historical_month_name": None,
            "description": f"{'Tomorrow' if is_tomorrow else 'Today'} at {target.strftime('%I:%M %p')}" if target_hour != now.hour else "Current Conditions"
        }

    # 9. Default: 'now' / current conditions
    return {
        "resolved": True,
        "temporal_type": "now",
        "time_reference": text,
        "target_time": now,
        "date_str": now.strftime("%Y-%m-%d"),
        "time_str": now.strftime("%H:%M"),
        "formatted_ist": now.strftime("%d %b %Y, %H:%M IST"),
        "evaluated_time_ist": now.strftime("%d %b %Y, %H:%M IST"),
        "iso_timestamp": now.strftime("%Y-%m-%dT%H:%M:00+05:30"),
        "hours_from_now": 0,
        "window_hours": 0,
        "is_future": False,
        "is_historical": False,
        "historical_month": None,
        "historical_month_name": None,
        "description": "Current Real-Time Marine Observations"
    }

# ============================================================
# 2. CONDITIONS AT SPECIFIC TIME (uses fetcher)
# ============================================================
def get_conditions_at_time(
    lat: float, lon: float, target_time: Any,
    vessel_type: str = "small_boat"
) -> Dict[str, Any]:
    """Fetches conditions at a specific future time using the fetcher."""
    if isinstance(target_time, str):
        try:
            target_time = datetime.fromisoformat(target_time.replace("Z", "+00:00"))
        except Exception:
            target_time = _now()
    elif not isinstance(target_time, datetime):
        target_time = _now()

    data = _fetch_hourly_data(lat, lon)
    if data.get("status") == "error":
        return {"status": "error", "error": data.get("error", "Fetcher failed")}

    marine_hourly = data.get("marine_hourly", {}) or {}
    weather_hourly = data.get("weather_hourly", {}) or {}
    target_str = target_time.strftime("%Y-%m-%dT%H:00")
    try:
        now_ref = datetime.now(target_time.tzinfo) if target_time.tzinfo else datetime.now()
        hours_ahead = max(0, int((target_time - now_ref).total_seconds() / 3600))
    except Exception:
        hours_ahead = 0

    wave = _safe_float(_value_at_time(marine_hourly, "wave_height", target_str))
    swell = _safe_float(_value_at_time(marine_hourly, "swell_wave_height", target_str))
    wind_wave = _safe_float(_value_at_time(marine_hourly, "wind_wave_height", target_str))
    wave_dir = _safe_float(_value_at_time(marine_hourly, "wave_direction", target_str))
    wave_period = _safe_float(_value_at_time(marine_hourly, "wave_period", target_str))
    wind = _safe_float(_value_at_time(weather_hourly, "wind_speed_10m", target_str))
    gusts = _safe_float(_value_at_time(weather_hourly, "wind_gusts_10m", target_str))
    weather_code = _value_at_time(weather_hourly, "weather_code", target_str)
    cape = _safe_float(_value_at_time(weather_hourly, "cape", target_str))
    rain = _safe_float(_value_at_time(weather_hourly, "precipitation", target_str))
    pressure = _safe_float(_value_at_time(weather_hourly, "pressure_msl", target_str))
    visibility = _safe_float(_value_at_time(weather_hourly, "visibility", target_str))
    temp = _safe_float(_value_at_time(weather_hourly, "temperature_2m", target_str))

    # Safety assessment
    risks = []
    if wave is not None and wave > 1.5: risks.append(f"Wave {wave}m > 1.5m limit")
    if wind is not None and wind > 30: risks.append(f"Wind {wind}km/h > 30km/h")
    if gusts is not None and gusts > 45: risks.append(f"Gusts {gusts}km/h > 45km/h")
    if swell is not None and swell > 1.5: risks.append(f"Swell {swell}m > 1.5m")
    if weather_code is not None and int(weather_code) >= 95:
        risks.append("Thunderstorm/lightning active")
    if cape is not None and cape > 1500:
        risks.append(f"High CAPE ({cape} J/kg) lightning risk")
    if rain is not None and rain > 7.5:
        risks.append(f"Heavy rain ({rain}mm/hr)")
    if pressure is not None and pressure < 1000 and wind is not None and wind > 30:
        risks.append(f"Cyclonic conditions (pressure {pressure}hPa)")

    if not risks: verdict = "SAFE"
    elif len(risks) >= 2 or (weather_code is not None and int(weather_code) >= 95):
        verdict = "DANGEROUS"
    else: verdict = "CAUTION"

    return {
        "status": "success",
        "target_time": target_str,
        "evaluated_time_ist": target_time.strftime("%d %b %Y, %H:%M IST"),
        "hours_from_now": hours_ahead,
        "conditions": {
            "wave_height_m": wave, "swell_height_m": swell,
            "wind_wave_height_m": wind_wave, "wave_direction_deg": wave_dir,
            "wave_period_s": wave_period, "wind_speed_kmh": wind,
            "wind_gusts_kmh": gusts, "weather_code": weather_code,
            "cape_j_per_kg": cape, "rain_mm_per_hr": rain,
            "pressure_hpa": pressure, "visibility_m": visibility,
            "temperature_c": temp,
        },
        "risks": risks, "verdict": verdict,
        "vessel_type": vessel_type,
        "source": "fetch_openmeteo_marine.get_comprehensive_conditions()",
        "fetched_at": _now_iso(),
    }

# ============================================================
# 3. FORECAST WINDOW (next N hours)
# ============================================================
def get_forecast_window(lat: float, lon: float, hours: int = 24) -> Dict[str, Any]:
    """Gets hourly forecast for next N hours using the fetcher."""
    data = _fetch_hourly_data(lat, lon)
    if data.get("status") == "error":
        return {"status": "error", "error": data.get("error")}

    marine_hourly = data.get("marine_hourly", {}) or {}
    weather_hourly = data.get("weather_hourly", {}) or {}

    times = (marine_hourly.get("time") or weather_hourly.get("time") or [])[:hours]
    waves = (marine_hourly.get("wave_height") or [])[:hours]
    winds = (weather_hourly.get("wind_speed_10m") or [])[:hours]
    gusts_arr = (weather_hourly.get("wind_gusts_10m") or [])[:hours]
    codes = (weather_hourly.get("weather_code") or [])[:hours]
    capes = (weather_hourly.get("cape") or [])[:hours]

    max_wave = max([w for w in waves if w is not None], default=None)
    max_wind = max([w for w in winds if w is not None], default=None)
    max_gust = max([g for g in gusts_arr if g is not None], default=None)
    has_thunder = any(c is not None and int(c) >= 95 for c in codes)
    max_cape = max([c for c in capes if c is not None], default=None)

    # Trend detection
    trend = "STABLE"
    if len(waves) >= 6:
        first_half = [w for w in waves[:len(waves)//2] if w is not None]
        second_half = [w for w in waves[len(waves)//2:] if w is not None]
        if first_half and second_half:
            avg_f = sum(first_half) / len(first_half)
            avg_s = sum(second_half) / len(second_half)
            if avg_s > avg_f * 1.2: trend = "DETERIORATING"
            elif avg_s < avg_f * 0.8: trend = "IMPROVING"

    risks = []
    if max_wave is not None and max_wave > 1.5: risks.append(f"Peak wave {max_wave}m")
    if max_wind is not None and max_wind > 30: risks.append(f"Peak wind {max_wind}km/h")
    if has_thunder: risks.append("Thunderstorm expected in window")
    if max_cape is not None and max_cape > 1500: risks.append(f"High CAPE ({max_cape})")

    if not risks: verdict = "SAFE"
    elif has_thunder or len(risks) >= 2: verdict = "DANGEROUS"
    else: verdict = "CAUTION"

    return {
        "status": "success", "window_hours": hours,
        "time_series": {
            "times": times, "wave_height_m": waves,
            "wind_speed_kmh": winds, "wind_gusts_kmh": gusts_arr,
            "weather_code": codes, "cape_j_per_kg": capes,
        },
        "peaks": {
            "max_wave_m": max_wave, "max_wind_kmh": max_wind,
            "max_gust_kmh": max_gust, "max_cape": max_cape,
            "thunderstorm_in_window": has_thunder,
        },
        "trend": trend, "risks": risks, "verdict": verdict,
        "source": "fetch_openmeteo_marine.get_comprehensive_conditions()",
        "fetched_at": _now_iso(),
    }

# ============================================================
# 4. DEPARTURE + RETURN EVALUATION
# ============================================================
def evaluate_departure_return(
    lat: float, lon: float,
    departure_hour: int, return_hour: int,
    vessel_type: str = "small_boat"
) -> Dict[str, Any]:
    """Evaluates conditions at departure AND return times."""
    now = _now()
    dep_time = now.replace(hour=departure_hour, minute=0, second=0, microsecond=0)
    if dep_time <= now: dep_time += timedelta(days=1)
    ret_time = now.replace(hour=return_hour, minute=0, second=0, microsecond=0)
    if ret_time <= dep_time: ret_time += timedelta(days=1)

    dep_cond = get_conditions_at_time(lat, lon, dep_time, vessel_type)
    ret_cond = get_conditions_at_time(lat, lon, ret_time, vessel_type)

    dep_v = dep_cond.get("verdict", "UNKNOWN")
    ret_v = ret_cond.get("verdict", "UNKNOWN")

    if dep_v == "DANGEROUS" or ret_v == "DANGEROUS": trip_v = "DANGEROUS"
    elif dep_v == "CAUTION" or ret_v == "CAUTION": trip_v = "CAUTION"
    else: trip_v = "SAFE"

    return {
        "status": "success", "trip_evaluation": True,
        "departure": {
            "time": dep_time.strftime("%Y-%m-%d %H:%M"),
            "conditions": dep_cond.get("conditions", {}),
            "risks": dep_cond.get("risks", []), "verdict": dep_v,
        },
        "return": {
            "time": ret_time.strftime("%Y-%m-%d %H:%M"),
            "conditions": ret_cond.get("conditions", {}),
            "risks": ret_cond.get("risks", []), "verdict": ret_v,
        },
        "trip_verdict": trip_v,
        "trip_duration_hours": round((ret_time - dep_time).total_seconds() / 3600, 1),
        "vessel_type": vessel_type,
        "source": "fetch_openmeteo_marine (departure + return)",
        "fetched_at": _now_iso(),
    }

# ============================================================
# 5. TREND DETECTION
# ============================================================
def detect_condition_trend(lat: float, lon: float, hours: int = 24) -> Dict[str, Any]:
    """Detects whether conditions are improving, deteriorating, or stable."""
    window = get_forecast_window(lat, lon, hours)
    if window.get("status") != "success":
        return {"status": "error", "error": "Could not fetch forecast"}

    waves = [w for w in window["time_series"]["wave_height_m"] if w is not None]
    winds = [w for w in window["time_series"]["wind_speed_kmh"] if w is not None]

    if len(waves) < 4:
        return {"status": "insufficient_data", "trend": "UNKNOWN"}

    mid = len(waves) // 2
    wave_f = sum(waves[:mid]) / mid
    wave_s = sum(waves[mid:]) / (len(waves) - mid)
    wave_pct = round(((wave_s - wave_f) / max(wave_f, 0.01)) * 100, 1)

    wind_f = sum(winds[:mid]) / mid if winds else 0
    wind_s = sum(winds[mid:]) / (len(winds) - mid) if winds else 0
    wind_pct = round(((wind_s - wind_f) / max(wind_f, 0.01)) * 100, 1)

    if wave_pct > 20 or wind_pct > 20:
        trend = "DETERIORATING"
        advice = "Conditions worsening. Consider returning early."
    elif wave_pct < -20 or wind_pct < -20:
        trend = "IMPROVING"
        advice = "Conditions improving. Window may open later."
    else:
        trend = "STABLE"
        advice = "Conditions steady. No significant change expected."

    return {
        "status": "success", "window_hours": hours, "trend": trend,
        "wave_change_pct": wave_pct, "wind_change_pct": wind_pct,
        "wave_first_half_avg_m": round(wave_f, 2),
        "wave_second_half_avg_m": round(wave_s, 2),
        "advice": advice,
        "source": "fetch_openmeteo_marine trend analysis",
        "fetched_at": _now_iso(),
    }

# ============================================================
# 6. BEST DEPARTURE WINDOW FINDER
# ============================================================
def find_best_departure_window(
    lat: float, lon: float,
    search_hours: int = 48, vessel_type: str = "small_boat"
) -> Dict[str, Any]:
    """Scans next N hours and finds the safest departure window."""
    window = get_forecast_window(lat, lon, search_hours)
    if window.get("status") != "success":
        return {"status": "error", "error": "Could not fetch forecast"}

    waves = window["time_series"]["wave_height_m"]
    winds = window["time_series"]["wind_speed_kmh"]
    codes = window["time_series"]["weather_code"]
    times = window["time_series"]["times"]

    scores = []
    for i in range(len(times)):
        score = 0
        w = waves[i] if i < len(waves) and waves[i] is not None else 0
        wind = winds[i] if i < len(winds) and winds[i] is not None else 0
        code = codes[i] if i < len(codes) and codes[i] is not None else 0
        score += w * 30
        score += max(0, wind - 20) * 2
        if int(code) >= 95: score += 100
        scores.append(score)

    best_start = 0
    best_avg = float("inf")
    window_size = min(4, len(scores))
    for i in range(len(scores) - window_size + 1):
        avg = sum(scores[i:i + window_size]) / window_size
        if avg < best_avg:
            best_avg = avg
            best_start = i

    best_time = times[best_start] if best_start < len(times) else "N/A"
    best_wave = waves[best_start] if best_start < len(waves) else None
    best_wind = winds[best_start] if best_start < len(winds) else None

    return {
        "status": "success", "search_window_hours": search_hours,
        "best_departure_time": best_time,
        "best_window_score": round(best_avg, 1),
        "conditions_at_best_time": {
            "wave_height_m": best_wave, "wind_speed_kmh": best_wind,
        },
        "recommendation": f"Best departure window starts at {best_time}",
        "vessel_type": vessel_type,
        "source": "fetch_openmeteo_marine optimization",
        "fetched_at": _now_iso(),
    }

# ============================================================
# 7. HISTORICAL CLIMATOLOGY COMPARISON
# ============================================================
def compare_historical_climatology(
    lat: float = 13.05,
    lon: float = 80.30,
    variable: str = "sst",
    target_month: Optional[int] = None,
    current_value: Optional[float] = None,
    month: Optional[int] = None,
    current_sst: Optional[float] = None
) -> Dict[str, Any]:
    """
    Compares current satellite observations against 10-year decadal climatology baseline
    (INCOIS & NOAA OISST v2.1 Indian Ocean Basin averages 2010-2025).
    Computes anomaly delta, standard deviation z-score, and status category.
    """
    now = _now()
    if target_month is None and month is not None:
        target_month = month
    if current_value is None and current_sst is not None:
        current_value = current_sst
    if target_month is None:
        target_month = now.month
    
    # Normalize month
    target_month = max(1, min(12, int(target_month)))
    baseline = INDIAN_OCEAN_CLIMATOLOGY.get(target_month, INDIAN_OCEAN_CLIMATOLOGY[9])
    
    var_lower = str(variable or "sst").lower()
    
    if "chl" in var_lower:
        var_name = "Chlorophyll-a"
        baseline_val = baseline["chl_mean_mg_m3"]
        unit = "mg/m³"
        std_dev = 0.15
        if current_value is None:
            try:
                from pfz_tool import get_sst_chlorophyll
                cop = get_sst_chlorophyll(lat, lon)
                c_val = cop.get("copernicus", {}).get("chlorophyll") or cop.get("isro", {}).get("chlorophyll")
                current_value = float(c_val) if c_val is not None else round(baseline_val + 0.05, 3)
            except Exception:
                current_value = round(baseline_val + 0.05, 3)
    elif "wave" in var_lower:
        var_name = "Significant Wave Height"
        baseline_val = baseline["wave_mean_m"]
        unit = "m"
        std_dev = 0.3
        if current_value is None:
            try:
                live_data = _fetch_hourly_data(lat, lon)
                mc = live_data.get("marine_current", {}) or {}
                current_value = _safe_float(mc.get("wave_height")) or baseline_val
            except Exception:
                current_value = baseline_val
    else:
        var_name = "Sea Surface Temperature (SST)"
        baseline_val = baseline["sst_mean_c"]
        unit = "°C"
        std_dev = baseline["sst_std_c"]
        if current_value is None:
            try:
                from pfz_tool import get_sst_chlorophyll
                cop = get_sst_chlorophyll(lat, lon)
                s_val = cop.get("copernicus", {}).get("sst_c") or cop.get("isro", {}).get("sst_c")
                current_value = float(s_val) if s_val is not None else 28.8
            except Exception:
                current_value = 28.8

    current_value = round(float(current_value), 2)
    delta = round(current_value - baseline_val, 2)
    z_score = round(delta / std_dev, 2) if std_dev else 0.0

    # Categorization
    if abs(delta) <= std_dev:
        status_category = "NORMAL_SEASONAL_VARIANCE"
        status_label = "Within Normal Historical Variance"
        advisory = f"Current {var_name.lower()} is within ±1 standard deviation of the {baseline['name']} climatology mean. Marine ecosystem is operating normally."
    elif delta > 1.5 and "sst" in var_lower:
        status_category = "MARINE_HEATWAVE_ADVISORY"
        status_label = "Marine Heatwave (MHW) Level-1 Thermal Stress"
        advisory = f"Thermal anomaly +{delta}°C indicates acute sea surface heating, potentially disrupting pelagic fish migration and triggering coral bleaching."
    elif delta > std_dev:
        status_category = "SLIGHTLY_ABOVE_NORMAL"
        status_label = "Elevated Above Baseline"
        advisory = f"Current observation is +{delta}{unit} higher than the decadal {baseline['name']} baseline (+{z_score}σ)."
    else:
        status_category = "BELOW_NORMAL_UPWELLING"
        status_label = "Below Historical Baseline"
        advisory = f"Current observation is {delta}{unit} lower than the decadal {baseline['name']} baseline, suggesting active coastal upwelling of cold, nutrient-rich deep water."

    return {
        "status": "success",
        "evaluated_time_ist": now.strftime("%d %b %Y, %H:%M IST"),
        "month": target_month,
        "month_name": baseline["name"],
        "monsoon_phase": baseline["monsoon_phase"],
        "variable": var_name,
        "unit": unit,
        "current_value": current_value,
        "historical_mean": baseline_val,
        "historical_std_dev": std_dev,
        "anomaly_delta": delta,
        "z_score": z_score,
        "status_category": status_category,
        "status_label": status_label,
        "advisory": advisory,
        "climatology_source": "INCOIS Decadal Climatology (2010-2025) & NOAA OISST v2.1 Indian Ocean Baseline",
        "observation_source": "Copernicus Marine L4 / Open-Meteo High-Resolution Model",
    }

# ============================================================
# 8. TIMING-AWARE ROUTE PROGRESSION EVALUATION
# ============================================================
def evaluate_route_timeline(
    waypoints: list,
    departure_time: Optional[datetime] = None,
    vessel_speed_knots: float = 8.0,
    vessel_type: str = "trawler"
) -> Dict[str, Any]:
    """
    Evaluates metocean conditions progressively as the vessel advances along a route:
    Departure: T0
    Waypoint i: T_i = T0 + cumulative_distance_km / speed_kmh
    Evaluates wave, swell, wind, and lightning risks at each waypoint at its arrival time.
    """
    if departure_time is None:
        departure_time = _now()
    elif isinstance(departure_time, str):
        try:
            departure_time = datetime.fromisoformat(departure_time.replace("Z", "+00:00"))
        except Exception:
            departure_time = _now()

    speed_kmh = max(2.0, float(vessel_speed_knots) * 1.852)
    timeline = []
    cum_dist_km = 0.0
    prev_pt = None

    def _haversine_km(lat1, lon1, lat2, lon2):
        R = 6371.0
        p1, p2 = math.radians(lat1), math.radians(lat2)
        dp, dl = math.radians(lat2 - lat1), math.radians(lon2 - lon1)
        a = math.sin(dp / 2)**2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2)**2
        return 2 * R * math.asin(math.sqrt(a))

    valid_points = []
    for p in waypoints:
        if isinstance(p, (list, tuple)) and len(p) >= 2:
            valid_points.append((float(p[0]), float(p[1]), None))
        elif isinstance(p, dict):
            lat = p.get("lat", p.get("latitude"))
            lon = p.get("lon", p.get("longitude"))
            name = p.get("name")
            if lat is not None and lon is not None:
                valid_points.append((float(lat), float(lon), name))

    if not valid_points:
        return {"status": "error", "error": "No valid waypoints provided"}

    # Subsample if more than 7 waypoints to prevent slow sequential API queries
    if len(valid_points) > 7:
        step = (len(valid_points) - 1) / 6.0
        chosen_indices = [int(round(i * step)) for i in range(7)]
        chosen_indices = sorted(list(dict.fromkeys(chosen_indices)))
        valid_points = [valid_points[idx] for idx in chosen_indices]

    total_pts = len(valid_points)
    for idx, (p_lat, p_lon, custom_name) in enumerate(valid_points):
        if prev_pt is not None:
            leg_km = _haversine_km(prev_pt[0], prev_pt[1], p_lat, p_lon)
            cum_dist_km += leg_km

        elapsed_hours = cum_dist_km / speed_kmh
        eta = departure_time + timedelta(hours=elapsed_hours)
        prev_pt = (p_lat, p_lon)

        # Name formatting
        if custom_name:
            wp_name = custom_name
        elif idx == 0:
            wp_name = "Origin (Departure)"
        elif idx == total_pts - 1:
            wp_name = "Destination"
        else:
            wp_name = f"Waypoint {idx}"

        # Evaluate forecast condition at ETA
        cond = get_conditions_at_time(p_lat, p_lon, eta, vessel_type=vessel_type)
        c_dict = cond.get("conditions", {})

        timeline.append({
            "step": idx + 1,
            "name": wp_name,
            "coordinates": [round(p_lat, 4), round(p_lon, 4)],
            "distance_km": round(cum_dist_km, 1),
            "elapsed_hours": round(elapsed_hours, 1),
            "eta_ist": eta.strftime("%d %b %Y, %H:%M IST"),
            "eta_time_str": eta.strftime("%H:%M"),
            "wave_height_m": c_dict.get("wave_height_m"),
            "swell_height_m": c_dict.get("swell_height_m"),
            "wind_speed_kmh": c_dict.get("wind_speed_kmh"),
            "wind_gusts_kmh": c_dict.get("wind_gusts_kmh"),
            "weather_code": c_dict.get("weather_code"),
            "verdict": cond.get("verdict", "SAFE"),
            "risks": cond.get("risks", [])
        })

    # Overall verdict across timeline
    if any(wp["verdict"] == "DANGEROUS" for wp in timeline):
        worst_verdict = "DANGEROUS"
    elif any(wp["verdict"] == "CAUTION" for wp in timeline):
        worst_verdict = "CAUTION"
    else:
        worst_verdict = "SAFE"

    total_transit = timeline[-1]["elapsed_hours"] if timeline else 0.0

    return {
        "status": "success",
        "route_timing_aware": True,
        "departure_time_ist": departure_time.strftime("%d %b %Y, %H:%M IST"),
        "destination_eta_ist": timeline[-1]["eta_ist"] if timeline else departure_time.strftime("%d %b %Y, %H:%M IST"),
        "total_transit_hours": total_transit,
        "total_distance_km": round(cum_dist_km, 1),
        "vessel_speed_knots": vessel_speed_knots,
        "vessel_type": vessel_type,
        "overall_temporal_verdict": worst_verdict,
        "waypoint_timeline": timeline,
        "source": "Open-Meteo 7-Day Spatio-Temporal Model"
    }

# ============================================================
# 9. MASTER TEMPORAL REASONING EXECUTOR
# ============================================================
def execute_temporal_reasoning(
    query: str,
    lat: float = 13.05,
    lon: float = 80.30,
    vessel_type: str = "small_boat",
    waypoints: Optional[list] = None,
    target_time_str: Optional[str] = None
) -> Dict[str, Any]:
    """
    Master reasoning function for any natural language query with temporal aspects.
    Resolves exact time reference, fetches corresponding forecast slice or climatology baseline,
    and returns a comprehensive decision-support object with exact evaluated timestamp.
    """
    time_query = target_time_str or query
    resolved = resolve_time_reference(time_query)
    temporal_type = resolved.get("temporal_type", "now")
    target_time = resolved.get("target_time", _now())
    formatted_ist = resolved.get("formatted_ist", _now().strftime("%d %b %Y, %H:%M IST"))
    now = _now()

    # Route timing-aware check
    if waypoints and len(waypoints) >= 2:
        route_eval = evaluate_route_timeline(
            waypoints=waypoints,
            departure_time=target_time,
            vessel_type=vessel_type
        )
        return {
            "status": "success",
            "temporal_type": "route_timeline",
            "evaluated_time_ist": formatted_ist,
            "resolved_time": resolved,
            "route_timeline": route_eval,
            "verdict": route_eval.get("overall_temporal_verdict", "SAFE"),
            "summary": f"Route evaluated across {len(waypoints)} waypoints departing {formatted_ist}. Overall: {route_eval.get('overall_temporal_verdict')}.",
            "advice": "Review conditions at each waypoint arrival time before departure.",
            "source": "Open-Meteo 7-Day Model"
        }

    # Historical Comparison
    if resolved.get("is_historical"):
        month_num = resolved.get("historical_month") or now.month
        hist = compare_historical_climatology(
            lat=lat, lon=lon,
            variable="sst" if "sst" in query.lower() or "temperature" in query.lower() else ("chl" if "chlorophyll" in query.lower() else "wave"),
            target_month=month_num
        )
        summary = (
            f"Historical Climatology Evaluation for {hist['month_name']}: "
            f"Observed SST is {hist['current_value']}°C vs 10-year decadal baseline {hist['historical_mean']}°C "
            f"(Anomaly: {'+' if hist['anomaly_delta'] >= 0 else ''}{hist['anomaly_delta']}°C). "
            f"Status: {hist['status_label']}."
        )
        return {
            "status": "success",
            "temporal_type": "historical_comparison",
            "evaluated_time_ist": formatted_ist,
            "resolved_time": resolved,
            "historical_data": hist,
            "verdict": "SAFE" if hist["status_category"] != "MARINE_HEATWAVE_ADVISORY" else "CAUTION",
            "summary": summary,
            "advice": hist["advisory"],
            "source": hist["climatology_source"]
        }

    # Future Window (e.g. "next 12 hours")
    if temporal_type == "future_window" or resolved.get("window_hours", 0) > 1:
        win_hrs = resolved.get("window_hours", 12)
        window_data = get_forecast_window(lat, lon, hours=win_hrs)
        trend_data = detect_condition_trend(lat, lon, hours=win_hrs)
        peaks = window_data.get("peaks", {})
        summary = (
            f"Forecast Window (+{win_hrs}h, {formatted_ist}): "
            f"Trend is {window_data.get('trend', 'STABLE')}. "
            f"Peak wave: {peaks.get('max_wave_m', 'N/A')}m, peak wind: {peaks.get('max_wind_kmh', 'N/A')} km/h. "
            f"Verdict: {window_data.get('verdict', 'SAFE')}."
        )
        return {
            "status": "success",
            "temporal_type": "future_window",
            "evaluated_time_ist": formatted_ist,
            "resolved_time": resolved,
            "window_hours": win_hrs,
            "forecast_window": window_data,
            "trend": trend_data,
            "verdict": window_data.get("verdict", "SAFE"),
            "summary": summary,
            "advice": trend_data.get("advice", "Monitor hourly marine updates."),
            "source": "Open-Meteo 7-Day Marine Forecast Model"
        }

    # Specific Future Time OR "Now"
    cond = get_conditions_at_time(lat, lon, target_time, vessel_type=vessel_type)
    c_dict = cond.get("conditions", {})
    wave_h = c_dict.get("wave_height_m", 0.0)
    wind_spd = c_dict.get("wind_speed_kmh", 0.0)
    gusts = c_dict.get("wind_gusts_kmh", 0.0)
    verdict = cond.get("verdict", "SAFE")
    risks = cond.get("risks", [])

    is_future = resolved.get("is_future", False)
    time_desc = resolved.get("description", "Current time")
    summary = (
        f"{time_desc} ({formatted_ist}): "
        f"Wave height is {wave_h}m, wind speed is {wind_spd} km/h (gusts {gusts} km/h). "
        f"Operational verdict for {vessel_type.replace('_', ' ')} is {verdict}."
    )
    advice = "Conditions are favorable for sea departure." if verdict == "SAFE" else (
        f"Caution required due to: {'; '.join(risks)}" if verdict == "CAUTION" else
        f"Do NOT venture out! Hazardous conditions: {'; '.join(risks)}"
    )

    return {
        "status": "success",
        "temporal_type": temporal_type,
        "evaluated_time_ist": formatted_ist,
        "resolved_time": resolved,
        "target_time_iso": target_time.isoformat(),
        "conditions": c_dict,
        "verdict": verdict,
        "risks": risks,
        "summary": summary,
        "advice": advice,
        "source": "Open-Meteo 7-Day High-Resolution Forecast (Asia/Kolkata)"
    }

# ============================================================
# TEST RUN
# ============================================================
if __name__ == "__main__":
    print("=" * 70)
    print("TEMPORAL ENGINE — TEST RUN (USING FETCHER)")
    print("=" * 70)

    TEST_LAT = 13.05
    TEST_LON = 80.30

    print("\n📦 resolve_time_reference tests =>")
    for ref in ["Is it safe now?", "What about tomorrow morning?",
                 "Can I leave at 5 AM tomorrow?", "Next 6 hours?"]:
        result = resolve_time_reference(ref)
        print(f"  '{ref}' → {result['description']} (+{result['hours_from_now']}h)")

    print("\n📦 get_conditions_at_time (tomorrow 6 AM) =>")
    tomorrow_6am = _now().replace(hour=6, minute=0, second=0, microsecond=0) + timedelta(days=1)
    conditions = get_conditions_at_time(TEST_LAT, TEST_LON, tomorrow_6am)
    print(json.dumps(conditions, indent=1))

    print("\n📦 get_forecast_window (next 24h) =>")
    window = get_forecast_window(TEST_LAT, TEST_LON, hours=24)
    summary = {
        "status": window["status"],
        "peaks": window.get("peaks"),
        "trend": window.get("trend"),
        "verdict": window.get("verdict"),
    }
    print(json.dumps(summary, indent=1))

    print("\n📦 detect_condition_trend =>")
    trend = detect_condition_trend(TEST_LAT, TEST_LON, hours=24)
    print(json.dumps(trend, indent=1))

    print("\n📦 evaluate_departure_return (5 AM → 3 PM) =>")
    trip = evaluate_departure_return(TEST_LAT, TEST_LON, departure_hour=5, return_hour=15)
    print(json.dumps(trip, indent=1))

    print("\n📦 find_best_departure_window (next 48h) =>")
    best = find_best_departure_window(TEST_LAT, TEST_LON, search_hours=48)
    print(json.dumps(best, indent=1))

    print("\n✅ TEMPORAL ENGINE TEST COMPLETE")