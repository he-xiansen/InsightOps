import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

BASE_URL = "http://172.27.39.32:8081"
OUTPUT_DIR = Path("/opt/trae/InsightOps/screenshots/logged-in")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

USERNAME = "admin"
PASSWORD = "admin123"

PAGES = [
    ("dashboard", "/dashboard", "01-dashboard"),
    ("devices", "/devices?status=all", "02-devices"),
    ("alerts", "/alerts", "03-alerts"),
    ("logs", "/logs", "04-logs"),
    ("settings", "/settings", "05-settings"),
    ("profile", "/profile", "06-profile"),
]

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={"width": 1440, "height": 900},
            device_scale_factor=1,
        )
        page = await context.new_page()

        # --- Login ---
        await page.goto(f"{BASE_URL}/login")
        await page.wait_for_selector('input[placeholder="请输入用户名"]')
        await page.fill('input[placeholder="请输入用户名"]', USERNAME)
        await page.fill('input[placeholder="请输入密码"]', PASSWORD)
        await page.click('button:has-text("登录")')

        # Wait for navigation / redirect to dashboard
        await page.wait_for_url("**/dashboard", timeout=10000)
        await page.wait_for_timeout(2000)  # let charts/animations settle

        # --- Screenshot each page ---
        for label, path, filename in PAGES:
            await page.goto(f"{BASE_URL}{path}", wait_until="networkidle")
            await page.wait_for_timeout(1500)  # let lazy-load finish
            filepath = OUTPUT_DIR / f"{filename}.png"
            await page.screenshot(path=str(filepath), full_page=False)
            print(f"OK {filename}.png ({filepath.stat().st_size} bytes) — {label}")

        await browser.close()

asyncio.run(main())
