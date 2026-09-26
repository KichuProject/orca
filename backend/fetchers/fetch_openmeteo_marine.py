"""
fetch_openmeteo_marine.py
UNIFIED Open-Meteo + IMD Monsoon Fetcher.
Absorbs: marine waves, full weather (current/hourly/daily), rainfall, 
current conditions, safety analysis, and IMD monsoon scraping.
"""
import requests
import json
import time
import sys
import threading
from pathlib import Path
from datetime import datetime
from bs4 import BeautifulSoup

try:
    if sys.stdout and hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    if sys.stderr and hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass


# ============================================================
# PATHS & CONFIG
# ============================================================
SAVE_DIR = Path(r"E:\sih\data\live_cache\waves")
SAVE_DIR.mkdir(parents=True, exist_ok=True)

WEATHER_DIR = Path(r"E:\sih\data\live_cache\weather")
WEATHER_DIR.mkdir(parents=True, exist_ok=True)

MARINE_URL  = "https://marine-api.open-meteo.com/v1/marine"
WEATHER_URL = "https://api.open-meteo.com/v1/forecast"

# Safety thresholds
MAX_WAVE_HEIGHT = 1.5     # meters
MAX_WIND_SPEED = 30       # km/h
MAX_GUSTS = 45            # km/h
DANGEROUS_SWELL = 1.5     # meters
POOR_VISIBILITY = 2000    # meters (2km)
THUNDER_CODES = [95, 96, 99]
DANGEROUS_CAPE = 1500     # J/kg (High lightning risk)

# 8 Major Indian Coasts
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

