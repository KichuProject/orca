"""
fetch_obis_biodiversity.py

OBIS SITE FILE - CLEAN FUNCTION-BASED VERSION

Lives inside fetchers/ only.
Do NOT place this in archive/.

Covers:
    1. OBIS biodiversity summary
    2. Species / family / class aggregation
    3. Coral occurrence layer generation
    4. India bounding-box filter
    5. Cached fallback if raw OBIS file is missing

Rules:
    Zero top-level execution
    Everything inside functions
    Dynamic input file detection where possible
    TEST_* constants only inside __main__
    Primary -> fallback
    Fallback callable directly
    TEST RUN prints full result data
"""

import csv
import json
from pathlib import Path
from datetime import datetime


# ================= PATHS =================

ECOLOGY_DIR = Path(r"E:\sih\data\static\ecology")
OUTPUT_DIR = Path(r"E:\sih\data\live_cache\obis")

DEFAULT_RAW_CSV = ECOLOGY_DIR / "obis_india.csv"

PROCESSED_JSON = OUTPUT_DIR / "obis_biodiversity_summary.json"
TOP_SPECIES_JSON = OUTPUT_DIR / "obis_top_species.json"
CORAL_GEOJSON = ECOLOGY_DIR / "coral_occurrences.geojson"

SEARCH_DIRS = [
    ECOLOGY_DIR,
    Path(r"E:\sih\data\downloads\obis"),
    Path(r"E:\sih\data\downloads"),
]


# ================= DEFAULTS =================

DEFAULT_INDIA_BBOX = {
    "min_lat": 4.0,
    "max_lat": 30.0,
    "min_lon": 50.0,
    "max_lon": 100.0
}

CORAL_CLASSES = {
    "anthozoa",
    "hydrozoa"
}

CORAL_FAMILIES = {
    "acroporidae",
    "pocilloporidae",
    "poritidae",
    "faviidae",
    "mussidae",
    "fungiidae",
    "siderastreidae",
    "agariciidae",
    "dendrophylliidae",
    "caryophylliidae",
    "alcyoniidae",
    "gorgoniidae",
    "porpitidae",
    "physaliidae"
}


# ================= TEST CONSTANTS =================
# Used ONLY by __main__ test run

TEST_INPUT_FILE = None
TEST_BBOX = DEFAULT_INDIA_BBOX
TEST_MAX_RECORDS = 300000
TEST_CORAL_LIMIT = 20000


# ================= HELPERS =================

def _ensure_dirs():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    ECOLOGY_DIR.mkdir(parents=True, exist_ok=True)


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


def _fnum(value):
    try:
        if value is None or value == "":
            return None
        return float(value)
    except (ValueError, TypeError):
        return None


def _detect_delimiter(path):
    try:
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            first_line = f.readline()

        if first_line.count("\t") > first_line.count(","):
            return "\t"

        return ","

    except Exception:
        return ","


def _find_latest_obis_file():
    """
    Dynamically finds the latest OBIS raw export file.
    Checks common download/static folders.
    """
    candidates = []

    for d in SEARCH_DIRS:
        if not d.exists():
            continue

        for pattern in ("*.csv", "*.tsv", "*.txt"):
            for p in d.glob(pattern):
                name = p.name.lower()

                if "obis" in name:
                    candidates.append(p)

    if DEFAULT_RAW_CSV.exists():
        candidates.append(DEFAULT_RAW_CSV)

    if not candidates:
        return None

    candidates = sorted(
        set(candidates),
        key=lambda p: p.stat().st_mtime
    )

    return candidates[-1]


def _is_coral(class_name, family_name, scientific_name):
    cls = (class_name or "").strip().lower()
    fam = (family_name or "").strip().lower()
    sci = (scientific_name or "").strip().lower()

    if cls in CORAL_CLASSES:
        return True

    if fam in CORAL_FAMILIES:
        return True

    if "coral" in sci or "coral" in fam:
        return True

    return False


