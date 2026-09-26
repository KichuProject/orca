import os
import requests
try:
    from dotenv import load_dotenv
    from pathlib import Path
    load_dotenv(Path(__file__).resolve().parents[2] / "backend" / ".env")
    load_dotenv(Path(__file__).resolve().parents[1] / ".env")
except ImportError:
    pass

api_key = os.getenv("GROQ_API_KEY", "")

url = "https://api.groq.com/openai/v1/models"

headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json"
}

response = requests.get(url, headers=headers)

print(response.json())