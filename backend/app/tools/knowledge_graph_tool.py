"""
knowledge_graph_tool.py
PHASE B5 — KNOWLEDGE GRAPH TOOL (UPGRADED)
Builds a dynamic NetworkX graph connecting ALL marine entities.

Nodes:
- User location
- PFZ zones
- Ocean state (SST, chlorophyll, currents)
- Weather state (wave, wind, rain)
- Hazards (cyclone, lightning)
- Maritime zones (EEZ, MPA, restricted)
- Ports / harbours
- Tide state
- Risk / suitability scores
- Fishing activity (GFW)
- Productivity data

Edges (relationships):
- LOCATED_IN (user → zone)
- TARGET_PFZ (user → PFZ)
- HAS_SST, HAS_CHLOROPHYLL, HAS_WAVE (location → ocean)
- THREATENED_BY (user → hazard)
- NEAREST_HAVEN (user → port)
- SUITABILITY_SCORE (location → score)
- RISK_LEVEL (location → risk)
- TIDE_STATE (location → tide)

Output:
- graph_summary: Natural language for LLM
- graph_data: Node-link JSON for frontend D3/Cytoscape visualization
- node_count, edge_count

Rules:
- Zero top-level execution
- Everything inside functions
- Dynamic lat/lon
- TEST_* constants only inside __main__
- Uses existing tools (no direct API calls)
- TEST RUN prints full result data
"""
import sys
import json
import math
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
# NETWORKX IMPORT
# ============================================================
try:
    import networkx as nx
    NETWORKX_AVAILABLE = True
except ImportError:
    NETWORKX_AVAILABLE = False

# ============================================================
# TEST CONSTANTS
# ============================================================
TEST_LAT = 13.05
TEST_LON = 80.30

# ============================================================
# HELPERS
# ============================================================
def _now_iso():
    return datetime.now().isoformat()

def _safe_call(fn, *args, **kwargs):
    """Safely calls a tool function."""
    if fn is None:
        return {"status": "tool_not_available"}
    try:
        return fn(*args, **kwargs)
    except Exception as e:
        return {"status": "error", "error": str(e)[:120]}

def _safe_float(value):
    try:
        if value is None:
            return None
        v = float(value)
        if math.isnan(v) or math.isinf(v):
            return None
        return v
    except (ValueError, TypeError):
        return None

# ============================================================
# TOOL IMPORTS (lazy)
# ============================================================
_tools_loaded = False
_tool_registry = {}

def _load_tools():
    """Lazily imports all tools to avoid circular dependencies."""
    global _tools_loaded, _tool_registry
    if _tools_loaded:
        return _tool_registry

    try:
        from pfz_tool import get_nearest_pfz, get_sst_chlorophyll
        _tool_registry["pfz"] = get_nearest_pfz
        _tool_registry["ocean"] = get_sst_chlorophyll
    except Exception:
        pass

    try:
        from safety_tool import get_safety_conditions
        _tool_registry["safety"] = get_safety_conditions
    except Exception:
        pass

    try:
        from geofence_tool import check_geofence, get_eco_restriction
        _tool_registry["geofence"] = check_geofence
        _tool_registry["eco"] = get_eco_restriction
    except Exception:
        pass

    try:
        from navigation_tool import get_nearest_port, get_isro_wind_current
        _tool_registry["ports"] = get_nearest_port
        _tool_registry["isro_current"] = get_isro_wind_current
    except Exception:
        pass

    try:
        from tide_tool import get_tide_prediction
        _tool_registry["tide"] = get_tide_prediction
    except Exception:
        pass

    try:
        from hazard_tool import get_cyclone_risk, get_lightning_risk
        _tool_registry["cyclone"] = get_cyclone_risk
        _tool_registry["lightning"] = get_lightning_risk
    except Exception:
        pass

    try:
        from fusion_tool import get_fusion_summary
        _tool_registry["fusion"] = get_fusion_summary
    except Exception:
        pass

    try:
        from ml_risk_tool import get_quick_risk, get_quick_suitability
        _tool_registry["risk"] = get_quick_risk
        _tool_registry["suitability"] = get_quick_suitability
    except Exception:
        pass

    try:
        from spatial_temporal_tool import spatial_query
        _tool_registry["spatial"] = spatial_query
    except Exception:
        pass

    _tools_loaded = True
    return _tool_registry

