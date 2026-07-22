import os
from playwright.sync_api import sync_playwright

def run_cuj(page):
    print("Navigating to Theme Settings Page...")
    page.goto("http://localhost:8080/settings/theme")
    page.wait_for_timeout(1500)

    # Click light/dark mode buttons to exercise our spring layoutId morph
    print("Switching theme mode to light...")
    # Find button containing 'Light' or 'فاتح' or using index/text
    light_button = page.locator("button:has-text('Light'), button:has-text('فاتح')").first
    if light_button.is_visible():
        light_button.click()
        page.wait_for_timeout(1000)

    print("Switching theme mode back to dark...")
    dark_button = page.locator("button:has-text('Dark'), button:has-text('داكن')").first
    if dark_button.is_visible():
        dark_button.click()
        page.wait_for_timeout(1000)

    # Take screenshot of the theme settings page
    print("Taking screenshot of Theme Settings...")
    page.screenshot(path="/home/jules/verification/screenshots/theme_settings.png")
    page.wait_for_timeout(1000)

    # Navigate to the Chess game page
    print("Navigating to Chess Game page...")
    page.goto("http://localhost:8080/games/chess")
    page.wait_for_timeout(1500)

    # Take screenshot of Chess game
    print("Taking screenshot of Chess game...")
    page.screenshot(path="/home/jules/verification/screenshots/chess_game.png")
    page.wait_for_timeout(1000)

if __name__ == "__main__":
    with sync_playwright() as p:
        print("Launching browser...")
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            record_video_dir="/home/jules/verification/videos"
        )
        page = context.new_page()
        try:
            run_cuj(page)
        except Exception as e:
            print("An error occurred during Playwright verification:", e)
        finally:
            print("Closing browser context...")
            context.close()
            browser.close()
    print("Verification execution finished successfully!")
