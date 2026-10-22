from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)


class Brief(StrictModel):
    profile: Literal["bansuri_dawn", "midnight_piano"] = "bansuri_dawn"
    seed: int = Field(default=42, ge=0, le=2147483647)
    tempoBpm: float = Field(default=64, ge=54, le=70)
    durationTargetS: float = Field(default=180, ge=60, le=300)


class InstrumentRole(StrictModel):
    instrumentId: str
    role: Literal["lead", "response", "harmony", "drone", "bass", "rhythm", "texture"]
    assetLicenseId: str


class Motif(StrictModel):
    id: str
    intervals: list[int]
    rhythmBeats: list[float]


class Section(StrictModel):
    id: str
    startBar: int = Field(ge=0)
    endBar: int = Field(ge=1)
    function: str


class MusicalBlueprint(StrictModel):
    schemaVersion: Literal["1.0"] = "1.0"
    compositionId: str
    seed: int
    grammar: Literal["western_tonal", "indian_ambient_fusion_v0"]
    mood: str
    durationTargetS: float
    tempoBpm: float
    meter: Literal["4/4"] = "4/4"
    tonalCenter: str = "C"
    scaleOrRaga: str
    form: list[str]
    instrumentRoles: list[InstrumentRole]
    motifs: list[Motif]
    sections: list[Section]
    harmonicPlan: list[str]


class NoteEvent(StrictModel):
    instrumentId: Literal["prototype_flute", "prototype_keys", "prototype_drone"]
    pitch: int = Field(ge=0, le=127)
    startBeat: float = Field(ge=0)
    durationBeats: float = Field(gt=0)
    velocity: int = Field(ge=1, le=127)
    phraseId: str


class Score(StrictModel):
    events: list[NoteEvent]
    durationBeats: float = Field(gt=0)
    composerVersion: str = "0.1.0"
