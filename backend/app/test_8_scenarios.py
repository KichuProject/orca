"""
test_8_scenarios.py
Comprehensive End-to-End Verification of the 8 Most Important User Scenarios
"""
import os
import sys
import json
from pathlib import Path

APP_DIR = Path(__file__).resolve().parent
if str(APP_DIR) not in sys.path:
    sys.path.insert(0, str(APP_DIR))

from fastapi.testclient import TestClient
import main

client = TestClient(main.app)

SCENARIOS = [
    {
        "id": 1,
        "name": "Scenario 1 — Fisherman safety",
        "query": "Is it safe for my small fishing boat to go tomorrow morning?",
        "payload": {
            "query": "Is it safe for my small fishing boat to go tomorrow morning?",
            "location": {"lat": 13.0827, "lon": 80.2707},
            "vessel_type": "small_boat",
            "conversation_id": "test_scen_1",
            "language": "en"
        },
        "expect_keys": ["answer", "verdict", "confidence", "risks", "agents_used"],
        "check": lambda res: (
            res.get("verdict") in ["SAFE", "CAUTION", "DANGEROUS", "NO-GO"]
            and len(res.get("agents_used", [])) > 0
            and len(res.get("answer", "")) > 50
        )
    },
    {
        "id": 2,
        "name": "Scenario 2 — Nearest PFZ",
        "query": "Find the nearest PFZ today.",
        "payload": {
            "query": "Find the nearest PFZ today.",
            "location": {"lat": 13.0827, "lon": 80.2707},
            "vessel_type": "small_boat",
            "conversation_id": "test_scen_2",
            "language": "en"
        },
        "expect_keys": ["answer", "map_layers", "agents_used"],
        "check": lambda res: (
            any("pfz" in ag for ag in res.get("agents_used", []))
            or "pfz" in res.get("map_layers", [])
            or "pfz" in res.get("answer", "").lower()
            or "zone" in res.get("answer", "").lower()
        )
    },
    {
        "id": 3,
        "name": "Scenario 3 — Sea conditions",
        "query": "What are the sea conditions near Chennai tomorrow afternoon?",
        "payload": {
            "query": "What are the sea conditions near Chennai tomorrow afternoon?",
            "location": {"lat": 13.0827, "lon": 80.2707},
            "vessel_type": "small_boat",
            "conversation_id": "test_scen_3",
            "language": "en"
        },
        "expect_keys": ["answer", "sources"],
        "check": lambda res: (
            any(k in res.get("answer", "").lower() for k in ["wave", "wind", "sst", "sea", "temp", "swell"])
        )
    },
    {
        "id": 4,
        "name": "Scenario 4 — Hazard alert",
        "query": "Are there any cyclone or lightning threats near my fishing area?",
        "payload": {
            "query": "Are there any cyclone or lightning threats near my fishing area?",
            "location": {"lat": 13.0827, "lon": 80.2707},
            "vessel_type": "small_boat",
            "conversation_id": "test_scen_4",
            "language": "en"
        },
        "expect_keys": ["answer", "map_layers", "sources"],
        "check": lambda res: (
            any(k in res.get("answer", "").lower() for k in ["cyclone", "lightning", "threat", "storm", "cape", "wind", "safe"])
            and any(lyr in res.get("map_layers", []) for lyr in ["cyclone_tracks", "lightning", "eez", "ports"])
        )
    },
    {
        "id": 5,
        "name": "Scenario 5 — Fishing productivity",
        "query": "Why has fish productivity declined in this region?",
        "payload": {
            "query": "Why has fish productivity declined in this region?",
            "location": {"lat": 13.0827, "lon": 80.2707},
            "vessel_type": "small_boat",
            "conversation_id": "test_scen_5",
            "language": "en"
        },
        "expect_keys": ["answer", "agents_used"],
        "check": lambda res: (
            any(k in res.get("answer", "").lower() for k in ["productivity", "sst", "chlorophyll", "temperature", "plankton", "thermal", "fish"])
        )
    },
    {
        "id": 6,
        "name": "Scenario 6 — Route optimization",
        "query": "Find the safest route from Chennai Port to Visakhapatnam Port.",
        "payload": {
            "query": "Find the safest route from Chennai Port to Visakhapatnam Port.",
            "location": {"lat": 13.0827, "lon": 80.2707},
            "vessel_type": "small_boat",
            "conversation_id": "test_scen_6",
            "language": "en"
        },
        "expect_keys": ["answer", "route"],
        "check": lambda res: (
            res.get("route") is not None
            or any(k in res.get("answer", "").lower() for k in ["route", "waypoint", "distance", "nm", "clearance", "port"])
        )
    },
    {
        "id": 7,
        "name": "Scenario 7 — Geofencing",
        "query": "Will my route enter restricted waters?",
        "payload": {
            "query": "Will my route enter restricted waters?",
            "location": {"lat": 13.0827, "lon": 80.2707},
            "vessel_type": "small_boat",
            "conversation_id": "test_scen_7",
            "language": "en"
        },
        "expect_keys": ["answer", "agents_used"],
        "check": lambda res: (
            any("geofence" in ag or "geospatial" in ag or "navigation" in ag for ag in res.get("agents_used", []))
            or any(k in res.get("answer", "").lower() for k in ["restricted", "zone", "boundary", "sanctuary", "eez", "mpa", "waters", "clear"])
        )
    },
    {
        "id": 8,
        "name": "Scenario 8 — Multilingual voice",
        "query": "நாளை காலை எனது சிறிய படகில் கடலுக்குச் செல்வது பாதுகாப்பானதா?",
        "payload": {
            "query": "நாளை காலை எனது சிறிய படகில் கடலுக்குச் செல்வது பாதுகாப்பானதா?",
            "location": {"lat": 13.0827, "lon": 80.2707},
            "vessel_type": "small_boat",
            "conversation_id": "test_scen_8",
            "language": "ta"
        },
        "expect_keys": ["answer"],
        "check": lambda res: (
            any('\u0B80' <= ch <= '\u0BFF' for ch in res.get("answer", ""))
            or len(res.get("answer", "")) > 50
        )
    },
]

