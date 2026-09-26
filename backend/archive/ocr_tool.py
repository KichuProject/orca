"""
E:\sih\backend\app\tools\ocr_tool.py
Multi-language OCR: English + Hindi + Tamil + Telugu + Malayalam + Kannada + Bengali
"""
import sys, re, json
from pathlib import Path
from datetime import datetime
sys.path.insert(0, str(Path(__file__).parent))
from common import LIVE

# ============================================================
# CONFIG
# ============================================================
OCR_DIR = LIVE / "alerts" / "ocr"
OCR_DIR.mkdir(parents=True, exist_ok=True)
GFX_DIR = LIVE / "alerts" / "graphics"

# Lazy-load OCR readers (cached after first use)
_readers = {}

def _get_reader(languages):
    """Get or create an EasyOCR reader for the given language list."""
    key = tuple(sorted(languages))
    if key not in _readers:
        import easyocr
        print(f"🔧 Loading EasyOCR for {list(key)}... (first time only, ~30s)")
        _readers[key] = easyocr.Reader(list(key), gpu=False)
    return _readers[key]


# ============================================================
# SMART LANGUAGE DETECTION (by filename pattern)
# ============================================================
def detect_languages_from_filename(filename: str) -> list:
    """Guess which languages are in the image based on filename."""
    fn = filename.lower()
    langs = ['en']  # English is always present
    
    # IMD poster naming patterns
    if any(x in fn for x in ['hindi', 'hi_', '_hi', 'hindi_']):
        langs.append('hi')
    if any(x in fn for x in ['tamil', 'ta_', '_ta', 'tamil_']):
        langs.append('ta')
    if any(x in fn for x in ['telugu', 'te_', '_te', 'telugu_']):
        langs.append('te')
    if any(x in fn for x in ['malayalam', 'ml_', '_ml', 'kerala']):
        langs.append('ml')
    if any(x in fn for x in ['kannada', 'kn_', '_kn']):
        langs.append('kn')
    if any(x in fn for x in ['bengali', 'bn_', '_bn', 'bengal']):
        langs.append('bn')
    if any(x in fn for x in ['marathi', 'mr_', '_mr']):
        langs.append('mr')
    if any(x in fn for x in ['gujarati', 'gu_', '_gu', 'gujarat']):
        langs.append('gu')
    
    return langs


# ============================================================
# TEXT CLEANER — removes garbage, fixes common OCR errors
# ============================================================
def clean_ocr_text(raw_text: str) -> dict:
    """Clean OCR output and separate by language/script."""
    if not raw_text:
        return {"english": "", "hindi": "", "other": "", "combined": ""}
    
    lines = raw_text.split('\n')
    english_lines, hindi_lines, other_lines = [], [], []
    
    for line in lines:
        line = line.strip()
        if not line or len(line) < 3:
            continue
        
        # Count characters by script
        devanagari = sum(1 for c in line if '\u0900' <= c <= '\u097F')  # Hindi
        tamil = sum(1 for c in line if '\u0B80' <= c <= '\u0BFF')
        telugu = sum(1 for c in line if '\u0C00' <= c <= '\u0C7F')
        latin = sum(1 for c in line if c.isalpha() and ord(c) < 128)
        total = len(line)
        
        if total == 0:
            continue
        
        # Classify line by dominant script
        if devanagari / total > 0.3:
            hindi_lines.append(line)
        elif tamil / total > 0.3:
            other_lines.append(f"[TAMIL] {line}")
        elif telugu / total > 0.3:
            other_lines.append(f"[TELUGU] {line}")
        elif latin / total > 0.5:
            english_lines.append(line)
        else:
            other_lines.append(line)
    
    # Fix common OCR typos in English
    english_text = ' '.join(english_lines)
    fixes = {
        'MTEOROLOGICAL': 'METEOROLOGICAL',
        'Mafrior': 'Marine',
        'Yexrs cf Serzic?': 'Years of Service',
        'Io Ih: Meticn': 'to the Nation',
    }
    for bad, good in fixes.items():
        english_text = english_text.replace(bad, good)
    
    return {
        "english": english_text.strip(),
        "hindi": ' '.join(hindi_lines).strip(),
        "other": ' '.join(other_lines).strip(),
        "combined": raw_text.strip()
    }


