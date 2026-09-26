"""
tools/fusion_tool.py
PHASE B3 — DATA FUSION TOOL (Agent-callable wrapper)
Wraps:
  engine/data_fusion_engine.py
Supports:
  source="all"       → full fusion (all sources)
  source="quick"     → lightweight fusion for agent context
Rules:
  Zero top-level execution
  Everything inside functions
  Dynamic lat/lon
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
_fusion_engine = None

def _get_fusion_engine():
    global _fusion_engine
    if _fusion_engine is None:
        try:
            from data_fusion_engine import fuse_marine_state, quick_fusion
            _fusion_engine = {
                "fuse": fuse_marine_state,
                "quick": quick_fusion
            }
        except Exception:
            try:
                from engine.data_fusion_engine import fuse_marine_state, quick_fusion
                _fusion_engine = {
                    "fuse": fuse_marine_state,
                    "quick": quick_fusion
                }
            except Exception:
                _fusion_engine = False
    return _fusion_engine if _fusion_engine else None

# ============================================================
# TEST CONSTANTS
# ============================================================
TEST_LAT = 13.05
TEST_LON = 80.30
TEST_SOURCE = "all"

# ============================================================
# HELPERS
# ============================================================
def _now_iso():
    return datetime.now().isoformat()

# ============================================================
# MAIN FUSION TOOL
# ============================================================
def get_fused_marine_state(lat, lon, source="all"):
    """
    AI Tool: Get unified marine state with confidence scoring.
    source="all"   → full fusion with all details
    source="quick" → lightweight for agent context
    """
    engine = _get_fusion_engine()
    if not engine:
        return {
            "status": "error",
            "error": "data_fusion_engine not available",
            "tool": "fusion_tool.get_fused_marine_state"
        }

    req = str(source or "all").strip().lower()

    if req == "quick":
        result = engine["quick"](float(lat), float(lon))
    else:
        result = engine["fuse"](float(lat), float(lon))

    result["tool"] = "fusion_tool.get_fused_marine_state"
    result["source_requested"] = req
    return result

# ============================================================
# FUSION SUMMARY (for agent quick reference)
# ============================================================
def get_fusion_summary(lat, lon):
    """
    AI Tool: Lightweight fusion summary for agent reasoning.
    Returns only the critical decision-making data.
    """
    engine = _get_fusion_engine()
    if not engine:
        return {
            "status": "error",
            "error": "data_fusion_engine not available",
            "tool": "fusion_tool.get_fusion_summary"
        }

    full = engine["quick"](float(lat), float(lon))
    if not isinstance(full, dict):
        return {"status": "error", "error": "Fusion returned invalid data"}

    fused = full.get("fused_state", {}) or {}
    return {
        "tool": "fusion_tool.get_fusion_summary",
        "generated_at": _now_iso(),
        "lat": lat,
        "lon": lon,
        "fused_sst_c": fused.get("sst_c"),
        "fused_chlorophyll_mg_m3": fused.get("chlorophyll_mg_m3"),
        "fused_wave_height_m": fused.get("wave_height_m"),
        "safety_verdict": fused.get("safety_verdict"),
        "confidence_pct": full.get("confidence_pct"),
        "confidence_level": full.get("confidence_level"),
        "sources_count": full.get("sources_count"),
        "conflicts": full.get("conflicts", []),
        "data_sources": full.get("data_sources", []),
    }

# ============================================================
# TEST RUN
# ============================================================
if __name__ == "__main__":
    print("=" * 70)
    print("FUSION TOOL — TEST RUN")
    print("=" * 70)

    # Test 1: Full fusion
    print("\n📦 get_fused_marine_state source='all' =>")
    full_result = get_fused_marine_state(TEST_LAT, TEST_LON, source="all")
    print(json.dumps(full_result, indent=1, default=str))

    # Test 2: Quick fusion
    print("\n📦 get_fused_marine_state source='quick' =>")
    quick_result = get_fused_marine_state(TEST_LAT, TEST_LON, source="quick")
    print(json.dumps(quick_result, indent=1, default=str))

    # Test 3: Fusion summary
    print("\n📦 get_fusion_summary =>")
    summary_result = get_fusion_summary(TEST_LAT, TEST_LON)
    print(json.dumps(summary_result, indent=1, default=str))

    print("\n✅ FUSION TOOL TEST COMPLETE")
    print("\nCALL LIST:")
    print("  py .\\tools\\fusion_tool.py")
    print('  py -c "import sys; sys.path.insert(0,\'tools\'); from fusion_tool import get_fused_marine_state; import json; print(json.dumps(get_fused_marine_state(13.05, 80.30, source=\'all\'), indent=1, default=str))"')
    print('  py -c "import sys; sys.path.insert(0,\'tools\'); from fusion_tool import get_fusion_summary; import json; print(json.dumps(get_fusion_summary(13.05, 80.30), indent=1, default=str))"')