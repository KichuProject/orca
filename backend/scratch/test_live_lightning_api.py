import urllib.request
import json

url = "http://127.0.0.1:8000/api/layer/lightning"
try:
    req = urllib.request.urlopen(url)
    data = json.loads(req.read().decode("utf-8"))
    features = data.get("features", [])
    print(f"SUCCESS: /api/layer/lightning returned {len(features)} features!")
    print(f"Total Strikes: {data.get('total_strike_discharges')}")
    print(f"Total Convective Cells: {data.get('total_convective_cells')}")
    sample_strike = next((f for f in features if f["properties"].get("feature_type") == "strike_point"), None)
    if sample_strike:
        print("Sample Strike properties:", json.dumps(sample_strike["properties"], indent=2))
except Exception as e:
    print("Error:", e)
