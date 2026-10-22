# Engineering Roadmap, Test Plan, and Release Gates

## 1. Delivery phases

| Phase | Deliverable | Exit condition |
|---|---|---|
| 0 — Setup | Monorepo, typed contracts, Docker, queue, object store, tests | One-click local stack and CI pass |
| 1 — Music MVP | Six composition profiles, MIDI export, stems, preview and composer controls | Ten musically valid 3–5-minute tracks reviewed by a human |
| 2 — Visual core | 10 high-quality scenes, audio feature timeline, scene editor and deterministic exports | Stable 1080p30 sample renders without frame-dependent drift |
| 3 — Visual library | All 50 presets, preview cards, parameter validation, performance tiers | All 50 pass screenshot/golden and performance tests |
| 4 — Production | Program scheduler, similarity checks, segmented rendering, final QA | One approved 30–60-minute video, then a 2-hour trial |
| 5 — YouTube | Metadata, chapters, resumable upload, private staging | Operator can stage and publish one approved program with no duplicate upload |
| 6 — Scale | Daily 4–5-hour target, monitoring, budget limits, long-term catalog | Multiple weeks of clean runs with human listening and no unresolved rights claims |

Phase durations depend on the hardware, asset licenses, and artistic review time. Do not treat this table as a schedule guarantee.

## 2. Test pyramid

**Unit:** scale validation, motif transformations, cadence placement, note range, MIDI note overlap, seed repeatability, program-duration arithmetic, scene parameter limits, feature interpolation, chapter timestamps, state transitions.

**Integration:** blueprint → MIDI → stems → mix; audio features → scene uniforms → frames; segments → MP4; rights records → publishing blocker; OAuth upload retry → single video.

**Golden:** compare fixed-seed MIDI event lists and representative rendered frame captures. Use perceptual image differences within a documented GPU/backend tolerance. A new renderer version requires golden image reapproval.

**Audio regression:** analyze integrated loudness, true peak, silence, spectral centroid trends, unintended transients, clicks at transitions, and fingerprint similarity. Add short human listening tasks for melodic coherence and instrument realism.

**Visual regression:** freeze ten timestamps per preset, including a section transition and onset peak. Check black frames, clipping, numerical errors, texture load, flicker-risk metric, depth sorting, memory leaks, and frame budget.

**End-to-end:** render 2, 15, 60, 240, and 300-minute programs. Simulate worker crashes and upload interruption. Verify resumed render and exact final audio/video alignment.

## 3. Test fixtures

Create and keep five composition fixtures: (1) flute + drone in a stable tonal center; (2) harmonium and piano with a cadence; (3) slow 6/8 string piece; (4) raga-inspired drone with pitch bends; (5) unusually sparse ambient form. Each fixture has immutable blueprint JSON, MIDI, feature arrays, accepted master, and review notes.

Create and keep ten visual fixtures spanning GPU load tiers, translucent surfaces, fog, custom shaders, instancing, and post-processing. Render in both preview and headless mode.

## 4. Acceptance scores

Human panel rates: **melodic coherence, instrument authenticity, harmonic appropriateness, emotional consistency, non-repetition, and overall listening quality** on a 1–5 scale. Begin with two listeners when possible. Use results to calibrate automated warnings. For launch, adopt a provisional release threshold of an average score of at least 4/5 and no severe category failure. Treat the threshold as a project policy to validate, not scientific proof of musical quality.

Require zero blocking rights issues, zero corrupt segments, zero unapproved duplicates, and no obvious clipping or unintended vocal content. An automated model score cannot override a known human rejection.

## 5. Pilot acceptance checklist

- [ ] A musician can inspect and edit the generated notes.
- [ ] A 5-minute flute/harmonium track has phrases, rests, and a controlled final resolution.
- [ ] Each sound asset has a rights record and is valid for the intended publishing use.
- [ ] The visual preview uses actual audio features and matches offline export timing.
- [ ] A single scene can render at 1080p30 with a fixed seed and section transitions.
- [ ] All 50 scenes have stable names, parameter schema, preview and performance tier.
- [ ] Audio- and note-level similarity checks detect planted duplicates.
- [ ] A 60-minute test render resumes correctly after intentional interruption.
- [ ] A 4-hour test exports valid chapters, stereo audio and constant-frame-rate video.
- [ ] The platform upload operation has idempotent retries and user approval.
- [ ] The daily scheduler can decide not to publish when quality is insufficient.

## 6. Priority risks

| Risk | Severity | Mitigation |
|---|---|---|
| Music sounds synthetic or incoherent | High | Score-first composition; licensed instruments; human A/B listening |
| Sound libraries cannot be monetized | Critical | Asset ledger and publishing rights gate |
| Track repetition accumulates | High | Symbolic and perceptual catalog comparison; editorial diversity |
| 5-hour render is too costly | High | Chunking, instancing, renderer profiling, cached background layers |
| GPU/WebGPU compatibility | High | Pinned WebGL baseline; alternate render path; feature flags |
| Published content is viewed as generic mass production | High | Distinct composition, authored choreography, transparent credits, editorial review |
| Upload duplicates or partial files | Medium | Resumable upload; checksum; idempotency; staged privacy |
| AI disclosure is incorrect | High | Read official current guidance and store per-publication decision |

## 7. Implementation priority

Do **not** start by creating 50 complex scenes. First create the composition planner, one convincing instrument-led 5-minute track, one beautiful reactive scene, and a reliable 1080p export. Expand to 10 scenes, then 50. A weak music engine with attractive visuals does not satisfy the product goal.
