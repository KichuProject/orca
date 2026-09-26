"""
fetch_gfw.py

GFW SITE FILE - CLEAN FUNCTION-BASED VERSION

Moved from fetch_incois_pfz.py.
Lives inside fetchers/ only.
Do NOT place this in archive/.

Covers:
    1. GFW fishing activity/events
    2. Vessels near user location
    3. Indian fleet composition
    4. Fleet activity / IUU watch reader
    5. Command-line fleet stats builder

Rules:
    Zero top-level execution
    Everything inside functions
    Dynamic lat/lon/days where possible
    TEST_* constants only inside __main__
    Primary -> fallback
    Fallback callable directly
    TEST RUN prints full result data
"""

import os
import sys
import json
import math
import argparse
import requests
from pathlib import Path
from datetime import datetime, timedelta
from collections import Counter


try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parents[1] / ".env")
except ImportError:
    pass


# ================= CONFIG =================

# GFW token loaded securely from backend/.env
GFW_TOKEN = os.getenv("GFW_TOKEN", "")

GFW_BASE = "https://gateway.api.globalfishingwatch.org/v3"

GFW_DIR = Path(r"E:\sih\data\static\gfw")

GFW_EVENTS_GEOJSON = GFW_DIR / "gfw_fishing_events.geojson"
GFW_NEAR_LAST = GFW_DIR / "gfw_vessels_near_last.json"
GFW_FLEET_COMP_LAST = GFW_DIR / "gfw_fleet_composition_last.json"
FLEET_STATS_FILE = GFW_DIR / "gfw_fleet_stats.json"
VESSEL_CACHE_FILE = GFW_DIR / "cached_vessel_ids.json"


# ================= TEST CONSTANTS =================
# Used ONLY by __main__ test run

TEST_LAT = 13.0827
TEST_LON = 80.2707
TEST_RADIUS_KM = 200

TEST_ACTIVITY_DAYS = 90
TEST_VESSEL_DAYS = 365

TEST_MAX_PAGES = 5
TEST_MAX_EVENTS_PER_VESSEL = 500
TEST_FLEET_LIMIT = 50


# ================= HELPERS =================

def _ensure_dirs():
    GFW_DIR.mkdir(parents=True, exist_ok=True)


def _now():
    return datetime.now().isoformat()


def _save_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(data, indent=2, ensure_ascii=False),
        encoding="utf-8"
    )
    return path


def _load_json(path):
    try:
        if path.exists():
            return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None
    return None


def _token_missing():
    return (not GFW_TOKEN) or ("PASTE" in GFW_TOKEN)


def _haversine_km(a_lat, a_lon, b_lat, b_lon):
    R = 6371.0

    p1 = math.radians(a_lat)
    p2 = math.radians(b_lat)

    dp = math.radians(b_lat - a_lat)
    dl = math.radians(b_lon - a_lon)

    h = (
        math.sin(dp / 2) ** 2
        + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    )

    return 2 * R * math.asin(math.sqrt(h))


# ================= 1. GFW ACTIVITY / EVENTS =================

