import json
import secrets
import threading

from clanker_music.instruments import catalog
from clanker_music.models import StrictModel
from clanker_music.performance import PerformanceRequest, build_performance
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import Field
from sqlalchemy import select

from clanker_api.arena import load_arena, save_performance, start_arena, stop_arena
from clanker_api.codex_provider import connection_status
from clanker_api.curation import curate
from clanker_api.database import ArenaRow, PerformanceRow, PreferenceRow, database

router = APIRouter(prefix="/api")


@router.get("/instruments")
def instruments():
    return catalog()


@router.post("/performances")
def create_performance(request: PerformanceRequest):
    return save_performance(build_performance(request))


@router.get("/performances")
def library():
    engine, sessions = database()
    try:
        with sessions() as session:
            rows = session.scalars(select(PerformanceRow).order_by(PerformanceRow.created_at.desc())).all()
            preferences = {row.id: row.payload for row in session.scalars(select(PreferenceRow))}
            performances = curate([row.payload for row in rows], preferences)
            return [
                {
                    **{
                        key: performance[key]
                        for key in ["id", "title", "seed", "durationS", "instrumentIds", "provenance"]
                    },
                    "favorite": preferences.get(performance["id"], {}).get("favorite", False),
                }
                for performance in performances
            ]
    finally:
        engine.dispose()


class Preference(StrictModel):
    favorite: bool = False
    hidden: bool = False


@router.post("/performances/{identity}/preference")
def preference(identity: str, request: Preference):
    get_performance(identity)
    engine, sessions = database()
    try:
        with sessions() as session:
            row = session.get(PreferenceRow, identity)
            if row:
                row.payload = request.model_dump()
            else:
                session.add(PreferenceRow(id=identity, payload=request.model_dump()))
            session.commit()
        return request.model_dump()
    finally:
        engine.dispose()


@router.get("/performances/{identity}")
def get_performance(identity: str):
    engine, sessions = database()
    try:
        with sessions() as session:
            row = session.get(PerformanceRow, identity)
            if not row:
                raise HTTPException(404, "Performance not found.")
            return row.payload
    finally:
        engine.dispose()


@router.get("/performances/{identity}/json")
def download_performance(identity: str):
    return Response(
        json.dumps(get_performance(identity), indent=2),
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{identity}.json"'},
    )


@router.get("/agents/connection")
def codex_status():
    return connection_status()


@router.post("/agents/tournaments", status_code=202)
def tournament(request: PerformanceRequest):
    try:
        return start_arena(request)
    except ValueError as error:
        raise HTTPException(409, str(error)) from error


@router.get("/agents/tournaments")
def tournaments():
    engine, sessions = database()
    try:
        with sessions() as session:
            return [row.payload for row in session.scalars(select(ArenaRow)).all()][-20:][::-1]
    finally:
        engine.dispose()


@router.get("/agents/tournaments/{identity}")
def tournament_status(identity: str):
    payload = load_arena(identity)
    if not payload:
        raise HTTPException(404, "Tournament not found.")
    return payload


@router.post("/agents/tournaments/{identity}/stop")
def cancel_tournament(identity: str):
    if not load_arena(identity):
        raise HTTPException(404, "Tournament not found.")
    return stop_arena(identity)


class RadioRequest(StrictModel):
    brief: PerformanceRequest = Field(default_factory=PerformanceRequest)
    useCodex: bool = False


class Station:
    def __init__(self):
        self.lock = threading.Lock()
        self.stopped = threading.Event()
        self.stopped.set()
        self.thread = None
        self.queue = []
        self.state = {"running": False, "useCodex": False, "arenaId": None, "error": None, "generated": 0}

    def snapshot(self):
        with self.lock:
            return {**self.state, "queued": len(self.queue), "queue": list(self.queue)}

    def start(self, request):
        with self.lock:
            if self.thread and self.thread.is_alive():
                raise ValueError("The radio producer is already running.")
            self.stopped = threading.Event()
            self.queue = []
            self.state = {
                "running": True,
                "useCodex": request.useCodex,
                "arenaId": None,
                "error": None,
                "generated": 0,
            }
            self.thread = threading.Thread(target=self.produce, args=(request, self.stopped), daemon=True)
            self.thread.start()
        return self.snapshot()

    def produce(self, request, stopped):
        own_arena = None
        try:
            while not stopped.is_set():
                with self.lock:
                    queue_length = len(self.queue)
                if queue_length < 3:
                    brief = request.brief.model_copy(update={"seed": secrets.randbelow(2147483647)})
                    performance = save_performance(build_performance(brief))
                    with self.lock:
                        self.queue.append(
                            {"id": performance["id"], "title": performance["title"], "source": "local_rules"}
                        )
                        self.state["generated"] += 1
                if request.useCodex:
                    if own_arena:
                        arena = load_arena(own_arena)
                        if arena and arena["status"] != "RUNNING":
                            if arena["performanceId"]:
                                performance = get_performance(arena["performanceId"])
                                with self.lock:
                                    self.queue.insert(
                                        0,
                                        {
                                            "id": performance["id"],
                                            "title": performance["title"],
                                            "source": "codex_tournament",
                                        },
                                    )
                                    self.state["generated"] += 1
                            if arena["status"] == "FAILED":
                                with self.lock:
                                    self.state["error"] = arena["error"]
                                    self.state["useCodex"] = False
                                # Keep local playback alive. The failure is explicit in station status.
                                request = request.model_copy(update={"useCodex": False})
                            own_arena = None
                    elif queue_length < 5:
                        try:
                            arena = start_arena(
                                request.brief.model_copy(update={"seed": secrets.randbelow(2147483647)})
                            )
                            own_arena = arena["id"]
                            with self.lock:
                                self.state["arenaId"] = own_arena
                        except ValueError:
                            pass
                stopped.wait(0.5)
        except Exception as error:
            with self.lock:
                self.state["error"] = str(error)
        finally:
            if own_arena:
                stop_arena(own_arena)
            with self.lock:
                self.state["running"] = False


station = Station()


@router.post("/radio/start")
def start_radio(request: RadioRequest):
    try:
        return station.start(request)
    except ValueError as error:
        raise HTTPException(409, str(error)) from error


@router.post("/radio/stop")
def stop_radio():
    station.stopped.set()
    return station.snapshot()


@router.get("/radio/status")
def radio_status():
    return station.snapshot()


@router.post("/radio/next")
def next_performance():
    with station.lock:
        if not station.queue:
            raise HTTPException(409, "The next score is being prepared. Retry shortly.")
        item = station.queue.pop(0)
    return get_performance(item["id"])
