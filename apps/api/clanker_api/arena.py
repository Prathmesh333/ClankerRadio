import json
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from uuid import uuid4

from clanker_music.instruments import catalog
from clanker_music.models import StrictModel
from clanker_music.performance import PerformancePlan, PerformanceRequest, build_performance
from pydantic import Field
from sqlalchemy import select

from clanker_api.codex_provider import ask_codex
from clanker_api.curation import music_fingerprint, quality_rank
from clanker_api.database import ArenaRow, PerformanceRow, database
from clanker_api.storage import get_store


class Critique(StrictModel):
    musicalCoherence: int = Field(ge=0, le=100)
    orchestration: int = Field(ge=0, le=100)
    development: int = Field(ge=0, le=100)
    findings: list[str] = Field(min_length=1, max_length=6)
    revisions: list[str] = Field(min_length=1, max_length=6)


class Verdict(StrictModel):
    winner: str
    scoreA: int = Field(ge=0, le=100)
    scoreB: int = Field(ge=0, le=100)
    approved: bool
    reasoning: str


_lock = threading.Lock()
_active: dict[str, threading.Event] = {}


def save_performance(performance):
    engine, sessions = database()
    try:
        with sessions() as session:
            fingerprint = music_fingerprint(performance)
            for row in session.scalars(select(PerformanceRow)):
                if music_fingerprint(row.payload) == fingerprint and quality_rank(
                    row.payload
                ) >= quality_rank(performance):
                    return row.payload
            if not session.get(PerformanceRow, performance["id"]):
                session.add(PerformanceRow(id=performance["id"], payload=performance))
                session.commit()
        get_store().put(
            f"performances/{performance['id']}.json", json.dumps(performance, sort_keys=True).encode()
        )
    finally:
        engine.dispose()
    return performance


def load_arena(arena_id):
    engine, sessions = database()
    try:
        with sessions() as session:
            row = session.get(ArenaRow, arena_id)
            return row.payload if row else None
    finally:
        engine.dispose()


def store_arena(payload):
    engine, sessions = database()
    try:
        with sessions() as session:
            row = session.get(ArenaRow, payload["id"])
            if row:
                row.payload = json.loads(json.dumps(payload))
            else:
                session.add(ArenaRow(id=payload["id"], payload=payload))
            session.commit()
    finally:
        engine.dispose()


def start_arena(request: PerformanceRequest):
    with _lock:
        if _active:
            raise ValueError("A Codex tournament is already running. Stop it before starting another.")
        identity = "arena_" + uuid4().hex
        event = threading.Event()
        _active[identity] = event
        payload = {
            "id": identity,
            "status": "RUNNING",
            "stage": "Starting two composer agents",
            "round": 0,
            "request": request.model_dump(),
            "history": [],
            "candidates": {},
            "verdict": None,
            "performanceId": None,
            "error": None,
            "callsCompleted": 0,
            "callsPlanned": 15,
        }
        store_arena(payload)
        threading.Thread(target=run_arena, args=(payload, event), daemon=True).start()
        return payload


def stop_arena(identity):
    with _lock:
        event = _active.get(identity)
        if event:
            event.set()
    return load_arena(identity)


def stop_all_arenas():
    with _lock:
        for event in _active.values():
            event.set()
    deadline = time.monotonic() + 5
    while time.monotonic() < deadline:
        with _lock:
            if not _active:
                break
        time.sleep(0.1)