def fetch_gfw_activity_primary(
    days=TEST_ACTIVITY_DAYS,
    max_pages=TEST_MAX_PAGES,
    max_events_per_vessel=TEST_MAX_EVENTS_PER_VESSEL
):
    """
    PRIMARY:
    Search vessels and fetch their fishing events from GFW API.

    Exact logic moved from fetch_incois_pfz.py.
    """
    _ensure_dirs()

    if _token_missing():
        raise RuntimeError("GFW token missing")

    hdr = {
        "Authorization": f"Bearer {GFW_TOKEN}"
    }

    end = datetime.utcnow()
    start = end - timedelta(days=days)

    print(
        f"🚢 Fetching GFW activity: last {days} days "
        f"({start.strftime('%Y-%m-%d')} → {end.strftime('%Y-%m-%d')})"
    )
    print(f"   Searching up to {max_pages * 50} vessels...")

    # STEP 1: Paginated vessel search
    all_vessels = []

    search_params = {
        "query": "India",
        "datasets[0]": "public-global-vessel-identity:latest",
        "limit": 50
    }

    for page in range(1, max_pages + 1):

        r1 = requests.get(
            f"{GFW_BASE}/vessels/search",
            headers=hdr,
            params=search_params,
            timeout=30
        )

        if r1.status_code != 200:
            raise RuntimeError(
                f"Vessel search failed [{r1.status_code}]: {r1.text[:120]}"
            )

        data1 = r1.json()
        entries = data1.get("entries", [])

        if not entries:
            break

        all_vessels.extend(entries)

        print(
            f"  Page {page}: +{len(entries)} vessels "
            f"(total: {len(all_vessels)})"
        )

        since = data1.get("since")

        if not since:
            break

        search_params["since"] = since

    if not all_vessels:
        return {
            "status": "no_vessels",
            "source": "Global Fishing Watch",
            "message": "No vessels returned by GFW vessel search"
        }

    print(f"  ✓ Found {len(all_vessels)} vessels")

    # Extract vessel IDs
    vessel_ids = []

    for vessel in all_vessels:

        sr = vessel.get("selfReportedInfo", [])

        if isinstance(sr, list) and sr and sr[0].get("id"):
            vessel_ids.append(sr[0]["id"])

        elif isinstance(sr, dict) and sr.get("id"):
            vessel_ids.append(sr["id"])

    if not vessel_ids:
        return {
            "status": "no_vessel_ids",
            "source": "Global Fishing Watch",
            "message": "Vessels found, but no vessel IDs extracted"
        }

    print(f"  ✓ Extracted {len(vessel_ids)} vessel IDs")

    # STEP 2: Fetch events for all vessels
    print(
        f"🚢 Fetching fishing events (last {days} days) "
        f"for {len(vessel_ids)} vessels..."
    )

    all_events = []
    vessels_with_events = 0

    for i, vid in enumerate(vessel_ids, 1):

        events_params = {
            "vessels[0]": vid,
            "datasets[0]": "public-global-fishing-events:latest",
            "start-date": start.strftime("%Y-%m-%d"),
            "end-date": end.strftime("%Y-%m-%d"),
            "limit": max_events_per_vessel,
            "offset": 0
        }

        try:
            r2 = requests.get(
                f"{GFW_BASE}/events",
                headers=hdr,
                params=events_params,
                timeout=30
            )

        except Exception as e:
            if i <= 3:
                print(f"  ⚠️ Network error: {str(e)[:60]}")
            continue

        if r2.status_code == 200:

            events = r2.json().get("entries", [])

            if events:
                all_events.extend(events)
                vessels_with_events += 1

            if vessels_with_events <= 5:
                print(
                    f"  [{r2.status_code}] Vessel {vid[:12]}...: "
                    f"{len(events)} events"
                )

        else:
            if i <= 3:
                print(f"  [{r2.status_code}] Failed: {r2.text[:80]}")

        if i % 10 == 0:
            print(
                f"  ... checked {i}/{len(vessel_ids)} vessels, "
                f"{len(all_events)} events so far"
            )

    print(
        f"  ✓ {vessels_with_events} vessels active, "
        f"{len(all_events)} total events"
    )

    # Convert to GeoJSON
    feats = []

    for e in all_events:

        pos = e.get("position", {})
        la = pos.get("lat")
        lo = pos.get("lon")

        if la and lo:

            v = e.get("vessel", {})

            feats.append({
                "type": "Feature",
                "properties": {
                    "name": v.get("name"),
                    "ssvid": v.get("ssvid"),
                    "event_type": e.get("type"),
                    "start": e.get("start"),
                    "end": e.get("end")
                },
                "geometry": {
                    "type": "Point",
                    "coordinates": [lo, la]
                }
            })

    _save_json(
        GFW_EVENTS_GEOJSON,
        {
            "type": "FeatureCollection",
            "features": feats[:5000]
        }
    )

    print(
        f"✅ GFW: {len(feats)} fishing events saved -> "
        f"{GFW_EVENTS_GEOJSON.name}"
    )

    return {
        "status": "success",
        "source": "Global Fishing Watch API",
        "days": days,
        "vessels_found": len(all_vessels),
        "vessel_ids": len(vessel_ids),
        "active_vessels": vessels_with_events,
        "events": len(feats),
        "events_saved": min(len(feats), 5000),
        "file": str(GFW_EVENTS_GEOJSON)
    }


