import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

SCREENSHOTS_DIR = Path(r"C:\Users\Kishore\.gemini\antigravity-ide\brain\ce4cd313-bec2-43d8-a376-551e514579b3")

async def test_lightning_map():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={'width': 1440, 'height': 900})
        page = await context.new_page()

        print("Navigating to Ocean Explorer (/ocean)...")
        await page.goto("http://localhost:5173/ocean", wait_until="networkidle", timeout=30000)
        await page.wait_for_timeout(3500)

        # 1. Take overview screenshot showing lightning markers & cells on map
        snap1 = SCREENSHOTS_DIR / "ocean_map_live_lightning_layer.png"
        await page.screenshot(path=str(snap1))
        print(f"Captured {snap1.name}")

        # 2. Check if lightning strike marker is rendered
        markers = await page.locator(".lightning-strike-marker").all()
        print(f"Found {len(markers)} lightning strike markers on map!")

        for m in markers:
            if await m.is_visible():
                await m.click(force=True)
                await page.wait_for_timeout(1000)
                snap2 = SCREENSHOTS_DIR / "lightning_strike_popup_verified.png"
                await page.screenshot(path=str(snap2))
                print(f"Captured {snap2.name}")
                break

        # 3. Open Layer Manager to verify toggle
        layer_btn = page.locator("button:has-text('Layers'), button[title*='Layer']").first
        if await layer_btn.is_visible():
            await layer_btn.click()
            await page.wait_for_timeout(800)
            snap3 = SCREENSHOTS_DIR / "layer_manager_lightning_active.png"
            await page.screenshot(path=str(snap3))
            print(f"Captured {snap3.name}")

        await browser.close()
        print("Done map lightning verification!")

if __name__ == "__main__":
    asyncio.run(test_lightning_map())
