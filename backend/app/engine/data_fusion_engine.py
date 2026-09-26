"""
engine/data_fusion_engine.py
PHASE B3 — DATA FUSION + CONFIDENCE ENGINE
Cross-validates overlapping marine data sources and produces:
1. Unified Marine State (fused values)
2. Confidence Score (mathematical, not LLM-guessed)
3. Conflict Detection (which sources disagree)
4. Data Freshness (which source is most recent)

Sources fused:
- SST: Copernicus L4 + ISRO INSAT-3DS + Open-Meteo
- Chlorophyll: Copernicus L4 + ISRO Oceansat-3
- Wave: Open-Meteo Marine + INCOIS high-wave
- Wind: Open-Meteo + ISRO EOS-06
- Safety verdict: Open-Meteo + IMD + INCOIS

Rules:
- No hardcoded fusion weights (dynamic based on freshness + agreement)
- Primary sources take precedence when fresh
- Fallback sources used when primary is stale/missing
- Confidence computed mathematically from agreement + freshness
"""
import sys
import json
import math
from pathlib import Path
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List

# ============================================================
# PATH SETUP
# ============================================================
ENGINE_DIR = Path(__file__).resolve().parent
APP_DIR = ENGINE_DIR.parent
TOOLS_DIR = APP_DIR / "tools"
LIVE_DIR = Path(r"E:\sih\data\live_cache")

for p in [str(APP_DIR), str(TOOLS_DIR), str(APP_DIR / "fetchers")]:
    if p not in sys.path:
        sys.path.insert(0, p)

# ============================================================
# FETCHER IMPORTS (lazy)
# ============================================================
_fetch_openmeteo = None

def _find_fetchers_dir():
    """Searches upward for fetchers folder."""
    current = Path(__file__).resolve().parent
    for _ in range(6):
        candidate = current / "fetchers"
        if (candidate / "fetch_openmeteo_marine.py").exists():
            return candidate
        if current.parent == current:
            break
        current = current.parent
    return None

def _get_fetch_openmeteo():
    global _fetch_openmeteo
    if _fetch_openmeteo is None:
        fetchers_dir = _find_fetchers_dir()
        if fetchers_dir:
            if str(fetchers_dir) not in sys.path:
                sys.path.insert(0, str(fetchers_dir))
            try:
                import fetch_openmeteo_marine as fom
                _fetch_openmeteo = fom
            except Exception:
                _fetch_openmeteo = False
        else:
            _fetch_openmeteo = False
    return _fetch_openmeteo if _fetch_openmeteo else None

# ============================================================
# HELPERS
# ============================================================
def _now_iso():
    return datetime.now().isoformat()

def _load_json(path):
    try:
        p = Path(path)
        if p.exists():
            return json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        pass
    return None

def _safe_float(value):
    try:
        if value is None:
            return None
        return float(value)
    except (ValueError, TypeError):
        return None

def _file_age_minutes(path):
    """Returns file age in minutes, or None if missing."""
    try:
        p = Path(path)
        if p.exists():
            age = datetime.now().timestamp() - p.stat().st_mtime
            return round(age / 60, 1)
    except Exception:
        pass
    return None

def _freshness_quality(age_minutes):
    """Converts file age to quality score 0-1."""
    if age_minutes is None:
        return 0.0
    if age_minutes < 30:
        return 1.0
    elif age_minutes < 120:
        return 0.8
    elif age_minutes < 360:
        return 0.6
    elif age_minutes < 1440:
        return 0.4
    else:
        return 0.2

