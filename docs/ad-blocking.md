# Ad blocking and music-player research

[Documentation index](README.md)

## Implemented approach

The desktop app uses `@ghostery/adblocker-electron` with the standard ads-only subscriptions, cached locally and activated before player navigation. The filter snapshot, upstream filter sources, resource definitions, source URLs, hashes, and license texts are bundled under `resources/adblock/`. Runtime cache updates keep the active handlers unchanged and take effect on the next launch. Local API traffic remains available.

A separate, original YouTube-only preload removes known player-ad fields from parsed player responses and initial player data. It preserves music metadata, stream descriptors, JSON revivers, and non-YouTube pages. Both layers follow the native Block ads preference; reload pages after changing it. This is filtering, not a replacement music catalog or a direct-stream extractor.

The provider fallback opens a supported HTTPS music website in a separate sandboxed window. Remote pages receive no filesystem or shell bridge. Only the local main frame can request opening or closing that window. The URL validator rejects arbitrary domains, credentials, custom ports, and non-HTTPS schemes. Unknown provider popups and navigation are blocked.

## Projects reviewed

| Project | Technique | Relevance |
| --- | --- | --- |
| [Pear Desktop do-not-track](https://github.com/pear-devs/pear-desktop/tree/master/src/plugins/do-not-track) | Ghostery session filters plus player-response filtering | Closest architectural match to this Electron player; no Pear files were copied |
| [Ghostery Electron blocker](https://github.com/ghostery/adblocker/tree/master/packages/adblocker-electron) | Network and cosmetic filters, serialization, session integration | Installed dependency used by this app |
| [FreeTube](https://github.com/FreeTubeApp/FreeTube) | Built-in extraction and optional Invidious backend | Different architecture: its [local API guide](https://docs.freetubeapp.io/usage/local-api/) documents extraction dependencies and maintenance breakage |
| [YouTube player parameters](https://developers.google.com/youtube/player_parameters) | Official playlist, origin, and API configuration | Embed requests identify the actual local player origin |

The supplied YouTube Music playlist URL resolves to the title Hindi_Songs in the public playlist metadata. This confirms that its URL format is recognized; it does not establish that every item can play in an embed. Errors distinguish unavailable/private items, owner embedding restrictions, and origin/referrer rejection.

## Verification boundaries

Unit checks cover ad-host filtering, allowed music/local requests, source URL validation, player-data filtering, JSON behavior, and disabled/non-YouTube states. Packaged integration checks exercise actual Electron request blocking and document-start filtering using controlled provider fixtures. Those fixtures do not prove that every live provider ad format is blocked. Live account playback and any server-inserted ads remain provider-dependent. The app does not claim a universal zero-ad guarantee.
