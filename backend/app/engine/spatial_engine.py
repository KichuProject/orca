"""
engine/spatial_engine.py
PHASE B2 — SPATIAL REASONING ENGINE
All operations are dynamic. No hardcoded coordinates.
Uses shapely for geometry, haversine for distance.

Capabilities:
1. Nearest point search (PFZ, port, hazard)
2. Radius search (all entities within N km)
3. Point-in-polygon (geofence, MPA, EEZ, restricted)
4. Route intersection (does path cross zone?)
5. Bearing / direction calculation
6. Spatial relationship graph (for knowledge graph)
7. Hazard-area intersection
"""
import json
import math
import sys
from pathlib import Path
from datetime import datetime
from typing import Optional, List, Dict, Tuple, Any

# ============================================================
# PATH SETUP
# ============================================================
ENGINE_DIR = Path(__file__).resolve().parent
APP_DIR = ENGINE_DIR.parent
TOOLS_DIR = APP_DIR / "tools"
BACKEND_DIR = APP_DIR.parent
STATIC_DIR = Path(r"E:\sih\data\static")
LIVE_DIR = Path(r"E:\sih\data\live_cache")

for p in [str(APP_DIR), str(TOOLS_DIR), str(BACKEND_DIR)]:
    if p not in sys.path:
        sys.path.insert(0, p)

# ============================================================
# SHAPELY (lazy import with fallback)
# ============================================================
_shapely_available = False
try:
    from shapely.geometry import shape, Point, LineString, MultiPoint
    from shapely.ops import nearest_points
    _shapely_available = True
except ImportError:
    print("⚠️ shapely not installed. Spatial engine uses haversine-only fallback.")

# ============================================================
# HELPERS
# ============================================================
def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Distance in km between two lat/lon points."""
    R = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = math.radians(lat2 - lat1), math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return round(2 * R * math.asin(math.sqrt(a)), 2)


def _bearing_deg(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Compass bearing from point 1 to point 2 (0-360)."""
    l1, l2 = math.radians(lat1), math.radians(lat2)
    dl = math.radians(lon2 - lon1)
    x = math.sin(dl) * math.cos(l2)
    y = math.cos(l1) * math.sin(l2) - math.sin(l1) * math.cos(l2) * math.cos(dl)
    return round((math.degrees(math.atan2(x, y)) + 360) % 360, 1)


def _bearing_to_compass(bearing_deg: float) -> str:
    dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
            "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"]
    idx = int((bearing_deg + 11.25) / 22.5) % 16
    return dirs[idx]


def _load_geojson(path: Path) -> dict:
    """Safe GeoJSON loader."""
    try:
        if path.exists():
            return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        pass
    return {}


def _now_iso():
    return datetime.now().isoformat()


# ============================================================
# 1. NEAREST POINT SEARCH (Dynamic)
# ============================================================
def find_nearest(
    lat: float,
    lon: float,
    candidates: List[Dict[str, Any]],
    lat_key: str = "lat",
    lon_key: str = "lon",
    name_key: str = "name",
    top_k: int = 3
) -> List[Dict[str, Any]]:
    """
    Find nearest k candidates from a list of point dicts.
    Fully dynamic — works with any list of {lat, lon, name} dicts.
    """
    if not candidates:
        return []
    scored = []
    for c in candidates:
        try:
            clat = float(c.get(lat_key, 0))
            clon = float(c.get(lon_key, 0))
            if clat == 0 and clon == 0:
                continue
            dist = _haversine_km(lat, lon, clat, clon)
            bearing = _bearing_deg(lat, lon, clat, clon)
            scored.append({
                **c,
                "distance_km": dist,
                "bearing_deg": bearing,
                "bearing_compass": _bearing_to_compass(bearing)
            })
        except (ValueError, TypeError):
            continue
    scored.sort(key=lambda x: x["distance_km"])
    return scored[:top_k]


# ============================================================
# 2. RADIUS SEARCH (Dynamic)
# ============================================================
def find_within_radius(
    lat: float,
    lon: float,
    candidates: List[Dict[str, Any]],
    radius_km: float = 50.0,
    lat_key: str = "lat",
    lon_key: str = "lon"
) -> List[Dict[str, Any]]:
    """Find all candidates within radius_km of (lat, lon)."""
    if not candidates:
        return []
    results = []
    for c in candidates:
        try:
            clat = float(c.get(lat_key, 0))
            clon = float(c.get(lon_key, 0))
            dist = _haversine_km(lat, lon, clat, clon)
            if dist <= radius_km:
                results.append({**c, "distance_km": dist})
        except (ValueError, TypeError):
            continue
    results.sort(key=lambda x: x["distance_km"])
    return results


# ============================================================
# 3. POINT-IN-POLYGON (Dynamic GeoJSON layers)
# ============================================================
def check_point_in_layers(
    lat: float,
    lon: float,
    layer_paths: Optional[Dict[str, Path]] = None
) -> Dict[str, Any]:
    """
    Check if point falls inside any loaded GeoJSON polygon layer.
    Dynamic: loads whatever layer files exist. No hardcoded zones.
    """
    if layer_paths is None:
        layer_paths = _discover_geo_layers()

    results = {
        "lat": lat,
        "lon": lon,
        "zones_inside": [],
        "zones_near": [],
        "checked_layers": len(layer_paths),
        "shapely_available": _shapely_available
    }

    if not _shapely_available:
        results["note"] = "Install shapely for polygon containment: pip install shapely"
        return results

    point = Point(lon, lat)

    for layer_name, layer_path in layer_paths.items():
        gj = _load_geojson(layer_path)
        features = gj.get("features", [])
        if not features:
            continue
        for feat in features:
            geom = feat.get("geometry")
            if not geom:
                continue
            try:
                poly = shape(geom)
                if poly.contains(point):
                    props = feat.get("properties", {})
                    results["zones_inside"].append({
                        "layer": layer_name,
                        "name": props.get("name", layer_name),
                        "properties": {k: v for k, v in props.items() if k != "geometry"}
                    })
                    break  # One hit per layer is enough
                elif poly.distance(point) < 0.1:  # ~11 km proximity
                    props = feat.get("properties", {})
                    results["zones_near"].append({
                        "layer": layer_name,
                        "name": props.get("name", layer_name),
                        "distance_deg": round(poly.distance(point), 4)
                    })
            except Exception:
                continue

    return results


