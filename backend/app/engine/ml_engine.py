"""
engine/ml_engine.py
PHASE B4 — MACHINE LEARNING ENGINE
Implements:
1. Marine Risk Model (LOW/MODERATE/HIGH/EXTREME)
2. Fishing Suitability Model (0-100 score)
3. Anomaly Detection (SST, chlorophyll, wave, wind)

Architecture:
- Rule-based ML with configurable thresholds (deterministic)
- Extensible to sklearn/ML models later
- Uses data from fusion engine, safety tool, hazard tool, pfz tool
- Vessel-type-aware risk calculation
- Season-aware suitability scoring

Rules:
- Zero top-level execution
- Everything inside functions
- Dynamic lat/lon/vessel_type
- TEST_* constants only inside __main__
- Primary -> fallback
- TEST RUN prints full result data
"""
import sys
import json
import math
from pathlib import Path
from datetime import datetime, date

# ============================================================
# PATH SETUP
# ============================================================
ENGINE_DIR = Path(__file__).resolve().parent
APP_DIR = ENGINE_DIR.parent
TOOLS_DIR = APP_DIR / "tools"
LIVE_DIR = Path(r"E:\sih\data\live_cache")

for p in [str(APP_DIR), str(TOOLS_DIR), str(ENGINE_DIR)]:
    if p not in sys.path:
        sys.path.insert(0, p)

# ============================================================
# TEST CONSTANTS
# ============================================================
TEST_LAT = 13.05
TEST_LON = 80.30
TEST_VESSEL_TYPE = "small_boat"

# ============================================================
# VESSEL RISK PROFILES (Configurable thresholds)
# ============================================================
VESSEL_RISK_PROFILES = {
    "small_boat": {
        "label": "Small non-mechanized / country boat",
        "max_wave_m": 1.0,
        "max_wind_kmh": 20,
        "max_gust_kmh": 30,
        "max_swell_m": 1.0,
        "max_current_ms": 1.0,
        "risk_multiplier": 1.5,  # Higher risk sensitivity
    },
    "trawler": {
        "label": "Mechanized trawler",
        "max_wave_m": 1.5,
        "max_wind_kmh": 30,
        "max_gust_kmh": 45,
        "max_swell_m": 1.5,
        "max_current_ms": 1.5,
        "risk_multiplier": 1.0,
    },
    "cargo": {
        "label": "Cargo / large vessel",
        "max_wave_m": 2.5,
        "max_wind_kmh": 40,
        "max_gust_kmh": 60,
        "max_swell_m": 2.0,
        "max_current_ms": 2.0,
        "risk_multiplier": 0.6,
    },
    "research": {
        "label": "Research vessel",
        "max_wave_m": 2.0,
        "max_wind_kmh": 35,
        "max_gust_kmh": 50,
        "max_swell_m": 1.8,
        "max_current_ms": 1.8,
        "risk_multiplier": 0.8,
    },
}

# ============================================================
# SEASONAL SUITABILITY WEIGHTS
# ============================================================
SEASON_WEIGHTS = {
    # Month: weight for fishing suitability (1.0 = normal, >1 = good season, <1 = bad season)
    1: 0.8,   # January - winter, moderate
    2: 0.9,   # February
    3: 1.0,   # March - pre-monsoon
    4: 1.1,   # April - good fishing
    5: 1.0,   # May - pre-monsoon peak
    6: 0.3,   # June - monsoon ban starts
    7: 0.2,   # July - monsoon ban active
    8: 0.3,   # August - monsoon ban active
    9: 0.8,   # September - post-monsoon recovery
    10: 1.0,  # October - good fishing
    11: 1.1,  # November - peak season
    12: 1.0,  # December - good fishing
}

# ============================================================
# ANOMALY THRESHOLDS (Standard deviations from expected)
# ============================================================
ANOMALY_THRESHOLDS = {
    "sst_c": {"min": 20.0, "max": 35.0, "warning_deviation": 3.0},
    "chlorophyll_mg_m3": {"min": 0.0, "max": 20.0, "warning_deviation": 5.0},
    "wave_height_m": {"min": 0.0, "max": 10.0, "warning_deviation": 3.0},
    "wind_speed_kmh": {"min": 0.0, "max": 100.0, "warning_deviation": 20.0},
}

# ============================================================
# HELPERS
# ============================================================
def _now_iso():
    return datetime.now().isoformat()

