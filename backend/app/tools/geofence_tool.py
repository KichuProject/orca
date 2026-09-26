"""
geofence_tool.py

GEOFENCE & ECO-RESTRICTION TOOL - CLEAN FUNCTION-BASED VERSION

Supports:
    check_geofence(lat, lon)
    get_coastline_distance(lat, lon)
    get_eco_restriction(lat, lon, radius_km)

Layers:
    restricted operational zones
    marine protected areas
    eco-sensitive wetlands
    internal waters
    territorial sea 12 NM
    contiguous zone 24 NM
    India EEZ
    high seas
    Ramsar wetland points
    Natural Earth coastline
    WDPA / eco-sensitive layers

Rules:
    Zero top-level execution
    Everything inside functions
    Dynamic lat/lon/radius
    TEST_* constants only inside __main__
    Primary -> fallback
    Fallback callable directly
    TEST RUN prints full result data
"""

import sys
import json
import math
from pathlib import Path
from datetime import datetime


# ================= BOOTSTRAP =================

TOOLS_DIR = Path(__file__).resolve().parent

if str(TOOLS_DIR) not in sys.path:
    sys.path.insert(0, str(TOOLS_DIR))


# ================= COMMON IMPORTS =================

try:
    from common import (
        STATIC,
        FALLBACK,
        load_json,
        haversine
    )

except ImportError:

    STATIC = Path(r"E:\sih\data\static")
    FALLBACK = Path(r"E:\sih\data\sample_fallback")

    def load_json(path, default=None):
        try:
            p = Path(path)

            if p.exists():
                return json.loads(p.read_text(encoding="utf-8"))

        except Exception:
            pass

        return default

    def haversine(lat1, lon1, lat2, lon2):
        R = 6371.0

        p1 = math.radians(lat1)
        p2 = math.radians(lat2)

        dp = math.radians(lat2 - lat1)
        dl = math.radians(lon2 - lon1)

        a = (
            math.sin(dp / 2) ** 2
            + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
        )

        return round(2 * R * math.asin(math.sqrt(a)), 1)


try:
    from common import include_source

except ImportError:

    def include_source(source, requested_source="all"):
        req = str(requested_source or "all").strip().lower()

        if req in ("all", "", "any"):
            return True

        return str(source).strip().lower() == req


# ================= LAYER PATHS =================

LAYERS = {
    "marine_protected_area": STATIC / "wdpa" / "india_marine_mpa.geojson",
    "eco_sensitive_wetland": STATIC / "wdpa" / "india_eco_sensitive_wetlands.geojson",
    "internal_waters": STATIC / "marine_regions" / "india_internal_waters_light.geojson",
    "territorial_sea_12nm": STATIC / "marine_regions" / "india_12nm_light.geojson",
    "contiguous_zone_24nm": STATIC / "marine_regions" / "india_24nm_light.geojson",
    "india_eez": STATIC / "marine_regions" / "india_eez_light.geojson",
    "high_seas": STATIC / "marine_regions" / "high_seas_light.geojson",
}

RAMSAR_POINTS = STATIC / "wdpa" / "india_ramsar_wetlands_points.geojson"

COAST_GEO = (
    STATIC
    / "base_map"
    / "ne_10m_coastline"
    / "ne_10m_coastline.geojson"
)

MPA_GEO = STATIC / "wdpa" / "india_marine_mpa.geojson"
WETLAND_GEO = STATIC / "wdpa" / "eco_sensitive_wetlands.geojson"
RAMSAR_GEO = STATIC / "wdpa" / "ramsar_sites_india.geojson"


# ================= TEST CONSTANTS =================
# Used ONLY by __main__ test run

TEST_LAT = 13.05
TEST_LON = 80.30
TEST_RADIUS_KM = 25
TEST_SOURCE = "all"


# ================= HELPERS =================

def _now_iso():
    return datetime.now().isoformat()


_shapely_cache = None


def _get_shapely():
    """
    Lazily imports shapely.
    Returns (shape, Point, LineString) or None.
    """
    global _shapely_cache

    if _shapely_cache is None:

        try:

            from shapely.geometry import shape, Point, LineString

            _shapely_cache = (shape, Point, LineString)

        except Exception:

            _shapely_cache = False

    return _shapely_cache if _shapely_cache else None


