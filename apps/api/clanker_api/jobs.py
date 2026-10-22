import json
import platform
from importlib.metadata import version

from clanker_audio.synth import render
from clanker_music.midi import export_midi
from clanker_music.models import MusicalBlueprint, Score

from clanker_api.database import CompositionRow, JobRow, database
from clanker_api.storage import get_store


def run_render(job_id: str):
    engine, sessions = database()
    try:
        with sessions() as session:
            job = session.get(JobRow, job_id)
            if job is None or job.status == "COMPLETED":
                return
            job.status = "RUNNING"
            session.commit()
            try:
                composition = session.get(CompositionRow, job.composition_id)
                blueprint = MusicalBlueprint.model_validate(composition.payload["blueprint"])
                score = Score.model_validate(composition.payload["score"])
                files, features = render(score, blueprint)
                files["score.mid"] = export_midi(score, blueprint)
                files["composition.json"] = json.dumps(composition.payload, sort_keys=True).encode()
                files["features.json"] = json.dumps(features, sort_keys=True).encode()
                store = get_store()
                checksums = {name: store.put(f"{job_id}/{name}", data) for name, data in files.items()}
                manifest = {
                    "compositionId": composition.id,
                    "jobId": job_id,
                    "seed": blueprint.seed,
                    "composerVersion": score.composerVersion,
                    "checksums": checksums,
                    "pythonVersion": platform.python_version(),
                    "toolVersions": {name: version(name) for name in ["numpy", "mido", "pydantic"]},
                    "analysis": {k: v for k, v in features.items() if k != "rms"},
                    "publicationBlockers": composition.payload["quality"]["blockers"],
                }
                store.put(f"{job_id}/manifest.json", json.dumps(manifest, sort_keys=True).encode())
                job.artifacts = {
                    name: f"/api/jobs/{job_id}/artifacts/{name}" for name in [*files, "manifest.json"]
                }
                job.status = "COMPLETED"
            except Exception as exc:
                job.status = "FAILED"
                job.error = f"{type(exc).__name__}: {exc}"
            session.commit()
    finally:
        engine.dispose()
