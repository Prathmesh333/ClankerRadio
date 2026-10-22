import io
import json
import wave

import pytest
from clanker_api.main import app
from clanker_api.storage import LocalStore
from fastapi.testclient import TestClient


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{tmp_path / 'test.db'}")
    monkeypatch.setenv("ASSET_ROOT", str(tmp_path / "assets"))
    monkeypatch.setenv("QUEUE_BACKEND", "local")
    monkeypatch.delenv("STUDIO_TOKEN", raising=False)
    with TestClient(app) as client:
        yield client


def test_plan_validation_and_persistence(client):
    a = client.post("/api/compositions/plan", json={}).json()
    assert client.post("/api/compositions/plan", json={}).json() == a
    assert client.get(f"/api/compositions/{a['id']}").json() == a
    assert client.post("/api/compositions/plan", json={"tempoBpm": 900}).status_code == 422
    assert client.post("/api/compositions/plan", json={"seed": -1}).status_code == 422
    assert client.post("/api/compositions/plan", json={"profile": "unreviewed_raga"}).status_code == 422
    assert client.get("/api/compositions/missing").status_code == 404
    assert client.post("/api/programs/example/publish").status_code == 409


def test_full_audio_render_fixture(client):
    composition = client.post("/api/compositions/plan", json={}).json()
    path = f"/api/compositions/{composition['id']}/render"
    assert client.post(path).status_code == 422
    response = client.post(path, headers={"Idempotency-Key": "fixture-v1"})
    assert response.status_code == 202
    job = client.get(f"/api/jobs/{response.json()['id']}").json()
    assert job["status"] == "COMPLETED", job["error"]
    assert client.post(path, headers={"Idempotency-Key": "fixture-v1"}).json()["id"] == job["id"]
    for name in ["mix.wav", "prototype_flute.wav", "prototype_keys.wav", "prototype_drone.wav"]:
        response = client.get(job["artifacts"][name])
        assert response.status_code == 200
        with wave.open(io.BytesIO(response.content)) as wav:
            assert wav.getframerate() == 48000
            assert wav.getnchannels() == 2
            assert 180 <= wav.getnframes() / wav.getframerate() <= 200
    manifest = client.get(job["artifacts"]["manifest.json"]).json()
    assert manifest["checksums"]["mix.wav"]
    assert manifest["publicationBlockers"]
    assert "true_peak_dbtp" in manifest["analysis"]["notMeasured"]
    assert client.get(f"/api/jobs/{job['id']}/artifacts/not-allowed.txt").status_code == 404


def test_token_required(client, monkeypatch):
    monkeypatch.setenv("STUDIO_TOKEN", "test-secret")
    assert client.post("/api/compositions/plan", json={}).status_code == 401
    assert (
        client.post("/api/compositions/plan", json={}, headers={"X-Studio-Token": "test-secret"}).status_code
        == 200
    )


def test_immutable_storage_and_path_validation(tmp_path):
    store = LocalStore(str(tmp_path))
    assert store.put("a/b.json", b"{}")
    assert json.loads(store.get("a/b.json")) == {}
    with pytest.raises(ValueError):
        store.put("a/b.json", b"different")
    with pytest.raises(ValueError):
        store.get("../outside")