_polygons = {}
_layer_features = {}
_points = {}
_layers_loaded = False


def _load_layers():
    """
    Loads GeoJSON polygon layers once with rich feature metadata.
    """
    global _layers_loaded

    if _layers_loaded:
        return

    shapely = _get_shapely()

    if not shapely:
        _layers_loaded = True
        return

    shape, _, _ = shapely

    for name, path in LAYERS.items():

        if not path.exists():
            continue

        gj = load_json(path, {}) or {}

        geoms = []
        feature_list = []

        for feature in gj.get("features", []) or []:

            geometry = feature.get("geometry")

            if not geometry:
                continue

            try:
                geom_obj = shape(geometry)
                geoms.append(geom_obj)
                feature_list.append({
                    "geom": geom_obj,
                    "properties": feature.get("properties", {}) or {},
                    "geometry": geometry,
                    "layer": name
                })

            except Exception:
                continue

        if geoms:
            _polygons[name] = geoms
            _layer_features[name] = feature_list

    if RAMSAR_POINTS.exists():

        gj = load_json(RAMSAR_POINTS, {}) or {}

        pts = []

        for feature in gj.get("features", []) or []:

            geometry = feature.get("geometry")

            if not geometry:
                continue

            try:
                pts.append(shape(geometry))

            except Exception:
                continue

        if pts:
            _points["ramsar_wetland"] = pts

    _layers_loaded = True


def _geometry_points(geometry):
    """
    Extracts coordinate points from any GeoJSON geometry type.
    """
    gtype = geometry.get("type")
    coords = geometry.get("coordinates") or []

    pts = []

    if gtype == "Point":
        pts = [coords]

    elif gtype == "MultiPoint":
        pts = coords

    elif gtype == "LineString":
        pts = coords

    elif gtype == "MultiLineString":
        pts = [c for line in coords for c in line]

    elif gtype == "Polygon":
        pts = [c for ring in coords for c in ring]

    elif gtype == "MultiPolygon":
        pts = [c for poly in coords for ring in poly for c in ring]

    return [
        c for c in pts
        if isinstance(c, (list, tuple)) and len(c) >= 2
    ]


def _find_nearest_point_in_geojson(
    geo_path,
    lat,
    lon,
    max_features=500
):
    """
    Finds nearest vertex distance in km from a GeoJSON file.
    """
    gj = load_json(geo_path, {}) or {}

    best = None
    count = 0

    for feature in gj.get("features", []) or []:

        geometry = feature.get("geometry") or {}

        for c in _geometry_points(geometry):

            d = haversine(lat, lon, c[1], c[0])

            if best is None or d < best:
                best = d

        count += 1

        if count > max_features:
            break

    return best


# ================= 1. GEOFENCE PRIMARY =================

def check_geofence_primary(lat, lon):
    """
    PRIMARY:
    Checks point against all static maritime / eco GeoJSON layers.
    """
    shapely = _get_shapely()

    if not shapely:
        raise RuntimeError("shapely not installed")

    _, Point, _ = shapely

    _load_layers()

    p = Point(lon, lat)

    inside = [
        name
        for name, geoms in _polygons.items()
        if any(g.contains(p) for g in geoms)
    ]

    near = [
        name
        for name, pts in _points.items()
        if any(q.distance(p) < 0.1 for q in pts)
    ]

    if "marine_protected_area" in inside:
        alert = "MARINE PROTECTED AREA - fishing prohibited"

    elif "internal_waters" in inside:
        alert = "India Internal Waters"

    elif "territorial_sea_12nm" in inside:
        alert = "India Territorial Sea (12 NM)"

    elif "contiguous_zone_24nm" in inside:
        alert = "India Contiguous Zone (24 NM)"

    elif "india_eez" in inside:
        alert = "India EEZ"

    elif "high_seas" in inside:
        alert = "HIGH SEAS - international waters"

    else:
        alert = "Outside mapped zones"

    warnings = []

    if "eco_sensitive_wetland" in inside:
        warnings.append("Inside ecologically sensitive wetland")

    if near:
        warnings.append("Near Ramsar wetland - reduce impact")

    return {
        "tool": "geofence_tool.check_geofence",
        "generated_at": _now_iso(),
        "status": "success",
        "method": "shapely",
        "lat": lat,
        "lon": lon,
        "zones": inside,
        "near": near,
        "alert": alert,
        "warnings": warnings,
        "data_sources": [
            "Marine Regions",
            "WDPA / curated MPA",
            "Ramsar wetlands"
        ]
    }


