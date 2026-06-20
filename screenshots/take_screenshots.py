import asyncio
from pathlib import Path
from pyppeteer import launch

BASE_URL = "http://172.27.39.32:8081"
OUTPUT_DIR = Path("/opt/trae/InsightOps/screenshots")

USERNAME = "admin"
PASSWORD = "admin123"

PAGES = [
    {"name": "01-dashboard", "path": "/dashboard", "label": "仪表盘"},
    {"name": "02-devices", "path": "/devices", "label": "设备管理"},
    {"name": "03-alerts", "path": "/alerts", "label": "告警中心"},
    {"name": "04-logs", "path": "/logs", "label": "日志分析"},
    {"name": "05-settings", "path": "/settings", "label": "系统设置"},
    {"name": "06-profile", "path": "/profile", "label": "个人中心"},
    {"name": "07-help", "path": "/help", "label": "帮助页面"},
    {"name": "08-login", "path": "/login", "label": "登录页面"},
]


async def take_screenshots():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    print("Launching browser...")
    browser = await launch(
        headless=True,
        args=[
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-gpu",
        ],
    )
    page = await browser.newPage()
    await page.setViewport({"width": 1440, "height": 900})

    # First take login page screenshot
    print("Taking screenshot: 登录页面")
    await page.goto(f"{BASE_URL}/login", {"waitUntil": "networkidle0", "timeout": 30000})
    await asyncio.sleep(3)
    await page.screenshot({"path": str(OUTPUT_DIR / "08-login.png"), "fullPage": False})
    print("  Saved login page")

    # Step 2: Perform login via API directly by setting localStorage
    print("Setting auth token in localStorage...")
    await page.evaluate(
        """() => {
            localStorage.setItem('token', '027e9551344067b0db620ff27978a537784e2bdea40c1847722be4440212beb0');
            localStorage.setItem('username', 'admin');
            localStorage.setItem('is_admin', 'true');
        }"""
    )

    # Step 3: Navigate to dashboard and check redirect
    print("Navigating to dashboard...")
    await page.goto(f"{BASE_URL}/dashboard", {"waitUntil": "networkidle0", "timeout": 30000})
    await asyncio.sleep(5)  # Wait for data to load

    # Step 4: Take screenshots of each page
    for pg in PAGES:
        try:
            print(f"Taking screenshot: {pg['label']} ({pg['path']})")
            await page.goto(
                f"{BASE_URL}{pg['path']}",
                {"waitUntil": "networkidle0", "timeout": 30000},
            )
            await asyncio.sleep(4)  # Wait for charts/data to render

            output_path = OUTPUT_DIR / f"{pg['name']}.png"
            await page.screenshot({"path": str(output_path), "fullPage": False})
            print(f"  Saved: {output_path}")
        except Exception as e:
            print(f"  Failed to capture {pg['path']}: {e}")

    await browser.close()
    print(f"\nAll screenshots saved to {OUTPUT_DIR}/")


if __name__ == "__main__":
    asyncio.run(take_screenshots())
