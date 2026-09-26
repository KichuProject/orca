"""
engine/intent_router.py
PHASE B1 — DYNAMIC LLM PLANNER + DETERMINISTIC GUARDRAILS

Architecture:
1. Deterministic Guardrails: Language detection, max-tool limits.
2. Dynamic LLM Planner: Analyzes query, decomposes subtasks, selects tools autonomously.
"""
import os
import re
import json
from datetime import datetime

try:
    from engine.data_catalog import discover_datasets
except Exception:
    try:
        from data_catalog import discover_datasets
    except Exception:
        try:
            from backend.app.engine.data_catalog import discover_datasets
        except Exception:
            discover_datasets = None

# ============================================================
# 1. DETERMINISTIC GUARDRAILS (Language Detection)
# ============================================================
LANGUAGE_RANGES = {
    "ta": (r"[\u0B80-\u0BFF]", "Tamil"),
    "te": (r"[\u0C00-\u0C7F]", "Telugu"),
    "hi": (r"[\u0900-\u097F]", "Hindi/Devanagari"),
    "ml": (r"[\u0D00-\u0D7F]", "Malayalam"),
    "kn": (r"[\u0C80-\u0CFF]", "Kannada"),
    "bn": (r"[\u0980-\u09FF]", "Bengali"),
    "gu": (r"[\u0A80-\u0AFF]", "Gujarati"),
    "or": (r"[\u0B00-\u0B7F]", "Odia"),
}

KNOWN_PORTS = {
    # Major Ports
    "chennai": (13.0827, 80.2707),
    "mumbai": (18.9438, 72.8354),
    "kochi": (9.9312, 76.2673),
    "cochin": (9.9312, 76.2673),
    "kochhi": (9.9312, 76.2673),
    "visakhapatnam": (17.6868, 83.2185),
    "vishakapattinam": (17.6868, 83.2185),
    "visakapatnam": (17.6868, 83.2185),
    "vishakapatnam": (17.6868, 83.2185),
    "visakapattinam": (17.6868, 83.2185),
    "vizag": (17.6868, 83.2185),
    "vizagapatam": (17.6868, 83.2185),
    "kolkata": (22.5726, 88.3639),
    "haldia": (22.0667, 88.0667),
    "kandla": (23.0117, 70.2197),
    "mangalore": (12.9141, 74.8560),
    "mangaluru": (12.9141, 74.8560),
    "paradip": (20.3167, 86.6167),
    "paradeep": (20.3167, 86.6167),
    "tuticorin": (8.7642, 78.1348),
    "thoothukudi": (8.7642, 78.1348),
    "thootukudi": (8.7642, 78.1348),
    "tuticoryn": (8.7642, 78.1348),
    "goa": (15.2993, 73.9859),
    "mormugao": (15.4167, 73.8000),
    "panaji": (15.4989, 73.8278),
    "ennore": (13.2333, 80.3333),
    "kamarajar": (13.2333, 80.3333),
    "jnpt": (18.9500, 72.9500),
    "nhava sheva": (18.9500, 72.9500),

    # Tamil Nadu Coast
    "kasimedu": (13.1250, 80.2970),
    "cuddalore": (11.7500, 79.7700),
    "nagapattinam": (10.7667, 79.8500),
    "karaikal": (10.9254, 79.8380),
    "pondicherry": (11.9416, 79.8083),
    "puducherry": (11.9416, 79.8083),
    "pamban": (9.2800, 79.2100),
    "rameshwaram": (9.2876, 79.3129),
    "dhanushkodi": (9.1800, 79.4200),
    "kanyakumari": (8.0883, 77.5385),
    "colachel": (8.1800, 77.2500),

    # Kerala Coast
    "vizhinjam": (8.3800, 76.9900),
    "neendakara": (8.9333, 76.5333),
    "kollam": (8.8800, 76.6000),
    "alappuzha": (9.4900, 76.3200),
    "alleppey": (9.4900, 76.3200),
    "munambam": (10.1800, 76.1700),
    "beypore": (11.1600, 75.8000),
    "calicut": (11.2500, 75.7700),
    "kozhikode": (11.2500, 75.7700),
    "kannur": (11.8700, 75.3600),

    # Karnataka & Maharashtra Coast
    "malpe": (13.3500, 74.7000),
    "karwar": (14.8167, 74.1333),
    "jaigad": (17.3000, 73.2200),
    "ratnagiri": (16.9902, 73.3120),
    "alibaug": (18.6400, 72.8700),

    # Gujarat Coast
    "dahej": (21.7000, 72.5800),
    "bhavnagar": (21.7600, 72.1500),
    "veraval": (20.9000, 70.3700),
    "porbandar": (21.6400, 69.6000),
    "okha": (22.4700, 69.0700),
    "dwarka": (22.2400, 68.9600),
    "mundra": (22.8400, 69.7000),

    # Andhra Pradesh & Odisha Coast
    "krishnapatnam": (14.2500, 80.1200),
    "machilipatnam": (16.1800, 81.1300),
    "kakinada": (16.9891, 82.2475),
    "gangavaram": (17.6200, 83.2300),
    "gopalpur": (19.2600, 84.9000),
    "puri": (19.8135, 85.8312),
    "dhamra": (20.8000, 86.9500),
    "chandipur": (21.4500, 87.0200),
    "digha": (21.6266, 87.5074),

    # Island Territories & Strategic Waters
    "port blair": (11.6234, 92.7265),
    "andaman": (11.7401, 92.6586),
    "nicobar": (7.0000, 93.8000),
    "havelock": (11.9800, 92.9800),
    "lakshadweep": (10.5667, 72.6417),
    "kavaratti": (10.5667, 72.6417),
    "agatti": (10.8500, 72.1800),
    "minicoy": (8.2800, 73.0500),

    # Regional Waters & Basins
    "colombo": (6.9300, 79.8400),
    "jaffna": (9.6600, 80.0100),
    "bay of bengal": (14.5000, 86.0000),
    "arabian sea": (15.5000, 68.0000),
    "palk strait": (9.5000, 79.5000),
    "gulf of mannar": (8.8000, 78.5000),
    "gulf of kutch": (22.6000, 69.5000),
}

