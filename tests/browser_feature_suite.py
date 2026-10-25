"""Exercise persistence, local playback/crossfades and real MediaRecorder output."""

import json
import math
import os
import secrets
import socket
import struct
import subprocess
import time
import urllib.request
import wave
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

from playwright.sync_api import expect, sync_playwright

root = Path(__file__).resolve().parents[1]
output = root / "artifacts" / "feature-suite" / str(int(time.time()))
output.mkdir(parents=True)


def port():
    with socket.socket() as server:
        server.bind(("127.0.0.1", 0))
        return server.getsockname()[1]


api_port, web_port = port(), port()
while web_port == api_port:
    web_port = port()
token = secrets.token_hex(16)
env = {
    **os.environ,
    "DATABASE_URL": f"sqlite:///{output / 'library.db'}",
    "ASSET_ROOT": str(output / "assets"),
    "QUEUE_BACKEND": "local",
    "STORAGE_BACKEND": "local",
    "STUDIO_TOKEN": token,
    "API_URL": f"http://127.0.0.1:{api_port}",
}
processes = []


def ready(url, headers=None):
    deadline = time.monotonic() + 120
    while time.monotonic() < deadline:
        try:
            with urllib.request.urlopen(
                urllib.request.Request(url, headers=headers or {}), timeout=2
            ) as response:
                if response.status == 200:
                    return
        except OSError:
            pass
        assert all(process.poll() is None for process in processes), "A service exited; inspect logs."
        time.sleep(0.2)
    raise AssertionError("Services did not start.")