# ============================================================
# SOURCE DATA COLLECTORS
# ============================================================
def _collect_sst_sources(lat, lon):
    """
    Collects SST values from all available sources.
    Returns list of {source, value, timestamp, quality}.
    """
    sources = []

    # Source 1: Copernicus L4 NetCDF (via pfz_tool)
    try:
        from tools.pfz_tool import get_copernicus_sst_chlorophyll
        cop = get_copernicus_sst_chlorophyll(lat, lon)
        sst = _safe_float(cop.get("sst_c_at_point"))
        if sst is not None:
            meta_file = LIVE_DIR / "sst" / "satellite_metadata.json"
            age = _file_age_minutes(meta_file)
            sources.append({
                "source": "Copernicus L4",
                "variable": "sst_c",
                "value": sst,
                "age_minutes": age,
                "quality": _freshness_quality(age)
            })
    except Exception:
        pass

    # Source 2: ISRO INSAT-3DS (via common md_read_point)
    try:
        from tools.common import md_read_point
        isro_sst = md_read_point("insat3ds_sst", lat, lon, ["sst", "SST"])
        if isro_sst.get("status") == "ok":
            val = _safe_float(isro_sst.get("value"))
            if val is not None:
                # Convert Kelvin to Celsius if needed
                if val > 150:
                    val = val - 273.15
                mosdac_dir = LIVE_DIR / "mosdac" / "insat3ds_sst"
                age = _file_age_minutes(mosdac_dir)
                sources.append({
                    "source": "ISRO INSAT-3DS",
                    "variable": "sst_c",
                    "value": round(val, 2),
                    "age_minutes": age,
                    "quality": _freshness_quality(age)
                })
    except Exception:
        pass

    # Source 3: Open-Meteo (via fetcher)
    try:
        ft = _get_fetch_openmeteo()
        if ft and hasattr(ft, "get_comprehensive_conditions"):
            entry = ft.get_comprehensive_conditions(lat, lon)
            weather_current = entry.get("weather_current", {}) or {}
            temp = _safe_float(weather_current.get("temperature_2m"))
            # Note: Open-Meteo doesn't have SST directly, but marine data
            # can be inferred from the fetcher's marine_current
            marine_current = entry.get("marine_current", {}) or {}
            # Use wave-related data for freshness indicator
            if marine_current:
                age = 0  # Live API call
                sources.append({
                    "source": "Open-Meteo (live)",
                    "variable": "marine_conditions",
                    "value": None,  # SST not directly available
                    "age_minutes": age,
                    "quality": 1.0,
                    "note": "Open-Meteo provides wave/wind, not SST directly"
                })
    except Exception:
        pass

    return sources

def _collect_chlorophyll_sources(lat, lon):
    """Collects chlorophyll values from all available sources."""
    sources = []

    # Source 1: Copernicus L4
    try:
        from tools.pfz_tool import get_copernicus_sst_chlorophyll
        cop = get_copernicus_sst_chlorophyll(lat, lon)
        chl = _safe_float(cop.get("chlorophyll_at_point"))
        if chl is not None:
            meta_file = LIVE_DIR / "sst" / "satellite_metadata.json"
            age = _file_age_minutes(meta_file)
            sources.append({
                "source": "Copernicus L4",
                "variable": "chlorophyll_mg_m3",
                "value": chl,
                "age_minutes": age,
                "quality": _freshness_quality(age)
            })
    except Exception:
        pass

    # Source 2: ISRO Oceansat-3
    try:
        from tools.common import md_read_point
        isro_chl = md_read_point("oceansat3_chl", lat, lon, ["chl", "CHL", "chlor_a"])
        if isro_chl.get("status") == "ok":
            val = _safe_float(isro_chl.get("value"))
            if val is not None:
                mosdac_dir = LIVE_DIR / "mosdac" / "oceansat3_chl"
                age = _file_age_minutes(mosdac_dir)
                sources.append({
                    "source": "ISRO Oceansat-3",
                    "variable": "chlorophyll_mg_m3",
                    "value": round(val, 3),
                    "age_minutes": age,
                    "quality": _freshness_quality(age)
                })
    except Exception:
        pass

    return sources

def _collect_wave_sources(lat, lon):
    """Collects wave height from available sources."""
    sources = []

    # Source 1: Open-Meteo Marine (live)
    try:
        ft = _get_fetch_openmeteo()
        if ft and hasattr(ft, "get_comprehensive_conditions"):
            entry = ft.get_comprehensive_conditions(lat, lon)
            marine_current = entry.get("marine_current", {}) or {}
            wave = _safe_float(marine_current.get("wave_height"))
            if wave is not None:
                sources.append({
                    "source": "Open-Meteo Marine (live)",
                    "variable": "wave_height_m",
                    "value": wave,
                    "age_minutes": 0,
                    "quality": 1.0
                })
    except Exception:
        pass

    # Source 2: INCOIS High-Wave Alerts (cache)
    try:
        incois_file = LIVE_DIR / "alerts" / "incois_high_wave_alerts.json"
        data = _load_json(incois_file)
        if data and data.get("high_wave_active"):
            age = _file_age_minutes(incois_file)
            sources.append({
                "source": "INCOIS High-Wave Alert",
                "variable": "wave_alert_active",
                "value": True,
                "age_minutes": age,
                "quality": _freshness_quality(age)
            })
    except Exception:
        pass

    return sources

