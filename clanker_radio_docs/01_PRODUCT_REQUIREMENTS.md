# Product Requirements and Editorial Rules

## 1. Audience and channels

The first audience wants music for quiet work, reading, late evenings, relaxation, meditation-like ambience, and soft visual immersion. The studio operator needs full creative control without editing every note or keyframe. The YouTube viewer needs distinctive music, tasteful visuals, a track list, and consistent sound level.

Build for two workflows: (1) **Studio mode**, in which a human directs and approves one piece; and (2) **Radio mode**, in which the scheduler proposes a coherent long-form program from approved or newly generated compositions.

## 2. Product requirements

| ID | Requirement | Acceptance condition |
|---|---|---|
| PR-01 | Create music from a constrained composition plan | Each track stores meter, tempo map, scale/raga profile, form, melody, accompaniment, rests, and key stems |
| PR-02 | Support 6 primary moods | Calm, dawn, rain, night, forest, deep focus; each maps to an explicit musical and visual profile |
| PR-03 | Support at least 8 sound families | Bansuri/flute, harmonium, piano, strings, tanpura, pads, soft plucked strings, soft percussion |
| PR-04 | Provide score and arrangement editors | User can inspect and regenerate one phrase or stem without regenerating the whole piece |
| PR-05 | Provide 50 cataloged animation presets | Every preset has a manifest, parameter constraints, preview and automated performance test |
| PR-06 | Link visuals to music | Scenes react to audio RMS, low/mid/high band energy, onsets, section boundaries, and a curated motion plan |
| PR-07 | Render stable 16:9 video | Initial target: 1920×1080, 30 fps, H.264/AAC MP4; optional 4K later |
| PR-08 | Generate long-form programs | Operator chooses 240–300 min target, mood continuity, and allowable transition range |
| PR-09 | Detect repeats | Compare compositions against the full published catalog with exact, symbolic, audio, and arrangement checks |
| PR-10 | Stage publication safely | Upload only after rights, audio, render, originality, and review gates pass |
| PR-11 | Explain all decisions | Save reasons for selection, rejection, and regeneration; preserve reproducible seeds |
| PR-12 | Recover production jobs | Jobs resume after crashes; no duplicate upload or duplicate published track |

## 3. Non-functional targets

- **Audio:** 48 kHz stereo working format; retain WAV stems until approval. Accept lossless FLAC archives. Set the mastered distribution loudness policy in one configuration file; do not assume one service-wide requirement.
- **Video:** Test 1080p30 as the first supported output. Use 10–30 second segments for retryable rendering. Use constant-frame-rate output.
- **Responsiveness:** Studio preview should target 30 or 60 fps on the reference machine. Degrade particle counts and post-processing when frame time increases. Capture actual performance before setting limits.
- **Determinism:** Same renderer version, scene, seed, timeline, and feature arrays must produce matching frames within GPU variance; test in a pinned environment.
- **Data durability:** Store immutable published track manifests. Do not overwrite a published mix or original score.
- **Security:** Keep API credentials in server-side secrets. Never send YouTube OAuth refresh tokens or storage keys to the browser.
- **Accessibility:** Keyboard control, labeled inputs, reduced-motion mode, safe brightness transitions, readable contrast, nonflashing presets.

## 4. Distinctiveness policy

The scheduler must not treat a new random seed as proof of a new composition. It must compare phrase signatures, interval sequences, rhythm contours, chord functions, tonal center, arrangement, and rendered audio. Near-duplicate detection triggers a rejection or a review. Strong formal variation matters more than merely changing instrumentation.

Composition diversity has five controlled axes: musical grammar, motif contour, harmonic or raga movement, arrangement, and phrasing. Visual diversity has five axes: family, palette, camera behavior, geometry parameters, and section choreography. Vary all axes across a program, but preserve coherent identity within a piece.

## 5. Editorial quality policy

Never fill time with low-quality tracks. Do not conceal glitches with visual effects. Require a distinct opening motif, development, contrast, and resolution unless an explicitly authorized drone/ambient profile omits one. Protect melodic identity by repeating motifs with musical transformations, not by endlessly looping the same four bars.

Instrument mixes must leave headroom for solo melodies. Keep percussion subordinate. Avoid harsh attacks, synthetic chirps, random arpeggios, excessive reverb wash, loud mastering, and unrelated genre shifts.

## 6. Radio programming

- A **track** is a 3–9 minute musical composition by default; longer pieces need an approved ambient-form profile.
- A **program** is a sequenced set of approved tracks, with transitions, chapters, a primary visual identity, and total target duration.
- A **scene** is one visual preset instance with a fixed start, end, seed, camera path, and parameter set.
- A **transition** is a measured overlap between two tracks or scenes. Prefer musically appropriate boundary points.
- A **publication** is the platform-facing video and associated metadata. Publishing the same track twice needs an explicit editorial reason and a metadata flag.

## 7. No-go conditions

Stop publication when any of these conditions is true: missing rights record; failed loudness or clipping test; unintended speech or melody borrowing; unresolved duplicate warning; broken video segment; 0-byte file; mismatched audio/video duration; invalid chapters; missing AI-use declaration where required; missing review decision; upload failure.

## 8. Deferred scope

Defer live streaming, user accounts, marketplace distribution, mobile apps, music-model fine-tuning, 4K60 exports, full DAW features, and automatic public uploads until the core pipeline passes the acceptance tests. A YouTube live stream is a separate service from a recorded multi-hour upload.
