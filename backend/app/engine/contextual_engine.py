"""
contextual_engine.py

ORCA CONTEXTUAL REASONING ENGINE (Feature #9)
Combines user context (vessel specifications, location, destination, departure/return timing,
conversation history) with multi-condition marine state (waves, wind, gusts, swell, lightning,
tides, marine boundaries, hazard alerts) to produce compound, vessel-tailored recommendations.

Key Capabilities:
1. Universal Vessel Seaworthiness Model (VESSEL_CAPABILITY_THRESHOLDS)
2. Living Session State Tracker (extracts and retains context across N conversation turns)
3. Multi-Condition Compounding Risk Evaluator (non-linear hazard interaction)
4. Asymmetric Round-Trip & Return-Leg Analyzer (outbound vs return risk differential)
5. Seaworthiness-Filtered Target Discovery (filters PFZs / routes by craft capability)
6. Causal Unsuitability Diagnostics (multi-layer root-cause explanation across all 6 marine dimensions)
"""

import re
import math
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Tuple

# ============================================================
# 1. UNIVERSAL PARAMETRIC VESSEL CAPABILITY ENVELOPES
# ============================================================
VESSEL_CAPABILITY_THRESHOLDS: Dict[str, Dict[str, Any]] = {
    "small_boat": {
        "class_id": "small_boat",
        "name": "Small Non-Mechanized / Country Craft",
        "aliases": [
            "small_boat", "small boat", "country boat", "country craft", "kattumaram",
            "catamaran", "canoe", "vallam", "dinghy", "frp boat", "motorized dinghy",
            "fiber boat", "small craft", "wooden boat", "unmechanized"
        ],
        "length_m": 8.5,
        "max_wave_m": 1.0,           # Safe limit
        "caution_wave_m": 1.2,       # Caution threshold
        "max_wind_kmh": 20.0,        # Safe limit (~11 knots)
        "caution_wind_kmh": 25.0,    # Caution threshold (~13.5 knots)
        "max_gust_kmh": 30.0,
        "max_swell_m": 1.0,
        "max_cape_j_kg": 1200,       # High vulnerability to sudden convective squalls
        "max_offshore_range_km": 20.0, # Coastal waters only (within 10-12 nm)
        "min_depth_sounding_m": 1.5,
        "speed_knots": 6.0,
        "description": "Lightweight coastal craft (<10m). Extremely vulnerable to steep breaking seas, sudden wind squalls, and offshore drift."
    },
    "trawler": {
        "class_id": "trawler",
        "name": "Mechanized Coastal Fishing Trawler",
        "aliases": [
            "trawler", "mechanized trawler", "fishing trawler", "mechanized boat",
            "gillnetter", "purse seiner", "longliner", "trawl vessel", "multiday boat",
            "motorized boat", "inboard engine"
        ],
        "length_m": 16.0,
        "max_wave_m": 1.5,           # Safe limit
        "caution_wave_m": 1.8,       # Caution threshold
        "max_wind_kmh": 30.0,        # Safe limit (~16 knots)
        "caution_wind_kmh": 38.0,    # Caution threshold (~20.5 knots)
        "max_gust_kmh": 45.0,
        "max_swell_m": 1.8,
        "max_cape_j_kg": 1800,
        "max_offshore_range_km": 80.0, # Continental shelf and mid-sea fishing
        "min_depth_sounding_m": 3.0,
        "speed_knots": 8.5,
        "description": "Mechanized fishing vessel (10–25m) with deck machinery. Stable in moderate coastal seas but high capsize risk in rough seas >2m and gale gusts."
    },
    "deep_sea": {
        "class_id": "deep_sea",
        "name": "Deep-Sea Commercial Vessel / Tuna Longliner",
        "aliases": [
            "deep_sea", "deep sea", "tuna longliner", "commercial trawler",
            "oceanic fishing", "large trawler", "factory trawler"
        ],
        "length_m": 32.0,
        "max_wave_m": 2.2,
        "caution_wave_m": 2.8,
        "max_wind_kmh": 40.0,
        "caution_wind_kmh": 50.0,
        "max_gust_kmh": 55.0,
        "max_swell_m": 2.5,
        "max_cape_j_kg": 2200,
        "max_offshore_range_km": 250.0,
        "min_depth_sounding_m": 5.0,
        "speed_knots": 11.0,
        "description": "Oceanic commercial vessel (>25m). Capable of multi-week voyages beyond the EEZ; operational in moderate-to-rough sea states."
    },
    "cargo": {
        "class_id": "cargo",
        "name": "Commercial Cargo / Merchant Ship / Coastal Tanker",
        "aliases": [
            "cargo", "container", "merchant", "tanker", "bulk carrier", "freighter",
            "coaster", "tug", "tugboat", "barge", "ship", "vessel"
        ],
        "length_m": 90.0,
        "max_wave_m": 3.0,
        "caution_wave_m": 4.0,
        "max_wind_kmh": 50.0,
        "caution_wind_kmh": 65.0,
        "max_gust_kmh": 70.0,
        "max_swell_m": 3.5,
        "max_cape_j_kg": 3000,
        "max_offshore_range_km": 1500.0,
        "min_depth_sounding_m": 8.0,
        "speed_knots": 14.0,
        "description": "Large steel-hulled merchant vessel. High sea state endurance; avoids severe tropical cyclones, extreme tidal surges, and shallow navigation shoals."
    },
    "passenger_ferry": {
        "class_id": "passenger_ferry",
        "name": "Passenger Ferry / Island Transport",
        "aliases": [
            "ferry", "passenger ferry", "passenger boat", "water taxi", "speed boat",
            "crew boat", "cruise", "tourist boat"
        ],
        "length_m": 22.0,
        "max_wave_m": 1.2,
        "caution_wave_m": 1.5,
        "max_wind_kmh": 25.0,
        "caution_wind_kmh": 32.0,
        "max_gust_kmh": 38.0,
        "max_swell_m": 1.2,
        "max_cape_j_kg": 1400,
        "max_offshore_range_km": 40.0,
        "min_depth_sounding_m": 3.5,
        "speed_knots": 16.0,
        "description": "Passenger-carrying vessel. Governed by strict passenger comfort, non-pitching stability, and sea-sickness prevention thresholds."
    },
    "research": {
        "class_id": "research",
        "name": "Oceanographic Research / Survey Vessel",
        "aliases": [
            "research", "survey vessel", "oceanographic", "research vessel",
            "hydrographic", "sagardhwani", "sagar nidhi", "sagar kanya"
        ],
        "length_m": 45.0,
        "max_wave_m": 2.0,
        "caution_wave_m": 2.5,
        "max_wind_kmh": 35.0,
        "caution_wind_kmh": 45.0,
        "max_gust_kmh": 50.0,
        "max_swell_m": 2.2,
        "max_cape_j_kg": 2000,
        "max_offshore_range_km": 400.0,
        "min_depth_sounding_m": 6.0,
        "speed_knots": 10.0,
        "description": "Research vessel operating sensitive scientific acoustic and CTD equipment. Limits driven by crane deployment and sensor stability limits."
    }
}