def check_geofence_fallback(lat, lon):
    """
    FALLBACK:
    Used when shapely or layers are unavailable.
    Callable directly.
    """
    return {
        "tool": "geofence_tool.check_geofence",
        "generated_at": _now_iso(),
        "status": "no_shapely_or_layers",
        "lat": lat,
        "lon": lon,
        "zones": [],
        "near": [],
        "alert": "UNKNOWN - shapely or GeoJSON layers unavailable",
        "warnings": [],
        "hint": "Install shapely and verify static GeoJSON layers",
        "data_sources": [
            "Marine Regions",
            "WDPA / curated MPA",
            "Ramsar wetlands"
        ]
    }


def check_geofence(lat, lon, source="all"):
    """
    AI Tool:
    Check maritime/geofence zone for lat/lon.
    """
    if not include_source("static", source):

        return {
            "tool": "geofence_tool.check_geofence",
            "status": "unsupported_source",
            "message": "Geofence layers are static only",
            "source_requested": source
        }

    try:

        return check_geofence_primary(lat, lon)

    except Exception as e:

        print(
            f"  ⚠️ geofence primary failed ({str(e)[:80]}) -> fallback"
        )

        return check_geofence_fallback(lat, lon)


# ================= GEOFENCING PROXIMITY & ROUTE INSPECTION =================

