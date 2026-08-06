import os
import json
from playwright.sync_api import sync_playwright

def run_cuj(page):
    # Ensure screenshots and videos directory exist
    os.makedirs("verification/screenshots", exist_ok=True)

    # Listen to console logs and page errors
    page.on("pageerror", lambda err: print(f"[Browser Error] {err}"))
    page.on("console", lambda msg: print(f"[Browser Console] {msg.text}"))

    # Mock DB Watchlist Table requests
    def mock_watchlist(route):
        print(f"[Mock Network] Intercepted DB Watchlist query: {route.request.url}")
        route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps([])
        )

    # Mock Edge Function proxy requests
    def mock_proxy(route):
        request = route.request
        payload = json.loads(request.post_data)
        print(f"[Mock Network] Intercepted Proxy Edge Function action: {payload.get('action')}")

        if payload.get("action") == "search":
            mock_data = {
                "data": [
                    {
                        "chainId": "solana",
                        "dexId": "raydium",
                        "pairAddress": "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
                        "symbol": "SOL",
                        "name": "Wrapped SOL",
                        "priceUsd": "142.50",
                        "priceChange24h": "5.2",
                        "volume24h": "12000000",
                        "liquidityUsd": "45000000",
                        "marketCap": "65000000000",
                        "fdv": "65000000000",
                        "imageUrl": "https://docs.dexscreener.com/~gitbook/image?url=https://198140802-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2F7OmRM9NOmlC1POtFwsnX%2Ficon%2F6BJXvNUMQSXAtDTzDyBK%2Ficon-512x512.png",
                        "baseTokenAddress": "So11111111111111111111111111111111111111112",
                        "quoteTokenAddress": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
                        "quoteTokenSymbol": "USDC",
                        "txns24h": { "buys": 1200, "sells": 1100 },
                        "websites": [{ "label": "Official Website", "url": "https://solana.com" }],
                        "socials": [{ "platform": "twitter", "url": "https://twitter.com/solana" }]
                    }
                ]
            }
        else:
            mock_data = {"data": []}

        route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps(mock_data)
        )

    # Enable network interception
    page.route("**/rest/v1/crypto_watchlist*", mock_watchlist)
    page.route("**/functions/v1/dexscreener-proxy", mock_proxy)

    # Inject mock Supabase auth session token directly into localStorage BEFORE navigation
    page.add_init_script("""
      window.localStorage.setItem('sb-nmrckgzmluoavgucqvjh-auth-token', JSON.stringify({
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expires_in: 3600,
        expires_at: 9999999999,
        token_type: 'bearer',
        user: {
          id: '00000000-0000-0000-0000-000000000000',
          email: 'mock@example.com',
          aud: 'authenticated',
          role: 'authenticated'
        }
      }));
    """)

    # 1. Navigate to the Crypto Watchlist page
    print("Navigating to http://localhost:8080/crypto...")
    page.goto("http://localhost:8080/crypto")
    page.wait_for_timeout(2000)

    # Take screenshot of the watchlist dashboard page (empty state)
    print("Taking watchlist empty state dashboard screenshot...")
    page.screenshot(path="verification/screenshots/crypto_watchlist_dashboard.png")
    page.wait_for_timeout(500)

    # 2. Click on the 'إضافة عملة' button to open the Search Drawer
    print("Opening search drawer...")
    page.click("text=إضافة عملة")
    page.wait_for_timeout(1000)

    # Take screenshot of the empty search drawer
    print("Taking search drawer empty screenshot...")
    page.screenshot(path="verification/screenshots/crypto_search_drawer_empty.png")
    page.wait_for_timeout(500)

    # 3. Search for a coin
    print("Searching for SOL...")
    page.fill("input[placeholder*='اسم العملة']", "SOL")
    page.wait_for_timeout(2000) # wait for debounced api request

    # Take screenshot showing results
    print("Taking search results screenshot...")
    page.screenshot(path="verification/screenshots/crypto_search_results.png")
    page.wait_for_timeout(1000)

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            record_video_dir="verification/videos"
        )
        page = context.new_page()
        try:
            run_cuj(page)
        finally:
            context.close()
            browser.close()
    print("Verification script finished successfully!")
