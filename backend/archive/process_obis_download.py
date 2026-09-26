"""
process_obis_download.py
Reads OBIS portal export (Occurrence.tsv ~200k rows), cleans it,
filters to Indian EEZ, and generates the 3 files the app reads.
Run once:  py process_obis_download.py
"""
import csv, json
from pathlib import Path
from collections import Counter

ECOLOGY_DIR = Path(r"E:\sih\data\static\ecology")
ECOLOGY_DIR.mkdir(parents=True, exist_ok=True)

# --- locate the raw TSV wherever you pasted it ---
candidates = [
    ECOLOGY_DIR / "Occurrence.tsv",
    ECOLOGY_DIR / "occurrence.tsv",
    ECOLOGY_DIR / "obis_raw.tsv",
    Path(r"E:\sih\downloads\obis_raw.tsv"),
]
RAW_TSV = next((p for p in candidates if p.exists()), None)
if RAW_TSV is None:
    print("❌ Occurrence.tsv not found in", ECOLOGY_DIR); raise SystemExit(1)

OUT_CSV     = ECOLOGY_DIR / "obis_india.csv"
OUT_GEOJSON = ECOLOGY_DIR / "obis_india_points.geojson"
OUT_SUMMARY = ECOLOGY_DIR / "obis_india_summary.json"

MIN_LON, MAX_LON = 55.0, 95.0
MIN_LAT, MAX_LAT = 5.0, 25.0
OUT_FIELDS = ["scientificName","kingdom","phylum","class","order","family","genus",
              "lat","lon","year","basisOfRecord","dataset"]

def find_col(hm, *names):
    for n in names:
        if n in hm: return hm[n]
    return None

def process():
    print(f"📂 Reading {RAW_TSV.name} ({RAW_TSV.stat().st_size/1e6:.0f} MB) ...")
    clean = []
    classes, phylums, species = Counter(), Counter(), Counter()
    skipped = Counter()

    with open(RAW_TSV, "r", encoding="utf-8-sig", errors="replace", newline="") as f:
        reader = csv.DictReader(f, delimiter="\t")
        hm = {(h or "").strip().lower(): h for h in reader.fieldnames}

        c_name = find_col(hm, "scientificname")
        c_king = find_col(hm, "kingdom")
        c_phyl = find_col(hm, "phylum")
        c_cls  = find_col(hm, "class")
        c_ord  = find_col(hm, "order")
        c_fam  = find_col(hm, "family")
        c_gen  = find_col(hm, "genus")
        c_lat  = find_col(hm, "decimallatitude")
        c_lon  = find_col(hm, "decimallongitude")
        c_yr   = find_col(hm, "date_year", "year")
        c_ed   = find_col(hm, "eventdate")
        c_bas  = find_col(hm, "basisofrecord")
        c_ds   = find_col(hm, "datasetname", "dataset_id", "datasetid")
        c_mar  = find_col(hm, "marine")
        c_abs  = find_col(hm, "absence")
        c_drop = find_col(hm, "dropped")

        for i, row in enumerate(reader):
            if i and i % 50000 == 0:
                print(f"   ... scanned {i:,} rows, kept {len(clean):,}")
            try:
                lat = float(row[c_lat]); lon = float(row[c_lon])
            except (TypeError, ValueError, KeyError):
                skipped["bad_coords"] += 1; continue
            if not (MIN_LAT <= lat <= MAX_LAT and MIN_LON <= lon <= MAX_LON):
                skipped["outside_box"] += 1; continue
            if c_abs and (row.get(c_abs) or "").strip() in ("1","true","TRUE"):
                skipped["absence"] += 1; continue
            if c_drop and (row.get(c_drop) or "").strip() in ("1","true","TRUE"):
                skipped["dropped_qc"] += 1; continue
            if c_mar and (row.get(c_mar) or "").strip() in ("0","false","FALSE"):
                skipped["not_marine"] += 1; continue

            yr = (row.get(c_yr) or "").strip() if c_yr else ""
            if not yr and c_ed: yr = (row.get(c_ed) or "")[:4]

            rec = {
                "scientificName": (row.get(c_name) or "").strip() or "Unknown",
                "kingdom": (row.get(c_king) or "").strip(),
                "phylum":  (row.get(c_phyl) or "").strip(),
                "class":   (row.get(c_cls)  or "").strip(),
                "order":   (row.get(c_ord)  or "").strip(),
                "family":  (row.get(c_fam)  or "").strip(),
                "genus":   (row.get(c_gen)  or "").strip(),
                "lat": lat, "lon": lon, "year": yr,
                "basisOfRecord": (row.get(c_bas) or "").strip(),
                "dataset": (row.get(c_ds) or "").strip(),
            }
            clean.append(rec)
            classes[rec["class"] or "Unknown"] += 1
            phylums[rec["phylum"] or "Unknown"] += 1
            species[rec["scientificName"]] += 1

    print(f"✅ Kept {len(clean):,} valid marine records | skipped: {dict(skipped)}")

    with open(OUT_CSV, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=OUT_FIELDS)
        w.writeheader(); w.writerows(clean)
    print(f"💾 {OUT_CSV.name} ({OUT_CSV.stat().st_size/1e6:.1f} MB)")

    feats = [{"type": "Feature",
              "properties": {"name": c["scientificName"], "class": c["class"],
                             "family": c["family"], "year": c["year"]},
              "geometry": {"type": "Point", "coordinates": [c["lon"], c["lat"]]}}
             for c in clean[:5000]]
    with open(OUT_GEOJSON, "w", encoding="utf-8") as f:
        json.dump({"type": "FeatureCollection", "features": feats}, f)
    print(f"💾 {OUT_GEOJSON.name} ({len(feats)} points)")

    with open(OUT_SUMMARY, "w", encoding="utf-8") as f:
        json.dump({
            "source": "OBIS portal export (Occurrence.tsv)",
            "raw_file": str(RAW_TSV),
            "total_records": len(clean),
            "unique_species": len([s for s in species if s not in ("Unknown", "")]),
            "top_phylums": dict(phylums.most_common(10)),
            "top_classes": dict(classes.most_common(10)),
            "top_species": dict(species.most_common(10)),
        }, f, indent=1, ensure_ascii=False)
    print(f"💾 {OUT_SUMMARY.name}")
    print("\n🎉 OBIS dataset ready for the app.")

if __name__ == "__main__":
    process()