# Audio Engine, AI Adapters, and Quality Evaluation

## 1. Selected signal path

```
Mood brief -> MusicalBlueprint -> Score composer -> MIDI/stem events
         -> MIDI validation -> Instrument sampler/synth -> dry WAV stems
         -> expression + articulation -> arrangement mixer -> stereo mix
         -> optional, licensed AI texture/repaint adapter -> audio QC
         -> mastering -> final WAV/FLAC + feature timeline + manifest
```

The symbolic composer remains the source of truth. A text-to-music model must not replace the note-level score by default. The model may generate audition candidates, subtle textures, or repaint a limited region, subject to rights and quality checks. Keep an adapter so the model can be replaced without changing the rest of the system.

## 2. Modules

- `planner`: mood/profile choice, section form, instrumentation, motifs, grammar.
- `composer`: note events and score transformations, deterministic seed.
- `theory_validator`: scale, range, phrase, voice-leading, rhythm and density checks.
- `midi_exporter`: separate MIDI tracks with instrument mapping and controller events.
- `synth_renderer`: FluidSynth prototype; higher-grade licensed sample instruments for release.
- `expression_engine`: phrase timing, velocity, vibrato, breath, release and dynamics.
- `mixer`: gain staging, equalization, space, panning, compression only when needed.
- `ai_adapter`: ACE-Step or another cleared provider behind provider interface.
- `master`: two-pass loudness inspection and true-peak checking.
- `audio_analyzer`: beat positions, sectional RMS, spectral bands, onset intensity, audio fingerprints.
- `auditor`: rights and quality reports, model and sound-library lineage.

## 3. Model choice and rights controls

| Candidate | Useful for | Restriction or review |
|---|---|---|
| Deterministic score + licensed samples | Core production, instrumental realism | Check rights for every SoundFont/sample/instrument library |
| ACE-Step 1.5 | Optional full-track audition or repaint | Official model card lists MIT and claims commercial use; record model revision and still check outputs and dependencies |
| Meta MusicGen / AudioCraft | Noncommercial experiments | Repository code is MIT but official weights use CC-BY-NC 4.0; **do not place model-weight-based outputs in a monetized pipeline without appropriate rights** |
| Stable Audio Open 1.0 | Sound design prototypes | Stability Community License and commercial conditions require separate review |
| Paid music API | Optional alternate generator | Obtain written rights for generated audio, channel monetization, reuse, and platform distribution |

Any model provider must record its model version, input prompt, seed, input reference permissions, output rights record, and generator time. Avoid prompting for the sound of a named contemporary musician. Avoid copyrighted reference tracks.

## 4. Source separation and audio repair

If a model returns only stereo audio, the editor cannot reliably repair individual notes. Prefer score-rendered stems for release. Use stem separation only as a repair assistant; do not mistake separated audio for a clean multitrack source. Retain the original model output, any stems, and the separation model version.

Detect dead air, clipping, hum, harsh transients, spectral discontinuities, phase cancellation, unnatural repetition, and unexpectedly synthesized voices. Automatic silence detection must exempt intentional score-defined pauses.

## 5. Mix and master

Use 48 kHz, 24-bit WAV internally where supported. Mix at high precision. Keep final WAV and FLAC before YouTube encoding. Write a named master profile (`soothing_youtube_v1`). Its provisional values are: integrated target around -16 LUFS for the video mix; maximum true peak around -1 dBTP; conservative dynamics; limited compression. **These are project defaults, not a universal YouTube mandate.** Validate them against playback experience. Loudness normalization must not destroy the dynamic range of soft music.

Music should remain soothing at low listening volume. Check earbuds, headphones, laptop speakers, and a basic mono fold-down. Check low-volume flute audibility. Prevent reverb tails from being cut at section boundaries.

## 6. Audio-reactive features

Compute a timeline per track. The visual engine reads values by timestamp. Use smoothed arrays rather than live microphone FFT during offline export.

| Feature | Sample representation | Drives |
|---|---|---|
| `rms` | normalized 0–1 | brightness, glow, camera micro-drift |
| `low` | normalized low-band energy | scale breathing and slow deformation |
| `mid` | normalized mid-band energy | ribbons and melody-linked objects |
| `high` | normalized high-band energy | dust, details, sparkle limits |
| `onset` | event/strength | small pulse on note attacks |
| `beat_phase` | cyclic 0–1 | seamless coordinated motion |
| `section` | named ID | scene and palette changes |
| `melody_register` | normalized 0–1 | height or camera lift |
| `silence` | boolean | reduce motion and brightness |

Precompute offline with `librosa` or another pinned analyzer. Apply attack/release smoothing. Restrict bass-driven scale changes to small bounds. Never flash the whole screen for individual transients. An audio analyzer must store its settings and version.

## 7. Originality and model-output safeguards

The system must compare new audio with its own full catalog. It should flag both exact repeats and close melodic relatives. The system cannot guarantee that a new model output does not resemble a third-party recording. Add a manual review workflow and a takedown-response path. Save musical scores and human edits as evidence of production decisions.

## 8. Example quality report

```json
{
  "track_id": "trk_20261021_001",
  "status": "needs_review",
  "audio": {"duration_s": 326.5, "integrated_lufs": -16.4, "true_peak_dbtp": -1.4},
  "composition": {"range_errors": 0, "phrase_endings": 7, "manual_score": null},
  "similarity": {"nearest_track": "trk_20261018_014", "confidence": "review"},
  "rights": {"score": "original", "soundfont": "license_recorded", "model": "not_used"},
  "blockers": ["similarity_review_required"]
}
```

A quality classifier supports review; it never substitutes for artistic judgement until validated on a labeled set.
