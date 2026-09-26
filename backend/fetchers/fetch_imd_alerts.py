"""
fetch_imd_alerts.py — IMD site file (function-based).
Covers: fishermen text warnings + PDF links | warning poster graphics | monsoon status.
(Vision OCR stays in fetch_imd_vision.py)
Rules: zero top-level exec | primary -> fallback (fallback callable directly,
never from __main__) | TEST RUN prints full result data.
"""
import requests, re, json
from bs4 import BeautifulSoup
from pathlib import Path
from datetime import datetime
from urllib.parse import urljoin

SAVE_DIR = Path(r"E:\sih\data\live_cache\alerts")
GFX = SAVE_DIR / "graphics"
SAVE_DIR.mkdir(parents=True, exist_ok=True)
GFX.mkdir(parents=True, exist_ok=True)

# Primary → fallback order
PRIMARY_URL  = "https://rsmcnewdelhi.imd.gov.in/fishermen-warning.php"
FALLBACK_URL = "https://mausam.imd.gov.in/imd_latest/contents/index_fisherman.php"
BASE = "https://mausam.imd.gov.in/imd_latest/contents/"
HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
KEYWORDS = ["fishermen", "warning", "sea area", "coast", "wave", "wind", "squally",
            "gale", "cyclone", "surge", "rough", "not to venture", "suspend",
            "along", "kmph", "knots"]
SKIP = ["coastal_weather_forecast", "seasonal_forecast", "logo", "facebook",
        "twitter", "instagram", "youtube", "android", "apple", "tourism", "marine-small"]

# ================= 0. CLEAN OLD GRAPHICS =================
def clean_old_graphics():
    deleted = 0
    for f in list(GFX.glob("*.png")) + list(GFX.glob("*.jpg")) + list(GFX.glob("*.jpeg")):
        try:
            f.unlink(); deleted += 1
        except Exception:
            pass
    print(f"🧹 Cleaned {deleted} old graphic files")
    return deleted

# ================= 1. TEXT WARNINGS =================
def _scrape_text(url):
    r = requests.get(url, headers=HEADERS, timeout=30)
    if r.status_code != 200:
        raise RuntimeError(f"HTTP {r.status_code}")
    soup = BeautifulSoup(r.text, "html.parser")
    texts = []
    for tag in soup.find_all(["p", "td", "b", "font", "div", "li", "span", "marquee", "h1", "h2", "h3"]):
        t = tag.get_text(" ", strip=True)
        if t and len(t) > 12:
            texts.append(t)
    texts = list(dict.fromkeys(texts))
    warnings = [t for t in texts if any(k in t.lower() for k in KEYWORDS)]
    pdf_links = []
    for a in soup.find_all("a", href=True):
        href = a["href"]
        if href.lower().endswith(".pdf") and "fisherman" in href.lower():
            pdf_links.append(href if href.startswith("http")
                             else f"https://rsmcnewdelhi.imd.gov.in/{href.lstrip('/')}")
    return warnings, list(dict.fromkeys(pdf_links))[:5]

def fetch_imd_text_warnings_primary():
    """PRIMARY: RSMC New Delhi fishermen warning page."""
    w, p = _scrape_text(PRIMARY_URL)
    if not w:
        raise RuntimeError("no warnings on primary page")
    return {"status": "success", "url": PRIMARY_URL, "warning_count": len(w),
            "warnings": w, "pdf_links": p,
            "scraped_at": datetime.now().isoformat()}

def fetch_imd_text_warnings_fallback():
    """FALLBACK: mausam.imd.gov.in fishermen index. (callable directly)"""
    w, p = _scrape_text(FALLBACK_URL)
    return {"status": "success" if w else "no_warnings", "url": FALLBACK_URL,
            "warning_count": len(w), "warnings": w, "pdf_links": p,
            "scraped_at": datetime.now().isoformat()}

