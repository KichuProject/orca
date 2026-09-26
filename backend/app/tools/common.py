"""
common.py

SHARED CONFIG + UTILITIES FOR ALL TOOLS

Contains:
    1. Project paths
    2. Coast constants
    3. JSON load/save helpers
    4. Distance / bearing helpers
    5. Source normalization for source="all"/"isro"/"copernicus"
    6. MOSDAC NetCDF point readers
    7. Bhuvan LULC district reader

Rules:
    No tool logic here
    No fetcher logic here
    No heavy top-level execution
    Only shared helpers and constants
"""

import json
import math
import os
from pathlib import Path
from datetime import datetime


# ================= PATHS =================

ROOT = Path(__file__).resolve().parent.parent.parent.parent
if not (ROOT / "data").exists():
    ROOT = Path(r"E:\sih")

BACKEND = Path(__file__).resolve().parent.parent

STATIC = ROOT / "data" / "static"
LIVE = ROOT / "data" / "live_cache"
FALLBACK = ROOT / "data" / "sample_fallback"
MOSDAC = LIVE / "mosdac"


# ================= COASTS =================

COASTS = {
    "Chennai": (13.0827, 80.2707),
    "Kochi": (9.9312, 76.2673),
    "Mumbai": (19.0760, 72.8777),
    "Visakhapatnam": (17.6868, 83.2185),
    "Port_Blair": (11.6230, 92.7265),
    "Haldia": (21.7800, 88.0600),
    "Tuticorin": (8.7642, 78.1348),
    "Mangalore": (12.9141, 74.8560),
}


# ================= SOURCE NORMALIZATION =================

SOURCE_ALIASES = {
    "mosdac": "isro",
    "isro_mosdac": "isro",
    "insat": "isro",
    "insat_3ds": "isro",
    "oceansat": "isro",
    "eos06": "isro",

    "eonet": "nasa",
    "nasa_eonet": "nasa",

    "ibtracs": "noaa",
    "noaa_ncei": "noaa",

    "open_meteo": "openmeteo",
    "openmeteo_marine": "openmeteo",

    "copernicus_marine": "copernicus",
    "cmems": "copernicus",

    "global_fishing_watch": "gfw",

    "harmonics": "harmonic",
    "harmonic_tide": "harmonic",
}

VALID_SOURCES = {
    "all",
    "copernicus",
    "isro",
    "incois",
    "imd",
    "openmeteo",
    "nasa",
    "noaa",
    "obis",
    "gfw",
    "fsi",
    "bhuvan",
    "fao",
    "static",
    "harmonic",
}


def normalize_source(source="all"):
    """
    Normalizes source names.

    Examples:
        MOSDAC -> isro
        EONET -> nasa
        Copernicus Marine -> copernicus
    """
    s = str(source or "all").strip().lower()
    s = s.replace("-", "_").replace(" ", "_")

    return SOURCE_ALIASES.get(s, s)


def include_source(source, requested_source="all"):
    """
    Returns True if this source should be included.

    requested_source="all" -> include everything
    requested_source="isro" -> include only ISRO
    """
    req = normalize_source(requested_source)

    if req in ("all", "", "any"):
        return True

    return normalize_source(source) == req


def add_backend_to_path():
    """
    Adds backend folder to sys.path so tools can import fetchers.
    Call this inside tool files if needed.
    """
    import sys

    backend = str(BACKEND)

    if backend not in sys.path:
        sys.path.insert(0, backend)

    return backend


# ================= JSON HELPERS =================

def load_json(path, default=None):
    """
    Safe JSON loader.
    Returns default if file missing or invalid.
    """
    try:
        p = Path(path)

        if p.exists():
            return json.loads(p.read_text(encoding="utf-8"))

    except Exception:
        pass

    return default


def save_json(path, data, indent=1):
    """
    Safe JSON saver.
    Creates parent folders automatically.
    """
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)

    p.write_text(
        json.dumps(data, indent=indent, ensure_ascii=False),
        encoding="utf-8"
    )

    return p


def clean(obj):
    """
    Recursively strips whitespace from dict keys and string values.
    """
    if isinstance(obj, dict):
        return {
            str(k).strip(): clean(v)
            for k, v in obj.items()
        }

    if isinstance(obj, list):
        return [clean(v) for v in obj]

    if isinstance(obj, str):
        return obj.strip()

    return obj


