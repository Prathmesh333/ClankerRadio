# Playback and recording

[Documentation index](README.md)

## Generate and play music

Press **Play** to start a kept track or generate a fresh mix. Use previous/next, pause, stop, seek, and volume in the bottom controls. **New mix** generates another score. Sound settings choose the musical profile, tempo, ensemble, and visual intensity. The default is 128 BPM EDM; tempo can reach 190 BPM.

The engine uses 24 synthesized instrument patches, with per-voice envelopes, spectra, registers, and stereo placement. Electronic profiles use short hooks, separate percussion lanes, syncopated bass, and build/drop sections. These are procedural instrumental arrangements, not sampled acoustic performances or mastered commercial recordings. Older saved scores retain their earlier arrangement.

The Obsidian interface uses smoked black-glass panels, charcoal surfaces, and silver-white controls. Menus and dialogs use short transitions and respect reduced-motion and reduced-transparency preferences. Controls hide when idle and return on pointer movement or keyboard focus. Full-screen mode is intended for screen recording. Record the browser and its output audio with your capture software; the app does not export an MP4 or upload it.

## Effects and picture quality

Auto visual energy is on by default in every engine, including MilkDrop. Effects and Sound settings can switch it to a fixed slider. Automatic variation is smooth, and Gentle motion takes priority.

**Butterchurn · MilkDrop** is the default. It runs the actual Butterchurn engine before and during playback; it does not substitute the Alchemy shader. Its 367 unique presets shuffle without consecutive repeats and blend during playback. Before a music source exists, the engine renders a silent preview.

The menu also includes original shader themes and Three.js geometry, particles, luminous surfaces, fractal backgrounds, and bloom. **Randomizer · all effects** changes the selected engine every 28 seconds. **Next random effect** advances it immediately; **Remix visuals** changes a preset or scene variation.

| Quality | Rendering |
| --- | --- |
| Display sharp | Matches device pixel density, within 3840 × 2160 |
| UHD · 2160p | Fits within 3840 × 2160 while preserving the viewport aspect ratio |
| Performance | Fits within 1280 × 720 |

The canvas buffer and renderer viewport resize together, so a small default canvas is not stretched over the player. UHD resolution depends on the frame proportions and GPU limits. Higher resolution costs more GPU time; it does not change a preset's artistic zoom settings. GPU fences limit queued frames. Reduced motion freezes the Butterchurn scene and disables automatic effect changes and lyric impact animations.

## Playlist and local files

The kept playlist includes favorites and Codex winners approved at 75/100 or above. Temporary continuity mixes stay out of this list. Duplicate detection compares symbolic motif, rhythm, and harmonic plans rather than titles or seeds. Higher-ranked versions take priority; original files remain recoverable on disk. This does not detect every perceptually similar performance.

Use the JSON download control to export a score. Performances live in `.data/assets/performances/`; tournament history lives in `.data/assets/tournaments/`. Back up `.data/` to preserve the library. It is not committed to the source repository.

## Codex competitions and endless radio

Install the Codex CLI, run `codex login`, then open the sparkle panel. The connected indicator checks the local CLI sign-in.

A tournament makes 15 real calls: two initial compositions, three complete rounds of reciprocal criticism and revisions, and a final independent judgment. Typed schemas validate the responses. The winning plan is compiled into playable note events. Drafts, criticisms, revisions, and the verdict are saved. **Perform winner** plays the result. Critics evaluate symbolic plans, so listening is still needed to assess the sound.

Calls use ephemeral, read-only CLI processes. Prompts go through stdin; generated JSON is never executed. Cancellation stops the active process. Errors appear in the app rather than simulated agent results.

**Start endless radio** maintains a small buffer of local scores. With Codex competitions enabled, approved winners receive queue priority while local composition keeps the buffer available. The browser must remain open with audio enabled. The producer stops when the API stops; completed files survive, but interrupted tournaments do not automatically resume.

## Music links and automatic lyrics

Open **Link** and paste a canonical YouTube video or playlist, Spotify track/album/playlist, Apple Music song/album/playlist, SoundCloud URL, or direct audio URL. Provider playback and navigation remain in a visible embed. Provider accounts, region restrictions, previews, and embedding policies still apply. Expand short links before pasting them. Direct audio requires the host's CORS permission.

Automatic lyrics use LRCLIB with the current track metadata. YouTube, Spotify, and SoundCloud adapters follow their exposed playback clocks and track changes. Apple Music can use an available Windows now-playing session; apps that do not publish a session cannot supply that clock. Plain lyrics use approximate line timing; missing, instrumental, and service-error states are shown explicitly. Lyric results are cached in memory, not saved as files.

Optional corrections accept plain text or timed LRC. Offset controls adjust timing. Kinetic typography varies by line; word highlighting is estimated within a line rather than supplied word-level timing.

On Windows, automatic computer-output capture uses SoundCard/WASAPI and sends PCM only to the local visualizer. It captures the selected system output, including other audible apps. Disable the computer-output checkbox to disconnect it. No microphone is used and no capture file is saved. **Share tab audio** is the browser fallback; choose the playing tab and enable audio sharing. Chrome/Edge are useful when the in-app browser cannot capture audio. Direct audio connects through Web Audio itself.

**Audio spectrum bars** in Effects toggles the frequency bars along the bottom of the visuals. They read the same live audio analyzer as the themes, across generated tracks and connected external audio. They remain visible when controls hide, decay to silence when audio stops, and use gentler motion with reduced motion enabled.

Spectrum settings include individual edges, top + bottom, left + right, all four sides, or a custom position with horizontal and vertical sliders. Mirror spectrum reflects frequency bars around the center. Bar height and spectrum width control the size without changing the music or other visual effects.
