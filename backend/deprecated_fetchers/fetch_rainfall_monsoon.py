"""
fetch_rainfall_monsoon.py
Fetches rainfall data + IMD monsoon status.
"""
import requests
import json
from pathlib import Path
from datetime import datetime
from bs4 import BeautifulSoup

SAVE_DIR = Path("E:/sih/data/live_cache/weather")
SAVE_DIR.mkdir(parents=True, exist_ok=True)

# === 1. RAINFALL FROM OPEN-METEO ===
def fetch_rainfall_forecast(lat: float, lon: float, location_name: str):
    """Get detailed rainfall forecast."""
    
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat,
        "longitude": lon,
        "hourly": ",".join([
            "precipitation",
            "rain",
            "showers",
            "snowfall",
            "precipitation_probability"
        ]),
        "daily": ",".join([
            "precipitation_sum",
            "rain_sum",
            "showers_sum",
            "precipitation_hours",
            "precipitation_probability_max"
        ]),
        "forecast_days": 7,
        "timezone": "Asia/Kolkata"
    }
    
    response = requests.get(url, params=params, timeout=30)
    if response.status_code == 200:
        data = response.json()
        data["metadata"] = {
            "source": "Open-Meteo Rainfall",
            "location": location_name,
            "fetched_at": datetime.now().isoformat()
        }
        filename = f"rainfall_{location_name.replace(' ', '_').lower()}.json"
        with open(SAVE_DIR / filename, "w") as f:
            json.dump(data, f, indent=2)
        print(f"[OK] Rainfall data saved: {filename}")
    else:
        print(f"[ERROR] Rainfall fetch failed: {response.status_code}")


# === 2. IMD MONSOON STATUS (Scrape) ===
def fetch_imd_monsoon_status():
    """Scrape IMD for monsoon onset/withdrawal info."""
    
    urls = [
        "https://mausam.imd.gov.in/imd_latest/contents/monsoon.php",
        "https://mausam.imd.gov.in/imd_latest/contents/rainfall.php"
    ]
    
    monsoon_info = []
    headers = {'User-Agent': 'Mozilla/5.0'}
    
    for url in urls:
        try:
            response = requests.get(url, headers=headers, timeout=30)
            soup = BeautifulSoup(response.text, 'html.parser')
            for tag in soup.find_all(['p', 'font', 'b', 'td', 'div', 'h2', 'h3']):
                text = tag.get_text(strip=True)
                if text and len(text) > 20:
                    monsoon_info.append(text)
        except Exception as e:
            print(f"[WARN] Could not scrape {url}: {e}")
    
    monsoon_data = {
        "source": "IMD Monsoon Scrape",
        "scraped_at": datetime.now().isoformat(),
        "monsoon_info": monsoon_info
    }
    
    with open(SAVE_DIR / "imd_monsoon_status.json", "w", encoding="utf-8") as f:
        json.dump(monsoon_data, f, indent=2, ensure_ascii=False)
    
    print(f"[OK] IMD Monsoon status saved ({len(monsoon_info)} entries)")


# === 3. CURRENT RAINFALL CHECK ===
def check_current_rainfall(lat: float, lon: float):
    """Quick check: Is it raining RIGHT NOW at this location?"""
    
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat,
        "longitude": lon,
        "current": "precipitation,rain,showers,weather_code",
        "timezone": "Asia/Kolkata"
    }
    
    response = requests.get(url, params=params, timeout=30)
    if response.status_code == 200:
        data = response.json()
        current = data.get("current", {})
        precipitation = current.get("precipitation", 0)
        rain = current.get("rain", 0)
        showers = current.get("showers", 0)
        weather_code = current.get("weather_code", 0)
        
        # Rainfall classification
        if precipitation == 0:
            status = "NO RAIN"
        elif precipitation < 2.5:
            status = "LIGHT RAIN"
        elif precipitation < 7.5:
            status = "MODERATE RAIN"
        elif precipitation < 15:
            status = "HEAVY RAIN"
        else:
            status = "VERY HEAVY RAIN - DO NOT VENTURE"
        
        return {
            "status": status,
            "precipitation_mm": precipitation,
            "rain_mm": rain,
            "showers_mm": showers,
            "weather_code": weather_code,
            "safe_for_fishing": precipitation < 2.5 and weather_code < 61
        }
    return None


if __name__ == "__main__":
    # Fetch rainfall for Chennai
    fetch_rainfall_forecast(13.0827, 80.2707, "Chennai")
    
    # Fetch IMD monsoon status
    fetch_imd_monsoon_status()
    
    # Check current rainfall
    result = check_current_rainfall(13.0827, 80.2707)
    if result:
        print(f"\nCurrent Rainfall Status: {result['status']}")
        print(f"Precipitation: {result['precipitation_mm']} mm")
        print(f"Safe for fishing: {result['safe_for_fishing']}")