"""
fetch_cyclone_lightning.py
Scrapes IMD cyclone page + INCOIS high wave alerts + detects cyclones via pressure/wind.
"""
import requests
import json
from pathlib import Path
from datetime import datetime
from bs4 import BeautifulSoup

SAVE_DIR = Path("E:/sih/data/live_cache/alerts")
SAVE_DIR.mkdir(parents=True, exist_ok=True)

HEADERS = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}


# === 1. SCRAPE IMD CYCLONE PAGE ===
def fetch_imd_cyclone():
    """Scrape IMD cyclone warning page."""
    
    url = "https://mausam.imd.gov.in/imd_latest/contents/cyclone.php"
    
    try:
        response = requests.get(url, headers=HEADERS, timeout=30)
        soup = BeautifulSoup(response.text, 'html.parser')
        
        cyclone_info = []
        for tag in soup.find_all(['p', 'font', 'b', 'td', 'div', 'h2', 'h3', 'a']):
            text = tag.get_text(strip=True)
            if text and len(text) > 15:
                # Filter for cyclone-relevant keywords
                keywords = ['cyclone', 'depression', 'storm', 'wind', 'warning', 
                           'alert', 'coast', 'sea', 'fishermen', 'landfall', 'intensif']
                if any(kw in text.lower() for kw in keywords):
                    cyclone_info.append(text)
        
        cyclone_data = {
            "source": "IMD Cyclone Page",
            "url": url,
            "scraped_at": datetime.now().isoformat(),
            "cyclone_warnings": cyclone_info,
            "cyclone_active": len(cyclone_info) > 0
        }
        
        with open(SAVE_DIR / "imd_cyclone_alerts.json", "w", encoding="utf-8") as f:
            json.dump(cyclone_data, f, indent=2, ensure_ascii=False)
        
        print(f"[OK] IMD Cyclone alerts saved ({len(cyclone_info)} entries)")
        return cyclone_data
        
    except Exception as e:
        print(f"[ERROR] IMD Cyclone scrape failed: {e}")
        return None


# === 2. SCRAPE INCOIS HIGH WAVE ALERTS ===
def fetch_incois_high_wave():
    """Scrape INCOIS High Wave Alert page."""
    
    url = "https://incois.gov.in/portal/hwh/index.jsp"
    
    try:
        response = requests.get(url, headers=HEADERS, timeout=30)
        soup = BeautifulSoup(response.text, 'html.parser')
        
        alerts = []
        for tag in soup.find_all(['p', 'font', 'b', 'td', 'div', 'a', 'span']):
            text = tag.get_text(strip=True)
            if text and len(text) > 15:
                keywords = ['wave', 'high', 'alert', 'warning', 'sea', 'coast', 
                           'rough', 'swell', 'wind', 'knot', 'metre', 'meter']
                if any(kw in text.lower() for kw in keywords):
                    alerts.append(text)
        
        alert_data = {
            "source": "INCOIS High Wave Alerts",
            "url": url,
            "scraped_at": datetime.now().isoformat(),
            "high_wave_alerts": alerts,
            "high_wave_active": len(alerts) > 0
        }
        
        with open(SAVE_DIR / "incois_high_wave_alerts.json", "w", encoding="utf-8") as f:
            json.dump(alert_data, f, indent=2, ensure_ascii=False)
        
        print(f"[OK] INCOIS High Wave alerts saved ({len(alerts)} entries)")
        return alert_data
        
    except Exception as e:
        print(f"[ERROR] INCOIS scrape failed: {e}")
        return None


# === 3. CYCLONE DETECTION VIA PRESSURE + WIND ===
def detect_cyclone_from_weather(lat: float, lon: float):
    """Detect cyclone risk using Open-Meteo pressure and wind data."""
    
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat,
        "longitude": lon,
        "current": "pressure_msl,surface_pressure,wind_speed_10m,wind_gusts_10m,weather_code",
        "hourly": "pressure_msl,wind_speed_10m,cape",
        "forecast_days": 1,
        "timezone": "Asia/Kolkata"
    }
    
    response = requests.get(url, params=params, timeout=30)
    if response.status_code != 200:
        return None
    
    data = response.json()
    current = data.get("current", {})
    
    pressure = current.get("pressure_msl", 1013)
    wind_speed_ms = current.get("wind_speed_10m", 0)
    wind_gusts_ms = current.get("wind_gusts_10m", 0)
    weather_code = current.get("weather_code", 0)
    
    wind_speed_kmh = wind_speed_ms * 3.6
    wind_gusts_kmh = wind_gusts_ms * 3.6
    
    # Cyclone classification based on IMD criteria
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
        "source": "Cyclone Detection Algorithm (Pressure + Wind)",
        "detected_at": datetime.now().isoformat(),
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
    
    with open(SAVE_DIR / "cyclone_detection_result.json", "w") as f:
        json.dump(result, f, indent=2)
    
    print(f"[OK] Cyclone detection: {risk_level} - {category}")
    return result


# === 4. LIGHTNING RISK DETECTION ===
def detect_lightning_risk(lat: float, lon: float):
    """Detect lightning risk using CAPE + weather codes."""
    
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat,
        "longitude": lon,
        "current": "weather_code,cape",
        "hourly": "cape,weather_code,precipitation_probability",
        "forecast_days": 1,
        "timezone": "Asia/Kolkata"
    }
    
    response = requests.get(url, params=params, timeout=30)
    if response.status_code != 200:
        return None
    
    data = response.json()
    current = data.get("current", {})
    
    weather_code = current.get("weather_code", 0)
    cape = current.get("cape", 0)  # J/kg
    
    # Lightning risk classification
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
        "source": "Lightning Risk Detection (CAPE + Weather Code)",
        "detected_at": datetime.now().isoformat(),
        "latitude": lat,
        "longitude": lon,
        "cape_j_per_kg": cape,
        "weather_code": weather_code,
        "lightning_risk": risk,
        "recommended_action": action
    }
    
    with open(SAVE_DIR / "lightning_detection_result.json", "w") as f:
        json.dump(result, f, indent=2)
    
    print(f"[OK] Lightning risk: {risk}")
    return result


# === RUN ALL ===
if __name__ == "__main__":
    print("=" * 60)
    print("FETCHING CYCLONE + LIGHTNING + HIGH WAVE DATA")
    print("=" * 60)
    
    # 1. Scrape IMD cyclone page
    fetch_imd_cyclone()
    
    # 2. Scrape INCOIS high wave alerts
    fetch_incois_high_wave()
    
    # 3. Detect cyclone from weather data (Chennai)
    detect_cyclone_from_weather(13.0827, 80.2707)
    
    # 4. Detect lightning risk (Chennai)
    detect_lightning_risk(13.0827, 80.2707)
    
    print("\n" + "=" * 60)
    print("ALL CYCLONE + LIGHTNING DATA FETCHED!")
    print("=" * 60)