# ============================================================
# EXTRACT KEY INFO (region, date, warning)
# ============================================================
def extract_warning_info(clean_text: str, filename: str) -> dict:
    """Pull out region, date, and the actual warning message."""
    info = {
        "file": filename,
        "region": "UNKNOWN",
        "date": "UNKNOWN",
        "warning_text": "",
        "severity": "UNKNOWN",
    }
    
    # Region detection
    region_map = {
        "mumbai": "Mumbai / Maharashtra", "kolkata": "Kolkata / West Bengal",
        "ahmedabad": "Ahmedabad / Gujarat", "chennai": "Chennai / Tamil Nadu",
        "hyderabad": "Hyderabad / Telangana", "bhubaneswar": "Bhubaneswar / Odisha",
        "visakhapatnam": "Visakhapatnam / Andhra", "kochi": "Kochi / Kerala",
        "port_blair": "Port Blair / Andaman",
    }
    fname_lower = filename.lower()
    for key, region in region_map.items():
        if key in fname_lower or key in clean_text.lower():
            info["region"] = region
            break
    
    # Date extraction
    date_patterns = [
        r'(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December),?\s*\d{4})',
        r'(\d{4}-\d{2}-\d{2})', r'(\d{2}-\d{2}-\d{4})',
    ]
    for pat in date_patterns:
        m = re.search(pat, clean_text, re.IGNORECASE)
        if m:
            info["date"] = m.group(1)
            break
    
    # Warning text
    warning_patterns = [
        r'(Fishermen are advised[^.]+)',
        r'(not to venture[^.]+)',
        r'(squally weather[^.]+)',
        r'(high wave[^.]+)',
    ]
    for pat in warning_patterns:
        m = re.search(pat, clean_text, re.IGNORECASE)
        if m:
            info["warning_text"] = m.group(1).strip()
            break
    
    # Severity
    low = clean_text.lower()
    if "not to venture" in low:
        info["severity"] = "DANGEROUS - DO NOT VENTURE"
    elif "squally" in low or "cautious" in low:
        info["severity"] = "CAUTION"
    elif "no warning" in low:
        info["severity"] = "SAFE - NO WARNING"
    
    return info


# ============================================================
# MAIN FUNCTION — read one image with smart language detection
# ============================================================
def read_image(image_path: str, languages: list = None) -> dict:
    """Read one image → return structured warning info in all languages."""
    path = Path(image_path)
    if not path.exists():
        return {"error": f"File not found: {image_path}"}
    
    # Auto-detect languages from filename if not provided
    if languages is None:
        languages = detect_languages_from_filename(path.name)
    
    reader = _get_reader(languages)
    results = reader.readtext(str(path))
    
    # Combine all text
    raw_text = '\n'.join([text for _, text, _ in results])
    avg_conf = round(sum(conf for _, _, conf in results) / len(results), 3) if results else 0
    
    # Clean + extract
    cleaned = clean_ocr_text(raw_text)
    info = extract_warning_info(cleaned["english"] + " " + cleaned["hindi"], path.name)
    
    return {
        "file": path.name,
        "languages_detected": languages,
        "confidence": avg_conf,
        "english_text": cleaned["english"][:800],
        "hindi_text": cleaned["hindi"][:400],
        "other_text": cleaned["other"][:400],
        **info
    }


# ============================================================
# MASTER FUNCTION — read ALL IMD posters
# ============================================================
def read_all_imd_warnings() -> dict:
    """Read all IMD posters → save structured JSON."""
    if not GFX_DIR.exists():
        return {"error": f"No graphics folder at {GFX_DIR}"}
    
    images = sorted(list(GFX_DIR.glob("*.png")) + list(GFX_DIR.glob("*.jpg")))
    if not images:
        return {"error": "No images found in graphics folder"}
    
    warnings = []
    for img in images:
        print(f"📄 Reading: {img.name}")
        result = read_image(str(img))
        if "error" not in result:
            warnings.append(result)
    
    output = {
        "source": "IMD Official Warning Posters (Multi-language OCR)",
        "scraped_at": datetime.now().isoformat(),
        "total_images": len(images),
        "warnings_read": len(warnings),
        "warnings": warnings,
    }
    
    out_file = OCR_DIR / "imd_posters_ocr.json"
    out_file.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\n✅ Saved {len(warnings)} warnings to {out_file}")
    return output


# ============================================================
# SELF-TEST
# ============================================================
if __name__ == "__main__":
    result = read_all_imd_warnings()
    print("\n" + "="*70)
    print(f"📊 SUMMARY: {result.get('warnings_read', 0)} warnings extracted")
    print("="*70)
    for w in result.get("warnings", [])[:3]:
        print(f"\n📍 {w.get('region')} ({w.get('date')})")
        print(f"   Severity: {w.get('severity')}")
        print(f"   Languages: {w.get('languages_detected')}")
        print(f"   English: {w.get('english_text', '')[:150]}...")
        if w.get('hindi_text'):
            print(f"   Hindi:   {w['hindi_text'][:150]}...")