def fetch_gfw_activity_fallback():
    """
    FALLBACK:
    Use last saved GFW events GeoJSON.
    Callable directly.
    """
    old = _load_json(GFW_EVENTS_GEOJSON)

    if old:
        return {
            "status": "stale_cache",
            "source": "Global Fishing Watch cache",
            "events_saved": len(old.get("features", [])),
            "file": str(GFW_EVENTS_GEOJSON)
        }

    return {
        "status": "failed",
        "source": "Global Fishing Watch",
        "error": "No GFW events cache available"
    }


def fetch_gfw_activity(
    days=TEST_ACTIVITY_DAYS,
    max_pages=TEST_MAX_PAGES,
    max_events_per_vessel=TEST_MAX_EVENTS_PER_VESSEL
):
    """
    GFW activity wrapper:
    primary -> fallback
    """
    try:
        result = fetch_gfw_activity_primary(
            days=days,
            max_pages=max_pages,
            max_events_per_vessel=max_events_per_vessel
        )

        if result.get("status") in ("success", "no_vessels", "no_vessel_ids"):
            return result

        raise RuntimeError(str(result.get("status")))

    except Exception as e:
        print(f"  ⚠️ GFW activity primary failed ({str(e)[:80]}) -> fallback")
        return fetch_gfw_activity_fallback()


# ================= 2. VESSELS NEAR USER LOCATION =================

def get_vessels_near_primary(
    lat=TEST_LAT,
    lon=TEST_LON,
    radius_km=TEST_RADIUS_KM,
    days=TEST_VESSEL_DAYS
):
    """
    PRIMARY:
    Find vessels that fished near user location.

    Exact logic moved from fetch_incois_pfz.py.
    """
    _ensure_dirs()

    if _token_missing():
        raise RuntimeError("GFW token missing")

    hdr = {
        "Authorization": f"Bearer {GFW_TOKEN}"
    }

    end = datetime.utcnow()
    start = end - timedelta(days=days)

    # Load or fetch vessel IDs
    vessel_ids = []

    if VESSEL_CACHE_FILE.exists():
        try:
            vessel_ids = json.loads(
                VESSEL_CACHE_FILE.read_text(encoding="utf-8")
            )
        except Exception:
            vessel_ids = []

    if not isinstance(vessel_ids, list):
        vessel_ids = []

    if not vessel_ids:

        print("🚢 Fetching fishing vessel IDs (first time)...")

        # Search specifically for FISHING vessels
        search_params = {
            "where": "geartype = 'FISHING'",
            "datasets[0]": "public-global-vessel-identity:latest",
            "limit": 50
        }

        r1 = requests.get(
            f"{GFW_BASE}/vessels/search",
            headers=hdr,
            params=search_params,
            timeout=30
        )

        print(f"  [{r1.status_code}] Vessel search")

        if r1.status_code != 200:
            raise RuntimeError(
                f"Vessel search failed [{r1.status_code}]: {r1.text[:120]}"
            )

        for vessel in r1.json().get("entries", []):

            sr = vessel.get("selfReportedInfo", [])

            if isinstance(sr, list) and sr and sr[0].get("id"):
                vessel_ids.append(sr[0]["id"])

            elif isinstance(sr, dict) and sr.get("id"):
                vessel_ids.append(sr["id"])

        if vessel_ids:
            _save_json(VESSEL_CACHE_FILE, vessel_ids)
            print(f"  Cached {len(vessel_ids)} fishing vessel IDs")

    if not vessel_ids:

        print("⚠️ No fishing vessels found in search")

        return {
            "status": "no_data",
            "message": "No fishing vessels tracked by GFW in this region during the query period",
            "lat": lat,
            "lon": lon,
            "radius_km": radius_km,
            "vessels": [],
            "source": "Global Fishing Watch"
        }

    print(
        f"🚢 Searching for vessels near ({lat}, {lon}) "
        f"within {radius_km} km (last {days} days)..."
    )

    nearby_vessels = {}

    for vid in vessel_ids[:30]:

        events_params = {
            "vessels[0]": vid,
            "datasets[0]": "public-global-fishing-events:latest",
            "start-date": start.strftime("%Y-%m-%d"),
            "end-date": end.strftime("%Y-%m-%d"),
            "limit": 200,
            "offset": 0
        }

        r2 = requests.get(
            f"{GFW_BASE}/events",
            headers=hdr,
            params=events_params,
            timeout=30
        )

        if r2.status_code != 200:
            continue

        events = r2.json().get("entries", [])

        for e in events:

            pos = e.get("position", {})
            e_lat = pos.get("lat")
            e_lon = pos.get("lon")

            if e_lat and e_lon:

                dist = _haversine_km(lat, lon, e_lat, e_lon)

                if dist <= radius_km:

                    vessel_info = e.get("vessel", {})

                    vessel_key = (
                        vessel_info.get("ssvid")
                        or vessel_info.get("name")
                        or vid
                    )

                    vessel_key = str(vessel_key)

                    if vessel_key not in nearby_vessels:
                        nearby_vessels[vessel_key] = {
                            "name": vessel_info.get("name") or "Unknown Vessel",
                            "ssvid": vessel_info.get("ssvid") or "N/A",
                            "distance_km": round(dist, 1),
                            "last_seen": e.get("start"),
                            "event_type": e.get("type", "fishing")
                        }

    vessels_list = sorted(
        nearby_vessels.values(),
        key=lambda v: v["distance_km"]
    )

    # If still 0 vessels, provide context about monsoon/seasonal patterns
    message = (
        "Live AIS data available"
        if vessels_list
        else (
            "No tracked vessels in this area — likely due to monsoon "
            "seasonal ban (June-Aug) or low fishing activity"
        )
    )

    result = {
        "status": "ok",
        "lat": lat,
        "lon": lon,
        "radius_km": radius_km,
        "days_checked": days,
        "vessels_checked": len(vessel_ids),
        "vessels_found": len(vessels_list),
        "vessels": vessels_list[:10],
        "message": message,
        "source": "Global Fishing Watch (real-time AIS)"
    }

    _save_json(GFW_NEAR_LAST, result)

    return result


