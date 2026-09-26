"""
fetch_seasonal_ban.py

FSI SEASONAL BAN SITE FILE - CLEAN FUNCTION-BASED VERSION

Covers:
    1. Scrape FSI Ministry Notifications
    2. Find current year Uniform Ban PDF
    3. Download PDF into data/static/fishban/
    4. Render PDF pages to images
    5. Extract dates using NVIDIA vision model
    6. Fallback to standard 61-day uniform rule if vision fails
    7. Save seasonal_ban.json

Rules:
    Zero top-level execution
    Everything inside functions
    Dynamic year/date by default
    TEST_* constants only inside __main__
    Primary -> fallback
    Fallback callable directly
    TEST RUN prints full result data
"""

import os
import re
import json
import base64
import urllib.parse
import warnings
from pathlib import Path
from datetime import datetime, date

import requests
from bs4 import BeautifulSoup

try:
    from dotenv import load_dotenv
except ImportError:
    load_dotenv = None

try:
    import pymupdf as fitz
except ImportError:
    try:
        import fitz
    except ImportError:
        fitz = None


# ================= CONFIG =================

TARGET_URL = "https://fsi.gov.in/ministry-notifications"

SAVE_DIR_BASE = Path(r"E:\sih\data\static")
FISHBAN_DIR = SAVE_DIR_BASE / "fishban"

PDF_SAVE_PATH = FISHBAN_DIR / "fishing_ban_latest.pdf"
JSON_SAVE_PATH = FISHBAN_DIR / "seasonal_ban.json"

NVIDIA_API_URL = "https://integrate.api.nvidia.com/v1/chat/completions"
NVIDIA_MODEL_DEFAULT = "meta/llama-3.2-90b-vision-instruct"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    )
}

warnings.filterwarnings("ignore", message="Unverified HTTPS request")


# ================= TEST CONSTANTS =================
# Used ONLY by __main__ test run

TEST_YEAR = None          # None = dynamic current year
TEST_MAX_PAGES = 3
TEST_DPI = 150


# ================= HELPERS =================

def _ensure_dirs():
    FISHBAN_DIR.mkdir(parents=True, exist_ok=True)


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


def _env_path():
    return Path(__file__).resolve().parent.parent / ".env"


def _get_nvidia_api_key():
    if load_dotenv is not None:
        load_dotenv(_env_path())
    return os.getenv("NVIDIA_API_KEY", "")


def _get_nvidia_model():
    if load_dotenv is not None:
        load_dotenv(_env_path())
    return os.getenv("NVIDIA_VISION_MODEL", NVIDIA_MODEL_DEFAULT)


def _days_between(start_date, end_date):
    try:
        return (
            date.fromisoformat(end_date)
            - date.fromisoformat(start_date)
        ).days + 1
    except Exception:
        return 61


# ================= 1. SCRAPE + DOWNLOAD PRIMARY =================

def scrape_and_download_primary(target_year=None):
    """
    PRIMARY:
    Scrape FSI notifications and download current year uniform ban PDF.
    """
    _ensure_dirs()

    target_year = int(target_year or datetime.now().year)

    print(f"[INFO] Scraping FSI Notifications for year {target_year}...")

    response = requests.get(
        TARGET_URL,
        headers=HEADERS,
        verify=False,
        timeout=20
    )
    response.raise_for_status()

    soup = BeautifulSoup(response.content, "html.parser")

    pdf_link = None
    order_no = "Unknown"

    for row in soup.find_all("tr"):

        row_text = row.get_text(strip=True)
        row_low = row_text.lower()

        if str(target_year) in row_text and (
            "uniform ban" in row_low or "fishing" in row_low
        ):

            link_tag = row.find("a", href=True)

            if link_tag and link_tag["href"].lower().endswith(".pdf"):

                pdf_link = link_tag["href"]

                cols = row.find_all("td")

                if len(cols) >= 3:
                    order_no = cols[2].get_text(strip=True)

                break

    if not pdf_link:
        raise RuntimeError(
            f"No Uniform Ban notification found for {target_year}"
        )

    full_url = urllib.parse.urljoin(TARGET_URL, pdf_link)

    print(f"[SUCCESS] Found {target_year} notification. Downloading PDF...")

    pdf_response = requests.get(
        full_url,
        headers=HEADERS,
        verify=False,
        timeout=60
    )
    pdf_response.raise_for_status()

    PDF_SAVE_PATH.write_bytes(pdf_response.content)

    print(f"[SUCCESS] PDF saved: {PDF_SAVE_PATH}")

    return True, order_no