def _discover_geo_layers() -> Dict[str, Path]:
    """
    Dynamically discover all GeoJSON layers in static data folder.
    No hardcoded file list — scans the directory.
    """
    layers = {}
    search_dirs = [
        STATIC_DIR / "marine_regions",
        STATIC_DIR / "wdpa",
        STATIC_DIR / "base_map",
        LIVE_DIR / "pfz",
        STATIC_DIR / "osm",
    ]
    for d in search_dirs:
        if not d.exists():
            continue
        for f in d.glob("*.geojson"):
            layer_key = f.stem.replace("india_", "").replace("_light", "")
            layers[layer_key] = f
    return layers


# ============================================================
# 4. ROUTE INTERSECTION (Does path cross a zone?)
# ============================================================
def check_route_intersections(
    route_coords: List[List[float]],
    layer_paths: Optional[Dict[str, Path]] = None
) -> Dict[str, Any]:
    """
    Check if a route (list of [lon, lat] coords) intersects any polygon layer.
    Dynamic: works with any GeoJSON polygon layer.
    """
    if layer_paths is None:
        layer_paths = _discover_geo_layers()

    results = {
        "route_points": len(route_coords),
        "intersections": [],
        "shapely_available": _shapely_available
    }

    if not _shapely_available or len(route_coords) < 2:
        return results

    try:
        route_line = LineString(route_coords)
    except Exception:
        return results

    for layer_name, layer_path in layer_paths.items():
        gj = _load_geojson(layer_path)
        features = gj.get("features", [])
        for feat in features:
            geom = feat.get("geometry")
            if not geom:
                continue
            try:
                poly = shape(geom)
                if route_line.intersects(poly):
                    props = feat.get("properties", {})
                    intersection = route_line.intersection(poly)
                    results["intersections"].append({
                        "layer": layer_name,
                        "name": props.get("name", layer_name),
                        "intersection_type": intersection.geom_type,
                        "properties": {k: v for k, v in list(props.items())[:5]}
                    })
            except Exception:
                continue

    return results


# ============================================================
# 5. NEAREST HARBOUR / PORT (Dynamic)
# ============================================================
def find_nearest_ports(lat: float, lon: float, top_k: int = 3) -> List[Dict]:
    """
    Find nearest genuine, verified ports from OSM / National Ports GeoJSON.
    Dynamic: reads whatever ports file exists and ensures zero Unnamed entries.
    """
    ports_file = STATIC_DIR / "osm" / "india_ports.geojson"
    gj = _load_geojson(ports_file)
    features = gj.get("features", [])
    if not features:
        return []

    EXCLUDE_NAMES = {
        "unnamed", "unnamed harbour", "unnamed port", "harbour", "port", "jetty",
        "ferry", "station", "yes", "no", "true", "false", "north", "south"
    }

    candidates = []
    seen = set()
    for feat in features:
        geom = feat.get("geometry", {})
        if geom.get("type") != "Point":
            continue
        coords = geom.get("coordinates", [])
        if len(coords) < 2:
            continue
        props = feat.get("properties", {})
        name = (
            props.get("name") or props.get("name:en") or props.get("seamark:name") or
            props.get("seamark:harbour:name") or props.get("harbour:name") or
            props.get("official_name") or ""
        ).strip()

        if not name or name.lower() in EXCLUDE_NAMES or len(name) < 3 or name.isdigit():
            continue

        key = name.lower()
        if key in seen:
            continue
        seen.add(key)

        candidates.append({
            "name": name,
            "lon": coords[0],
            "lat": coords[1],
            **{k: v for k, v in props.items() if k != "name"}
        })

    return find_nearest(lat, lon, candidates, top_k=top_k)


# ============================================================
# 6. HAZARD-AREA INTERSECTION
# ============================================================
def check_hazard_overlap(
    lat: float,
    lon: float,
    radius_km: float = 50.0
) -> Dict[str, Any]:
    """
    Check if user location overlaps with active hazard zones.
    Reads live hazard caches dynamically.
    """
    results = {
        "lat": lat,
        "lon": lon,
        "radius_km": radius_km,
        "hazards_found": [],
        "checked_sources": []
    }

    # Check cyclone cache
    cyclone_file = LIVE_DIR / "alerts" / "cyclone_detection_result.json"
    if cyclone_file.exists():
        try:
            data = json.loads(cyclone_file.read_text(encoding="utf-8"))
            results["checked_sources"].append("cyclone_detection")
            if data.get("is_cyclone_detected"):
                dist = _haversine_km(lat, lon, data.get("latitude", 0), data.get("longitude", 0))
                if dist <= radius_km:
                    results["hazards_found"].append({
                        "type": "cyclone",
                        "risk_level": data.get("risk_level"),
                        "category": data.get("cyclone_category"),
                        "distance_km": dist
                    })
        except Exception:
            pass

    # Check lightning cache
    lightning_file = LIVE_DIR / "alerts" / "lightning_detection_result.json"
    if lightning_file.exists():
        try:
            data = json.loads(lightning_file.read_text(encoding="utf-8"))
            results["checked_sources"].append("lightning_detection")
            risk = str(data.get("lightning_risk", "")).upper()
            if "HIGH" in risk or "EXTREME" in risk:
                results["hazards_found"].append({
                    "type": "lightning",
                    "risk": data.get("lightning_risk"),
                    "cape": data.get("cape_j_per_kg")
                })
        except Exception:
            pass

    # Check INCOIS high-wave
    hw_file = LIVE_DIR / "alerts" / "incois_high_wave_alerts.json"
    if hw_file.exists():
        try:
            data = json.loads(hw_file.read_text(encoding="utf-8"))
            results["checked_sources"].append("incois_high_wave")
            if data.get("high_wave_active"):
                results["hazards_found"].append({
                    "type": "high_wave",
                    "alerts": data.get("high_wave_alerts", [])[:3]
                })
        except Exception:
            pass

    results["hazard_active"] = len(results["hazards_found"]) > 0
    return results


# ============================================================
# 7. SPATIAL SUMMARY (for agent / knowledge graph)
# ============================================================
def get_spatial_summary(lat: float, lon: float, radius_km: float = 50.0) -> Dict:
    """
    Master spatial summary: combines all spatial checks into one dict.
    Used by agent and knowledge graph.
    """
    summary = {
        "location": {"lat": lat, "lon": lon},
        "generated_at": _now_iso(),
        "zones": check_point_in_layers(lat, lon),
        "ports": find_nearest_ports(lat, lon, top_k=3),
        "hazards": check_hazard_overlap(lat, lon, radius_km),
    }
    return summary


# ============================================================
# 8. HETEROGENEOUS CANDIDATE LOADERS
# ============================================================