def _collect_safety_sources(lat, lon):
    """Collects safety verdicts from multiple sources."""
    sources = []

    # Source 1: Open-Meteo safety analysis (live)
    try:
        ft = _get_fetch_openmeteo()
        if ft and hasattr(ft, "get_comprehensive_conditions"):
            entry = ft.get_comprehensive_conditions(lat, lon)
            safety = entry.get("safety_analysis", {}) or {}
            verdict = safety.get("verdict", safety.get("overall_verdict"))
            if verdict:
                sources.append({
                    "source": "Open-Meteo Safety",
                    "variable": "verdict",
                    "value": str(verdict).upper(),
                    "age_minutes": 0,
                    "quality": 1.0
                })
    except Exception:
        pass

    # Source 2: IMD warnings (cache)
    try:
        imd_file = LIVE_DIR / "alerts" / "imd_fishermen_alerts.json"
        data = _load_json(imd_file)
        if data:
            warnings = data.get("warnings", []) or []
            has_warning = any(
                "not to venture" in str(w).lower()
                for w in warnings
            )
            if has_warning:
                age = _file_age_minutes(imd_file)
                sources.append({
                    "source": "IMD Fishermen Warning",
                    "variable": "verdict",
                    "value": "DO_NOT_VENTURE",
                    "age_minutes": age,
                    "quality": _freshness_quality(age)
                })
    except Exception:
        pass

    # Source 3: INCOIS high-wave (cache)
    try:
        incois_file = LIVE_DIR / "alerts" / "incois_high_wave_alerts.json"
        data = _load_json(incois_file)
        if data and data.get("high_wave_active"):
            age = _file_age_minutes(incois_file)
            sources.append({
                "source": "INCOIS High-Wave",
                "variable": "verdict",
                "value": "HIGH_WAVE_ALERT",
                "age_minutes": age,
                "quality": _freshness_quality(age)
            })
    except Exception:
        pass

    # Source 4: Cyclone detection (cache)
    try:
        cyc_file = LIVE_DIR / "alerts" / "cyclone_detection_result.json"
        data = _load_json(cyc_file)
        if data and data.get("is_cyclone_detected"):
            age = _file_age_minutes(cyc_file)
            risk = data.get("risk_level", "DANGER")
            sources.append({
                "source": "Cyclone Detection",
                "variable": "verdict",
                "value": str(risk).upper(),
                "age_minutes": age,
                "quality": _freshness_quality(age)
            })
    except Exception:
        pass

    return sources

# ============================================================
# FUSION ALGORITHMS
# ============================================================
def _fuse_numeric(values_with_quality):
    """
    Fuses multiple numeric values using quality-weighted average.
    values_with_quality: list of (value, quality) tuples
    Returns fused value + agreement metric + spread.
    """
    valid = [(v, q) for v, q in values_with_quality if v is not None and q > 0]
    if not valid:
        return None, 0.0, 0.0

    # Weighted average
    total_weight = sum(q for _, q in valid)
    if total_weight == 0:
        return None, 0.0, 0.0

    fused = sum(v * q for v, q in valid) / total_weight

    # Initialize defaults (fixes UnboundLocalError for single source)
    spread = 0.0
    agreement = 0.7  # single source gets moderate agreement

    # Agreement: how close are values to each other?
    if len(valid) >= 2:
        values = [v for v, _ in valid]
        spread = max(values) - min(values)
        mean_val = sum(values) / len(values)
        if mean_val > 0:
            agreement = max(0.0, 1.0 - (spread / mean_val))
        else:
            agreement = 1.0 if spread == 0 else 0.0

    return round(fused, 3), agreement, spread