# ================= 2. PDF TO IMAGES =================

def pdf_to_images(pdf_path=PDF_SAVE_PATH, max_pages=TEST_MAX_PAGES, dpi=TEST_DPI):
    """
    Render PDF pages into PNG base64 images for vision extraction.
    """
    images = []

    if fitz is None:
        print("[WARN] PyMuPDF not installed - cannot render PDF pages.")
        return images

    try:
        doc = fitz.open(pdf_path)

        for i, page in enumerate(doc):

            if i >= max_pages:
                break

            pix = page.get_pixmap(dpi=dpi)
            images.append(base64.b64encode(pix.tobytes("png")).decode())

        print(f"[INFO] Rendered {len(images)} PDF page(s) to images.")

    except Exception as e:
        print(f"[WARN] PDF->image failed: {e}")

    return images


# ================= 3. NVIDIA VISION EXTRACTION =================

def parse_vision_json(text):
    """
    Parse JSON returned by NVIDIA vision model.
    """
    m = re.search(r"\{.*\}", text, re.S)

    if not m:
        return None

    try:
        data = json.loads(m.group(0))
    except Exception:
        return None

    date_re = re.compile(r"^\d{4}-\d{2}-\d{2}$")

    def clean(d):
        return d if isinstance(d, str) and date_re.match(d) else None

    out = {}

    for coast in ["east_coast", "west_coast", "kerala_override"]:

        block = data.get(coast) or {}

        out[coast] = {
            "ban_start": clean(block.get("ban_start")),
            "ban_end": clean(block.get("ban_end"))
        }

    return out


def nvidia_vision_extract(images):
    """
    Send PDF page images to NVIDIA vision model.
    Returns parsed JSON or None.
    """
    api_key = _get_nvidia_api_key()

    if not api_key:
        print("[WARN] NVIDIA_API_KEY not set - skipping vision extraction.")
        return None

    if not images:
        return None

    prompt = (
        "You are extracting structured data from an Indian Government fishing ban "
        "notification PDF. Read the document carefully and return ONLY valid JSON "
        "in this exact format:\n"
        '{"east_coast": {"ban_start": "YYYY-MM-DD", "ban_end": "YYYY-MM-DD"}, '
        '"west_coast": {"ban_start": "YYYY-MM-DD", "ban_end": "YYYY-MM-DD"}, '
        '"kerala_override": {"ban_start": "YYYY-MM-DD or null", "ban_end": "YYYY-MM-DD or null"}}\n'
        "Convert dates like '15th April, 2026' to '2026-04-15'. Use null if not mentioned."
    )

    content = [
        {
            "type": "text",
            "text": prompt
        }
    ]

    for b64 in images:
        content.append(
            {
                "type": "image_url",
                "image_url": {
                    "url": f"data:image/png;base64,{b64}"
                }
            }
        )

    try:
        resp = requests.post(
            NVIDIA_API_URL,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Accept": "application/json"
            },
            json={
                "model": _get_nvidia_model(),
                "messages": [
                    {
                        "role": "user",
                        "content": content
                    }
                ],
                "max_tokens": 1024,
                "temperature": 0.1
            },
            timeout=120
        )

        resp.raise_for_status()

        text = resp.json()["choices"][0]["message"]["content"]

        print("[INFO] NVIDIA vision model responded.")

        return parse_vision_json(text)

    except Exception as e:
        print(f"[WARN] NVIDIA vision extraction failed: {e}")
        return None


# ================= 4. BUILD BAN DATA =================

