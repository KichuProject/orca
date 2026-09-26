"""
tide_tool.py

TIDE TOOL - MULTI-SOURCE VERSION

Supports:
    source="all"       -> returns BOTH live + harmonic
    source="live"      -> returns live only
    source="harmonic"  -> returns harmonic only

Live source:
    Open-Meteo tide cache
    india_tides_live.json
    or LIVE entries inside tide_predictions.json

Harmonic source:
    fetch_tides.py harmonic constants
    M2 + S2 + K1 + O1

Rules:
    Zero top-level execution
    Everything inside functions
    Dynamic lat/lon/location
    TEST_* constants only inside __main__
    Primary -> fallback where possible
    TEST RUN prints full result data
"""

import sys
import json
import math
from pathlib import Path
from datetime import datetime, timedelta


# ================= BOOTSTRAP =================

TOOLS_DIR = Path(__file__).resolve().parent

if str(TOOLS_DIR) not in sys.path:
    sys.path.insert(0, str(TOOLS_DIR))


# ================= COMMON IMPORTS =================

try:
    from common import LIVE, load_json, haversine

except ImportError:

    LIVE = Path(r"E:\sih\data\live_cache")

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
    from common import normalize_source

except ImportError:

    def normalize_source(source="all"):
        return str(source or "all").strip().lower()


try:
    from common import now_iso

except ImportError:

    def now_iso():
        return datetime.now().isoformat()


# ================= PATHS =================

TIDES_DIR = LIVE / "tides"

LIVE_TIDES_FILE = TIDES_DIR / "india_tides_live.json"
TIDE_PREDICTIONS_FILE = TIDES_DIR / "tide_predictions.json"


# ================= TEST CONSTANTS =================
# Used ONLY by __main__ test run

TEST_LAT = 13.05
TEST_LON = 80.30
TEST_LOCATION = "Chennai"


# ================= FETCH_TIDES LOADER =================

_fetch_tides_module = None


def _find_fetchers_dir():
    """
    Searches upward for the fetchers folder containing fetch_tides.py.
    Works for both:
        backend/tools/
        backend/app/tools/
    """
    current = Path(__file__).resolve().parent

    for _ in range(6):

        candidate = current / "fetchers"

        if (candidate / "fetch_tides.py").exists():
            return candidate

        if current.parent == current:
            break

        current = current.parent

    return None


def _get_fetch_tides():
    """
    Lazily imports fetchers/fetch_tides.py.
    """
    global _fetch_tides_module

    if _fetch_tides_module is None:

        fetchers_dir = _find_fetchers_dir()

        if fetchers_dir:

            if str(fetchers_dir) not in sys.path:
                sys.path.insert(0, str(fetchers_dir))

            try:
                import fetch_tides as ft
                _fetch_tides_module = ft

            except Exception:
                _fetch_tides_module = False

        else:
            _fetch_tides_module = False

    return _fetch_tides_module if _fetch_tides_module else None


# ================= PORT HELPERS =================

def _match_port(location, ports):
    """
    Matches user location name to a known port.
    """
    if not location:
        return None

    q = str(location).strip().lower().replace(" ", "_")

    for p in ports:

        p_low = str(p).lower()

        if q == p_low:
            return p

        if q in p_low or p_low in q:
            return p

    return None


def _nearest_port_from_ports(lat, lon, ports):
    """
    Finds nearest port from a ports dict.
    """
    candidates = []

    for name, port_data in ports.items():

        if not isinstance(port_data, dict):
            continue

        plat = port_data.get("lat")
        plon = port_data.get("lon")

        if plat is None or plon is None:
            continue

        candidates.append(
            (
                name,
                haversine(lat, lon, plat, plon)
            )
        )

    if not candidates:
        return None, None

    candidates.sort(key=lambda item: item[1])

    return candidates[0][0], candidates[0][1]


def _all_known_ports():
    """
    Combines known ports from:
        fetch_tides.PORTS
        tide_predictions.json
        india_tides_live.json
    """
    ports = {}

    ft = _get_fetch_tides()

    if ft and hasattr(ft, "PORTS"):

        for name, meta in (ft.PORTS or {}).items():

            if isinstance(meta, dict) and meta.get("lat") is not None:

                ports[name] = {
                    "lat": meta.get("lat"),
                    "lon": meta.get("lon")
                }

    pred = load_json(TIDE_PREDICTIONS_FILE, {}) or {}

    for name, meta in (pred.get("ports", {}) or {}).items():

        if isinstance(meta, dict) and meta.get("lat") is not None:

            ports.setdefault(
                name,
                {
                    "lat": meta.get("lat"),
                    "lon": meta.get("lon")
                }
            )

    live = load_json(LIVE_TIDES_FILE, {}) or {}

    for name, meta in (live.get("ports", {}) or {}).items():

        if isinstance(meta, dict) and meta.get("lat") is not None:

            ports.setdefault(
                name,
                {
                    "lat": meta.get("lat"),
                    "lon": meta.get("lon")
                }
            )

    return ports


