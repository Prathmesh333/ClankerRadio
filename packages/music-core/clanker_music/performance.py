import hashlib
import random
from typing import Literal

from pydantic import Field, field_validator, model_validator

from clanker_music.instruments import INSTRUMENTS
from clanker_music.models import StrictModel


class PerformanceRequest(StrictModel):
    seed: int = Field(default=42, ge=0, le=2147483647)
    tempoBpm: float = Field(default=128, ge=40, le=190)
    durationTargetS: float = Field(default=180, ge=30, le=600)
    mood: Literal[
        "edm",
        "house",
        "techno",
        "trance",
        "drum_and_bass",
        "hip_hop",
        "synthwave",
        "rock",
        "luminous",
        "dawn",
        "nocturne",
        "cosmic",
    ] = "edm"
    instrumentIds: list[str] = Field(default_factory=lambda: list(INSTRUMENTS), min_length=1, max_length=24)

    @field_validator("instrumentIds")
    @classmethod
    def known_instruments(cls, values):
        if len(set(values)) != len(values) or any(value not in INSTRUMENTS for value in values):
            raise ValueError("Select unique instruments from the catalog.")
        return values


class Phrase(StrictModel):
    degrees: list[int] = Field(min_length=4, max_length=12)
    durations: list[float] = Field(min_length=4, max_length=12)

    @model_validator(mode="after")
    def valid_phrase(self):
        if len(self.degrees) != len(self.durations):
            raise ValueError("Each pitch degree requires a duration.")
        if any(not 0 <= degree <= 14 for degree in self.degrees):
            raise ValueError("Pitch degrees must be between 0 and 14.")
        if any(duration < 0.25 or duration > 4 for duration in self.durations):
            raise ValueError("Note durations must be between 0.25 and 4 beats.")
        if sum(self.durations) > 13:
            raise ValueError("Leave at least 3 beats for phrase breathing.")
        return self


class Arrangement(StrictModel):
    instrumentId: str
    role: Literal["lead", "answer", "arpeggio", "pad", "bass", "pulse", "sparkle", "drone"]
    gain: float = Field(ge=0.15, le=1.0)
    entry: int = Field(ge=0, le=4)
    exit: int = Field(ge=1, le=6)

    @model_validator(mode="after")
    def valid_part(self):
        if self.instrumentId not in INSTRUMENTS or self.exit <= self.entry:
            raise ValueError("Invalid instrument or section range.")
        return self


class PerformancePlan(StrictModel):
    title: str = Field(min_length=1, max_length=100)
    intention: str = Field(min_length=1, max_length=1000)
    tonic: int = Field(ge=48, le=59)
    mode: Literal["major", "minor", "pentatonic"]
    motifs: list[Phrase] = Field(min_length=3, max_length=4)
    progression: list[int] = Field(min_length=4, max_length=8)
    parts: list[Arrangement] = Field(min_length=1, max_length=24)

    @field_validator("progression")
    @classmethod
    def valid_roots(cls, roots):
        if any(not 0 <= root <= 6 for root in roots):
            raise ValueError("Harmonic roots use scale degrees 0 through 6.")
        return roots

    @field_validator("parts")
    @classmethod
    def unique_parts(cls, parts):
        if len({part.instrumentId for part in parts}) != len(parts):
            raise ValueError("Each instrument requires one part.")
        return parts


def local_plan(request: PerformanceRequest) -> PerformancePlan:
    rng = random.Random(request.seed)
    motifs = []
    for index in range(3):
        contour = rng.choice([[0, 2, 4, 3, 2, 1, 2, 0], [0, 1, 2, 4, 3, 2, 1, 0], [4, 2, 3, 1, 2, 0, 1, 0]])
        contour = list(contour)
        for pivot in rng.sample(range(1, 7), 2):
            contour[pivot] = max(0, min(6, contour[pivot] + rng.choice([-1, 1])))
        motifs.append(
            Phrase(
                degrees=[degree + (2 if index == 1 else 0) for degree in contour],
                durations=rng.choice(
                    [
                        [1, 0.5, 0.5, 2, 1, 1, 1, 2],
                        [1.5, 0.5, 1, 1.5, 0.5, 1, 1, 2],
                        [2, 1, 0.5, 0.5, 1.5, 0.5, 1, 2],
                        [1, 0.5, 1.5, 1, 0.5, 1.5, 1, 2],
                    ]
                ),
            )
        )
    energetic = request.mood not in ["luminous", "dawn", "nocturne", "cosmic"]
    return PerformancePlan(
        title=rng.choice(
            ["Voltage Run", "Afterburner", "Neon Collision", "Midnight Circuit"]
            if energetic
            else ["Luminous Atlas", "Gardens of Saturn", "The Amber Tide", "A Thousand Quiet Suns"]
        )
        + f" · {request.seed}",
        intention="A chamber ensemble unfolds in six sections, exchanging motifs across instrument families.",
        tonic=rng.choice([48, 50, 53, 55]),
        mode="minor" if energetic or request.mood == "nocturne" else "major",
        motifs=motifs,
        progression=rng.choice([[0, 5, 3, 4], [0, 3, 1, 4], [0, 2, 5, 3]]),
        parts=[
            Arrangement(
                instrumentId=key,
                role=INSTRUMENTS[key].role,
                gain=0.65,
                entry=(
                    0
                    if energetic
                    and (INSTRUMENTS[key].role == "bass" or key in ["frame_drum", "shaker", "marimba"])
                    else 1
                    if energetic
                    else 0
                    if INSTRUMENTS[key].role in ["pad", "drone", "arpeggio"]
                    else 1
                ),
                exit=(6 if INSTRUMENTS[key].role in ["pad", "drone"] else 5),
            )
            for key in request.instrumentIds
        ],
    )