def now_iso():
    return datetime.now().isoformat()


# ================= GEO HELPERS =================

def haversine(lat1, lon1, lat2, lon2):
    """
    Distance in km between two lat/lon points.
    """
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


def bearing(lat1, lon1, lat2, lon2):
    """
    Compass direction from point 1 to point 2.
    """
    l1 = math.radians(lat1)
    l2 = math.radians(lat2)
    dl = math.radians(lon2 - lon1)

    x = math.sin(dl) * math.cos(l2)
    y = (
        math.cos(l1) * math.sin(l2)
        - math.sin(l1) * math.cos(l2) * math.cos(dl)
    )

    dirs = [
        "N", "NNE", "NE", "ENE",
        "E", "ESE", "SE", "SSE",
        "S", "SSW", "SW", "WSW",
        "W", "WNW", "NW", "NNW"
    ]

    idx = int(
        (math.degrees(math.atan2(x, y)) + 360 + 11.25) / 22.5
    ) % 16

    return dirs[idx]


def nearest_coast(lat, lon):
    """
    Returns nearest major coast from COASTS dict.
    """
    name = min(
        COASTS,
        key=lambda c: haversine(lat, lon, COASTS[c][0], COASTS[c][1])
    )

    dist = haversine(
        lat,
        lon,
        COASTS[name][0],
        COASTS[name][1]
    )

    return name, dist


# ================= MOSDAC / ISRO NETCDF READERS =================

_MOSDAC_OFFSETS = None


def _get_mosdac_offsets():
    """
    Search spiral offsets for land-masked / NaN satellite pixels.
    """
    global _MOSDAC_OFFSETS

    if _MOSDAC_OFFSETS is None:

        offsets = [(0.0, 0.0)]

        d = 0.25

        while d <= 2.01:

            for a in (d, -d):
                offsets.extend([
                    (a, 0.0),
                    (0.0, a),
                    (a, a),
                    (a, -a),
                ])

            d += 0.25

        _MOSDAC_OFFSETS = offsets

    return _MOSDAC_OFFSETS


def _md_latest(subfolder, exts=(".nc", ".nc4", ".h5")):
    """
    Returns latest MOSDAC file inside a subfolder.
    """
    base = Path(subfolder)

    if not base.is_absolute():
        base = MOSDAC / subfolder

    if not base.exists():
        return None

    candidates = []

    for ext in exts:
        candidates.extend(base.rglob(f"*{ext}"))

    if not candidates:
        return None

    return sorted(
        candidates,
        key=lambda p: p.stat().st_mtime
    )[-1]


def _md_coords(ds):
    """
    Detects latitude/longitude coordinate names in NetCDF dataset.
    """
    lat_name = next(
        (
            c for c in ("lat", "latitude", "LAT", "Latitude")
            if c in ds.coords
        ),
        None
    )

    lon_name = next(
        (
            c for c in ("lon", "longitude", "LON", "Longitude")
            if c in ds.coords
        ),
        None
    )

    return lat_name, lon_name


def md_read_point(subfolder, lat, lon, var_candidates=()):
    """
    Reads one MOSDAC NetCDF variable at lat/lon.
    NaN-safe with spiral search.
    """
    try:
        import xarray as xr

    except ImportError:
        return {
            "status": "no_xarray",
            "error": "xarray is not installed"
        }

    f = _md_latest(subfolder)

    if not f:
        return {
            "status": "no_file",
            "subfolder": str(subfolder)
        }

    try:
        ds = xr.open_dataset(f)

        lat_name, lon_name = _md_coords(ds)

        if not lat_name or not lon_name:
            ds.close()
            return {
                "status": "no_coords",
                "file": f.name
            }

        var = next(
            (v for v in var_candidates if v in ds.data_vars),
            None
        )

        if var is None:
            if not ds.data_vars:
                ds.close()
                return {
                    "status": "no_variables",
                    "file": f.name
                }

            var = list(ds.data_vars)[0]

        value = None
        used_offset = None

        for dlat, dlon in _get_mosdac_offsets():

            try:
                point = ds[var].sel(
                    {
                        lat_name: lat + dlat,
                        lon_name: lon + dlon
                    },
                    method="nearest"
                )

                arr = point.values.flatten()

                if arr.size == 0:
                    continue

                v = float(arr[-1])

            except Exception:
                continue

            # NaN check
            if v == v:
                value = v
                used_offset = (dlat, dlon)
                break

        ds.close()

        if value is None:
            return {
                "status": "all_nan",
                "file": f.name,
                "variable": var
            }

        return {
            "status": "ok",
            "file": f.name,
            "variable": var,
            "value": value,
            "sample_offset_deg": used_offset
        }

    except Exception as e:
        return {
            "status": "error",
            "error": str(e)[:120]
        }


