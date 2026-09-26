import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

SCREENSHOTS_DIR = Path(r"C:\Users\Kishore\.gemini\antigravity-ide\brain\ce4cd313-bec2-43d8-a376-551e514579b3")

async def test_route_coordinates():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={'width': 1500, 'height': 950})
        page = await context.new_page()

        print("Navigating to Route Planner (/routes)...")
        await page.goto("http://localhost:5173/routes", wait_until="networkidle", timeout=30000)
        await page.wait_for_timeout(4000)

        # 1. Take overview screenshot of Route Planner with Map and Clearance card
        snap1 = SCREENSHOTS_DIR / "route_map_coordinates_hud_verified.png"
        await page.screenshot(path=str(snap1))
        print(f"Captured {snap1.name}")

        # 2. Hover over a waypoint marker to inspect the tooltip
        circle_markers = await page.locator("path.leaflet-interactive").all()
        print(f"Found {len(circle_markers)} leaflet interactive paths on map")
        
        # Hover near the middle circle marker
        if len(circle_markers) >= 4:
            target_marker = circle_markers[len(circle_markers) // 2]
            try:
                box = await target_marker.bounding_box()
                if box:
                    await page.mouse.move(box['x'] + box['width']/2, box['y'] + box['height']/2)
                    await page.wait_for_timeout(1000)
                    snap2 = SCREENSHOTS_DIR / "route_map_waypoint_hover_tooltip.png"
                    await page.screenshot(path=str(snap2))
                    print(f"Captured {snap2.name}")
            except Exception as e:
                print(f"Hover marker note: {e}")

        # 3. Click the Copy All Route Fixes button
        copy_btn = page.locator("button:has-text('Copy All Route Fixes')").first
        if await copy_btn.is_visible():
            await copy_btn.click()
            await page.wait_for_timeout(800)
            snap3 = SCREENSHOTS_DIR / "route_map_copied_feedback.png"
            await page.screenshot(path=str(snap3))
            print(f"Captured {snap3.name}")

        # 4. Scroll down to show the Detailed Passage Plan Table with Lat, Lon, Depth, and Clearance
        await page.evaluate("window.scrollBy(0, 600)")
        await page.wait_for_timeout(1000)
        snap4 = SCREENSHOTS_DIR / "route_waypoint_table_verified.png"
        await page.screenshot(path=str(snap4))
        print(f"Captured {snap4.name}")

        await browser.close()
        print("Done verifying route coordinates on map!")

if __name__ == "__main__":
    asyncio.run(test_route_coordinates())