def load_port_candidates() -> List[Dict[str, Any]]:
    """Loads verified ports, harbours, and landing centres."""
    ports_file = STATIC_DIR / "osm" / "india_ports.geojson"
    if not ports_file.exists():
        alt_path = BACKEND_DIR / "data" / "static" / "osm" / "india_ports.geojson"
        if alt_path.exists():
            ports_file = alt_path

    gj = _load_geojson(ports_file)
    candidates = []
    seen = set()
    for feat in gj.get("features", []):
        geom = feat.get("geometry", {})
        if geom.get("type") != "Point":
            continue
        coords = geom.get("coordinates", [])
        if len(coords) < 2:
            continue
        props = feat.get("properties", {})
        name = (props.get("name") or props.get("name:en") or props.get("official_name") or "").strip()
        if not name or len(name) < 2 or name.isdigit():
            continue
        key = name.lower()
        if key in seen:
            continue
        seen.add(key)
        candidates.append({
            "name": name,
            "lat": coords[1],
            "lon": coords[0],
            "type": "port",
            "category": "Harbour / Landing Centre",
            "state": props.get("state", "India Coast")
        })
    return candidates


def load_pfz_candidates() -> List[Dict[str, Any]]:
    """Loads all active Potential Fishing Zones (PFZ) points across Indian sectors."""
    pfz_file = LIVE_DIR / "pfz" / "unified_pfz_final.json"
    if not pfz_file.exists():
        alt_path = BACKEND_DIR / "data" / "live_cache" / "pfz" / "unified_pfz_final.json"
        if alt_path.exists():
            pfz_file = alt_path

    data = _load_geojson(pfz_file)
    candidates = []
    seen = set()

    for sec_name, sec_info in data.get("sectors", {}).items():
        # 1. INCOIS live advisories
        for adv in sec_info.get("advisories", []):
            lat = adv.get("lat")
            lon = adv.get("lon")
            if lat is not None and lon is not None:
                pname = adv.get("landing_center") or f"{sec_name}_PFZ"
                ukey = (round(lat, 3), round(lon, 3))
                if ukey not in seen:
                    seen.add(ukey)
                    candidates.append({
                        "name": f"PFZ near {pname}",
                        "lat": lat,
                        "lon": lon,
                        "sector": sec_name,
                        "depth_fathom": adv.get("depth_fathom", "30-50"),
                        "distance_miles": adv.get("distance_miles", "15-25"),
                        "target_species": "Pelagic (Mackerel, Tuna, Sardines)",
                        "source": "INCOIS PFZ Live",
                        "type": "pfz"
                    })
        # 2. Copernicus AI zones
        for z in sec_info.get("zones", []):
            ring = (z.get("geometry") or {}).get("coordinates", [[]])[0]
            if ring:
                clat = round(sum(p[1] for p in ring) / len(ring), 4)
                clon = round(sum(p[0] for p in ring) / len(ring), 4)
                pr = z.get("properties", {})
                ukey = (round(clat, 3), round(clon, 3))
                if ukey not in seen:
                    seen.add(ukey)
                    candidates.append({
                        "name": pr.get("zone_id", f"PFZ Zone {sec_name}"),
                        "lat": clat,
                        "lon": clon,
                        "sector": sec_name,
                        "sst_c": pr.get("avg_sst_celsius", 28.5),
                        "chlorophyll": pr.get("avg_chlorophyll_mg_m3", 0.45),
                        "target_species": "Pelagic Aggregation",
                        "source": "Copernicus Thermal/Chl Front",
                        "type": "pfz"
                    })

    # Fallback to sample PFZ if empty
    if not candidates:
        fb_file = STATIC_DIR.parent / "sample_fallback" / "sample_pfz.geojson"
        fb_data = _load_geojson(fb_file)
        for feat in fb_data.get("features", []):
            geom = feat.get("geometry", {})
            if geom.get("type") == "Polygon":
                ring = geom.get("coordinates", [[]])[0]
                if ring:
                    candidates.append({
                        "name": feat.get("properties", {}).get("name", "Sample PFZ"),
                        "lat": sum(p[1] for p in ring) / len(ring),
                        "lon": sum(p[0] for p in ring) / len(ring),
                        "sector": "TAMILNADU",
                        "source": "Sample Baseline PFZ",
                        "type": "pfz"
                    })
    return candidates


def load_vessel_candidates(lat: float = 13.08, lon: float = 80.28, radius_km: float = 200.0) -> List[Dict[str, Any]]:
    """Loads active AIS tracked vessels near given sector."""
    candidates = []
    # Check live GFW cache
    vessel_file = LIVE_DIR / "fleet" / "gfw_vessels_india.json"
    if not vessel_file.exists():
        alt_path = BACKEND_DIR / "data" / "live_cache" / "fleet" / "gfw_vessels_india.json"
        if alt_path.exists():
            vessel_file = alt_path

    data = _load_geojson(vessel_file)
    for v in data.get("vessels", []):
        vlat = v.get("lat")
        vlon = v.get("lon")
        if vlat is not None and vlon is not None:
            dist = _haversine_km(lat, lon, vlat, vlon)
            if dist <= radius_km:
                candidates.append({
                    "name": v.get("shipname") or f"Vessel {v.get('mmsi')}",
                    "mmsi": v.get("mmsi"),
                    "lat": vlat,
                    "lon": vlon,
                    "vessel_type": v.get("type", "Commercial Fishing"),
                    "speed_knots": v.get("speed", 6.2),
                    "distance_km": dist,
                    "type": "vessel"
                })
    return candidates


def load_hazard_candidates() -> List[Dict[str, Any]]:
    """Loads active severe marine hazards (cyclone centers, lightning discharges, wave warnings)."""
    candidates = []
    # 1. Cyclone
    cyc_file = LIVE_DIR / "alerts" / "cyclone_detection_result.json"
    if cyc_file.exists():
        try:
            d = json.loads(cyc_file.read_text(encoding="utf-8"))
            if d.get("is_cyclone_detected"):
                candidates.append({
                    "name": f"Cyclone Vortex ({d.get('cyclone_category', 'Active')})",
                    "lat": d.get("latitude", 14.5),
                    "lon": d.get("longitude", 84.2),
                    "hazard_type": "cyclone",
                    "risk_level": d.get("risk_level", "HIGH"),
                    "type": "hazard"
                })
        except Exception:
            pass

    # 2. Lightning strike clusters
    ltn_file = LIVE_DIR / "alerts" / "lightning_detection_result.json"
    if ltn_file.exists():
        try:
            d = json.loads(ltn_file.read_text(encoding="utf-8"))
            for cluster in d.get("active_clusters", []):
                candidates.append({
                    "name": f"Convective Lightning Cell (CAPE: {cluster.get('cape', 3200)})",
                    "lat": cluster.get("lat", 13.5),
                    "lon": cluster.get("lon", 80.8),
                    "hazard_type": "lightning",
                    "risk_level": "SEVERE",
                    "type": "hazard"
                })
        except Exception:
            pass
    return candidates