def detect_language(text: str) -> dict:
    if not text:
        return {"code": "en", "name": "English", "confidence": "LOW"}
    for code, (pattern, name) in LANGUAGE_RANGES.items():
        matches = re.findall(pattern, text)
        if len(matches) >= 2:
            return {"code": code, "name": name, "confidence": "HIGH" if len(matches) > 8 else "MEDIUM"}
    return {"code": "en", "name": "English", "confidence": "LOW"}

def extract_intent_and_entities(query: str, profile: dict = None, history: list = None) -> dict:
    """
    Intent & Entity Extraction Agent:
    Extracts structured operational entities (coordinates, recognized ports, vessel types,
    time horizons, requested datasets) from the raw natural language query, user profile,
    and prior conversation history (multi-turn memory).
    """
    q = str(query or "").lower()
    profile = profile or {}
    
    # 0. Multi-Turn Session Context Resolution
    session_ctx = {}
    try:
        from engine.contextual_engine import extract_session_context
        session_ctx = extract_session_context(query, history=history, profile=profile)
    except Exception:
        try:
            from contextual_engine import extract_session_context
            session_ctx = extract_session_context(query, history=history, profile=profile)
        except Exception:
            session_ctx = {}

    # 1. Language Detection
    lang = detect_language(query)
    
    # 2. Location & Coordinates extraction
    lat = profile.get("lat")
    lon = profile.get("lon")
    location_name = None
    
    # Check for coordinates pattern like "13.08, 80.27" or "lat 13.08 lon 80.27"
    coord_match = re.search(r"(-?\d+\.\d+)\s*[,/ ]\s*(-?\d+\.\d+)", q)
    if coord_match:
        try:
            c1, c2 = float(coord_match.group(1)), float(coord_match.group(2))
            if 4.0 <= c1 <= 38.0 and 65.0 <= c2 <= 98.0:
                lat, lon = c1, c2
            elif 4.0 <= c2 <= 38.0 and 65.0 <= c1 <= 98.0:
                lat, lon = c2, c1
        except Exception:
            pass
            
    # Check known ports
    for p_name, (p_lat, p_lon) in KNOWN_PORTS.items():
        if p_name in q:
            location_name = p_name.title()
            if lat is None or lon is None:
                lat, lon = p_lat, p_lon
            break

    # Inherit location from session context if missing in current turn
    if (lat is None or lon is None) and session_ctx.get("lat") is not None:
        lat = session_ctx.get("lat")
        lon = session_ctx.get("lon")
    if not location_name and session_ctx.get("origin_location"):
        location_name = session_ctx.get("origin_location")
            
    # 3. Vessel Type extraction
    vessel_type = None
    if any(k in q for k in ["trawler", "mechanized", "large trawler", "purse seiner", "gillnetter"]):
        vessel_type = "trawler"
    elif any(k in q for k in ["cargo", "container", "merchant", "tanker", "bulk carrier"]):
        vessel_type = "cargo"
    elif any(k in q for k in ["deep sea", "oceanic fishing", "tuna longliner"]):
        vessel_type = "deep_sea"
    elif any(k in q for k in ["ferry", "passenger boat", "crew boat", "water taxi"]):
        vessel_type = "passenger_ferry"
    elif any(k in q for k in ["research", "survey vessel", "oceanographic"]):
        vessel_type = "research"
    elif any(k in q for k in ["canoe", "catamaran", "small boat", "country boat", "dinghy", "kattumaram", "vallam", "frp boat"]):
        vessel_type = "small_boat"
    elif any(k in q for k in ["my boat", "my vessel", "this boat", "our boat", "my craft", "this craft"]):
        vessel_type = session_ctx.get("vessel_type") or profile.get("vessel_type") or "small_boat"

    if not vessel_type:
        vessel_type = session_ctx.get("vessel_type") or profile.get("vessel_type") or "small_boat"
        
    # 4. Time & Temporal Reasoning extraction
    temporal_entity = None
    try:
        from engine.temporal_engine import resolve_time_reference
        temporal_entity = resolve_time_reference(query)
    except Exception:
        try:
            from temporal_engine import resolve_time_reference
            temporal_entity = resolve_time_reference(query)
        except Exception:
            temporal_entity = None

    time_ref = temporal_entity.get("description", "now") if temporal_entity else "now"
        
    # 5. Spatial Reasoning Operators Detection
    spatial_op = None
    spatial_dist_km = None
    spatial_target = "pfz" if any(k in q for k in ["pfz", "fish", "fishing"]) else ("hazard" if any(k in q for k in ["hazard", "storm", "cyclone", "danger"]) else ("port" if "port" in q or "harbour" in q or "harbor" in q else "pfz"))
    spatial_anchor = None

    # Check distance pattern: e.g. "30 km", "30km", "25 nautical miles", "25 nm"
    dist_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:km|kms|kilometers|kilometres)", q)
    if dist_match:
        try:
            spatial_dist_km = float(dist_match.group(1))
        except Exception:
            pass
    else:
        nm_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:nm|nautical\s*miles)", q)
        if nm_match:
            try:
                spatial_dist_km = round(float(nm_match.group(1)) * 1.852, 1)
            except Exception:
                pass

    # Check anchor references:
    if "landing centre" in q or "landing center" in q or "this port" in q or "harbour" in q or "harbor" in q:
        spatial_anchor = "Kasimedu" if "kasimedu" in q else (location_name or "this landing centre")
    elif location_name:
        spatial_anchor = location_name

    # Check 9 spatial reasoning operators:
    if any(k in q for k in ["within", "radius of", "inside radius", "less than"]):
        spatial_op = "within"
    elif any(k in q for k in ["nearest", "closest", "near"]):
        spatial_op = "nearest"
    elif any(k in q for k in ["inside", "in eez", "in mpa", "inside 12nm"]):
        spatial_op = "inside"
    elif any(k in q for k in ["outside", "beyond", "past 12nm", "outside eez"]):
        spatial_op = "outside"
    elif any(k in q for k in ["crossing", "crosses", "intersect", "intersects"]):
        spatial_op = "crossing"
    elif any(k in q for k in ["distance from", "distance to", "how far from", "how far is"]):
        spatial_op = "distance_from"
    elif any(k in q for k in ["along route", "along the route", "along path", "along waypoint"]):
        spatial_op = "along_route"
    elif any(k in q for k in ["surrounding area", "surrounding", "around here", "neighborhood", "vicinity"]):
        spatial_op = "surrounding_area"
    elif any(k in q for k in ["region comparison", "compare region", "versus", " vs ", "difference between"]):
        spatial_op = "region_comparison"

    # 6. Intent Classification
    intent = "general_marine_inquiry"

    # Contextual Reasoning priority intents
    if any(k in q for k in ["return trip", "coming back", "return at", "heading back", "return journey", "coming home", "way back"]):
        intent = "contextual_return_trip"
    elif any(k in q for k in ["why is this area unsuitable", "why unsuitable", "why is it not safe", "why unsafe today", "why can't i go", "what makes this area unsafe", "unsuitable today", "why this area is unsuitable"]):
        intent = "contextual_unsuitable_diagnostic"
    elif ("pfz" in q or "fishing" in q or "fish" in q) and any(k in q for k in ["safe for my", "suitable for my", "for my vessel", "for my boat", "can my boat reach", "within range of my"]):
        intent = "contextual_safe_pfz"
    elif any(k in q for k in ["for my boat", "for my vessel", "is my boat safe", "is it safe for my", "can my boat", "suitable for my boat", "suitable for my vessel", "can i take my boat"]) or (("boat" in q or "vessel" in q or session_ctx.get("vessel_type")) and any(k in q for k in ["safe tomorrow", "safe to go", "safe for departure", "is it safe", "can i go tomorrow", "can we leave", "is it ok to go"])):
        intent = "contextual_vessel_safety"
    elif spatial_op:
        intent = f"spatial_reasoning_{spatial_op}"
    elif temporal_entity and temporal_entity.get("is_historical"):
        intent = "temporal_climatology_comparison"
    elif temporal_entity and (temporal_entity.get("is_future") or temporal_entity.get("window_hours", 0) > 0):
        intent = "temporal_reasoning_forecast"
    elif ("route" in q or "path" in q) and any(k in q for k in ["enter a restricted", "restricted zone", "cross restricted", "enter restricted", "cross a restricted", "crosses restricted", "mpa", "no-go", "geofence", "boundary"]):
        intent = "route_geofence_clearance"
    elif any(k in q for k in ["productivity declined", "why has fish productivity", "productivity drop", "fish catch declined", "why productivity", "productivity decline", "why has productivity", "fish declined"]):
        intent = "fish_productivity_scenario_audit"
    elif any(k in q for k in ["route", "path", "navigate", "safe route", "heading", "passage"]):
        intent = "navigation_route_planning"
    elif any(k in q for k in ["pfz", "fish", "fishing zone", "where to fish", "catch"]):
        intent = "fishing_viability_pfz"
    elif any(k in q for k in ["cyclone", "storm", "lightning", "danger", "hazard", "gale", "squall"]):
        intent = "marine_hazard_assessment"
    elif any(k in q for k in ["safe", "venture", "can i leave", "is it safe", "departure", "clearance"]):
        intent = "safety_operational_clearance"
    elif any(k in q for k in ["weather", "wind", "rain", "visibility", "gust", "pressure"]):
        intent = "marine_weather_forecast"
    elif any(k in q for k in ["sst", "temperature", "chlorophyll", "current", "salinity", "ocean state"]):
        intent = "ocean_conditions_telemetry"
    elif any(k in q for k in ["tide", "high tide", "low tide", "water level"]):
        intent = "tide_prediction"
    elif any(k in q for k in ["ban", "seasonal ban", "breeding ban", "closure"]):
        intent = "regulatory_fishing_ban"
    elif any(k in q for k in ["eez", "boundary", "12nm", "territorial", "geofence", "mpa", "protected"]):
        intent = "geospatial_boundary_audit"
    elif any(k in q for k in ["dataset", "discovery", "what data", "sensors", "satellite feeds", "coverage"]):
        intent = "marine_data_discovery"
    elif any(k in q for k in ["tsunami", "earthquake", "seismic", "itews", "iteows", "seaquake"]):
        intent = "tsunami_early_warning"
    elif any(k in q for k in ["argo", "float", "salinity profile", "depth profile", "ctd", "thermocline"]):
        intent = "argo_profiling_floats"
    elif any(k in q for k in ["anomaly", "abnormal", "climatology", "historical"]):
        intent = "historical_anomaly_audit"

    # 5b. Navigation Route Origin & Destination Parsing
    route_origin = None
    route_destination = None
    if any(k in q for k in ["route", "navigate", "sail to", "path to", "passage", "directions", "go to", "travel to", "how to reach"]):
        from_to_match = re.search(r"from\s+([a-zA-Z\s]+?)\s+to\s+([a-zA-Z\s]+)", q)
        if from_to_match:
            from_name = from_to_match.group(1).strip()
            to_name = from_to_match.group(2).strip()
            for p_name, (p_lat, p_lon) in KNOWN_PORTS.items():
                if p_name in from_name:
                    route_origin = {"name": p_name.title(), "lat": p_lat, "lon": p_lon}
                if p_name in to_name:
                    route_destination = {"name": p_name.title(), "lat": p_lat, "lon": p_lon}
        
        if not route_destination:
            to_match = re.search(r"(?:to|towards|reach|for)\s+([a-zA-Z\s]+)", q)
            if to_match:
                to_candidate = to_match.group(1).strip()
                for p_name, (p_lat, p_lon) in KNOWN_PORTS.items():
                    if p_name in to_candidate:
                        route_destination = {"name": p_name.title(), "lat": p_lat, "lon": p_lon}
                        break
                if not route_destination:
                    import difflib
                    words = [w for w in re.findall(r'[a-zA-Z]{4,}', to_candidate) if w not in ("from", "location", "port", "nearest", "safest", "route")]
                    for w in words:
                        matches = difflib.get_close_matches(w, list(KNOWN_PORTS.keys()), n=1, cutoff=0.6)
                        if matches:
                            m_p = matches[0]
                            m_lat, m_lon = KNOWN_PORTS[m_p]
                            route_destination = {"name": m_p.title(), "lat": m_lat, "lon": m_lon}
                            break

        if not route_origin and (lat is not None and lon is not None):
            route_origin = {"name": location_name or "Current Location", "lat": lat, "lon": lon}

    # 7. Urgency detection
    urgency = "ROUTINE"
    if any(k in q for k in ["emergency", "mayday", "sos", "distress", "sinking"]):
        urgency = "CRITICAL"
    elif any(k in q for k in ["cyclone", "gale", "warning", "extreme", "danger", "rough"]):
        urgency = "HIGH"
    elif any(k in q for k in ["caution", "advisory", "high wave"]):
        urgency = "MEDIUM"
        
    return {
        "language": lang,
        "intent": intent,
        "urgency": urgency,
        "entities": {
            "lat": round(lat, 4) if lat is not None else None,
            "lon": round(lon, 4) if lon is not None else None,
            "location_name": location_name or profile.get("location_name"),
            "vessel_type": vessel_type,
            "time_horizon": time_ref,
            "temporal": temporal_entity,
            "spatial_operator": spatial_op,
            "spatial_distance_km": spatial_dist_km or 30.0,
            "spatial_target": spatial_target,
            "spatial_anchor": spatial_anchor,
            "route_origin": route_origin,
            "route_destination": route_destination,
            "contextual": session_ctx,
        }
    }