def _top_counts(count_dict, limit=25):
    return dict(
        sorted(
            count_dict.items(),
            key=lambda x: x[1],
            reverse=True
        )[:limit]
    )


# ================= 1. OBIS BIODIVERSITY PRIMARY =================

def process_obis_biodiversity_primary(
    input_file=TEST_INPUT_FILE,
    bbox=DEFAULT_INDIA_BBOX,
    max_records=TEST_MAX_RECORDS,
    coral_limit=TEST_CORAL_LIMIT
):
    """
    PRIMARY:
    Reads OBIS raw CSV/TSV export, filters India bbox,
    builds species/family/class summaries and coral GeoJSON.
    """
    _ensure_dirs()

    if input_file:
        src = Path(input_file)
    else:
        src = _find_latest_obis_file()

    if not src or not src.exists():
        raise FileNotFoundError(
            "No OBIS raw file found. Expected obis_india.csv or OBIS export file."
        )

    delimiter = _detect_delimiter(src)

    total_rows = 0
    india_rows = 0
    coral_rows = 0

    species_counts = {}
    family_counts = {}
    class_counts = {}

    coral_features = []
    coral_family_counts = {}

    print(f"🧬 Processing OBIS file: {src.name}")
    print(f"   delimiter: {'TAB' if delimiter == chr(9) else 'COMMA'}")

    with open(src, newline="", encoding="utf-8", errors="ignore") as f:

        reader = csv.DictReader(f, delimiter=delimiter)

        for row in reader:

            total_rows += 1

            if total_rows > max_records:
                break

            lat = _fnum(
                row.get("decimalLatitude") or row.get("lat")
            )
            lon = _fnum(
                row.get("decimalLongitude") or row.get("lon")
            )

            if lat is None or lon is None:
                continue

            if not (
                bbox["min_lat"] <= lat <= bbox["max_lat"]
                and
                bbox["min_lon"] <= lon <= bbox["max_lon"]
            ):
                continue

            india_rows += 1

            scientific_name = (row.get("scientificName") or "").strip()
            family = (row.get("family") or "").strip()
            cls = (
                row.get("class")
                or row.get("className")
                or ""
            ).strip()
            year = row.get("year")

            if scientific_name:
                species_counts[scientific_name] = (
                    species_counts.get(scientific_name, 0) + 1
                )

            if family:
                family_counts[family] = (
                    family_counts.get(family, 0) + 1
                )

            if cls:
                class_counts[cls] = (
                    class_counts.get(cls, 0) + 1
                )

            if _is_coral(cls, family, scientific_name):

                coral_rows += 1

                fam_key = family or "Unknown"

                coral_family_counts[fam_key] = (
                    coral_family_counts.get(fam_key, 0) + 1
                )

                if len(coral_features) < coral_limit:
                    coral_features.append({
                        "type": "Feature",
                        "properties": {
                            "scientificName": scientific_name,
                            "family": family,
                            "class": cls,
                            "year": year,
                            "source": "OBIS biodiversity"
                        },
                        "geometry": {
                            "type": "Point",
                            "coordinates": [lon, lat]
                        }
                    })

    summary = {
        "status": "success",
        "source": "OBIS biodiversity export",
        "source_file": str(src),
        "generated_at": _now(),
        "bounding_box": bbox,
        "rows_processed": total_rows,
        "india_filtered_records": india_rows,
        "coral_records_detected": coral_rows,
        "coral_points_saved": len(coral_features),
        "unique_species": len(species_counts),
        "unique_families": len(family_counts),
        "unique_classes": len(class_counts),
        "top_species": _top_counts(species_counts, 25),
        "top_families": _top_counts(family_counts, 25),
        "top_classes": _top_counts(class_counts, 15),
        "top_coral_families": _top_counts(coral_family_counts, 15),
        "outputs": {
            "summary_json": str(PROCESSED_JSON),
            "top_species_json": str(TOP_SPECIES_JSON),
            "coral_geojson": str(CORAL_GEOJSON)
        }
    }

    _save_json(PROCESSED_JSON, summary)

    _save_json(
        TOP_SPECIES_JSON,
        {
            "generated_at": _now(),
            "source_file": str(src),
            "top_100_species": _top_counts(species_counts, 100),
            "top_100_families": _top_counts(family_counts, 100),
            "top_50_classes": _top_counts(class_counts, 50)
        }
    )

    _save_json(
        CORAL_GEOJSON,
        {
            "type": "FeatureCollection",
            "features": coral_features
        }
    )

    print(f"✅ OBIS summary saved: {PROCESSED_JSON}")
    print(f"✅ Coral layer saved: {CORAL_GEOJSON}")

    return summary


