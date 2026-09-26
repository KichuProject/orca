import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

SCREENSHOTS_DIR = Path(r"C:\Users\Kishore\.gemini\antigravity-ide\brain\ce4cd313-bec2-43d8-a376-551e514579b3")

async def test_click_marker():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={'width': 1440, 'height': 900})

        await page.goto("http://localhost:5173/ocean", wait_until="networkidle", timeout=30000)
        await page.wait_for_timeout(3500)

        # Zoom in slightly on Bay of Bengal / Coromandel so strikes are centered and clear
        zoom_in = page.locator(".leaflet-control-zoom-in")
        if await zoom_in.is_visible():
            await zoom_in.click()
            await page.wait_for_timeout(1000)

        # Click the first visible lightning strike marker
        strike = page.locator(".lightning-strike-marker").first
        await strike.dispatch_event("click")
        await page.wait_for_timeout(1200)

        snap = SCREENSHOTS_DIR / "lightning_marker_popup_open.png"
        await page.screenshot(path=str(snap))
        print(f"Captured {snap.name}")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(test_click_marker())
