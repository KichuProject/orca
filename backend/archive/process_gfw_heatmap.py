"""
GFW Fishing Effort Heatmap Processor
Standalone script to process Global Fishing Watch bulk data into a spatial heatmap.
"""

import pandas as pd
from pathlib import Path
import json
import glob
import sys

# Configuration
GFW_DIR = Path(r"E:\sih\data\static\gfw")
RAW_DIR = GFW_DIR / "raw"
HEATMAP_FILE = GFW_DIR / "india_fishing_heatmap.json"

# Indian EEZ bounding box (approximate)
INDIA_BBOX = {
    "min_lat": 5.0, "max_lat": 25.0,
    "min_lon": 55.0, "max_lon": 95.0
}

def find_column(df, candidates):
    """Find first matching column name from candidates list."""
    for col in candidates:
        if col in df.columns:
            return col
    return None

def build_fishing_heatmap(max_files=500, sample_rows=None):
    """
    Process GFW fishing effort CSVs into a spatial heatmap.
    
    Args:
        max_files: Maximum number of CSV files to process
        sample_rows: If set, only read this many rows per file (for speed)
    """
    # Find all CSV files
    csv_pattern = str(RAW_DIR / "**" / "*.csv")
    files = sorted(glob.glob(csv_pattern, recursive=True))
    
    if not files:
        print(f"❌ No CSV files found in {RAW_DIR}")
        print("   Download GFW data from: https://globalfishingwatch.org/data/")
        print("   Unzip into: E:\\sih\\data\\static\\gfw\\raw\\")
        return None
    
    print(f"🗺️  Found {len(files)} CSV files in {RAW_DIR}")
    print(f"   Processing up to {min(len(files), max_files)} files...")
    
    frames = []
    processed = 0
    
    for filepath in files[:max_files]:
        try:
            # Read CSV (optionally with row limit for speed)
            df = pd.read_csv(filepath, nrows=sample_rows) if sample_rows else pd.read_csv(filepath)
            
            # Auto-detect column names (GFW v3 format)
            lat_col = find_column(df, ["cell_ll_lat", "lat", "latitude", "Lat", "LAT", "y"])
            lon_col = find_column(df, ["cell_ll_lon", "lon", "longitude", "Lon", "LON", "x"])
            hours_col = find_column(df, [
                "fishing_hours", "fishingHours", "effort", "hours", 
                "apparent_fishing_hours", "fishing_hours_total"
            ])
            
            # Skip if required columns missing
            if not (lat_col and lon_col and hours_col):
                print(f"   ⚠️  Skipping {Path(filepath).name} (missing columns)")
                continue
            
            # Rename to standard names
            df = df[[lat_col, lon_col, hours_col]].rename(columns={
                lat_col: "lat",
                lon_col: "lon", 
                hours_col: "hours"
            })
            
            # Filter to Indian EEZ
            df = df[
                (df.lat >= INDIA_BBOX["min_lat"]) & 
                (df.lat <= INDIA_BBOX["max_lat"]) &
                (df.lon >= INDIA_BBOX["min_lon"]) & 
                (df.lon <= INDIA_BBOX["max_lon"])
            ]
            
            if not df.empty:
                frames.append(df)
                processed += 1
                
        except Exception as e:
            print(f"   ⚠️  Error reading {Path(filepath).name}: {e}")
            continue
    
    if not frames:
        print("❌ No valid data found within Indian bbox")
        return None
    
    print(f"   ✓ Processed {processed} files")
    
    # Combine all data
    all_data = pd.concat(frames, ignore_index=True)
    print(f"   ✓ {len(all_data):,} total records")
    
    # Create 0.5° grid cells
    all_data["grid_lat"] = (all_data.lat * 2).round() / 2
    all_data["grid_lon"] = (all_data.lon * 2).round() / 2
    
    # Aggregate by grid cell
    heatmap = all_data.groupby(["grid_lat", "grid_lon"])["hours"].sum().reset_index()
    
    # Calculate intensity (0-100 scale)
    max_hours = float(heatmap["hours"].max())
    heatmap["intensity"] = (heatmap["hours"] / max_hours * 100).round(1)
    
    # Convert to list of dicts
    cells = [
        {
            "grid_lat": round(row.grid_lat, 2),
            "grid_lon": round(row.grid_lon, 2),
            "total_hours": round(row.hours, 1),
            "intensity": row.intensity
        }
        for row in heatmap.itertuples()
    ]
    
    # Create output JSON
    output = {
        "grid_size_deg": 0.5,
        "max_fishing_hours": round(max_hours, 1),
        "cells": cells,
        "source": "Global Fishing Watch AIS Apparent Fishing Effort (2024)",
        "bbox": INDIA_BBOX,
        "records_processed": len(all_data)
    }
    
    # Save to file
    GFW_DIR.mkdir(parents=True, exist_ok=True)
    HEATMAP_FILE.write_text(json.dumps(output, indent=1), encoding="utf-8")
    
    print(f"\n✅ Heatmap saved: {len(cells)} grid cells")
    print(f"   File: {HEATMAP_FILE}")
    print(f"   Max fishing hours: {max_hours:.1f}")
    print(f"   High intensity cells (>75%): {sum(1 for c in cells if c['intensity'] > 75)}")
    
    return HEATMAP_FILE