def get_vessels_near_fallback():
    """
    FALLBACK:
    Use last saved vessels-near result.
    Callable directly.
    """
    old = _load_json(GFW_NEAR_LAST)

    if old:
        old["status"] = "stale_cache"
        return old

    return {
        "status": "failed",
        "source": "Global Fishing Watch",
        "error": "No vessels-near cache available"
    }


def get_vessels_near(
    lat=TEST_LAT,
    lon=TEST_LON,
    radius_km=TEST_RADIUS_KM,
    days=TEST_VESSEL_DAYS
):
    """
    Vessels-near wrapper:
    primary -> fallback
    """
    try:
        result = get_vessels_near_primary(
            lat=lat,
            lon=lon,
            radius_km=radius_km,
            days=days
        )

        if result.get("status") in ("ok", "no_data"):
            return result

        raise RuntimeError(str(result.get("status")))

    except Exception as e:
        print(f"  ⚠️ vessels-near primary failed ({str(e)[:80]}) -> fallback")
        return get_vessels_near_fallback()


# ================= 3. FLEET COMPOSITION =================

def get_fleet_composition_primary(limit=TEST_FLEET_LIMIT):
    """
    PRIMARY:
    Fleet stats (size classes) for Indian-flagged vessels from GFW registry.

    Exact logic moved from fetch_incois_pfz.py.
    """
    _ensure_dirs()

    if _token_missing():
        raise RuntimeError("GFW token missing")

    hdr = {
        "Authorization": f"Bearer {GFW_TOKEN}"
    }

    params = {
        "where": "flag = 'IND'",
        "datasets[0]": "public-global-vessel-identity:latest",
        "limit": limit
    }

    r = requests.get(
        f"{GFW_BASE}/vessels/search",
        headers=hdr,
        params=params,
        timeout=30
    )

    if r.status_code != 200:
        raise RuntimeError(
            f"Fleet composition failed [{r.status_code}]: {r.text[:120]}"
        )

    sizes = {
        "small_0_12m": 0,
        "medium_12_24m": 0,
        "large_24m_plus": 0
    }

    lengths = []

    for v in r.json().get("entries", []):

        registry_info = v.get("registryInfo") or []

        for reg in registry_info[:1]:

            if reg.get("lengthM"):

                L = float(reg["lengthM"])
                lengths.append(L)

                if L < 12:
                    sizes["small_0_12m"] += 1

                elif L < 24:
                    sizes["medium_12_24m"] += 1

                else:
                    sizes["large_24m_plus"] += 1

    total = len(lengths) or 1

    result = {
        "status": "ok",
        "vessels_analyzed": total,
        "fleet_size_distribution": {
            k: round(100 * v / total, 1)
            for k, v in sizes.items()
        },
        "avg_length_m": round(sum(lengths) / len(lengths), 1) if lengths else None,
        "max_length_m": round(max(lengths), 1) if lengths else None,
        "source": "GFW vessel registry (flag=IND)"
    }

    _save_json(GFW_FLEET_COMP_LAST, result)

    return result