def _resolve_location(location=None, lat=None, lon=None):
    """
    Resolves user input into lat/lon and nearest known port.
    """
    ports = _all_known_ports()

    if lat is not None and lon is not None:

        lat = float(lat)
        lon = float(lon)

        port_name, _ = _nearest_port_from_ports(lat, lon, ports)

        return lat, lon, port_name, None

    if location:

        key = _match_port(location, ports)

        if key and key in ports:

            meta = ports[key]

            return (
                float(meta["lat"]),
                float(meta["lon"]),
                key,
                None
            )

        return None, None, None, f"Could not resolve location: {location}"

    return None, None, None, "Provide either lat/lon or location name"


# ================= TIME HELPERS =================

def _parse_time(value):
    """
    Parses common tide time formats.
    """
    if not value:
        return None

    formats = (
        "%Y-%m-%dT%H:%M",
        "%Y-%m-%d %H:%M",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%d %H:%M:%S",
    )

    for fmt in formats:

        try:
            return datetime.strptime(str(value), fmt)

        except Exception:
            continue

    return None


def _is_future(entry):
    """
    Returns True if tide entry time is in the future.
    """
    if not entry:
        return False

    t = _parse_time(entry.get("time"))

    if not t:
        return False

    return t >= datetime.now()


# ================= LIVE PREDICTION =================

def _live_prediction(lat, lon, port_hint=None):
    """
    Returns live Open-Meteo tide data if available.
    """
    live_data = load_json(LIVE_TIDES_FILE, {}) or {}
    live_ports = live_data.get("ports", {}) or {}

    source_file = "india_tides_live.json"

    if not live_ports:

        pred = load_json(TIDE_PREDICTIONS_FILE, {}) or {}

        live_ports = {
            name: meta
            for name, meta in (pred.get("ports", {}) or {}).items()
            if str(meta.get("method", "")).upper() == "LIVE"
        }

        source_file = "tide_predictions.json LIVE entries"

    if not live_ports:

        return {
            "status": "no_live_tide_data",
            "message": "No live tide cache found",
            "files_checked": [
                str(LIVE_TIDES_FILE),
                str(TIDE_PREDICTIONS_FILE)
            ]
        }

    known_ports = _all_known_ports()

    key = None

    if port_hint and port_hint in live_ports:
        key = port_hint

    else:

        candidates = []

        for port_name in live_ports:

            meta = live_ports.get(port_name, {})

            if meta.get("lat") is not None and meta.get("lon") is not None:

                plat = meta.get("lat")
                plon = meta.get("lon")

            else:

                known = known_ports.get(port_name, {})

                plat = known.get("lat")
                plon = known.get("lon")

            if plat is None or plon is None:
                continue

            candidates.append(
                (
                    port_name,
                    haversine(lat, lon, plat, plon)
                )
            )

        if candidates:

            candidates.sort(key=lambda item: item[1])
            key = candidates[0][0]

        else:

            key = next(iter(live_ports))

    port_data = live_ports.get(key, {})

    next_high = port_data.get("next_high_tide")
    next_low = port_data.get("next_low_tide")

    high_future = _is_future(next_high)
    low_future = _is_future(next_low)

    status = "success" if (high_future or low_future) else "stale_live"

    distance_km = None

    if port_data.get("lat") is not None and port_data.get("lon") is not None:

        distance_km = haversine(
            lat,
            lon,
            port_data.get("lat"),
            port_data.get("lon")
        )

    else:

        known = known_ports.get(key, {})

        if known.get("lat") is not None and known.get("lon") is not None:

            distance_km = haversine(
                lat,
                lon,
                known.get("lat"),
                known.get("lon")
            )

    return {
        "status": status,
        "port": key,
        "distance_to_port_km": distance_km,
        "tidal_range_m": port_data.get("tidal_range_m"),
        "next_high_tide": next_high,
        "next_low_tide": next_low,
        "next_high_tides": port_data.get("next_high_tides", []),
        "next_low_tides": port_data.get("next_low_tides", []),
        "hourly_next_12h": port_data.get("hourly_forecast", [])[:12],
        "method": port_data.get(
            "method",
            "LIVE Open-Meteo tide cache"
        ),
        "source": source_file,
        "data_sources": [
            "Open-Meteo live tide cache"
        ]
    }