def _safe_float(value):
    try:
        if value is None:
            return None
        return float(value)
    except (ValueError, TypeError):
        return None

def _get_current_month():
    return datetime.now().month

def _get_season_weight():
    return SEASON_WEIGHTS.get(_get_current_month(), 1.0)

def _load_json(path):
    try:
        p = Path(path)
        if p.exists():
            return json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        pass
    return None

# ============================================================
# 1. MARINE RISK MODEL
# ============================================================
def calculate_marine_risk(lat, lon, vessel_type="small_boat"):
    """
    AI Tool: Calculate marine risk level based on current conditions.
    Inputs: wave, wind, swell, current, rain, visibility, cyclone proximity, vessel type
    Output: LOW / MODERATE / HIGH / EXTREME
    """
    profile = VESSEL_RISK_PROFILES.get(vessel_type, VESSEL_RISK_PROFILES["small_boat"])

    # Collect data from tools
    conditions = {}
    risks = []
    evidence = []

    # Try to get safety data
    try:
        from tools.safety_tool import get_safety_conditions
        safety = get_safety_conditions(lat, lon, source="all")
        if isinstance(safety, dict):
            cond = safety.get("conditions", {}) or {}
            conditions["wave_m"] = _safe_float(cond.get("wave_m"))
            conditions["wind_kmh"] = _safe_float(cond.get("wind_kmh"))
            conditions["gusts_kmh"] = _safe_float(cond.get("gusts_kmh"))
            conditions["swell_m"] = _safe_float(cond.get("swell_m"))
            conditions["rain_mm"] = _safe_float(cond.get("rain_mm"))
            conditions["visibility_m"] = _safe_float(cond.get("visibility_m"))
            conditions["pressure_hpa"] = _safe_float(cond.get("pressure_hpa"))
            conditions["weather_code"] = cond.get("weather_code")
            evidence.append("safety_tool conditions")
    except Exception:
        pass

    # Try to get cyclone data
    try:
        from tools.hazard_tool import get_cyclone_risk
        cyclone = get_cyclone_risk(lat, lon, source="all")
        if isinstance(cyclone, dict):
            risk_level = cyclone.get("risk_level", "")
            if any(kw in str(risk_level).upper() for kw in ["DANGER", "EXTREME", "CYCLONIC"]):
                conditions["cyclone_active"] = True
                evidence.append("cyclone_risk active")
            else:
                conditions["cyclone_active"] = False
    except Exception:
        conditions["cyclone_active"] = False

    # Calculate risk score (0-100)
    risk_score = 0.0
    risk_factors = []

    wave = conditions.get("wave_m")
    wind = conditions.get("wind_kmh")
    gust = conditions.get("gusts_kmh")
    swell = conditions.get("swell_m")
    visibility = conditions.get("visibility_m")
    pressure = conditions.get("pressure_hpa")
    weather_code = conditions.get("weather_code")
    cyclone_active = conditions.get("cyclone_active", False)

    # Wave risk
    if wave is not None:
        wave_ratio = wave / profile["max_wave_m"]
        if wave_ratio > 1.0:
            risk_score += min(30, (wave_ratio - 1.0) * 50)
            risk_factors.append(f"Wave {wave}m exceeds {profile['max_wave_m']}m limit")
        elif wave_ratio > 0.8:
            risk_score += 10
            risk_factors.append(f"Wave {wave}m near limit")

    # Wind risk
    if wind is not None:
        wind_ratio = wind / profile["max_wind_kmh"]
        if wind_ratio > 1.0:
            risk_score += min(25, (wind_ratio - 1.0) * 40)
            risk_factors.append(f"Wind {wind}km/h exceeds limit")
        elif wind_ratio > 0.8:
            risk_score += 8

    # Gust risk
    if gust is not None:
        gust_ratio = gust / profile["max_gust_kmh"]
        if gust_ratio > 1.0:
            risk_score += min(15, (gust_ratio - 1.0) * 30)
            risk_factors.append(f"Gusts {gust}km/h exceed limit")

    # Swell risk
    if swell is not None:
        if swell > profile["max_swell_m"]:
            risk_score += 15
            risk_factors.append(f"Swell {swell}m exceeds limit")

    # Thunderstorm / lightning
    if weather_code is not None and int(weather_code) >= 95:
        risk_score += 25
        risk_factors.append("Thunderstorm/lightning active")

    # Low pressure (cyclonic conditions)
    if pressure is not None and pressure < 1000:
        risk_score += 15
        risk_factors.append(f"Low pressure {pressure}hPa")

    # Cyclone active
    if cyclone_active:
        risk_score += 30
        risk_factors.append("Active cyclone signal detected")

    # Poor visibility
    if visibility is not None and visibility < 2000:
        risk_score += 10
        risk_factors.append(f"Poor visibility {visibility}m")

    # Apply vessel risk multiplier
    risk_score = min(100, risk_score * profile["risk_multiplier"])

    # Determine risk level
    if risk_score >= 75:
        risk_level = "EXTREME"
        action = "DO NOT VENTURE. Life-threatening conditions."
    elif risk_score >= 50:
        risk_level = "HIGH"
        action = "Do not venture. Return to nearest port."
    elif risk_score >= 25:
        risk_level = "MODERATE"
        action = "Caution advised. Monitor conditions closely."
    else:
        risk_level = "LOW"
        action = "Conditions favorable for operations."

    return {
        "tool": "ml_engine.calculate_marine_risk",
        "generated_at": _now_iso(),
        "lat": lat,
        "lon": lon,
        "vessel_type": vessel_type,
        "vessel_profile": profile["label"],
        "risk_score": round(risk_score, 1),
        "risk_level": risk_level,
        "recommended_action": action,
        "risk_factors": risk_factors,
        "conditions_used": conditions,
        "evidence_sources": evidence,
        "data_sources": ["safety_tool", "hazard_tool", "ml_engine risk model"],
    }

