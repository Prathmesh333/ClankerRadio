"""Smoke-test the packaged Windows app, not a separately launched web server."""

import json
import os
import socket
import subprocess
import time
import urllib.request
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

root = Path(__file__).resolve().parents[1]
executable = root / "dist/desktop/win-unpacked/Clanker Radio.exe"
assert executable.exists(), "Run npm run desktop:pack first."
output = root / "artifacts/desktop-smoke" / str(int(time.time()))
output.mkdir(parents=True)
with socket.socket() as listener:
    listener.bind(("127.0.0.1", 0))
    debug_port = listener.getsockname()[1]
env = {**os.environ, "CLANKER_DESKTOP_DATA": str(output / "data")}
env.pop("ELECTRON_RUN_AS_NODE", None)
with (output / "desktop.log").open("wb") as log:
    process = subprocess.Popen(
        [str(executable), f"--remote-debugging-port={debug_port}"],
        env=env,
        stdout=log,
        stderr=log,
    )
    try:
        deadline = time.monotonic() + 120
        while True:
            try:
                with urllib.request.urlopen(
                    f"http://127.0.0.1:{debug_port}/json/version", timeout=1
                ) as response:
                    endpoint = json.load(response)["webSocketDebuggerUrl"]
                break
            except (OSError, KeyError):
                assert process.poll() is None, "Desktop process exited during startup."
                assert time.monotonic() < deadline, f"Desktop startup timed out. See {output}"
                time.sleep(0.25)
        with sync_playwright() as p:
            browser = p.chromium.connect_over_cdp(endpoint)
            context = browser.contexts[0]
            page = context.pages[0] if context.pages else context.wait_for_event("page", timeout=90000)
            page.wait_for_url("http://127.0.0.1:*/**", timeout=90000)
            page.wait_for_load_state("domcontentloaded")
            origin = page.url.rstrip("/")
            expect(page.locator(".player-brand img")).to_be_visible()
            assert page.locator(".player-brand img").evaluate("e => e.complete && e.naturalWidth > 0")
            assert page.request.get(origin + "/brand/clanker-radio.png").ok
            assert page.request.get(origin + "/icon.ico").ok
            expect(page.locator(".milkdrop-canvas canvas")).to_be_visible(timeout=30000)
            page.get_by_role("button", name="Play performance", exact=True).click()
            expect(page.get_by_role("button", name="Pause performance", exact=True)).to_be_visible()
            expect(page.locator(".milkdrop-canvas")).to_have_attribute("data-source", "music", timeout=30000)
            expect(page.locator(".audio-spectrum")).to_have_attribute("data-source", "music")
            page.wait_for_function("Number(document.querySelector('.audio-spectrum').dataset.level) > 0.001")
            page.locator(".effects-menu > summary").click()
            expect(page.get_by_label("Auto visual energy", exact=True)).to_be_checked()
            page.evaluate("window.__milkCanvas = document.querySelector('.milkdrop-canvas canvas')")
            first_energy = page.locator(".milkdrop-canvas").get_attribute("data-energy")
            page.wait_for_timeout(1500)
            assert page.locator(".milkdrop-canvas").get_attribute("data-energy") != first_energy
            page.get_by_label("Auto visual energy", exact=True).uncheck()
            page.get_by_label("Visual energy", exact=True).fill("1.2")
            assert page.evaluate("window.__milkCanvas === document.querySelector('.milkdrop-canvas canvas')")
            page.get_by_label("Auto visual energy", exact=True).check()
            blocked = []
            page.on("requestfailed", lambda request: blocked.append((request.url, request.failure)))
            page.evaluate("fetch('https://ad.doubleclick.net/clanker-test').catch(() => null)")
            page.wait_for_timeout(500)
            assert any(any(code in str(failure) for code in ("ERR_BLOCKED_BY_CLIENT", "ERR_UNSAFE_REDIRECT")) for url, failure in blocked), blocked
            fixture = """<html><script>window.ytInitialPlayerResponse={playerAds:[1],videoDetails:{videoId:'fixture'},streamingData:{formats:[{itag:1}]}};</script><body>Provider fixture</body></html>"""
            context.route("https://music.youtube.com/**", lambda route: route.fulfill(status=200, content_type="text/html", body=fixture))
            with context.expect_page() as opened:
                page.evaluate("window.__providerOpen = window.clankerDesktop.openMusic('https://music.youtube.com/playlist?list=PLKBOD9JXe71Y&si=ps8pFHBWF0CUi6yU')")
            provider = opened.value
            provider.wait_for_load_state("domcontentloaded")
            assert provider.evaluate("typeof window.clankerDesktop") == "undefined"
            assert provider.evaluate("window.ytInitialPlayerResponse.playerAds === undefined")
            assert provider.evaluate("window.ytInitialPlayerResponse.videoDetails.videoId") == "fixture"
            assert provider.evaluate("JSON.parse('{\"adSlots\":[1],\"music\":true}').adSlots === undefined")
            assert provider.evaluate("window.ytInitialPlayerResponse.streamingData.formats[0].itag") == 1
            provider.evaluate("window.__playbackMarker = 'keep-playing'")
            page.evaluate("window.clankerDesktop.openMusic('https://music.youtube.com/playlist?list=PLKBOD9JXe71Y&si=ps8pFHBWF0CUi6yU')")
            assert provider.evaluate("window.__playbackMarker") == "keep-playing"
            page.evaluate("window.clankerDesktop.closeMusic()")
            page.get_by_label("Spectrum position", exact=True).select_option("all")
            page.get_by_label("Mirror spectrum", exact=True).check()
            expect(page.locator(".audio-spectrum")).to_have_attribute("data-position", "all")
            expect(page.locator(".audio-spectrum")).to_have_attribute("data-mirror", "true")
            page.get_by_label("Spectrum position", exact=True).select_option("custom")
            page.get_by_label("Horizontal position", exact=False).fill("20")
            page.get_by_label("Vertical position", exact=False).fill("40")
            page.get_by_label("Spectrum position", exact=True).select_option("bottom")
            page.get_by_label("Audio spectrum bars", exact=True).uncheck()
            expect(page.locator(".audio-spectrum")).to_have_count(0)
            page.get_by_label("Audio spectrum bars", exact=True).check()
            page.get_by_label("Visualizer theme", exact=True).select_option("randomizer")
            expect(page.locator(".randomizer-stage")).to_be_visible()
            page.screenshot(path=str(output / "desktop-player.png"))
            assert (output / "data/clanker.db").exists()
            assert (output / "data/assets/performances").exists()
            assert page.request.get(origin + "/api/health").ok
            page.locator(".effects-menu > summary").click()
            page.get_by_role("button", name="Open music link", exact=True).click()
            page.evaluate("window.__lyricTime=5;window.YT={Player:class {constructor(frame,options){this.frame=frame;options.events.onReady();}getCurrentTime(){return window.__lyricTime;}getVideoData(){return {video_id:'fixture'};}destroy(){this.frame.remove();}}}")
            page.route("https://www.youtube.com/embed/**", lambda route: route.fulfill(content_type="text/html", body="<body>Player fixture</body>"))
            page.route("**/api/lyrics?**", lambda route: route.fulfill(json={"status":"synced", "lyrics":"[00:00.00]We light up the night\n[00:08.00]दिल से बजता संगीत", "message":"Fixture lyrics"}))
            page.get_by_label("Track or playlist URL").fill("https://music.youtube.com/playlist?list=PLKBOD9JXe71Y")
            page.get_by_label("Connect Windows computer audio automatically").uncheck()
            page.get_by_role("button", name="Open music link", exact=True).click()
            expect(page.locator(".provider-player iframe")).to_be_attached()
            page.evaluate("window.__providerFrame = document.querySelector('.provider-player iframe')")
            expect(page.locator(".kinetic-lyrics p")).to_have_text("We light up the night ")
            expect(page.locator(".kinetic-lyrics p span").first).to_have_css("-webkit-text-stroke-width", "1.5px")
            assert page.locator(".kinetic-lyrics p").evaluate("e => parseFloat(getComputedStyle(e).columnGap) > 0")
            page.locator(".effects-menu > summary").click()
            page.locator(".effects-menu").get_by_label("Show lyrics", exact=True).uncheck()
            expect(page.locator(".kinetic-lyrics")).to_have_count(0)
            page.evaluate("window.__lyricTime=9")
            page.locator(".effects-menu").get_by_label("Show lyrics", exact=True).check()
            expect(page.locator(".kinetic-lyrics p")).to_have_text("दिल से बजता संगीत ")
            assert page.evaluate("window.__providerFrame === document.querySelector('.provider-player iframe')")
            page.locator(".effects-menu > summary").click()
            page.screenshot(path=str(output / "lyrics-readable-desktop.png"))
            page.get_by_role("button", name="Link & lyrics", exact=True).click()
            expect(page.get_by_role("dialog").get_by_label("Show lyrics", exact=True)).to_be_checked()
            page.get_by_role("dialog").get_by_label("Show lyrics", exact=True).uncheck()
            page.get_by_role("button", name="Apply lyrics", exact=True).click()
            expect(page.locator(".kinetic-lyrics")).to_have_count(0)
            page.get_by_role("button", name="Link & lyrics", exact=True).click()
            page.get_by_role("dialog").get_by_label("Show lyrics", exact=True).check()
            page.get_by_role("button", name="Apply lyrics", exact=True).click()

            page.bring_to_front()
            page.mouse.move(700, 400)
            page.evaluate("document.activeElement?.blur()")
            page.locator(".external-music").dispatch_event("pointermove")
            expect(page.locator(".provider-player")).to_have_css("opacity", "0", timeout=5000)
            expect(page.locator(".external-top")).to_have_css("opacity", "0")
            page.screenshot(path=str(output / "external-idle.png"))
            page.locator(".external-music").dispatch_event("pointermove")
            expect(page.locator(".provider-player")).to_have_css("opacity", "1")
            assert page.evaluate("window.__providerFrame === document.querySelector('.provider-player iframe')")
            page.get_by_role("button", name="Open desktop player", exact=False).focus()
            page.wait_for_timeout(2300)
            expect(page.locator(".provider-player")).to_have_css("opacity", "1")
            page.mouse.move(700, 400)
            page.evaluate("document.activeElement?.blur()")
            page.locator(".external-music").dispatch_event("pointermove")
            expect(page.locator(".provider-player")).to_have_css("opacity", "0", timeout=8000)
            page.get_by_role("button", name="Open desktop player", exact=False).focus()
            expect(page.locator(".provider-player")).to_have_css("opacity", "1")
            page.close()
        process.wait(timeout=20)
        time.sleep(1)
        try:
            urllib.request.urlopen(origin + "/api/health", timeout=2)
        except OSError:
            pass
        else:
            raise AssertionError("Desktop web service remained alive after closing the app.")
    finally:
        if process.poll() is None:
            subprocess.run(
                ["taskkill", "/PID", str(process.pid), "/T", "/F"], capture_output=True, check=False
            )
print(
    f"PASS: packaged startup, real Butterchurn, playback, automatic energy, ad request filtering, YouTube preload isolation, Randomizer, library creation and shutdown. {output}"
)
