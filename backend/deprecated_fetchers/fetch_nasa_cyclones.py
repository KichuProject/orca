import requests
import json
from pathlib import Path
from datetime import datetime

SAVE_DIR = Path(r"E:\sih\data\live_cache\alerts")
SAVE_DIR.mkdir(parents=True, exist_ok=True)

print("="*70)
print("🛰️ FETCHING LIVE CYCLONE TRACKS (NASA EONET API v3)")
print("="*70)

# NASA EONET GeoJSON Endpoint (from your docs)
URL = "https://eonet.gsfc.nasa.gov/api/v3/events/geojson"

# Bounding Box for Indian Ocean & India
# Docs format: min_lon, max_lat, max_lon, min_lat
# India region: 50°E to 100°E longitude, 0°N to 30°N latitude
INDIA_BBOX = "50,30,100,0"

params = {
    "bbox": INDIA_BBOX,
    "status": "open",  # Only currently active events
    "days": 14,        # Look back 14 days for active tracks
    "limit": 100
}

try:
    print(f"📡 Querying NASA EONET with bbox: {INDIA_BBOX}...")
    r = requests.get(URL, params=params, timeout=30)
    r.raise_for_status()
    data = r.json()
    
    features = data.get("features", [])
    print(f"✅ Found {len(features)} total active events in the Indian Ocean region.")
    
    # Filter specifically for Cyclones, Depressions, and Severe Storms
    cyclone_features = []
    for f in features:
        props = f.get("properties", {})
        title = props.get("title", "").lower()
        categories = [c.get("title", "").lower() for c in props.get("categories", [])]
        
        # Keywords to identify cyclonic systems
        keywords = ["cyclone", "storm", "depression", "typhoon", "hurricane", "tropical", "low pressure"]
        
        if any(kw in title for kw in keywords) or any("storm" in cat or "cyclone" in cat for cat in categories):
            cyclone_features.append(f)
            
    print(f"🌀 Identified {len(cyclone_features)} active Cyclonic/Storm systems.")
    
    # 1. Save the raw GeoJSON (Perfect for your Map UI to draw the tracks!)
    out_geojson = {
        "type": "FeatureCollection",
        "features": cyclone_features,
        "metadata": {
            "source": "NASA EONET (Earth Observatory Natural Event Tracker)",
            "fetched_at": datetime.now().isoformat(),
            "bbox": INDIA_BBOX,
            "active_systems": len(cyclone_features)
        }
    }
    
    out_file = SAVE_DIR / "nasa_eonet_cyclones_live.geojson"
    out_file.write_text(json.dumps(out_geojson, indent=2), encoding="utf-8")
    print(f"💾 Saved GeoJSON track data: {out_file}")
    
    # 2. Save a simplified JSON for the FastAPI AI Agent to read easily
    ai_summary = []
    for f in cyclone_features:
        props = f.get("properties", {})
        geom = f.get("geometry", {})
        
        # Extract the latest coordinate from the track
        coords = geom.get("coordinates", [])
        if geom.get("type") == "LineString" and coords:
            latest_coord = coords[-1]  # Last point in the track
        elif geom.get("type") == "Point":
            latest_coord = coords
        else:
            latest_coord = [None, None]
            
        ai_summary.append({
            "name": props.get("title"),
            "status": "ACTIVE",
            "latest_lon": latest_coord[0],
            "latest_lat": latest_coord[1],
            "magnitude": props.get("magnitudeValue"),
            "magnitude_unit": props.get("magnitudeUnit"),
            "link": props.get("link")
        })
        
    out_json = SAVE_DIR / "nasa_cyclone_summary.json"
    out_json.write_text(json.dumps({
        "source": "NASA EONET",
        "generated_at": datetime.now().isoformat(),
        "active_cyclones": ai_summary
    }, indent=2), encoding="utf-8")
    
    print(f"💾 Saved AI summary: {out_json}")
    
    # Print Summary
    if ai_summary:
        print("\n🚨 ACTIVE CYCLONE SYSTEMS IN INDIAN OCEAN:")
        for c in ai_summary:
            print(f"  🌀 {c['name']} | Lat: {c['latest_lat']}, Lon: {c['latest_lon']} | Mag: {c['magnitude']} {c['magnitude_unit']}")
    else:
        print("\n🟢 ALL CLEAR: No active cyclones in the Indian Ocean right now.")
        
except Exception as e:
    print(f"❌ Error fetching NASA EONET data: {e}")