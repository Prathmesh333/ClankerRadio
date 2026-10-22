import hashlib
import random

from clanker_music.models import Brief, InstrumentRole, Motif, MusicalBlueprint, NoteEvent, Score, Section

RANGES = {"prototype_flute": (60, 84), "prototype_keys": (48, 84), "prototype_drone": (36, 60)}
SCALE = (0, 2, 4, 7, 9)


def plan(brief: Brief) -> MusicalBlueprint:
    digest = hashlib.sha256(brief.model_dump_json().encode()).hexdigest()[:24]
    bars = max(24, round(brief.durationTargetS * brief.tempoBpm / 240 / 4) * 4)
    body_units = bars // 4 - 2
    boundaries = [0, 4, *[4 + (body_units * i // 4) * 4 for i in (1, 2, 3)], bars - 4, bars]
    names = ["intro", "A", "A-prime", "B", "return", "outro"]
    fusion = brief.profile == "bansuri_dawn"
    motif = random.Random(brief.seed).choice([(0, 1, 2, 1, 0), (0, 2, 1, 3, 2), (0, 1, 3, 2, 0)])
    return MusicalBlueprint(
        compositionId=f"cmp_{digest}",
        seed=brief.seed,
        grammar=("indian_ambient_fusion_v0" if fusion else "western_tonal"),
        mood="dawn" if fusion else "night",
        durationTargetS=brief.durationTargetS,
        tempoBpm=brief.tempoBpm,
        scaleOrRaga="C major pentatonic; no raga claim",
        form=names,
        instrumentRoles=[
            InstrumentRole(
                instrumentId="prototype_flute" if fusion else "prototype_keys",
                role="lead",
                assetLicenseId="prototype-synthesis-v1",
            ),
            InstrumentRole(
                instrumentId="prototype_keys" if fusion else "prototype_drone",
                role="harmony" if fusion else "drone",
                assetLicenseId="prototype-synthesis-v1",
            ),
            *(
                [
                    InstrumentRole(
                        instrumentId="prototype_drone", role="drone", assetLicenseId="prototype-synthesis-v1"
                    )
                ]
                if fusion
                else []
            ),
        ],
        motifs=[Motif(id="A", intervals=list(motif), rhythmBeats=[1.5, 0.5, 2, 1, 2])],
        sections=[
            Section(id=name, startBar=boundaries[i], endBar=boundaries[i + 1], function=name)
            for i, name in enumerate(names)
        ],
        harmonicPlan=["tonic/fifth pedal"] if fusion else ["I", "vi", "IV", "I"],
    )


def compose(blueprint: MusicalBlueprint) -> Score:
    rng = random.Random(blueprint.seed)
    events: list[NoteEvent] = []
    end = blueprint.sections[-1].endBar * 4
    fusion = blueprint.grammar == "indian_ambient_fusion_v0"
    lead = "prototype_flute" if fusion else "prototype_keys"

    def note(instrument: str, pitch: int, start: float, duration: float, velocity: int, phrase: str):
        events.append(
            NoteEvent(
                instrumentId=instrument,
                pitch=pitch,
                startBeat=round(start, 5),
                durationBeats=duration,
                velocity=velocity,
                phraseId=phrase,
            )
        )

    for section_index, section in enumerate(blueprint.sections):
        for bar in range(section.startBar, section.endBar, 4):
            phrase = f"{section.id}-{bar}"
            if section.id not in ("intro", "outro"):
                motif = blueprint.motifs[0]
                contour = list(motif.intervals)
                if section.id == "B":
                    contour = list(reversed(contour))
                if section.id == "A-prime":
                    contour[2] = min(contour[2] + 1, 4)
                if section.id == "return":
                    contour[-1] = 0
                start = bar * 4 + 0.01 * rng.random()
                for i, (degree, duration) in enumerate(zip(contour, motif.rhythmBeats)):
                    # Phrase-level contour and expression preserve breathing space between statements.
                    pitch = 72 + SCALE[degree]
                    note(
                        lead, pitch, start, duration * 0.88, 57 + [0, 4, 8, 3, -5][i] + section_index, phrase
                    )
                    start += duration
                answer_start = bar * 4 + 9
                for i, degree in enumerate([2, 1, 0]):
                    note(lead, 72 + SCALE[degree], answer_start + i * 1.5, 1.25, 52, phrase)
            if fusion:
                note("prototype_keys", 60, bar * 4 + 1, 6, 36, phrase)
                note("prototype_keys", 67, bar * 4 + 1, 6, 30, phrase)
            else:
                root = [48, 57, 53, 48][(bar // 4) % 4]
                # Use chord tones in the support register, below the monophonic melody.
                for pitch in [root, root + (3 if root == 57 else 4), root + 7]:
                    note("prototype_keys", pitch, bar * 4, 12, 34, phrase)
            for pitch in [48, 55]:
                note("prototype_drone", pitch, bar * 4, min(15.5, end - bar * 4 - 0.5), 26, phrase)
    note(lead, 72, end - 8, 5, 45, "final-resolution")
    return Score(
        events=sorted(events, key=lambda e: (e.startBeat, e.instrumentId, e.pitch)), durationBeats=end
    )


def validate_score(score: Score, blueprint: MusicalBlueprint) -> list[str]:
    errors: list[str] = []
    for event in score.events:
        low, high = RANGES[event.instrumentId]
        if not low <= event.pitch <= high:
            errors.append(f"range:{event.instrumentId}:{event.pitch}")
        if event.startBeat + event.durationBeats > score.durationBeats:
            errors.append("event_after_end")
        if event.instrumentId == "prototype_flute" and event.pitch % 12 not in SCALE:
            errors.append("lead_outside_scale")
    flute = [e for e in score.events if e.instrumentId == "prototype_flute"]
    for a, b in zip(flute, flute[1:]):
        if a.startBeat + a.durationBeats > b.startBeat:
            errors.append("flute_overlap")
    if score.durationBeats != blueprint.sections[-1].endBar * 4:
        errors.append("duration_mismatch")
    return errors