# ============================================================
# MAIN KNOWLEDGE GRAPH BUILDER
# ============================================================
def build_marine_knowledge_graph(lat: float, lon: float) -> dict:
    """
    AI Tool: Builds a comprehensive Marine Knowledge Graph.
    Connects user location to ALL marine entities using NetworkX.
    Returns graph summary + node-link JSON for visualization.
    """
    if not NETWORKX_AVAILABLE:
        return {
            "status": "error",
            "error": "networkx not installed. Run: pip install networkx",
            "tool": "knowledge_graph_tool.build_marine_knowledge_graph"
        }

    tools = _load_tools()
    G = nx.DiGraph()

    # ============================================================
    # 1. USER NODE
    # ============================================================
    user_id = "User_Vessel"
    G.add_node(user_id, type="Vessel", lat=lat, lon=lon)

    # ============================================================
    # 2. MARITIME ZONES (Geofence)
    # ============================================================
    geofence = _safe_call(tools.get("geofence"), lat, lon)
    zones = geofence.get("zones", []) if isinstance(geofence, dict) else []
    zone_alert = geofence.get("alert", "Unknown Zone") if isinstance(geofence, dict) else "Unknown"

    G.add_node(zone_alert, type="Zone")
    G.add_edge(user_id, zone_alert, relation="LOCATED_IN")

    for z in zones:
        if z != zone_alert:
            G.add_node(z, type="Zone")
            G.add_edge(user_id, z, relation="ALSO_IN")

    # Eco restrictions
    eco = _safe_call(tools.get("eco"), lat, lon)
    restrictions = eco.get("restrictions", []) if isinstance(eco, dict) else []
    for res in restrictions:
        res_type = res.get("type", "Eco_Zone")
        G.add_node(res_type, type="Eco_Restriction", distance_km=res.get("distance_km"))
        G.add_edge(user_id, res_type, relation="RESTRICTED_BY", distance_km=res.get("distance_km"))

    # ============================================================
    # 3. PFZ (Fishing Target)
    # ============================================================
    pfz = _safe_call(tools.get("pfz"), lat, lon)
    pfz_data = pfz.get("nearest_pfz", {}) if isinstance(pfz, dict) else {}
    pfz_name = pfz_data.get("name", "None")
    pfz_dist = pfz.get("distance_km", 0) if isinstance(pfz, dict) else 0
    pfz_sector = pfz.get("sector", "Unknown") if isinstance(pfz, dict) else "Unknown"

    if pfz_name and pfz_name != "None":
        G.add_node(pfz_name, type="PFZ", distance_km=pfz_dist, sector=pfz_sector)
        G.add_edge(user_id, pfz_name, relation="TARGET_PFZ", distance_km=pfz_dist)

    # ============================================================
    # 4. OCEAN STATE (SST, Chlorophyll from Fusion)
    # ============================================================
    fusion = _safe_call(tools.get("fusion"), lat, lon)
    if isinstance(fusion, dict) and fusion.get("status") != "error":
        sst = _safe_float(fusion.get("fused_sst_c"))
        chl = _safe_float(fusion.get("fused_chlorophyll_mg_m3"))
        wave = _safe_float(fusion.get("fused_wave_height_m"))
        confidence = fusion.get("confidence_pct")

        if sst is not None:
            sst_node = f"SST_{round(sst,1)}C"
            G.add_node(sst_node, type="Ocean_State", value=round(sst, 1), unit="°C")
            G.add_edge(user_id, sst_node, relation="HAS_SST")

        if chl is not None:
            chl_node = f"Chl_{round(chl,2)}mg"
            G.add_node(chl_node, type="Ocean_State", value=round(chl, 2), unit="mg/m³")
            G.add_edge(user_id, chl_node, relation="HAS_CHLOROPHYLL")

        if wave is not None:
            wave_node = f"Wave_{round(wave,1)}m"
            G.add_node(wave_node, type="Ocean_State", value=round(wave, 1), unit="m")
            G.add_edge(user_id, wave_node, relation="HAS_WAVE")

    # ============================================================
    # 5. SAFETY & WEATHER
    # ============================================================
    safety = _safe_call(tools.get("safety"), lat, lon)
    if isinstance(safety, dict):
        verdict = safety.get("verdict", "UNKNOWN")
        risks = safety.get("risks", [])
        conditions = safety.get("conditions", {})

        verdict_node = f"Safety_{verdict}"
        G.add_node(verdict_node, type="Safety_Verdict", verdict=verdict)
        G.add_edge(user_id, verdict_node, relation="SAFETY_STATUS")

        for risk in risks:
            G.add_node(risk, type="Hazard")
            G.add_edge(user_id, risk, relation="THREATENED_BY")

        # Wind
        wind = _safe_float(conditions.get("wind_kmh"))
        if wind is not None:
            wind_node = f"Wind_{round(wind,1)}kmh"
            G.add_node(wind_node, type="Weather", value=wind, unit="km/h")
            G.add_edge(user_id, wind_node, relation="HAS_WIND")

    # ============================================================
    # 6. CYCLONE & LIGHTNING HAZARDS
    # ============================================================
    cyclone = _safe_call(tools.get("cyclone"), lat, lon)
    if isinstance(cyclone, dict):
        cyc_risk = cyclone.get("risk_level", "SAFE")
        if cyc_risk not in ("SAFE", "UNKNOWN", None, "NO ACTIVE SIGNAL", "NO ACTIVE SIGNAL", ""):
            cyc_node = f"Cyclone_{cyc_risk}"
            G.add_node(cyc_node, type="Hazard", category=cyclone.get("cyclone_category"))
            G.add_edge(user_id, cyc_node, relation="THREATENED_BY")
        else:
            G.add_node("No_Cyclone", type="Safe_State")
            G.add_edge(user_id, "No_Cyclone", relation="NO_CYCLONE_THREAT")

    lightning = _safe_call(tools.get("lightning"), lat, lon)
    if isinstance(lightning, dict):
        ltn_risk = lightning.get("combined_lightning_risk", lightning.get("lightning_risk", "MINIMAL"))
        if ltn_risk and ("HIGH" in str(ltn_risk).upper() or "EXTREME" in str(ltn_risk).upper()):
            ltn_node = f"Lightning_{ltn_risk}"
            G.add_node(ltn_node, type="Hazard")
            G.add_edge(user_id, ltn_node, relation="THREATENED_BY")

    # ============================================================
    # 7. TIDE STATE
    # ============================================================
    tide = _safe_call(tools.get("tide"), lat=lat, lon=lon)
    if isinstance(tide, dict):
        tide_port = tide.get("port", "Unknown")
        tide_status = tide.get("tide_status", "UNKNOWN")
        tide_height = tide.get("current_height_m")

        tide_node = f"Tide_{tide_status}"
        G.add_node(tide_node, type="Tide", port=tide_port, height_m=tide_height)
        G.add_edge(user_id, tide_node, relation="TIDE_STATE")

    # ============================================================
    # 8. NEAREST PORT (Safe Haven)
    # ============================================================
    ports = _safe_call(tools.get("ports"), lat, lon)
    if isinstance(ports, dict):
        port_list = ports.get("ports", [])
        if port_list:
            safe_port = port_list[0].get("name", "Unknown Port")
            port_dist = port_list[0].get("distance_km", 0)
            G.add_node(safe_port, type="Port", distance_km=port_dist)
            G.add_edge(user_id, safe_port, relation="NEAREST_HAVEN", distance_km=port_dist)

    # ============================================================
    # 9. ISRO CURRENTS
    # ============================================================
    isro_current = _safe_call(tools.get("isro_current"), lat, lon)
    if isinstance(isro_current, dict):
        current_data = isro_current.get("isro_current", {})
        if isinstance(current_data, dict) and current_data.get("status") == "ok":
            speed = current_data.get("speed_ms")
            direction = current_data.get("direction_deg")
            if speed is not None:
                current_node = f"Current_{speed}ms"
                G.add_node(current_node, type="Ocean_State", value=speed, unit="m/s", direction_deg=direction)
                G.add_edge(user_id, current_node, relation="HAS_CURRENT")

    # ============================================================
    # 10. ML RISK & SUITABILITY
    # ============================================================
    risk = _safe_call(tools.get("risk"), lat, lon)
    if isinstance(risk, dict):
        risk_level = risk.get("risk_level", "UNKNOWN")
        risk_score = risk.get("risk_score", 0)
        risk_node = f"Risk_{risk_level}"
        G.add_node(risk_node, type="Risk_Assessment", score=risk_score)
        G.add_edge(user_id, risk_node, relation="RISK_LEVEL")

    suitability = _safe_call(tools.get("suitability"), lat, lon)
    if isinstance(suitability, dict):
        suit_score = suitability.get("suitability_score", 0)
        suit_class = suitability.get("suitability_class", "UNKNOWN")
        suit_node = f"Suitability_{suit_class}"
        G.add_node(suit_node, type="Suitability", score=suit_score)
        G.add_edge(user_id, suit_node, relation="FISHING_SUITABILITY")

    # ============================================================
    # 11. SPATIAL CONTEXT (Sea region)
    # ============================================================
    spatial = _safe_call(tools.get("spatial"), lat, lon)
    if isinstance(spatial, dict):
        zones_inside = spatial.get("zones", {}).get("zones_inside", [])
        for z in zones_inside:
            props = z.get("properties", {})
            sea_name = props.get("IHO_Sea") or props.get("MarRegion") or props.get("GEONAME")
            if sea_name:
                G.add_node(sea_name, type="Sea_Region")
                G.add_edge(user_id, sea_name, relation="IN_SEA")
                break  # Only first sea region

    # ============================================================
    # EXPORT
    # ============================================================
    try:
        graph_data = nx.node_link_data(G, edges="links")  # NetworkX 3.x
    except TypeError:
        graph_data = nx.node_link_data(G)  # NetworkX 2.x

    # Count by type
    node_types = {}
    for _, data in G.nodes(data=True):
        ntype = data.get("type", "Unknown")
        node_types[ntype] = node_types.get(ntype, 0) + 1

    hazard_count = node_types.get("Hazard", 0)
    restriction_count = node_types.get("Eco_Restriction", 0)

    # Build natural language summary
    summary_parts = [
        f"Knowledge Graph built: {len(G.nodes)} nodes, {len(G.edges)} edges."
    ]
    summary_parts.append(f"User located in '{zone_alert}'.")

    if pfz_name and pfz_name != "None":
        summary_parts.append(f"Target PFZ: '{pfz_name}' ({pfz_dist} km).")

    if isinstance(fusion, dict):
        sst = fusion.get("fused_sst_c")
        chl = fusion.get("fused_chlorophyll_mg_m3")
        if sst: summary_parts.append(f"SST: {sst}°C.")
        if chl: summary_parts.append(f"Chlorophyll: {chl} mg/m³.")

    if isinstance(safety, dict):
        summary_parts.append(f"Safety: {safety.get('verdict', 'UNKNOWN')}.")

    if port_list:
        summary_parts.append(f"Nearest haven: '{port_list[0].get('name')}' ({port_list[0].get('distance_km')} km).")

    if hazard_count > 0:
        summary_parts.append(f"⚠️ {hazard_count} hazard(s) detected.")
    if restriction_count > 0:
        summary_parts.append(f"🚫 {restriction_count} eco-restriction(s).")

    if isinstance(suitability, dict):
        summary_parts.append(f"Fishing suitability: {suitability.get('suitability_score', 0)}/100 ({suitability.get('suitability_class', 'UNKNOWN')}).")

    return {
        "status": "success",
        "tool": "knowledge_graph_tool.build_marine_knowledge_graph",
        "generated_at": _now_iso(),
        "lat": lat,
        "lon": lon,
        "nodes": len(G.nodes),
        "edges": len(G.edges),
        "node_types": node_types,
        "graph_summary": " ".join(summary_parts),
        "graph_data": graph_data,
        "hazards_detected": hazard_count,
        "restrictions_detected": restriction_count,
        "data_sources": [
            "NetworkX Dynamic Graph",
            "pfz_tool", "safety_tool", "geofence_tool",
            "navigation_tool", "tide_tool", "hazard_tool",
            "fusion_tool", "ml_risk_tool", "spatial_temporal_tool"
        ]
    }