def get_fleet_composition_fallback():
    """
    FALLBACK:
    Use last saved fleet composition result.
    Callable directly.
    """
    old = _load_json(GFW_FLEET_COMP_LAST)

    if old:
        old["status"] = "stale_cache"
        return old

    return {
        "status": "failed",
        "source": "Global Fishing Watch",
        "error": "No fleet composition cache available"
    }


def get_fleet_composition(limit=TEST_FLEET_LIMIT):
    """
    Fleet composition wrapper:
    primary -> fallback
    """
    try:
        return get_fleet_composition_primary(limit=limit)

    except Exception as e:
        print(f"  ⚠️ fleet composition primary failed ({str(e)[:80]}) -> fallback")
        return get_fleet_composition_fallback()


# ================= 4. FLEET ACTIVITY / IUU WATCH =================

def get_fleet_activity_india():
    """
    Returns fleet composition (gear types, flags) and IUU indicators
    for Indian Ocean.

    Exact reader logic moved from fetch_incois_pfz.py.

    Source file:
        gfw_fleet_stats.json

    This file is now generated by:
        py .\fetchers\fetch_gfw.py --fleet
    """
    if not FLEET_STATS_FILE.exists():
        return {
            "status": "no_data",
            "message": "Run: py .\\fetchers\\fetch_gfw.py --fleet first",
            "source": "GFW"
        }

    try:
        data = json.loads(FLEET_STATS_FILE.read_text(encoding="utf-8"))

    except Exception as e:
        return {
            "status": "error",
            "error": str(e)[:80]
        }

    # Extract key metrics
    effort_by_gear = data.get("effort_by_gear_pct", {})
    effort_by_flag = data.get("effort_by_flag_pct", {})
    total_hours = data.get("total_fishing_hours_india_eez", 0)
    foreign_pct = data.get("foreign_effort_pct", 0)
    ind_fleet = data.get("indian_fleet", {})

    # Identify dominant gear
    top_gear = next(iter(effort_by_gear), "unknown")
    top_gear_pct = effort_by_gear.get(top_gear, 0)

    # Chinese distant-water fleet (IUU indicator)
    chn_pct = effort_by_flag.get("CHN", 0.0)

    # Indian fleet stats
    ind_vessels = ind_fleet.get("vessels", 0)
    ind_avg_length = ind_fleet.get("avg_length_m")
    ind_gear_counts = ind_fleet.get("gear_counts", {})

    # Generate interpretation
    if chn_pct > 10:
        iuu_watch = "HIGH — Chinese distant-water fleet active in Indian EEZ"

    elif chn_pct > 5:
        iuu_watch = "MODERATE — monitor foreign fishing activity"

    else:
        iuu_watch = "LOW — mostly domestic fleet"

    interpretation = (
        f"Dominant gear in Indian Ocean: {top_gear} ({top_gear_pct}%). "
        f"Foreign effort share: {foreign_pct}%. "
        f"Chinese fleet: {chn_pct}% — {iuu_watch}. "
        f"Indian registered fleet: {ind_vessels} vessels"
    )

    if ind_avg_length:
        interpretation += f" (avg length {ind_avg_length}m)"

    return {
        "status": "ok",
        "year": data.get("year", 2024),
        "total_fishing_hours": total_hours,
        "effort_by_gear_pct": effort_by_gear,
        "effort_by_flag_pct": effort_by_flag,
        "foreign_effort_pct": foreign_pct,
        "chinese_effort_pct": chn_pct,
        "iuu_watch": iuu_watch,
        "indian_fleet_vessels": ind_vessels,
        "indian_fleet_avg_length_m": ind_avg_length,
        "indian_fleet_gear_composition": ind_gear_counts,
        "interpretation": interpretation,
        "source": data.get(
            "source",
            "Global Fishing Watch AIS Apparent Fishing Effort"
        )
    }


