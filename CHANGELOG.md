# Changes

## Unreleased � 24 October 2026

- Add a Windows Electron app with bundled Next.js and Python runtimes, an installer, and an unpacked executable.
- Manage local service startup/shutdown, per-launch API tokens, and a persistent desktop library.
- Add desktop build commands, a Windows packaging workflow, and a packaged-app smoke test.

## Unreleased — 22 October 2026

- Make real Butterchurn the initial visual engine, including before playback and with reduced motion.
- Fix canvas-buffer and viewport sizing; add display-sharp, UHD, and performance quality settings.
- Add a shared Effects menu, all-engine Randomizer, GPU frame gating, and polished auto-hiding controls.
- Add automatic LRCLIB lyrics, provider playlist clocks, Windows loopback capture, and Windows media-session metadata.
- Expand MilkDrop to 367 unique presets and Three.js scenes to luminous surfaces, fractal backgrounds, particles, and bloom.
- Add energetic genre profiles and stronger percussion/arrangement for local composition.
- Consolidate current usage and development guides under `docs/`; preserve the original specification separately.

## 0.3.0 — Classic player and kept playlist

- Replace the default workstation with a compact music player. Show the visualizer, track name, seek bar, previous/play/stop/next controls, volume, and theme selector.
- Move ensemble configuration, playlist, and Codex competition controls into optional native dialog panels.
- Replace the sculptural scenes with classic-style WebGL visualizer themes: Alchemy, Silk waves, Kaleidoscope, and Infinity tunnel.
- Add seeking, previous/next playback, favorites, and playlist removal. Full-screen mode shows visuals alone.
- Inspect the original 17-file archive: 15 unique musical plans and one judge-approved winner. Show only approved winners and user favorites in the kept playlist. Preserve original files for recovery.
- Compare symbolic musical content instead of seed or title to collapse duplicate plans. Rank favorites first, then judge score. Remove the eight-row playlist limit.
- Prevent equal-or-worse duplicate plans from producing additional saved performance files. Expand local motif and rhythm variation.
- Keep Codex provenance in a separate immutable revision when it promotes a previously generated local plan.
- Verify 55 backend tests, compact-player browser checks, real audio output, theme animation, seek/stop, optional panels, full-screen mode, radio handoff, and narrow-screen layout.

## 0.2.0 — Live ensemble and Codex arena

- Change the main workflow to local live performance and screen recording, as requested.
- Add 24 independently synthesized instrument patches with bounded registers, individual spectra, expression, and panning.
- Add a six-section ensemble composer, rotating musical roles, phrase rests, harmonic support, and tonic resolution.
- Add browser Web Audio playback with scheduling, per-voice mute, volume, reverberation, delay, compression, pause/resume, and audio analysis.
- Replace the static preview with four animated Three.js scenes: Nebula bloom, Liquid aurora, Prism orchestra, and Solar cathedral.
- Add particles, luminous ribbons, bloom, bounded audio response, motion/intensity controls, and full-screen recording view.
- Connect to the installed Codex CLI through its existing login. Use structured, isolated, read-only calls rather than simulated agent responses.
- Add two competing composers, reciprocal criticism, three revision rounds per composer, and one independent judge. Each tournament makes 15 calls and archives every round.
- Admit approved winners to the performance archive. Keep rejected and failed competitions out of the playing library.
- Add a bounded background score buffer and automatic playback advance. Label local continuity compositions and Codex winners separately.
- Preserve performance JSON files, seeds, orchestration, and tournament histories locally. Keep previous blueprint and offline-audio APIs available.
- Verify one real 15-call Codex competition: both composers completed three rounds; the judge selected B at 78/100. Its 24-voice performance is saved as `perf_8f2b9e321e97fcaa7e79a05c`.
- Verify live output is nonzero, all four scenes animate, recording view fills the viewport, and the real radio queue advances. The browser handoff fixture shortens playback metadata to avoid waiting a full track.
- React Doctor: 90/100; two remaining maintainability warnings concern the Studio component's size and control-flow complexity. No diagnostic rules were suppressed.

Current limits: timbres are procedural rather than sampled acoustic instruments; agent reviews assess symbolic plans rather than audio; no catalog-wide originality guarantee; generation stops with the API; interrupted competitions do not resume automatically. The local native stack is verified. Container service integrations remain unverified.

## 0.1.0 — 21 October 2026

- Read the complete supplied specification pack and its two JSON schemas.
- Add a Next.js Studio and FastAPI composition service.
- Add two seeded prototype profiles, complete phrase boundaries, score validation, and MIDI export.
- Add original additive synthesis, separate WAV stems, basic RMS analysis, and artifact manifests.
- Add persistent compositions and idempotent render jobs.
- Add local development storage and an optional S3 adapter.
- Add PostgreSQL, Redis/RQ, shared artifact storage, and web containers in Docker Compose.
- Add contract, composition, storage, authorization, and audio integration tests.

## Decisions and unresolved work

- Keep the supplied specification in `clanker_radio_docs/`. Treat that directory as the source documentation.
- Use SQLite and an in-process background task only for local development. The container configuration uses PostgreSQL and Redis/RQ.
- Use original oscillator sounds for the prototype because no licensed acoustic assets were supplied. Keep all publication gates closed.
- Store a provenance record for the oscillator implementation. The record does not claim completed commercial rights review.
- Use the supplied UI specification as the design reference: charcoal surfaces, muted dawn accent, brief on the left, preview in the center, review on the right.
- Display a labeled static visual study until the Three.js renderer is implemented.
- Quantize track duration to four-bar phrases and six complete sections. Short requests have a minimum of 24 bars. Display the actual score duration.
- Local background tasks do not recover after process termination. Durable attempt history, migrations, recovery, and queue dispatch reconciliation remain NOT IMPLEMENTED.
- S3 and Docker adapters require service integration checks. Docker is unavailable on the initial development machine.
- Additional profiles, acoustic sound adapters, score editing, calibrated mastering, similarity checks, 3D scenes, MP4 export, and YouTube staging remain NOT IMPLEMENTED.
- React Doctor full scan: 77/100, with warnings for Studio component complexity and effect-based job polling. Polling has cancellation cleanup and runs only while a job is queued or running. Split the Studio into smaller components and add a query cache when expanding the editor. A changed-file baseline is unavailable because this workspace has no Git repository.