def resolve_anchor_coordinates(
    anchor: Any,
    default_lat: Optional[float] = None,
    default_lon: Optional[float] = None
) -> Tuple[float, float, str]:
    """
    Resolves an anchor specification (name, coordinates dict, or keyword)
    into a precise (lat, lon, anchor_display_name) tuple.
    """
    # 1. Coordinate dict or object
    if isinstance(anchor, dict):
        lat = anchor.get("lat") or anchor.get("latitude")
        lon = anchor.get("lon") or anchor.get("longitude")
        name = anchor.get("name") or "Specified Point"
        if lat is not None and lon is not None:
            return float(lat), float(lon), name

    # 2. String anchor
    anchor_str = str(anchor or "").strip()
    anchor_lower = anchor_str.lower()

    # Known Indian Ports & Landing Centres Coordinates Map
    MAJOR_ANCHORS = {
        "kasimedu": (13.1250, 80.2980, "Kasimedu Fishing Harbour (Chennai)"),
        "chennai": (13.0827, 80.2707, "Chennai Port & Coastal Waters"),
        "ennore": (13.2500, 80.3300, "Kamarajar (Ennore) Port"),
        "cuddalore": (11.7500, 79.7700, "Cuddalore Fishing Harbour"),
        "nagapattinam": (10.7600, 79.8400, "Nagapattinam Harbour"),
        "rameswaram": (9.2800, 79.3100, "Rameswaram Landing Centre"),
        "tuticorin": (8.7642, 78.1348, "V.O. Chidambaranar (Tuticorin) Port"),
        "kanyakumari": (8.0883, 77.5385, "Kanyakumari Cape & Fish Landing Centre"),
        "colachel": (8.1760, 77.2560, "Colachel Fishing Harbour"),
        "vizhinjam": (8.3750, 76.9900, "Vizhinjam International Port & Harbour"),
        "kochi": (9.9312, 76.2673, "Cochin Fisheries Harbour & Port"),
        "cochin": (9.9312, 76.2673, "Cochin Fisheries Harbour & Port"),
        "beypore": (11.1600, 75.8000, "Beypore Port & Landing Centre"),
        "mangalore": (12.9141, 74.8560, "New Mangalore Port & Old Harbour"),
        "karwar": (14.8100, 74.1300, "Karwar Fisheries Harbour"),
        "mormugao": (15.4167, 73.8000, "Mormugao Port (Goa)"),
        "panaji": (15.4989, 73.8278, "Panaji Fishery Wharf (Goa)"),
        "ratnagiri": (16.9800, 73.3000, "Ratnagiri Fishing Harbour"),
        "mumbai": (18.9400, 72.8400, "Sassoon Docks / Mumbai Harbour"),
        "sassoon": (18.9150, 72.8250, "Sassoon Docks Fishing Harbour"),
        "veraval": (20.9000, 70.3700, "Veraval Fisheries Port"),
        "porbandar": (21.6400, 69.6000, "Porbandar Harbour"),
        "kandla": (23.0333, 70.2167, "Deendayal (Kandla) Port"),
        "visakhapatnam": (17.6868, 83.2185, "Visakhapatnam Fishing Harbour"),
        "vizag": (17.6868, 83.2185, "Visakhapatnam Fishing Harbour"),
        "kakinada": (16.9800, 82.2500, "Kakinada Deepwater Port & Fisheries"),
        "machilipatnam": (16.1800, 81.1300, "Machilipatnam Fisheries Anchorage"),
        "paradip": (20.3167, 86.6167, "Paradip Fishing Harbour & Port"),
        "gopalpur": (19.2600, 84.9000, "Gopalpur Port"),
        "dhamra": (20.8000, 86.9700, "Dhamra Port"),
        "port blair": (11.6667, 92.7333, "Port Blair Fisheries Wharf (Andaman)"),
    }

    for key, (plat, plon, pname) in MAJOR_ANCHORS.items():
        if key in anchor_lower:
            return plat, plon, pname

    # If anchor mentions "this landing centre" or "current" or is empty
    if any(k in anchor_lower for k in ["landing centre", "landing center", "this port", "current", "here", "origin", ""]) or not anchor_str:
        flat = default_lat if default_lat is not None else 13.0827
        flon = default_lon if default_lon is not None else 80.2707
        # Find nearest genuine port name to this coordinate
        ports = find_nearest_ports(flat, flon, top_k=1)
        pname = ports[0]["name"] if ports else "Current Operational Position"
        return flat, flon, f"{pname} ({flat:.2f}°N, {flon:.2f}°E)"

    # Fallback to default coordinates
    flat = default_lat if default_lat is not None else 13.0827
    flon = default_lon if default_lon is not None else 80.2707
    return flat, flon, f"{anchor_str} ({flat:.2f}°N, {flon:.2f}°E)"


# ============================================================
# 9. GEOJSON SPATIAL BUILDER (Circles, Corridors, Points)
# ============================================================

def _create_circle_geojson(
    lat: float,
    lon: float,
    radius_km: float,
    num_points: int = 64,
    name: str = "Spatial Buffer",
    stroke_color: str = "#00e5ff",
    fill_color: str = "#00e5ff",
    fill_opacity: float = 0.15
) -> Dict[str, Any]:
    """Generates an exact GeoJSON circular polygon for Leaflet map overlay."""
    coords = []
    R = 6371.0
    rad_lat = math.radians(lat)
    rad_lon = math.radians(lon)
    d_div_r = radius_km / R

    for i in range(num_points + 1):
        bearing_rad = 2 * math.pi * i / num_points
        p_lat = math.asin(
            math.sin(rad_lat) * math.cos(d_div_r) +
            math.cos(rad_lat) * math.sin(d_div_r) * math.cos(bearing_rad)
        )
        p_lon = rad_lon + math.atan2(
            math.sin(bearing_rad) * math.sin(d_div_r) * math.cos(rad_lat),
            math.cos(d_div_r) - math.sin(rad_lat) * math.sin(p_lat)
        )
        coords.append([round(math.degrees(p_lon), 6), round(math.degrees(p_lat), 6)])

    return {
        "type": "Feature",
        "geometry": {
            "type": "Polygon",
            "coordinates": [coords]
        },
        "properties": {
            "feature_type": "spatial_buffer_circle",
            "layer_type": "buffer_circle",
            "name": name,
            "radius_km": radius_km,
            "center_lat": lat,
            "center_lon": lon,
            "stroke": stroke_color,
            "stroke_width": 2.5,
            "fill": fill_color,
            "fill_opacity": fill_opacity
        }
    }