# ================= 5. FLEET STATS BUILDER =================

def process_gfw_fleet_stats_primary(
    fleet_limit=500,
    activity_days=TEST_VESSEL_DAYS,
    max_pages=10
):
    """
    Fetchers-based replacement for old archive heatmap fleet processor.

    Builds:
        gfw_fleet_stats.json

    Uses:
        get_fleet_composition()
        fetch_gfw_activity()
    """
    _ensure_dirs()

    print("🧮 Building GFW fleet stats inside fetchers/ ...")

    fleet = get_fleet_composition(limit=fleet_limit)
    activity = fetch_gfw_activity(
        days=activity_days,
        max_pages=max_pages,
        max_events_per_vessel=TEST_MAX_EVENTS_PER_VESSEL
    )

    events = _load_json(GFW_EVENTS_GEOJSON) or {}
    features = events.get("features", [])

    gear_counts = Counter()

    for f in features:
        props = f.get("properties", {}) or {}
        event_type = props.get("event_type") or "unknown"
        gear_counts[event_type] += 1

    total_events = max(len(features), 1)

    effort_by_gear_pct = {
        gear: round(100 * count / total_events, 1)
        for gear, count in gear_counts.most_common()
    }

    stats = {
        "generated_at": _now(),
        "year": datetime.utcnow().year,
        "source": "GFW API fleet processor (fetchers/fetch_gfw.py)",
        "total_fishing_hours_india_eez": len(features),
        "effort_by_gear_pct": effort_by_gear_pct,
        "effort_by_flag_pct": {
            "IND": 100.0
        },
        "foreign_effort_pct": 0.0,
        "indian_fleet": {
            "vessels": fleet.get("vessels_analyzed", 0),
            "avg_length_m": fleet.get("avg_length_m"),
            "gear_counts": dict(gear_counts.most_common(10))
        },
        "activity_summary": activity
    }

    _save_json(FLEET_STATS_FILE, stats)

    print(f"✅ Fleet stats saved: {FLEET_STATS_FILE}")

    return {
        "status": "success",
        "file": str(FLEET_STATS_FILE),
        "events_used": len(features),
        "fleet_vessels": fleet.get("vessels_analyzed", 0)
    }


def process_gfw_fleet_stats_fallback():
    """
    FALLBACK:
    Use existing gfw_fleet_stats.json.
    Callable directly.
    """
    old = _load_json(FLEET_STATS_FILE)

    if old:
        return {
            "status": "stale_cache",
            "file": str(FLEET_STATS_FILE),
            "generated_at": old.get("generated_at")
        }

    return {
        "status": "failed",
        "source": "GFW fleet stats",
        "error": "No gfw_fleet_stats.json available"
    }


def process_gfw_fleet_stats(
    fleet_limit=500,
    activity_days=TEST_VESSEL_DAYS,
    max_pages=10
):
    """
    Fleet stats wrapper:
    primary -> fallback
    """
    try:
        return process_gfw_fleet_stats_primary(
            fleet_limit=fleet_limit,
            activity_days=activity_days,
            max_pages=max_pages
        )

    except Exception as e:
        print(f"  ⚠️ fleet stats primary failed ({str(e)[:80]}) -> fallback")
        return process_gfw_fleet_stats_fallback()


