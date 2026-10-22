import os
from contextlib import asynccontextmanager
from typing import Annotated

from clanker_music.composer import compose, plan, validate_score
from clanker_music.midi import export_midi
from clanker_music.models import Brief
from fastapi import BackgroundTasks, Depends, FastAPI, Header, HTTPException
from fastapi.responses import Response
from redis import Redis
from rq import Queue
from sqlalchemy.exc import IntegrityError

from clanker_api.arena import stop_all_arenas
from clanker_api.database import CompositionRow, JobRow, database
from clanker_api.jobs import run_render
from clanker_api.loopback import router as loopback_router
from clanker_api.lyrics import router as lyrics_router
from clanker_api.performance_routes import router, station
from clanker_api.storage import get_store


def authorize(x_studio_token: Annotated[str | None, Header()] = None):
    expected = os.getenv("STUDIO_TOKEN")
    if expected and x_studio_token != expected:
        raise HTTPException(401, "The Studio token is missing or invalid.")


@asynccontextmanager
async def lifespan(app: FastAPI):
    engine, sessions = database()
    app.state.sessions = sessions
    yield
    station.stopped.set()
    if station.thread:
        station.thread.join(timeout=3)
    stop_all_arenas()
    engine.dispose()


app = FastAPI(title="Clanker Radio", version="0.2.0", lifespan=lifespan, dependencies=[Depends(authorize)])

app.include_router(router)
app.include_router(lyrics_router)
app.include_router(loopback_router)


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "version": "0.2.0",
        "queue": os.getenv("QUEUE_BACKEND", "local"),
        "publishing": "NOT IMPLEMENTED",
    }


@app.post("/api/compositions/plan")
def create_plan(brief: Brief):
    blueprint = plan(brief)
    score = compose(blueprint)
    errors = validate_score(score, blueprint)
    payload = {
        "id": blueprint.compositionId,
        "blueprint": blueprint.model_dump(),
        "score": score.model_dump(),
        "quality": {
            "status": "NEEDS_REVIEW",
            "checks": {"score_valid": not errors, "seed_recorded": True, "prototype_sounds_only": True},
            "blockers": [
                *errors,
                "instrument_authenticity_review_required",
                "license_review_required",
                "loudness_and_true_peak_not_measured",
                "originality_review_required",
                "human_listening_review_required",
                "video_not_rendered",
            ],
            "notes": [
                "Original oscillator sounds; no sampled bansuri or harmonium is supplied.",
                "Duration is quantized to complete musical sections.",
            ],
        },
    }
    with app.state.sessions() as session:
        existing = session.get(CompositionRow, blueprint.compositionId)
        if existing:
            return existing.payload
        session.add(CompositionRow(id=blueprint.compositionId, payload=payload))
        try:
            session.commit()
        except IntegrityError:
            session.rollback()
            return session.get(CompositionRow, blueprint.compositionId).payload
    return payload


@app.get("/api/compositions/{composition_id}")
def get_composition(composition_id: str):
    with app.state.sessions() as session:
        row = session.get(CompositionRow, composition_id)
        if row is None:
            raise HTTPException(404, "Composition does not exist.")
        return row.payload


@app.get("/api/compositions/{composition_id}/midi")
def get_midi(composition_id: str):
    from clanker_music.models import MusicalBlueprint, Score

    composition = get_composition(composition_id)
    data = export_midi(
        Score.model_validate(composition["score"]), MusicalBlueprint.model_validate(composition["blueprint"])
    )
    return Response(
        data,
        media_type="audio/midi",
        headers={"Content-Disposition": 'attachment; filename="composition.mid"'},
    )


@app.post("/api/compositions/{composition_id}/render", status_code=202)
def queue_render(
    composition_id: str,
    background: BackgroundTasks,
    idempotency_key: Annotated[str, Header(min_length=1, max_length=128)],
):
    import hashlib

    get_composition(composition_id)
    job_id = "job_" + hashlib.sha256(f"{composition_id}:{idempotency_key}".encode()).hexdigest()[:32]
    with app.state.sessions() as session:
        row = session.get(JobRow, job_id)
        if row:
            return job_payload(row)
        row = JobRow(id=job_id, composition_id=composition_id, status="QUEUED", artifacts={})
        session.add(row)
        try:
            session.commit()
        except IntegrityError:
            session.rollback()
            return job_payload(session.get(JobRow, job_id))
        if os.getenv("QUEUE_BACKEND") == "redis":
            try:
                Queue(connection=Redis.from_url(os.environ["REDIS_URL"])).enqueue(
                    run_render, job_id, job_id=job_id, job_timeout=600
                )
            except Exception:
                row.status = "FAILED"
                row.error = "Queue dispatch failed. Start Redis and submit a new idempotency key."
                session.commit()
                raise HTTPException(503, row.error) from None
        else:
            background.add_task(run_render, job_id)
        return job_payload(row)


def job_payload(row: JobRow):
    return {
        "id": row.id,
        "compositionId": row.composition_id,
        "status": row.status,
        "error": row.error,
        "artifacts": row.artifacts,
    }


@app.get("/api/jobs/{job_id}")
def get_job(job_id: str):
    with app.state.sessions() as session:
        row = session.get(JobRow, job_id)
        if row is None:
            raise HTTPException(404, "Job does not exist.")
        return job_payload(row)


@app.get("/api/jobs/{job_id}/artifacts/{filename}")
def artifact(job_id: str, filename: str):
    job = get_job(job_id)
    if filename not in job["artifacts"]:
        raise HTTPException(404, "Artifact does not exist.")
    data = get_store().get(f"{job_id}/{filename}")
    media = (
        "audio/wav"
        if filename.endswith(".wav")
        else "audio/midi"
        if filename.endswith(".mid")
        else "application/json"
    )
    return Response(data, media_type=media)


@app.post("/api/programs/{program_id}/publish")
def publish(program_id: str):
    raise HTTPException(409, "Publication is NOT IMPLEMENTED. Required review gates are incomplete.")