def run_arena(payload, stopped, provider=ask_codex):
    request = PerformanceRequest.model_validate(payload["request"])

    def update(stage):
        if stopped.is_set():
            raise RuntimeError("Tournament stopped by operator.")
        payload["stage"] = stage
        store_arena(payload)

    def call(prompt, model):
        return provider(prompt, model, stopped.is_set)

    context = json.dumps(
        {
            "brief": request.model_dump(),
            "instruments": [
                {key: value for key, value in patch.items() if key in ["id", "role", "family", "low", "high"]}
                for patch in catalog()
                if patch["id"] in request.instrumentIds
            ],
        }
    )
    rules = (
        "Create original, coherent instrumental music. Supply ALL selected instruments exactly once. "
        "Use three distinct motifs with degrees 0..14 and 4..12 equal-length durations, each .25..4 beats, "
        "total <=13 beats. Progression contains scale degree roots 0..6. "
        "Parts have entry/exit section indices 0..6 (entry<exit), gain .15..1. "
        "Rotate leads, preserve rests, avoid clutter, develop a six-section dramatic arc. "
        "Follow the requested genre: strong hooks, syncopation and high energy for dance genres. "
        "Electronic profiles use tight drums, offbeat bass, short chord stabs, builds and drops. "
        "The engine rotates pitched instruments sharing a role per phrase; drums have independent lanes. "
        "No artist imitation or raga authenticity claim. This is symbolic review, not audio listening. "
    )
    try:
        with ThreadPoolExecutor(max_workers=2) as pool:
            update("Composer A and B are writing competing performances")
            futures = [
                pool.submit(call, f"Composer {name}: {approach}. {rules}\n{context}", PerformancePlan)
                for name, approach in [
                    ("A", "rhythm-first club music with a strong memorable hook"),
                    ("B", "bass-led festival arrangement with tension, drops and contrast"),
                ]
            ]
            candidates = {name: future.result() for name, future in zip(["A", "B"], futures)}
            for candidate in candidates.values():
                build_performance(request, PerformancePlan.model_validate(candidate))
            payload["callsCompleted"] = 2
            payload["candidates"] = candidates
            payload["history"].append({"round": 0, "candidates": json.loads(json.dumps(candidates))})
            for round_index in range(1, 4):
                payload["round"] = round_index
                update(f"Round {round_index}/3: composers cross-criticize each other's scores")
                critiques = {
                    name: pool.submit(
                        call,
                        f"You are composer {'B' if name == 'A' else 'A'}, a rigorous peer critic of {name}. "
                        "Find concrete weaknesses in motifs, harmony, breath, orchestration and development. "
                        "Do not rubber-stamp. Require actionable revisions. Judge only this symbolic plan. "
                        f"Context: {context}\nCandidate: {json.dumps(candidate)}",
                        Critique,
                    )
                    for name, candidate in candidates.items()
                }
                critiques = {name: future.result() for name, future in critiques.items()}
                payload["callsCompleted"] += 2
                update(f"Round {round_index}/3: composers revise against peer criticism")
                revisions = {
                    name: pool.submit(
                        call,
                        f"Composer {name}: revise your plan using the peer critique. {rules}\n"
                        f"Context: {context}\nYour current plan: {json.dumps(candidates[name])}\n"
                        f"Critique: {json.dumps(critiques[name])}",
                        PerformancePlan,
                    )
                    for name in candidates
                }
                candidates = {name: future.result() for name, future in revisions.items()}
                for candidate in candidates.values():
                    build_performance(request, PerformancePlan.model_validate(candidate))
                payload["callsCompleted"] += 2
                payload["candidates"] = candidates
                payload["history"].append(
                    {
                        "round": round_index,
                        "critiques": critiques,
                        "candidates": json.loads(json.dumps(candidates)),
                    }
                )
                store_arena(payload)
            update("Independent judge is blind-ranking the two final candidates")
            verdict = call(
                "You are the independent final music judge. You did not compose either candidate. "
                "Select winner A or B. Score out of 100 using motif development, orchestration, harmony, "
                "contrast, and non-repetition. Approve only if the winner earns at least 75. "
                "You are reviewing a symbolic plan; do not claim you heard audio. "
                f"Context: {context}\nCandidates: {json.dumps(candidates)}",
                Verdict,
            )
            payload["callsCompleted"] += 1
            if verdict["winner"] not in ["A", "B"]:
                raise ValueError("The judge did not select a valid candidate.")
            payload["verdict"] = verdict
            if verdict["approved"] and verdict[f"score{verdict['winner']}"] >= 75:
                performance = build_performance(
                    request, PerformancePlan.model_validate(candidates[verdict["winner"]])
                )
                performance["provenance"].update(
                    source="codex_tournament",
                    arenaId=payload["id"],
                    revisionRounds=3,
                    judge=verdict,
                    agentCalls=15,
                )
                performance["id"] += "_" + payload["id"][-8:]
                if stopped.is_set():
                    raise RuntimeError("Tournament stopped before admission.")
                performance = save_performance(performance)
                payload["performanceId"] = performance["id"]
                payload["status"] = "COMPLETED"
                payload["stage"] = "Winner admitted to the performance library"
            else:
                payload["status"] = "REJECTED"
                payload["stage"] = "Neither final candidate passed the judge's quality threshold"
    except Exception as error:
        payload["status"] = "CANCELLED" if stopped.is_set() else "FAILED"
        payload["error"] = str(error)
    finally:
        try:
            store_arena(payload)
            get_store().put(f"tournaments/{payload['id']}.json", json.dumps(payload, sort_keys=True).encode())
        finally:
            with _lock:
                _active.pop(payload["id"], None)