# ============================================================
# 2. DYNAMIC LLM PLANNER (Replaces Hardcoded Matrices)
# ============================================================
PLANNER_PROMPT_TEMPLATE = """You are the Dynamic Autonomous Planner for a Marine Intelligence AI.
Your job is to:
1. Analyze the user's query and formulate scientific data requirements ("What data do I need?").
   Identify specific environmental, biological, physical, or meteorological variables (e.g., chlorophyll, sea surface temperature anomaly, historical climatology, ocean currents, potential fishing zones, bathymetry).
2. Decompose the problem into actionable subtasks.
3. Select the exact tools needed to retrieve and analyze the data.

USER QUERY: {query}
USER PROFILE: {profile}

AVAILABLE TOOLS:
{tool_descriptions}

OUTPUT ONLY RAW VALID JSON. No markdown fences, no thinking tags, no pre/post-text.
{{
  "intent": "brief description of user intent",
  "data_requirements": ["variable_1", "variable_2", "variable_3"],
  "subtasks": ["step 1", "step 2"],
  "tools": ["tool_name_1", "tool_name_2"],
  "reasoning": "concise scientific rationale under 30 words",
  "is_marine_query": true
}}"""

def _get_fast_llm():
    """Initializes a fast LLM for planning (OmniRoute anti1 -> OpenRouter -> Groq -> Ollama)."""
    # 1. Primary: OmniRoute combo
    try:
        omni_base = os.getenv("OMNIROUTE_BASE_URL", "http://localhost:20128/v1")
        omni_key = os.getenv("OMNIROUTE_API_KEY") or os.getenv("OMNIROUTE", "sk-ant-dummy")
        omni_model = os.getenv("OMNIROUTE_MODEL", "anti1")
        if omni_base and omni_key:
            from langchain_openai import ChatOpenAI
            return ChatOpenAI(
                model=omni_model,
                openai_api_key=omni_key,
                openai_api_base=omni_base,
                temperature=0.0,
                max_tokens=2048,
                timeout=15
            )
    except Exception: pass

    # 2. Fallback: OpenRouter
    try:
        or_key = os.getenv("OPENROUTER_API_KEY")
        if or_key and not or_key.startswith("PASTE"):
            from langchain_openai import ChatOpenAI
            return ChatOpenAI(
                model="dots-studio/dots-3-note-preview:free", 
                openai_api_key=or_key, 
                openai_api_base="https://openrouter.ai/api/v1", 
                temperature=0.0, max_tokens=2048
            )
    except Exception: pass

    # 3. Fallback: Groq
    try:
        groq_key = os.getenv("GROQ_API_KEY")
        if groq_key and not groq_key.startswith("PASTE"):
            from langchain_groq import ChatGroq
            return ChatGroq(model="llama-3.1-8b-instant", api_key=groq_key, temperature=0.0, max_tokens=2048)
    except Exception: pass
    
    try:
        import requests
        res = requests.get("http://localhost:11434/api/tags", timeout=2)
        if res.status_code == 200:
            from langchain_ollama import ChatOllama
            return ChatOllama(model="qwen2.5:7b", temperature=0.0, num_ctx=4096)
    except Exception: pass
    
    return None

