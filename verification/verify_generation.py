import os
import glob
from playwright.sync_api import sync_playwright

def run_verification(page):
    # Navigate to German Club shelf detail
    page.goto("http://localhost:8080/german-club/shelf/flirt-romance")
    page.wait_for_timeout(1000)

    # Click admin burning ember button "D" if visible (or verify page layout)
    d_button = page.get_by_title("تأليث وتزويد الرف بالذكاء الاصطناعي (أداة المشرف)")
    if d_button.is_visible():
        d_button.click()
        page.wait_for_timeout(1000)

    page.screenshot(path="/home/jules/verification/screenshots/shelf_detail_admin.png")
    page.wait_for_timeout(1000)

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            record_video_dir="/home/jules/verification/videos"
        )
        page = context.new_page()
        try:
            run_verification(page)
        finally:
            context.close()
            browser.close()
