# Technical Architecture, Data Contracts, and Storage

## 1. Architecture overview

```
Next.js Studio ───────────────────────────┐
  | REST/WebSocket                         |
  v                                        v
FastAPI gateway ─── PostgreSQL       Asset store (S3-compatible)
  |             (metadata and jobs)        score, MIDI, WAV, FLAC,
  v                                        audio features, previews,
Redis/queue ─────────────────────────────> MP4, manifests, thumbnails
  |                                          ^
  ├── Planner/Composer Worker ──────────────┤
  ├── Sample/Mix Worker ────────────────────┤
  ├── Optional Model Worker (GPU) ──────────┤
  ├── Audio Analysis/QA Worker ─────────────┤
  ├── Visual Planner ───────────────┐       |
  ├── GPU/Chromium Render Worker ──┴───────┤
  ├── Assembly/FFmpeg Worker ───────────────┤
  └── YouTube Publish Worker (OAuth) ───────┘
```

Choose a simple single-host queue and PostgreSQL for MVP. Separate GPU rendering from upload services when daily volume grows. Keep the composition generator, score validator, audio renderer, visual renderer, and publish adapter as independently testable modules.

## 2. Monorepo layout

```
clanker-radio/
  apps/web/                 # Studio, Radio, Scenes, review panels
  apps/api/                 # FastAPI, auth, manifests and orchestration
  packages/music-core/     # theory, score, motif, performance, MIDI
  packages/audio-analysis/ # stems, loudness, features, fingerprints
  packages/visual-core/    # 3D renderer, contracts, 50 presets
  packages/render-core/    # deterministic frames + FFmpeg assembly
  packages/contracts/      # shared JSON schemas and TypeScript types
  workers/composer/
  workers/audio/
  workers/model/
  workers/visual/
  workers/publisher/
  docs/                     # copy this documentation folder here
  assets/licenses/          # rights manifest (no secrets)
  tests/unit/ tests/integration/ tests/golden/
  infra/docker-compose.yml
  .env.example
```

## 3. Core domain entities

- `Project`: working creative session and global mood.
- `CompositionRevision`: immutable blueprint, score, event timeline, instruments, and seed.
- `Track`: approved audio master and all its revisions.
- `SoundAsset`: instrument samples, SoundFont, recordings, model assets, and licenses.
- `ScenePreset`: source module and validated parameters.
- `SceneInstance`: a preset bound to a time interval, parameter set, seed, and music feature mapping.
- `Program`: sequence of tracks, timings, transitions, and visual sequence.
- `RenderJob`/`SegmentJob`: worker lifecycle, retry count, output checksums, logs.
- `QualityReport`: machine results, human rating, blockers, and review history.
- `Publication`: platform target, metadata, privacy, upload session, video ID, status.

## 4. Database tables

Suggested initial tables: `projects`, `composition_revisions`, `tracks`, `sound_assets`, `licenses`, `scene_presets`, `scene_instances`, `programs`, `program_tracks`, `jobs`, `job_attempts`, `quality_reports`, `reviews`, `publications`, `platform_tokens`, `audio_fingerprints`, `audit_events`.

Use UUID primary keys, indexed foreign keys, and state enums. Store large MIDI, audio, video and analysis blobs outside PostgreSQL. Store object URIs and checksums in the database. Encrypt platform tokens at rest. Log every state transition.

## 5. Key APIs

| Method | Endpoint | Result |
|---|---|---|
| `POST` | `/api/projects` | Create project and mood brief |
| `POST` | `/api/compositions/plan` | Validate brief and return Musical Blueprint |
| `POST` | `/api/compositions/{id}/render` | Queue MIDI and stems |
| `POST` | `/api/compositions/{id}/regenerate-phrase` | New immutable revision |
| `GET` | `/api/tracks/{id}/quality` | Quality report and blockers |
| `GET` | `/api/scenes` | Filterable catalog of all presets |
| `POST` | `/api/scenes/{id}/preview` | Deterministic preview job |
| `POST` | `/api/programs/plan` | Proposed track order, scenes, expected duration |
| `POST` | `/api/programs/{id}/render` | Queue segmented video render |
| `POST` | `/api/programs/{id}/review` | Reviewer decision with explanation |
| `POST` | `/api/programs/{id}/publish` | Staged upload with idempotency key |
| `GET` | `/api/jobs/{id}` | Progress, logs, error classification |

Every mutating endpoint must validate its request, authorize the actor, and accept an idempotency key when duplicates would be harmful. The server must reject invalid state transitions.

## 6. Job state machine

`DRAFT -> PLANNED -> COMPOSED -> AUDIO_RENDERED -> AUDIO_APPROVED -> VISUAL_PLANNED -> VIDEO_RENDERED -> VIDEO_APPROVED -> STAGED -> PUBLISHED`

Any state may branch to `FAILED`, `REJECTED`, or `NEEDS_REVIEW` when permitted. The system must not skip required review states. A retry creates a new job attempt, not a new publication. Bind every job to explicit asset revision IDs.

## 7. Deterministic visual rendering

For frame index `n` and FPS `f`, derive `timeSeconds = n / f`. Calculate scene animation from `timeSeconds`, a scene seed, camera curve, and interpolated audio features. Do not integrate position using wall-clock `deltaTime` during export. Do not use unseeded `Math.random()` inside a render frame.

Keep a `reset()` and `evaluate(timeSeconds, features, params, seed)` contract per scene. For procedural noise, use seed-stable noise fields. Create geometry and materials once per segment. Dispose scene resources after capture. Fix pixel ratio, resolution, browser version, GPU backend, color space, and post-processing options in the rendering manifest.

Use Three.js WebGLRenderer for the first stable render pipeline; evaluate WebGPURenderer/TSL behind a feature flag. `WebGPURenderer` has a different post-processing system and does not support legacy shader paths without changes. Remotion's `ThreeCanvas` is a candidate for frame-controlled React Three Fiber rendering. Benchmark it against a custom headless Chromium capture pipeline.

## 8. Segment render plan

A 4-hour video at 30 fps contains **432,000 frames**. A 5-hour video contains **540,000 frames**. The render farm must process these frames as restartable segments. Do not hold every raw frame in memory. Use 10–30 second chunks at first and store segment hashes. Stitch video with compatible codec settings and verify audio alignment. Prefer pre-rendered loop elements with per-track dynamic overlays where this reduces cost without making the output visually repetitive.

## 9. Failures and recovery

Record `failure_class`, `message`, `attempt_count`, `artifact_checksum`, `worker_version`, and `last_checkpoint`. Retry transient storage/driver errors with backoff. Do not retry irrecoverable schema/license errors automatically. Resume an interrupted export from the first missing or corrupted segment.