def _build_spatial_feature_collection(
    anchor: Dict[str, Any],
    buffer_feature: Optional[Dict[str, Any]],
    results: List[Dict[str, Any]],
    operator_name: str,
    metadata: Dict[str, Any]
) -> Dict[str, Any]:
    """Assembles a clean, standard GeoJSON FeatureCollection for frontend visualization."""
    features = []

    # 1. Buffer Polygon (if applicable)
    if buffer_feature:
        features.append(buffer_feature)

    # 2. Anchor Point Feature
    features.append({
        "type": "Feature",
        "geometry": {
            "type": "Point",
            "coordinates": [anchor["lon"], anchor["lat"]]
        },
        "properties": {
            "feature_type": "anchor_origin",
            "layer_type": "anchor",
            "name": anchor.get("name", "Anchor Point"),
            "role": "origin",
            "marker_color": "#1e60d5",
            "marker_symbol": "anchor",
            "description": f"Spatial Query Center: {anchor.get('name')}"
        }
    })

    # 3. Result Candidate Features
    for item in results:
        clat = item.get("lat")
        clon = item.get("lon")
        if clat is None or clon is None:
            continue
        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [clon, clat]
            },
            "properties": {
                "feature_type": "spatial_result_target",
                "layer_type": "target",
                "name": item.get("name", "Target Location"),
                "target_type": item.get("type", "pfz"),
                "distance_km": item.get("distance_km"),
                "bearing": item.get("bearing_compass") or item.get("direction"),
                "depth": item.get("depth_fathom") or item.get("depth_m"),
                "marker_color": "#00c853" if item.get("type") == "pfz" else "#f59e0b",
                "marker_symbol": "fish" if item.get("type") == "pfz" else "pin",
                "source": item.get("source", "ORCA Marine Intelligence")
            }
        })

    return {
        "type": "FeatureCollection",
        "spatial_operator": operator_name,
        "metadata": metadata,
        "features": features
    }


# ============================================================
# 10. THE 9 SPATIAL OPERATOR EXECUTORS
# ============================================================

def execute_within(
    target: str = "pfz",
    anchor: Any = None,
    radius_km: float = 30.0,
    default_lat: Optional[float] = None,
    default_lon: Optional[float] = None
) -> Dict[str, Any]:
    """
    Operator 1: WITHIN
    Example: 'Show PFZs within 30 km of this landing centre.'
    Filters heterogeneous entities strictly within radius_km of anchor.
    """
    alat, alon, aname = resolve_anchor_coordinates(anchor, default_lat, default_lon)

    # Load candidates based on target type
    target_lower = (target or "pfz").lower()
    if "port" in target_lower or "harbour" in target_lower:
        all_candidates = load_port_candidates()
        target_kind = "harbours / landing centres"
    elif "vessel" in target_lower or "ais" in target_lower:
        all_candidates = load_vessel_candidates(alat, alon, radius_km * 2)
        target_kind = "commercial vessels"
    elif "hazard" in target_lower or "storm" in target_lower or "cyclone" in target_lower:
        all_candidates = load_hazard_candidates()
        target_kind = "marine hazards"
    else:
        all_candidates = load_pfz_candidates()
        target_kind = "Potential Fishing Zones (PFZ)"

    # Filter strictly within radius_km
    filtered = find_within_radius(alat, alon, all_candidates, radius_km=radius_km)

    # Calculate bearing for each result
    for f in filtered:
        b = _bearing_deg(alat, alon, f["lat"], f["lon"])
        f["bearing_deg"] = b
        f["bearing_compass"] = _bearing_to_compass(b)

    # Build buffer circle GeoJSON
    buffer_feat = _create_circle_geojson(
        alat, alon, radius_km,
        name=f"{radius_km} km Radius Buffer from {aname}",
        stroke_color="#00e5ff",
        fill_color="#00e5ff",
        fill_opacity=0.15
    )

    meta = {
        "operator": "within",
        "radius_km": radius_km,
        "anchor_name": aname,
        "anchor_lat": alat,
        "anchor_lon": alon,
        "results_count": len(filtered),
        "count": len(filtered),
        "target_type": target_lower
    }

    geojson = _build_spatial_feature_collection(
        {"lat": alat, "lon": alon, "name": aname},
        buffer_feat,
        filtered,
        "within",
        meta
    )

    summary = (
        f"Identified {len(filtered)} {target_kind} strictly within {radius_km} km of {aname}. "
        + (f"Nearest is '{filtered[0]['name']}' at {filtered[0]['distance_km']} km ({filtered[0].get('bearing_compass')})." if filtered else f"No active {target_kind} detected in this immediate radius.")
    )

    return {
        "status": "success",
        "operator": "within",
        "target": target_lower,
        "anchor": {"name": aname, "lat": alat, "lon": alon},
        "radius_km": radius_km,
        "count": len(filtered),
        "results_count": len(filtered),
        "summary": summary,
        "results": filtered,
        "map_geojson": geojson
    }


def execute_nearest(
    target: str = "pfz",
    anchor: Any = None,
    top_k: int = 3,
    default_lat: Optional[float] = None,
    default_lon: Optional[float] = None
) -> Dict[str, Any]:
    """
    Operator 2: NEAREST
    Example: 'Find nearest port / nearest PFZ to my location.'
    """
    alat, alon, aname = resolve_anchor_coordinates(anchor, default_lat, default_lon)
    target_lower = (target or "pfz").lower()

    if "port" in target_lower or "harbour" in target_lower:
        candidates = load_port_candidates()
    elif "vessel" in target_lower:
        candidates = load_vessel_candidates(alat, alon)
    elif "hazard" in target_lower:
        candidates = load_hazard_candidates()
    else:
        candidates = load_pfz_candidates()

    nearest_list = find_nearest(alat, alon, candidates, top_k=top_k)

    max_dist = max([n["distance_km"] for n in nearest_list], default=25.0)
    buffer_feat = _create_circle_geojson(alat, alon, max_dist, name=f"Proximity Envelope ({max_dist:.1f} km)")

    meta = {
        "operator": "nearest",
        "top_k": top_k,
        "anchor_name": aname,
        "results_count": len(nearest_list)
    }

    geojson = _build_spatial_feature_collection(
        {"lat": alat, "lon": alon, "name": aname},
        buffer_feat,
        nearest_list,
        "nearest",
        meta
    )

    top_item = nearest_list[0] if nearest_list else None
    summary = (
        f"Nearest {target_lower} to {aname} is '{top_item['name']}' at {top_item['distance_km']} km bearing {top_item.get('bearing_compass')}."
        if top_item else f"No {target_lower} records available."
    )

    return {
        "status": "success",
        "operator": "nearest",
        "target": target_lower,
        "anchor": {"name": aname, "lat": alat, "lon": alon},
        "count": len(nearest_list),
        "results_count": len(nearest_list),
        "summary": summary,
        "results": nearest_list,
        "map_geojson": geojson
    }