def md_read_uv(subfolder, lat, lon):
    """
    Reads u/v vector variable from MOSDAC NetCDF.
    Works for wind or currents.
    """
    try:
        import xarray as xr

    except ImportError:
        return {
            "status": "no_xarray",
            "error": "xarray is not installed"
        }

    f = _md_latest(subfolder)

    if not f:
        return {
            "status": "no_file",
            "subfolder": str(subfolder)
        }

    try:
        ds = xr.open_dataset(f)

        lat_name, lon_name = _md_coords(ds)

        if not lat_name or not lon_name:
            ds.close()
            return {
                "status": "no_coords",
                "file": f.name
            }

        u_candidates = (
            "u",
            "U",
            "uo",
            "uwnd",
            "UWND",
            "water_u",
            "eastward_sea_water_velocity"
        )

        v_candidates = (
            "v",
            "V",
            "vo",
            "vwnd",
            "VWND",
            "water_v",
            "northward_sea_water_velocity"
        )

        u_var = next(
            (v for v in u_candidates if v in ds.data_vars),
            None
        )

        v_var = next(
            (v for v in v_candidates if v in ds.data_vars),
            None
        )

        if not u_var or not v_var:
            ds.close()
            return {
                "status": "no_uv",
                "file": f.name,
                "variables": list(ds.data_vars)
            }

        u = None
        v = None
        used_offset = None

        for dlat, dlon in _get_mosdac_offsets():

            try:
                tu = float(
                    ds[u_var].sel(
                        {
                            lat_name: lat + dlat,
                            lon_name: lon + dlon
                        },
                        method="nearest"
                    ).values.flatten()[-1]
                )

                tv = float(
                    ds[v_var].sel(
                        {
                            lat_name: lat + dlat,
                            lon_name: lon + dlon
                        },
                        method="nearest"
                    ).values.flatten()[-1]
                )

            except Exception:
                continue

            if tu == tu and tv == tv:
                u = tu
                v = tv
                used_offset = (dlat, dlon)
                break

        ds.close()

        if u is None or v is None:
            return {
                "status": "all_nan",
                "file": f.name
            }

        speed = math.sqrt(u * u + v * v)

        direction = (
            math.degrees(math.atan2(u, v)) + 360
        ) % 360

        return {
            "status": "ok",
            "file": f.name,
            "u": round(u, 2),
            "v": round(v, 2),
            "speed_ms": round(speed, 2),
            "direction_deg": round(direction, 1),
            "sample_offset_deg": used_offset
        }

    except Exception as e:
        return {
            "status": "error",
            "error": str(e)[:120]
        }


# ================= BHUVAN LULC =================

BHUVAN_LULC_URL = "https://bhuvan-app1.nrsc.gov.in/api/lulc/curljson.php"

try:
    from dotenv import load_dotenv
    load_dotenv(ROOT / "backend" / ".env")
except Exception:
    pass

BHUVAN_TOKEN = os.getenv("BHUVAN_LULC_TOKEN", "")

SECTOR_TO_DISTRICTS = {
    "GUJARAT": [
        "2401", "2410", "2411", "2412",
        "2414", "2422", "2425"
    ],

    "MAHARASHTRA": [
        "2722", "2723", "2721",
        "2724", "2732", "2733"
    ],

    "GOA": [
        "3001",  # North Goa
        "3002"   # South Goa
    ],

    "KARNATAKA": [
        "2910", "2916", "2924"
    ],

    "KERALA": [
        "3201", "3202", "3204",
        "3208", "3211", "3214"
    ],

    "SOUTH_TAMILNADU": [
        "3330", "3328", "3329", "3327"
    ],

    "NORTH_TAMILNADU": [
        "3302", "3301", "3303",
        "3318", "3319"
    ],

    "SOUTH_ANDHRA": [
        "2819", "2816", "2817", "2818"
    ],

    "NORTH_ANDHRA": [
        "2811", "2812", "2813", "2814"
    ],

    "ODISHA": [
        "2119", "2118", "2111",
        "2110", "2108"
    ],

    "WEST_BENGAL": [
        "1915", "1918", "1911"
    ],

    "ANDAMAN": [
        "3501",  # North & Middle Andaman
        "3502"   # South Andaman
    ],

    "NICOBAR": [
        "3503"   # Nicobar
    ],

    "LAKSHADWEEP": [
        "3101"   # Lakshadweep
    ],
}


