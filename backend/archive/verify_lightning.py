import json
from pathlib import Path

FILE = Path(r"E:\sih\data\live_cache\waves\openmeteo_marine_forecast.json")
data = json.loads(FILE.read_text(encoding="utf-8"))

THUNDER_CODES = [95, 96, 99]

print("=" * 70)
print("⚡ LIGHTNING FEATURE VERIFICATION")
print("=" * 70)

for name, e in data["locations"].items():
    wc = e.get("weather_current") or {}
    hourly = e.get("weather_hourly") or {}
    code_now = wc.get("weather_code", 0)
    
    # Current check
    lightning_now = code_now in THUNDER_CODES
    
    # Next 12h check
    codes_12h = (hourly.get("weather_code") or [])[:12]
    lightning_soon = any(c in THUNDER_CODES for c in codes_12h if c is not None)
    
    # Next 24h check
    codes_24h = (hourly.get("weather_code") or [])[:24]
    lightning_24h = any(c in THUNDER_CODES for c in codes_24h if c is not None)
    
    # Scan ALL hourly codes for any thunderstorm in 3-day forecast
    all_codes = hourly.get("weather_code") or []
    thunder_times = [hourly.get("time", [])[i] for i, c in enumerate(all_codes) 
                     if c in THUNDER_CODES and i < len(hourly.get("time", []))]
    
    if lightning_now:
        icon = "🔴 ACTIVE"
    elif lightning_soon:
        icon = "🟡 SOON (12h)"
    elif lightning_24h:
        icon = "🟠 24H RISK"
    else:
        icon = "🟢 CLEAR"
    
    print(f"\n  {icon} {name}")
    print(f"     Current code: {code_now} | Next 12h codes: {codes_12h[:6]}...")
    if thunder_times:
        print(f"     ⚡ Thunderstorm at: {', '.join(thunder_times[:5])}")
    else:
        print(f"     No thunderstorm in 3-day forecast")

print("\n" + "=" * 70)
print("📋 WMO CODE REFERENCE:")
print("   0-3   = Clear/Partly cloudy (no lightning)")
print("   45-48 = Fog (no lightning)")
print("   51-67 = Rain/Drizzle (no lightning)")
print("   71-77 = Snow (no lightning)")
print("   80-82 = Rain showers (no lightning)")
print("   95    = ⚡ THUNDERSTORM (lightning present)")
print("   96    = ⚡ THUNDERSTORM + slight hail")
print("   99    = ⚡ THUNDERSTORM + heavy hail")
print("=" * 70)