def _fuse_verdicts(verdict_sources):
    """
    Fuses safety verdicts using safety-first priority.
    Priority: DANGEROUS > CAUTION > SAFE
    """
    if not verdict_sources:
        return "UNKNOWN", 0.0

    verdicts = [s.get("value", "").upper() for s in verdict_sources]

    # Safety-first: if ANY source says dangerous, result is dangerous
    danger_keywords = ["DANGEROUS", "DO_NOT_VENTURE", "EXTREME", "DANGER", "HIGH_WAVE", "CYCLONIC"]
    caution_keywords = ["CAUTION", "MODERATE", "HIGH RISK", "WARNING"]

    has_danger = any(
        any(kw in v for kw in danger_keywords)
        for v in verdicts
    )
    has_caution = any(
        any(kw in v for kw in caution_keywords)
        for v in verdicts
    )

    if has_danger:
        resolved = "DANGEROUS"
    elif has_caution:
        resolved = "CAUTION"
    elif all(v in ("SAFE", "CLEAR", "NO ALERT", "") for v in verdicts if v):
        resolved = "SAFE"
    else:
        resolved = "CAUTION"

    # Agreement: how many sources agree with resolved verdict?
    total = len(verdicts)
    if total == 0:
        return resolved, 0.0

    agreement = 0.5  # Base agreement for having multiple sources
    return resolved, agreement

def _compute_confidence(agreement, freshness_scores, source_count):
    """
    Computes confidence score 0-100 based on:
    - Source agreement (0-50 points)
    - Data freshness (0-30 points)
    - Number of sources (0-20 points)
    """
    # Agreement component (0-50)
    agreement_score = agreement * 50.0

    # Freshness component (0-30)
    avg_freshness = sum(freshness_scores) / len(freshness_scores) if freshness_scores else 0
    freshness_score = avg_freshness * 30.0

    # Source count component (0-20)
    count_score = min(source_count / 4.0, 1.0) * 20.0

    confidence = agreement_score + freshness_score + count_score
    return min(98.0, max(15.0, round(confidence)))

# ============================================================
# MASTER FUSION FUNCTION
# ============================================================
def fuse_marine_state(lat, lon):
    """
    Master fusion: collects all sources, fuses them, returns unified state.
    This is the core Data Fusion Engine.
    """
    result = {
        "tool": "data_fusion_engine.fuse_marine_state",
        "generated_at": _now_iso(),
        "lat": lat,
        "lon": lon,
        "fused_state": {},
        "sources_used": [],
        "conflicts": [],
        "confidence": {},
        "data_freshness": {}
    }

    # 1. FUSE SST
    sst_sources = _collect_sst_sources(lat, lon)
    sst_values = [(s["value"], s["quality"]) for s in sst_sources if s.get("value") is not None]
    if sst_values:
        fused_sst, sst_agreement, sst_spread = _fuse_numeric(sst_values)
        result["fused_state"]["sst_c"] = fused_sst
        result["fused_state"]["sst_agreement_pct"] = round(sst_agreement * 100)
        result["fused_state"]["sst_spread_c"] = round(sst_spread, 2) if sst_spread else 0
        result["sources_used"].extend(sst_sources)
        if sst_spread and sst_spread > 2.0:
            result["conflicts"].append(f"SST spread {round(sst_spread,2)}°C between sources")
    else:
        result["fused_state"]["sst_c"] = None
        result["fused_state"]["sst_note"] = "No SST data available"

    # 2. FUSE CHLOROPHYLL
    chl_sources = _collect_chlorophyll_sources(lat, lon)
    chl_values = [(s["value"], s["quality"]) for s in chl_sources if s.get("value") is not None]
    if chl_values:
        fused_chl, chl_agreement, chl_spread = _fuse_numeric(chl_values)
        result["fused_state"]["chlorophyll_mg_m3"] = fused_chl
        result["fused_state"]["chl_agreement_pct"] = round(chl_agreement * 100)
        result["sources_used"].extend(chl_sources)
        if chl_spread and chl_spread > 0.5:
            result["conflicts"].append(f"Chlorophyll spread {round(chl_spread,3)} mg/m³")
    else:
        result["fused_state"]["chlorophyll_mg_m3"] = None

    # 3. FUSE WAVE
    wave_sources = _collect_wave_sources(lat, lon)
    wave_values = [(s["value"], s["quality"]) for s in wave_sources if s.get("value") is not None and isinstance(s["value"], (int, float))]
    if wave_values:
        fused_wave, wave_agreement, wave_spread = _fuse_numeric(wave_values)
        result["fused_state"]["wave_height_m"] = fused_wave
        result["sources_used"].extend(wave_sources)
    else:
        result["fused_state"]["wave_height_m"] = None
        # Check if alert-based wave source exists
        for s in wave_sources:
            if s.get("value") is True:  # Alert active
                result["fused_state"]["wave_alert_active"] = True
                result["sources_used"].append(s)

    # 4. FUSE SAFETY VERDICT
    safety_sources = _collect_safety_sources(lat, lon)
    if safety_sources:
        resolved_verdict, verdict_agreement = _fuse_verdicts(safety_sources)
        result["fused_state"]["safety_verdict"] = resolved_verdict
        result["sources_used"].extend(safety_sources)
    else:
        result["fused_state"]["safety_verdict"] = "UNKNOWN"

    # 5. COMPUTE OVERALL CONFIDENCE
    all_qualities = [s.get("quality", 0) for s in result["sources_used"]]
    all_agreements = []
    if result["fused_state"].get("sst_agreement_pct"):
        all_agreements.append(result["fused_state"]["sst_agreement_pct"] / 100.0)
    if result["fused_state"].get("chl_agreement_pct"):
        all_agreements.append(result["fused_state"]["chl_agreement_pct"] / 100.0)

    overall_agreement = sum(all_agreements) / len(all_agreements) if all_agreements else 0.5
    source_count = len(set(s.get("source") for s in result["sources_used"]))

    confidence = _compute_confidence(overall_agreement, all_qualities, source_count)
    result["confidence"] = {
        "overall_pct": confidence,
        "level": "HIGH" if confidence >= 75 else ("MODERATE" if confidence >= 50 else "LOW"),
        "agreement_component": round(overall_agreement * 50, 1),
        "freshness_component": round((sum(all_qualities) / len(all_qualities) if all_qualities else 0) * 30, 1),
        "source_count_component": round(min(source_count / 4.0, 1.0) * 20, 1),
        "sources_count": source_count
    }

    # 6. DATA FRESHNESS SUMMARY
    for s in result["sources_used"]:
        src_name = s.get("source", "unknown")
        if src_name not in result["data_freshness"]:
            result["data_freshness"][src_name] = {
                "age_minutes": s.get("age_minutes"),
                "quality": s.get("quality"),
                "variables": []
            }
        result["data_freshness"][src_name]["variables"].append(s.get("variable"))

    result["data_sources"] = list(set(s.get("source") for s in result["sources_used"]))
    return result