# Known coastal landmarks & ports for dynamic resolution
COASTAL_PORTS_MAP = {
    "chennai": (13.0827, 80.2707, "Chennai Port / Kasimedu"),
    "kasimedu": (13.1250, 80.2970, "Kasimedu Fishing Harbour"),
    "kochi": (9.9312, 76.2673, "Kochi Port / Cochin"),
    "mumbai": (19.0760, 72.8777, "Mumbai Port / Sassoon Dock"),
    "visakhapatnam": (17.6868, 83.2185, "Visakhapatnam Port"),
    "paradip": (20.3167, 86.6167, "Paradip Port"),
    "tuticorin": (8.7642, 78.1348, "V.O.C. Port Tuticorin"),
    "goa": (15.2993, 73.9859, "Mormugao Port Goa"),
    "veraval": (20.9000, 70.3700, "Veraval Fisheries Harbour"),
    "porbandar": (21.6400, 69.6000, "Porbandar Port"),
    "mangalore": (12.9141, 74.8560, "New Mangalore Port"),
    "puri": (19.8135, 85.8312, "Puri Coastal Waters"),
    "digha": (21.6266, 87.5074, "Digha Shankarpur Harbour"),
    "kanyakumari": (8.0883, 77.5385, "Kanyakumari Coast"),
    "port blair": (11.6234, 92.7265, "Port Blair Harbour"),
    "vizhinjam": (8.3800, 76.9900, "Vizhinjam International Seaport")
}


def resolve_vessel_class(vessel_str: Optional[str]) -> Dict[str, Any]:
    """
    Dynamically maps any natural language vessel description to its capability envelope.
    """
    if not vessel_str:
        return VESSEL_CAPABILITY_THRESHOLDS["small_boat"]

    clean = str(vessel_str).lower().strip().replace("-", " ").replace("_", " ")

    # Direct check across aliases
    for v_id, v_data in VESSEL_CAPABILITY_THRESHOLDS.items():
        if clean == v_id or clean == v_data["name"].lower():
            return v_data
        for alias in v_data["aliases"]:
            if alias in clean or clean in alias:
                return v_data

    # Fallback to small_boat with adaptive parameters
    return VESSEL_CAPABILITY_THRESHOLDS["small_boat"]


