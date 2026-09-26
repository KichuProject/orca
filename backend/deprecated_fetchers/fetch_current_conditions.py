"""
fetch_current_conditions.py
Fetches REAL-TIME current weather for any user location.
This is what the AI Agent calls dynamically when a user asks about their location.
"""
import requests
import json
from pathlib import Path
from datetime import datetime

SAVE_DIR = Path("E:/sih/data/live_cache/weather")
SAVE_DIR.mkdir(parents=True, exist_ok=True)


def get_current_conditions(lat: float, lon: float) -> dict:
    """
    Get REAL-TIME current weather conditions for any coordinate.
    This is the function your AI Agent will call dynamically.
    """
    
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat,
        "longitude": lon,
        "current": ",".join([
            "temperature_2m",
            "relative_humidity_2m",
            "apparent_temperature",
            "precipitation",
            "rain",
            "showers",
            "weather_code",
            "cloud_cover",
            "pressure_msl",
            "wind_speed_10m",
            "wind_direction_10m",
            "wind_gusts_10m",
            "is_day"
        ]),
        "timezone": "Asia/Kolkata"
    }
    
    try:
        response = requests.get(url, params=params, timeout=15)
        if response.status_code == 200:
            data = response.json()
            current = data.get("current", {})
            
            # Add safety assessment
            wind_kmh = current.get("wind_speed_10m", 0) * 3.6
            gusts_kmh = current.get("wind_gusts_10m", 0) * 3.6
            precipitation = current.get("precipitation", 0)
            weather_code = current.get("weather_code", 0)
            pressure = current.get("pressure_msl", 1013)
            
            # Safety classification
            if weather_code >= 95 or pressure < 990:
                safety = "DANGEROUS - DO NOT VENTURE"
            elif wind_kmh > 40 or gusts_kmh > 60:
                safety = "UNSAFE - HIGH WIND"
            elif wind_kmh > 25 or precipitation > 5:
                safety = "CAUTION - MODERATE RISK"
            elif wind_kmh > 15:
                safety = "MARGINAL - PROCEED WITH CARE"
            else:
                safety = "SAFE - CONDITIONS FAVORABLE"
            
            result = {
                "source": "Open-Meteo Real-Time",
                "fetched_at": datetime.now().isoformat(),
                "latitude": lat,
                "longitude": lon,
                "current_conditions": current,
                "wind_speed_kmh": round(wind_kmh, 1),
                "wind_gusts_kmh": round(gusts_kmh, 1),
                "pressure_hpa": pressure,
                "precipitation_mm": precipitation,
                "safety_assessment": safety,
                "is_safe_for_fishing": safety in ["SAFE - CONDITIONS FAVORABLE", "MARGINAL - PROCEED WITH CARE"]
            }
            
            # Save to cache
            with open(SAVE_DIR / "current_conditions_live.json", "w") as f:
                json.dump(result, f, indent=2)
            
            return result
        else:
            print(f"[ERROR] API returned {response.status_code}")
            return None
            
    except Exception as e:
        print(f"[ERROR] Failed to fetch current conditions: {e}")
        return None


# === SEA STATE CLASSIFICATION ===
def classify_sea_state(wave_height_m: float, wind_speed_kmh: float) -> str:
    """Classify sea state based on wave height and wind speed."""
    
    if wave_height_m < 0.5 and wind_speed_kmh < 10:
        return "CALM (Smooth)"
    elif wave_height_m < 1.25 and wind_speed_kmh < 20:
        return "SLIGHT (Safe for small boats)"
    elif wave_height_m < 2.5 and wind_speed_kmh < 30:
        return "MODERATE (Caution for small boats)"
    elif wave_height_m < 4.0 and wind_speed_kmh < 45:
        return "ROUGH (Unsafe for small boats)"
    elif wave_height_m < 6.0 and wind_speed_kmh < 60:
        return "VERY ROUGH (Dangerous)"
    else:
        return "PHENOMENAL (Extreme danger - Stay in port)"


if __name__ == "__main__":
    # Test with Chennai
    result = get_current_conditions(13.0827, 80.2707)
    if result:
        print(f"\n{'='*50}")
        print(f"CURRENT CONDITIONS - Chennai")
        print(f"{'='*50}")
        print(f"Wind: {result['wind_speed_kmh']} km/h")
        print(f"Gusts: {result['wind_gusts_kmh']} km/h")
        print(f"Pressure: {result['pressure_hpa']} hPa")
        print(f"Rain: {result['precipitation_mm']} mm")
        print(f"Safety: {result['safety_assessment']}")
        print(f"Safe for fishing: {result['is_safe_for_fishing']}")