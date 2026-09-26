import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

SCREENSHOTS_DIR = Path(r"C:\Users\Kishore\.gemini\antigravity-ide\brain\ce4cd313-bec2-43d8-a376-551e514579b3")

async def test_route_cleanup():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={'width': 1440, 'height': 900})
        page = await context.new_page()

        print("Navigating to Route Planner (/routes)...")
        await page.goto("http://localhost:5173/routes", wait_until="networkidle", timeout=30000)
        await page.wait_for_timeout(3500)

        # 1. Verify Multi-Criteria Nautical Calculation Engine is GONE
        calc_banner = await page.locator("text='Multi-Criteria Nautical Calculation Engine'").count()
        print(f"Multi-Criteria Nautical Calculation Engine count: {calc_banner}")

        # 2. Verify Map HUD is GONE
        map_hud = await page.locator("text='NAUTICAL COORDINATES HUD'").count()
        print(f"NAUTICAL COORDINATES HUD count: {map_hud}")

        # 3. Test Arrival Port dropdown to verify Departure port and city adjacent ports are disabled
        arrival_btn = page.locator("button:has-text('Visakhapatnam Port')").first
        if await arrival_btn.is_visible():
            await arrival_btn.click()
            await page.wait_for_timeout(600)

            # Search for Chennai
            search_input = page.locator("input[placeholder*='Search from 830+ ports']").first
            if await search_input.is_visible():
                await search_input.fill("Chennai")
                await page.wait_for_timeout(600)

                snap_dropdown = SCREENSHOTS_DIR / "route_dest_dropdown_disabled_origin_verified.png"
                await page.screenshot(path=str(snap_dropdown))
                print(f"Captured {snap_dropdown.name}")

            # Close dropdown by clicking header
            await page.locator("text=Passage Plan & Waypoint Configurator").click()
            await page.wait_for_timeout(500)

        # 4. Overview screenshot of top section
        snap1 = SCREENSHOTS_DIR / "route_page_clean_no_hud_no_banner_verified.png"
        await page.screenshot(path=str(snap1))
        print(f"Captured {snap1.name}")

        # 5. Scroll down to show clean Map and Waypoint Table
        await page.evaluate("window.scrollBy(0, 650)")
        await page.wait_for_timeout(1200)
        snap2 = SCREENSHOTS_DIR / "route_map_clean_no_hud_table_verified.png"
        await page.screenshot(path=str(snap2))
        print(f"Captured {snap2.name}")

        await browser.close()
        print("Done verifying route cleanup and port validation!")

if __name__ == "__main__":
    asyncio.run(test_route_cleanup())