def build_performance(request: PerformanceRequest, plan: PerformancePlan | None = None) -> dict:
    plan = plan or local_plan(request)
    if set(request.instrumentIds) != {part.instrumentId for part in plan.parts}:
        raise ValueError("The arrangement must include every selected instrument exactly once.")
    rng = random.Random(request.seed)
    units = max(6, round(request.durationTargetS * request.tempoBpm / 960))
    bounds = [0, 16, *[16 + ((units - 2) * i // 4) * 16 for i in [1, 2, 3]], (units - 1) * 16, units * 16]
    # Short pieces still need six non-empty sections.
    if any(b <= a for a, b in zip(bounds, bounds[1:])):
        bounds = [i * 16 for i in range(7)]
    scale = {"major": [0, 2, 4, 5, 7, 9, 11], "minor": [0, 2, 3, 5, 7, 8, 10], "pentatonic": [0, 2, 4, 7, 9]}[
        plan.mode
    ]
    end = bounds[-1]
    names = ["Overture", "First light", "Conversation", "Constellation", "Homecoming", "Afterglow"]
    energetic = request.mood not in ["luminous", "dawn", "nocturne", "cosmic"]
    if energetic:
        names = ["Intro", "Build", "Drop", "Breakdown", "Final drop", "Outro"]
    notes = []

    def pitch(degree, register, patch):
        value = plan.tonic + scale[degree % len(scale)] + 12 * (degree // len(scale) + register)
        while value < patch.low:
            value += 12
        while value > patch.high:
            value -= 12
        return value

    for section in range(6):
        for phrase_index, beat in enumerate(range(bounds[section], bounds[section + 1], 16)):
            root = plan.progression[(beat // 16) % len(plan.progression)] if section not in [0, 5] else 0
            motif = plan.motifs[(section + phrase_index // 2) % len(plan.motifs)]
            for part_index, part in enumerate(plan.parts):
                if not part.entry <= section < part.exit:
                    continue
                patch = INSTRUMENTS[part.instrumentId]
                role = part.role
                # Rotate lead and response players. All timbres participate without 24 competing melodies.
                peers = [p for p in plan.parts if p.role == role and p.entry <= section < p.exit]
                lane = peers.index(part)
                if role in ["lead", "answer", "arpeggio", "sparkle", "pulse", "bass"]:
                    if (phrase_index + section) % len(peers) != lane and not (
                        energetic and (patch.family == "percussion" or patch.id == "marimba")
                    ):
                        continue
                material = []
                register = (
                    1 if role in ["lead", "answer", "sparkle"] else -1 if role in ["bass", "drone"] else 0
                )
                if role in ["lead", "answer"]:
                    cursor = 0 if role == "lead" else 8
                    degrees = motif.degrees if role == "lead" else list(reversed(motif.degrees[:4]))
                    for i, degree in enumerate(degrees):
                        duration = motif.durations[i]
                        if cursor + duration > 15:
                            break
                        # Strong attacks land on chord tones; offbeats carry the motif's passing tones.
                        degree = root + ([0, 2, 4][i % 3] if i in [0, len(degrees) - 1] else degree)
                        material.append((cursor, degree, duration * 0.82))
                        cursor += duration
                elif role == "arpeggio":
                    material = [(i * 2 + 0.03 * (i % 2), root + [0, 2, 4, 2][i % 4], 1.6) for i in range(7)]
                elif role == "pad":
                    # Pad players divide the chord rather than doubling every voice.
                    material = [(0.1, root + [0, 2, 4][part_index % 3], 13.5)]
                elif role == "bass":
                    material = [(0, root, 6), (8, root + 4, 5)]
                elif role == "drone":
                    material = [(0, 0, 14)]
                elif role == "sparkle":
                    material = [(6 + lane % 3, root + 4, 2)]
                elif role == "pulse":
                    material = [
                        (i * 2, root, 0.22 if patch.family == "percussion" else 0.65) for i in range(8)
                    ]
                if energetic:
                    # Every drum has its own lane; pitched parts exchange hooks around the groove.
                    drop = section in [2, 4]
                    if patch.id == "frame_drum":
                        hits = (
                            list(range(16))
                            if request.mood not in ["hip_hop", "drum_and_bass"]
                            else [0, 2.5, 6, 8, 10.5, 14]
                        )
                        material = [(i, 0, 0.18) for i in hits if section != 3 or i % 4 == 0]
                    elif patch.id == "marimba":
                        material = [
                            (i, root, 0.12)
                            for i in (
                                [2, 6, 10, 14]
                                if request.mood in ["drum_and_bass", "hip_hop"]
                                else [1, 3, 5, 7, 9, 11, 13, 15]
                            )
                        ]
                    elif patch.id == "shaker":
                        material = [(i * 0.5 + 0.5, 0, 0.08) for i in range(31) if drop or i % 2 == 0]
                    elif role == "bass":
                        material = [
                            (i * 0.5 + 0.5, root + ([0, 0, 4, 0, 0, 2, 0, 4][i % 8]), 0.3) for i in range(31)
                        ]
                    elif role == "arpeggio":
                        material = [
                            (i * 0.5, root + [0, 2, 4, 6, 4, 2, 0, 4][i % 8], 0.22) for i in range(32)
                        ]
                    elif role in ["pad", "drone"]:
                        material = [(i * 4 + 0.5, root + [0, 2, 4][part_index % 3], 0.55) for i in range(4)]
                    elif role in ["lead", "answer"]:
                        material = [
                            (i * 0.5, root + motif.degrees[i % len(motif.degrees)], 0.3 if i % 4 else 0.65)
                            for i in range(24 if drop else 12)
                        ]
                    elif role == "pulse":
                        material = [
                            (i + (1 if request.mood == "hip_hop" else 0.5), root, 0.12) for i in range(15)
                        ]
                for offset, degree, duration in material:
                    onset = beat + offset + (0.008 * rng.random() if offset else 0)
                    duration = min(duration, end - onset - 0.1)
                    if duration <= 0:
                        continue
                    velocity = max(
                        24,
                        min(
                            100,
                            round(
                                (
                                    (106 if energetic else 58)
                                    + 10 * (section in [2, 4])
                                    - 12 * (section in [0, 5])
                                    + rng.randrange(-4, 5)
                                )
                                * part.gain
                            ),
                        ),
                    )
                    notes.append(
                        {
                            "instrumentId": part.instrumentId,
                            "pitch": pitch(degree, register, patch),
                            "startBeat": round(onset, 5),
                            "durationBeats": round(duration, 5),
                            "velocity": velocity,
                            "phraseId": f"s{section}-p{phrase_index}",
                        }
                    )
    # Give every selected performer an intentional entrance, including in very short forms.
    used = {event["instrumentId"] for event in notes}
    for index, part in enumerate(plan.parts):
        if part.instrumentId not in used:
            patch = INSTRUMENTS[part.instrumentId]
            notes.append(
                {
                    "instrumentId": patch.id,
                    "pitch": pitch([0, 2, 4][index % 3], 0, patch),
                    "startBeat": bounds[part.entry] + 2 + (index % 4) * 2,
                    "durationBeats": 1.5,
                    "velocity": 32,
                    "phraseId": f"entrance-{patch.id}",
                }
            )
    # Leave the final bar clear for a definite ending and release tails.
    if energetic:
        notes = [event for event in notes if event["startBeat"] < end - 4]
        for event in notes:
            event["durationBeats"] = min(event["durationBeats"], end - 4 - event["startBeat"] - 0.05)
    # A final tonic cadence, then space for release tails.
    final = INSTRUMENTS[plan.parts[0].instrumentId]
    notes = [event for event in notes if event["instrumentId"] != final.id or event["startBeat"] < end - 4]
    for event in notes:
        if event["instrumentId"] == final.id and event["startBeat"] < end - 4:
            event["durationBeats"] = min(event["durationBeats"], end - 4 - event["startBeat"] - 0.05)
    notes = [event for event in notes if event["durationBeats"] > 0]
    notes.append(
        {
            "instrumentId": final.id,
            "pitch": pitch(0, 1, final),
            "startBeat": end - 4,
            "durationBeats": 2,
            "velocity": 38,
            "phraseId": "final-tonic",
        }
    )
    identity = hashlib.sha256(
        (request.model_dump_json() + plan.model_dump_json() + "ensemble-0.4.0").encode()
    ).hexdigest()[:24]
    return {
        "id": f"perf_{identity}",
        "schemaVersion": "2.0",
        "composerVersion": "ensemble-0.4.0",
        "title": plan.title,
        "seed": request.seed,
        "mood": request.mood,
        "tempoBpm": request.tempoBpm,
        "durationBeats": end,
        "durationS": end * 60 / request.tempoBpm + 3,
        "plan": plan.model_dump(),
        "instrumentIds": request.instrumentIds,
        "sections": [{"id": names[i], "startBeat": bounds[i], "endBeat": bounds[i + 1]} for i in range(6)],
        "events": sorted(notes, key=lambda e: (e["startBeat"], e["instrumentId"], e["pitch"])),
        "provenance": {
            "source": "local_rules",
            "soundEngine": "original-procedural-synthesis-v2",
            "acousticSamples": False,
            "reviewScope": "symbolic score; human listening still required",
        },
    }
