"""Retest the 2 heavy endpoints with a 180s timeout."""
import requests, json, time

BASE = "http://127.0.0.1:8000"
TESTS = [
    ("[14] GFW Vessels (IUU Watch)", "/api/vessels", {"lat": 13.05, "lon": 80.30, "radius_km": 200}),
    ("[15] Knowledge Graph (NetworkX)", "/api/graph", {"lat": 13.05, "lon": 80.30}),
]

for name, ep, params in TESTS:
    print(f"⏳ {name} ...", end=" ", flush=True)
    t0 = time.time()
    try:
        r = requests.get(BASE + ep, params=params, timeout=180)
        dt = round(time.time() - t0, 2)
        if r.status_code == 200:
            print(f"✅ PASS ({dt}s)")
            print(json.dumps(r.json(), indent=1, ensure_ascii=False)[:500])
        else:
            print(f"❌ FAIL HTTP {r.status_code} ({dt}s): {r.text[:150]}")
    except Exception as e:
        print(f"❌ FAIL ({round(time.time()-t0,2)}s) {str(e)[:100]}")

print("\n💡 Second run will be INSTANT (5-min cache active).")