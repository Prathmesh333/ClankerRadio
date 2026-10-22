type SpotifyEvent = { data: { playingURI?: string; position?: number; duration?: number; isPaused?: boolean } };
export type SpotifyController = { addListener(name: string, callback: (event: SpotifyEvent) => void): void; destroy(): void };
type SpotifyAPI = { createController(host: HTMLElement, options: { uri: string; width: string; height: number }, callback: (controller: SpotifyController) => void): void };
export type SoundCloudWidget = { bind(event: string, callback: (data: { currentPosition?: number }) => void): void; getCurrentSound(callback: (sound: { title: string; duration: number; user?: { username: string }; permalink_url: string }) => void): void; unbind(event: string): void };
type SoundCloudAPI = { Widget: ((frame: HTMLIFrameElement) => SoundCloudWidget) & { Events: { READY: string; PLAY: string; PLAY_PROGRESS: string } } };
declare global { interface Window { onSpotifyIframeApiReady?: (api: SpotifyAPI) => void; SC?: SoundCloudAPI } }
let spotifyPromise: Promise<SpotifyAPI> | undefined;
let soundcloudPromise: Promise<SoundCloudAPI> | undefined;
export function spotifyAPI() {
  if (!spotifyPromise) spotifyPromise = new Promise<SpotifyAPI>((resolve, reject) => {
    window.onSpotifyIframeApiReady = resolve;
    const script = document.createElement("script"); script.src = "https://open.spotify.com/embed/iframe-api/v1";
    script.onerror = () => { spotifyPromise = undefined; reject(new Error("Spotify controls could not load.")); };
    document.head.appendChild(script);
  });
  return spotifyPromise;
}
export function soundcloudAPI() {
  if (window.SC) return Promise.resolve(window.SC);
  if (!soundcloudPromise) soundcloudPromise = new Promise<SoundCloudAPI>((resolve, reject) => {
    const script = document.createElement("script"); script.src = "https://w.soundcloud.com/player/api.js";
    script.onload = () => { if (window.SC) resolve(window.SC); else reject(new Error("SoundCloud controls unavailable.")); };
    script.onerror = () => { soundcloudPromise = undefined; reject(new Error("SoundCloud controls could not load.")); };
    document.head.appendChild(script);
  });
  return soundcloudPromise;
}
