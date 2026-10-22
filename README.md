# Clanker Radio

A local music player that generates instrumental performances, runs Codex composer competitions, and turns music into audio-reactive visuals. Built for listening, streaming, and screen recording.

## What it does

- Generates 24-voice scores with EDM, house, techno, trance, drum and bass, hip hop, synthwave, and rock profiles.
- Uses real Codex CLI calls for two competing composers, three rounds of peer criticism and revision, and an independent judge.
- Keeps favorites and approved winners in a playlist, with symbolic duplicate detection and JSON downloads.
- Defaults to real **Butterchurn / MilkDrop**, with 367 unique presets. Includes Three.js scenes, kinetic lyrics, and a Randomizer that changes effects every 28 seconds.
- Offers display-sharp, UHD, and performance rendering without cropping the frame. Playback controls hide when idle.
- Plays supported music links through provider embeds, looks up lyrics automatically, and connects their audio to the visuals.

Generated music uses procedural synthesis. Codex critics assess score plans rather than listening to audio. External playback, lyric availability, and playlist clocks depend on the provider. See the [playback guide](docs/playback.md) for details.

## Quick start

Use **Python 3.13**, **Node.js 22**, and a browser with WebGL 2. Windows is the verified native setup; automatic computer-output capture uses Windows WASAPI.

```powershell
git clone https://github.com/Prathmesh333/ClankerRadio.git
cd ClankerRadio
python -m venv .venv
.venv/Scripts/python -m pip install -r requirements.lock
.venv/Scripts/python -m pip install --no-deps -e .
npm ci
./scripts/dev.ps1
```

Open [localhost:3000](http://localhost:3000) and press **Play**. The app creates a mix if no kept track exists. **Effects** selects the visual engine and resolution; the gear opens sound settings. **Playlist**, **Link**, and the sparkle button open the other controls.

For composer competitions, install the [Codex CLI](https://developers.openai.com/codex/cli/) and run `codex login` first. Local composition and visuals work without Codex. Competitions require your Codex service and network access.

The API runs at [localhost:8000](http://localhost:8000), with interactive documentation at [/docs](http://localhost:8000/docs). Both services bind to localhost. No environment file is needed for the default local setup.

## Documentation

| Guide | Contents |
| --- | --- |
| [Documentation index](docs/README.md) | Current guides and original specifications |
| [Playback and recording](docs/playback.md) | Music, effects, links, lyrics, Codex, and endless radio |
| [Development](docs/development.md) | Setup, configuration, tests, troubleshooting, and containers |
| [Architecture](docs/architecture.md) | Services, data flow, score storage, and implementation limits |
| [Original specification](clanker_radio_docs/README.md) | Historical brief and larger production roadmap |
| [Changelog](CHANGELOG.md) | Implementation history |
| [Third-party notices](THIRD_PARTY_NOTICES.md) | Dependencies, licenses, and research references |

## Project layout

```text
apps/web/                 Next.js player, Web Audio synthesis, and visualizers
apps/api/clanker_api/     FastAPI, Codex tournaments, lyrics, and local audio capture
packages/                Music engine, audio analysis, and JSON contracts
docs/                    Current usage and developer guides
clanker_radio_docs/       Original specification, research, and starter schemas
config/                  Default configuration
scripts/                 Local launcher and offline fixture renderer
tests/                   Backend, browser, and JavaScript checks
infra/                   Optional container setup
```

Generated scores, tournament histories, and SQLite metadata live in `.data/`. This directory, local credentials, dependencies, and test artifacts are excluded from Git. A fresh clone starts with an empty library.
