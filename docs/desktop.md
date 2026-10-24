# Windows desktop app

[Documentation index](README.md)

The desktop edition opens the player in a dedicated Electron window. It bundles Chromium, the Next.js production server, and a frozen Python API. End users do not need Node.js, Python, a terminal, or a separately running web server.

## Install or run

The Windows build produces:

- `dist/desktop/Clanker-Radio-Setup-0.5.1.exe`: per-user installer with an optional desktop shortcut.
- `dist/desktop/win-unpacked/Clanker Radio.exe`: runnable app folder. Keep this executable with all adjacent files and the `resources/` directory.

The current build is unsigned. Windows may show an unknown-publisher prompt. Code signing is a separate release step.

The app starts its own services on available loopback ports, separate from the development services on ports 3000 and 8000. Closing the last window stops those services. A second launch focuses the existing window.

## Library and settings

The default library is in `%APPDATA%/Clanker Radio/`, containing `clanker.db`, `assets/`, and `logs/services.log`. Use **Clanker Radio → Open library folder** from the native menu to locate it. Uninstalling preserves this data.

The desktop library starts empty. To migrate the web edition's library, close both editions, back up both folders, then copy `.data/clanker.db` and the contents of `.data/assets/` into the desktop folder's corresponding locations. Do not replace the entire application-data folder: it also contains browser settings. Relaunch the desktop app after copying.

An optional `CLANKER_DESKTOP_DATA` environment variable chooses a separate library/browser-data folder. Codex uses your existing installed CLI and login; it is not bundled and account credentials are never included in the installer. Install Codex and run `codex login` for tournaments. Local score generation works without it.

## Build from source

Build on Windows with Node.js 22 and Python 3.13. Install the normal [development dependencies](development.md), then:

```powershell
.venv/Scripts/python -m pip install -r requirements-desktop.txt
npm run desktop:dist
```

`desktop:dist` builds Next.js standalone output, copies static assets, freezes the API with PyInstaller, and builds the installer with electron-builder. The first build downloads Electron and packaging tools. Build outputs remain ignored by Git.

For development or an unpacked build:

```powershell
npm run desktop:prepare
npm run desktop
# Or build a runnable application directory:
npm run desktop:pack
```

`desktop:prepare` is needed after changing the web app or Python service. Changes to `desktop/main.cjs` only require restarting `npm run desktop` before packaging again.

## Verify the packaged app

After building, run `.venv/Scripts/python tests/desktop_smoke.py`. The test opens the unpacked executable with a separate temporary library under `artifacts/desktop-smoke/`, verifies Butterchurn, playback, Randomizer, persistence paths, and service shutdown, then closes it. It does not use the web development server or your normal library.

## Playback and platform limits

Butterchurn, Three.js, UHD, local generation, playlist storage, and automatic lyrics use the same implementation as the browser edition. Windows WASAPI computer-output capture is the desktop link-audio path. The desktop shell currently denies browser microphone and screen-capture permission requests; browser tab sharing remains available in the web edition. Provider embeds can restrict playback or DRM support in Electron. Use the web edition when a provider requires a supported browser.

The renderer has Node integration disabled, context isolation enabled, and sandboxing enabled. The Python API requires a random per-launch token held by the desktop services. Remote navigation opens in the system browser; there is no renderer bridge exposing filesystem or shell operations.

## Packaging references

- [Electron process model](https://www.electronjs.org/docs/latest/tutorial/process-model)
- [Electron utility processes](https://www.electronjs.org/docs/latest/api/utility-process)
- [Next.js standalone output](https://nextjs.org/docs/app/api-reference/config/next-config-js/output)
- [PyInstaller usage](https://pyinstaller.org/en/stable/usage.html)
