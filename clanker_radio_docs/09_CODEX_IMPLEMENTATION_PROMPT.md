# Codex Handoff — Build Instructions

## Task

Build the Clanker Radio project described in this documentation. Read **all** Markdown documents and JSON schemas before making implementation choices. Use the user's `controlled-technical-english` skill from `https://github.com/Prathmesh333/controlled-technical-english-writing-skill` for code documentation, plans, comments, error messages, and repository guides. Preserve exact variable names, units, conditions, and required actions. Do not pretend the user supplied a license or an asset that is missing.

## Mandatory implementation order

1. Create the monorepo with Next.js frontend, FastAPI backend, contracts, PostgreSQL, Redis queue, object storage adapter, tests, and container development scripts.
2. Implement typed MusicBlueprint and score models; provide a deterministic Western tonal profile and `indian_ambient_fusion_v0` without a false raga claim.
3. Implement phrase-based melody generation, constrained harmonic support, per-instrument technique rules, event validation, MIDI export, and performance expression.
4. Add an instrument sound adapter. Use license-cleared prototype sounds only; require asset-license records before publication.
5. Add per-stem export, rough mix, mastering controls, audio analysis, and a quality report.
6. Build one complete Three.js scene with a deterministic render function and offline audio-reactive feature playback.
7. Build Studio UI: brief, score/piano-roll inspection, transport, preview, scene editor, timeline, QA panel.
8. Add the visual registry and 50 individually selectable and testable presets. Keep each scene within its parameter constraints.
9. Add program assembly, transitions, segmented video export, retries, manifests and resume logic.
10. Add originality/similarity detection and human review.
11. Add YouTube staging adapter with OAuth, metadata, resumable upload, AI disclosure, idempotency, and release approval.
12. Add scheduling and dashboards only after single-track and 60-minute exports pass.

## Agent behavior

- Work in small, testable changes. Run lint, type checks, unit tests, and at least one render fixture after each major phase.
- Do not replace a failed audio or video library silently. Record the failure and choose a documented fallback.
- Do not use unlicensed samples. Do not place Meta MusicGen CC-BY-NC weights in the monetized pipeline.
- Do not generate all note pitches or scene choices by unconstrained random sampling.
- Keep every random choice seeded and every tool version recorded.
- Do not call an audio sample "bansuri" unless its instrument patch and permission data support the label.
- Create a demo that can run without a GPU using a lightweight synth and one WebGL scene.
- Provide an example `docker compose up` workflow and seed data with rights-safe placeholder assets.
- Do not enable live YouTube publication by default.

## Minimum working demonstration

The operator opens the Studio, selects `bansuri_dawn`, hears a musically coherent 3–5-minute flute/harmonium composition, sees the note/section plan, watches one reactive 3D scene, exports an MP4, and inspects a QA report with exact blockers. The scene preview and MP4 must match within an accepted rendering tolerance. The final file must contain no rights-unknown sound asset.

## Definition of done

A phase is complete only when the behavior works, tests pass, the output file opens, the constraints are honored, and the README explains how to reproduce it. If a feature remains simulated, mark it `NOT IMPLEMENTED`. Keep a changelog of decisions and unresolved issues. Do not claim five hours of production capability from a successful five-minute demo.

## User-facing runbook after implementation

Provide exact commands to install dependencies, configure allowed sound assets, start the app, generate one track, preview a scene, export video, run tests, launch a staged YouTube upload, and inspect logs. Print a clear error if the machine cannot support the selected render backend.
