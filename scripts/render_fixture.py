"""Save the first deterministic score and audio fixture for local review."""

import json
from pathlib import Path

from clanker_audio.synth import render
from clanker_music.composer import compose, plan, validate_score
from clanker_music.midi import export_midi
from clanker_music.models import Brief

target = Path("artifacts/fixtures/bansuri-dawn-42")
target.mkdir(parents=True, exist_ok=True)
blueprint = plan(Brief())
score = compose(blueprint)
assert not validate_score(score, blueprint)
files, analysis = render(score, blueprint)
files["score.mid"] = export_midi(score, blueprint)
files["blueprint.json"] = blueprint.model_dump_json(indent=2).encode()
files["score.json"] = score.model_dump_json(indent=2).encode()
files["analysis.json"] = json.dumps(analysis, indent=2).encode()
for name, data in files.items():
    (target / name).write_bytes(data)
print(f"Fixture saved: {target.resolve()}")
print(f"Duration: {analysis['durationS']:.2f} s. Publication remains blocked.")
