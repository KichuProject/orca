import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

SCREENSHOTS_DIR = Path(r"C:\Users\Kishore\.gemini\antigravity-ide\brain\ce4cd313-bec2-43d8-a376-551e514579b3")

async def test_popup():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={'width': 1440, 'height': 900})

        await page.goto("http://localhost:5173/ocean", wait_until="networkidle", timeout=30000)
        await page.wait_for_timeout(3500)

        # Find markers that are currently in the viewport
        markers = page.locator(".lightning-strike-marker")
        count = await markers.count()
        print(f"Total markers: {count}")

        # Evaluate bounding boxes to find one with positive coordinates inside the map container
        clicked = False
        for i in range(count):
            m = markers.nth(i)
            box = await m.bounding_box()
            if box and 200 < box['x'] < 1300 and 150 < box['y'] < 800:
                print(f"Clicking marker {i} at ({box['x']}, {box['y']})...")
                await page.mouse.click(box['x'] + box['width']/2, box['y'] + box['height']/2)
                await page.wait_for_timeout(1000)
                clicked = True
                break

        if clicked:
            snap = SCREENSHOTS_DIR / "lightning_popup_inspected.png"
            await page.screenshot(path=str(snap))
            print(f"Captured {snap.name}")

        # Open Layer Manager
        layer_btn = page.locator("button:has-text('Beacons') + button, button[title*='Layer']").first
        if await layer_btn.is_visible():
            await layer_btn.click()
            await page.wait_for_timeout(1000)
            snap_lm = SCREENSHOTS_DIR / "layer_manager_lightning_verified.png"
            await page.screenshot(path=str(snap_lm))
            print(f"Captured {snap_lm.name}")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(test_popup())
