"""
engine/generate_static_layers.py
One-shot generator for:
  1. Chlorophyll-a GeoJSON  (from Copernicus/HDF5 live cache)
  2. Bathymetry isocontours (from GEBCO GeoTIFF)

Run:
  python -m engine.generate_static_layers
  OR import and call generate_all()
"""

import json
import math
import traceback
from pathlib import Path

CACHE_DIR  = Path(r"E:\sih\data\live_cache")
STATIC_DIR = Path(r"E:\sih\data\static")
OUT_DIR    = CACHE_DIR / "layers"
OUT_DIR.mkdir(parents=True, exist_ok=True)

CHLORO_OUT = OUT_DIR / "chlorophyll_layer.geojson"
BATHO_OUT  = STATIC_DIR / "bathymetry" / "gebco_isobaths.geojson"


# ─────────────────────────────────────────────────────────
# 1. CHLOROPHYLL-a  (Copernicus HDF5 → point GeoJSON)
# ─────────────────────────────────────────────────────────
def generate_chlorophyll():
    """
    Converts the Copernicus/MODIS HDF5 chlorophyll file to a sampled
    GeoJSON FeatureCollection.  Downsamples to ≤1200 visible points.
    """
    nc_path = CACHE_DIR / "sst" / "india_coast_chlorophyll_live.nc"
    if not nc_path.exists():
        print(f"[chlorophyll] Source file not found: {nc_path}")
        return False

    try:
        import h5py
        import numpy as np
    except ImportError:
        print("[chlorophyll] h5py / numpy not installed")
        return False

    try:
        f    = h5py.File(str(nc_path), "r")
        lats = f["latitude"][:]
        lons = f["longitude"][:]
        chl  = f["CHL"][0]                 # shape (nlat, nlon)
        fill_arr = f["CHL"].attrs.get("_FillValue", [-999.0])
        fill = float(fill_arr[0]) if hasattr(fill_arr, '__len__') else float(fill_arr)
        f.close()

        # Mask fill / NaN / out-of-range
        valid_mask = (
            (~np.isnan(chl)) &
            (chl != fill) &
            (chl > 0.01) &
            (chl < 100.0)
        )

        nlat, nlon = chl.shape

        # Subsample: target ~1200 features
        total_valid = int(valid_mask.sum())
        step = max(1, int(math.sqrt(total_valid / 1200)))

        features = []
        for ri in range(0, nlat, step):
            for ci in range(0, nlon, step):
                if not valid_mask[ri, ci]:
                    continue
                val = float(chl[ri, ci])
                lat_v = float(lats[ri])
                lon_v = float(lons[ci])

                # Color scale (log): green → yellow → red
                log_val = math.log10(max(val, 0.01))   # ~ -2 to 1.5
                t = max(0.0, min(1.0, (log_val + 1.3) / 2.8))

                if t < 0.33:
                    color = "#1d8348"    # deep green (oligotrophic)
                elif t < 0.55:
                    color = "#27ae60"    # medium green
                elif t < 0.70:
                    color = "#f9e22e"    # yellow (moderate)
                elif t < 0.85:
                    color = "#e67e22"    # orange
                else:
                    color = "#e74c3c"    # red (very high / bloom)

                if val < 0.1:
                    level = "Oligotrophic"
                elif val < 0.5:
                    level = "Low"
                elif val < 1.5:
                    level = "Moderate"
                elif val < 5.0:
                    level = "High"
                else:
                    level = "Bloom"

                features.append({
                    "type": "Feature",
                    "geometry": {"type": "Point", "coordinates": [round(lon_v, 4), round(lat_v, 4)]},
                    "properties": {
                        "layer": "chlorophyll",
                        "chlorophyll_a_mgm3": round(val, 4),
                        "chlorophyll_mg_m3": round(val, 4),
                        "value": round(val, 4),
                        "productivity_level": level,
                        "color": color,
                        "source": "Copernicus Marine / MODIS-Aqua L3"
                    }
                })

        fc = {
            "type": "FeatureCollection",
            "name": "Chlorophyll-a Concentration (Copernicus / MODIS-Aqua)",
            "features": features
        }
        CHLORO_OUT.write_text(json.dumps(fc, ensure_ascii=False), encoding="utf-8")
        
        # Mirror to static directory
        static_ch = STATIC_DIR / "ecology" / "chlorophyll_layer.geojson"
        static_ch.parent.mkdir(parents=True, exist_ok=True)
        static_ch.write_text(json.dumps(fc, ensure_ascii=False), encoding="utf-8")

        print(f"[chlorophyll] OK {len(features)} features -> {CHLORO_OUT}")
        return True

    except Exception as e:
        print(f"[chlorophyll] ERROR: {e}")
        traceback.print_exc()
        return False