# ============================================================
# 2. FISHING SUITABILITY MODEL
# ============================================================
def calculate_fishing_suitability(lat, lon, source="all"):
    """
    AI Tool: Calculate fishing suitability score (0-100).
    Inputs: SST, chlorophyll, upwelling, season, currents
    Output: Score 0-100 + Class (POOR/MODERATE/GOOD/EXCELLENT)
    """
    sst = None
    chlorophyll = None
    upwelling = None
    current_speed = None
    evidence = []

    # Get SST + Chlorophyll from pfz_tool or fusion
    try:
        from tools.pfz_tool import get_sst_chlorophyll
        ocean = get_sst_chlorophyll(lat, lon, source="all")
        if isinstance(ocean, dict):
            cop = ocean.get("copernicus", {}) or {}
            isro = ocean.get("isro", {}) or {}
            sst = _safe_float(cop.get("sst_c_at_point") or isro.get("sst_c"))
            chlorophyll = _safe_float(cop.get("chlorophyll_at_point") or isro.get("chlorophyll"))
            upwelling = _safe_float(isro.get("upwelling_index"))
            evidence.append("pfz_tool SST/Chl")
    except Exception:
        pass

    # Get current speed
    try:
        from tools.navigation_tool import get_isro_wind_current
        wind_current = get_isro_wind_current(lat, lon, source="isro")
        if isinstance(wind_current, dict):
            isro_current = wind_current.get("isro_current", {}) or {}
            if isro_current.get("status") == "ok":
                current_speed = _safe_float(isro_current.get("speed_ms"))
                evidence.append("ISRO current")
    except Exception:
        pass

    # Calculate suitability score
    score = 0.0
    factors = []

    # SST suitability (ideal: 26-32°C for most Indian fisheries)
    if sst is not None:
        if 26 <= sst <= 32:
            score += 30
            factors.append(f"SST {round(sst,1)}°C optimal (26-32°C)")
        elif 24 <= sst < 26 or 32 < sst <= 34:
            score += 20
            factors.append(f"SST {round(sst,1)}°C moderate")
        else:
            score += 5
            factors.append(f"SST {round(sst,1)}°C suboptimal")

    # Chlorophyll suitability (higher = more productivity)
    if chlorophyll is not None:
        if chlorophyll > 1.0:
            score += 25
            factors.append(f"Chlorophyll {round(chlorophyll,2)} mg/m³ high productivity")
        elif chlorophyll > 0.3:
            score += 18
            factors.append(f"Chlorophyll {round(chlorophyll,2)} mg/m³ moderate")
        else:
            score += 5
            factors.append(f"Chlorophyll {round(chlorophyll,2)} mg/m³ low")

    # Upwelling (positive upwelling index = nutrient-rich)
    if upwelling is not None:
        if upwelling > 1.0:
            score += 15
            factors.append(f"Upwelling index {round(upwelling,2)} favorable")
        elif upwelling > 0:
            score += 8
            factors.append(f"Upwelling index {round(upwelling,2)} mild")

    # Current speed (moderate currents are good, extreme are bad)
    if current_speed is not None:
        if 0.5 <= current_speed <= 1.5:
            score += 10
            factors.append(f"Current {round(current_speed,2)} m/s favorable")
        elif current_speed < 0.5 or current_speed > 2.0:
            score += 3
            factors.append(f"Current {round(current_speed,2)} m/s suboptimal")

    # Seasonal weight
    season_weight = _get_season_weight()
    score = score * season_weight
    month = _get_current_month()
    factors.append(f"Season weight: {season_weight} (month {month})")

    # Normalize to 0-100
    score = min(100, max(0, score))

    # Determine class
    if score >= 75:
        suitability_class = "EXCELLENT"
    elif score >= 55:
        suitability_class = "GOOD"
    elif score >= 35:
        suitability_class = "MODERATE"
    else:
        suitability_class = "POOR"

    return {
        "tool": "ml_engine.calculate_fishing_suitability",
        "generated_at": _now_iso(),
        "lat": lat,
        "lon": lon,
        "suitability_score": round(score, 1),
        "suitability_class": suitability_class,
        "factors": factors,
        "inputs": {
            "sst_c": sst,
            "chlorophyll_mg_m3": chlorophyll,
            "upwelling_index": upwelling,
            "current_speed_ms": current_speed,
            "season_weight": season_weight,
            "current_month": month,
        },
        "evidence_sources": evidence,
        "data_sources": ["pfz_tool", "navigation_tool", "ml_engine suitability model"],
    }

