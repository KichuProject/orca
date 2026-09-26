import json, os
from pathlib import Path

SAVE_DIR = Path(r"E:\sih\data\sample_fallback")
SAVE_DIR.mkdir(parents=True, exist_ok=True)

# Demo restricted zones (clearly labeled as SAMPLE)
restricted = [
    {
        "name": "DEMO Naval Exercise Area (off Mumbai)",
        "ring": [[72.2, 18.6], [72.9, 18.6], [72.9, 19.1], [72.2, 19.1], [72.2, 18.6]],
        "reason": "Active naval exercise - no civilian vessels allowed"
    },
    {
        "name": "DEMO Offshore Wind Farm Zone (off Rameswaram)",
        "ring": [[79.0, 9.0], [79.5, 9.0], [79.5, 9.4], [79.0, 9.4], [79.0, 9.0]],
        "reason": "Underwater cables - fishing prohibited"
    },
    {
        "name": "DEMO Oil Rig Safety Zone (off Gujarat)",
        "ring": [[70.5, 21.0], [70.8, 21.0], [70.8, 21.3], [70.5, 21.3], [70.5, 21.0]],
        "reason": "Oil platform exclusion zone - 500m radius"
    },
    {
        "name": "DEMO Shipping Lane (Chennai Port Approach)",
        "ring": [[80.2, 12.9], [80.4, 12.9], [80.4, 13.2], [80.2, 13.2], [80.2, 12.9]],
        "reason": "Active shipping lane - fishing vessels must avoid"
    },
]

feats = []
for r in restricted:
    feats.append({
        "type": "Feature",
        "properties": {
            "name": r["name"],
            "kind": "operational_restricted",
            "reason": r["reason"],
            "note": "SAMPLE demo zone - replace with real data in production"
        },
        "geometry": {
            "type": "Polygon",
            "coordinates": [r["ring"]]
        }
    })

out = SAVE_DIR / "custom_restricted_zones.geojson"
out.write_text(json.dumps({
    "type": "FeatureCollection",
    "features": feats
}, indent=1), encoding="utf-8")

print(f"✅ Created {len(feats)} demo restricted zones")
print(f"📁 Saved to: {out}")
for f in feats:
    print(f"  - {f['properties']['name']}")