# ================= HARMONIC PREDICTION =================

def _format_cached_port(key, port_data, distance_km=None):
    """
    Formats cached harmonic port entry.
    """
    hourly = (
        port_data.get("hourly_forecast")
        or port_data.get("hourly_next_12h")
        or []
    )

    rising = (
        len(hourly) > 1
        and (
            hourly[1].get("height_m", 0)
            > hourly[0].get("height_m", 0)
        )
    )

    return {
        "status": "stale_cache",
        "port": key,
        "distance_to_port_km": distance_km,
        "current_height_m": port_data.get("current_height_m"),
        "tide_status": port_data.get("tide_status") or (
            "RISING" if rising else "FALLING"
        ),
        "tidal_range_m": port_data.get("tidal_range_m"),
        "next_high_tide": port_data.get("next_high_tide"),
        "next_low_tide": port_data.get("next_low_tide"),
        "next_high_tides": port_data.get("next_high_tides", [])[:4],
        "next_low_tides": port_data.get("next_low_tides", [])[:4],
        "hourly_forecast": hourly,
        "hourly_next_12h": hourly[:12],
        "method": port_data.get(
            "method",
            "Harmonic M2+S2+K1+O1"
        ),
        "source": "tide_predictions.json cache",
        "data_sources": [
            "Harmonic M2+S2+K1+O1 cache"
        ]
    }


def _harmonic_prediction(lat, lon, port_hint=None):
    """
    Returns harmonic tide prediction using fetch_tides.py constants.
    """
    ft = _get_fetch_tides()

    if (
        ft
        and hasattr(ft, "PORTS")
        and hasattr(ft, "tide_height")
        and hasattr(ft, "find_extremes")
    ):

        try:

            if port_hint and port_hint in ft.PORTS:

                nearest = port_hint

                distance_km = haversine(
                    lat,
                    lon,
                    ft.PORTS[nearest]["lat"],
                    ft.PORTS[nearest]["lon"]
                )

            elif hasattr(ft, "find_nearest_port"):

                nearest, distance_km = ft.find_nearest_port(lat, lon)

            else:

                nearest, distance_km = _nearest_port_from_ports(
                    lat,
                    lon,
                    ft.PORTS
                )

            if not nearest:

                return {
                    "status": "no_harmonic_port",
                    "message": "No harmonic port found"
                }

            port = ft.PORTS[nearest]

            now = datetime.now()

            current_height = ft.tide_height(port, now)

            extremes = ft.find_extremes(
                port,
                now,
                hours=48
            )

            highs = [
                e for e in extremes
                if e.get("type") == "HIGH"
            ][:4]

            lows = [
                e for e in extremes
                if e.get("type") == "LOW"
            ][:4]

            hourly = []

            for h in range(24):

                t = now + timedelta(hours=h)

                hourly.append(
                    {
                        "time": t.strftime("%Y-%m-%d %H:%M"),
                        "height_m": round(ft.tide_height(port, t), 2)
                    }
                )

            rising = (
                len(hourly) > 1
                and hourly[1]["height_m"] > hourly[0]["height_m"]
            )

            return {
                "status": "success",
                "port": nearest,
                "distance_to_port_km": distance_km,
                "current_height_m": round(current_height, 2),
                "tide_status": "RISING" if rising else "FALLING",
                "next_high_tides": highs,
                "next_low_tides": lows,
                "hourly_forecast": hourly,
                "hourly_next_12h": hourly[:12],
                "method": "Harmonic M2+S2+K1+O1",
                "source": "fetch_tides.py harmonic constants",
                "accuracy_note": (
                    f"Based on {nearest} constants "
                    f"({distance_km} km away). "
                    "±30-60 min timing, ±0.3m height."
                ),
                "data_sources": [
                    "Indian Navy harmonic constants",
                    "M2",
                    "S2",
                    "K1",
                    "O1"
                ]
            }

        except Exception as e:

            return {
                "status": "error",
                "error": str(e)[:120]
            }

    # Fallback to cached harmonic predictions

    pred = load_json(TIDE_PREDICTIONS_FILE, {}) or {}
    ports = pred.get("ports", {}) or {}

    if not ports:

        return {
            "status": "no_harmonic_tide_data",
            "message": "No harmonic tide cache found",
            "file": str(TIDE_PREDICTIONS_FILE)
        }

    key = None

    if port_hint and port_hint in ports:
        key = port_hint

    else:

        key, _ = _nearest_port_from_ports(lat, lon, ports)

    if key and key in ports:

        distance_km = None

        port_data = ports[key]

        if port_data.get("lat") is not None and port_data.get("lon") is not None:

            distance_km = haversine(
                lat,
                lon,
                port_data.get("lat"),
                port_data.get("lon")
            )

        return _format_cached_port(
            key,
            port_data,
            distance_km
        )

    return {
        "status": "no_harmonic_tide_data",
        "message": "No matching harmonic port found"
    }