# ============================================================
# 3. ANOMALY DETECTION
# ============================================================
def detect_anomalies(lat, lon):
    """
    AI Tool: Detect anomalous marine conditions.
    Checks: SST, chlorophyll, wave height, wind speed against expected ranges.
    Output: List of detected anomalies with severity.
    """
    anomalies = []
    conditions_checked = {}
    evidence = []

    # Get current conditions
    sst = None
    chlorophyll = None
    wave = None
    wind = None

    try:
        from tools.pfz_tool import get_sst_chlorophyll
        ocean = get_sst_chlorophyll(lat, lon, source="all")
        if isinstance(ocean, dict):
            cop = ocean.get("copernicus", {}) or {}
            isro = ocean.get("isro", {}) or {}
            sst = _safe_float(cop.get("sst_c_at_point") or isro.get("sst_c"))
            chlorophyll = _safe_float(cop.get("chlorophyll_at_point") or isro.get("chlorophyll"))
            evidence.append("SST/Chl from pfz_tool")
    except Exception:
        pass

    try:
        from tools.safety_tool import get_safety_conditions
        safety = get_safety_conditions(lat, lon, source="openmeteo")
        if isinstance(safety, dict):
            cond = safety.get("conditions", {}) or {}
            wave = _safe_float(cond.get("wave_m"))
            wind = _safe_float(cond.get("wind_kmh"))
            evidence.append("Wave/Wind from safety_tool")
    except Exception:
        pass

    # Check each variable against thresholds
    checks = {
        "sst_c": sst,
        "chlorophyll_mg_m3": chlorophyll,
        "wave_height_m": wave,
        "wind_speed_kmh": wind,
    }

    for var_name, value in checks.items():
        if value is None:
            conditions_checked[var_name] = {"status": "no_data"}
            continue

        threshold = ANOMALY_THRESHOLDS.get(var_name, {})
        min_val = threshold.get("min", 0)
        max_val = threshold.get("max", 100)
        warning_dev = threshold.get("warning_deviation", 5)

        conditions_checked[var_name] = {
            "value": round(value, 2),
            "status": "normal",
            "range": f"{min_val} - {max_val}",
        }

        # Out of range
        if value < min_val or value > max_val:
            anomalies.append({
                "variable": var_name,
                "value": round(value, 2),
                "type": "OUT_OF_RANGE",
                "severity": "HIGH",
                "message": f"{var_name} = {round(value,2)} is outside normal range ({min_val}-{max_val})",
            })
            conditions_checked[var_name]["status"] = "anomaly_out_of_range"

    # Determine overall anomaly status
    has_high_severity = any(a["severity"] == "HIGH" for a in anomalies)
    has_anomalies = len(anomalies) > 0

    return {
        "tool": "ml_engine.detect_anomalies",
        "generated_at": _now_iso(),
        "lat": lat,
        "lon": lon,
        "anomaly_detected": has_anomalies,
        "anomaly_count": len(anomalies),
        "anomalies": anomalies,
        "conditions_checked": conditions_checked,
        "evidence_sources": evidence,
        "data_sources": ["pfz_tool", "safety_tool", "ml_engine anomaly detection"],
    }