def run_all():
    print("=" * 70)
    print("🚀 TESTING THE 8 MOST IMPORTANT USER SCENARIOS (LIVE ENGINE)")
    print("=" * 70)
    results = []
    
    for s in SCENARIOS:
        print(f"\n▶ Testing Scenario {s['id']}: {s['name']}")
        print(f"  Query: \"{s['query']}\"")
        try:
            resp = client.post("/api/orca/query", json=s["payload"])
            if resp.status_code != 200:
                print(f"  ❌ FAILED: HTTP {resp.status_code} - {resp.text[:200]}")
                results.append((s["id"], s["name"], False, f"HTTP {resp.status_code}"))
                continue
                
            data = resp.json()
            missing_keys = [k for k in s["expect_keys"] if k not in data]
            if missing_keys:
                print(f"  ❌ Missing expected keys: {missing_keys}")
                results.append((s["id"], s["name"], False, f"Missing {missing_keys}"))
                continue

            passed = s["check"](data)
            if passed:
                print(f"  ✅ SUCCESS: Verdict={data.get('verdict')}, Conf={data.get('confidence')}, Agents={len(data.get('agents_used', []))}, Layers={data.get('map_layers')}")
                print(f"     Preview: {data.get('answer', '')[:120].replace(chr(10), ' ')}...")
                results.append((s["id"], s["name"], True, "Passed"))
            else:
                print(f"  ❌ FAILED domain check. Response: {data.get('answer', '')[:150]}")
                results.append((s["id"], s["name"], False, "Failed domain assertion"))
        except Exception as e:
            print(f"  ❌ Exception: {e}")
            results.append((s["id"], s["name"], False, str(e)))

    print("\n" + "=" * 70)
    print("📊 SCENARIO TEST RESULTS SUMMARY")
    print("=" * 70)
    all_ok = True
    for sid, name, status, note in results:
        sym = "✅" if status else "❌"
        print(f" {sym} Scenario {sid}: {name} [{note}]")
        if not status: all_ok = False

    print("=" * 70)
    print(f"OVERALL STATUS: {'ALL 8 SCENARIOS PASSED 100% PERFECTLY!' if all_ok else 'SOME SCENARIOS FAILED'}")
    return all_ok

if __name__ == "__main__":
    run_all()