# ================= 2. OBIS BIODIVERSITY FALLBACK =================

def process_obis_biodiversity_fallback():
    """
    FALLBACK:
    Uses last saved OBIS summary / coral layer if raw file is missing.
    Callable directly.
    """
    old_summary = _load_json(PROCESSED_JSON)

    if old_summary:
        old_summary["status"] = "stale_cache"
        return old_summary

    old_coral = _load_json(CORAL_GEOJSON)

    if old_coral:
        return {
            "status": "stale_cache",
            "source": "OBIS coral cache",
            "coral_points_saved": len(old_coral.get("features", [])),
            "file": str(CORAL_GEOJSON)
        }

    return {
        "status": "failed",
        "source": "OBIS biodiversity",
        "error": "No OBIS raw file or cached OBIS output found"
    }


def process_obis_biodiversity(
    input_file=TEST_INPUT_FILE,
    bbox=DEFAULT_INDIA_BBOX,
    max_records=TEST_MAX_RECORDS,
    coral_limit=TEST_CORAL_LIMIT
):
    """
    OBIS biodiversity wrapper:
    primary -> fallback
    """
    try:
        return process_obis_biodiversity_primary(
            input_file=input_file,
            bbox=bbox,
            max_records=max_records,
            coral_limit=coral_limit
        )

    except Exception as e:
        print(f"  ⚠️ OBIS primary failed ({str(e)[:80]}) -> fallback")
        return process_obis_biodiversity_fallback()


# ================= 3. CORAL LAYER PRIMARY =================

def build_coral_layer_primary(
    input_file=TEST_INPUT_FILE,
    bbox=DEFAULT_INDIA_BBOX,
    coral_limit=TEST_CORAL_LIMIT
):
    """
    PRIMARY:
    Builds coral occurrence GeoJSON from OBIS raw export.
    """
    _ensure_dirs()

    if input_file:
        src = Path(input_file)
    else:
        src = _find_latest_obis_file()

    if not src or not src.exists():
        raise FileNotFoundError(
            "No OBIS raw file found for coral layer generation."
        )

    delimiter = _detect_delimiter(src)

    coral_features = []
    coral_family_counts = {}
    coral_rows = 0

    print(f"🪸 Building coral layer from: {src.name}")

    with open(src, newline="", encoding="utf-8", errors="ignore") as f:

        reader = csv.DictReader(f, delimiter=delimiter)

        for row in reader:

            lat = _fnum(
                row.get("decimalLatitude") or row.get("lat")
            )
            lon = _fnum(
                row.get("decimalLongitude") or row.get("lon")
            )

            if lat is None or lon is None:
                continue

            if not (
                bbox["min_lat"] <= lat <= bbox["max_lat"]
                and
                bbox["min_lon"] <= lon <= bbox["max_lon"]
            ):
                continue

            scientific_name = (row.get("scientificName") or "").strip()
            family = (row.get("family") or "").strip()
            cls = (
                row.get("class")
                or row.get("className")
                or ""
            ).strip()
            year = row.get("year")

            if not _is_coral(cls, family, scientific_name):
                continue

            coral_rows += 1

            fam_key = family or "Unknown"

            coral_family_counts[fam_key] = (
                coral_family_counts.get(fam_key, 0) + 1
            )

            if len(coral_features) < coral_limit:
                coral_features.append({
                    "type": "Feature",
                    "properties": {
                        "scientificName": scientific_name,
                        "family": family,
                        "class": cls,
                        "year": year,
                        "source": "OBIS coral filter"
                    },
                    "geometry": {
                        "type": "Point",
                        "coordinates": [lon, lat]
                    }
                })

    _save_json(
        CORAL_GEOJSON,
        {
            "type": "FeatureCollection",
            "features": coral_features
        }
    )

    result = {
        "status": "success",
        "source": "OBIS coral filter",
        "source_file": str(src),
        "generated_at": _now(),
        "coral_records_detected": coral_rows,
        "coral_points_saved": len(coral_features),
        "top_coral_families": _top_counts(coral_family_counts, 15),
        "file": str(CORAL_GEOJSON)
    }

    print(f"✅ Coral layer saved: {CORAL_GEOJSON}")

    return result