# ================= SUMMARY HELPER =================

def _summarize_live_and_harmonic(live, harmonic):
    """
    Creates top-level summary from live + harmonic results.
    """
    live = live if isinstance(live, dict) else {}
    harmonic = harmonic if isinstance(harmonic, dict) else {}

    live_ok = live.get("status") == "success"

    harmonic_highs = harmonic.get("next_high_tides", []) or []
    harmonic_lows = harmonic.get("next_low_tides", []) or []

    live_high = live.get("next_high_tide")
    live_low = live.get("next_low_tide")

    next_high = None
    next_low = None

    if live_ok and _is_future(live_high):
        next_high = live_high

    elif harmonic_highs:
        next_high = harmonic_highs[0]

    if live_ok and _is_future(live_low):
        next_low = live_low

    elif harmonic_lows:
        next_low = harmonic_lows[0]

    hourly = (
        harmonic.get("hourly_forecast")
        or harmonic.get("hourly_next_12h")
        or []
    )

    return {
        "port": live.get("port") or harmonic.get("port"),
        "distance_to_port_km": (
            live.get("distance_to_port_km")
            or harmonic.get("distance_to_port_km")
        ),
        "current_height_m": harmonic.get("current_height_m"),
        "tide_status": harmonic.get("tide_status"),
        "tidal_range_m": (
            live.get("tidal_range_m")
            or harmonic.get("tidal_range_m")
        ),
        "next_high_tide": next_high,
        "next_low_tide": next_low,
        "next_high_tides": harmonic_highs,
        "next_low_tides": harmonic_lows,
        "hourly_next_12h": hourly[:12]
    }


# ================= MAIN TOOL FUNCTION =================

def get_tide_prediction(
    location=None,
    lat=None,
    lon=None,
    source="all"
):
    """
    AI Tool:
    Get tide prediction.

    source="all":
        returns both live and harmonic

    source="live":
        returns live only

    source="harmonic":
        returns harmonic only
    """
    req = normalize_source(source)

    if req not in ("all", "live", "harmonic"):
        req = "all"

    resolved_lat, resolved_lon, resolved_port, resolve_error = _resolve_location(
        location=location,
        lat=lat,
        lon=lon
    )

    if resolved_lat is None or resolved_lon is None:

        return {
            "status": "need_location",
            "error": resolve_error,
            "tool": "tide_tool.get_tide_prediction"
        }

    live = None
    harmonic = None

    if req in ("all", "live"):

        live = _live_prediction(
            resolved_lat,
            resolved_lon,
            resolved_port
        )

    if req in ("all", "harmonic"):

        harmonic = _harmonic_prediction(
            resolved_lat,
            resolved_lon,
            resolved_port
        )

    result = {
        "tool": "tide_tool.get_tide_prediction",
        "generated_at": now_iso(),
        "source_requested": req,
        "requested_location": {
            "location": location,
            "lat": lat,
            "lon": lon
        },
        "resolved_location": {
            "lat": resolved_lat,
            "lon": resolved_lon,
            "nearest_known_port": resolved_port
        }
    }

    # ---------------- SOURCE ALL ----------------

    if req == "all":

        summary = _summarize_live_and_harmonic(live, harmonic)

        result.update(summary)

        result["live"] = live
        result["harmonic"] = harmonic

        live_ok = isinstance(live, dict) and live.get("status") == "success"
        harmonic_ok = isinstance(harmonic, dict) and harmonic.get("status") in (
            "success",
            "stale_cache"
        )

        if live_ok and harmonic_ok:

            result["status"] = "success"
            result["method"] = "live + harmonic"

        elif harmonic_ok:

            result["status"] = "success"
            result["method"] = "harmonic"
            result["note"] = (
                "Live tide cache unavailable or stale. "
                "Harmonic prediction included."
            )

        elif live_ok:

            result["status"] = "success"
            result["method"] = "live"
            result["note"] = (
                "Harmonic prediction unavailable. "
                "Live tide cache used."
            )

        else:

            result["status"] = "no_tide_data"
            result["method"] = "none"

        result["data_sources"] = [
            "Open-Meteo live tide cache",
            "Harmonic M2+S2+K1+O1"
        ]

        return result

    # ---------------- SOURCE LIVE ----------------

    if req == "live":

        if isinstance(live, dict):

            result.update(live)

            if live.get("status") == "success":

                result["method"] = "live"

            elif live.get("status") == "stale_live":

                result["method"] = "live_stale"
                result["fallback_harmonic"] = _harmonic_prediction(
                    resolved_lat,
                    resolved_lon,
                    resolved_port
                )
                result["note"] = (
                    "Live tide cache is stale. "
                    "Harmonic fallback included for safety."
                )

            else:

                result["fallback_harmonic"] = _harmonic_prediction(
                    resolved_lat,
                    resolved_lon,
                    resolved_port
                )
                result["note"] = (
                    "Live tide cache unavailable. "
                    "Harmonic fallback included for safety."
                )

        else:

            result["status"] = "no_live_tide_data"

        result["data_sources"] = [
            "Open-Meteo live tide cache"
        ]

        return result

    # ---------------- SOURCE HARMONIC ----------------

    if req == "harmonic":

        if isinstance(harmonic, dict):

            result.update(harmonic)

        else:

            result["status"] = "no_harmonic_tide_data"

        result["data_sources"] = [
            "Harmonic M2+S2+K1+O1"
        ]

        return result

    return result


