"""
engine/alert_engine.py
PHASE B8 — LIVE ALERT ENGINE
Evaluates user subscriptions against live marine data and generates proactive alerts.

Rules:
- Zero top-level execution
- Everything inside functions
- Dynamic evaluation
- TEST_* constants only inside __main__
- TEST RUN prints full result data
"""
import sys
import re
import json
from pathlib import Path
from datetime import datetime

# ============================================================
# PATH SETUP
# ============================================================
ENGINE_DIR = Path(__file__).resolve().parent
APP_DIR = ENGINE_DIR.parent
TOOLS_DIR = APP_DIR / "tools"
DATA_DIR = APP_DIR.parent / "data"

for p in [str(APP_DIR), str(TOOLS_DIR), str(ENGINE_DIR)]:
    if p not in sys.path:
        sys.path.insert(0, p)

# ============================================================
# PATHS
# ============================================================
ALERTS_DIR = DATA_DIR / "live_cache" / "alerts"
SUBSCRIPTIONS_FILE = ALERTS_DIR / "alert_subscriptions.json"
TRIGGERED_ALERTS_FILE = ALERTS_DIR / "triggered_alerts.json"

# ============================================================
# TEST CONSTANTS
# ============================================================
TEST_SUBSCRIPTIONS = [
    {
        "id": "test_sub_1",
        "user_id": "fisher_001",
        "lat": 13.05,
        "lon": 80.30,
        "radius_km": 30.0,
        "condition": "wave_height > 0.5",
        "active": True
    },
    {
        "id": "test_sub_2",
        "user_id": "fisher_002",
        "lat": 9.93,
        "lon": 76.26,
        "radius_km": 25.0,
        "condition": "verdict == DANGEROUS",
        "active": True
    }
]

# ============================================================
# HELPERS
# ============================================================
def _now_iso():
    return datetime.now().isoformat()

def _load_json(path, default=None):
    try:
        if path.exists():
            return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        pass
    return default if default is not None else []

def _save_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(data, indent=1, ensure_ascii=False),
        encoding="utf-8"
    )

def _evaluate_condition(condition_str: str, data: dict) -> bool:
    """
    Safe condition evaluator.
    Supports: "wave_height > 2.0", "wind_kmh > 30", "verdict == DANGEROUS"
    """
    match = re.match(r"([a-zA-Z0-9_]+)\s*(>|<|>=|<=|==|!=)\s*([a-zA-Z0-9_.\-]+)", condition_str.strip())
    if not match:
        return False
    
    var_name = match.group(1)
    operator = match.group(2)
    threshold_str = match.group(3)
    
    # Find variable in data
    value = None
    if var_name in data:
        value = data[var_name]
    elif "wave_height_m" in data and var_name == "wave_height":
        value = data["wave_height_m"]
    # Add this line after the existing wave_height_m check:
    elif "wave_m" in data and var_name == "wave_height":
        value = data["wave_m"]
    elif "wind_kmh" in data and var_name == "wind_speed":
        value = data["wind_kmh"]
        
    if value is None:
        return False
        
    try:
        # Try numeric comparison
        if '.' in threshold_str or threshold_str.lstrip('-').isdigit():
            threshold = float(threshold_str)
            value = float(value)
        else:
            # String comparison
            threshold = str(threshold_str).upper()
            value = str(value).upper()
    except Exception:
        return False

    if operator == ">": return value > threshold
    if operator == "<": return value < threshold
    if operator == ">=": return value >= threshold
    if operator == "<=": return value <= threshold
    if operator == "==": return value == threshold
    if operator == "!=": return value != threshold
    
    return False

# ============================================================
# TOOL IMPORTS (Lazy)
# ============================================================
_tools_loaded = False
_tool_registry = {}

def _load_tools():
    global _tools_loaded, _tool_registry
    if _tools_loaded:
        return _tool_registry

    try:
        from safety_tool import get_safety_conditions
        _tool_registry["safety"] = get_safety_conditions
    except Exception:
        pass

    try:
        from hazard_tool import get_cyclone_risk
        _tool_registry["hazard"] = get_cyclone_risk
    except Exception:
        pass

    _tools_loaded = True
    return _tool_registry

