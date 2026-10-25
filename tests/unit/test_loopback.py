import asyncio
import sys
import types
from datetime import datetime, timedelta, timezone

from clanker_api import loopback
from fastapi import FastAPI
from fastapi.testclient import TestClient


def test_capture_requires_json_and_stops_when_stream_ends(monkeypatch):
    stops = []

    def capture(messages, stopped):
        stops.append(stopped)
        messages.put({"status": "error", "message": "Fixture output unavailable"})
        stopped.wait(2)

    monkeypatch.setattr(loopback, "capture_output", capture)
    app = FastAPI()
    app.include_router(loopback.router)
    with TestClient(app) as client:
        assert client.post("/api/audio/loopback", content="not-json").status_code == 415
        response = client.post("/api/audio/loopback", json={})
    assert response.json()["status"] == "error"
    assert stops[0].is_set()


def test_windows_clock_uses_matching_session_and_elapsed_time(monkeypatch):
    monkeypatch.setattr(loopback.sys, "platform", "win32")

    async def media():
        return types.SimpleNamespace(title="Neon Signal", artist="Orbit")

    session = types.SimpleNamespace(
        source_app_user_model_id="Chrome",
        try_get_media_properties_async=media,
        get_timeline_properties=lambda: types.SimpleNamespace(
            start_time=timedelta(),
            position=timedelta(seconds=10),
            end_time=timedelta(seconds=200),
            last_updated_time=datetime.now(timezone.utc) - timedelta(seconds=1),
        ),
        get_playback_info=lambda: types.SimpleNamespace(playback_status=4),
    )

    async def manager():
        return types.SimpleNamespace(get_sessions=lambda: [session], get_current_session=lambda: session)

    module = types.ModuleType("winrt.windows.media.control")
    module.GlobalSystemMediaTransportControlsSessionManager = types.SimpleNamespace(request_async=manager)
    monkeypatch.setitem(sys.modules, "winrt.windows.media.control", module)
    result = asyncio.run(loopback.now_playing("Neon Signal"))
    assert result["status"] == "connected"
    assert 10.9 <= result["position"] < 12
    assert asyncio.run(loopback.now_playing("Different recording"))["status"] == "waiting"
    assert asyncio.run(loopback.now_playing(""))["title"] == "Neon Signal"