# ============================================================
# 4. MASTER ML ANALYSIS
# ============================================================
def get_full_ml_analysis(lat, lon, vessel_type="small_boat"):
    """
    AI Tool: Complete ML analysis combining risk, suitability, and anomaly detection.
    """
    risk = calculate_marine_risk(lat, lon, vessel_type)
    suitability = calculate_fishing_suitability(lat, lon)
    anomalies = detect_anomalies(lat, lon)

    # Overall recommendation
    risk_level = risk.get("risk_level", "UNKNOWN")
    suitability_score = suitability.get("suitability_score", 0)
    anomaly_detected = anomalies.get("anomaly_detected", False)

    if risk_level in ("EXTREME", "HIGH"):
        overall = "DO_NOT_VENTURE"
    elif risk_level == "MODERATE" and suitability_score < 35:
        overall = "NOT_RECOMMENDED"
    elif risk_level == "MODERATE":
        overall = "PROCEED_WITH_CAUTION"
    elif suitability_score >= 55 and not anomaly_detected:
        overall = "FAVORABLE"
    else:
        overall = "MODERATE"

    return {
        "tool": "ml_engine.get_full_ml_analysis",
        "generated_at": _now_iso(),
        "lat": lat,
        "lon": lon,
        "vessel_type": vessel_type,
        "marine_risk": risk,
        "fishing_suitability": suitability,
        "anomaly_detection": anomalies,
        "overall_recommendation": overall,
        "data_sources": [
            "ml_engine risk model",
            "ml_engine suitability model",
            "ml_engine anomaly detection",
        ],
    }
# ============================================================
# TRUE ML ANOMALY DETECTION (trained IsolationForest + statistical fallback)
# ============================================================
def detect_anomalies_ml(lat, lon):
    """
    Trains an IsolationForest on the current Copernicus SST+Chl spatial field
    and flags whether the user's point is a statistical anomaly.
    Fallback: robust IQR Z-score if scikit-learn is not installed.
    """
    try:
        import numpy as np
        import xarray as xr
        sst_nc = Path(r"E:\sih\data\live_cache\sst\india_coast_sst_live.nc")
        chl_nc = Path(r"E:\sih\data\live_cache\sst\india_coast_chlorophyll_live.nc")
        if not sst_nc.exists() or not chl_nc.exists():
            return {"status": "no_data", "message": "Copernicus NetCDF missing"}

        ds_s = xr.open_dataset(sst_nc)
        ds_c = xr.open_dataset(chl_nc)
        sv = "analysed_sst" if "analysed_sst" in ds_s else list(ds_s.data_vars)[0]
        cv = "CHL" if "CHL" in ds_c else list(ds_c.data_vars)[0]
        sst2d = ds_s[sv].isel(time=-1).values
        if sst2d.max() > 150:
            sst2d = sst2d - 273.15
        chl_matched = ds_c[cv].interp(latitude=ds_s["latitude"], longitude=ds_s["longitude"], method="nearest").isel(time=-1).values
        mask = np.isfinite(sst2d) & np.isfinite(chl_matched) & (chl_matched > 0)
        X = np.column_stack([sst2d[mask], np.log10(np.clip(chl_matched[mask], 1e-3, None))])
        rng = np.random.default_rng(42)
        Xs = X[rng.choice(len(X), size=min(5000, len(X)), replace=False)]

        sst_pt = float(ds_s[sv].sel(latitude=lat, longitude=lon, method="nearest").isel(time=-1).values)
        chl_pt = float(ds_c[cv].sel(latitude=lat, longitude=lon, method="nearest").isel(time=-1).values)
        if sst_pt > 150: sst_pt -= 273.15
        x_pt = np.array([[sst_pt, np.log10(max(chl_pt, 1e-3))]])
        ds_s.close(); ds_c.close()

        try:
            from sklearn.ensemble import IsolationForest
            clf = IsolationForest(n_estimators=100, random_state=42, contamination=0.05).fit(Xs)
            score = round(float(clf.score_samples(x_pt)[0]), 3)
            anomaly = bool(clf.predict(x_pt)[0] == -1)
            method = "IsolationForest (trained unsupervised ML)"
        except ImportError:
            med = np.median(Xs, axis=0)
            iqr = np.percentile(Xs, 75, axis=0) - np.percentile(Xs, 25, axis=0)
            z = np.abs((x_pt[0] - med) / np.where(iqr == 0, 1e-9, iqr))
            anomaly = bool(np.any(z > 3.0))
            score = round(float(-np.max(z)), 3)
            method = "Robust IQR Z-score (statistical fallback)"

        return {
            "tool": "ml_engine.detect_anomalies_ml",
            "status": "success",
            "method": method,
            "anomaly_detected": anomaly,
            "ml_score": score,
            "point_sst_c": round(sst_pt, 2),
            "point_chlorophyll_mg_m3": round(chl_pt, 3),
            "interpretation": (
                "Point deviates from regional ocean distribution — investigate locally."
                if anomaly else "Point is consistent with regional ocean conditions."
            ),
            "data_sources": ["Copernicus L4 SST + Chlorophyll spatial field"],
        }
    except Exception as e:
        return {"status": "error", "error": str(e)[:120]}
