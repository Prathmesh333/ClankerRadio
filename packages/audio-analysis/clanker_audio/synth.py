import io
import wave

import numpy as np
from clanker_music.models import MusicalBlueprint, Score

SAMPLE_RATE = 48000
SYNTH_VERSION = "additive-prototype-0.1.0"


def render(score: Score, blueprint: MusicalBlueprint) -> tuple[dict[str, bytes], dict]:
    """Render original oscillator sounds. These sounds do not represent acoustic instrument samples."""
    seconds_per_beat = 60 / blueprint.tempoBpm
    length = round(score.durationBeats * seconds_per_beat * SAMPLE_RATE)
    stems = {
        name: np.zeros(length, dtype=np.float32)
        for name in sorted({event.instrumentId for event in score.events})
    }
    for event in score.events:
        start = round(event.startBeat * seconds_per_beat * SAMPLE_RATE)
        count = min(round(event.durationBeats * seconds_per_beat * SAMPLE_RATE), length - start)
        t = np.arange(count, dtype=np.float32) / SAMPLE_RATE
        frequency = 440 * 2 ** ((event.pitch - 69) / 12)
        phase = 2 * np.pi * frequency * t
        tone = np.sin(phase) + 0.12 * np.sin(phase * 2) + 0.04 * np.sin(phase * 3)
        attack = 0.15 if event.instrumentId == "prototype_flute" else 0.35
        envelope = np.minimum(t / attack, 1) * np.minimum((count / SAMPLE_RATE - t) / 0.3, 1)
        if event.instrumentId == "prototype_keys":
            envelope *= np.exp(-t / 2.5)
        stems[event.instrumentId][start : start + count] += tone * envelope * event.velocity / 127 * 0.15
    mix = sum(stems.values())
    peak = float(np.max(np.abs(mix)))
    gain = min(1.0, 0.65 / max(peak, 1e-9))
    outputs: dict[str, bytes] = {}
    for name, samples in {**stems, "mix": mix}.items():
        stream = io.BytesIO()
        with wave.open(stream, "wb") as wav:
            wav.setnchannels(2)
            wav.setsampwidth(2)
            wav.setframerate(SAMPLE_RATE)
            pcm = (np.clip(samples * gain, -1, 1) * 32767).astype("<i2")
            wav.writeframes(np.repeat(pcm[:, None], 2, axis=1).tobytes())
        outputs[f"{name}.wav"] = stream.getvalue()
    hop = SAMPLE_RATE // 4
    rms = [float(np.sqrt(np.mean(mix[i : i + hop] ** 2))) for i in range(0, length, hop)]
    return outputs, {
        "analyzerVersion": "rms-prototype-0.1.0",
        "synthVersion": SYNTH_VERSION,
        "sampleRate": SAMPLE_RATE,
        "durationS": length / SAMPLE_RATE,
        "samplePeakDbfs": float(20 * np.log10(max(peak * gain, 1e-9))),
        "hopSeconds": 0.25,
        "rms": rms,
        "notMeasured": ["integrated_lufs", "true_peak_dbtp", "spectral_bands", "similarity"],
    }