def build_ban_data(order_no, vision, target_year=None):
    """
    Build seasonal ban JSON.
    Uses NVIDIA vision result if valid.
    Otherwise uses standard 61-day uniform rule.
    """
    target_year = int(target_year or datetime.now().year)

    east_start = f"{target_year}-04-15"
    east_end = f"{target_year}-06-14"

    west_start = f"{target_year}-06-01"
    west_end = f"{target_year}-07-31"

    data = {
        "dataset": f"India Seasonal Fishing Ban Calendar {target_year}",
        "year": target_year,
        "source": f"FSI/DoF Govt of India, Order {order_no}",
        "extraction": "fallback_rule",
        "east_coast": {
            "states": [
                "West Bengal",
                "Odisha",
                "Andhra Pradesh",
                "Tamil Nadu",
                "Puducherry",
                "Andaman & Nicobar"
            ],
            "ban_start": east_start,
            "ban_end": east_end,
            "duration_days": _days_between(east_start, east_end)
        },
        "west_coast": {
            "states": [
                "Gujarat",
                "Dadra & Nagar Haveli and Daman & Diu",
                "Maharashtra",
                "Goa",
                "Karnataka",
                "Kerala",
                "Lakshadweep"
            ],
            "ban_start": west_start,
            "ban_end": west_end,
            "duration_days": _days_between(west_start, west_end)
        },
        "applies_to": "Mechanized and motorized fishing vessels",
        "exempt": "Traditional non-mechanized / country craft",
        "fetched_at": _now(),
        "pdf_path": str(PDF_SAVE_PATH)
    }

    # Override with NVIDIA vision extraction if valid
    if (
        vision
        and vision.get("east_coast", {}).get("ban_start")
        and vision.get("east_coast", {}).get("ban_end")
        and vision.get("west_coast", {}).get("ban_start")
        and vision.get("west_coast", {}).get("ban_end")
    ):

        data["east_coast"]["ban_start"] = vision["east_coast"]["ban_start"]
        data["east_coast"]["ban_end"] = vision["east_coast"]["ban_end"]
        data["east_coast"]["duration_days"] = _days_between(
            vision["east_coast"]["ban_start"],
            vision["east_coast"]["ban_end"]
        )

        data["west_coast"]["ban_start"] = vision["west_coast"]["ban_start"]
        data["west_coast"]["ban_end"] = vision["west_coast"]["ban_end"]
        data["west_coast"]["duration_days"] = _days_between(
            vision["west_coast"]["ban_start"],
            vision["west_coast"]["ban_end"]
        )

        if (
            vision.get("kerala_override", {}).get("ban_start")
            and vision.get("kerala_override", {}).get("ban_end")
        ):
            data["kerala_override"] = {
                "note": "State-specific override detected by vision model",
                "ban_start": vision["kerala_override"]["ban_start"],
                "ban_end": vision["kerala_override"]["ban_end"]
            }

        data["extraction"] = f"NVIDIA vision model ({_get_nvidia_model()})"

        print("[SUCCESS] Dates extracted by NVIDIA vision model.")

    else:
        print("[INFO] Using standard 61-day uniform rule fallback.")

    return data


# ================= 5. SAVE JSON =================

def save_seasonal_ban(data):
    _ensure_dirs()
    _save_json(JSON_SAVE_PATH, data)
    print(f"[SUCCESS] JSON saved: {JSON_SAVE_PATH}")
    return JSON_SAVE_PATH


# ================= 6. PRIMARY PIPELINE =================

def fetch_seasonal_ban_primary(
    target_year=TEST_YEAR,
    max_pages=TEST_MAX_PAGES,
    dpi=TEST_DPI
):
    """
    PRIMARY:
    Scrape FSI -> download PDF -> vision extract -> save JSON.
    """
    target_year = int(target_year or datetime.now().year)

    success, order_no = scrape_and_download_primary(target_year)

    if not success:
        raise RuntimeError("FSI scrape/download failed")

    images = pdf_to_images(
        pdf_path=PDF_SAVE_PATH,
        max_pages=max_pages,
        dpi=dpi
    )

    vision = nvidia_vision_extract(images)

    data = build_ban_data(
        order_no=order_no,
        vision=vision,
        target_year=target_year
    )

    data["status"] = "success"

    save_seasonal_ban(data)

    return data


# ================= 7. FALLBACK =================

def fetch_seasonal_ban_fallback(target_year=None):
    """
    FALLBACK:
    Use last saved seasonal_ban.json.
    If not present, generate standard uniform rule.
    Callable directly.
    """
    target_year = int(target_year or datetime.now().year)

    old = _load_json(JSON_SAVE_PATH)

    if old:
        old["status"] = "stale_cache"

        if old.get("year") != target_year:
            old["note"] = (
                f"Cached ban year {old.get('year')} used for requested year {target_year}"
            )

        return old

    data = build_ban_data(
        order_no="Standard Uniform Rule",
        vision=None,
        target_year=target_year
    )

    data["status"] = "standard_rule_fallback"

    save_seasonal_ban(data)

    return data


