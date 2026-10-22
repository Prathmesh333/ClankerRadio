"""Local integration checks; provider playback is stubbed, capture uses a real synthetic stream."""

import io
import math
import struct
import wave
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

target = Path("artifacts/browser")
target.mkdir(parents=True, exist_ok=True)
with sync_playwright() as p:
    browser = p.chromium.launch(
        headless=True, args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader"]
    )
    page = browser.new_page(viewport={"width": 1280, "height": 900})
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.add_init_script("""
      window.__ytTime=0; window.__ytId='abcdefghijk';
      window.__spotifyListeners={}; window.__scListeners={};
      window.SC={Widget:Object.assign(function(frame){return {
        bind(name,fn){window.__scListeners[name]=fn;if(name==='ready')setTimeout(()=>fn({}),10);},
        getCurrentSound(fn){fn({title:'Neon Signal',duration:200000,user:{username:'Orbit'},permalink_url:'https://soundcloud.com/orbit/neon-signal'});},
        unbind(name){delete window.__scListeners[name];}
      };},{Events:{READY:'ready',PLAY:'play',PLAY_PROGRESS:'playProgress'}})};
      window.onSpotifyIframeApiReady=undefined;
      window.YT={Player:class {
        constructor(frame, options){this.frame=frame;setTimeout(()=>options.events.onReady(),20);}
        getCurrentTime(){return window.__ytTime;} getVideoData(){return {video_id:window.__ytId,
        title:window.__ytId==='abcdefghijk'?'Orbit - Neon Signal':'Orbit - Afterburner',author:'Orbit'};}
        getPlayerState(){return 1;} destroy(){this.frame.remove();}
      }};
      navigator.mediaDevices.getDisplayMedia=async()=>{
        const c=new AudioContext(),o=c.createOscillator(),d=c.createMediaStreamDestination();
        o.connect(d);o.start();
        window.__sharedStream=d.stream;window.__captureContext=c;return d.stream;
      };
    """)
    page.route(
        "**/api/lyrics?**",
        lambda route: route.fulfill(
            json={
                "status": "synced",
                "title": "Neon Signal",
                "artist": "Orbit",
                "message": "LRCLIB · synchronized lyrics",
                "source": "https://lrclib.net/api/get/10",
                "lyrics": (
                    "[00:00.00]Turn up the lights\n"
                    "[00:04.00]Let the colors run\n[00:08.00]Across the midnight sky"
                ),
            }
        ),
    )
    import base64
    import json

    pcm = base64.b64encode(b"".join(struct.pack("<f", 0.2 * math.sin(i * 0.2)) for i in range(1024))).decode()
    page.route(
        "**/api/audio/loopback",
        lambda route: route.fulfill(
            body=json.dumps({"status": "connected", "device": "Fixture output"})
            + "\n"
            + json.dumps({"pcm": pcm, "sampleRate": 24000})
            + "\n",
            content_type="application/x-ndjson",
        ),
    )
    page.route(
        "https://open.spotify.com/embed/iframe-api/v1",
        lambda route: route.fulfill(
            body="""
      window.onSpotifyIframeApiReady({createController(host,options,callback){
        const f=document.createElement('iframe');f.src='https://open.spotify.com/embed/'+options.uri.split(':').slice(1).join('/');host.appendChild(f);
        const controller={addListener(name,fn){window.__spotifyListeners[name]=fn;
        if(name==='ready')setTimeout(()=>fn({data:{}}),10);},destroy(){f.remove();}};
        callback(controller);
      }});
    """,
            content_type="application/javascript",
        ),
    )
    page.route(
        "https://www.youtube.com/embed/**",
        lambda r: r.fulfill(
            body="<html><body>Provider player fixture</body></html>", content_type="text/html"
        ),
    )
    page.route(
        "https://open.spotify.com/embed/**",
        lambda r: (
            r.fallback()
            if "iframe-api/" in r.request.url
            else r.fulfill(body="<html><body>Provider player fixture</body></html>", content_type="text/html")
        ),
    )
    page.route(
        "https://w.soundcloud.com/player/**",
        lambda r: r.fulfill(body="<html><body>SoundCloud fixture</body></html>", content_type="text/html"),
    )
    page.route(
        "https://embed.music.apple.com/**",
        lambda r: r.fulfill(body="<html><body>Apple fixture</body></html>", content_type="text/html"),
    )
    page.route(
        "**/api/audio/now-playing?**",
        lambda r: r.fulfill(
            json={
                "status": "connected",
                "title": "Neon Signal",
                "artist": "Orbit",
                "position": 5,
                "duration": 200,
                "playing": True,
            }
        ),
    )
    page.goto("http://127.0.0.1:3000")
    page.get_by_role("button", name="Open music link", exact=True).click()
    expect(page.get_by_role("dialog")).to_be_visible()
    page.screenshot(path=str(target / "music-link-option.png"))
    page.get_by_label("Track or playlist URL").fill("https://example.com/unsupported")
    page.get_by_role("button", name="Open music link", exact=True).click()
    expect(page.locator(".source-error")).to_contain_text("Supported:")
    page.get_by_label("Track or playlist URL").fill("https://www.youtube.com/playlist?list=PL1234567890")
    expect(page.get_by_label("Find lyrics automatically")).to_be_checked()
    page.get_by_role("button", name="Open music link", exact=True).click()
    expect(page.get_by_role("dialog")).not_to_be_visible()
    expect(page.locator("iframe")).to_have_attribute(
        "src", __import__("re").compile("videoseries.*list=PL1234567890")
    )
    expect(page.locator(".lyric-clock")).to_contain_text("Player clock")
    page.evaluate("window.__ytTime=5")
    expect(page.locator(".kinetic-lyrics p")).to_have_text("Let the colors run ")
    page.get_by_role("button", name="Shuffle design", exact=True).click()
    expect(page.locator(".kinetic-lyrics p")).to_have_text("Let the colors run ")
    page.wait_for_timeout(900)
    page.screenshot(path=str(target / "link-lyrics-player.png"))
    expect(page.get_by_text("Computer audio · connected locally", exact=True)).to_be_visible()
    page.get_by_role("button", name="Disconnect audio", exact=True).click()
    page.get_by_role("button", name="Share tab audio", exact=True).click()
    expect(page.get_by_text("YouTube · Audio connected", exact=True)).to_be_visible()
    expect(page.locator(".milkdrop-canvas canvas")).to_be_visible(timeout=20000)
    page.get_by_role("button", name="Link & lyrics", exact=True).click()
    page.get_by_label("Track or playlist URL").fill(
        "https://open.spotify.com/playlist/1234567890123456789012"
    )
    page.get_by_role("button", name="Open music link", exact=True).click()
    expect(page.locator("iframe")).to_have_attribute(
        "src", "https://open.spotify.com/embed/playlist/1234567890123456789012"
    )
    assert page.evaluate("window.__sharedStream.getTracks().every(t=>t.readyState==='ended')")
    page.evaluate(
        "window.__spotifyListeners.playback_update({data:{playingURI:'spotify:track:1234567890123456789012',position:5000,duration:200000,isPaused:false}})"
    )
    expect(page.locator(".lyric-clock")).to_contain_text("Player clock")
    expect(page.locator(".kinetic-lyrics p")).to_have_text("Let the colors run ")

    page.get_by_role("button", name="Link & lyrics", exact=True).click()
    page.get_by_label("Track or playlist URL").fill("https://soundcloud.com/orbit/sets/signals")
    page.get_by_role("button", name="Open music link", exact=True).click()
    page.wait_for_function("!!window.__scListeners.playProgress")
    page.evaluate("window.__scListeners.playProgress({currentPosition:5000})")
    expect(page.locator(".kinetic-lyrics p")).to_have_text("Let the colors run ")
    expect(page.locator(".lyric-clock")).to_contain_text("Player clock")
    page.get_by_role("button", name="Link & lyrics", exact=True).click()
    page.get_by_label("Track or playlist URL").fill("https://music.apple.com/us/song/neon-signal/123")
    page.get_by_role("button", name="Open music link", exact=True).click()
    expect(page.locator(".lyric-clock")).to_contain_text("Player clock", timeout=10000)
    expect(page.locator(".kinetic-lyrics p")).to_have_text("Let the colors run ")

    # Direct audio: generated local tone, real media playback and analyzer.
    audio = io.BytesIO()
    with wave.open(audio, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(16000)
        wav.writeframes(
            b"".join(
                struct.pack("<h", int(10000 * math.sin(i * 2 * math.pi * 220 / 16000)))
                for i in range(16000 * 8)
            )
        )
    page.route(
        "https://audio.example.test/tone.wav",
        lambda r: r.fulfill(
            body=audio.getvalue(), content_type="audio/wav", headers={"access-control-allow-origin": "*"}
        ),
    )
    page.get_by_role("button", name="Link & lyrics", exact=True).click()
    page.get_by_label("Track or playlist URL").fill("https://audio.example.test/tone.wav")
    page.get_by_role("button", name="Open music link", exact=True).click()
    page.locator("audio").evaluate("e=>e.play()")
    expect(page.get_by_text("Audio link · Audio connected", exact=True)).to_be_visible()
    page.wait_for_function("document.querySelector('audio').currentTime > .3")
    page.wait_for_timeout(1200)
    page.screenshot(path=str(target / "direct-audio-lyrics.png"))
    page.set_viewport_size({"width": 390, "height": 844})
    assert page.evaluate("document.documentElement.scrollWidth<=innerWidth")
    page.screenshot(path=str(target / "link-lyrics-mobile.png"))
    page.get_by_role("button", name="← Generative radio", exact=True).click()
    expect(page.get_by_role("button", name="Open music link", exact=True)).to_be_visible()
    assert not errors, errors
    browser.close()
print(
    "PASS: provider routing, playlist URLs, LRC clock, lyric designs, capture/cleanup, "
    "direct audio and mobile. Provider streams and Windows clock stubbed; "
    "real synthetic browser audio."
)