# ============================================================
# TEST RUN
# ============================================================
if __name__ == "__main__":
    print("=" * 70)
    print("ML ENGINE — TEST RUN")
    print("=" * 70)

    # Test 1: Marine Risk
    print("\n📦 calculate_marine_risk =>")
    risk_result = calculate_marine_risk(TEST_LAT, TEST_LON, TEST_VESSEL_TYPE)
    print(json.dumps(risk_result, indent=1, default=str))

    # Test 2: Fishing Suitability
    print("\n📦 calculate_fishing_suitability =>")
    suit_result = calculate_fishing_suitability(TEST_LAT, TEST_LON)
    print(json.dumps(suit_result, indent=1, default=str))

    # Test 3: Anomaly Detection
    print("\n📦 detect_anomalies =>")
    anomaly_result = detect_anomalies(TEST_LAT, TEST_LON)
    print(json.dumps(anomaly_result, indent=1, default=str))

    # Test 4: Full ML Analysis
    print("\n📦 get_full_ml_analysis =>")
    full_result = get_full_ml_analysis(TEST_LAT, TEST_LON, TEST_VESSEL_TYPE)
    # Print summary only
    summary = {
        "tool": full_result.get("tool"),
        "overall_recommendation": full_result.get("overall_recommendation"),
        "risk_level": full_result.get("marine_risk", {}).get("risk_level"),
        "risk_score": full_result.get("marine_risk", {}).get("risk_score"),
        "suitability_score": full_result.get("fishing_suitability", {}).get("suitability_score"),
        "suitability_class": full_result.get("fishing_suitability", {}).get("suitability_class"),
        "anomaly_detected": full_result.get("anomaly_detection", {}).get("anomaly_detected"),
        "anomaly_count": full_result.get("anomaly_detection", {}).get("anomaly_count"),
    }
    print(json.dumps(summary, indent=1, default=str))

    print("\n✅ ML ENGINE TEST COMPLETE")
    print("\nCALL LIST:")
    print("  py .\\engine\\ml_engine.py")
    print('  py -c "import sys; sys.path.insert(0,\'engine\'); from ml_engine import calculate_marine_risk; import json; print(json.dumps(calculate_marine_risk(13.05, 80.30, \'small_boat\'), indent=1, default=str))"')
    print('  py -c "import sys; sys.path.insert(0,\'engine\'); from ml_engine import calculate_fishing_suitability; import json; print(json.dumps(calculate_fishing_suitability(13.05, 80.30), indent=1, default=str))"')
    print('  py -c "import sys; sys.path.insert(0,\'engine\'); from ml_engine import detect_anomalies; import json; print(json.dumps(detect_anomalies(13.05, 80.30), indent=1, default=str))"')
    print('  py -c "import sys; sys.path.insert(0,\'engine\'); from ml_engine import get_full_ml_analysis; import json; print(json.dumps(get_full_ml_analysis(13.05, 80.30, \'small_boat\'), indent=1, default=str))"')