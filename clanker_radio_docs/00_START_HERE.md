# CLANKER RADIO — AI Music + Generative Visual Studio

> Historical specification: use the [current documentation](../docs/README.md) for implemented behavior. Features below may describe future work.

**Status:** Implementation specification, version 1.0  
**Date:** 21 October 2026  
**Working name:** Clanker Radio. Confirm channel name and trademark availability before launch.  
**Document style:** Controlled Technical English; based on the user's GitHub skill.  
**Project owner:** Single developer initially.  
**Primary goal:** Produce distinctive, soothing instrumental music and coordinated 3D visual films. Prepare 4–5 hours of publishable YouTube video per day after the quality gates are stable.

## Product definition

The product is a browser-based creative studio and a background production pipeline. A user defines a musical direction. The system creates a written music plan, composes original note events, renders instrument tracks, optionally refines the audio with a licensed generative model, selects visual scenes, renders the scenes, assembles a long-form program, and prepares a YouTube upload. A reviewer approves the final program before publication. Fully automatic publishing can be enabled only after measurable quality and rights gates pass.

The system must generate musical phrases, not random MIDI notes. The score controls harmony, rhythm, phrase endings, instrument technique, and arrangement. Each published piece must be distinct from earlier published pieces. The visual planner must select compatible scenes from a library of **50 original animation presets**. It must vary each scene by parameters, not by random cut order alone.

## Recommended initial product decisions

| Area | Selected direction | Reason |
|---|---|---|
| Music construction | Score-first, model-assisted | Notes and musical form remain inspectable and controllable |
| Core sound | Bansuri/flute, harmonium, warm piano, soft strings, tanpura, gentle pads | Calm, organic timbres with deliberate acoustic space |
| Composition | Separate Western tonal and Hindustani-inspired grammar profiles | Do not impose Western chord rules on a raga-oriented piece |
| Audio engine | Python MIDI + commercial-cleared instruments/SoundFonts + DAW-quality effects | Reliable stems, note-level edits, repeatable render |
| Optional AI engine | Adapter for ACE-Step 1.5, disabled until rights and quality checks pass | Current open model candidate, not a guarantee |
| 3D engine | Three.js, React Three Fiber, shaders, WebGL 2 production baseline | Interactive preview and deterministic offline capture |
| WebGPU | Experimental preview behind capability flag | Three.js still documents experimental constraints |
| Render | Deterministic frame capture or Remotion ThreeCanvas, then FFmpeg | Same result across preview and export |
| Publishing | Private/unlisted staging and human approval initially | Prevent weak music, repeats, rights mistakes, or render failures |
| Daily target | 240–300 minutes of approved **new** video | Operating target, not an unconditional requirement |

## System boundaries

- The product does **not** copy melodies from commercial tracks or imitate an identifiable living artist by name.
- The product does **not** guarantee that AI-generated audio is indistinguishable from human performance. Listening tests decide whether audio is acceptable.
- The product does **not** assume that a model's source-code license also grants use of its weights, training data, sounds, or generated output.
- The product does **not** upload an unreviewed 5-hour file only to meet a daily quota.
- Each generator must accept a fixed seed and record the version of every tool, preset, model, and audio asset.

## Delivery definition

A successful daily run produces a program manifest, a music-set report, review-ready video files, stems and MIDI archives, quality reports, rights records, a thumbnail, a chapter list, upload metadata, and the upload status. The scheduler must stop the publication step if any blocking check fails.

## Reading order

1. `01_PRODUCT_REQUIREMENTS.md` — what the product must do.
2. `02_MUSIC_COMPOSITION_GUIDEBOOK.md` — how the notes and arrangements must work.
3. `03_AUDIO_ENGINE.md` — rendering, AI refinement, mastering, evaluation.
4. `04_VISUAL_SYSTEM_AND_50_PRESETS.md` — visual grammar and the full animation catalog.
5. `05_UI_UX_SPEC.md` — interface and detailed user journeys.
6. `06_TECH_ARCHITECTURE_AND_DATA.md` — services, APIs, manifests, database, storage.
7. `07_AUTOMATION_YOUTUBE_OPERATIONS.md` — production, publishing, monitoring, rights.
8. `08_TESTS_ROADMAP_AND_ACCEPTANCE.md` — implementation order, tests, release gates.
9. `09_CODEX_IMPLEMENTATION_PROMPT.md` — direct handoff to a coding agent.
10. `10_RESEARCH_SOURCES_LICENSES.md` — source links and model/license restrictions.

**Reference implementation:** `config/defaults.yaml` and `schemas/*.schema.json` define starter settings and inter-service contracts. They are project defaults. Validate these values with musicians and actual test renders.