def _clean_and_parse_json(content: str) -> dict:
    """Robust JSON parser that handles code blocks, reasoning tags, trailing commas, and partial strings."""
    if not content or not content.strip():
        raise ValueError("Empty planner LLM response")

    # 1. Strip <think>...</think> tags if model produces thinking output
    cleaned = re.sub(r"<think>[\s\S]*?</think>", "", content).strip()

    # 2. Extract markdown code fence if present
    if "```json" in cleaned:
        cleaned = cleaned.split("```json", 1)[1].split("```", 1)[0].strip()
    elif "```" in cleaned:
        cleaned = cleaned.split("```", 1)[1].split("```", 1)[0].strip()

    # 3. Locate outer JSON bounds { ... }
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start != -1 and end != -1 and end > start:
        candidate = cleaned[start:end+1]
    else:
        candidate = cleaned

    # Attempt A: Direct standard json.loads
    try:
        return json.loads(candidate)
    except Exception:
        pass

    # Attempt B: Strip trailing commas before closing braces/brackets
    try:
        no_commas = re.sub(r",\s*([\]}])", r"\1", candidate)
        return json.loads(no_commas)
    except Exception:
        pass

    # Attempt C: Repair unclosed strings or missing terminal brace
    try:
        repaired = candidate
        quotes = len(re.findall(r'(?<!\\)"', repaired))
        if quotes % 2 != 0:
            repaired += '"'
        if not repaired.rstrip().endswith("}"):
            repaired += "}"
        return json.loads(repaired)
    except Exception:
        pass

    # Attempt D: Resilient Regex Extraction fallback
    intent_m = re.search(r'"intent"\s*:\s*"([^"]+)"', cleaned)
    tools_m = re.search(r'"tools"\s*:\s*\[([\s\S]*?)\]', cleaned)
    reasoning_m = re.search(r'"reasoning"\s*:\s*"([^"]+)"', cleaned)
    reqs_m = re.search(r'"data_requirements"\s*:\s*\[([\s\S]*?)\]', cleaned)
    
    tools = []
    if tools_m:
        tools = re.findall(r'"([^"]+)"', tools_m.group(1))

    reqs = []
    if reqs_m:
        reqs = re.findall(r'"([^"]+)"', reqs_m.group(1))

    if intent_m or tools or reqs:
        return {
            "intent": intent_m.group(1) if intent_m else "marine_analysis",
            "data_requirements": reqs,
            "subtasks": [],
            "tools": tools,
            "reasoning": reasoning_m.group(1) if reasoning_m else "Parsed via resilient regex extractor",
            "is_marine_query": True
        }

    # If no JSON boundaries exist, raise clear error
    if not candidate or "{" not in candidate:
        raise ValueError("No JSON object '{' found in planner response")

    # If all parsing attempts fail, raise the standard json decode error
    return json.loads(candidate)

