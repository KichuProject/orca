import json
from pathlib import Path
from datetime import datetime

p = Path(r"E:\sih\data\live_cache\waves\openmeteo_marine_forecast.json")
d = json.loads(p.read_text(encoding="utf-8"))

print("File scraped at :", d["scraped_at"])
print("Your clock now  :", datetime.now().isoformat(timespec="seconds"))

for name, e in d["locations"].items():
    mc = e.get("marine_current") or {}
    wc = e.get("weather_current") or {}
    daily = e.get("weather_daily") or {}
    hourly = e.get("marine_hourly") or {}

    print("\n" + "="*72)
    print(f"📍 {name}")
    print("-"*72)
    print(f"  🕒 observation time : {mc.get('time')} IST")
    print(f"  🌊 WAVES  : height={mc.get('wave_height')}m | direction={mc.get('wave_direction')}° | period={mc.get('wave_period')}s")
    print(f"             wind-wave={mc.get('wind_wave_height')}m | swell={mc.get('swell_wave_height')}m")
    print(f"  💨 WIND   : {wc.get('wind_speed_10m')} km/h | dir={wc.get('wind_direction_10m')}° | gusts={wc.get('wind_gusts_10m')} km/h")
    print(f"  🌡️ AIR    : {wc.get('temperature_2m')}°C | rain={wc.get('precipitation')}mm | code={wc.get('weather_code')}")

    if daily and daily.get("date"):
        print("  📅 NEXT 3 DAYS:")
        for i, day in enumerate(daily["date"]):
            print(f"     {day} | wind_max={daily['wind_speed_10m_max'][i]}km/h | rain={daily['precipitation_sum'][i]}mm | code={daily['weather_code'][i]}")

    if hourly and hourly.get("time"):
        nxt = list(zip(hourly["time"], hourly["wave_height"]))[:6]
        print("  🌊 NEXT 6H WAVES:", " | ".join(f"{t[11:16]}h={h}m" for t, h in nxt))

print("\n" + "="*72)
print("weather_code: 0=clear 1-2=partly cloudy 3=overcast 51-67=rain 80-82=showers 95=thunderstorm")