import threading

import pytest
from clanker_api.arena import Critique, Verdict, load_arena, run_arena, save_performance
from clanker_music.instruments import INSTRUMENTS
from clanker_music.performance import PerformancePlan, PerformanceRequest, build_performance, local_plan


@pytest.mark.parametrize(
    "mood",
    [
        "luminous",
        "dawn",
        "nocturne",
        "cosmic",
        "edm",
        "house",
        "techno",
        "trance",
        "drum_and_bass",
        "hip_hop",
        "synthwave",
        "rock",
    ],
)
def test_ensemble_is_deterministic_playable_and_uses_all_24(mood):
    request = PerformanceRequest(mood=mood)
    score = build_performance(request)
    assert score == build_performance(request)
    assert len(score["instrumentIds"]) == 24
    assert {event["instrumentId"] for event in score["events"]} == set(INSTRUMENTS)
    assert len({patch.partials for patch in INSTRUMENTS.values()}) > 20
    for event in score["events"]:
        patch = INSTRUMENTS[event["instrumentId"]]
        assert patch.low <= event["pitch"] <= patch.high
        assert 0 <= event["startBeat"] < event["startBeat"] + event["durationBeats"] <= score["durationBeats"]
        assert 1 <= event["velocity"] <= 127
    assert score["events"][-1]["phraseId"] == "final-tonic"


def test_reject_unknown_or_duplicate_instruments_and_invalid_ai_phrases():
    with pytest.raises(ValueError):
        PerformanceRequest(instrumentIds=["not-an-instrument"])
    with pytest.raises(ValueError):
        PerformanceRequest(instrumentIds=["flute", "flute"])
    plan = local_plan(PerformanceRequest()).model_dump()
    plan["motifs"][0]["durations"] = [4] * 8
    with pytest.raises(ValueError):
        PerformancePlan.model_validate(plan)


@pytest.mark.parametrize("duration", [30, 60, 180, 600])
@pytest.mark.parametrize("tempo", [40, 72, 120, 174, 190])
def test_every_selected_player_participates_even_in_short_forms(duration, tempo):
    score = build_performance(PerformanceRequest(durationTargetS=duration, tempoBpm=tempo))
    assert {event["instrumentId"] for event in score["events"]} == set(INSTRUMENTS)
    assert all(event["durationBeats"] > 0 for event in score["events"])


@pytest.mark.parametrize("approved", [True, False])
def test_three_round_tournament_has_15_calls_and_preserves_all_revisions(tmp_path, monkeypatch, approved):
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{tmp_path / 'arena.db'}")
    monkeypatch.setenv("ASSET_ROOT", str(tmp_path / "assets"))
    request = PerformanceRequest()
    payload = {
        "id": "arena_fixture",
        "request": request.model_dump(),
        "status": "RUNNING",
        "history": [],
        "candidates": {},
        "round": 0,
        "callsCompleted": 0,
        "callsPlanned": 15,
        "error": None,
        "performanceId": None,
        "verdict": None,
    }
    calls = []

    def provider(prompt, model, cancelled):
        calls.append((prompt, model))
        assert not cancelled()
        if model is PerformancePlan:
            return local_plan(request).model_dump()
        if model is Critique:
            return {
                "musicalCoherence": 74,
                "orchestration": 70,
                "development": 72,
                "findings": ["Too much doubling."],
                "revisions": ["Thin the middle register."],
            }
        assert model is Verdict
        return {
            "winner": "B",
            "scoreA": 72,
            "scoreB": 82 if approved else 60,
            "approved": approved,
            "reasoning": "Symbolic score assessment.",
        }

    original = save_performance(build_performance(request))
    run_arena(payload, threading.Event(), provider=provider)
    result = load_arena("arena_fixture")
    assert len(calls) == 15
    assert len([model for _, model in calls if model is PerformancePlan]) == 8
    assert len([model for _, model in calls if model is Critique]) == 6
    assert len(result["history"]) == 4
    assert [item["round"] for item in result["history"]] == [0, 1, 2, 3]
    assert result["status"] == ("COMPLETED" if approved else "REJECTED")
    assert bool(result["performanceId"]) == approved
    if approved:
        assert result["performanceId"] != original["id"]


def test_dance_groove_has_independent_drums_and_offbeat_bass():
    score = build_performance(PerformanceRequest(mood="edm"))
    assert score["sections"][2]["id"] == "Drop"
    drop = score["sections"][2]
    events = [e for e in score["events"] if drop["startBeat"] <= e["startBeat"] < drop["endBeat"]]
    drums = {e["instrumentId"] for e in events if e["instrumentId"] in ["frame_drum", "shaker", "marimba"]}
    assert len(drums) == 3
    assert len([e for e in events if e["instrumentId"] == "frame_drum"]) >= 16
    assert any(e["startBeat"] % 1 >= 0.49 for e in events if INSTRUMENTS[e["instrumentId"]].role == "bass")