# ============================================================
# MAIN ALERT EVALUATION
# ============================================================
def evaluate_alerts(use_test_data=False):
    """
    AI Tool / Background Task:
    Evaluates all active subscriptions against live marine data.
    Returns triggered alerts.
    """
    ALERTS_DIR.mkdir(parents=True, exist_ok=True)
    
    if use_test_data:
        subs = TEST_SUBSCRIPTIONS
    else:
        subs = _load_json(SUBSCRIPTIONS_FILE, [])
        
    if not subs:
        return {
            "status": "no_subscriptions",
            "checked_at": _now_iso(),
            "alerts_triggered": 0
        }
        
    tools = _load_tools()
    if not tools:
        return {
            "status": "tools_missing",
            "checked_at": _now_iso(),
            "alerts_triggered": 0
        }
        
    triggered = []
    
    for sub in subs:
        if not sub.get("active", True):
            continue
            
        lat = sub.get("lat")
        lon = sub.get("lon")
        condition = sub.get("condition")
        
        if lat is None or lon is None or not condition:
            continue
            
        # Fetch live data
        eval_data = {}
        
        if "safety" in tools:
            try:
                safety = tools["safety"](lat, lon)
                if isinstance(safety, dict):
                    eval_data.update(safety.get("conditions", {}))
                    eval_data["verdict"] = safety.get("verdict", "")
            except Exception:
                pass
                
        if "hazard" in tools:
            try:
                hazard = tools["hazard"](lat, lon)
                if isinstance(hazard, dict):
                    eval_data["cyclone_risk"] = hazard.get("risk_level", "")
            except Exception:
                pass
                
        # Evaluate condition
        if _evaluate_condition(condition, eval_data):
            alert = {
                "id": f"alert_{datetime.now().strftime('%Y%m%d%H%M%S')}_{sub.get('id', 'unknown')}",
                "user_id": sub.get("user_id"),
                "subscription_id": sub.get("id"),
                "condition_met": condition,
                "lat": lat,
                "lon": lon,
                "triggered_at": _now_iso(),
                "message": f"⚠️ ALERT: {condition} detected at your location ({lat}, {lon}).",
                "data_snapshot": eval_data
            }
            triggered.append(alert)
            
    # Save triggered alerts
    if not use_test_data and triggered:
        existing = _load_json(TRIGGERED_ALERTS_FILE, [])
        existing.extend(triggered)
        _save_json(TRIGGERED_ALERTS_FILE, existing)
        
    return {
        "status": "success",
        "checked_at": _now_iso(),
        "subscriptions_checked": len(subs),
        "alerts_triggered": len(triggered),
        "new_alerts": triggered
    }

def get_user_alerts(user_id: str):
    """
    Returns all triggered alerts for a specific user.
    """
    alerts = _load_json(TRIGGERED_ALERTS_FILE, [])
    user_alerts = [a for a in alerts if a.get("user_id") == user_id]
    return {
        "status": "success",
        "user_id": user_id,
        "total_alerts": len(user_alerts),
        "alerts": user_alerts
    }

# ============================================================
# TEST RUN
# ============================================================
if __name__ == "__main__":
    print("=" * 70)
    print("ALERT ENGINE — PHASE B8 TEST RUN")
    print("=" * 70)

    print("\n📦 evaluate_alerts (using TEST_SUBSCRIPTIONS) =>")
    result = evaluate_alerts(use_test_data=True)
    print(json.dumps(result, indent=1, default=str))

    print("\n📦 get_user_alerts('fisher_001') =>")
    # Note: Since use_test_data=True doesn't save to disk, this will be empty 
    # unless you run it with use_test_data=False and have actual subscriptions.
    user_alerts = get_user_alerts("fisher_001")
    print(json.dumps(user_alerts, indent=1, default=str))

    print("\n✅ ALERT ENGINE TEST COMPLETE")
    print("\nCALL LIST:")
    print("  py .\\engine\\alert_engine.py")
    print('  py -c "import sys; sys.path.insert(0,\'engine\'); from alert_engine import evaluate_alerts; import json; print(json.dumps(evaluate_alerts(), indent=1))"')
    print('  py -c "import sys; sys.path.insert(0,\'engine\'); from alert_engine import get_user_alerts; import json; print(json.dumps(get_user_alerts(\'fisher_001\'), indent=1))"')