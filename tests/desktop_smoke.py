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
            expect(page.locator(".milkdrop-canvas canvas")).to_be_visible(timeout=30000)
            page.get_by_role("button", name="Play performance", exact=True).click()
            expect(page.get_by_role("button", name="Pause performance", exact=True)).to_be_visible()
            expect(page.locator(".milkdrop-canvas")).to_have_attribute("data-source", "music", timeout=30000)
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
            page.evaluate("window.clankerDesktop.closeMusic()")
            page.get_by_label("Visualizer theme", exact=True).select_option("randomizer")
            expect(page.locator(".randomizer-stage")).to_be_visible()
            page.screenshot(path=str(output / "desktop-player.png"))
            assert (output / "data/clanker.db").exists()
            assert (output / "data/assets/performances").exists()
            assert page.request.get(origin + "/api/health").ok
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
