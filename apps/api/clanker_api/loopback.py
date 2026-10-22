"""Local Windows output capture. Streams transient PCM; never writes audio to disk."""

import asyncio
import base64
import json
import queue
import sys
import threading

from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import StreamingResponse

router = APIRouter(prefix="/api")


@router.get("/audio/now-playing")
async def now_playing(title: str = Query(default="", max_length=300)):
    """Apple/other players can expose their clock through Windows media sessions."""
    if sys.platform != "win32":
        return {"status": "unavailable"}
    try:
        from datetime import datetime, timezone
        from difflib import SequenceMatcher

        from winrt.windows.media.control import GlobalSystemMediaTransportControlsSessionManager

        manager = await GlobalSystemMediaTransportControlsSessionManager.request_async()
        sessions = manager.get_sessions() if title else [manager.get_current_session()]
        for session in sessions:
            if session is None:
                continue
            media = await session.try_get_media_properties_async()
            if title and SequenceMatcher(None, title.casefold(), media.title.casefold()).ratio() < 0.65:
                continue
            timeline = session.get_timeline_properties()
            playing = int(session.get_playback_info().playback_status) == 4
            position = timeline.position.total_seconds()
            if playing:
                position += max(0, (datetime.now(timezone.utc) - timeline.last_updated_time).total_seconds())
            duration = timeline.end_time.total_seconds()
            return {
                "status": "connected",
                "title": media.title,
                "artist": media.artist,
                "position": min(position, duration) if duration > 0 else position,
                "duration": duration,
                "playing": playing,
            }
        return {"status": "waiting"}
    except Exception:
        return {"status": "unavailable"}


def capture_output(messages, stopped):
    initialized = False
    try:
        if sys.platform != "win32":
            raise RuntimeError(
                "Automatic computer audio currently supports Windows. Use Share tab audio here."
            )
        import ctypes

        import numpy as np
        import soundcard as sc

        initialized = ctypes.windll.ole32.CoInitializeEx(None, 0) >= 0

        speaker = sc.default_speaker()
        if not speaker:
            raise RuntimeError("No default output device is available.")
        microphone = sc.get_microphone(id=speaker.id, include_loopback=True)
        with microphone.recorder(samplerate=48000, channels=2, blocksize=2048) as recorder:
            messages.put({"status": "connected", "device": speaker.name})
            while not stopped.is_set():
                data = recorder.record(numframes=2048)
                mono = np.nan_to_num(data.mean(axis=1)[::2]).clip(-1, 1).astype("<f4")
                item = {"pcm": base64.b64encode(mono.tobytes()).decode(), "sampleRate": 24000}
                try:
                    messages.put_nowait(item)
                except queue.Full:
                    try:
                        messages.get_nowait()
                        messages.put_nowait(item)
                    except (queue.Empty, queue.Full):
                        pass
    except Exception as error:
        try:
            messages.put_nowait({"status": "error", "message": str(error)})
        except queue.Full:
            pass
    finally:
        if initialized:
            import ctypes

            ctypes.windll.ole32.CoUninitialize()


@router.post("/audio/loopback")
async def loopback(request: Request):
    if not request.headers.get("content-type", "").startswith("application/json"):
        raise HTTPException(415, "Use a local JSON request to start computer audio.")
    if request.client and request.client.host not in ["127.0.0.1", "::1", "localhost", "testclient"]:
        raise HTTPException(403, "Computer audio is available only on this machine.")

    async def stream():
        messages, stopped = queue.Queue(maxsize=8), threading.Event()
        worker = threading.Thread(target=capture_output, args=(messages, stopped), daemon=True)
        worker.start()
        try:
            while not await request.is_disconnected():
                try:
                    item = await asyncio.to_thread(messages.get, True, 0.5)
                except queue.Empty:
                    continue
                yield json.dumps(item) + "\n"
                if item.get("status") == "error":
                    break
        finally:
            stopped.set()

    return StreamingResponse(
        stream(), media_type="application/x-ndjson", headers={"Cache-Control": "no-store"}
    )
