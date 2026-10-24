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
    f"PASS: packaged startup, real Butterchurn, playback, Randomizer, library creation and shutdown. {output}"
)
