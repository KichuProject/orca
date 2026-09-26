"""
fetch_incois_pfz.py
INCOIS live scrape:
1. Potential Fishing Zones (PFZ) for 14 sectors
2. High Wave Alerts

Note: Copernicus AI fallback is handled separately by generate_pfz_from_copernicus.py
"""
import requests
from bs4 import BeautifulSoup
import json, time, re
from pathlib import Path
from datetime import datetime

SAVE_DIR_PFZ = Path(r"E:\sih\data\live_cache\pfz")
SAVE_DIR_PFZ.mkdir(parents=True, exist_ok=True)

SAVE_DIR_ALERTS = Path(r"E:\sih\data\live_cache\alerts")
SAVE_DIR_ALERTS.mkdir(parents=True, exist_ok=True)

SECTORS = {
    "GUJARAT":         ("SEC001", (20.2, 24.5, 68.0, 73.5)),
    "MAHARASHTRA":     ("SEC002", (15.0, 20.2, 71.5, 74.0)),
    "GOA":             ("SEC003", (14.4, 16.0, 73.0, 74.5)),
    "KARNATAKA":       ("SEC004", (11.5, 15.0, 73.5, 75.5)),
    "KERALA":          ("SEC005", (7.5, 12.5, 74.0, 77.5)),
    "SOUTH_TAMILNADU": ("SEC006", (7.5, 10.5, 77.5, 80.0)),
    "NORTH_TAMILNADU": ("SEC007", (10.0, 13.6, 79.0, 80.6)),
    "SOUTH_ANDHRA":    ("SEC008", (13.6, 16.2, 79.5, 82.5)),
    "NORTH_ANDHRA":    ("SEC009", (16.0, 19.0, 82.3, 85.5)),
    "ODISHA":          ("SEC010", (19.0, 21.7, 85.5, 88.5)),
    "WEST_BENGAL":     ("SEC011", (21.7, 22.5, 87.0, 89.5)),
    "ANDAMAN":         ("SEC012", (10.0, 14.0, 92.0, 94.0)),
    "NICOBAR":         ("SEC013", (6.0, 10.0, 92.0, 94.0)),
    "LAKSHADWEEP":     ("SEC014", (8.0, 14.0, 71.0, 74.0)),
}

HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}

def parse_dms(s):
    if not s: return None
    try:
        parts = s.replace('°', ' ').replace('"', ' ').replace("'", ' ').split()
        nums = [float(p) for p in parts if re.fullmatch(r'\d+(\.\d+)?', p)]
        if len(nums) >= 3:
            d = nums[0] + nums[1]/60 + nums[2]/3600
            if parts[-1] in ('S', 'W'): d = -d
            return round(d, 4)
    except Exception:
        pass
    return None

def parse_tables(html):
    rows = []
    soup = BeautifulSoup(html, "html.parser")
    for tr in soup.find_all("tr"):
        cols = [td.get_text(" ", strip=True) for td in tr.find_all(["td", "th"])]
        if len(cols) >= 7:
            lat, lon = parse_dms(cols[5]), parse_dms(cols[6])
            if lat is not None and lon is not None:
                rows.append({"landing_center": cols[0], "direction": cols[1],
                             "bearing": cols[2], "distance_miles": cols[3],
                             "depth_fathom": cols[4], "lat": lat, "lon": lon})
    return rows

# ============ PART 1: INCOIS PFZ LIVE SCRAPE ============
def fetch_incois_pfz():
    session = requests.Session()
    session.headers.update(HEADERS)
    print("Initializing session with INCOIS TextDataHome...")
    try:
        session.get("https://incois.gov.in/MarineFisheries/TextDataHome?mfid=1&request_locale=en", timeout=20)
    except Exception:
        pass
    time.sleep(2)
    
    result = {}
    for name, (sec_id, bbox) in SECTORS.items():
        lat_min, lat_max, lon_min, lon_max = bbox
        print(f"🎣 {name} ({sec_id})...", end=" ")
        try:
            text_url = f"https://incois.gov.in/MarineFisheries/TextData?secid={sec_id}"
            page_html = session.get(text_url, timeout=20).text
            page_low = page_html.lower()
            
            # Scenario A: INCOIS blind due to clouds
            if "no data available" in page_low and "cloud" in page_low:
                result[name] = {"status": "no_data_cloud_cover", "pfz_count": 0, "advisories": [], "sector_id": sec_id}
                print("no_data_cloud_cover - 0 rows")
                time.sleep(2); continue
                
            rows = parse_tables(page_html)
            if not rows:
                resp = session.get("https://incois.gov.in/MarineFisheries/formattedForecast.action",
                                   params={"distanceformat": "miles", "depthformat": "fathom", "latlongformat": "dms"},
                                   headers={"Referer": text_url}, timeout=20)
                rows = parse_tables(resp.text)
                
            valid = [r for r in rows if lat_min <= r["lat"] <= lat_max and lon_min <= r["lon"] <= lon_max]
            
            if valid: status = "live"
            elif rows: status = "stale_cache_discarded"
            else: status = "no_data_today"
                
            result[name] = {"status": status, "pfz_count": len(valid), "advisories": valid, "sector_id": sec_id}
            print(f"{status} - {len(valid)} rows")
            
        except Exception as e:
            result[name] = {"status": "error", "error": str(e), "pfz_count": 0, "advisories": [], "sector_id": sec_id}
            print("error:", e)
        time.sleep(2)
        
    out = SAVE_DIR_PFZ / "india_pfz_live.json"
    out.write_text(json.dumps({"source": "INCOIS Live Scrape v4", "sectors": result}, 
                              indent=1, ensure_ascii=False), encoding="utf-8")
    print(f"\n✅ PFZ Saved: {out}")
    
    print("\n📊 FINAL INCOIS SUMMARY:")
    for n, d in result.items():
        print(f"  {n:16s} {d['status']:24s} {d['pfz_count']} rows")
        
    return result

# ============ PART 2: INCOIS HIGH WAVE ALERTS ============
def fetch_incois_high_wave():
    """Scrape INCOIS High Wave Alert page."""
    url = "https://incois.gov.in/portal/hwh/index.jsp"
    print("\n🌊 Fetching INCOIS High Wave Alerts...")
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
        
        out = SAVE_DIR_ALERTS / "incois_high_wave_alerts.json"
        out.write_text(json.dumps(alert_data, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"✅ High Wave Alerts Saved: {out} ({len(alerts)} entries)")
        return alert_data
    except Exception as e:
        print(f"❌ INCOIS High Wave scrape failed: {e}")
        return None

if __name__ == "__main__":
    print("=" * 60)
    print("INCOIS MODULE: PFZ + HIGH WAVE ALERTS")
    print("=" * 60)
    fetch_incois_pfz()
    fetch_incois_high_wave()
    print("=" * 60)
    