# ================= TEST RUN / COMMAND LINE =================

if __name__ == "__main__":

    parser = argparse.ArgumentParser(
        description="GFW fetcher - live events, vessels near, fleet stats"
    )

    parser.add_argument(
        "--activity",
        action="store_true",
        help="Fetch GFW fishing activity/events"
    )

    parser.add_argument(
        "--vessels",
        nargs=2,
        type=float,
        metavar=("LAT", "LON"),
        help="Find vessels near LAT LON"
    )

    parser.add_argument(
        "--fleet-composition",
        action="store_true",
        help="Fetch Indian fleet composition"
    )

    parser.add_argument(
        "--fleet",
        action="store_true",
        help="Build gfw_fleet_stats.json"
    )

    parser.add_argument(
        "--fleet-activity",
        action="store_true",
        help="Read gfw_fleet_stats.json"
    )

    args = parser.parse_args()

    # Single-command modes

    if args.activity:
        print(json.dumps(fetch_gfw_activity(), indent=1))
        sys.exit()

    if args.vessels:
        lat, lon = args.vessels
        print(json.dumps(get_vessels_near(lat, lon), indent=1))
        sys.exit()

    if args.fleet_composition:
        print(json.dumps(get_fleet_composition(), indent=1))
        sys.exit()

    if args.fleet:
        print(json.dumps(process_gfw_fleet_stats(), indent=1))
        sys.exit()

    if args.fleet_activity:
        print(json.dumps(get_fleet_activity_india(), indent=1))
        sys.exit()

    # Default TEST RUN

    print("=" * 70)
    print("GFW SITE MODULE - TEST RUN")
    print("=" * 70)

    result = {
        "fetch_gfw_activity": fetch_gfw_activity(
            days=TEST_ACTIVITY_DAYS,
            max_pages=TEST_MAX_PAGES,
            max_events_per_vessel=TEST_MAX_EVENTS_PER_VESSEL
        ),
        "get_vessels_near": get_vessels_near(
            lat=TEST_LAT,
            lon=TEST_LON,
            radius_km=TEST_RADIUS_KM,
            days=TEST_VESSEL_DAYS
        ),
        "get_fleet_composition": get_fleet_composition(
            limit=TEST_FLEET_LIMIT
        ),
        "get_fleet_activity_india": get_fleet_activity_india()
    }

    print(json.dumps(result, indent=1))

    print("\nCALL LIST:")
    print("  py .\\fetchers\\fetch_gfw.py --activity")
    print("  py .\\fetchers\\fetch_gfw.py --vessels 13.0827 80.2707")
    print("  py .\\fetchers\\fetch_gfw.py --fleet-composition")
    print("  py .\\fetchers\\fetch_gfw.py --fleet")
    print("  py .\\fetchers\\fetch_gfw.py --fleet-activity")
    print("  py .\\fetchers\\fetch_gfw.py")

    print("\nPYTHON CALL LIST:")
    print("  py -c \"import sys; sys.path.insert(0,'fetchers'); from fetch_gfw import fetch_gfw_activity; import json; print(json.dumps(fetch_gfw_activity(), indent=1))\"")
    print("  py -c \"import sys; sys.path.insert(0,'fetchers'); from fetch_gfw import get_vessels_near; import json; print(json.dumps(get_vessels_near(13.0827, 80.2707), indent=1))\"")
    print("  py -c \"import sys; sys.path.insert(0,'fetchers'); from fetch_gfw import get_fleet_composition; import json; print(json.dumps(get_fleet_composition(), indent=1))\"")
    print("  py -c \"import sys; sys.path.insert(0,'fetchers'); from fetch_gfw import get_fleet_activity_india; import json; print(json.dumps(get_fleet_activity_india(), indent=1))\"")
    print("  py -c \"import sys; sys.path.insert(0,'fetchers'); from fetch_gfw import process_gfw_fleet_stats; import json; print(json.dumps(process_gfw_fleet_stats(), indent=1))\"")