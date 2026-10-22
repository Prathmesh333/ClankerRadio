import io
import json
from pathlib import Path

import jsonschema
import mido
import pytest
from clanker_music.composer import compose, plan, validate_score
from clanker_music.midi import export_midi
from clanker_music.models import Brief

ROOT = Path(__file__).resolve().parents[2]


@pytest.mark.parametrize("profile", ["bansuri_dawn", "midnight_piano"])
@pytest.mark.parametrize("seed", [0, 42, 2026])
def test_repeatability_and_contract(profile, seed):
    brief = Brief(profile=profile, seed=seed)
    blueprint = plan(brief)
    score = compose(blueprint)
    assert blueprint == plan(brief)
    assert score == compose(blueprint)
    assert not validate_score(score, blueprint)
    schema = json.loads((ROOT / "packages/contracts/schemas/music_blueprint.schema.json").read_text())
    jsonschema.validate(blueprint.model_dump(), schema)
    assert 180 <= score.durationBeats * 60 / blueprint.tempoBpm <= 200


def test_midi_duration_breaths_and_final_resolution():
    blueprint = plan(Brief())
    score = compose(blueprint)
    midi = mido.MidiFile(file=io.BytesIO(export_midi(score, blueprint)))
    assert abs(midi.length - score.durationBeats * 60 / blueprint.tempoBpm) < 0.02
    lead = [event for event in score.events if event.instrumentId == "prototype_flute"]
    assert lead[-1].pitch == 72
    assert any(b.startBeat - a.startBeat - a.durationBeats > 1 for a, b in zip(lead, lead[1:]))
    assert len({e.pitch for e in lead}) >= 3


def test_validator_rejects_overlap_and_range():
    blueprint = plan(Brief())
    score = compose(blueprint)
    lead = next(event for event in score.events if event.instrumentId == "prototype_flute")
    lead.pitch = 100
    lead.durationBeats = score.durationBeats
    errors = validate_score(score, blueprint)
    assert any(error.startswith("range:") for error in errors)
    assert "flute_overlap" in errors
    assert "event_after_end" in errors


def test_seed_changes_identity_and_motif():
    a, b = plan(Brief(seed=0)), plan(Brief(seed=42))
    assert a.compositionId != b.compositionId
    assert a.motifs != b.motifs


@pytest.mark.parametrize("tempo", [54, 55, 63, 70])
@pytest.mark.parametrize("duration", [60, 180, 240, 300])
def test_sections_and_events_stay_within_bounds(tempo, duration):
    blueprint = plan(Brief(tempoBpm=tempo, durationTargetS=duration))
    assert all(s.endBar > s.startBar and s.startBar % 4 == 0 for s in blueprint.sections)
    assert not validate_score(compose(blueprint), blueprint)
