from playwright.sync_api import expect, sync_playwright

with sync_playwright() as p:
    b = p.chromium.launch(headless=True, args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    page = b.new_page(viewport={"width": 1440, "height": 960})
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto("http://127.0.0.1:3000")
    page.wait_for_load_state("networkidle")
    page.locator(".effects-menu > summary").click()
    for mode in ["hyperspace", "crystals", "galaxy"]:
        page.get_by_label("Visualizer theme", exact=True).select_option(mode)
        expect(page.locator(".shape-canvas canvas")).to_be_visible()
        page.wait_for_timeout(1000)
        page.screenshot(path="artifacts/browser/stage-" + mode + ".png")
        assert page.locator("canvas").count() == 1
    page.get_by_label("Visualizer theme", exact=True).select_option("random")
    assert not errors, errors
    b.close()
print("PASS: bloom stage themes render and dispose without page errors.")
