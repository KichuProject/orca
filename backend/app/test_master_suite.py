"""
test_master_suite.py
PHASE B12 — MASTER BACKEND TESTING SUITE
Fires 15 SIH Judge Scenarios against the live FastAPI server.
"""
import requests
import json
import time
import sys

BASE_URL = "http://127.0.0.1:8000"
PASSED = 0
FAILED = 0
RESULTS = []

# ANSI Colors for terminal
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
CYAN = '\033[96m'
BOLD = '\033[1m'
RESET = '\033[0m'

def print_banner():
    print(f"\n{CYAN}{BOLD}={'='*70}")
    print("🚀 SIH 2026: MASTER BACKEND TESTING SUITE (15 SCENARIOS)")
    print(f"={'='*70}{RESET}\n")

def run_test(test_id, persona, method, endpoint, payload=None, expected_keys=None, timeout=15):
    global PASSED, FAILED
    
    url = f"{BASE_URL}{endpoint}"
    test_name = f"[{test_id:02d}] {persona}"
    print(f"⏳ {test_name}...", end=" ", flush=True)
    
    start_time = time.time()
    try:
        if method == "GET":
            res = requests.get(url, params=payload, timeout=timeout)
        else:
            res = requests.post(url, json=payload, timeout=timeout)
            
        latency = round(time.time() - start_time, 2)
        
        # 1. Check HTTP Status
        if res.status_code != 200:
            raise Exception(f"HTTP {res.status_code}: {res.text[:50]}")
            
        # 2. Check JSON validity
        try:
            data = res.json()
        except:
            raise Exception("Invalid JSON response")
            
        # 3. Check Expected Keys (if provided)
        if expected_keys:
            missing = [k for k in expected_keys if k not in data]
            if missing:
                raise Exception(f"Missing keys: {missing}")
                
        # SUCCESS
        print(f"{GREEN}✅ PASS{RESET} ({latency}s)")
        PASSED += 1
        RESULTS.append((test_name, "PASS", latency))
        
    except requests.exceptions.ConnectionError:
        print(f"{RED}❌ FAIL{RESET} (Server Offline)")
        FAILED += 1
        RESULTS.append((test_name, "FAIL (Server Offline)", 0))
    except Exception as e:
        print(f"{RED}❌ FAIL{RESET} ({str(e)[:40]})")
        FAILED += 1
        RESULTS.append((test_name, f"FAIL ({str(e)[:30]})", 0))

def main():
    print_banner()
    
    # Check if server is alive first
    try:
        requests.get(BASE_URL, timeout=3)
    except:
        print(f"{RED}❌ FATAL: FastAPI server is not running on {BASE_URL}{RESET}")
        print("Please start your server first: py main.py")
        sys.exit(1)

    # ==========================================
    # CATEGORY 1: AGENTIC CHAT & MULTILINGUAL
    # ==========================================
    run_test(1, "Fisherman Safety (English Chat)", "POST", "/api/chat", 
             payload={"message": "Is it safe to fish near Chennai tomorrow?", "lat": 13.05, "lon": 80.30, "vessel_type": "small_boat"},
             expected_keys=["response"], timeout=60)

    run_test(2, "Multilingual (Tamil Chat)", "POST", "/api/chat",
             payload={"message": "சென்னை அருகே மீன் பிடிக்கச் செல்வது பாதுகாப்பானதா?", "lat": 13.05, "lon": 80.30},
             expected_keys=["response"], timeout=60)

    run_test(3, "Multi-Turn Context (Memory)", "POST", "/api/chat",
             payload={
                 "message": "What about the tide there?", 
                 "lat": 13.05, "lon": 80.30,
                 "history": [{"role": "user", "content": "Is it safe near Chennai?"}, {"role": "assistant", "content": "Yes, it is safe."}]
             },
             expected_keys=["response"], timeout=60)

    # ==========================================
    # CATEGORY 2: DASHBOARD & MAP DATA (FAST APIs)
    # ==========================================
    run_test(4, "Full Dashboard Intel", "GET", "/api/intel", 
             payload={"lat": 13.05, "lon": 80.30}, 
             expected_keys=["location"])

    run_test(5, "Safety & Weather", "GET", "/api/safety", 
             payload={"lat": 13.05, "lon": 80.30}, 
             expected_keys=["verdict"])

    run_test(6, "PFZ (Fishing Zones)", "GET", "/api/pfz", 
             payload={"lat": 15.90, "lon": 80.60})

    run_test(7, "Ocean Multi-Source (ISRO+Copernicus)", "GET", "/api/ocean", 
             payload={"lat": 13.05, "lon": 80.30, "source": "all"})

    # ==========================================
    # CATEGORY 3: HAZARDS & GEOFENCING
    # ==========================================
    run_test(8, "Cyclone & Lightning Hazards", "GET", "/api/hazards", 
             payload={"lat": 13.05, "lon": 80.30})

    run_test(9, "Geofence & Eco-Restrictions", "GET", "/api/geofence", 
             payload={"lat": 13.05, "lon": 80.30})

    run_test(10, "Tide Predictions", "GET", "/api/tides", 
             payload={"lat": 13.05, "lon": 80.30})

    # ==========================================
    # CATEGORY 4: ADVANCED SIH FEATURES
    # ==========================================
    run_test(11, "Route Optimization", "POST", "/api/route",
             payload={"start_lat": 13.05, "start_lon": 80.30, "end_lat": 13.50, "end_lon": 80.50})

    run_test(12, "What-If Scenario (8 AM)", "POST", "/api/what-if",
             payload={"lat": 13.05, "lon": 80.30, "departure_hour": 8, "vessel_type": "small_boat"},
             expected_keys=["verdict"])

    run_test(13, "Seasonal Ban (Regulatory)", "GET", "/api/seasonal-ban",
             payload={"lat": 9.93, "lon": 76.27, "coast": "Kerala"})

    run_test(14, "GFW Vessels (IUU Watch)", "GET", "/api/vessels",
             payload={"lat": 13.05, "lon": 80.30, "radius_km": 100})

    run_test(15, "Knowledge Graph (NetworkX)", "GET", "/api/graph",
             payload={"lat": 13.05, "lon": 80.30},
             expected_keys=["graph_summary"])

    # ==========================================
    # FINAL REPORT
    # ==========================================
    print(f"\n{CYAN}{BOLD}={'='*70}")
    print("📊 FINAL TEST REPORT")
    print(f"={'='*70}{RESET}")
    
    total = PASSED + FAILED
    pct = round((PASSED / total) * 100, 1) if total > 0 else 0
    
    for name, status, lat in RESULTS:
        color = GREEN if status == "PASS" else RED
        print(f"{color}{status:15}{RESET} | {lat:5.2f}s | {name}")
        
    print(f"\n{BOLD}TOTAL:{RESET} {PASSED} Passed, {FAILED} Failed out of {total} Tests ({pct}%)")
    
    if pct == 100.0:
        print(f"\n{GREEN}{BOLD}🏆 100% SUCCESS! YOUR BACKEND IS SIH-READY AND BULLETPROOF! 🏆{RESET}\n")
    elif pct >= 80.0:
        print(f"\n{YELLOW}{BOLD}⚠️ MOSTLY PASSING. Check the failed endpoints above. ⚠️{RESET}\n")
    else:
        print(f"\n{RED}{BOLD}❌ CRITICAL FAILURES. Server needs debugging. ❌{RESET}\n")

if __name__ == "__main__":
    main()