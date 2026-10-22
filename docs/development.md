# Development

[Documentation index](README.md)

## Start services

Follow the [quick start](../README.md) to install Python and JavaScript dependencies. The PowerShell launcher starts the API and web app, then stops its API child process when the web command exits.

To run them separately, use two terminals from the repository root:

```powershell
.venv/Scripts/python -m uvicorn clanker_api.main:app --host 127.0.0.1 --port 8000
```

```powershell
npm run dev
```

For the web production server:

```powershell
npm run build
npm run start --workspace @clanker/web
```

Keep the API running too. Node.js 22 and Python 3.13 are the verified versions. On macOS/Linux, use `.venv/bin/python` and separate terminals; automatic WASAPI capture is Windows-only.

## Configuration

[.env.example](../.env.example) lists the settings. The API reads process environment variables and does not automatically load `.env`. The web proxy must receive the same `STUDIO_TOKEN` as the API if token protection is enabled. The proxy keeps it server-side. The default setup uses no token and is intended for a trusted local operator.

| Variable | Default / purpose |
| --- | --- |
| `API_URL` | Web proxy's API target; `http://127.0.0.1:8000` |
| `DATABASE_URL` | `sqlite:///.data/clanker.db` |
| `ASSET_ROOT` | `.data/assets` |
| `STUDIO_TOKEN` | Optional shared API/proxy token |
| `QUEUE_BACKEND` | `local`; optional Redis/RQ configuration |
| `STORAGE_BACKEND` | `local`; optional S3 adapter |
| `CODEX_EXECUTABLE` | Installed Codex CLI, or explicit executable path |
| `CODEX_MODEL` | CLI default unless supplied |
| `CODEX_CALL_TIMEOUT` | 240 seconds per call |

Set optional values before starting services:

```powershell
$env:CODEX_CALL_TIMEOUT = '240'
$env:CODEX_EXECUTABLE = 'C:/path/to/codex.exe'
```

Local generated assets, databases, environment files, dependencies, and browser screenshots are ignored by Git. Do not commit Codex login data. Restore a `.data/` backup while services are stopped, retaining the database and asset directory together.

## Verify changes

```powershell
.venv/Scripts/python -m pytest -q
.venv/Scripts/python -m ruff check apps/api packages/music-core packages/audio-analysis tests scripts/render_fixture.py
npm run lint
npm run typecheck
npm run build
node --experimental-strip-types --test tests/*.test.mjs
```

With both services running:

```powershell
.venv/Scripts/python -m playwright install chromium
.venv/Scripts/python tests/browser_performance.py
.venv/Scripts/python tests/browser_picture.py
.venv/Scripts/python tests/browser_external_music.py
.venv/Scripts/python tests/browser_visual_stage.py
```

Browser checks cover live audio, transport, themes, optional panels, radio handoff, UHD buffer/viewport agreement, mobile layout, Randomizer, reduced motion, provider clock adapters, and audio cleanup. Provider events and lyrics use fixtures in those integration tests; they do not prove live provider availability. Screenshots go to `artifacts/browser/`. Radio fixtures avoid real Codex calls.

The [CI workflow](../.github/workflows/ci.yml) runs backend checks and the web build on Ubuntu. Hardware loopback and actual Windows media sessions require a Windows machine.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| No audio | Press Play to unlock browser audio, then check volume, mute, and system output |
| Blank visuals | Enable WebGL 2 / graphics acceleration; try Performance quality or another preset |
| Old UI after an update | Rebuild/restart a production server and refresh the browser |
| Codex disconnected | Run `codex login` and check executable discovery or `CODEX_EXECUTABLE` |
| Link plays but visuals do not react | Check computer-output capture or share the playing tab with audio |
| Lyrics missing or offset | Check track metadata, provider clock availability, and manual LRC/offset controls |
| Port already in use | Stop the existing service before launching another instance |

API failures appear in its terminal and in the app. The API reference is [localhost:8000/docs](http://localhost:8000/docs).

## Optional containers

```powershell
docker compose -f infra/docker-compose.yml up --build
```

This configuration supplies PostgreSQL, Redis/RQ, API, web, and shared asset storage. Container, Redis, PostgreSQL, and S3 integrations have not been verified on the native development machine. The API image does not install Codex or mount its login; use the native stack for the verified Codex workflow. View logs with `docker compose -f infra/docker-compose.yml logs -f api worker`.
