"""
fetch_full_weather.py
Fetches COMPLETE weather conditions from Open-Meteo for any location.
Covers: temperature, humidity, rainfall, pressure, clouds, UV, visibility,
        wind, gusts, CAPE (storm detection), weather codes.
"""
import requests
import json
from pathlib import Path
from datetime import datetime

SAVE_DIR = Path("E:/sih/data/live_cache/weather")
SAVE_DIR.mkdir(parents=True, exist_ok=True)

def fetch_full_weather(lat: float, lon: float, location_name: str = "User Location"):
    """Fetch comprehensive weather data for any coordinate."""
    
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat,
        "longitude": lon,
        # CURRENT CONDITIONS
        "current": ",".join([
            "temperature_2m",
            "relative_humidity_2m",
            "apparent_temperature",
            "precipitation",
            "rain",
            "showers",
            "snowfall",
            "weather_code",
            "cloud_cover",
            "pressure_msl",
            "surface_pressure",
            "wind_speed_10m",
            "wind_direction_10m",
            "wind_gusts_10m"
        ]),
        # HOURLY FORECAST (next 48 hours)
        "hourly": ",".join([
            "temperature_2m",
            "relative_humidity_2m",
            "dew_point_2m",
            "apparent_temperature",
            "precipitation_probability",
            "precipitation",
            "rain",
            "showers",
            "snowfall",
            "snow_depth",
            "weather_code",
            "cloud_cover",
            "cloud_cover_low",
            "cloud_cover_mid",
            "cloud_cover_high",
            "visibility",
            "uv_index",
            "pressure_msl",
            "surface_pressure",
            "wind_speed_10m",
            "wind_direction_10m",
            "wind_gusts_10m",
            "cape",  # Convective Available Potential Energy (storm detection)
            "is_day"
        ]),
        # DAILY FORECAST (next 7 days)
        "daily": ",".join([
            "weather_code",
            "temperature_2m_max",
            "temperature_2m_min",
            "apparent_temperature_max",
            "apparent_temperature_min",
            "sunrise",
            "sunset",
            "uv_index_max",
            "precipitation_sum",
            "rain_sum",
            "showers_sum",
            "precipitation_hours",
            "precipitation_probability_max",
            "wind_speed_10m_max",
            "wind_gusts_10m_max",
            "wind_direction_10m_dominant"
        ]),
        "forecast_days": 7,
        "wind_speed_unit": "ms",
        "timezone": "Asia/Kolkata"
    }
    
    response = requests.get(url, params=params, timeout=30)
    if response.status_code == 200:
        data = response.json()
        data["metadata"] = {
            "source": "Open-Meteo (Free, No Key)",
            "location_name": location_name,
            "latitude": lat,
            "longitude": lon,
            "fetched_at": datetime.now().isoformat(),
            "parameters_fetched": "Full weather: temp, humidity, rain, pressure, clouds, UV, wind, CAPE"
        }
        
        filename = f"full_weather_{location_name.replace(' ', '_').lower()}.json"
        with open(SAVE_DIR / filename, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        
        print(f"[OK] Full weather saved: {filename}")
        return data
    else:
        print(f"[ERROR] Failed to fetch weather: {response.status_code}")
        return None


# === FETCH FOR ALL 8 INDIAN COASTS + DYNAMIC USER LOCATION ===
COASTAL_LOCATIONS = [
    {"name": "Chennai", "lat": 13.0827, "lon": 80.2707},
    {"name": "Kochi", "lat": 9.9312, "lon": 76.2673},
    {"name": "Mumbai", "lat": 19.0760, "lon": 72.8777},
    {"name": "Visakhapatnam", "lat": 17.6868, "lon": 83.2185},
    {"name": "Paradip", "lat": 20.3165, "lon": 86.6167},
    {"name": "Kandla", "lat": 23.0300, "lon": 70.2200},
    {"name": "Tuticorin", "lat": 8.7642, "lon": 78.1348},
    {"name": "Mangalore", "lat": 12.8637, "lon": 74.8352},
]

if __name__ == "__main__":
    print("Fetching FULL weather conditions for all Indian coasts...")
    for loc in COASTAL_LOCATIONS:
        fetch_full_weather(loc["lat"], loc["lon"], loc["name"])
    print("\nAll weather data fetched successfully!")