def get_tide_for_location(lat, lon, source="all"):
    """
    Convenience wrapper:
    tide by lat/lon.
    """
    return get_tide_prediction(
        lat=lat,
        lon=lon,
        source=source
    )


# ================= ALL PORTS SUMMARY =================

def get_all_ports_tide_summary(refresh=False):
    """
    Returns tide summary for all ports.

    If refresh=True:
        calls fetch_tides.generate_all_ports_forecast()
    """
    if not refresh:

        data = load_json(TIDE_PREDICTIONS_FILE, {})

        if data:
            return data

    ft = _get_fetch_tides()

    if ft and hasattr(ft, "generate_all_ports_forecast"):

        try:

            data = ft.generate_all_ports_forecast()

            TIDES_DIR.mkdir(parents=True, exist_ok=True)

            TIDE_PREDICTIONS_FILE.write_text(
                json.dumps(data, indent=1, ensure_ascii=False),
                encoding="utf-8"
            )

            return data

        except Exception as e:

            return {
                "status": "failed",
                "error": str(e)[:120]
            }

    data = load_json(TIDE_PREDICTIONS_FILE, {})

    if data:
        return data

    return {
        "status": "no_tide_data",
        "message": "No tide cache available",
        "file": str(TIDE_PREDICTIONS_FILE)
    }


# ================= TEST RUN =================

if __name__ == "__main__":

    print("=" * 70)
    print("TIDE TOOL - MULTI-SOURCE TEST RUN")
    print("=" * 70)

    all_result = get_tide_prediction(
        lat=TEST_LAT,
        lon=TEST_LON,
        source="all"
    )

    print("\n📦 source='all' =>")
    print(json.dumps(all_result, indent=1))

    live_result = get_tide_prediction(
        lat=TEST_LAT,
        lon=TEST_LON,
        source="live"
    )

    print("\n📦 source='live' =>")
    print(json.dumps(live_result, indent=1))

    harmonic_result = get_tide_prediction(
        lat=TEST_LAT,
        lon=TEST_LON,
        source="harmonic"
    )

    print("\n📦 source='harmonic' =>")
    print(json.dumps(harmonic_result, indent=1))

    location_result = get_tide_prediction(
        location=TEST_LOCATION,
        source="all"
    )

    print("\n📦 location='Chennai', source='all' =>")
    print(json.dumps(location_result, indent=1))

    print("\nCALL LIST:")
    print("  py .\\tools\\tide_tool.py")
    print("  py -c \"import sys; sys.path.insert(0,'tools'); from tide_tool import get_tide_prediction; import json; print(json.dumps(get_tide_prediction(lat=13.05, lon=80.30, source='all'), indent=1))\"")
    print("  py -c \"import sys; sys.path.insert(0,'tools'); from tide_tool import get_tide_prediction; import json; print(json.dumps(get_tide_prediction(lat=13.05, lon=80.30, source='live'), indent=1))\"")
    print("  py -c \"import sys; sys.path.insert(0,'tools'); from tide_tool import get_tide_prediction; import json; print(json.dumps(get_tide_prediction(lat=13.05, lon=80.30, source='harmonic'), indent=1))\"")
    print("  py -c \"import sys; sys.path.insert(0,'tools'); from tide_tool import get_tide_prediction; import json; print(json.dumps(get_tide_prediction(location='Chennai', source='all'), indent=1))\"")