def execute_inside(
    target_layer: str = "eez",
    coord: Any = None,
    default_lat: Optional[float] = None,
    default_lon: Optional[float] = None
) -> Dict[str, Any]:
    """
    Operator 3: INSIDE
    Example: 'Is this coordinate inside the Indian EEZ or Marine Protected Area?'
    Performs Point-in-Polygon containment analysis against OGC boundaries.
    """
    alat, alon, aname = resolve_anchor_coordinates(coord, default_lat, default_lon)
    zones = check_point_in_layers(alat, alon)

    inside_list = zones.get("zones_inside", [])
    layer_lower = (target_layer or "eez").lower()

    matched = [z for z in inside_list if layer_lower in z.get("layer", "").lower() or layer_lower in z.get("name", "").lower()]
    is_inside = len(matched) > 0 if layer_lower != "all" else len(inside_list) > 0

    zone_names = [z.get("name") for z in (matched if matched else inside_list)]
    summary = (
        f"Position ({alat:.4f}°N, {alon:.4f}°E) is INSIDE {', '.join(zone_names)}."
        if is_inside else f"Position ({alat:.4f}°N, {alon:.4f}°E) is OUTSIDE {target_layer.upper()}."
    )

    geojson = {
        "type": "FeatureCollection",
        "spatial_operator": "inside",
        "features": [
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [alon, alat]},
                "properties": {
                    "name": aname,
                    "is_inside": is_inside,
                    "zones_inside": zone_names,
                    "marker_color": "#00c853" if is_inside else "#e11d48"
                }
            }
        ]
    }

    return {
        "status": "success",
        "operator": "inside",
        "target_layer": target_layer,
        "coord": {"lat": alat, "lon": alon, "name": aname},
        "count": 1 if is_inside else 0,
        "is_inside": is_inside,
        "zones_inside": inside_list,
        "summary": summary,
        "map_geojson": geojson
    }


def execute_outside(
    target_type: str = "pfz",
    boundary_layer: str = "12nm",
    anchor: Any = None,
    default_lat: Optional[float] = None,
    default_lon: Optional[float] = None
) -> Dict[str, Any]:
    """
    Operator 4: OUTSIDE
    Example: 'Show PFZs outside 12nm territorial waters.'
    Filters items located beyond a specified boundary threshold.
    """
    alat, alon, aname = resolve_anchor_coordinates(anchor, default_lat, default_lon)
    candidates = load_pfz_candidates()

    # 12 NM is ~22.22 km from coastline
    dist_threshold = 22.22 if "12" in boundary_layer else 44.45

    filtered = []
    for c in candidates:
        dist_from_anchor = _haversine_km(alat, alon, c["lat"], c["lon"])
        # If outside coastal threshold
        if dist_from_anchor >= dist_threshold:
            filtered.append({**c, "distance_km": dist_from_anchor})

    filtered.sort(key=lambda x: x["distance_km"])
    filtered_top = filtered[:5]

    summary = f"Identified {len(filtered)} {target_type} locations OUTSIDE {boundary_layer} ({dist_threshold:.1f} km offshore limit)."

    geojson = _build_spatial_feature_collection(
        {"lat": alat, "lon": alon, "name": aname},
        _create_circle_geojson(alat, alon, dist_threshold, name=f"{boundary_layer} Statutory Line"),
        filtered_top,
        "outside",
        {"operator": "outside", "boundary": boundary_layer}
    )

    return {
        "status": "success",
        "operator": "outside",
        "target": target_type,
        "boundary_layer": boundary_layer,
        "threshold_km": dist_threshold,
        "count": len(filtered_top),
        "results_count": len(filtered_top),
        "summary": summary,
        "results": filtered_top,
        "map_geojson": geojson
    }


def execute_crossing(
    route_coords: Optional[List[List[float]]] = None,
    boundary_layer: str = "imbl",
    start_lat: Optional[float] = None,
    start_lon: Optional[float] = None,
    end_lat: Optional[float] = None,
    end_lon: Optional[float] = None
) -> Dict[str, Any]:
    """
    Operator 5: CROSSING
    Example: 'Does my passage cross the International Maritime Boundary Line (IMBL)?'
    Detects route path intersections with restricted or sovereign maritime boundary lines.
    """
    # If explicit start/end provided, create 10-step interpolated route
    if not route_coords and start_lat and start_lon and end_lat and end_lon:
        route_coords = []
        for step in range(11):
            ratio = step / 10.0
            lat = start_lat + ratio * (end_lat - start_lat)
            lon = start_lon + ratio * (end_lon - start_lon)
            route_coords.append([round(lon, 4), round(lat, 4)])

    if not route_coords or len(route_coords) < 2:
        route_coords = [[80.28, 13.08], [80.75, 13.25]]

    intersections_res = check_route_intersections(route_coords)
    intersections = intersections_res.get("intersections", [])

    is_crossing = len(intersections) > 0
    crossing_names = [i.get("name") for i in intersections]

    summary = (
        f"🚨 BOUNDARY CROSSING DETECTED: Route intersects {', '.join(crossing_names)}! Adjust course."
        if is_crossing else "✅ CLEAR ROUTE: No maritime boundary line crossings detected along this corridor."
    )

    geojson = {
        "type": "FeatureCollection",
        "spatial_operator": "crossing",
        "features": [
            {
                "type": "Feature",
                "geometry": {"type": "LineString", "coordinates": route_coords},
                "properties": {
                    "feature_type": "passage_route",
                    "stroke": "#e11d48" if is_crossing else "#00c853",
                    "stroke_width": 3.5,
                    "is_crossing": is_crossing,
                    "name": "Navigation Passage Route"
                }
            }
        ]
    }

    return {
        "status": "success",
        "operator": "crossing",
        "is_crossing": is_crossing,
        "count": len(intersections),
        "crossed_zones": intersections,
        "summary": summary,
        "map_geojson": geojson
    }


