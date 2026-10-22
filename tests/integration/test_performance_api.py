import time

import pytest
from clanker_api.main import app
from clanker_api.performance_routes import station
from fastapi.testclient import TestClient


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{tmp_path / 'performance.db'}")
    monkeypatch.setenv("ASSET_ROOT", str(tmp_path / "assets"))
    monkeypatch.delenv("STUDIO_TOKEN", raising=False)
    with TestClient(app) as client:
        yield client
    station.stopped.set()
    if station.thread:
        station.thread.join(timeout=3)


def test_create_save_replay_and_download_json(client):
    assert len(client.get("/api/instruments").json()) == 24
    a = client.post("/api/performances", json={}).json()
    b = client.post("/api/performances", json={}).json()
    assert a == b
    assert len(client.get("/api/performances").json()) == 0
    assert client.post(f"/api/performances/{a['id']}/preference", json={"favorite": True}).status_code == 200
    assert len(client.get("/api/performances").json()) == 1
    assert client.get(f"/api/performances/{a['id']}/json").json() == a
    assert client.get(f"/api/performances/{a['id']}").json() == a
    assert client.get("/api/performances/missing").status_code == 404
    assert client.post("/api/performances", json={"instrumentIds": ["invalid"]}).status_code == 422


def test_radio_buffer_refills_and_stops_without_codex_calls(client):
    response = client.post("/api/radio/start", json={"useCodex": False})
    assert response.status_code == 200
    assert client.post("/api/radio/start", json={}).status_code == 409
    deadline = time.monotonic() + 5
    while client.get("/api/radio/status").json()["queued"] < 3 and time.monotonic() < deadline:
        time.sleep(0.1)
    first = client.post("/api/radio/next").json()
    second = client.post("/api/radio/next").json()
    assert first["id"] != second["id"]
    assert first["provenance"]["source"] == "local_rules"
    client.post("/api/radio/stop")
    station.thread.join(timeout=3)
    assert not client.get("/api/radio/status").json()["running"]