def _to_float(value):
    try:
        return float(str(value).replace(",", "").strip() or 0)

    except Exception:
        return 0.0


def get_lulc_stats(distcode, year="1112"):
    """
    Fetches Bhuvan LULC stats for one district.
    """
    import requests

    if not BHUVAN_TOKEN:
        return None

    try:
        params = {
            "distcode": distcode,
            "year": year,
            "token": BHUVAN_TOKEN
        }

        r = requests.get(
            BHUVAN_LULC_URL,
            params=params,
            timeout=20
        )

        if r.status_code != 200:
            return None

        text = r.text.strip()

        if not text.startswith("{"):
            return None

        d = r.json()

        return {
            "name": d.get("name", distcode),
            "total_km2": _to_float(d.get("totalarea")),
            "mangrove_km2": _to_float(d.get("l12")),
            "coastal_wetland_km2": _to_float(d.get("l21")),
            "inland_wetland_km2": _to_float(d.get("l20")),
            "forest_km2": (
                _to_float(d.get("l08"))
                + _to_float(d.get("l09"))
                + _to_float(d.get("l10"))
                + _to_float(d.get("l11"))
            )
        }

    except Exception:
        return None

def _is_positive_lulc(stats):
    """
    Returns True only if Bhuvan returned meaningful non-zero LULC stats.
    """
    if not stats:
        return False

    keys = (
        "total_km2",
        "mangrove_km2",
        "coastal_wetland_km2",
        "inland_wetland_km2",
        "forest_km2"
    )

    return any(
        float(stats.get(k, 0) or 0) > 0
        for k in keys
    )
def get_sector_lulc_stats(sector):
    """
    Aggregates Bhuvan LULC stats for all coastal districts in a sector.

    Handles:
        - sectors with no Bhuvan district mapping
        - island territories
        - district codes that return empty/no data
    """
    sector_key = str(sector or "").strip().upper()

    codes = SECTOR_TO_DISTRICTS.get(sector_key, [])

    base = {
        "sector": sector_key,
        "source": "ISRO Bhuvan LULC 50K API"
    }

    if not codes:
        base.update({
            "status": "no_bhuvan_district_mapping",
            "districts_covered": 0,
            "totals": {
                "mangrove_km2": 0.0,
                "coastal_wetland_km2": 0.0,
                "inland_wetland_km2": 0.0,
                "forest_km2": 0.0,
                "total_km2": 0.0
            },
            "eco_buffer_advice": (
                "No Bhuvan district mapping available. "
                "Use static MPA / Ramsar / coral / wetland layers."
            )
        })

        return base

    districts = []
    failed_codes = []

    totals = {
        "mangrove_km2": 0.0,
        "coastal_wetland_km2": 0.0,
        "inland_wetland_km2": 0.0,
        "forest_km2": 0.0,
        "total_km2": 0.0,
    }

    for code in codes:

        stats = get_lulc_stats(code)

        if _is_positive_lulc(stats):

            districts.append(stats)

            for key in totals:
                totals[key] += float(stats.get(key, 0) or 0)

        else:
            failed_codes.append(code)

    for key in totals:
        totals[key] = round(totals[key], 2)

    if not districts:
        base.update({
            "status": "no_bhuvan_data",
            "district_codes_checked": codes,
            "failed_codes": failed_codes,
            "districts_covered": 0,
            "totals": totals,
            "eco_buffer_advice": (
                "Bhuvan LULC returned no usable data for this sector. "
                "Use static eco layers for restriction checks."
            )
        })

        return base

    mangrove_km2 = totals["mangrove_km2"]

    base.update({
        "status": "ok",
        "districts_covered": len(districts),
        "failed_codes": failed_codes,
        **totals,
        "top_mangrove_districts": sorted(
            [
                {
                    "district": d.get("name"),
                    "mangrove_km2": d.get("mangrove_km2", 0)
                }
                for d in districts
            ],
            key=lambda x: -x["mangrove_km2"]
        )[:3],
        "eco_buffer_advice": (
            f"Maintain 500 m stand-off: {mangrove_km2} km² mangroves "
            f"across {len(districts)} coastal districts"
            if mangrove_km2 > 5
            else "Low mangrove presence"
        )
    })

    return base