def plan_tools(query: str, profile: dict = None, available_tools: list = None, max_tools: int = 8, history: list = None) -> dict:
    intent_and_entities = extract_intent_and_entities(query, profile, history=history)
    intent = intent_and_entities.get("intent", "general")
    q = str(query or "").lower()
    language = intent_and_entities["language"]
    lat = intent_and_entities["entities"].get("lat")
    lon = intent_and_entities["entities"].get("lon")
    
    if not available_tools:
        discovery = discover_datasets(query=query, lat=lat, lon=lon) if discover_datasets else {}
        tools_list = list(discovery.get("recommended_tools", []))
        spatial_op = intent_and_entities["entities"].get("spatial_operator")
        spatial_target = intent_and_entities["entities"].get("spatial_target")
        if spatial_op:
            if "spatial_reasoning_agent" not in tools_list:
                tools_list.insert(0, "spatial_reasoning_agent")
            if spatial_target == "pfz" and "pfz_agent" not in tools_list:
                tools_list.append("pfz_agent")
        return {
            "intent": intent_and_entities["intent"],
            "data_requirements": discovery.get("data_requirements", []),
            "discovered_datasets": discovery.get("discovered_datasets", []),
            "data_discovery_summary": discovery.get("summary", ""),
            "subtasks": [f"Execute dynamic multi-agent pipeline for {intent_and_entities['intent']}"],
            "tools": tools_list[:max_tools],
            "language": language,
            "intent_and_entities": intent_and_entities,
            "max_tools": max_tools
        }
        
    tool_desc = "\n".join([f"- {t.name}: {t.description}" for t in available_tools])
    prompt = PLANNER_PROMPT_TEMPLATE.format(
        query=query, 
        profile=json.dumps(profile or {}), 
        tool_descriptions=tool_desc
    )
    
    llm = _get_fast_llm()
    plan = None
    if llm:
        try:
            from langchain_core.messages import HumanMessage
            response = llm.invoke([HumanMessage(content=prompt)])
            content = response.content
            plan = _clean_and_parse_json(content)
        except Exception as e:
            print(f"⚠️ Dynamic Planner LLM parsing failed: {e}. Falling back to catalog autonomy.")
            plan = None

    # If LLM parsing failed or LLM not available, construct baseline plan
    if not plan:
        plan = {
            "intent": intent_and_entities["intent"],
            "data_requirements": [],
            "subtasks": [f"Execute dynamic multi-agent pipeline for {intent_and_entities['intent']}"],
            "tools": [],
            "reasoning": "Dynamic autonomous discovery from marine catalog.",
            "is_marine_query": True
        }

    # Autonomous Data Discovery: resolve data requirements to real operational datasets
    raw_reqs = plan.get("data_requirements", [])
    if discover_datasets:
        discovery = discover_datasets(data_requirements=raw_reqs, query=query, lat=lat, lon=lon)
        plan["data_requirements"] = discovery.get("data_requirements", raw_reqs)
        plan["discovered_datasets"] = discovery.get("discovered_datasets", [])
        plan["data_discovery_summary"] = discovery.get("summary", "")
        
        # Merge discovered tools into plan tools
        current_tools = list(plan.get("tools", []))
        avail_names = {t.name for t in available_tools} if available_tools else set()
        for disc_tool in discovery.get("recommended_tools", []):
            if disc_tool in avail_names and disc_tool not in current_tools:
                current_tools.append(disc_tool)
        plan["tools"] = current_tools[:max_tools]
    else:
        plan["discovered_datasets"] = []
        plan["data_discovery_summary"] = ""

    # Specific routing guarantee for Spatial Reasoning queries
    spatial_op = intent_and_entities["entities"].get("spatial_operator")
    spatial_target = intent_and_entities["entities"].get("spatial_target")
    if spatial_op:
        current_tools = list(plan.get("tools", []))
        avail_names = {t.name for t in available_tools} if available_tools else set()
        
        # Always inject spatial_reasoning_agent
        if "spatial_reasoning_agent" in avail_names and "spatial_reasoning_agent" not in current_tools:
            current_tools.insert(0, "spatial_reasoning_agent")
        elif not avail_names and "spatial_reasoning_agent" not in current_tools:
            current_tools.insert(0, "spatial_reasoning_agent")

        # Inject domain target tools
        if spatial_target == "pfz":
            if "pfz_agent" in avail_names and "pfz_agent" not in current_tools:
                current_tools.append("pfz_agent")
            if "geospatial_agent" in avail_names and "geospatial_agent" not in current_tools:
                current_tools.append("geospatial_agent")
        elif spatial_target == "hazard":
            if "hazard_agent" in avail_names and "hazard_agent" not in current_tools:
                current_tools.append("hazard_agent")
        elif spatial_target == "port":
            if "navigation_agent" in avail_names and "navigation_agent" not in current_tools:
                current_tools.append("navigation_agent")

        plan["tools"] = current_tools[:max_tools]
        if not plan.get("data_requirements"):
            plan["data_requirements"] = [
                f"INCOIS {spatial_target.upper()} Feeds",
                "Landing Centres & Marine Ports",
                f"Spatial {spatial_op.replace('_', ' ').title()} Analytics"
            ]
        plan["subtasks"] = [
            f"Resolve anchor location ({intent_and_entities['entities'].get('spatial_anchor') or 'user coordinate'})",
            f"Execute spatial reasoning operator: {spatial_op} (target: {spatial_target})",
            "Synthesize spatially filtered marine features and interactive map overlay"
        ]

    # Specific routing guarantee for Temporal Reasoning queries
    temporal_entity = intent_and_entities["entities"].get("temporal") or {}
    if temporal_entity.get("is_future") or temporal_entity.get("is_historical") or temporal_entity.get("window_hours", 0) > 0:
        current_tools = list(plan.get("tools", []))
        avail_names = {t.name for t in available_tools} if available_tools else set()

        if "temporal_reasoning_agent" in avail_names and "temporal_reasoning_agent" not in current_tools:
            current_tools.insert(0, "temporal_reasoning_agent")
        elif not avail_names and "temporal_reasoning_agent" not in current_tools:
            current_tools.insert(0, "temporal_reasoning_agent")

        if temporal_entity.get("is_historical"):
            if "ocean_agent" in avail_names and "ocean_agent" not in current_tools:
                current_tools.append("ocean_agent")
            if "historical_anomaly_agent" in avail_names and "historical_anomaly_agent" not in current_tools:
                current_tools.append("historical_anomaly_agent")
        else:
            if "weather_agent" in avail_names and "weather_agent" not in current_tools:
                current_tools.append("weather_agent")
            if "safety_agent" in avail_names and "safety_agent" not in current_tools:
                current_tools.append("safety_agent")

        plan["tools"] = current_tools[:max_tools]
        if not plan.get("data_requirements"):
            plan["data_requirements"] = [
                "Open-Meteo 7-Day High-Resolution Forecast (Asia/Kolkata)",
                "INCOIS Decadal Climatology Baseline (2010-2025)",
                "Copernicus Marine L4 Sea Surface Temperature & Waves"
            ]
        plan["subtasks"] = [
            f"Resolve exact timestamp / forecast horizon ({temporal_entity.get('description', 'Target Time')})",
            "Query target hour forecast slice or decadal climatology baseline",
            "Evaluate vessel operating safety margin and synthesize decision recommendation"
        ]

    # Specific routing guarantee for Contextual Reasoning queries
    contextual_intents = {"contextual_return_trip", "contextual_vessel_safety", "contextual_safe_pfz", "contextual_unsuitable_diagnostic"}
    is_contextual_query = (
        intent in contextual_intents
        or any(k in q for k in ["for my boat", "for my vessel", "return trip", "why is this area unsuitable", "why unsuitable", "safe pfz for my", "is it safe for my"])
    )
    if is_contextual_query:
        current_tools = list(plan.get("tools", []))
        avail_names = {t.name for t in available_tools} if available_tools else set()

        if "contextual_reasoning_agent" in avail_names and "contextual_reasoning_agent" not in current_tools:
            current_tools.insert(0, "contextual_reasoning_agent")
        elif not avail_names and "contextual_reasoning_agent" not in current_tools:
            current_tools.insert(0, "contextual_reasoning_agent")

        if intent == "contextual_safe_pfz":
            if "pfz_agent" in avail_names and "pfz_agent" not in current_tools:
                current_tools.append("pfz_agent")
        if "weather_agent" in avail_names and "weather_agent" not in current_tools:
            current_tools.append("weather_agent")
        if "safety_agent" in avail_names and "safety_agent" not in current_tools:
            current_tools.append("safety_agent")

        plan["tools"] = current_tools[:max_tools]
        v_type = intent_and_entities["entities"].get("vessel_type", "small_boat")
        loc_desc = intent_and_entities["entities"].get("location_name") or "User Coordinates"
        plan["data_requirements"] = [
            f"Vessel Seaworthiness Matrix ({v_type.replace('_', ' ').title()})",
            "Multi-Parametric Metocean Telemetry (Waves, Wind, Gusts, Currents, Lightning)",
            "Active Maritime Geo-fence & Restricted Zone Boundaries"
        ]
        plan["subtasks"] = [
            f"Derive multi-turn conversational session context (Vessel: {v_type}, Location: {loc_desc})",
            "Evaluate vessel-specific capability envelopes and parameter breach margins",
            "Calculate non-linear compounding risk index across overlapping marine hazards",
            "Formulate actionable go/no-go operational recommendations and alternative return windows"
        ]

    # Specific routing guarantee for Deterministic Safety & Explainability (#10 & #11)
    is_explainability_query = (
        any(k in q for k in [
            "why are you telling me", "why are you saying", "why tell me not to",
            "not to go", "not go fishing", "why not go", "why cannot go", "why can't i go",
            "why unsafe", "why caution", "why dangerous", "why no-go", "explain why",
            "explain your recommendation", "traceable", "explainable", "what sources",
            "why was route a rejected", "why route b selected", "evidence for",
            "why telling me"
        ])
    )
    is_safety_decision_query = (
        is_explainability_query
        or intent in ("safety_operational_clearance", "contextual_vessel_safety")
        or any(k in q for k in [
            "is it safe", "is my boat safe", "safe tomorrow", "can i go", "can we leave",
            "is it ok to go", "safety check", "no-go", "no go", "venture out", "safe for my",
            "fishing tomorrow", "go fishing"
        ])
    )
    if is_safety_decision_query or is_explainability_query:
        current_tools = list(plan.get("tools", []))
        avail_names = {t.name for t in available_tools} if available_tools else set()

        if "deterministic_safety_agent" in avail_names and "deterministic_safety_agent" not in current_tools:
            current_tools.insert(0, "deterministic_safety_agent")
        elif not avail_names and "deterministic_safety_agent" not in current_tools:
            current_tools.insert(0, "deterministic_safety_agent")

        if "safety_agent" in avail_names and "safety_agent" not in current_tools:
            current_tools.append("safety_agent")
        if "weather_agent" in avail_names and "weather_agent" not in current_tools:
            current_tools.append("weather_agent")

        plan["tools"] = current_tools[:max_tools]
        v_type = intent_and_entities["entities"].get("vessel_type", "small_boat")
        plan["data_requirements"] = [
            f"Deterministic Seaworthiness Envelope ({v_type.replace('_', ' ').title()})",
            "8 Hazard Telemetry Dimensions (Waves, Wind, Currents, Lightning, Cyclone, Rain, Geofences, Bathymetry)",
            "Institutional Marine Safety Thresholds (INCOIS, IMD, ECMWF, GEBCO)",
            "Audit Provenance & Parameter-to-Source Evidence Traceability"
        ]
        if is_explainability_query:
            plan["subtasks"] = [
                f"Auditable Recommendation Verification (Vessel: {v_type.replace('_', ' ').title()})",
                "Trace numerical telemetry reasons (Waves, Wind, Gusts, Convective Lightning)",
                "Map official parameter provenance: Wave → INCOIS, Wind → Open-Meteo, Advisory → IMD",
                "Compute confidence index, timestamp freshness (IST), and contributing agents checklist"
            ]

    # Specific routing guarantee for Fish Productivity Scenario Reasoning (#12)
    if intent == "fish_productivity_scenario_audit" or any(k in q for k in ["productivity declined", "why has fish productivity", "productivity drop", "why productivity", "fish declined"]):
        current_tools = list(plan.get("tools", []))
        avail_names = {t.name for t in available_tools} if available_tools else set()

        if "productivity_agent" in avail_names and "productivity_agent" not in current_tools:
            current_tools.insert(0, "productivity_agent")
        elif not avail_names and "productivity_agent" not in current_tools:
            current_tools.insert(0, "productivity_agent")

        for extra_tool in ["ocean_conditions_agent", "pfz_agent", "historical_anomaly_agent"]:
            if extra_tool in avail_names and extra_tool not in current_tools:
                current_tools.append(extra_tool)

        plan["tools"] = current_tools[:max_tools]
        plan["data_requirements"] = [
            "Live Copernicus Sea Surface Temperature & Chlorophyll-a (L4 Satellite)",
            "NOAA 1991–2020 Monthly Climatology Baseline (30-Year Normal)",
            "ISRO MOSDAC / Copernicus Surface Ocean Velocity & Currents",
            "INCOIS Marine Fishery Potential Fishing Zones (PFZ)"
        ]
        plan["subtasks"] = [
            "Retrieve live satellite SST and Chlorophyll-a concentrations",
            "Cross-evaluate against NOAA 1991–2020 monthly climatological normal",
            "Distinguish measured facts from causal model inference (upwelling, trophic starvation, current advection)",
            "Formulate actionable fishing zone relocation guidance"
        ]

    # Specific routing guarantee for Route Geofence Clearance (#13)
    if intent == "route_geofence_clearance" or (("route" in q or "path" in q) and any(k in q for k in ["enter", "cross", "restricted", "mpa", "geofence", "no-go", "zone"])):
        current_tools = list(plan.get("tools", []))
        avail_names = {t.name for t in available_tools} if available_tools else set()

        if "geofence_agent" in avail_names and "geofence_agent" not in current_tools:
            current_tools.insert(0, "geofence_agent")
        elif not avail_names and "geofence_agent" not in current_tools:
            current_tools.insert(0, "geofence_agent")

        for extra_tool in ["route_optimizer_agent", "navigation_agent"]:
            if extra_tool in avail_names and extra_tool not in current_tools:
                current_tools.append(extra_tool)

        plan["tools"] = current_tools[:max_tools]
        plan["data_requirements"] = [
            "India Marine Protected Areas (WDPA) & Ecologically Sensitive Reefs",
            "Custom Restricted Zones (Naval Exercises, Offshore Wind Farms)",
            "UNCLOS Sovereign Boundaries (12NM, 24NM, EEZ, IMBL)",
            "Planned Route Corridor Waypoints"
        ]
        plan["subtasks"] = [
            "Inspect full planned route LineString against sovereign and ecological polygons",
            "Evaluate boundary proximity levels (Safe >5km, Caution 1-5km, Danger <=1km)",
            "Enforce automatic route rejection if corridor crosses restricted no-go area",
            "Calculate verified safe alternative deep-water detour corridor"
        ]

    plan["language"] = language
    plan["max_tools"] = max_tools
    plan["intent_and_entities"] = intent_and_entities

    return plan

