import os
from playwright.sync_api import sync_playwright

def run_cuj(page):
    # Navigate to homepage
    page.goto("http://localhost:8080")
    page.wait_for_timeout(1000)
    page.screenshot(path="/app/verification/screenshots/homepage.png")

    # Navigate to Browse page
    page.goto("http://localhost:8080/browse")
    page.wait_for_timeout(1000)
    page.screenshot(path="/app/verification/screenshots/browse.png")

    # Navigate to Mihrab page
    page.goto("http://localhost:8080/mihrab")
    page.wait_for_timeout(1000)
    page.screenshot(path="/app/verification/screenshots/mihrab.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            record_video_dir="/app/verification/videos"
        )
        page = context.new_page()
        try:
            run_cuj(page)
        finally:
            context.close()
            browser.close()
    print("Verification script finished successfully!")