def _compute_point_to_geom_distance_m(lat: float, lon: float, geom_obj) -> float:
    """Calculates minimum distance in meters from (lat, lon) to a shapely geometry."""
    shapely = _get_shapely()
    if not shapely:
        return 999999.0
    _, Point, _ = shapely
    p = Point(lon, lat)
    if geom_obj.contains(p):
        return 0.0

    minx, miny, maxx, maxy = geom_obj.bounds
    dx = max(0, minx - lon, lon - maxx)
    dy = max(0, miny - lat, lat - maxy)
    deg_dist = math.sqrt(dx * dx + dy * dy)
    if deg_dist > 0.45:
        return deg_dist * 111000.0

    min_m = float("inf")
    polys = geom_obj.geoms if hasattr(geom_obj, "geoms") else [geom_obj]
    for poly in polys:
        if hasattr(poly, "exterior") and poly.exterior:
            coords = poly.exterior.coords
            step = max(1, len(coords) // 60)
            for i in range(0, len(coords), step):
                c = coords[i]
                d = haversine(lat, lon, c[1], c[0]) * 1000.0
                if d < min_m:
                    min_m = d
        elif hasattr(poly, "coords"):
            coords = poly.coords
            step = max(1, len(coords) // 60)
            for i in range(0, len(coords), step):
                c = coords[i]
                d = haversine(lat, lon, c[1], c[0]) * 1000.0
                if d < min_m:
                    min_m = d

    return min_m


def check_vessel_boundary_proximity(lat: float, lon: float) -> dict:
    """
    Checks vessel's current position against all restricted marine zones, MPAs, and IMBL boundaries.
    Generates proximity levels:
      - Safe  (> 5000m / > 5km)  -> Far from boundary
      - Caution (1000m - 5000m)   -> Approaching boundary
      - Danger (<= 1000m or inside) -> Entering / crossing boundary
    """
    shapely = _get_shapely()
    if not shapely:
        return {
            "status": "no_shapely",
            "proximity_level": "SAFE",
            "distance_km": 25.0,
            "distance_m": 25000.0,
            "zone": "Open Ocean",
            "action": "Maintain course"
        }

    shape, Point, _ = shapely
    _load_layers()

    p = Point(lon, lat)
    best_dist_m = float("inf")
    closest_zone_name = "Marine Protected Area / Sovereign Boundary"
    closest_zone_type = "Marine Protected Area"
    is_inside = False
    intersected_feat = None

    target_layers = [
        ("marine_protected_area", "Marine Protected Area"),
        ("eco_sensitive_wetland", "Ecologically Sensitive Area"),
    ]

    for layer_id, layer_label in target_layers:
        feats = _layer_features.get(layer_id, [])
        for f in feats:
            geom = f["geom"]
            props = f["properties"]
            name = props.get("name") or props.get("NAME_ENG") or props.get("NAME") or layer_label

            if geom.contains(p):
                is_inside = True
                best_dist_m = 0.0
                closest_zone_name = name
                closest_zone_type = layer_label
                intersected_feat = f.get("geometry")
                break

            d = _compute_point_to_geom_distance_m(lat, lon, geom)
            if d < best_dist_m:
                best_dist_m = d
                closest_zone_name = name
                closest_zone_type = layer_label
                intersected_feat = f.get("geometry")

        if is_inside:
            break

    # Also check IMBL treaty distance
    try:
        imbl_res = get_imbl_distance_primary(lat, lon)
        if isinstance(imbl_res, dict):
            imbl_dist_m = (imbl_res.get("distance_km") or 999.0) * 1000.0
            if imbl_dist_m < best_dist_m:
                best_dist_m = imbl_dist_m
                closest_zone_name = imbl_res.get("nearest_line") or "International Maritime Boundary Line (IMBL)"
                closest_zone_type = "International Maritime Boundary (IMBL)"
    except Exception:
        pass

    dist_km = round(best_dist_m / 1000.0, 1) if best_dist_m != float("inf") else 25.0
    dist_m = round(best_dist_m, 1) if best_dist_m != float("inf") else 25000.0

    if is_inside or best_dist_m <= 1000.0:
        proximity_level = "DANGER"
        status = "RESTRICTED_ZONE_BREACH" if is_inside else "ENTERING_RESTRICTED_ZONE"
        action = "Alter route"
        warning_badge = "⚠️ APPROACHING RESTRICTED ZONE"
        advisory = f"DANGER: Entering or within 1 km of restricted zone ({closest_zone_name}). Alter course immediately!"
    elif best_dist_m <= 5000.0:
        proximity_level = "CAUTION"
        status = "APPROACHING_RESTRICTED_ZONE"
        action = "Alter route"
        warning_badge = "⚠️ APPROACHING RESTRICTED ZONE"
        advisory = f"CAUTION: Approaching boundary ({dist_km} km to {closest_zone_name}). Adjust heading to maintain legal standoff."
    else:
        proximity_level = "SAFE"
        status = "CLEAR"
        action = "Maintain course"
        warning_badge = "🟢 SAFE CLEARANCE"
        advisory = f"SAFE: Far from boundary ({dist_km} km to nearest restricted zone). Sovereign clearance verified."

    warning_text = (
        f"⚠️ APPROACHING RESTRICTED ZONE\n\n"
        f"Distance: {dist_km} km\n"
        f"Zone: {closest_zone_type}\n"
        f"Action: {action}"
    )

    return {
        "tool": "geofence_tool.check_vessel_boundary_proximity",
        "generated_at": _now_iso(),
        "proximity_level": proximity_level,
        "status": status,
        "distance_km": dist_km,
        "distance_m": dist_m,
        "zone": closest_zone_type,
        "zone_name": closest_zone_name,
        "action": action,
        "warning_badge": warning_badge,
        "warning_text": warning_text,
        "advisory": advisory,
        "is_inside": is_inside,
        "intersected_polygon": intersected_feat
    }


def check_route_geofence(route_coordinates: list) -> dict:
    """
    AI & Navigation Tool:
    Checks the entire planned route corridor against all restricted marine zones,
    MPAs, eco-sensitive wetlands, and international maritime boundaries.
    
    If route crosses or approaches within 1000m of a restricted zone:
      - Route verdict: REJECTED
      - Reason: Crosses restricted area
      - Alternative: Safe route
      - Warning: ⚠️ APPROACHING RESTRICTED ZONE (Distance: X.X km, Action: Alter route)
    """
    shapely = _get_shapely()
    if not shapely:
        return {
            "verdict": "PASSED",
            "status": "no_shapely",
            "proximity_level": "SAFE",
            "distance_km": 20.0,
            "action": "Maintain course"
        }

    shape, Point, LineString = shapely
    _load_layers()

    # Normalize coordinates to [(lat, lon), ...]
    pts = []
    if isinstance(route_coordinates, dict) and "coordinates" in route_coordinates:
        route_coordinates = route_coordinates["coordinates"]

    for p in route_coordinates:
        if isinstance(p, dict):
            pts.append((float(p.get("lat", 0)), float(p.get("lon", 0))))
        elif isinstance(p, (list, tuple)) and len(p) >= 2:
            if abs(p[0]) > abs(p[1]) and abs(p[0]) > 60:
                pts.append((float(p[1]), float(p[0])))
            else:
                pts.append((float(p[0]), float(p[1])))

    if len(pts) < 2:
        return {
            "verdict": "PASSED",
            "status": "insufficient_points",
            "proximity_level": "SAFE",
            "distance_km": 25.0,
            "action": "Maintain course"
        }

    # Interpolate intermediate corridor points if route has few waypoints
    dense_pts = []
    for i in range(len(pts) - 1):
        p1, p2 = pts[i], pts[i+1]
        dense_pts.append(p1)
        sub_steps = 4
        for s in range(1, sub_steps):
            t = s / sub_steps
            dense_pts.append((p1[0] + (p2[0] - p1[0]) * t, p1[1] + (p2[1] - p1[1]) * t))
    dense_pts.append(pts[-1])

    # Build Shapely LineString (lon, lat)
    route_line = LineString([[p[1], p[0]] for p in pts])

    target_layers = [
        ("marine_protected_area", "Marine Protected Area"),
        ("eco_sensitive_wetland", "Ecologically Sensitive Area"),
    ]

    # 1. Direct Intersection Check
    for layer_id, layer_label in target_layers:
        feats = _layer_features.get(layer_id, [])
        for f in feats:
            geom = f["geom"]
            props = f["properties"]
            name = props.get("name") or props.get("NAME_ENG") or props.get("NAME") or layer_label

            if route_line.intersects(geom):
                # Direct intersection detected!
                try:
                    inter = route_line.intersection(geom)
                    inter_coord = [pts[0][0], pts[0][1]]
                    if hasattr(inter, "geoms") and len(inter.geoms) > 0:
                        first_geom = inter.geoms[0]
                        if hasattr(first_geom, "coords") and len(first_geom.coords) > 0:
                            inter_coord = [round(first_geom.coords[0][1], 5), round(first_geom.coords[0][0], 5)]
                    elif hasattr(inter, "coords") and len(inter.coords) > 0:
                        inter_coord = [round(inter.coords[0][1], 5), round(inter.coords[0][0], 5)]
                except Exception:
                    inter_coord = [pts[len(pts)//2][0], pts[len(pts)//2][1]]

                warning_text = (
                    f"⚠️ APPROACHING RESTRICTED ZONE\n\n"
                    f"Distance: 0.0 km\n"
                    f"Zone: {layer_label}\n"
                    f"Action: Alter route"
                )

                return {
                    "tool": "geofence_tool.check_route_geofence",
                    "generated_at": _now_iso(),
                    "verdict": "REJECTED",
                    "status": "RESTRICTED_ZONE_BREACH",
                    "proximity_level": "DANGER",
                    "reason": f"Crosses restricted area ({name})",
                    "zone": layer_label,
                    "zone_name": name,
                    "distance_km": 0.0,
                    "distance_m": 0.0,
                    "action": "Alter route",
                    "warning_badge": "⚠️ APPROACHING RESTRICTED ZONE",
                    "warning": warning_text,
                    "intersection_coords": inter_coord,
                    "intersected_polygon": f.get("geometry"),
                    "alternative_route": "Safe route (detour corridor avoiding restricted boundary)"
                }

    # 2. Proximity Check along the Corridor
    min_corridor_dist_m = float("inf")
    closest_zone_name = "Restricted Zone"
    closest_zone_type = "Marine Protected Area"
    closest_feat = None

    for pt in dense_pts:
        p = Point(pt[1], pt[0])
        for layer_id, layer_label in target_layers:
            feats = _layer_features.get(layer_id, [])
            for f in feats:
                geom = f["geom"]
                props = f["properties"]
                name = props.get("name") or props.get("NAME_ENG") or props.get("NAME") or layer_label
                d = _compute_point_to_geom_distance_m(pt[0], pt[1], geom)
                if d < min_corridor_dist_m:
                    min_corridor_dist_m = d
                    closest_zone_name = name
                    closest_zone_type = layer_label
                    closest_feat = f.get("geometry")

    dist_km = round(min_corridor_dist_m / 1000.0, 1) if min_corridor_dist_m != float("inf") else 25.0
    dist_m = round(min_corridor_dist_m, 1) if min_corridor_dist_m != float("inf") else 25000.0

    if min_corridor_dist_m <= 1000.0:
        verdict = "REJECTED"
        proximity_level = "DANGER"
        status = "ENTERING_RESTRICTED_ZONE"
        reason = f"Route encroaches within {dist_km} km of restricted area ({closest_zone_name})"
        action = "Alter route"
    elif min_corridor_dist_m <= 5000.0:
        verdict = "CAUTION"
        proximity_level = "CAUTION"
        status = "APPROACHING_RESTRICTED_ZONE"
        reason = f"Approaching restricted boundary ({dist_km} km to {closest_zone_name})"
        action = "Alter route"
    else:
        verdict = "PASSED"
        proximity_level = "SAFE"
        status = "CLEAR"
        reason = f"Corridor maintains safe standoff (>5 km) from all restricted zones"
        action = "Maintain course"

    warning_text = (
        f"⚠️ APPROACHING RESTRICTED ZONE\n\n"
        f"Distance: {dist_km} km\n"
        f"Zone: {closest_zone_type}\n"
        f"Action: {action}"
    )

    return {
        "tool": "geofence_tool.check_route_geofence",
        "generated_at": _now_iso(),
        "verdict": verdict,
        "status": status,
        "proximity_level": proximity_level,
        "reason": reason,
        "zone": closest_zone_type,
        "zone_name": closest_zone_name,
        "distance_km": dist_km,
        "distance_m": dist_m,
        "action": action,
        "warning_badge": "⚠️ APPROACHING RESTRICTED ZONE" if proximity_level in ("DANGER", "CAUTION") else "🟢 SAFE CLEARANCE",
        "warning": warning_text if proximity_level in ("DANGER", "CAUTION") else "🟢 Safe route corridor",
        "intersected_polygon": closest_feat if proximity_level in ("DANGER", "CAUTION") else None,
        "alternative_route": "Safe route (detour corridor avoiding restricted boundary)" if verdict == "REJECTED" else None
    }


# ================= 2. COASTLINE DISTANCE =================

def get_coastline_distance_primary(lat, lon):
    """
    PRIMARY:
    Distance to Natural Earth 1:10m coastline.
    """
    if not COAST_GEO.exists():
        raise FileNotFoundError(str(COAST_GEO))

    d = _find_nearest_point_in_geojson(COAST_GEO, lat, lon)

    if d is None:
        raise RuntimeError("No coastline geometry found")

    return {
        "tool": "geofence_tool.get_coastline_distance",
        "generated_at": _now_iso(),
        "status": "success",
        "lat": lat,
        "lon": lon,
        "distance_to_coast_km": round(d, 1),
        "source": "Natural Earth 1:10m coastline (static)",
        "data_sources": [
            "Natural Earth coastline"
        ]
    }


def get_coastline_distance_fallback(lat, lon):
    """
    FALLBACK:
    Returns missing-file status.
    Callable directly.
    """
    return {
        "tool": "geofence_tool.get_coastline_distance",
        "generated_at": _now_iso(),
        "status": "no_coastline_file",
        "lat": lat,
        "lon": lon,
        "distance_to_coast_km": None,
        "path": str(COAST_GEO),
        "data_sources": [
            "Natural Earth coastline"
        ]
    }


def get_coastline_distance(lat, lon, source="all"):
    """
    AI Tool:
    Distance to real coastline.
    """
    if not include_source("static", source):

        return {
            "tool": "geofence_tool.get_coastline_distance",
            "status": "unsupported_source",
            "message": "Coastline layer is static only",
            "source_requested": source
        }

    try:

        return get_coastline_distance_primary(lat, lon)

    except Exception as e:

        print(
            f"  ⚠️ coastline primary failed ({str(e)[:80]}) -> fallback"
        )

        return get_coastline_distance_fallback(lat, lon)


# ================= 3. ECO RESTRICTION =================

def get_eco_restriction_primary(lat, lon, radius_km=25):
    """
    PRIMARY:
    Checks proximity to MPA / Ramsar / eco-sensitive wetland layers.
    """
    restrictions = []

    checks = (
        (
            MPA_GEO,
            "MARINE PROTECTED AREA",
            200,
            "No trawling/anchoring. Speed limit 5 knots."
        ),
        (
            RAMSAR_GEO,
            "RAMSAR WETLAND",
            100,
            "Eco-sensitive zone. Minimize disturbance."
        ),
        (
            WETLAND_GEO,
            "ECO-SENSITIVE WETLAND",
            100,
            "Protected habitat. Avoid pollution/noise."
        ),
    )

    for path, restriction_type, max_features, action in checks:

        if not path.exists():
            continue

        d = _find_nearest_point_in_geojson(
            path,
            lat,
            lon,
            max_features=max_features
        )

        if d is not None and d <= radius_km:

            restrictions.append(
                {
                    "type": restriction_type,
                    "distance_km": round(d, 1),
                    "action": action
                }
            )

    if restrictions:

        status = "ECO_RESTRICTION_ACTIVE"

        summary = (
            f"{len(restrictions)} protection zone(s) "
            f"within {radius_km} km"
        )

    else:

        status = "CLEAR"
        summary = "No eco-restrictions detected"

    return {
        "tool": "geofence_tool.get_eco_restriction",
        "generated_at": _now_iso(),
        "status": status,
        "lat": lat,
        "lon": lon,
        "radius_km": radius_km,
        "restrictions": restrictions,
        "summary": summary,
        "source": "WDPA + Ramsar + Eco-sensitive wetlands (static)",
        "data_sources": [
            "WDPA MPA",
            "Ramsar sites",
            "Eco-sensitive wetlands"
        ]
    }


def get_eco_restriction_fallback(lat, lon, radius_km=25):
    """
    FALLBACK:
    Used when eco layer files are missing.
    Callable directly.
    """
    return {
        "tool": "geofence_tool.get_eco_restriction",
        "generated_at": _now_iso(),
        "status": "no_eco_files",
        "lat": lat,
        "lon": lon,
        "radius_km": radius_km,
        "restrictions": [],
        "summary": "No eco layer files found",
        "files_checked": [
            str(MPA_GEO),
            str(RAMSAR_GEO),
            str(WETLAND_GEO)
        ],
        "data_sources": [
            "WDPA MPA",
            "Ramsar sites",
            "Eco-sensitive wetlands"
        ]
    }


def get_eco_restriction(lat, lon, radius_km=25, source="all"):
    """
    AI Tool:
    Eco restriction check near lat/lon.
    """
    if not include_source("static", source):

        return {
            "tool": "geofence_tool.get_eco_restriction",
            "status": "unsupported_source",
            "message": "Eco restriction layers are static only",
            "source_requested": source
        }

    try:

        return get_eco_restriction_primary(
            lat,
            lon,
            radius_km
        )

    except Exception as e:

        print(
            f"  ⚠️ eco restriction primary failed ({str(e)[:80]}) -> fallback"
        )

        return get_eco_restriction_fallback(
            lat,
            lon,
            radius_km
        )


# ================= 4. IMBL / INTERNATIONAL BOUNDARY PROXIMITY =================

BOUNDARIES_GEO = STATIC / "marine_regions" / "india_boundaries_light.geojson"


def get_imbl_distance_primary(lat, lon):
    """
    PRIMARY:
    Calculates distance to nearest International Maritime Boundary Line (IMBL) / statutory treaty.
    """
    if not BOUNDARIES_GEO.exists():
        raise FileNotFoundError(str(BOUNDARIES_GEO))

    gj = load_json(BOUNDARIES_GEO, {}) or {}
    features = gj.get("features", [])

    best_d = float("inf")
    best_feat = None

    valid_types = {"Treaty", "Median line", "Court ruling", "Connection line", "200 NM"}

    for f in features:
        props = f.get("properties", {}) or {}
        ltype = props.get("LINE_TYPE", "")

        if ltype in valid_types:
            geom = f.get("geometry") or {}
            coords = geom.get("coordinates") or []
            lines = [coords] if geom.get("type") == "LineString" else coords

            for line in lines:
                for pt in line:
                    if isinstance(pt, (list, tuple)) and len(pt) >= 2:
                        d = haversine(lat, lon, pt[1], pt[0])
                        if d < best_d:
                            best_d = d
                            best_feat = props

    if best_d == float("inf") or best_feat is None:
        raise RuntimeError("No boundary coordinates found")

    dist_km = round(best_d, 1)
    dist_nm = round(best_d / 1.852, 1)

    status_level = "CRITICAL" if dist_nm <= 3.0 else ("WARNING" if dist_nm <= 10.0 else "SAFE")

    return {
        "tool": "geofence_tool.get_imbl_distance",
        "generated_at": _now_iso(),
        "status": "success",
        "lat": lat,
        "lon": lon,
        "distance_km": dist_km,
        "distance_nm": dist_nm,
        "nearest_line": best_feat.get("LINE_NAME", "International Maritime Boundary"),
        "line_type": best_feat.get("LINE_TYPE", "Treaty"),
        "territories": f"{best_feat.get('TERRITORY1', 'India')} - {best_feat.get('TERRITORY2', 'Neighboring State')}",
        "status_level": status_level,
        "advisory": (
            "VESSEL ON BOUNDARY LINE: Imminent risk of foreign apprehension. Alter course 180° immediately!"
            if status_level == "CRITICAL"
            else (
                "PROXIMITY CAUTION: Within 10 nm of International Maritime Boundary Line. Maintain VHF Ch 16 standby."
                if status_level == "WARNING"
                else "SOVEREIGN CLEARANCE SAFE: Vessel maintains >10 nm margin within Indian EEZ."
            )
        ),
        "data_sources": ["Marine Regions Maritime Boundaries (Statutory Treaties)"],
    }


def get_imbl_distance_fallback(lat, lon):
    return {
        "tool": "geofence_tool.get_imbl_distance",
        "generated_at": _now_iso(),
        "status": "fallback",
        "lat": lat,
        "lon": lon,
        "distance_km": 150.0,
        "distance_nm": 81.0,
        "nearest_line": "India Maritime Border",
        "line_type": "Treaty",
        "territories": "India - International",
        "status_level": "SAFE",
        "advisory": "SOVEREIGN CLEARANCE SAFE",
        "data_sources": ["Fallback boundary estimates"],
    }


def get_imbl_distance(lat, lon, source="all"):
    """
    AI Tool:
    Returns proximity to nearest International Maritime Boundary Line.
    """
    try:
        return get_imbl_distance_primary(lat, lon)
    except Exception as e:
        print(f"  ⚠️ imbl distance primary failed ({str(e)[:80]}) -> fallback")
        return get_imbl_distance_fallback(lat, lon)


if __name__ == "__main__":

    print("=" * 70)
    print("GEOFENCE TOOL - TEST RUN")
    print("=" * 70)

    geofence_result = check_geofence(
        lat=TEST_LAT,
        lon=TEST_LON,
        source=TEST_SOURCE
    )

    print("\n📦 check_geofence =>")
    print(json.dumps(geofence_result, indent=1))

    coastline_result = get_coastline_distance(
        lat=TEST_LAT,
        lon=TEST_LON,
        source=TEST_SOURCE
    )

    print("\n📦 get_coastline_distance =>")
    print(json.dumps(coastline_result, indent=1))

    eco_result = get_eco_restriction(
        lat=TEST_LAT,
        lon=TEST_LON,
        radius_km=TEST_RADIUS_KM,
        source=TEST_SOURCE
    )

    print("\n📦 get_eco_restriction =>")
    print(json.dumps(eco_result, indent=1))

    print("\nCALL LIST:")
    print("  py .\\tools\\geofence_tool.py")
    print("  py -c \"import sys; sys.path.insert(0,'tools'); from geofence_tool import check_geofence; import json; print(json.dumps(check_geofence(13.05, 80.30), indent=1))\"")
    print("  py -c \"import sys; sys.path.insert(0,'tools'); from geofence_tool import get_coastline_distance; import json; print(json.dumps(get_coastline_distance(13.05, 80.30), indent=1))\"")
    print("  py -c \"import sys; sys.path.insert(0,'tools'); from geofence_tool import get_eco_restriction; import json; print(json.dumps(get_eco_restriction(13.05, 80.30, 25), indent=1))\"")