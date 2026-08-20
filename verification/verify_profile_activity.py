import base64
import json
import os
from playwright.sync_api import sync_playwright

def run_cuj(page):
    os.makedirs("verification/screenshots", exist_ok=True)
    os.makedirs("verification/videos", exist_ok=True)

    header = {"alg": "HS256", "typ": "JWT"}
    payload = {
        "sub": "00000000-0000-0000-0000-000000000000",
        "aud": "authenticated",
        "role": "authenticated",
        "email": "amer@smartapp.local",
        "exp": 2899296000,
        "user_metadata": {"username": "amer"},
        "app_metadata": {"provider": "email"}
    }

    h_b64 = base64.urlsafe_b64encode(json.dumps(header).encode()).decode().rstrip("=")
    p_b64 = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip("=")
    valid_jwt = f"{h_b64}.{p_b64}.mocksignature"

    user_obj = {
        "id": "00000000-0000-0000-0000-000000000000",
        "aud": "authenticated",
        "role": "authenticated",
        "email": "amer@smartapp.local",
        "email_confirmed_at": "2024-01-01T00:00:00Z",
        "user_metadata": {"username": "amer"},
        "app_metadata": {"provider": "email"}
    }

    session_obj = {
        "access_token": valid_jwt,
        "token_type": "bearer",
        "expires_in": 3600,
        "expires_at": 2899296000,
        "refresh_token": "mock-refresh-token",
        "user": user_obj
    }

    def mock_supabase_api(route):
        url = route.request.url
        print(f"[Supabase Intercept] {url}")
        if "profiles" in url:
            route.fulfill(
                status=200,
                content_type="application/json",
                body=json.dumps([{
                    "user_id": "00000000-0000-0000-0000-000000000000",
                    "username": "amer",
                    "display_name": "عامر المجد",
                    "avatar_url": "✨",
                    "bio": "باحث ومطور في النظم الذكية",
                    "title": "مهندس أنظمة",
                    "location": "الرياض، المملكة العربية السعودية",
                    "is_public": True,
                }])
            )
        else:
            route.fulfill(
                status=200,
                content_type="application/json",
                body=json.dumps(session_obj)
            )

    page.route("**/supabase.co/**", mock_supabase_api)

    # Inject valid session token before page load
    page.add_init_script(f"""
      window.localStorage.setItem('sb-nmrckgzmluoavgucqvjh-auth-token', JSON.stringify({json.dumps(session_obj)}));
    """)

    print("Navigating to http://localhost:8080/profile...")
    page.goto("http://localhost:8080/profile")
    page.wait_for_timeout(2500)

    # Hide soft keyboard panel if open
    page.evaluate("""
        const kbd = document.querySelector('[data-soft-keyboard-panel]');
        if (kbd) kbd.style.display = 'none';
    """)

    # Click "سجل النشاط" tab
    print("Clicking سجل النشاط tab...")
    activity_tab = page.get_by_role("button", name="سجل النشاط")
    if activity_tab.is_visible():
        activity_tab.click(force=True)
        page.wait_for_timeout(1500)

    # Scroll down to reveal heatmap & timeline
    page.evaluate("window.scrollBy(0, 300)")
    page.wait_for_timeout(1000)

    # Take screenshot of the GitHub contribution graph & metrics
    print("Taking activity matrix screenshot...")
    page.screenshot(path="verification/screenshots/github_activity_matrix.png")
    page.wait_for_timeout(1000)

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            record_video_dir="verification/videos",
            viewport={"width": 1280, "height": 900}
        )
        page = context.new_page()
        try:
            run_cuj(page)
        finally:
            context.close()
            browser.close()
    print("Verification script finished successfully!")