def fetch_imd_text_warnings():
    try:
        r = fetch_imd_text_warnings_primary()
    except Exception as e1:
        print(f"  ⚠️ primary failed ({str(e1)[:60]}) -> fallback")
        r = fetch_imd_text_warnings_fallback()
    (SAVE_DIR / "imd_fishermen_alerts.json").write_text(
        json.dumps({"source": "IMD Official Fishermen Warning (live scrape)", **r},
                   indent=1, ensure_ascii=False), encoding="utf-8")
    print(f"✅ Saved {r['warning_count']} text warnings -> imd_fishermen_alerts.json")
    return r

# ================= 2. WARNING GRAPHICS =================
def fetch_imd_warning_graphics():
    html = requests.get(BASE + "index_fisherman.php", headers=HEADERS, timeout=30).text
    paths = re.findall(r'["\'(]([^"\'()<>]*?(?:fishermen|fisher|warning)[^"\'()<>]*?\.(?:png|jpg|jpeg))["\')]', html, re.I)
    paths = [p for p in dict.fromkeys(paths) if not any(s in p.lower() for s in SKIP)]
    if not paths:
        for m in re.findall(r'href="([^"]+\.php)"', html, re.I):
            if "index" in m.lower():
                continue
            try:
                h2 = requests.get(urljoin(BASE, m), headers=HEADERS, timeout=30).text
                paths += re.findall(r'["\'(]([^"\'()<>]*?(?:fishermen|fisher|warning)[^"\'()<>]*?\.(?:png|jpg|jpeg))["\')]', h2, re.I)
            except Exception:
                pass
        paths = [p for p in dict.fromkeys(paths) if not any(s in p.lower() for s in SKIP)]
    saved = []
    for p in paths[:25]:
        url = urljoin(BASE, p)
        if any(s in url.lower() for s in SKIP):
            continue
        try:
            data = requests.get(url, headers=HEADERS, timeout=30).content
            if len(data) > 5000:
                fn = GFX / Path(url.split("?")[0]).name
                fn.write_bytes(data)
                saved.append({"file": fn.name, "url": url})
        except Exception:
            pass
    (SAVE_DIR / "imd_warning_graphics.json").write_text(
        json.dumps({"scraped_at": datetime.now().isoformat(), "graphics": saved}, indent=1))
    print(f"✅ Saved {len(saved)} warning posters -> graphics/")
    return {"status": "success", "saved": len(saved)}

# ================= 3. MONSOON STATUS (absorbed from rainfall file) =================
def fetch_imd_monsoon_status():
    info = []
    for url in ["https://mausam.imd.gov.in/imd_latest/contents/monsoon.php",
                "https://mausam.imd.gov.in/imd_latest/contents/rainfall.php"]:
        try:
            soup = BeautifulSoup(requests.get(url, headers=HEADERS, timeout=30).text, "html.parser")
            for tag in soup.find_all(["p", "font", "b", "td", "div", "h2", "h3"]):
                t = tag.get_text(strip=True)
                if t and len(t) > 20:
                    info.append(t)
        except Exception:
            pass
    (SAVE_DIR / "imd_monsoon_status.json").write_text(
        json.dumps({"source": "IMD Monsoon Scrape", "scraped_at": datetime.now().isoformat(),
                    "monsoon_info": info}, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"✅ IMD monsoon status saved ({len(info)} entries)")
    return {"status": "success", "entries": len(info)}

# ================= TEST RUN =================
if __name__ == "__main__":
    print("=" * 70)
    print("IMD SITE MODULE - TEST RUN")
    print("=" * 70)
    clean_old_graphics()
    w = fetch_imd_text_warnings()
    print(json.dumps({k: w[k] for k in ("status", "url", "warning_count", "pdf_links")}, indent=1))
    print("   sample:", w["warnings"][:2])
    g = fetch_imd_warning_graphics()
    print(json.dumps(g, indent=1))
    m = fetch_imd_monsoon_status()
    print(json.dumps(m, indent=1))
    print("\nCALL LIST:")
    print("  py -c \"import sys; sys.path.insert(0,'fetchers'); from fetch_imd_alerts import fetch_imd_text_warnings; import json; print(json.dumps(fetch_imd_text_warnings(), indent=1))\"")