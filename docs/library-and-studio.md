# Saved music, scenes, and recording

[Documentation index](README.md)

## Saved links and local audio

Open **Link** and paste a supported track or playlist URL. Opening it saves it automatically to the local music library. YouTube share parameters and equivalent playlist URLs share one entry. Spotify, Apple Music, SoundCloud, and direct audio links use provider-aware identities. The saved library lives in SQLite, so it survives desktop restarts even when the localhost port changes.

**Link & lyrics → Saved music** reopens the library. Use Play to load an entry, edit its name directly, or remove it. Imported files are copied to the app's private asset folder; the original files are never moved or changed. MP3, WAV, OGG, M4A, AAC, FLAC, and Opus files up to 250 MB are accepted. Import a set of files, choose a folder, or drop files onto the library. Embedded tags and cover art are read locally with music-metadata. Searching filters the visible queue. Previous/Next and Repeat queue control local-file playback.

Removing an imported entry removes the private copy, not the original file. Removing a saved provider link only removes the bookmark.

## Preferences and named scenes

Effects, render quality, spectrum layout, visual energy, lyric visibility, volume, crossfade time, recording format, and motion preference save automatically through the local API. Gentle motion follows the operating system until overridden; **Use system motion preference** restores that behavior.

Expand **Saved visual scenes** in Effects or Sound settings. Give the current setup a name and select **Save current scene**. Selecting a scene restores its settings. Saving the same name replaces that scene, and × removes it.

## Sound and transitions

The local synthesizer now retains each instrument's harmonic patch, adds original plucked-string buffers and layered bass/lead voices, and applies low-frequency cleanup, midrange balancing, dynamics control, and kick-driven ducking. These remain original synthetic timbres, not recorded acoustic instrument samples.

**Sound settings → Crossfade** controls generated-track and local/direct-audio transitions from 0 to 8 seconds. Continuous generated radio requests its next score before the current one ends. Local audio uses two playback decks and equal-power gain curves. Embedded/provider-managed playlists control their own transitions; this setting cannot impose a crossfade on YouTube or Spotify playback.

**Beat-synced transitions** uses the known tempo for generated music and estimates onsets for connected external audio. Randomizer and MilkDrop wait for a musical boundary after their normal change interval. A timeout keeps silent/ambient previews moving. Gentle motion disables beat-driven changes.

## Recording studio

Open **Recording tools** in Effects or use the record button in the main header. Choose landscape 1920 × 1080, vertical 1080 × 1920, or square 1080 × 1080. **Start video recording** captures the visual canvases, spectrum, lyrics, and connected audio at up to 30 frames per second. Provider cards, menus, and setup controls are excluded. Stop the clip, then use **Download recording** to save a WebM file.

The recording mix follows audio-source changes and crossfades. Provider music must first be connected through the existing computer-output or tab-audio path. The app records the current visual output; render quality still controls the detail available to the recorder. WebM export is implemented; MP4 conversion is not included. Clips stop at 500 MB to bound recorder memory. Use OBS for long sessions.

**Clean view for OBS** hides the interface and applies the selected output proportions. Escape restores the controls. Ctrl + Shift + R opens recording tools or stops an active clip; N advances Randomizer effects. Generated playback also registers Media Session transport actions where the host supports them.

## Desktop updates

**Sound settings → App updates → Check for updates** checks the latest stable GitHub release. Compatible releases need an installer named `Clanker-Radio-Setup-VERSION.exe`. In-app installation is offered only when the release asset has a SHA-256 digest. Downloaded size and digest are checked before the installer is started, then the app closes for the update. A release without a digest can be opened in the browser for manual download. No public release is created merely by running the checker.

The desktop package retains English and Hindi Chromium UI resources and omits Redis, S3, and PostgreSQL dependencies from its local-only frozen API. Web/development installations can still use those backends when their normal dependencies are installed. The desktop API always uses its private local SQLite/assets configuration.