# ─────────────────────────────────────────────────────────
# 2. BATHYMETRY  (GEBCO GeoTIFF → isocontour lines GeoJSON)
# ─────────────────────────────────────────────────────────
# ─────────────────────────────────────────────────────────
# 2. BATHYMETRY  (GEBCO GeoTIFF → isocontour lines GeoJSON)
# ─────────────────────────────────────────────────────────
# Matplotlib requires strictly increasing levels!
# 6 Essential nautical bathymetry depth contours for the Indian Ocean & coastal waters
DEPTH_LEVELS = [-3000, -2000, -1000, -200, -100, -50]

DEPTH_COLORS = {
    -50:    "#38bdf8",   # 50m shallow coastal shelf (bright sky cyan)
    -100:   "#0284c7",   # 100m mid-shelf (ocean blue)
    -200:   "#0369a1",   # 200m continental shelf break / pelagic zone
    -1000:  "#1e40af",   # 1000m continental slope
    -2000:  "#1e3a8a",   # 2000m deep sea
    -3000:  "#0b132b",   # 3000m oceanic basin / trench (abyssal)
}


def _simplify_line(coords, tolerance=0.06):
    """Crude Ramer-Douglas-Peucker to reduce coordinate count."""
    if len(coords) < 3:
        return coords

    def perp_dist(p, a, b):
        ax, ay = a; bx, by = b; px, py = p
        dx, dy = bx - ax, by - ay
        if dx == 0 and dy == 0:
            return math.hypot(px - ax, py - ay)
        t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)
        t = max(0.0, min(1.0, t))
        return math.hypot(px - (ax + t * dx), py - (ay + t * dy))

    dmax, idx = 0.0, 0
    for i in range(1, len(coords) - 1):
        d = perp_dist(coords[i], coords[0], coords[-1])
        if d > dmax:
            dmax, idx = d, i

    if dmax > tolerance:
        r1 = _simplify_line(coords[:idx + 1], tolerance)
        r2 = _simplify_line(coords[idx:], tolerance)
        return r1[:-1] + r2
    return [coords[0], coords[-1]]