VESSELS_CSV = RAW_DIR / "fishing-vessels-v3.csv"
FLEET_STATS_FILE = GFW_DIR / "gfw_fleet_stats.json"

def build_fleet_stats(registry_only=False):
    """Gear/flag composition of 2024 effort in Indian EEZ + Indian fleet profile."""
    gear_pct = flag_pct = {}; foreign_pct = 0.0; total = 0.0

    if registry_only and FLEET_STATS_FILE.exists():
        # Fast mode: reuse already-computed effort stats, fix registry only
        out0 = json.loads(FLEET_STATS_FILE.read_text())
        gear_pct = out0.get("effort_by_gear_pct", {})
        flag_pct = out0.get("effort_by_flag_pct", {})
        foreign_pct = out0.get("foreign_effort_pct", 0.0)
        total = out0.get("total_fishing_hours_india_eez", 0.0)
    else:
        # 1) Effort by gear + flag from the daily fleet CSVs
        frames = []
        files = sorted(glob.glob(str(RAW_DIR / "**" / "fleet-daily-*.csv"), recursive=True))
        for f in files:
            try:
                df = pd.read_csv(f, usecols=["cell_ll_lat", "cell_ll_lon", "flag", "geartype", "fishing_hours"],
                                 low_memory=False)
            except Exception:
                continue
            df = df[(df.cell_ll_lat >= 5) & (df.cell_ll_lat <= 25) &
                    (df.cell_ll_lon >= 55) & (df.cell_ll_lon <= 95)]
            if not df.empty:
                frames.append(df)
        if frames:
            allf = pd.concat(frames, ignore_index=True)
            total = float(allf["fishing_hours"].sum()) or 1.0
            by_gear = allf.groupby("geartype")["fishing_hours"].sum().sort_values(ascending=False)
            by_flag = allf.groupby("flag")["fishing_hours"].sum().sort_values(ascending=False)
            gear_pct = {str(k): round(100*float(v)/total, 1) for k, v in by_gear.head(6).items()}
            flag_pct = {str(k): round(100*float(v)/total, 1) for k, v in by_flag.head(8).items()}
            foreign_pct = round(100*(total - float(by_flag.get("IND", 0)))/total, 1)

    # 2) Indian fleet profile from vessel registry CSV (v3 column names)
    ind_fleet = {"vessels": 0, "gear_counts": {}, "avg_length_m": None}
    if VESSELS_CSV.exists():
        try:
            vf = pd.read_csv(VESSELS_CSV, low_memory=False)
            flag_col = find_column(vf, ["flag_gfw", "flag_registry", "flag_ais", "flag"])
            gear_col = find_column(vf, ["vessel_class_gfw", "vessel_class_registry",
                                        "vessel_class_inferred", "geartype"])
            len_col  = find_column(vf, ["length_m_gfw", "length_m_registry",
                                        "length_m_inferred", "length"])
            yr_col   = find_column(vf, ["year"])
            if yr_col:
                vf = vf[vf[yr_col] == vf[yr_col].max()]      # latest year only (1 row/vessel)
            if flag_col:
                ind = vf[vf[flag_col].astype(str).str.upper() == "IND"]
                ind_fleet["vessels"] = int(len(ind))
                if gear_col:
                    ind_fleet["gear_counts"] = {str(k): int(v)
                                                for k, v in ind[gear_col].value_counts().head(6).items()}
                if len_col:
                    L = pd.to_numeric(ind[len_col], errors="coerce").dropna()
                    if len(L):
                        ind_fleet["avg_length_m"] = round(float(L.mean()), 1)
        except Exception as e:
            print(f"⚠️ vessel registry: {str(e)[:60]}")

    out = {"year": 2024,
           "total_fishing_hours_india_eez": round(total, 1),
           "effort_by_gear_pct": gear_pct,
           "effort_by_flag_pct": flag_pct,
           "foreign_effort_pct": foreign_pct,
           "indian_fleet": ind_fleet,
           "source": "GFW AIS Apparent Fishing Effort v3 + fishing-vessels-v3 registry"}
    FLEET_STATS_FILE.write_text(json.dumps(out, indent=1), encoding="utf-8")
    print(f"✅ Fleet stats saved -> {FLEET_STATS_FILE.name}")
    print(f"   gear: {gear_pct}")
    print(f"   flags: {flag_pct}")
    print(f"   Indian fleet: {ind_fleet['vessels']} vessels, avg {ind_fleet['avg_length_m']} m")
    return FLEET_STATS_FILE

if __name__ == "__main__":
    if "--registry" in sys.argv:
        build_fleet_stats(registry_only=True)   # ~20 sec: fixes Indian fleet only
    elif "--fleet" in sys.argv:
        build_fleet_stats()                     # full recompute
    else:
        # build_fishing_heatmap(max_files=500)
        build_fleet_stats()
# if __name__ == "__main__":
#     # Check if user wants fast mode
#     if "--fast" in sys.argv:
#         print("🚀 Fast mode: processing first 10,000 rows per file")
#         build_fishing_heatmap(max_files=100, sample_rows=10000)
#     else:
#         print("📊 Full mode: processing all data (may take 2-5 minutes)")
#         print("   Tip: Use --fast flag for quick testing")
#         build_fishing_heatmap(max_files=500, sample_rows=None)