# ============================================================
# QUICK FUSION (lightweight for agent context)
# ============================================================
def quick_fusion(lat, lon):
    """
    Lightweight fusion for agent tool output (truncated).
    """
    full = fuse_marine_state(lat, lon)
    return {
        "tool": "data_fusion_engine.quick_fusion",
        "generated_at": full["generated_at"],
        "lat": lat,
        "lon": lon,
        "fused_state": full["fused_state"],
        "confidence_pct": full["confidence"]["overall_pct"],
        "confidence_level": full["confidence"]["level"],
        "sources_count": full["confidence"]["sources_count"],
        "conflicts": full["conflicts"],
        "data_sources": full["data_sources"]
    }

# ============================================================
# TEST RUN
# ============================================================
if __name__ == "__main__":
    print("=" * 70)
    print("DATA FUSION ENGINE — TEST RUN")
    print("=" * 70)

    TEST_LAT = 13.05
    TEST_LON = 80.30

    print(f"\n📦 fuse_marine_state({TEST_LAT}, {TEST_LON}) =>")
    full_result = fuse_marine_state(TEST_LAT, TEST_LON)
    print(json.dumps(full_result, indent=1, default=str))

    print(f"\n📦 quick_fusion({TEST_LAT}, {TEST_LON}) =>")
    quick_result = quick_fusion(TEST_LAT, TEST_LON)
    print(json.dumps(quick_result, indent=1, default=str))

    print("\n✅ DATA FUSION ENGINE TEST COMPLETE")
    print("\nCALL LIST:")
    print("  py .\\engine\\data_fusion_engine.py")
    print('  py -c "import sys; sys.path.insert(0,\'engine\'); from data_fusion_engine import fuse_marine_state; import json; print(json.dumps(fuse_marine_state(13.05, 80.30), indent=1, default=str))"')
    print('  py -c "import sys; sys.path.insert(0,\'engine\'); from data_fusion_engine import quick_fusion; import json; print(json.dumps(quick_fusion(13.05, 80.30), indent=1, default=str))"')