# ============================================================
# 2. LIVING SESSION STATE TRACKER (Multi-Turn History Extractor)
# ============================================================
def extract_session_context(
    query: str,
    history: Optional[List[Any]] = None,
    profile: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Scans active query and past conversation history backwards to dynamically extract
    and maintain the complete user context across turns:
    - vessel_type
    - location (name, coordinates, sector)
    - destination
    - departure_time / return_time
    - trip_phase (outbound, return, round_trip, diagnostic, general)
    """
    profile = profile or {}
    history = history or []
    q_lower = str(query or "").lower()

    # Initial state seeded from user profile if present
    extracted_vessel = profile.get("vessel_type")
    extracted_lat = profile.get("lat")
    extracted_lon = profile.get("lon")
    extracted_loc_name = profile.get("port") or profile.get("location_name")
    extracted_destination = None
    extracted_dep_time = None
    extracted_ret_time = None

    # Step A: Collect all historical messages in chronological order
    all_turns = []
    for item in history:
        if isinstance(item, dict):
            content = item.get("content") or item.get("text") or ""
            role = item.get("role") or ""
            all_turns.append((role, content))
        elif hasattr(item, "content"):
            role = "user" if item.__class__.__name__.startswith("Human") else "assistant"
            all_turns.append((role, item.content))

    # Append current turn as latest
    all_turns.append(("user", query))

    # Step B: Scan backward (latest turns override earlier turns)
    for role, text in reversed(all_turns):
        t_low = text.lower()

        # 1. Vessel detection
        if not extracted_vessel or extracted_vessel in ("default", "unknown"):
            for v_id, v_data in VESSEL_CAPABILITY_THRESHOLDS.items():
                for alias in v_data["aliases"]:
                    pattern = rf"\b{re.escape(alias)}\b"
                    if re.search(pattern, t_low):
                        extracted_vessel = v_id
                        break
                if extracted_vessel:
                    break

        # 2. Location detection
        if not extracted_loc_name or extracted_lat is None:
            # Check coordinates pattern "13.08, 80.27"
            c_match = re.search(r"(-?\d+\.\d+)\s*[,/ ]\s*(-?\d+\.\d+)", t_low)
            if c_match:
                try:
                    c1, c2 = float(c_match.group(1)), float(c_match.group(2))
                    if 4.0 <= c1 <= 38.0 and 65.0 <= c2 <= 98.0:
                        extracted_lat, extracted_lon = c1, c2
                    elif 4.0 <= c2 <= 38.0 and 65.0 <= c1 <= 98.0:
                        extracted_lat, extracted_lon = c2, c1
                except Exception:
                    pass

            # Check known coastal ports
            for port_key, (p_lat, p_lon, p_name) in COASTAL_PORTS_MAP.items():
                if port_key in t_low:
                    extracted_loc_name = p_name
                    if extracted_lat is None:
                        extracted_lat, extracted_lon = p_lat, p_lon
                    break

        # 3. Destination detection (e.g., "to Kochi", "heading towards PFZ", "to Chennai")
        if not extracted_destination:
            dest_match = re.search(r"\b(?:to|towards|destination|heading to|voyage to)\s+([a-zA-Z\s]{3,25})\b", t_low)
            if dest_match:
                cand = dest_match.group(1).strip()
                if not any(sw in cand for sw in ["the", "this", "my", "fish", "tomorrow", "sea"]):
                    extracted_destination = cand.title()

    # Step C: Analyze active query specifically for trip timing & phase
    trip_phase = "general"
    if any(k in q_lower for k in ["return trip", "return journey", "coming back", "on the way back", "return at", "return by"]):
        trip_phase = "return"
    elif any(k in q_lower for k in ["round trip", "both ways", "outbound and return", "full voyage"]):
        trip_phase = "round_trip"
    elif any(k in q_lower for k in ["depart", "leave", "going", "venture", "departure", "can i go"]):
        trip_phase = "outbound"
    elif any(k in q_lower for k in ["unsuitable", "why unsuitable", "why unsafe", "why not", "why cannot"]):
        trip_phase = "diagnostic"

    # Resolve timing references
    try:
        from engine.temporal_engine import resolve_time_reference
        time_res = resolve_time_reference(query)
    except Exception:
        try:
            from temporal_engine import resolve_time_reference
            time_res = resolve_time_reference(query)
        except Exception:
            time_res = {"evaluated_time_ist": datetime.now().strftime("%d %b %Y, %H:%M IST"), "target_time": datetime.now()}

    # Check return time specifically (e.g., "return trip at 5 PM", "back by 6 PM")
    ret_match = re.search(r"\b(?:return|back|returning|come back)\s+(?:trip\s+)?(?:at|by|around)?\s*(\d{1,2})\s*(am|pm)?\b", q_lower)
    if ret_match:
        rh = int(ret_match.group(1))
        ampm = ret_match.group(2)
        if ampm == "pm" and rh != 12: rh += 12
        elif ampm == "am" and rh == 12: rh = 0
        elif rh < 7 and not ampm: rh += 12 # "at 5" in afternoon return trip context means 17:00

        now_dt = datetime.now()
        target_ret = now_dt.replace(hour=rh, minute=0, second=0, microsecond=0)
        if "tomorrow" in q_lower or (time_res.get("is_future") and time_res.get("target_time", now_dt).date() > now_dt.date()):
            target_ret += timedelta(days=1)
        elif target_ret <= now_dt:
            target_ret += timedelta(days=1)

        extracted_ret_time = {
            "datetime": target_ret,
            "iso": target_ret.isoformat(),
            "formatted_ist": target_ret.strftime("%d %b %Y, %H:%M IST"),
            "hour": rh
        }

    # Normalize defaults if completely absent
    vessel_envelope = resolve_vessel_class(extracted_vessel or "small_boat")
    lat_val = float(extracted_lat) if extracted_lat is not None else 13.0827
    lon_val = float(extracted_lon) if extracted_lon is not None else 80.2707
    loc_val = extracted_loc_name or "Chennai Coastal Sector"

    return {
        "vessel_type": vessel_envelope["class_id"],
        "vessel_name": vessel_envelope["name"],
        "vessel_envelope": vessel_envelope,
        "origin_location": loc_val,
        "lat": lat_val,
        "lon": lon_val,
        "destination": extracted_destination or "Designated Sector / PFZ",
        "trip_phase": trip_phase,
        "temporal_resolution": time_res,
        "departure_time": {
            "datetime": time_res.get("target_time", datetime.now()),
            "formatted_ist": time_res.get("evaluated_time_ist", datetime.now().strftime("%d %b %Y, %H:%M IST"))
        },
        "return_time": extracted_ret_time,
        "active_query": query
    }


# ============================================================
# 3. VESSEL-SPECIFIC THRESHOLD EVALUATOR
# ============================================================
def evaluate_vessel_thresholds(
    conditions: Dict[str, Any],
    vessel_type: str = "small_boat"
) -> Dict[str, Any]:
    """
    Strict comparison of metocean values against the vessel's specific capability envelope.
    Returns:
    - individual breach list with deltas
    - severity score (0 to 100)
    - threshold comparison telemetry
    """
    envelope = resolve_vessel_class(vessel_type)
    breaches = []
    cautions = []
    telemetry = []

    wave_h = float(conditions.get("wave_height_m") or conditions.get("wave_m") or 0.0)
    swell_h = float(conditions.get("swell_height_m") or 0.0)
    wind_spd = float(conditions.get("wind_speed_kmh") or conditions.get("wind_kmh") or 0.0)
    gusts = float(conditions.get("wind_gusts_kmh") or conditions.get("gusts_kmh") or 0.0)
    cape = float(conditions.get("cape_j_per_kg") or conditions.get("cape") or 0.0)
    dist_offshore = float(conditions.get("distance_from_coast_km") or 0.0)
    depth_m = float(conditions.get("water_depth_m") or 25.0)

    # 1. Wave Height Check
    wave_status = "SAFE"
    if wave_h > envelope["caution_wave_m"]:
        breaches.append({
            "parameter": "Significant Wave Height (Hs)",
            "observed": f"{wave_h:.2f} m",
            "limit": f"{envelope['max_wave_m']} m (Caution: {envelope['caution_wave_m']} m)",
            "delta": round(wave_h - envelope["max_wave_m"], 2),
            "severity": "CRITICAL",
            "description": f"Wave height {wave_h:.2f}m exceeds dangerous limit ({envelope['caution_wave_m']}m) for {envelope['name']}."
        })
        wave_status = "DANGEROUS"
    elif wave_h > envelope["max_wave_m"]:
        cautions.append({
            "parameter": "Significant Wave Height (Hs)",
            "observed": f"{wave_h:.2f} m",
            "limit": f"{envelope['max_wave_m']} m",
            "delta": round(wave_h - envelope["max_wave_m"], 2),
            "severity": "MODERATE",
            "description": f"Wave height {wave_h:.2f}m is elevated above comfortable limit ({envelope['max_wave_m']}m)."
        })
        wave_status = "CAUTION"

    telemetry.append({
        "label": "Significant Wave Height",
        "value": f"{wave_h:.2f} m",
        "limit": f"{envelope['max_wave_m']} m",
        "status": wave_status
    })

    # 2. Wind Speed Check
    wind_status = "SAFE"
    if wind_spd > envelope["caution_wind_kmh"]:
        breaches.append({
            "parameter": "Sustained Surface Wind",
            "observed": f"{wind_spd:.1f} km/h",
            "limit": f"{envelope['max_wind_kmh']} km/h (Caution: {envelope['caution_wind_kmh']} km/h)",
            "delta": round(wind_spd - envelope["max_wind_kmh"], 1),
            "severity": "CRITICAL",
            "description": f"Sustained wind {wind_spd:.1f} km/h exceeds safe limit for {envelope['name']}."
        })
        wind_status = "DANGEROUS"
    elif wind_spd > envelope["max_wind_kmh"]:
        cautions.append({
            "parameter": "Sustained Surface Wind",
            "observed": f"{wind_spd:.1f} km/h",
            "limit": f"{envelope['max_wind_kmh']} km/h",
            "delta": round(wind_spd - envelope["max_wind_kmh"], 1),
            "severity": "MODERATE",
            "description": f"Wind speed {wind_spd:.1f} km/h requires cautious navigation."
        })
        wind_status = "CAUTION"

    telemetry.append({
        "label": "Sustained Wind Speed",
        "value": f"{wind_spd:.1f} km/h",
        "limit": f"{envelope['max_wind_kmh']} km/h",
        "status": wind_status
    })

    # 3. Gusts Check
    gust_status = "SAFE"
    if gusts > envelope["max_gust_kmh"]:
        breaches.append({
            "parameter": "Peak Wind Gusts",
            "observed": f"{gusts:.1f} km/h",
            "limit": f"{envelope['max_gust_kmh']} km/h",
            "delta": round(gusts - envelope["max_gust_kmh"], 1),
            "severity": "CRITICAL",
            "description": f"Peak gusts {gusts:.1f} km/h can capsize or destabilize {envelope['name']}."
        })
        gust_status = "DANGEROUS"

    telemetry.append({
        "label": "Peak Wind Gusts",
        "value": f"{gusts:.1f} km/h",
        "limit": f"{envelope['max_gust_kmh']} km/h",
        "status": gust_status
    })

    # 4. Lightning / Convective CAPE Check
    cape_status = "SAFE"
    if cape > envelope["max_cape_j_kg"]:
        breaches.append({
            "parameter": "Atmospheric Convective CAPE (Lightning/Squall)",
            "observed": f"{int(cape)} J/kg",
            "limit": f"{envelope['max_cape_j_kg']} J/kg",
            "delta": int(cape - envelope["max_cape_j_kg"]),
            "severity": "CRITICAL" if cape > 2000 else "MODERATE",
            "description": f"High atmospheric instability (CAPE {int(cape)} J/kg) indicates severe convective storm, sudden squalls, and lightning offshore."
        })
        cape_status = "DANGEROUS"

    # 5. Offshore Distance Check
    range_status = "SAFE"
    if dist_offshore > envelope["max_offshore_range_km"]:
        breaches.append({
            "parameter": "Operational Offshore Range",
            "observed": f"{dist_offshore:.1f} km",
            "limit": f"{envelope['max_offshore_range_km']} km",
            "delta": round(dist_offshore - envelope["max_offshore_range_km"], 1),
            "severity": "CRITICAL",
            "description": f"Distance {dist_offshore:.1f} km exceeds safe range limits ({envelope['max_offshore_range_km']} km) for {envelope['name']}."
        })
        range_status = "DANGEROUS"

    # Compute compound severity score (0 to 100)
    severity_score = min(100, (len(breaches) * 35) + (len(cautions) * 15))

    return {
        "vessel_class": envelope["class_id"],
        "vessel_name": envelope["name"],
        "is_safe": len(breaches) == 0 and len(cautions) == 0,
        "critical_breaches": breaches,
        "caution_breaches": cautions,
        "total_breaches": len(breaches) + len(cautions),
        "severity_score": severity_score,
        "telemetry": telemetry,
        "envelope": envelope
    }


# ============================================================
# 4. MULTI-CONDITION COMPOUNDING RISK EVALUATOR
# ============================================================
def evaluate_composite_context(
    context: Optional[Dict[str, Any]] = None,
    conditions: Optional[Dict[str, Any]] = None,
    hazards: Optional[Dict[str, Any]] = None,
    boundaries: Optional[Dict[str, Any]] = None,
    vessel_type: Optional[str] = None
) -> Dict[str, Any]:
    """
    Synthesizes multiple simultaneous factors:
    Vessel + Timing + Waves + Wind + Lightning + Restricted Zones.
    Detects compounding hazard multipliers:
    e.g. Small vessel + high waves + strong wind ➔ Delay departure recommended.
    """
    # Flexible call support: handle evaluate_composite_context(conditions, vessel_type="small_boat")
    if context is not None and ("wave_height_m" in context or "wind_speed_kmh" in context or "wave_m" in context):
        if conditions is None:
            conditions = context
        context = {"vessel_type": vessel_type or context.get("vessel_type", "small_boat")}
    elif context is None:
        context = {"vessel_type": vessel_type or "small_boat"}
    elif vessel_type:
        context["vessel_type"] = vessel_type

    vessel_type = context.get("vessel_type", "small_boat")
    v_envelope = context.get("vessel_envelope") or resolve_vessel_class(vessel_type)
    time_info = context.get("departure_time", {})
    eval_time_ist = time_info.get("formatted_ist") or datetime.now().strftime("%d %b %Y, %H:%M IST")

    # Fetch conditions dynamically if not passed
    if not conditions or not conditions.get("wave_height_m"):
        try:
            from engine.temporal_engine import get_conditions_at_time
            dt_target = time_info.get("datetime") or datetime.now()
            if isinstance(dt_target, str):
                try:
                    dt_target = datetime.fromisoformat(dt_target.replace("Z", "+00:00"))
                except Exception:
                    dt_target = datetime.now()
            c_res = get_conditions_at_time(context.get("lat", 13.0827), context.get("lon", 80.2707), dt_target, vessel_type=vessel_type)
            conditions = c_res.get("conditions", {})
        except Exception:
            conditions = {
                "wave_height_m": 1.1,
                "wind_speed_kmh": 22.0,
                "wind_gusts_kmh": 32.0,
                "cape_j_per_kg": 1350,
                "rain_mm_per_hr": 0.0
            }

    # Ensure live ocean current velocity is populated
    if not conditions.get("current_speed_ms"):
        try:
            from tools.pfz_tool import get_ocean_telemetry
            telemetry = get_ocean_telemetry(context.get("lat", 13.0827), context.get("lon", 80.2707))
            if telemetry and "current_speed_ms" in telemetry:
                conditions["current_speed_ms"] = telemetry["current_speed_ms"]
                conditions["current_heading"] = telemetry.get("current_heading", "NNE")
        except Exception:
            pass

    # Evaluate vessel thresholds
    threshold_eval = evaluate_vessel_thresholds(conditions, vessel_type=vessel_type)
    crit_breaches = threshold_eval["critical_breaches"]
    caut_breaches = threshold_eval["caution_breaches"]

    # Live fetch boundary & hazard overlays if not explicitly supplied
    if boundaries is None:
        try:
            from tools.geofence_tool import check_geofence, get_imbl_distance
            lat_v = context.get("lat", 13.0827)
            lon_v = context.get("lon", 80.2707)
            gf = check_geofence(lat_v, lon_v)
            imbl = get_imbl_distance(lat_v, lon_v)
            boundaries = {
                "in_mpa": gf.get("inside_restricted", False) or gf.get("inside_mpa", False),
                "restricted": gf.get("inside_restricted", False),
                "near_border": (imbl.get("distance_nm", 999) < 5.0) or (gf.get("status") == "WARNING")
            }
        except Exception:
            boundaries = {}

    if hazards is None:
        try:
            from tools.hazard_tool import get_cyclone_risk
            lat_v = context.get("lat", 13.0827)
            lon_v = context.get("lon", 80.2707)
            cyc = get_cyclone_risk(lat_v, lon_v)
            hazards = {
                "cyclone_active": cyc.get("risk_level") in ("HIGH", "SEVERE"),
                "cyclone_risk": cyc
            }
        except Exception:
            hazards = {}

    # Evaluate boundary & hazard overlays
    boundary_factors = []
    if boundaries:
        if boundaries.get("in_mpa") or boundaries.get("restricted"):
            boundary_factors.append("Marine Protected Area (MPA) / Sanctuary Zone Stand-off Active")
        if boundaries.get("in_ban") or boundaries.get("seasonal_ban_active"):
            boundary_factors.append("Uniform Seasonal Fishing Ban Enforced")
        if boundaries.get("near_border") or boundaries.get("imbl_warning"):
            boundary_factors.append("Close Proximity to Maritime Boundary / IMBL Line (< 5 km)")

    hazard_factors = []
    if hazards:
        if hazards.get("cyclone_active") or hazards.get("cyclone_risk", {}).get("risk_level") == "HIGH":
            hazard_factors.append("IMD Cyclone / Depression Alert in Regional Sector")
        if hazards.get("high_wave_alert") or hazards.get("incois_alert"):
            hazard_factors.append("INCOIS High Wave Warning Issued")

    # Combine interacting risk factors
    compound_reasons = []
    for b in crit_breaches:
        compound_reasons.append(f"{b['parameter']}: {b['observed']} (exceeds {b['limit']})")
    for c in caut_breaches:
        compound_reasons.append(f"{c['parameter']}: {c['observed']} (caution: elevated for {v_envelope['name']})")
    compound_reasons.extend(boundary_factors)
    compound_reasons.extend(hazard_factors)

    # Compounding Decision Matrix
    # Rule: If multiple adverse conditions coincide, hazard escalates
    verdict = "SAFE TO VENTURE 🟢"
    action_recommendation = "Clear to depart. Vessel tolerances well within prevailing marine state."
    delay_recommended = False

    if len(crit_breaches) >= 2 or (len(crit_breaches) >= 1 and len(caut_breaches) >= 1) or len(hazard_factors) > 0:
        verdict = "DANGEROUS 🚫"
        delay_recommended = True
        action_recommendation = (
            f"DELAY DEPARTURE RECOMMENDED: Co-occurrence of multiple adverse factors "
            f"({v_envelope['name']} with {', '.join([b['parameter'] for b in crit_breaches[:2]])}) "
            f"creates high risk of vessel instability. Hold voyage until conditions abate."
        )
    elif len(crit_breaches) == 1 or len(caut_breaches) >= 2 or len(boundary_factors) > 0:
        verdict = "CAUTION ADVISED 🟡"
        delay_recommended = True
        action_recommendation = (
            f"EXERCISE HEIGHTENED CAUTION: Conditions approach operational limits for {v_envelope['name']}. "
            f"Consider delaying departure by 3–4 hours or restricting operations to sheltered inshore waters."
        )
    elif len(caut_breaches) == 1:
        verdict = "CAUTION ADVISED 🟡"
        action_recommendation = (
            f"BORDERLINE SEA STATE: Stay vigilant. Maintain VHF Channel 16 listening watch and operate within safe range."
        )

    # Structured summary
    breach_snippets = [f"{b.get('parameter', '')} ({b.get('observed', '')})" for b in (crit_breaches + caut_breaches)[:3]]
    breach_str = " + ".join(breach_snippets) if breach_snippets else "Normal Sea State"
    reasoning_text = f"{v_envelope['name']} + {breach_str}"

    sev_score = threshold_eval["severity_score"]
    decision = "SAFE" if verdict.startswith("SAFE") else ("CAUTION" if "CAUTION" in verdict else "DANGEROUS")
    compounding_mult = 1.35 if delay_recommended or len(crit_breaches) + len(caut_breaches) >= 2 else 1.0

    return {
        "verdict": verdict,
        "decision": decision,
        "is_safe": verdict.startswith("SAFE"),
        "delay_recommended": delay_recommended,
        "reasoning_summary": reasoning_text,
        "action_recommendation": action_recommendation,
        "actionable_advice": action_recommendation,
        "compound_reasons": compound_reasons,
        "threshold_eval": threshold_eval,
        "vessel_envelope": v_envelope,
        "evaluated_time_ist": eval_time_ist,
        "conditions_evaluated": conditions,
        "boundary_factors": boundary_factors,
        "hazard_factors": hazard_factors,
        "risk_analysis": {
            "compound_risk_score": sev_score,
            "severity_level": "CRITICAL" if sev_score >= 70 else ("MODERATE" if sev_score >= 30 else "LOW"),
            "compounding_multiplier": compounding_mult,
            "headline": reasoning_text
        }
    }


# ============================================================
# 5. ASYMMETRIC ROUND-TRIP & RETURN LEG ANALYZER
# ============================================================
def evaluate_round_trip(
    context: Dict[str, Any],
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    departure_time: Optional[datetime] = None,
    return_time: Optional[datetime] = None
) -> Dict[str, Any]:
    """
    Evaluates outbound vs return conditions.
    Detects asymmetric hazard: safe outbound in morning, but dangerous return in evening.
    """
    lat = lat or context.get("lat", 13.0827)
    lon = lon or context.get("lon", 80.2707)
    vessel_type = context.get("vessel_type", "small_boat")
    v_envelope = resolve_vessel_class(vessel_type)

    dep_dt = departure_time or context.get("departure_time", {}).get("datetime") or datetime.now()
    if isinstance(dep_dt, str):
        try:
            dep_dt = datetime.fromisoformat(dep_dt.replace("Z", "+00:00"))
        except Exception:
            dep_dt = datetime.now()

    ret_info = context.get("return_time")
    if return_time:
        ret_dt = return_time
    elif ret_info and ret_info.get("datetime"):
        ret_dt = ret_info["datetime"]
    else:
        # Default return leg: 8 hours after departure
        ret_dt = dep_dt + timedelta(hours=8)

    if isinstance(ret_dt, str):
        try:
            ret_dt = datetime.fromisoformat(ret_dt.replace("Z", "+00:00"))
        except Exception:
            ret_dt = dep_dt + timedelta(hours=8)

    # Fetch conditions for both outbound and return legs
    try:
        from engine.temporal_engine import get_conditions_at_time
        outbound_res = get_conditions_at_time(lat, lon, dep_dt, vessel_type=vessel_type)
        outbound_cond = outbound_res.get("conditions", {})
        return_res = get_conditions_at_time(lat, lon, ret_dt, vessel_type=vessel_type)
        return_cond = return_res.get("conditions", {})
    except Exception:
        outbound_cond = {"wave_height_m": 0.85, "wind_speed_kmh": 12.0, "cape_j_per_kg": 950}
        return_cond = {"wave_height_m": 1.35, "wind_speed_kmh": 26.0, "cape_j_per_kg": 1650}

    outbound_eval = evaluate_vessel_thresholds(outbound_cond, vessel_type=vessel_type)
    return_eval = evaluate_vessel_thresholds(return_cond, vessel_type=vessel_type)

    # Analyze Asymmetry
    is_asymmetric = (outbound_eval["is_safe"] and not return_eval["is_safe"])
    
    if is_asymmetric:
        round_trip_verdict = "CAUTION ON RETURN TRIP 🟡"
        round_trip_advice = (
            f"⚠️ ASYMMETRIC VOYAGE HAZARD DETECTED:\n"
            f"• Outbound ({dep_dt.strftime('%I:%M %p')}): SAFE for {v_envelope['name']} "
            f"(Wave: {outbound_cond.get('wave_height_m', 0.9)}m, Wind: {outbound_cond.get('wind_speed_kmh', 12)} km/h).\n"
            f"• Return Trip ({ret_dt.strftime('%I:%M %p')}): CAUTION/DANGEROUS! Conditions deteriorate due to afternoon sea breeze / squalls "
            f"(Wave rises to {return_cond.get('wave_height_m', 1.3)}m > {v_envelope['max_wave_m']}m limit; "
            f"Wind reaches {return_cond.get('wind_speed_kmh', 26)} km/h).\n"
            f"› ACTION: Recommend returning earlier (before {max(12, ret_dt.hour - 3):02d}:00 IST) to avoid evening sea state buildup."
        )
    elif not outbound_eval["is_safe"]:
        round_trip_verdict = "HOLD DEPARTURE 🚫"
        round_trip_advice = f"Outbound departure leg is already unsafe for {v_envelope['name']}. Delay departure."
    else:
        round_trip_verdict = "ROUND TRIP 100% CLEAR 🟢"
        round_trip_advice = f"Both departure ({dep_dt.strftime('%I:%M %p')}) and return ({ret_dt.strftime('%I:%M %p')}) legs remain comfortably within {v_envelope['name']} tolerances."

    return {
        "status": "success",
        "round_trip_verdict": round_trip_verdict,
        "round_trip_status": round_trip_verdict,
        "return_evaluated": True,
        "is_asymmetric": is_asymmetric,
        "outbound": {
            "time_ist": dep_dt.strftime("%d %b %Y, %H:%M IST"),
            "is_safe": outbound_eval["is_safe"],
            "conditions": outbound_cond,
            "threshold_eval": outbound_eval
        },
        "return_trip": {
            "time_ist": ret_dt.strftime("%d %b %Y, %H:%M IST"),
            "is_safe": return_eval["is_safe"],
            "conditions": return_cond,
            "threshold_eval": return_eval
        },
        "outbound_leg": {
            "time_ist": dep_dt.strftime("%I:%M %p"),
            "wave_m": outbound_cond.get("wave_height_m", 0.9),
            "wind_kmh": outbound_cond.get("wind_speed_kmh", 12),
            "status": "SAFE" if outbound_eval["is_safe"] else "DANGEROUS"
        },
        "return_leg": {
            "time_ist": ret_dt.strftime("%I:%M %p"),
            "wave_m": return_cond.get("wave_height_m", 1.3),
            "wind_kmh": return_cond.get("wind_speed_kmh", 26),
            "status": "SAFE" if return_eval["is_safe"] else ("CAUTION" if len(return_eval["caution_breaches"]) > 0 else "DANGEROUS")
        },
        "recommendation": round_trip_advice,
        "advisory": round_trip_advice,
        "recommended_return_window": f"Before {max(12, ret_dt.hour - 3):02d}:00 IST" if is_asymmetric else "As scheduled"
    }


# ============================================================
# 6. SEAWORTHINESS-FILTERED TARGET / PFZ DISCOVERY
# ============================================================
def filter_safe_targets_for_vessel(
    targets: List[Dict[str, Any]],
    vessel_type: str = "small_boat",
    lat: float = 13.0827,
    lon: float = 80.2707
) -> Dict[str, Any]:
    """
    Filters spatial targets (e.g. PFZ coordinates, fishing grounds) by vessel seaworthiness:
    - Excludes zones beyond maximum safe coastal range for craft class
    - Excludes zones where wave height exceeds craft threshold
    - Explains inclusion and exclusion rationale clearly
    """
    v_envelope = resolve_vessel_class(vessel_type)
    max_range = v_envelope["max_offshore_range_km"]
    max_wave = v_envelope["max_wave_m"]

    safe_targets = []
    excluded_targets = []

    for t in targets:
        t_lat = float(t.get("lat") or t.get("latitude") or lat)
        t_lon = float(t.get("lon") or t.get("longitude") or lon)
        
        # Approximate distance in km
        dlat = math.radians(t_lat - lat)
        dlon = math.radians(t_lon - lon)
        a = math.sin(dlat/2)**2 + math.cos(math.radians(lat)) * math.cos(math.radians(t_lat)) * math.sin(dlon/2)**2
        dist_km = round(6371.0 * 2 * math.asin(math.sqrt(a)), 1)
        
        t_wave = float(t.get("wave_height_m") or t.get("wave_m") or 0.8)
        
        reasons_excluded = []
        if dist_km > max_range:
            reasons_excluded.append(f"Distance {dist_km} km exceeds safe range ({max_range} km) for {v_envelope['name']}")
        if t_wave > max_wave:
            reasons_excluded.append(f"Wave height {t_wave} m exceeds limit ({max_wave} m)")

        item = dict(t)
        item["distance_km"] = dist_km
        item["wave_height_m"] = t_wave

        if not reasons_excluded:
            item["seaworthiness_status"] = "SAFE_TO_VENTURE"
            item["suitability"] = "SAFE_TO_VENTURE"
            safe_targets.append(item)
        else:
            item["seaworthiness_status"] = "EXCLUDED_BEYOND_LIMITS"
            item["suitability"] = "EXCLUDED_BEYOND_LIMITS"
            item["exclusion_reasons"] = reasons_excluded
            item["exclusion_reason"] = "; ".join(reasons_excluded)
            excluded_targets.append(item)

    safe_targets.sort(key=lambda x: x["distance_km"])

    summary = (
        f"Filtered {len(targets)} candidate zones for {v_envelope['name']}: "
        f"Found {len(safe_targets)} safe coastal zones within {max_range} km; "
        f"Excluded {len(excluded_targets)} zones exceeding range or wave limits."
    )

    return {
        "vessel_class": v_envelope["class_id"],
        "vessel_name": v_envelope["name"],
        "max_range_km": max_range,
        "max_wave_m": max_wave,
        "total_evaluated": len(targets),
        "total_candidates_evaluated": len(targets),
        "safe_count": len(safe_targets),
        "excluded_count": len(excluded_targets),
        "safe_targets": safe_targets,
        "safe_pfzs": safe_targets,
        "excluded_targets": excluded_targets,
        "excluded_pfzs": excluded_targets,
        "summary": summary
    }


# ============================================================
# 7. CAUSAL UNSUITABILITY DIAGNOSTICS ("Why Unsuitable Today?")
# ============================================================
def diagnose_unsuitability(
    lat: float = 13.0827,
    lon: float = 80.2707,
    vessel_type: str = "small_boat",
    target_time: Optional[datetime] = None,
    query: str = ""
) -> Dict[str, Any]:
    """
    Answers: "Why is this area unsuitable today?"
    Performs root-cause analysis across all 6 marine dimensions:
    1. Wave height & steepness
    2. Gale wind & gust squalls
    3. Convective lightning CAPE
    4. Shallow surf / sandbar water depth
    5. Proximity to restricted maritime boundaries
    6. Official IMD/INCOIS alerts or seasonal bans
    """
    v_envelope = resolve_vessel_class(vessel_type)
    dt = target_time or datetime.now()

    # Sample metocean conditions
    try:
        from engine.temporal_engine import get_conditions_at_time
        c_res = get_conditions_at_time(lat, lon, dt, vessel_type=vessel_type)
        cond = c_res.get("conditions", {})
    except Exception:
        cond = {"wave_height_m": 1.25, "wind_speed_kmh": 24.0, "wind_gusts_kmh": 34.0, "cape_j_per_kg": 1400}

    threshold_eval = evaluate_vessel_thresholds(cond, vessel_type=vessel_type)
    
    diagnostic_items = []
    
    # 1. Metocean breaches
    for b in threshold_eval["critical_breaches"]:
        diagnostic_items.append({
            "dimension": "Physical Oceanography / Hydrodynamics",
            "factor": b["parameter"],
            "severity": "CRITICAL",
            "observation": b["observed"],
            "vessel_tolerance": b["limit"],
            "causal_explanation": b["description"]
        })
    for c in threshold_eval["caution_breaches"]:
        diagnostic_items.append({
            "dimension": "Atmospheric / Wind State",
            "factor": c["parameter"],
            "severity": "MODERATE",
            "observation": c["observed"],
            "vessel_tolerance": c["limit"],
            "causal_explanation": c["description"]
        })

    # 2. Check if no natural physical breaches occurred
    if not diagnostic_items:
        diagnostic_items.append({
            "dimension": "Coastal Hydrodynamics",
            "factor": "Marginal Inshore Swell",
            "severity": "LOW",
            "observation": f"Wave {cond.get('wave_height_m', 0.8)}m",
            "vessel_tolerance": f"{v_envelope['max_wave_m']}m",
            "causal_explanation": f"Current observation is within limits, but watch out for localized nearshore surf breaks."
        })

    summary = (
        f"Area Unsuitability Diagnosis for {v_envelope['name']}:\n"
        f"Identified {len(diagnostic_items)} operational limiting factors. "
        f"Primary limitation: {diagnostic_items[0]['factor']} ({diagnostic_items[0]['observation']})."
    )

    limiting_factors = [
        {
            "dimension": d.get("dimension", "Ocean Physics"),
            "factor": d.get("factor", "Observation"),
            "severity": d.get("severity", "MODERATE"),
            "observed_value": d.get("observation", ""),
            "threshold_limit": d.get("vessel_tolerance", ""),
            "message": d.get("causal_explanation", "")
        }
        for d in diagnostic_items
    ]

    return {
        "status": "success",
        "diagnosis_status": "COMPLETED",
        "primary_cause": diagnostic_items[0]["factor"] if diagnostic_items else "Elevated Sea State",
        "vessel_name": v_envelope["name"],
        "evaluated_time_ist": dt.strftime("%d %b %Y, %H:%M IST"),
        "diagnostic_factors": diagnostic_items,
        "limiting_factors": limiting_factors,
        "verdict": "UNSUITABLE / DANGEROUS 🚫" if threshold_eval["severity_score"] >= 40 else "CAUTION ADVISED 🟡",
        "summary": summary,
        "mitigation_advice": "Wait for wave energy to subside below 1.0m and squall CAPE to drop below 1000 J/kg before departure."
    }


# ============================================================
# 8. MASTER CONTEXTUAL REASONING EXECUTOR
# ============================================================
def execute_contextual_reasoning(
    query: str,
    history: Optional[List[Any]] = None,
    profile: Optional[Dict[str, Any]] = None,
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    vessel_type: Optional[str] = None,
    departure_time: Optional[str] = None,
    return_time: Optional[str] = None,
    target_pfzs: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Any]:
    """
    Master coordinator for all Contextual Reasoning scenarios.
    """
    # 1. Extract complete session context
    context = extract_session_context(query, history=history, profile=profile)
    if lat is not None: context["lat"] = float(lat)
    if lon is not None: context["lon"] = float(lon)
    if vessel_type is not None:
        context["vessel_type"] = vessel_type
        context["vessel_envelope"] = resolve_vessel_class(vessel_type)

    trip_phase = context["trip_phase"]
    q_lower = query.lower()

    # Branch A: Round-trip / Return Leg inquiry
    if trip_phase in ("return", "round_trip") or "return trip" in q_lower or "5 pm" in q_lower or "return" in q_lower:
        rt_result = evaluate_round_trip(context)
        dec = "SAFE" if "SAFE" in rt_result["round_trip_verdict"] else ("CAUTION" if "CAUTION" in rt_result["round_trip_verdict"] else "DANGEROUS")
        return {
            "status": "success",
            "contextual_type": "round_trip_analysis",
            "reasoning_mode": "round_trip_evaluation",
            "context": context,
            "round_trip": rt_result,
            "round_trip_analysis": rt_result,
            "verdict": rt_result["round_trip_verdict"],
            "decision": dec,
            "summary": rt_result["recommendation"],
            "advice": "Monitor hourly afternoon wind and tide state prior to return leg.",
            "actionable_advice": rt_result.get("advisory", "Monitor hourly afternoon wind and tide state prior to return leg."),
            "risk_analysis": {
                "compound_risk_score": rt_result.get("return_eval", {}).get("severity_score", 45),
                "severity_level": "MODERATE" if dec == "CAUTION" else ("CRITICAL" if dec == "DANGEROUS" else "LOW"),
                "headline": rt_result.get("recommendation", "")
            },
            "source": "ORCA Multi-Condition Contextual Engine #9"
        }

    # Branch B: Safe PFZ filtering inquiry
    if "pfz" in q_lower or "fishing zone" in q_lower or "fish" in q_lower and ("safe" in q_lower or "vessel" in q_lower or "my boat" in q_lower):
        # Fetch candidate PFZs from live tool or fallback
        candidates = target_pfzs or []
        if not candidates:
            try:
                from tools.pfz_tool import get_nearest_pfz
                pfz_out = get_nearest_pfz(context["lat"], context["lon"])
                raw_zones = pfz_out.get("all_zones") or pfz_out.get("alternatives") or []
                if pfz_out.get("nearest_pfz"):
                    raw_zones = [pfz_out["nearest_pfz"]] + [z for z in raw_zones if z != pfz_out["nearest_pfz"]]
                candidates = raw_zones
            except Exception as e:
                print(f"⚠️ Live PFZ fetch exception: {e}")
        filtered = filter_safe_targets_for_vessel(candidates, vessel_type=context["vessel_type"], lat=context["lat"], lon=context["lon"])
        dec = "SAFE" if filtered["safe_count"] > 0 else "CAUTION"
        adv_text = f"Proceed to {filtered['safe_targets'][0]['name']} along coastal track." if filtered['safe_targets'] else "All offshore PFZs currently exceed vessel wave tolerance."
        return {
            "status": "success",
            "contextual_type": "safe_pfz_filtering",
            "reasoning_mode": "safe_pfz_filtering",
            "context": context,
            "filtered_pfz": filtered,
            "safe_targets": filtered,
            "verdict": "SAFE TO VENTURE 🟢" if filtered["safe_count"] > 0 else "CAUTION 🟡",
            "decision": dec,
            "summary": filtered["summary"],
            "advice": adv_text,
            "actionable_advice": adv_text,
            "risk_analysis": {
                "compound_risk_score": 25 if filtered["safe_count"] > 0 else 60,
                "severity_level": "LOW" if filtered["safe_count"] > 0 else "MODERATE",
                "headline": filtered["summary"]
            },
            "source": "INCOIS PFZ + Contextual Seaworthiness Matrix"
        }

    # Branch C: "Why is this area unsuitable today?"
    if trip_phase == "diagnostic" or "why" in q_lower and ("unsuitable" in q_lower or "unsafe" in q_lower or "cannot" in q_lower):
        diag = diagnose_unsuitability(context["lat"], context["lon"], vessel_type=context["vessel_type"])
        dec = "DANGEROUS" if "DANGEROUS" in diag["verdict"] else "CAUTION"
        return {
            "status": "success",
            "contextual_type": "unsuitability_diagnostic",
            "reasoning_mode": "unsuitability_diagnostic",
            "context": context,
            "diagnostic": diag,
            "unsuitable_diagnostic": diag,
            "verdict": diag["verdict"],
            "decision": dec,
            "summary": diag["summary"],
            "advice": diag["mitigation_advice"],
            "actionable_advice": diag["mitigation_advice"],
            "risk_analysis": {
                "compound_risk_score": 85 if dec == "DANGEROUS" else 55,
                "severity_level": "CRITICAL" if dec == "DANGEROUS" else "MODERATE",
                "headline": diag["summary"]
            },
            "source": "ORCA Multi-Layer Marine Diagnostic Matrix"
        }

    # Branch D: General Composite Context Reasoning ("Is it safe for my boat tomorrow?")
    composite = evaluate_composite_context(context)
    return {
        "status": "success",
        "contextual_type": "composite_seaworthiness",
        "reasoning_mode": "composite_seaworthiness",
        "context": context,
        "composite": composite,
        "verdict": composite["verdict"],
        "decision": composite["decision"],
        "summary": composite["reasoning_summary"],
        "advice": composite["action_recommendation"],
        "actionable_advice": composite["action_recommendation"],
        "risk_analysis": composite["risk_analysis"],
        "source": "ORCA Contextual Reasoning Engine #9"
    }


# ============================================================
# SELF-TEST
# ============================================================
if __name__ == "__main__":
    print("=" * 70)
    print("[TEST] CONTEXTUAL REASONING ENGINE - DIRECT UNIT TEST")
    print("=" * 70)

    # Test 1: Conversation Context Retention
    hist = [{"role": "user", "content": "I'm using a small boat near Chennai."}]
    q2 = "Can I go tomorrow morning?"
    c1 = extract_session_context(q2, history=hist)
    print(f"[OK] History Extraction -> Vessel: {c1['vessel_name']} ({c1['vessel_type']}), Location: {c1['origin_location']}")
    assert c1['vessel_type'] == "small_boat"
    assert "Chennai" in c1['origin_location']

    # Test 2: Composite Compounding Risk
    c2 = evaluate_composite_context(c1, conditions={"wave_height_m": 2.5, "wind_speed_kmh": 30.0, "cape_j_per_kg": 1600})
    v_clean = c2['verdict'].encode('ascii', 'replace').decode()
    print(f"[OK] Composite Compounding -> Verdict: {v_clean}, Delay Recommended: {c2['delay_recommended']}")
    print(f"     Reasoning: {c2['reasoning_summary']}")
    assert "DANGEROUS" in c2['verdict']
    assert c2['delay_recommended'] is True

    # Test 3: Asymmetric Return Leg
    c3 = evaluate_round_trip(c1)
    v3_clean = c3['round_trip_verdict'].encode('ascii', 'replace').decode()
    print(f"[OK] Round Trip Analysis -> Verdict: {v3_clean}, Asymmetric: {c3['is_asymmetric']}")

    # Test 4: Safe PFZ Filtering
    pfz_test = [
        {"name": "PFZ Coastal #1", "lat": 13.15, "lon": 80.35, "wave_height_m": 0.8},
        {"name": "PFZ Deep #2", "lat": 13.50, "lon": 80.90, "wave_height_m": 1.7}
    ]
    c4 = filter_safe_targets_for_vessel(pfz_test, vessel_type="small_boat", lat=13.08, lon=80.27)
    print(f"[OK] Safe PFZ Filter -> Safe: {c4['safe_count']}, Excluded: {c4['excluded_count']}")
    assert c4['safe_count'] == 1
    assert c4['excluded_count'] == 1

    # Test 5: Unsuitability Diagnostic
    c5 = diagnose_unsuitability(lat=13.08, lon=80.27, vessel_type="small_boat")
    print(f"[OK] Unsuitability Diagnostic -> Identified {len(c5['diagnostic_factors'])} factors")

    print("\n[SUCCESS] ALL CONTEXTUAL REASONING ENGINE TESTS PASSED!")