# ============================================================
# CORE OPEN-METEO FETCHER (Marine + Full Weather + Rain)
# ============================================================
def get_comprehensive_conditions(lat: float, lon: float) -> dict:
    """
    AI Tool: Fetch FULL live marine + weather + rain + lightning data for ANY lat/lon.
    Combines the logic of fetch_current_conditions, fetch_full_weather, and fetch_openmeteo_marine.
    """
    entry = {"coordinates": {"lat": lat, "lon": lon}, "fetched_at": datetime.now().isoformat()}
    
    # ---- 1. MARINE API (Waves, Swell) ----
    try:
        r_marine = requests.get(MARINE_URL, params={
            "latitude": lat, "longitude": lon,
            "current": "wave_height,wave_direction,wave_period,wind_wave_height,swell_wave_height",
            "hourly": "wave_height,wave_direction,wave_period,swell_wave_height",
            "forecast_days": 3, "timezone": "Asia/Kolkata"
        }, timeout=30)
        if r_marine.status_code == 200:
            entry["marine_current"] = r_marine.json().get("current")
            entry["marine_hourly"] = r_marine.json().get("hourly")
        else:
            entry["marine_error"] = "Location might be on land (no marine data)"
    except Exception as e:
        entry["marine_error"] = str(e)

    # ---- 2. WEATHER API (Full Current, Hourly, Daily, Rain, CAPE) ----
    try:
        r_weather = requests.get(WEATHER_URL, params={
            "latitude": lat, "longitude": lon,
            "current": ",".join([
                "temperature_2m", "relative_humidity_2m", "apparent_temperature",
                "precipitation", "rain", "showers", "weather_code", "cloud_cover",
                "pressure_msl", "surface_pressure", "wind_speed_10m", "wind_direction_10m",
                "wind_gusts_10m", "visibility", "is_day"
            ]),
            "hourly": ",".join([
                "temperature_2m", "relative_humidity_2m", "precipitation_probability",
                "precipitation", "rain", "showers", "weather_code", "cloud_cover",
                "visibility", "pressure_msl", "wind_speed_10m", "wind_gusts_10m", "cape"
            ]),
            "daily": ",".join([
                "weather_code", "temperature_2m_max", "temperature_2m_min",
                "precipitation_sum", "rain_sum", "precipitation_probability_max",
                "wind_speed_10m_max", "wind_gusts_10m_max", "sunrise", "sunset"
            ]),
            "forecast_days": 7, "timezone": "Asia/Kolkata", "wind_speed_unit": "kmh"
        }, timeout=30)
        if r_weather.status_code == 200:
            w = r_weather.json()
            entry["weather_current"] = w.get("current")
            entry["weather_hourly"] = w.get("hourly")
            entry["weather_daily"] = w.get("daily")
        else:
            entry["weather_error"] = f"HTTP {r_weather.status_code}"
    except Exception as e:
        entry["weather_error"] = str(e)

    # ---- 3. COMPREHENSIVE SAFETY & RAINFALL ANALYSIS ----
    safety = {"is_safe": True, "verdict": "SAFE ✅", "risks": [], "warnings": []}
    mc = entry.get("marine_current") or {}
    wc = entry.get("weather_current") or {}
    hw = entry.get("weather_hourly") or {}

    # Extract values safely
    wave_height = mc.get("wave_height")
    wind_speed = wc.get("wind_speed_10m")
    gusts = wc.get("wind_gusts_10m")
    swell = mc.get("swell_wave_height")
    weather_code = wc.get("weather_code")
    visibility = wc.get("visibility")
    pressure = wc.get("pressure_msl")
    precipitation = wc.get("precipitation", 0)
    
    # Rainfall Status
    if precipitation == 0:
        rain_status = "NO RAIN"
    elif precipitation < 2.5:
        rain_status = "LIGHT RAIN"
    elif precipitation < 7.5:
        rain_status = "MODERATE RAIN"
    elif precipitation < 15:
        rain_status = "HEAVY RAIN"
    else:
        rain_status = "VERY HEAVY RAIN"
        safety["warnings"].append(f"🌧️ {rain_status}: {precipitation} mm/hr")

    entry["rain_status"] = rain_status

    # Safety Checks
    if wave_height is not None and wave_height > MAX_WAVE_HEIGHT:
        safety["is_safe"] = False
        safety["risks"].append(f"High waves: {wave_height}m (limit: {MAX_WAVE_HEIGHT}m)")
    if wind_speed is not None and wind_speed > MAX_WIND_SPEED:
        safety["is_safe"] = False
        safety["risks"].append(f"Strong winds: {wind_speed} km/h (limit: {MAX_WIND_SPEED} km/h)")
    if gusts is not None and gusts > MAX_GUSTS:
        safety["is_safe"] = False
        safety["risks"].append(f"Dangerous gusts: {gusts} km/h")
    if swell is not None and swell > DANGEROUS_SWELL:
        safety["is_safe"] = False
        safety["risks"].append(f"Large ocean swell: {swell}m")
    if visibility is not None and visibility < POOR_VISIBILITY:
        safety["warnings"].append(f"🌫️ Poor visibility: {visibility}m")
    if weather_code in THUNDER_CODES:
        safety["is_safe"] = False
        safety["risks"].append(f"⚡ THUNDERSTORM ACTIVE (code {weather_code})")
    if pressure is not None and pressure < 1000 and wind_speed is not None and wind_speed > 30:
        safety["is_safe"] = False
        safety["risks"].append(f"🌪️ Cyclonic conditions likely (Pressure: {pressure} hPa)")

    # Next 12h Lightning/Rain Check
    if hw.get("weather_code") and hw.get("cape"):
        next_12h_codes = hw["weather_code"][:12]
        next_12h_cape = hw["cape"][:12]
        if any(c in THUNDER_CODES for c in next_12h_codes if c is not None):
            safety["warnings"].append("⚡ Thunderstorms expected in next 12 hours")
        if any(c > DANGEROUS_CAPE for c in next_12h_cape if c is not None):
            safety["warnings"].append("⚡ High lightning risk building (High CAPE)")

    # Final Verdict
    if not safety["is_safe"]:
        safety["verdict"] = "DANGEROUS ❌" if len(safety["risks"]) >= 2 else "CAUTION ⚠️"
        
    entry["safety_analysis"] = safety
    return entry

# ============================================================
# IMD MONSOON STATUS SCRAPER
# ============================================================
def fetch_imd_monsoon_status():
    """Scrape IMD for monsoon onset/withdrawal info."""
    urls = [
        "https://mausam.imd.gov.in/imd_latest/contents/monsoon.php",
        "https://mausam.imd.gov.in/imd_latest/contents/rainfall.php"
    ]
    monsoon_info = []
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
    for url in urls:
        try:
            response = requests.get(url, headers=headers, timeout=15)
            if response.status_code == 200:
                soup = BeautifulSoup(response.text, 'html.parser')
                for tag in soup.find_all(['p', 'font', 'b', 'td', 'div', 'h2', 'h3']):
                    text = tag.get_text(strip=True)
                    if text and len(text) > 20:
                        monsoon_info.append(text)
        except Exception:
            pass
            
    data = {
        "source": "IMD Monsoon Scrape",
        "scraped_at": datetime.now().isoformat(),
        "monsoon_info": monsoon_info[:20]  # Keep top 20 relevant lines
    }
    out = WEATHER_DIR / "imd_monsoon_status.json"
    out.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"✅ IMD Monsoon status saved ({len(monsoon_info)} entries)")
    return data