def build_coral_layer_fallback():
    """
    FALLBACK:
    Uses existing coral GeoJSON if raw OBIS file is missing.
    Callable directly.
    """
    old_coral = _load_json(CORAL_GEOJSON)

    if old_coral:
        return {
            "status": "stale_cache",
            "source": "OBIS coral cache",
            "coral_points_saved": len(old_coral.get("features", [])),
            "file": str(CORAL_GEOJSON)
        }

    return {
        "status": "failed",
        "source": "OBIS coral layer",
        "error": "No coral GeoJSON cache available"
    }


def build_coral_layer(
    input_file=TEST_INPUT_FILE,
    bbox=DEFAULT_INDIA_BBOX,
    coral_limit=TEST_CORAL_LIMIT
):
    """
    Coral layer wrapper:
    primary -> fallback
    """
    try:
        return build_coral_layer_primary(
            input_file=input_file,
            bbox=bbox,
            coral_limit=coral_limit
        )

    except Exception as e:
        print(f"  ⚠️ coral layer primary failed ({str(e)[:80]}) -> fallback")
        return build_coral_layer_fallback()


# ================= 4. SUMMARY READER =================

def get_obis_summary():
    """
    Returns saved OBIS summary.
    If not present, tries processing once.
    """
    data = _load_json(PROCESSED_JSON)

    if data:
        return data

    return process_obis_biodiversity()


# ================= TEST RUN =================

if __name__ == "__main__":

    print("=" * 70)
    print("OBIS SITE MODULE - TEST RUN")
    print("=" * 70)

    result = process_obis_biodiversity(
        input_file=TEST_INPUT_FILE,
        bbox=TEST_BBOX,
        max_records=TEST_MAX_RECORDS,
        coral_limit=TEST_CORAL_LIMIT
    )

    print("\n📦 process_obis_biodiversity =>")
    print(json.dumps(result, indent=1))

    coral_result = build_coral_layer(
        input_file=TEST_INPUT_FILE,
        bbox=TEST_BBOX,
        coral_limit=TEST_CORAL_LIMIT
    )

    print("\n📦 build_coral_layer =>")
    print(json.dumps(coral_result, indent=1))

    summary_result = get_obis_summary()

    print("\n📦 get_obis_summary =>")
    print(json.dumps(summary_result, indent=1))

    print("\nCALL LIST:")
    print("  py -c \"import sys; sys.path.insert(0,'fetchers'); from fetch_obis_biodiversity import process_obis_biodiversity; import json; print(json.dumps(process_obis_biodiversity(), indent=1))\"")
    print("  py -c \"import sys; sys.path.insert(0,'fetchers'); from fetch_obis_biodiversity import build_coral_layer; import json; print(json.dumps(build_coral_layer(), indent=1))\"")
    print("  py -c \"import sys; sys.path.insert(0,'fetchers'); from fetch_obis_biodiversity import get_obis_summary; import json; print(json.dumps(get_obis_summary(), indent=1))\"")