# ============================================================
# TEST RUN
# ============================================================
if __name__ == "__main__":
    print("=" * 70)
    print("KNOWLEDGE GRAPH TOOL — PHASE B5 UPGRADE TEST")
    print("=" * 70)

    result = build_marine_knowledge_graph(TEST_LAT, TEST_LON)

    print("\n📦 Graph Summary:")
    print(result.get("graph_summary", "No summary"))

    print(f"\n📊 Nodes: {result.get('nodes', 0)} | Edges: {result.get('edges', 0)}")
    print(f"📊 Node Types: {json.dumps(result.get('node_types', {}), indent=1)}")
    print(f"⚠️ Hazards: {result.get('hazards_detected', 0)}")
    print(f"🚫 Restrictions: {result.get('restrictions_detected', 0)}")

    # Print graph data summary (not full JSON to save space)
    graph_data = result.get("graph_data", {})
    print(f"\n📊 Graph Data (node-link format):")
    print(f"   Nodes in JSON: {len(graph_data.get('nodes', []))}")
    links = graph_data.get('links') or graph_data.get('edges') or []
    print(f"   Links in JSON: {len(links)}")

    # Print first few nodes as sample
    nodes = graph_data.get("nodes", [])
    if nodes:
        print(f"\n📦 Sample Nodes (first 5):")
        for n in nodes[:5]:
            print(f"   {json.dumps(n, default=str)}")

    print("\n✅ KNOWLEDGE GRAPH TEST COMPLETE")
    print("\nCALL LIST:")
    print("  py .\\tools\\knowledge_graph_tool.py")
    print('  py -c "import sys; sys.path.insert(0,\'tools\'); from knowledge_graph_tool import build_marine_knowledge_graph; import json; r=build_marine_knowledge_graph(13.05, 80.30); print(r[\'graph_summary\'])"')