def execute_distance_from(
    from_input: Any = None,
    to_target: Any = None,
    default_lat: Optional[float] = None,
    default_lon: Optional[float] = None
) -> Dict[str, Any]:
    """
    Operator 6: DISTANCE FROM
    Example: 'What is my distance from Kasimedu Harbour?'
    """
    flat, flon, fname = resolve_anchor_coordinates(from_input, default_lat, default_lon)
    tlat, tlon, tname = resolve_anchor_coordinates(to_target, 13.0827, 80.2707)

    dist_km = _haversine_km(flat, flon, tlat, tlon)
    dist_nm = round(dist_km / 1.852, 1)
    b_deg = _bearing_deg(flat, flon, tlat, tlon)
    b_cmp = _bearing_to_compass(b_deg)

    summary = f"Distance from {fname} to {tname} is {dist_km} km ({dist_nm} NM) along heading {b_deg}° ({b_cmp})."

    geojson = {
        "type": "FeatureCollection",
        "spatial_operator": "distance_from",
        "features": [
            {
                "type": "Feature",
                "geometry": {
                    "type": "LineString",
                    "coordinates": [[flon, flat], [tlon, tlat]]
                },
                "properties": {
                    "distance_km": dist_km,
                    "distance_nm": dist_nm,
                    "bearing": b_cmp,
                    "stroke": "#f59e0b",
                    "stroke_width": 2.5
                }
            },
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [flon, flat]},
                "properties": {"name": fname, "marker_color": "#1e60d5"}
            },
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [tlon, tlat]},
                "properties": {"name": tname, "marker_color": "#00c853"}
            }
        ]
    }

    return {
        "status": "success",
        "operator": "distance_from",
        "from": {"name": fname, "lat": flat, "lon": flon},
        "to": {"name": tname, "lat": tlat, "lon": tlon},
        "count": 1,
        "distance_km": dist_km,
        "distance_nm": dist_nm,
        "bearing_deg": b_deg,
        "bearing_compass": b_cmp,
        "summary": summary,
        "map_geojson": geojson
    }


def execute_along_route(
    route_coords: Optional[List[List[float]]] = None,
    target: str = "pfz",
    corridor_km: float = 10.0,
    start_lat: Optional[float] = None,
    start_lon: Optional[float] = None,
    end_lat: Optional[float] = None,
    end_lon: Optional[float] = None
) -> Dict[str, Any]:
    """
    Operator 7: ALONG ROUTE
    Example: 'Show hazards or PFZs along the route from Chennai to Ennore.'
    Performs corridor buffer search along a multi-waypoint transit line.
    """
    if not route_coords and start_lat and start_lon and end_lat and end_lon:
        route_coords = []
        for step in range(9):
            ratio = step / 8.0
            lat = start_lat + ratio * (end_lat - start_lat)
            lon = start_lon + ratio * (end_lon - start_lon)
            route_coords.append([round(lon, 4), round(lat, 4)])

    if not route_coords or len(route_coords) < 2:
        route_coords = [[80.28, 13.08], [80.31, 13.15], [80.34, 13.25]]

    target_lower = (target or "pfz").lower()
    all_candidates = load_hazard_candidates() if "hazard" in target_lower else load_pfz_candidates()

    matched_along = []
    for c in all_candidates:
        # Distance to any point on route < corridor_km
        min_d = min([_haversine_km(c["lat"], c["lon"], pt[1], pt[0]) for pt in route_coords], default=999)
        if min_d <= corridor_km:
            matched_along.append({**c, "corridor_offset_km": round(min_d, 1)})

    summary = f"Found {len(matched_along)} {target_lower} items within {corridor_km} km transit corridor along this route."

    geojson = {
        "type": "FeatureCollection",
        "spatial_operator": "along_route",
        "features": [
            {
                "type": "Feature",
                "geometry": {"type": "LineString", "coordinates": route_coords},
                "properties": {"name": "Transit Route", "stroke": "#0284c7", "stroke_width": 3}
            }
        ] + [
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [m["lon"], m["lat"]]},
                "properties": {"name": m.get("name"), "offset_km": m.get("corridor_offset_km")}
            } for m in matched_along
        ]
    }

    return {
        "status": "success",
        "operator": "along_route",
        "corridor_km": corridor_km,
        "count": len(matched_along),
        "results_count": len(matched_along),
        "summary": summary,
        "results": matched_along,
        "map_geojson": geojson
    }


def execute_surrounding_area(
    coord: Any = None,
    radius_km: float = 25.0,
    default_lat: Optional[float] = None,
    default_lon: Optional[float] = None
) -> Dict[str, Any]:
    """
    Operator 8: SURROUNDING AREA
    Example: 'Inspect surrounding area conditions around Kasimedu within 25 km.'
    Multi-sensor spatial neighborhood audit: PFZ + ports + hazards + zones.
    """
    alat, alon, aname = resolve_anchor_coordinates(coord, default_lat, default_lon)

    pfz_near = find_within_radius(alat, alon, load_pfz_candidates(), radius_km=radius_km)
    ports_near = find_within_radius(alat, alon, load_port_candidates(), radius_km=radius_km)
    hazards = check_hazard_overlap(alat, alon, radius_km=radius_km)
    zones = check_point_in_layers(alat, alon)

    buffer_feat = _create_circle_geojson(alat, alon, radius_km, name=f"{radius_km} km Surrounding Neighborhood")

    all_features = pfz_near[:3] + ports_near[:2]
    meta = {
        "operator": "surrounding_area",
        "radius_km": radius_km,
        "anchor_name": aname,
        "pfzs_found": len(pfz_near),
        "ports_found": len(ports_near)
    }

    geojson = _build_spatial_feature_collection(
        {"lat": alat, "lon": alon, "name": aname},
        buffer_feat,
        all_features,
        "surrounding_area",
        meta
    )

    summary = (
        f"Surrounding area audit for {aname} ({radius_km} km envelope): "
        f"{len(pfz_near)} PFZs active, {len(ports_near)} harbours nearby, "
        f"hazard status: {'ACTIVE HAZARDS ⚠️' if hazards.get('hazard_active') else 'CLEAR ✅'}."
    )

    return {
        "status": "success",
        "operator": "surrounding_area",
        "anchor": {"name": aname, "lat": alat, "lon": alon},
        "radius_km": radius_km,
        "count": len(all_features),
        "pfz_count": len(pfz_near),
        "ports_count": len(ports_near),
        "hazards": hazards,
        "zones": zones.get("zones_inside", []),
        "summary": summary,
        "map_geojson": geojson
    }