def generate_bathymetry():
    tif_path = STATIC_DIR / "bathymetry" / "gebco_2026_n25.0_s-10.0_w55.0_e100.0_geotiff.tif"
    if not tif_path.exists():
        print(f"[bathymetry] GEBCO TIF not found: {tif_path}")
        return False

    try:
        import rasterio
        import numpy as np
        from rasterio.enums import Resampling
    except ImportError:
        print("[bathymetry] rasterio / numpy not installed")
        return False

    try:
        features = []

        with rasterio.open(str(tif_path)) as ds:
            # Scale 16 downsamples the huge 10800x8400 raster to ~675x525 grid (~0.07° per cell),
            # naturally smoothing out jagged noise while capturing all major regional trenches, ridges, and shelves.
            scale = 16
            new_w = ds.width  // scale
            new_h = ds.height // scale
            raw = ds.read(
                1,
                out_shape=(new_h, new_w),
                resampling=Resampling.average
            ).astype(float)          # shape (new_h, new_w)
            data = raw               # 2D array

            bounds = ds.bounds
            lat_arr = np.linspace(bounds.top,    bounds.bottom, new_h)
            lon_arr = np.linspace(bounds.left,   bounds.right,  new_w)

        # Marching-squares contour extraction using matplotlib QuadContourSet.allsegs
        try:
            import matplotlib
            matplotlib.use("Agg")
            import matplotlib.pyplot as plt

            fig, ax = plt.subplots(1, 1, figsize=(6, 6))
            cs = ax.contour(lon_arr, lat_arr, data, levels=DEPTH_LEVELS)
            plt.close(fig)

            for level_idx, level_val in enumerate(cs.levels):
                raw_depth = int(round(level_val))
                pos_depth = abs(raw_depth)
                color = DEPTH_COLORS.get(raw_depth, "#0284c7")

                zone = (
                    "Coastal Shelf (Shallow / Pelagic)" if pos_depth <= 50
                    else "Mid Continental Shelf" if pos_depth <= 100
                    else "Continental Shelf Break" if pos_depth <= 200
                    else "Continental Slope" if pos_depth <= 1000
                    else "Deep Sea Abyssal Plain"
                )

                # cs.allsegs is supported in matplotlib 3.8+ / 3.10+
                segs = cs.allsegs[level_idx] if hasattr(cs, "allsegs") and level_idx < len(cs.allsegs) else []
                for seg in segs:
                    # Filter out short noisy micro-loops (< 12 points)
                    if len(seg) < 12:
                        continue
                    
                    # Filter out tiny localized closed loops (bounding box < 0.25° span)
                    min_lon, max_lon = seg[:, 0].min(), seg[:, 0].max()
                    min_lat, max_lat = seg[:, 1].min(), seg[:, 1].max()
                    if (max_lon - min_lon) < 0.25 and (max_lat - min_lat) < 0.25:
                        continue

                    coords = [[round(float(p[0]), 3), round(float(p[1]), 3)] for p in seg]
                    simplified = _simplify_line(coords, tolerance=0.06)
                    if len(simplified) < 3:
                        continue

                    features.append({
                        "type": "Feature",
                        "geometry": {"type": "LineString", "coordinates": simplified},
                        "properties": {
                            "layer": "bathymetry",
                            "depth_m": pos_depth,
                            "raw_depth_m": raw_depth,
                            "label": f"{pos_depth} m",
                            "fathoms": round(pos_depth * 0.5468, 1),
                            "zone": zone,
                            "color": color,
                            "source": "GEBCO 2026 High-Res Gridded Bathymetry"
                        }
                    })

            print(f"[bathymetry] Extracted {len(features)} contour line features using matplotlib allsegs")

        except Exception as mpl_err:
            print(f"[bathymetry] matplotlib contour extraction error: {mpl_err}")
            traceback.print_exc()

        if not features:
            print("[bathymetry] WARNING: No features generated!")
            return False

        fc = {
            "type": "FeatureCollection",
            "name": "Ocean Bathymetry Isocontours (GEBCO 2026)",
            "features": features
        }
        BATHO_OUT.parent.mkdir(parents=True, exist_ok=True)
        BATHO_OUT.write_text(json.dumps(fc, ensure_ascii=False), encoding="utf-8")
        
        # Also copy to OUT_DIR for unified cache
        cache_batho = OUT_DIR / "bathymetry_layer.geojson"
        cache_batho.write_text(json.dumps(fc, ensure_ascii=False), encoding="utf-8")

        print(f"[bathymetry] OK {len(features)} line features -> {BATHO_OUT}")
        return True

    except Exception as e:
        print(f"[bathymetry] ERROR: {e}")
        traceback.print_exc()
        return False


def generate_all():
    print("=== Generating static GIS layers ===")
    generate_chlorophyll()
    generate_bathymetry()
    print("=== Done ===")


if __name__ == "__main__":
    generate_all()
