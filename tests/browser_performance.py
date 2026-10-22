"""Verify the compact player, audio, visualizer themes, and optional panels."""

from pathlib import Path

from playwright.sync_api import expect, sync_playwright

target = Path("artifacts/browser")
target.mkdir(parents=True, exist_ok=True)
with sync_playwright() as playwright:
    browser = playwright.chromium.launch(
        headless=True, args=["--use-angle=swiftshader", "--enable-webgl", "--enable-unsafe-swiftshader"]
    )
    page = browser.new_page(viewport={"width": 1440, "height": 1000})
    page.add_init_script("""
      window.__musicAnalysers=[];
      const Original=window.AudioContext;
      window.AudioContext=class extends Original {
        createAnalyser(){const a=super.createAnalyser();window.__musicAnalysers.push(a);return a;}
      };
    """)
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto("http://127.0.0.1:3000")
    page.wait_for_load_state("networkidle")
    expect(page.locator("canvas").first).to_be_visible()
    expect(page.get_by_role("dialog")).not_to_be_visible()
    assert page.evaluate("document.documentElement.scrollHeight <= innerHeight")
    page.get_by_role("button", name="Play performance", exact=True).click()
    expect(page.get_by_role("button", name="Pause performance", exact=True)).to_be_visible()
    page.wait_for_function(
        """() => {return window.__musicAnalysers.some(a=>{if(a.context.state!=="running")return false;
      const data=new Float32Array(a.fftSize);a.getFloatTimeDomainData(data);
      return Math.max(...data.map(Math.abs))>.0001;});}""",
        timeout=20000,
    )
    expect(page.locator(".milkdrop-canvas canvas")).to_be_visible(timeout=20000)
    assert page.get_by_role("button", name="Start music", exact=True).count() == 0
    page.locator(".play-toggle").blur()
    page.mouse.move(700, 400)
    page.wait_for_function(
        "parseFloat(getComputedStyle(document.querySelector('.player-deck')).opacity) < .1", timeout=15000
    )
    page.mouse.move(700, 800)
    page.wait_for_timeout(450)
    assert float(page.locator(".player-deck").evaluate("e => getComputedStyle(e).opacity")) > 0.9
    page.screenshot(path=str(target / "music-player.png"))
    first = page.locator("canvas").first.screenshot()
    page.wait_for_timeout(500)
    assert first != page.locator("canvas").first.screenshot()
    assert page.get_by_label("Visualizer theme").input_value() == "random"
    page.locator(".effects-menu > summary").click()
    for mode in ["geometry", "galaxy", "hyperspace", "crystals", "aurora", "prism", "solar", "nebula"]:
        page.get_by_label("Visualizer theme").select_option(mode)
        expect(page.locator("canvas").first).to_be_visible()
        if mode in ["geometry", "galaxy", "hyperspace", "crystals"]:
            expect(page.locator(".shape-canvas canvas")).to_be_visible()
            page.wait_for_timeout(450)
            before = page.locator(".shape-canvas canvas").screenshot()
            page.wait_for_timeout(350)
            assert before != page.locator(".shape-canvas canvas").screenshot()
            page.screenshot(path=str(target / f"three-{mode}.png"))
            assert page.locator("canvas").count() == 1
    page.get_by_role("button", name="Playlist", exact=True).click()
    expect(page.get_by_role("heading", name="Kept tracks", exact=True)).to_be_visible()
    expected = len(page.request.get("http://127.0.0.1:3000/api/performances").json())
    assert page.locator(".playlist-track").count() == expected
    page.get_by_role("button", name="Close panel", exact=True).click()
    page.get_by_role("button", name="Sound settings", exact=True).click()
    expect(page.get_by_text("24 INSTRUMENTS", exact=True)).to_be_visible()
    page.get_by_role("button", name="Close panel", exact=True).click()
    page.get_by_role("button", name="Pause performance", exact=True).click()
    page.get_by_role("slider", name="Seek track", exact=True).press("ArrowRight")
    page.get_by_role("button", name="Play performance", exact=True).click()
    page.get_by_role("button", name="Fullscreen visualizer", exact=True).click()
    expect(page.locator("main")).to_have_class(__import__("re").compile(r"player-shell recording"))
    page.screenshot(path=str(target / "player-fullscreen.png"))
    page.keyboard.press("Escape")
    page.evaluate("async()=>{if(document.fullscreenElement)await document.exitFullscreen();}")
    expect(page.get_by_role("button", name="Stop playback", exact=True)).to_be_visible()
    page.get_by_role("button", name="Stop playback", exact=True).click()
    page.get_by_role("button", name="Codex composers", exact=True).click()
    page.get_by_label("Use Codex competitions").uncheck()
    page.get_by_role("button", name="Close panel", exact=True).click()

    def short_score(route):
        response = route.fetch()
        payload = response.json()
        if isinstance(payload, dict) and "durationS" in payload:
            payload["durationS"] = 3
        route.fulfill(response=response, json=payload)

    page.route("**/api/radio/next", short_score)
    page.route(
        "**/api/performances",
        lambda route: short_score(route) if route.request.method == "POST" else route.continue_(),
    )
    with page.expect_response(
        lambda response: response.url.endswith("/api/performances") and response.request.method == "POST"
    ):
        page.get_by_role("button", name="Start endless radio", exact=True).click()
    with page.expect_response(
        lambda response: response.url.endswith("/api/radio/next"), timeout=20000
    ) as advance:
        pass
    assert advance.value.status == 200
    page.get_by_role("button", name="Stop endless radio", exact=True).click()
    page.set_viewport_size({"width": 390, "height": 844})
    page.screenshot(path=str(target / "music-player-mobile.png"))
    assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
    assert page.evaluate("document.documentElement.scrollHeight <= innerHeight")
    assert not errors, errors
    browser.close()
print(
    "PASS: compact player, real audio, seek/pause/stop, Butterchurn and eight Three.js themes, "
    "playlist, settings, "
    "fullscreen, radio and mobile."
)
