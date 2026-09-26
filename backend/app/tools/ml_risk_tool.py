"""
tools/ml_risk_tool.py
PHASE B4 — ML RISK TOOL (Agent-callable wrapper)
Wraps:
  engine/ml_engine.py
Supports:
  source="all"         → risk + suitability + anomaly combined
  source="risk"        → risk model only
  source="suitability" → fishing suitability only
  source="anomaly"     → anomaly detection only
Rules:
  Zero top-level execution
  Everything inside functions
  Dynamic lat/lon/vessel_type
  TEST_* constants only inside __main__
  TEST RUN prints full result data
"""
import sys
import json
from pathlib import Path
from datetime import datetime

# ============================================================
# PATH SETUP
# ============================================================
TOOLS_DIR = Path(__file__).resolve().parent
APP_DIR = TOOLS_DIR.parent
ENGINE_DIR = APP_DIR / "engine"

for p in [str(TOOLS_DIR), str(APP_DIR), str(ENGINE_DIR)]:
    if p not in sys.path:
        sys.path.insert(0, p)

# ============================================================
# ENGINE IMPORT (lazy)
# ============================================================
_ml_engine = None

def _get_ml_engine():
    global _ml_engine
    if _ml_engine is None:
        try:
            from ml_engine import (
                calculate_marine_risk,
                calculate_fishing_suitability,
                detect_anomalies,
                get_full_ml_analysis
            )
            _ml_engine = {
                "risk": calculate_marine_risk,
                "suitability": calculate_fishing_suitability,
                "anomaly": detect_anomalies,
                "full": get_full_ml_analysis
            }
        except Exception:
            try:
                from engine.ml_engine import (
                    calculate_marine_risk,
                    calculate_fishing_suitability,
                    detect_anomalies,
                    get_full_ml_analysis
                )
                _ml_engine = {
                    "risk": calculate_marine_risk,
                    "suitability": calculate_fishing_suitability,
                    "anomaly": detect_anomalies,
                    "full": get_full_ml_analysis
                }
            except Exception:
                _ml_engine = False
    return _ml_engine if _ml_engine else None

# ============================================================
# TEST CONSTANTS
# ============================================================
TEST_LAT = 13.05
TEST_LON = 80.30
TEST_VESSEL_TYPE = "small_boat"
TEST_SOURCE = "all"

# ============================================================
# HELPERS
# ============================================================
def _now_iso():
    return datetime.now().isoformat()

def _normalize_ml_source(source="all"):
    s = str(source or "all").strip().lower()
    aliases = {
        "marine_risk": "risk",
        "risk_model": "risk",
        "fishing_suitability": "suitability",
        "suitability_model": "suitability",
        "anomaly_detection": "anomaly",
        "anomalies": "anomaly",
        "full_analysis": "all",
        "complete": "all",
    }
    return aliases.get(s, s)

def _include_ml(source, requested):
    req = _normalize_ml_source(requested)
    if req in ("all", ""):
        return True
    return _normalize_ml_source(source) == req

# ============================================================
# MAIN ML TOOL
# ============================================================
def get_ml_analysis(lat, lon, vessel_type="small_boat", source="all"):
    """
    AI Tool: Get ML-based marine analysis.
    source="all"         → risk + suitability + anomaly
    source="risk"        → risk model only
    source="suitability" → fishing suitability only
    source="anomaly"     → anomaly detection only
    """
    engine = _get_ml_engine()
    if not engine:
        return {
            "status": "error",
            "error": "ml_engine not available",
            "tool": "ml_risk_tool.get_ml_analysis"
        }

    req = _normalize_ml_source(source)
    result = {
        "tool": "ml_risk_tool.get_ml_analysis",
        "generated_at": _now_iso(),
        "lat": lat,
        "lon": lon,
        "vessel_type": vessel_type,
        "source_requested": req,
    }

    if req == "all":
        full = engine["full"](float(lat), float(lon), vessel_type)
        result.update(full)
        return result

    if _include_ml("risk", req):
        result["marine_risk"] = engine["risk"](float(lat), float(lon), vessel_type)

    if _include_ml("suitability", req):
        result["fishing_suitability"] = engine["suitability"](float(lat), float(lon))

    if _include_ml("anomaly", req):
        result["anomaly_detection"] = engine["anomaly"](float(lat), float(lon))

    result["data_sources"] = [
        "ml_engine risk model",
        "ml_engine suitability model",
        "ml_engine anomaly detection",
    ]
    return result

