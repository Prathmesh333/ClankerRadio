# Suggested improvements

[Documentation index](README.md)

These are proposals, not implemented features. Keep new controls inside drawers and Effects so the listening view stays focused on music and visuals.

## Recommended order

| Priority | Improvement | Result |
| --- | --- | --- |
| 1 | Saved visual scenes and preferences | Save spectrum layout, lyric visibility, quality, and effects as named presets; restore them across desktop launches using local storage managed by the app, independent of the changing localhost port |
| 2 | Music quality and transitions | Add better instrument samples, stronger mixing/limiting, and crossfades; assess rendered audio for clipping, balance, repetition, and rhythmic consistency alongside Codex score criticism |
| 3 | Beat-aware visual direction | Detect onsets and tempo, then schedule visual/palette transitions on musical boundaries rather than only timers |
| 4 | Recording mode | Offer clean 16:9 and 9:16 output layouts, a separate recording view, and hotkeys for scene changes without exposing setup controls |
| 5 | Local music library | Import audio files or folders, read tags and album art, maintain a queue, and drive the same visuals without provider embeds |
| 6 | Desktop polish | Add media-key controls, an optional tray player, in-app update checks, adaptive render limits, and a smaller package by trimming unused locales and server dependencies |

The first useful release would combine saved scenes with crossfades. The largest improvement to the core generative-radio experience would be better sound sources and evaluation of rendered audio. Recording mode would be the next priority for streaming and screen-recording workflows.