try:
    api_log = (output / "api.log").open("wb")
    web_log = (output / "web.log").open("wb")
    processes.append(
        subprocess.Popen(
            [
                str(root / ".venv/Scripts/python.exe"),
                "-m",
                "uvicorn",
                "clanker_api.main:app",
                "--host",
                "127.0.0.1",
                "--port",
                str(api_port),
            ],
            cwd=root,
            env=env,
            stdout=api_log,
            stderr=api_log,
        )
    )
    ready(f"http://127.0.0.1:{api_port}/api/health", {"x-studio-token": token})
    processes.append(
        subprocess.Popen(
            [
                "node",
                str(root / "node_modules/next/dist/bin/next"),
                "start",
                str(root / "apps/web"),
                "--hostname",
                "127.0.0.1",
                "--port",
                str(web_port),
            ],
            cwd=root,
            env=env,
            stdout=web_log,
            stderr=web_log,
        )
    )
    origin = f"http://127.0.0.1:{web_port}"
    ready(origin + "/api/health")
    for name, frequency in [("Tone one", 220), ("Tone two", 440)]:
        with wave.open(str(output / f"{name}.wav"), "wb") as audio:
            audio.setnchannels(1)
            audio.setsampwidth(2)
            audio.setframerate(16000)
            audio.writeframes(
                b"".join(
                    struct.pack("<h", int(math.sin(i * 2 * math.pi * frequency / 16000) * 8000))
                    for i in range(16000 * 30)
                )
            )
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            headless=True,
            args=[
                "--use-angle=swiftshader",
                "--enable-unsafe-swiftshader",
                "--autoplay-policy=no-user-gesture-required",
            ],
        )
        page = browser.new_page(viewport={"width": 1280, "height": 900})
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.add_init_script("window.clankerDesktop={closeMusic:async()=>{},openMusic:async()=>{}}")
        session = {
            "status": "connected",
            "sourceApp": "Chrome",
            "title": "First browser song",
            "artist": "Orbit",
            "position": 12,
            "duration": 200,
            "playing": True,
        }
        lyric_requests = []
        page.route("**/api/audio/now-playing?**", lambda route: route.fulfill(json=session))

        def lyric_response(route):
            title = parse_qs(urlsplit(route.request.url).query).get("title", [""])[0]
            lyric_requests.append(title)
            prefix = "Second" if title == "Second browser song" else "Chrome"
            route.fulfill(
                json={
                    "status": "synced",
                    "title": title,
                    "artist": "Orbit",
                    "message": "Synchronized fixture lyrics",
                    "lyrics": f"[00:00.00]{prefix} intro\n[00:10.00]{prefix} chorus",
                }
            )

        page.add_init_script("""window.YT={Player:class{
            constructor(frame,options){this.frame=frame;setTimeout(()=>options.events.onReady(),20);}
            getCurrentTime(){return 5;}getPlayerState(){return 1;}
            getVideoData(){return{video_id:'abcdefghijk',title:'Test song',author:'Orbit'};}
            destroy(){this.frame.remove();}}};""")
        page.route(
            "https://www.youtube.com/embed/**",
            lambda route: route.fulfill(content_type="text/html", body="<body>Playlist fixture</body>"),
        )
        page.route("**/api/lyrics?**", lyric_response)
        page.goto(origin)
        page.wait_for_function("document.querySelector('.player-brand img')?.complete")
        page.locator(".effects-menu > summary").click()
        page.get_by_label("Render quality", exact=True).select_option("performance")
        page.get_by_label("Visualizer theme", exact=True).select_option("aurora")
        page.get_by_label("Spectrum position", exact=True).select_option("all")
        page.get_by_label("Mirror spectrum", exact=True).check()
        page.locator(".saved-scenes > summary").click()
        page.get_by_label("Scene name", exact=True).fill("After dark")
        page.get_by_role("button", name="Save current scene", exact=True).click()
        expect(page.get_by_role("button", name="After dark", exact=True)).to_be_visible()
        page.wait_for_timeout(800)
        page.reload()
        page.locator(".effects-menu > summary").click()
        expect(page.get_by_label("Spectrum position", exact=True)).to_have_value("all", timeout=30000)
        expect(page.get_by_label("Mirror spectrum", exact=True)).to_be_checked()
        expect(page.get_by_label("Render quality", exact=True)).to_have_value("performance")
        page.locator(".effects-menu > summary").click()
        page.get_by_role("button", name="Open music link", exact=True).click()
        page.get_by_label("Connect Windows computer audio automatically").uncheck()
        link = "https://music.youtube.com/playlist?list=PLKBOD9JXe71Y&si=first"
        page.get_by_label("Track or playlist URL").fill(link)
        page.get_by_role("button", name="Open music link", exact=True).click()
        expect(page.locator(".provider-player iframe")).to_be_attached()
        page.get_by_role("button", name="Link & lyrics", exact=True).click()
        page.get_by_label("Track or playlist URL").fill(link.replace("first", "second"))
        page.get_by_role("button", name="Open music link", exact=True).click()
        entries = page.request.get(origin + "/api/library").json()
        assert len(entries) == 1 and entries[0]["kind"] == "link", entries
        page.get_by_role("button", name="Link & lyrics", exact=True).click()
        page.get_by_label("Music is playing in Chrome or another browser").check()
        page.get_by_role("button", name="Apply lyrics", exact=True).click()
        expect(page.locator(".provider-player iframe")).to_have_count(0)
        expect(page.locator(".kinetic-lyrics p")).to_have_text("Chrome chorus", timeout=15000)
        session.update(position=2, playing=False)
        expect(page.locator(".kinetic-lyrics p")).to_have_text("Chrome intro", timeout=10000)
        session.update(title="Second browser song", position=12, playing=True)
        expect(page.locator(".kinetic-lyrics p")).to_have_text("Second chorus", timeout=10000)
        assert "First browser song" in lyric_requests and "Second browser song" in lyric_requests
        session.update(status="waiting", message="Waiting for a browser song")
        expect(page.locator(".kinetic-lyrics p")).to_have_text("", timeout=10000)
        page.get_by_role("button", name="Link & lyrics", exact=True).click()
        page.get_by_label("Music is playing in Chrome or another browser").uncheck()
        page.locator("input[type=file]").first.set_input_files(
            [str(output / "Tone one.wav"), str(output / "Tone two.wav")]
        )
        expect(page.get_by_text("2 files imported", exact=True)).to_be_visible(timeout=30000)
        page.screenshot(path=str(output / "saved-library.png"))
        page.get_by_role("button", name="Play saved Tone one", exact=True).click()
        page.wait_for_function(
            "Array.from(document.querySelectorAll('.local-playback audio'))"
            ".some(audio=>!audio.paused&&audio.currentTime>0)"
        )
        expect(page.locator(".audio-spectrum")).to_have_attribute("data-source", "music")
        page.locator(".external-music").dispatch_event("pointermove")
        page.get_by_role("button", name="Previous local track", exact=True).click()
        page.wait_for_function(
            "Array.from(document.querySelectorAll('.local-playback audio'))"
            ".filter(audio=>!audio.paused).length===2"
        )
        page.wait_for_function(
            "Array.from(document.querySelectorAll('.local-playback audio'))"
            ".filter(audio=>!audio.paused).length===1",
            timeout=8000,
        )
        page.locator(".effects-menu > summary").click()
        recorder_button = page.get_by_role("button", name="Recording tools", exact=True)
        recorder_button.scroll_into_view_if_needed()
        recorder_button.click()
        page.get_by_label("Output layout", exact=True).select_option("portrait")
        page.get_by_role("button", name="Start video recording", exact=True).click()
        expect(page.get_by_role("button", name="Stop video recording", exact=True)).to_be_visible()
        page.wait_for_timeout(2400)
        page.screenshot(path=str(output / "recording-live.png"))
        page.get_by_role("button", name="Stop video recording", exact=True).click()
        download = page.get_by_role("link", name="Download recording", exact=True)
        expect(download).to_be_visible(timeout=15000)
        with page.expect_download() as recording_download:
            download.click()
        recording_download.value.save_as(str(output / "vertical-recording.webm"))
        result = page.evaluate(
            """async url=>{
              const blob=await(await fetch(url)).blob();
              const bytes=new Uint8Array(await blob.arrayBuffer());
              const video=document.createElement('video');video.muted=true;video.src=url;
              const dimensions=await new Promise((resolve,reject)=>{
                video.onloadedmetadata=()=>resolve([video.videoWidth,video.videoHeight]);
                video.onerror=()=>reject(new Error('WebM bytes='+blob.size+' header='+bytes.slice(0,16)
                  +' code='+video.error?.code+' '+video.error?.message));
              });
              await video.play();await new Promise(resolve=>setTimeout(resolve,300));
              const canvas=document.createElement('canvas');canvas.width=64;canvas.height=64;
              const ctx=canvas.getContext('2d');ctx.drawImage(video,0,0,64,64);video.pause();
              const pixels=ctx.getImageData(16,16,32,32).data;let sum=0,maximum=0;
              for(let i=0;i<pixels.length;i+=4){
                const luma=(pixels[i]+pixels[i+1]+pixels[i+2])/3;
                sum+=luma;maximum=Math.max(maximum,luma);
              }
              return{size:blob.size,magic:Array.from(bytes.slice(0,4)),dimensions,
                mean:sum/1024,maximum};
            }""",
            download.get_attribute("href"),
        )
        assert result["size"] > 5000 and result["magic"] == [26, 69, 223, 163], result
        assert result["dimensions"] == [1080, 1920], result
        assert result["mean"] > 1 and result["maximum"] > 20, result
        (output / "recording-result.json").write_text(json.dumps(result), encoding="utf-8")
        page.get_by_role("button", name="Close recording tools", exact=True).click()
        page.reload()
        page.get_by_role("button", name="Open music link", exact=True).click()
        expect(page.get_by_role("button", name="Play saved Tone one", exact=True)).to_be_visible()
        expect(page.get_by_role("button", name="Play saved Tone two", exact=True)).to_be_visible()
        assert len(page.request.get(origin + "/api/library").json()) == 3
        assert not errors, errors
        browser.close()
finally:
    for process in reversed(processes):
        if process.poll() is None:
            subprocess.run(
                ["taskkill", "/PID", str(process.pid), "/T", "/F"], capture_output=True, check=False
            )
print(f"PASS: browser lyrics, library, crossfade, recording and persistence. {output}")