# ============================================================
# QUICK RISK CHECK (lightweight for agent)
# ============================================================
def get_quick_risk(lat, lon, vessel_type="small_boat"):
    """
    AI Tool: Quick risk check for agent reasoning.
    Returns only verdict and key factors.
    """
    engine = _get_ml_engine()
    if not engine:
        return {"status": "error", "error": "ml_engine not available"}

    risk = engine["risk"](float(lat), float(lon), vessel_type)
    return {
        "tool": "ml_risk_tool.get_quick_risk",
        "generated_at": _now_iso(),
        "lat": lat,
        "lon": lon,
        "vessel_type": vessel_type,
        "risk_level": risk.get("risk_level"),
        "risk_score": risk.get("risk_score"),
        "recommended_action": risk.get("recommended_action"),
        "risk_factors": risk.get("risk_factors", []),
        "conditions": risk.get("conditions_used", {}),
    }

# ============================================================
# QUICK SUITABILITY CHECK
# ============================================================
def get_quick_suitability(lat, lon):
    """
    AI Tool: Quick fishing suitability check.
    """
    engine = _get_ml_engine()
    if not engine:
        return {"status": "error", "error": "ml_engine not available"}

    suit = engine["suitability"](float(lat), float(lon))
    return {
        "tool": "ml_risk_tool.get_quick_suitability",
        "generated_at": _now_iso(),
        "lat": lat,
        "lon": lon,
        "suitability_score": suit.get("suitability_score"),
        "suitability_class": suit.get("suitability_class"),
        "factors": suit.get("factors", []),
        "inputs": suit.get("inputs", {}),
    }

# ============================================================
# TEST RUN
# ============================================================
if __name__ == "__main__":
    print("=" * 70)
    print("ML RISK TOOL — TEST RUN")
    print("=" * 70)

    # Test 1: Full ML analysis
    print("\n📦 get_ml_analysis source='all' =>")
    full_result = get_ml_analysis(TEST_LAT, TEST_LON, TEST_VESSEL_TYPE, source="all")
    # Print summary
    summary = {
        "tool": full_result.get("tool"),
        "overall_recommendation": full_result.get("overall_recommendation"),
        "risk_level": full_result.get("marine_risk", {}).get("risk_level"),
        "risk_score": full_result.get("marine_risk", {}).get("risk_score"),
        "suitability_score": full_result.get("fishing_suitability", {}).get("suitability_score"),
        "suitability_class": full_result.get("fishing_suitability", {}).get("suitability_class"),
        "anomaly_detected": full_result.get("anomaly_detection", {}).get("anomaly_detected"),
    }
    print(json.dumps(summary, indent=1, default=str))

    # Test 2: Risk only
    print("\n📦 get_ml_analysis source='risk' =>")
    risk_result = get_ml_analysis(TEST_LAT, TEST_LON, TEST_VESSEL_TYPE, source="risk")
    print(json.dumps(risk_result, indent=1, default=str))

    # Test 3: Suitability only
    print("\n📦 get_ml_analysis source='suitability' =>")
    suit_result = get_ml_analysis(TEST_LAT, TEST_LON, source="suitability")
    print(json.dumps(suit_result, indent=1, default=str))

    # Test 4: Anomaly only
    print("\n📦 get_ml_analysis source='anomaly' =>")
    anomaly_result = get_ml_analysis(TEST_LAT, TEST_LON, source="anomaly")
    print(json.dumps(anomaly_result, indent=1, default=str))

    # Test 5: Quick risk
    print("\n📦 get_quick_risk =>")
    quick_risk = get_quick_risk(TEST_LAT, TEST_LON, TEST_VESSEL_TYPE)
    print(json.dumps(quick_risk, indent=1, default=str))

    # Test 6: Quick suitability
    print("\n📦 get_quick_suitability =>")
    quick_suit = get_quick_suitability(TEST_LAT, TEST_LON)
    print(json.dumps(quick_suit, indent=1, default=str))

    print("\n✅ ML RISK TOOL TEST COMPLETE")
    print("\nCALL LIST:")
    print("  py .\\tools\\ml_risk_tool.py")
    print('  py -c "import sys; sys.path.insert(0,\'tools\'); from ml_risk_tool import get_ml_analysis; import json; print(json.dumps(get_ml_analysis(13.05, 80.30, \'small_boat\', source=\'all\'), indent=1, default=str))"')
    print('  py -c "import sys; sys.path.insert(0,\'tools\'); from ml_risk_tool import get_quick_risk; import json; print(json.dumps(get_quick_risk(13.05, 80.30), indent=1, default=str))"')
    print('  py -c "import sys; sys.path.insert(0,\'tools\'); from ml_risk_tool import get_quick_suitability; import json; print(json.dumps(get_quick_suitability(13.05, 80.30), indent=1, default=str))"')