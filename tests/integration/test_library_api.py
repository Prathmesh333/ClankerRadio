import io
import wave

import pytest
from clanker_api.main import app
from fastapi.testclient import TestClient


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{tmp_path / 'library.db'}")
    monkeypatch.setenv("ASSET_ROOT", str(tmp_path / "assets"))
    monkeypatch.delenv("STUDIO_TOKEN", raising=False)
    with TestClient(app) as value:
        yield value


def test_saved_links_deduplicate_tracking_and_survive_restart(client):
    first = client.post(
        "/api/library/links",
        json={"url": "https://music.youtube.com/playlist?list=PLKBOD9JXe71Y&si=one", "title": "Hindi songs"},
    )
    assert first.status_code == 200
    second = client.post(
        "/api/library/links",
        json={"url": "https://www.youtube.com/watch?v=abcdefghijk&list=PLKBOD9JXe71Y&si=two"},
    ).json()
    assert second["id"] == first.json()["id"]
    assert second["title"] == "Hindi songs"
    assert len(client.get("/api/library").json()) == 1
    with TestClient(app) as reopened:
        assert reopened.get("/api/library").json()[0]["id"] == second["id"]
    assert client.post(f"/api/library/{second['id']}/remove").status_code == 200
    assert client.get("/api/library").json() == []


@pytest.mark.parametrize(
    "url",
    [
        "file:///C:/secret.mp3",
        "javascript:alert(1)",
        "https://example.com/nope",
        "https://user:pass@example.com/song.mp3",
        "https://www.youtube.com/playlist?list=invalid!",
    ],
)
def test_invalid_links_are_not_saved(client, url):
    assert client.post("/api/library/links", json={"url": url}).status_code == 422
    assert client.get("/api/library").json() == []


def test_audio_import_deduplication_range_and_missing_paths(client):
    output = io.BytesIO()
    with wave.open(output, "wb") as audio:
        audio.setnchannels(1)
        audio.setsampwidth(2)
        audio.setframerate(8000)
        audio.writeframes(b"\x00\x00" * 800)
    content = output.getvalue()
    first = client.post(
        "/api/library/files?name=tone.wav",
        content=content,
        headers={"content-type": "application/octet-stream"},
    ).json()
    second = client.post("/api/library/files?name=copy.wav", content=content).json()
    assert first["id"] == second["id"]
    assert len(client.get("/api/library").json()) == 1
    assert client.get(first["url"]).content == content
    ranged = client.get(first["url"], headers={"Range": "bytes=0-9"})
    assert ranged.status_code == 206 and ranged.content == content[:10]
    assert client.post("/api/library/files?name=bad.exe", content=content).status_code == 422
    assert client.post("/api/library/files?name=empty.mp3", content=b"").status_code == 422
    assert client.get("/api/library/files/secret/audio").status_code == 404
    assert (
        client.post(
            f"/api/library/{first['id']}/metadata", json={"title": "New title", "artist": "Orbit"}
        ).json()["artist"]
        == "Orbit"
    )
    assert (
        client.post(
            f"/api/library/{first['id']}/metadata",
            json={"title": "New title", "artwork": "javascript:alert(1)"},
        ).status_code
        == 422
    )


def test_preferences_and_named_scenes_restore_from_database(client):
    preferences = client.get("/api/settings/player").json()
    assert preferences["beatSync"] is True
    preferences.update(
        {
            "mode": "galaxy",
            "showLyrics": False,
            "crossfadeS": 4,
            "spectrumSettings": {**preferences["spectrumSettings"], "position": "all", "mirror": True},
        }
    )
    assert client.post("/api/settings/player", json=preferences).json() == preferences
    assert client.get("/api/settings/player").json() == preferences
    scene = client.post("/api/settings/presets", json={"name": "Night", "preferences": preferences}).json()
    assert (
        client.post("/api/settings/presets", json={"name": "night", "preferences": preferences}).json()["id"]
        == scene["id"]
    )
    assert len(client.get("/api/settings/presets").json()) == 1
    assert client.post("/api/settings/player", json={**preferences, "intensity": 99}).status_code == 422
    assert client.post(f"/api/library/{scene['id']}/remove").status_code == 200
    assert client.get("/api/settings/presets").json() == []


def test_song_timing_corrections_persist_and_are_bounded(client):
    preferences = client.get("/api/settings/player").json()
    preferences["lyricOffsets"] = {"artist|song|200": -3.5}
    assert client.post("/api/settings/player", json=preferences).status_code == 200
    assert client.get("/api/settings/player").json()["lyricOffsets"] == {"artist|song|200": -3.5}
    assert (
        client.post("/api/settings/player", json={**preferences, "lyricOffsets": {"bad": -121}}).status_code
        == 422
    )