_COASTS_FETCH_LOCK = threading.Lock()

def fetch_all_major_coasts(force: bool = False, max_age_seconds: int = 1800):
    """
    Pre-fetch data for 8 major coasts (cached for fast AI responses).
    If cache exists and is newer than max_age_seconds (default 30 mins), returns cached data without refetching.
    Thread-safe to prevent concurrent/overlapping duplicate requests.
    """
    out = SAVE_DIR / "openmeteo_marine_forecast.json"

    # Fast check before lock
    if not force and out.exists():
        cached_data = None
        try:
            mtime = out.stat().st_mtime
            age_s = time.time() - mtime
            if age_s < max_age_seconds:
                loaded = json.loads(out.read_text(encoding="utf-8"))
                if loaded.get("locations") and len(loaded["locations"]) >= len(COASTS):
                    cached_data = loaded
        except Exception:
            cached_data = None

        if cached_data is not None:
            try:
                print(f"🌊 Marine forecast cache is fresh ({int(time.time() - out.stat().st_mtime)}s old, threshold {max_age_seconds}s). Reusing cached 8 coasts.")
            except Exception:
                pass
            return cached_data

    with _COASTS_FETCH_LOCK:
        # Re-check under lock (in case another thread just finished fetching)
        if not force and out.exists():
            cached_data = None
            try:
                mtime = out.stat().st_mtime
                age_s = time.time() - mtime
                if age_s < max_age_seconds:
                    loaded = json.loads(out.read_text(encoding="utf-8"))
                    if loaded.get("locations") and len(loaded["locations"]) >= len(COASTS):
                        cached_data = loaded
            except Exception:
                cached_data = None

            if cached_data is not None:
                try:
                    print(f"🌊 Marine forecast cache is fresh ({int(time.time() - out.stat().st_mtime)}s old). Reusing cached 8 coasts.")
                except Exception:
                    pass
                return cached_data

        result = {
            "scraped_at": datetime.now().isoformat(),
            "source": "Open-Meteo Full Marine+Weather API (live, no API key)",
            "locations": {}
        }
        print("=" * 70)
        print("🌊 FETCHING FULL MARINE + WEATHER + RAIN DATA FOR 8 INDIAN COASTS")
        print("=" * 70)
        
        for name, (lat, lon) in COASTS.items():
            print(f"\n📍 Fetching {name}...")
            entry = get_comprehensive_conditions(lat, lon)
            result["locations"][name] = entry
            
            mc = entry.get("marine_current") or {}
            wc = entry.get("weather_current") or {}
            safety = entry.get("safety_analysis", {})
            
            wh = mc.get('wave_height', '?')
            ws = wc.get('wind_speed_10m', '?')
            temp = wc.get('temperature_2m', '?')
            rain = entry.get('rain_status', '?')
            
            print(f"   🌊 {wh}m | 💨 {ws}km/h | 🌡️ {temp}°C | 🌧️ {rain} | {safety.get('verdict', 'N/A')}")

        try:
            out.parent.mkdir(parents=True, exist_ok=True)
            out.write_text(json.dumps(result, indent=1, ensure_ascii=False), encoding="utf-8")
            print(f"\n✅ Saved unified forecast: {out}")
        except Exception as ex:
            print(f"⚠️ Failed to save unified forecast file: {ex}")

        return result

# ============================================================
# MAIN EXECUTION
# ============================================================
if __name__ == "__main__":
    # 1. Fetch IMD Monsoon Status
    fetch_imd_monsoon_status()
    
    # 2. Pre-cache the 8 major coasts
    fetch_all_major_coasts()
    
    # 3. Test: Dynamic location query
    print("\n" + "=" * 70)
    print("🎯 TESTING DYNAMIC LOCATION QUERIES:")
    print("=" * 70)
    test_points = [
        (13.05, 80.30, "Near Chennai coast"),
        (9.50, 76.50, "Off Kerala coast"),
    ]
    for lat, lon, label in test_points:
        r = get_comprehensive_conditions(lat, lon)
        safety = r.get("safety_analysis", {})
        print(f"\n  📍 {label} ({lat}°N, {lon}°E)")
        print(f"     Rain: {r.get('rain_status')} | Verdict: {safety['verdict']}")