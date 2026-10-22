"""Regression: MilkDrop canvas, GL viewport and CSS aspect must agree, at every quality."""

from pathlib import Path

from playwright.sync_api import expect, sync_playwright

Path("artifacts/browser").mkdir(parents=True, exist_ok=True)
with sync_playwright() as p:
    browser = p.chromium.launch(
        headless=True, args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader"]
    )
    page = browser.new_page(viewport={"width": 1440, "height": 1000})
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto("http://127.0.0.1:3000")
    expect(page.locator(".milkdrop-canvas canvas")).to_be_visible(timeout=30000)
    assert page.locator(".performance-canvas").count() == 0
    expect(page.locator(".milkdrop-canvas")).to_have_attribute("data-source", "silent-preview")
    page.get_by_role("button", name="Play performance", exact=True).click()
    expect(page.locator(".milkdrop-canvas")).to_have_attribute("data-source", "music", timeout=30000)
    canvas = page.locator(".milkdrop-canvas canvas")
    expect(canvas).to_be_visible(timeout=30000)

    def verify():
        data = canvas.evaluate(
            """e=>{const r=e.getBoundingClientRect(),gl=e.getContext('webgl2');
            return {w:e.width,h:e.height,cw:r.width,ch:r.height,
            viewport:Array.from(gl.getParameter(gl.VIEWPORT))}}"""
        )
        assert data["w"] > 300 or data["h"] > 150, data
        assert abs(data["w"] / data["h"] - data["cw"] / data["ch"]) < 0.002, data
        assert data["viewport"][2:] == [data["w"], data["h"]], data
        return data

    verify()
    page.locator(".effects-menu > summary").click()
    expect(page.get_by_text("Full frame · no crop", exact=True)).to_be_visible()
    page.get_by_label("Render quality", exact=True).select_option("uhd")
    page.wait_for_function("document.querySelector('.milkdrop-canvas canvas').height===2160")
    assert verify()["h"] == 2160
    page.screenshot(path="artifacts/browser/butterchurn-full-frame-uhd.png", timeout=60000)
    page.get_by_label("Render quality", exact=True).select_option("native")
    page.set_viewport_size({"width": 390, "height": 844})
    page.wait_for_timeout(400)
    verify()
    page.get_by_label("Visualizer theme", exact=True).select_option("randomizer")
    expect(page.locator(".randomizer-stage")).to_be_visible()
    first = page.locator(".randomizer-stage").get_attribute("data-effect")
    page.get_by_role("button", name="Next random effect", exact=True).click()
    expect(page.locator(".randomizer-stage")).not_to_have_attribute("data-effect", first)
    assert (
        len(page.get_by_label("Visualizer theme", exact=True).locator("option[value='randomizer']").all())
        == 1
    )
    page.screenshot(path="artifacts/browser/effects-mobile.png")
    page.keyboard.press("Escape")
    assert not page.locator(".effects-menu").evaluate("e=>e.open")
    assert page.evaluate("document.documentElement.scrollWidth<=innerWidth")
    page.emulate_media(reduced_motion="reduce")
    page.set_viewport_size({"width": 1440, "height": 1000})
    page.locator(".effects-menu > summary").click()
    page.get_by_label("Visualizer theme", exact=True).select_option("crystals")
    expect(page.locator(".shape-canvas canvas")).to_be_visible()
    page.screenshot(path="artifacts/browser/player-effects-polished.png")
    page.get_by_label("Visualizer theme", exact=True).select_option("random")
    expect(page.locator(".milkdrop-canvas canvas")).to_be_visible()
    assert page.locator(".performance-canvas").count() == 0
    assert not errors, errors
    browser.close()
print(
    "PASS: full-frame canvas/viewport sizing, UHD, mobile resize, Randomizer, "
    "keyboard dismissal and reduced motion."
)