def fetch_seasonal_ban(
    target_year=TEST_YEAR,
    max_pages=TEST_MAX_PAGES,
    dpi=TEST_DPI
):
    """
    Seasonal ban wrapper:
    primary -> fallback
    """
    try:
        return fetch_seasonal_ban_primary(
            target_year=target_year,
            max_pages=max_pages,
            dpi=dpi
        )

    except Exception as e:
        print(f"[WARN] seasonal ban primary failed: {e}")
        return fetch_seasonal_ban_fallback(target_year)


# ================= 8. READER =================

def get_seasonal_ban():
    """
    Returns saved seasonal_ban.json.
    If not present, fetches once.
    """
    data = _load_json(JSON_SAVE_PATH)

    if data:
        return data

    return fetch_seasonal_ban()


# ================= 9. ACTIVE BAN CHECK =================

def check_seasonal_ban(coast="east_coast", check_date=None):
    """
    Check whether ban is active for a coast on a given date.

    coast:
        east_coast
        west_coast
        kerala
    """
    data = get_seasonal_ban()

    if isinstance(check_date, date):
        check_date = check_date.isoformat()

    if not check_date:
        check_date = date.today().isoformat()

    coast_key = coast.strip().lower()

    if coast_key == "kerala" and data.get("kerala_override", {}).get("ban_start"):
        coast_key = "kerala_override"

    block = data.get(coast_key, {})

    start = block.get("ban_start")
    end = block.get("ban_end")

    if not start or not end:
        return {
            "status": "unknown",
            "coast": coast_key,
            "check_date": check_date,
            "message": "No valid ban dates available"
        }

    active = start <= check_date <= end

    return {
        "status": "active" if active else "inactive",
        "coast": coast_key,
        "check_date": check_date,
        "ban_start": start,
        "ban_end": end,
        "source": data.get("source"),
        "extraction": data.get("extraction")
    }


# ================= TEST RUN =================

if __name__ == "__main__":

    print("=" * 70)
    print("FSI SEASONAL BAN MODULE - TEST RUN")
    print("=" * 70)

    result = fetch_seasonal_ban(
        target_year=TEST_YEAR,
        max_pages=TEST_MAX_PAGES,
        dpi=TEST_DPI
    )

    print("\n📦 fetch_seasonal_ban =>")
    print(json.dumps(result, indent=1))

    reader_result = get_seasonal_ban()

    print("\n📦 get_seasonal_ban =>")
    print(json.dumps(reader_result, indent=1))

    east_check = check_seasonal_ban("east_coast")
    west_check = check_seasonal_ban("west_coast")
    kerala_check = check_seasonal_ban("kerala")

    print("\n📦 check_seasonal_ban east_coast =>")
    print(json.dumps(east_check, indent=1))

    print("\n📦 check_seasonal_ban west_coast =>")
    print(json.dumps(west_check, indent=1))

    print("\n📦 check_seasonal_ban kerala =>")
    print(json.dumps(kerala_check, indent=1))

    print("\nCALL LIST:")
    print("  py .\\fetchers\\fetch_seasonal_ban.py")
    print("  py -c \"import sys; sys.path.insert(0,'fetchers'); from fetch_seasonal_ban import fetch_seasonal_ban; import json; print(json.dumps(fetch_seasonal_ban(), indent=1))\"")
    print("  py -c \"import sys; sys.path.insert(0,'fetchers'); from fetch_seasonal_ban import get_seasonal_ban; import json; print(json.dumps(get_seasonal_ban(), indent=1))\"")
    print("  py -c \"import sys; sys.path.insert(0,'fetchers'); from fetch_seasonal_ban import check_seasonal_ban; import json; print(json.dumps(check_seasonal_ban('east_coast'), indent=1))\"")
    print("  py -c \"import sys; sys.path.insert(0,'fetchers'); from fetch_seasonal_ban import check_seasonal_ban; import json; print(json.dumps(check_seasonal_ban('west_coast'), indent=1))\"")
    print("  py -c \"import sys; sys.path.insert(0,'fetchers'); from fetch_seasonal_ban import check_seasonal_ban; import json; print(json.dumps(check_seasonal_ban('kerala'), indent=1))\"")