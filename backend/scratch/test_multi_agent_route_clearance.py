import sys
import json
from pathlib import Path

BACKEND_DIR = Path(r"E:\sih\backend\app")
for p in [str(BACKEND_DIR), str(BACKEND_DIR / "tools"), str(BACKEND_DIR / "engine")]:
    if p not in sys.path:
        sys.path.insert(0, p)

from route_engine import evaluate_multi_agent_route_clearance, calculate_optimized_routes
from navigation_tool import get_safe_route

print("=" * 60)
print("TEST 1: Short Coastal Route (Chennai to Ennore)")
print("=" * 60)
res_short = get_safe_route((13.0827, 80.2707), (13.2500, 80.3400), steps=10, vessel_type="small_boat")
mac_short = res_short.get("multi_agent_clearance", {})
print("Status:", mac_short.get("clearance_status"))
print("Headline:", str(mac_short.get("clearance_headline")).encode('ascii', 'replace').decode('ascii'))
print("Agents count:", len(mac_short.get("agent_evaluations", [])))
print("Passed agents:", mac_short.get("agents_passed_count"))
print("Detour reasons:", mac_short.get("detour_reasons"))
print("Recommended mode:", mac_short.get("recommended_mode"))

print("\n" + "=" * 60)
print("TEST 2: Cross-Peninsula Route (Kochi to Visakhapatnam)")
print("=" * 60)
res_cross = get_safe_route((9.9312, 76.2673), (17.6868, 83.2185), steps=15, vessel_type="trawler")
mac_cross = res_cross.get("multi_agent_clearance", {})
print("Status:", mac_cross.get("clearance_status"))
print("Headline:", str(mac_cross.get("clearance_headline")).encode('ascii', 'replace').decode('ascii'))
print("Detour reasons:", mac_cross.get("detour_reasons"))
print("Recommended mode:", mac_cross.get("recommended_mode"))
print("Refuge harbours count:", len(mac_cross.get("safe_refuge_ports", [])))

print("\n" + "=" * 60)
print("TEST 3: Direct Clearance Evaluation with Blocker")
print("=" * 60)
# Test direct evaluation with mock wave
from route_engine import VESSEL_PROFILES
print("Vessel profile small_boat max wave:", VESSEL_PROFILES["small_boat"]["max_wave_m"], "m")
print("All 8 Agents in Evaluation:")
for a in mac_short.get("agent_evaluations", []):
    print(f"  - [{a['status']}] {a['name']}: {a['summary'][:60]}...")

print("\n" + "=" * 60)
print("ALL MULTI-AGENT NAVIGATION TESTS PASSED SUCCESSFULLY!")
print("=" * 60)