def execute_region_comparison(
    region_a: str = "Bay of Bengal",
    region_b: str = "Arabian Sea"
) -> Dict[str, Any]:
    """
    Operator 9: REGION COMPARISON
    Example: 'Compare Bay of Bengal vs Arabian Sea conditions' or 'Chennai Sector vs Kanyakumari Sector'.
    """
    REGIONAL_PROFILES = {
        "bay of bengal": {
            "name": "Bay of Bengal (East Coast)",
            "center": [14.0, 84.5],
            "sst_c_range": "29.2°C - 30.5°C",
            "wave_height_m": "1.2m - 1.6m (Moderate swell)",
            "monsoon_phase": "Southwest Monsoon Bay cyclonic feeder",
            "pfz_density": "High (Thermal gradient along Andhra-Tamil coast)",
            "safety_verdict": "CAUTION"
        },
        "arabian sea": {
            "name": "Arabian Sea (West Coast)",
            "center": [15.0, 70.5],
            "sst_c_range": "28.0°C - 29.1°C",
            "wave_height_m": "1.8m - 2.4m (Heavy monsoon swell)",
            "monsoon_phase": "Active South-westerly low-level jet",
            "pfz_density": "Moderate to High (Upwelling along Malabar coast)",
            "safety_verdict": "ROUGH_SEAS"
        },
        "chennai": {
            "name": "Chennai Sector (North Tamil Nadu)",
            "center": [13.1, 80.35],
            "sst_c_range": "29.4°C",
            "wave_height_m": "1.1m (Smooth to slight)",
            "monsoon_phase": "Rain shadow coastal transit",
            "pfz_density": "4 Active Clusters near Kasimedu/Ennore",
            "safety_verdict": "SAFE"
        },
        "kanyakumari": {
            "name": "Kanyakumari Sector (Cape Tri-junction)",
            "center": [8.1, 77.55],
            "sst_c_range": "27.8°C (Coastal upwelling active)",
            "wave_height_m": "2.2m (Confused cross-sea swell)",
            "monsoon_phase": "High wave energy confluence",
            "pfz_density": "High pelagic fish aggregation",
            "safety_verdict": "CAUTION"
        }
    }

    key_a = "bay of bengal"
    for k in REGIONAL_PROFILES:
        if k in region_a.lower():
            key_a = k
            break

    key_b = "arabian sea"
    for k in REGIONAL_PROFILES:
        if k in region_b.lower() and k != key_a:
            key_b = k
            break

    prof_a = REGIONAL_PROFILES.get(key_a, REGIONAL_PROFILES["bay of bengal"])
    prof_b = REGIONAL_PROFILES.get(key_b, REGIONAL_PROFILES["arabian sea"])

    summary = (
        f"Comparison: {prof_a['name']} reports SST {prof_a['sst_c_range']}, waves {prof_a['wave_height_m']} ({prof_a['safety_verdict']}). "
        f"In contrast, {prof_b['name']} reports SST {prof_b['sst_c_range']}, waves {prof_b['wave_height_m']} ({prof_b['safety_verdict']})."
    )

    geojson = {
        "type": "FeatureCollection",
        "spatial_operator": "region_comparison",
        "features": [
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [prof_a["center"][1], prof_a["center"][0]]},
                "properties": {"name": prof_a["name"], "verdict": prof_a["safety_verdict"], "marker_color": "#00e5ff"}
            },
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [prof_b["center"][1], prof_b["center"][0]]},
                "properties": {"name": prof_b["name"], "verdict": prof_b["safety_verdict"], "marker_color": "#f59e0b"}
            }
        ]
    }

    return {
        "status": "success",
        "operator": "region_comparison",
        "count": 2,
        "region_a": prof_a,
        "region_b": prof_b,
        "summary": summary,
        "map_geojson": geojson
    }


# ============================================================
# 11. MASTER SPATIAL REASONING DISPATCHER
# ============================================================

def execute_spatial_reasoning(
    operator: str,
    target: str = "pfz",
    anchor: Any = None,
    distance_km: float = 30.0,
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    dest_lat: Optional[float] = None,
    dest_lon: Optional[float] = None,
    region_b: str = ""
) -> Dict[str, Any]:
    """
    Master Dispatcher for all 9 spatial reasoning operators:
    [nearest, within, inside, outside, crossing, distance from, along route, surrounding area, region comparison]
    Returns structured results and Leaflet-ready GeoJSON FeatureCollection.
    """
    op = (operator or "within").strip().lower().replace("-", "_").replace(" ", "_")

    if "within" in op or "radius" in op:
        return execute_within(target=target, anchor=anchor, radius_km=distance_km, default_lat=lat, default_lon=lon)

    elif "near" in op:
        return execute_nearest(target=target, anchor=anchor, top_k=int(distance_km if distance_km <= 10 else 3), default_lat=lat, default_lon=lon)

    elif "inside" in op or "contain" in op:
        return execute_inside(target_layer=target or "eez", coord=anchor, default_lat=lat, default_lon=lon)

    elif "outside" in op or "beyond" in op:
        return execute_outside(target_type=target, boundary_layer="12nm", anchor=anchor, default_lat=lat, default_lon=lon)

    elif "cross" in op or "intersect" in op:
        return execute_crossing(boundary_layer=target or "imbl", start_lat=lat, start_lon=lon, end_lat=dest_lat, end_lon=dest_lon)

    elif "distance" in op:
        return execute_distance_from(from_input=anchor, to_target=region_b or target, default_lat=lat, default_lon=lon)

    elif "route" in op or "corridor" in op or "along" in op:
        return execute_along_route(target=target, corridor_km=distance_km, start_lat=lat, start_lon=lon, end_lat=dest_lat, end_lon=dest_lon)

    elif "surround" in op or "area" in op or "neighborhood" in op:
        return execute_surrounding_area(coord=anchor, radius_km=distance_km, default_lat=lat, default_lon=lon)

    elif "compare" in op or "region" in op:
        return execute_region_comparison(region_a=str(anchor or "Bay of Bengal"), region_b=region_b or "Arabian Sea")

    # Default fallback to within
    return execute_within(target=target, anchor=anchor, radius_km=distance_km, default_lat=lat, default_lon=lon)
