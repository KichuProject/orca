import os
import requests
from pathlib import Path
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent / ".env")
except ImportError:
    pass

url = "https://bhuvan-app1.nrsc.gov.in/api/lulc/curljson.php"
tk = os.getenv("BHUVAN_LULC_TOKEN", "")

# Test 3 districts: Chennai (3302), Kanniyakumari (3330), Kachchh (2401)
codes = ["3302", "3330", "2401"]

if __name__ == "__main__":
    for c in codes:
        print(f"\n=== Testing District {c} ===")
        params = {"distcode": c, "year": "1112", "token": tk}
        try:
            r = requests.get(url, params=params, timeout=15)
            print(f"Status: {r.status_code}")
            print(f"Raw JSON: {r.text[:500]}")
        except Exception as e:
            print(f"Error: {e}")