def check_bhuvan_lulc_coverage():
    """
    Tests all Bhuvan district codes used by SECTOR_TO_DISTRICTS.

    Returns:
        ok districts
        no_data districts
        error districts
        sector-wise coverage
    """
    report = {
        "checked_at": now_iso(),
        "total_districts": 0,
        "ok_count": 0,
        "no_data_codes": [],
        "error_codes": [],
        "sectors": {}
    }

    for sector, codes in SECTOR_TO_DISTRICTS.items():

        sector_report = []

        for code in codes:

            report["total_districts"] += 1

            stats = get_lulc_stats(code)

            if _is_positive_lulc(stats):

                report["ok_count"] += 1

                sector_report.append({
                    "distcode": code,
                    "status": "ok",
                    "name": stats.get("name"),
                    "total_km2": stats.get("total_km2"),
                    "mangrove_km2": stats.get("mangrove_km2")
                })

            elif stats is not None:

                report["no_data_codes"].append(code)

                sector_report.append({
                    "distcode": code,
                    "status": "no_data"
                })

            else:

                report["error_codes"].append(code)

                sector_report.append({
                    "distcode": code,
                    "status": "error"
                })

        report["sectors"][sector] = sector_report

    return report
# ================= TEST RUN =================

if __name__ == "__main__":

    print("=" * 70)
    print("COMMON MODULE - TEST RUN")
    print("=" * 70)

    result = {
        "paths": {
            "ROOT": str(ROOT),
            "BACKEND": str(BACKEND),
            "STATIC": str(STATIC),
            "LIVE": str(LIVE),
            "FALLBACK": str(FALLBACK),
            "MOSDAC": str(MOSDAC),
        },
        "coasts": COASTS,
        "nearest_coast_chennai": nearest_coast(13.05, 80.30),
        "haversine_chennai_to_andhra": haversine(13.05, 80.30, 15.9, 80.6),
        "bearing_chennai_to_andhra": bearing(13.05, 80.30, 15.9, 80.6),
        "source_normalization": {
            "ALL": normalize_source("ALL"),
            "MOSDAC": normalize_source("MOSDAC"),
            "EONET": normalize_source("EONET"),
            "Copernicus Marine": normalize_source("Copernicus Marine"),
            "open-meteo": normalize_source("open-meteo"),
        },
        "include_source_examples": {
            "isro_when_all": include_source("isro", "all"),
            "isro_when_isro": include_source("isro", "isro"),
            "copernicus_when_isro": include_source("copernicus", "isro"),
        },
    }

    print(json.dumps(result, indent=1))
    print("\n📦 check_bhuvan_lulc_coverage =>")
    print(json.dumps(check_bhuvan_lulc_coverage(), indent=1))
    print("\nCALL LIST:")
    print("  py .\\tools\\common.py")
    print("  py -c \"import sys; sys.path.insert(0,'tools'); from common import nearest_coast; print(nearest_coast(13.05, 80.30))\"")
    print("  py -c \"import sys; sys.path.insert(0,'tools'); from common import haversine; print(haversine(13.05, 80.30, 15.9, 80.6))\"")
    print("  py -c \"import sys; sys.path.insert(0,'tools'); from common import normalize_source; print(normalize_source('MOSDAC'))\"")
    print("  py -c \"import sys; sys.path.insert(0,'tools'); from common import md_read_point; import json; print(json.dumps(md_read_point('insat3ds_sst', 13.05, 80.30, ['sst']), indent=1))\"")
    print("  py -c \"import sys; sys.path.insert(0,'tools'); from common import md_read_uv; import json; print(json.dumps(md_read_uv('eos06_wind', 13.05, 80.30), indent=1))\"")