def build_planner_hint(query: str, profile: dict = None, available_tools: list = None, plan: dict = None) -> str:
    if plan is None:
        plan = plan_tools(query, profile, available_tools)
    
    if not plan.get("tools") and plan.get("intent") == "dynamic_autonomy":
        return (
            "DYNAMIC PLANNER: You have full autonomy. Analyze the user's query, "
            "decompose it into subtasks, and call ANY combination of available tools "
            "needed to answer comprehensively. Do not restrict yourself to fixed patterns."
        )
        
    if not plan.get("tools"):
        return "PLANNER: This is a conversational, educational, or non-marine query. Do not call marine tools. Respond warmly, engagingly, and helpfully like ChatGPT and Claude directly in the user's language."
        
    tools_text = ", ".join(plan.get("tools", []))
    subtasks_text = "\n".join([f"  - {st}" for st in plan.get("subtasks", [])])
    reqs_text = ", ".join(plan.get("data_requirements", []))
    disc_datasets = plan.get("discovered_datasets", [])
    disc_text = ", ".join([f"{d['name']} ({d['provider']})" for d in disc_datasets[:4]]) if disc_datasets else "Operational feeds"
    
    hint = f"""DYNAMIC PLANNER & DATA DISCOVERY INSTRUCTION:
- Intent: {plan.get('intent')}
- Language: {plan.get('language', {}).get('name', 'English')}
- Data Requirements ("What data do I need?"): {reqs_text if reqs_text else 'Operational sea-state parameters'}
- Discovered Datasets: {disc_text}
- Subtasks:
{subtasks_text}
- Recommended Tools: {tools_text}
- Reasoning: {plan.get('reasoning')}
Execute the subtasks dynamically. Cite the discovered operational datasets in your final scientific evidence."""
    
    return hint

def allow_tool_call(tool_name: str, planned_tools: list) -> bool:
    # If planned_tools is empty (dynamic autonomy), allow all tools
    if not planned_tools:
        return True
    return tool_name in planned_tools