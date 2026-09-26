import urllib.request
import json

lats = "13.0827,18.922,9.9312,20.2644,22.0,11.6,15.4"
lons = "80.2707,72.834,76.2673,86.6711,88.5,92.8,73.8"
url = f"https://api.open-meteo.com/v1/forecast?latitude={lats}&longitude={lons}&current=weather_code,cape&timezone=Asia/Kolkata"

try:
    req = urllib.request.urlopen(url, timeout=10)
    data = json.loads(req.read().decode("utf-8"))
    print(f"Batch Open-Meteo success! Received {len(data)} sectors.")
    for item in data:
        cur = item.get("current", {})
        print(f"  Lat {item.get('latitude')}, Lon {item.get('longitude')}: CAPE = {cur.get('cape')} J/kg, WeatherCode = {cur.get('weather_code')}")
except Exception as e:
    print("Error:", e)
