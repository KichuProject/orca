"""
E:\sih\backend\fetchers\extract_imd_vision.py
Vision-to-Markdown Pipeline for IMD Warning Posters (NVIDIA NIM Cloud Version)
"""
import requests
import json
import time
import base64
import io
import os
from pathlib import Path
from datetime import datetime
from PIL import Image
from dotenv import load_dotenv

# Load API key from the .env file we created in Phase 3
load_dotenv(Path(__file__).parent.parent / ".env")
NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY")
if not NVIDIA_API_KEY:
    raise ValueError("❌ NVIDIA_API_KEY not found in backend/.env file! Add it now.")

# ============================================================
# PATHS & CONFIG
# ============================================================
GRAPHICS_DIR = Path(r"E:\sih\data\live_cache\alerts\graphics")
VISION_DIR   = Path(r"E:\sih\data\live_cache\alerts\vision")
VISION_DIR.mkdir(parents=True, exist_ok=True)

# NVIDIA Vision Model (Gemma 4 31B supports vision natively)
MODEL_NAME = "meta/llama-3.2-11b-vision-instruct" 
INVOKE_URL = "https://integrate.api.nvidia.com/v1/chat/completions"

# ============================================================
# THE EXTRACTION PROMPT
# ============================================================
PROMPT = """You are an expert document extraction AI. Your task is to transcribe the provided IMD (India Meteorological Department) fishermen warning image into clean, structured Markdown.

CRITICAL RULES:
1. PRESERVE LAYOUT: Convert visual tables into Markdown tables. Preserve headings, bullet points, and sections.
2. EXACT WORDING: Do not summarize. Transcribe every word exactly as it appears.
3. PRESERVE "NIL": If a warning says "Nil" or "No Warning", you MUST include it. This is critical safety data.
4. DATES & NUMBERS: Preserve all dates, times, wind speeds (kmph/knots), wave heights, and coordinates exactly.
5. LINKS: If any URLs or website links are visible, include them.
6. DO NOT HALLUCINATE: Only output what is visible in the image.

Output ONLY the Markdown text. Do not include introductory or concluding remarks.
"""

def optimize_image_base64(image_path: Path, max_dim: int = 1024) -> str:
    """
    Resizes large images to max 1024px and converts to JPEG base64 to save API tokens.
    """
    with Image.open(image_path) as img:
        if img.mode != 'RGB':
            img = img.convert('RGB')
        if max(img.size) > max_dim:
            img.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)
        
        buffer = io.BytesIO()
        img.save(buffer, format="JPEG", quality=85)
        return base64.b64encode(buffer.getvalue()).decode('utf-8')

def extract_image_to_markdown(image_path: Path) -> str:
    """Sends optimized image to NVIDIA NIM and returns Markdown."""
    print(f"👁️  Processing {image_path.name} via NVIDIA {MODEL_NAME}...")
    
    start_time = time.time()
    img_b64 = optimize_image_base64(image_path)
    
    # Format base64 for OpenAI-compatible API (NVIDIA uses this format)
    image_url = f"data:image/jpeg;base64,{img_b64}"
    
    headers = {
        "Authorization": f"Bearer {NVIDIA_API_KEY}",
        "Accept": "application/json"
    }
    
    payload = {
        "model": MODEL_NAME,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": PROMPT},
                    {"type": "image_url", "image_url": {"url": image_url}}
                ]
            }
        ],
        "temperature": 0.1,
        "top_p": 0.95,
        "max_tokens": 4096,
        "stream": False
    }
    
    try:
        response = requests.post(INVOKE_URL, headers=headers, json=payload, timeout=120)
        response.raise_for_status()
        result = response.json()
        
        # Extract text from OpenAI-compatible response format
        md_text = result['choices'][0]['message']['content']
        
    except requests.exceptions.RequestException as e:
        print(f"   ❌ API Error: {e}")
        return f"ERROR: Failed to extract - {e}"
    
    elapsed = round(time.time() - start_time, 1)
    print(f"   ✅ Extracted in {elapsed}s")
    return md_text

def main():
    # ============ FORCE FRESH EXTRACTION (CLEANUP) ============
    print("🧹 Cleaning older vision extraction data...")
    deleted_count = 0
    for old_md in VISION_DIR.glob("*.md"):
        try:
            old_md.unlink()
            deleted_count += 1
        except Exception as e:
            print(f"   ⚠️ failed to delete {old_md.name}: {e}")
            
    old_index = VISION_DIR / "vision_index.json"
    if old_index.exists():
        try:
            old_index.unlink()
            deleted_count += 1
        except Exception as e:
            print(f"   ⚠️ failed to delete vision_index.json: {e}")
    print(f"✅ Cleaned {deleted_count} older files.\n")
    # ==========================================================

    images = sorted(GRAPHICS_DIR.glob("*.png")) + sorted(GRAPHICS_DIR.glob("*.jpg"))
    if not images:
        print("❌ No images found in graphics folder!")
        return

    print(f"🚀 Found {len(images)} IMD warning posters. Starting NVIDIA Vision Extraction...\n")
    index_data = []
    
    for img_path in images:
        md_text = extract_image_to_markdown(img_path)
        
        md_filename = img_path.stem + ".md"
        md_path = VISION_DIR / md_filename
        md_path.write_text(md_text, encoding="utf-8")
        
        index_data.append({
            "image_file": img_path.name,
            "markdown_file": md_filename,
            "source_url": "https://mausam.imd.gov.in/imd_latest/contents/index_fisherman.php",
            "extracted_at": datetime.now().isoformat(),
            "preview": md_text[:200].replace('\n', ' ') + "..."
        })

    index_path = VISION_DIR / "vision_index.json"
    index_path.write_text(json.dumps(index_data, indent=2, ensure_ascii=False), encoding="utf-8")
    
    print("\n" + "="*60)
    print(f"🏆 EXTRACTION COMPLETE!")
    print(f"📁 Markdown files saved to: {VISION_DIR}")
    print(f"📋 Master index saved to:   {index_path}")
    print("="*60)

if __name__ == "__main__":
    main()