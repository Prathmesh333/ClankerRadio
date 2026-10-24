"use client";
import type { DesktopBridge } from "../lib/desktop";
import { LocalPlayback } from "./local-playback";
import { SavedMusicLibrary } from "./saved-music";
import { SavedScenes } from "./saved-scenes";
import { api } from "../lib/performance-types";
import { saveMusicLink, type SavedMusicEntry } from "../lib/saved-music";
import type { PlayerPreferences } from "../lib/player-settings";
import { type SpectrumSettings } from "../lib/spectrum-settings";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type RefObject,
} from "react";
import {
  spotifyAPI,
  soundcloudAPI,
  type SpotifyController,
  type SoundCloudWidget,
} from "../lib/embed-controllers";
import { EffectsMenu } from "./effects-menu";
import { type RenderQuality } from "../lib/render-quality";
import { PerformanceVisual } from "./performance-visual";
import { ExternalAudio, type VisualAudio } from "../lib/visual-audio";
import {
  parseLyrics,
  parseMusicSource,
  youtubeEmbedURL,
  youtubePlaybackError,
  type MusicSource,
} from "../lib/music-source";
import { type VisualMode } from "../lib/visual-modes";

type YouTubePlayer = {
  getCurrentTime(): number;
  getPlayerState(): number;
  getDuration?(): number;
  getVideoData(): { video_id: string; title?: string; author?: string };
  destroy(): void;
};
type YouTubeAPI = {
  Player: new (element: HTMLIFrameElement, options: object) => YouTubePlayer;
};
declare global {
  interface Window {
    clankerDesktop?: DesktopBridge;
    YT?: YouTubeAPI;
    onYouTubeIframeAPIReady?: () => void;
  }
}
function youtubeAPI(): Promise<YouTubeAPI> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  return new Promise((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      if (window.YT) resolve(window.YT);
    };
    if (!document.getElementById("youtube-api")) {
      const script = document.createElement("script");
      script.id = "youtube-api";
      script.src = "https://www.youtube.com/iframe_api";
      script.onerror = () =>
        reject(
          new Error(
            "YouTube controls could not load. Use the manual lyric clock.",
          ),
        );
      document.head.appendChild(script);
    }
  });
}

const subscribeDesktop = () => () => {};

export function ExternalMusic({
  onClose,
  reducedMotion,
  sharedAudioRef,
  preferences,
  onPreferences,
  spectrum,
  onSpectrum,
  spectrumSettings,
  onSpectrumSettings,
  autoEnergy = true,
  onAutoEnergy,
  intensity = 0.8,
  onIntensity,
}: {
  onClose(): void;
  reducedMotion: boolean;
  sharedAudioRef: RefObject<VisualAudio | null>;
  preferences: PlayerPreferences;
  onPreferences(value: Partial<PlayerPreferences>): void;
  spectrum: boolean;
  onSpectrum(value: boolean): void;
  spectrumSettings: SpectrumSettings;
  onSpectrumSettings(value: SpectrumSettings): void;
  autoEnergy?: boolean;
  onAutoEnergy(value: boolean): void;
  intensity?: number;
  onIntensity(value: number): void;
}) {
  const desktopAvailable = useSyncExternalStore(
    subscribeDesktop,
    () => Boolean(window.clankerDesktop),
    () => false,
  );
  const [nativePlayer, setNativePlayer] = useState(false);
  useEffect(
    () => () => {
      void window.clankerDesktop?.closeMusic().catch(() => {});
    },
    [],
  );
  const [link, setLink] = useState("");
  const [source, setSource] = useState<MusicSource | null>(null);
  const [editing, setEditing] = useState(true);
  const showLyrics = preferences.showLyrics,
    setShowLyrics = (showLyrics: boolean) => onPreferences({ showLyrics });
  const [lyrics, setLyrics] = useState("");
  const [automatic, setAutomatic] = useState(true);
  const [lyricStatus, setLyricStatus] = useState("Automatic lyrics enabled");
  const [lyricSource, setLyricSource] = useState("");
  const [track, setTrack] = useState({
    url: "",
    title: "",
    artist: "",
    duration: 0,
  });
  const spotifyHost = useRef<HTMLDivElement>(null);
  const providerFrame = useRef<HTMLIFrameElement>(null);
  const providerTime = useRef(0);

  const [lineSeconds, setLineSeconds] = useState(4);
  const [offset, setOffset] = useState(0);
  const [time, setTime] = useState(0);
  const [running, setRunning] = useState(false);
  const [synced, setSynced] = useState(false);
  const [computerAudio, setComputerAudio] = useState(true);
  const [libraryStatus, setLibraryStatus] = useState("");
  const [audioStatus, setAudioStatus] = useState("");
  const native = useRef<AbortController | null>(null);
  const [reactive, setReactive] = useState(false);
  const [error, setError] = useState("");
  const mode = preferences.mode,
    setMode = (mode: VisualMode) => onPreferences({ mode });
  const quality = preferences.quality,
    setQuality = (quality: RenderQuality) => onPreferences({ quality });
  const designSeed = preferences.visualSeed;
  const setDesignSeed = (value: number | ((current: number) => number)) =>
    onPreferences({
      visualSeed: typeof value === "function" ? value(designSeed) : value,
    });
  const savedIdentity = useRef("");
  const localQueue = useRef<SavedMusicEntry[]>([]);
  const [controls, setControls] = useState(true);
  const audio = useRef<(VisualAudio & { close(): Promise<void> }) | null>(null);
  const stream = useRef<MediaStream | null>(null);
  useEffect(() => {
    sharedAudioRef.current = audio.current;
  });
  useEffect(
    () => () => {
      sharedAudioRef.current = null;
    },
    [sharedAudioRef],
  );
  const youtubeHost = useRef<HTMLDivElement>(null);
  const media = useRef<HTMLAudioElement>(null);
  const yt = useRef<YouTubePlayer | null>(null);
  const currentVideo = useRef("");
  const resolvedTitle = useRef("");
  const settings = useRef<HTMLDialogElement>(null);
  const providerHover = useRef(false);
  const idle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const parsed = useMemo(
    () => parseLyrics(lyrics, lineSeconds),
    [lyrics, lineSeconds],
  );
  const lyricTime = time + offset;
  let index = -1;
  for (let i = 0; i < parsed.cues.length; i++)
    if (parsed.cues[i].time <= lyricTime) index = i;
  const cue = parsed.cues[index],
    next = parsed.cues[index + 1];
  const progress = cue
    ? Math.min(
        1,
        (lyricTime - cue.time) /
          Math.max(0.1, (next?.time ?? cue.time + lineSeconds) - cue.time),
      )
    : 0;
  const words = cue?.text.split(/\s+/) ?? [];
  const look = (Math.imul(index + 1, 2654435761) + designSeed) >>> 0;
  const reveal = useCallback(() => {
    setControls(true);
    if (idle.current) clearTimeout(idle.current);
    idle.current = setTimeout(() => {
      if (!providerHover.current) setControls(false);
    }, 2000);
  }, []);

  useEffect(()=>{
    window.addEventListener("pointermove",reveal,{capture:true,passive:true});
    window.addEventListener("pointerdown",reveal,{capture:true,passive:true});
    return()=>{window.removeEventListener("pointermove",reveal,true);window.removeEventListener("pointerdown",reveal,true);};
  },[reveal]);
  useEffect(() => {
    if (editing) settings.current?.showModal();
    else settings.current?.close();
  }, [editing]);
  useEffect(() => {
    const timer = setInterval(() => {
      if (nativePlayer) return;
      if (source?.provider === "YouTube" && yt.current) {
        const position = yt.current.getCurrentTime();
        if (Number.isFinite(position)) setTime(position);
        const video = yt.current.getVideoData();
        const id = video.video_id;
        if (id && id !== currentVideo.current) {
          if (currentVideo.current) {
            setOffset(0);
            setAutomatic(true);
            setLyrics("");
          }
          setTrack({
            url: `https://www.youtube.com/watch?v=${id}`,
            title: video.title ?? "",
            artist: video.author ?? "",
            duration: yt.current.getDuration?.() ?? 0,
          });
        }
        if (id) currentVideo.current = id;
      } else if (
        source?.provider === "Spotify" ||
        source?.provider === "SoundCloud"
      )
        setTime(providerTime.current);
      else if (media.current) setTime(media.current.currentTime);
      else if (running) setTime((t) => t + 0.1);
    }, 100);
    return () => clearInterval(timer);
  }, [source, running, nativePlayer]);
  useEffect(() => {
    let cancelled = false;
    if (source?.provider === "YouTube" && !nativePlayer)
      void youtubeAPI()
        .then((api) => {
          if (cancelled || !youtubeHost.current || !source.embed) return;
          const frame = document.createElement("iframe");
          frame.src = youtubeEmbedURL(source.embed, window.location.origin);
          frame.title = "YouTube music player";
          frame.allow =
            "autoplay; encrypted-media; fullscreen; picture-in-picture";
          frame.allowFullscreen = true;
          frame.referrerPolicy = "strict-origin-when-cross-origin";
          youtubeHost.current.appendChild(frame);
          yt.current = new api.Player(frame, {
            events: {
              onReady: () => setSynced(true),
              onError: (event: { data?: number }) => {
                setSynced(false);
                setError(youtubePlaybackError(event.data ?? 0));
              },
            },
          });
        })
        .catch((e) => setError(e.message));
    return () => {
      cancelled = true;
      yt.current?.destroy();
      yt.current = null;
      currentVideo.current = "";
    };
  }, [source, nativePlayer]);
  useEffect(() => {
    if (!source || !automatic) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLyricStatus("Finding synchronized lyrics…");
      setLyricSource("");
      const query = new URLSearchParams({
        url: track.url || source.url,
        title: track.title,
        artist: track.artist,
        duration: String(track.duration || 0),
      });
      fetch(`/api/lyrics?${query}`, { signal: controller.signal })
        .then((response) => {
          if (!response.ok) throw new Error("Lyric service unavailable");
          return response.json();
        })
        .then((data) => {
          if (controller.signal.aborted) return;
          resolvedTitle.current = data.title ?? "";
          setLyrics(data.lyrics ?? "");
          setLyricStatus(data.message ?? data.status);
          setLyricSource(data.source ?? "");
        })
        .catch((error) => {
          if (error.name !== "AbortError")
            setLyricStatus("Lyrics unavailable · retry in Link & lyrics");
        });
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [source, track, automatic]);
  useEffect(() => {
    let disposed = false;
    let spotify: SpotifyController | undefined,
      widget: SoundCloudWidget | undefined;
    if (source?.provider === "Spotify")
      void spotifyAPI()
        .then((api) => {
          if (disposed || !spotifyHost.current) return;
          const path = new URL(source.url).pathname.match(
            /(track|album|playlist|episode)\/([a-zA-Z0-9]+)/,
          );
          if (!path) return;
          api.createController(
            spotifyHost.current,
            {
              uri: `spotify:${path[1]}:${path[2]}`,
              width: "100%",
              height: 152,
            },
            (control) => {
              if (disposed) {
                control.destroy();
                return;
              }
              spotify = control;
              control.addListener("ready", () => setSynced(true));
              control.addListener("playback_update", (event) => {
                providerTime.current = (event.data.position ?? 0) / 1000;
                const uri = event.data.playingURI;
                if (uri && uri !== currentVideo.current) {
                  if (currentVideo.current) {
                    setLyrics("");
                    setAutomatic(true);
                    setOffset(0);
                  }
                  currentVideo.current = uri;
                  setTrack({
                    url: `https://open.spotify.com/${uri.split(":").slice(1).join("/")}`,
                    title: "",
                    artist: "",
                    duration: (event.data.duration ?? 0) / 1000,
                  });
                }
              });
            },
          );
        })
        .catch((error) => {
          if (!disposed) setError(error.message);
        });
    if (source?.provider === "SoundCloud")
      void soundcloudAPI()
        .then((api) => {
          if (disposed || !providerFrame.current) return;
          widget = api.Widget(providerFrame.current);
          const update = () =>
            widget?.getCurrentSound((sound) => {
              if (
                disposed ||
                !sound ||
                sound.permalink_url === currentVideo.current
              )
                return;
              if (currentVideo.current) {
                setAutomatic(true);
                setLyrics("");
                setOffset(0);
              }
              currentVideo.current = sound.permalink_url;
              setTrack({
                url: sound.permalink_url,
                title: sound.title,
                artist: sound.user?.username ?? "",
                duration: sound.duration / 1000,
              });
            });
          widget.bind(api.Widget.Events.READY, () => {
            setSynced(true);
            update();
          });
          widget.bind(api.Widget.Events.PLAY, update);
          widget.bind(api.Widget.Events.PLAY_PROGRESS, (event) => {
            providerTime.current = (event.currentPosition ?? 0) / 1000;
          });
        })
        .catch((error) => {
          if (!disposed) setError(error.message);
        });
    return () => {
      disposed = true;
      spotify?.destroy();
      ["ready", "play", "playProgress"].forEach((event) =>
        widget?.unbind(event),
      );
    };
  }, [source]);
  useEffect(() => {
    if (!source || (source.provider !== "Apple Music" && !nativePlayer)) return;
    const controller = new AbortController();
    let busy = false;
    const timer = setInterval(() => {
      if (busy) return;
      busy = true;
      fetch(
        `/api/audio/now-playing?${new URLSearchParams({ title: /\/song\/|[?&]i=/.test(source.url) ? resolvedTitle.current : "" })}`,
        { signal: controller.signal },
      )
        .then((r) => r.json())
        .then((data) => {
          if (controller.signal.aborted) return;
          if (data.status !== "connected") {
            setSynced(false);
            return;
          }
          setSynced(true);
          providerTime.current = data.position;
          setTime(data.position);
          const id = `${data.artist}:${data.title}`;
          if (id !== currentVideo.current) {
            if (currentVideo.current) {
              setAutomatic(true);
              setLyrics("");
              setOffset(0);
            }
            currentVideo.current = id;
            setTrack({
              url: source.url,
              title: data.title,
              artist: data.artist,
              duration: data.duration,
            });
          }
        })
        .catch(() => {})
        .finally(() => {
          busy = false;
        });
    }, 1000);
    return () => {
      clearInterval(timer);
      controller.abort();
    };
  }, [source, nativePlayer]);
  useEffect(() => {
    if (!source?.embed || !computerAudio) return;
    const controller = new AbortController();
    native.current = controller;
    const input = new ExternalAudio();
    audio.current = input;
    void input.context.resume();
    void (async () => {
      try {
        const response = await fetch("/api/audio/loopback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
          signal: controller.signal,
        });
        if (!response.ok || !response.body)
          throw new Error("Computer audio unavailable · use Share tab audio");
        const reader = response.body.getReader(),
          decoder = new TextDecoder();
        let pending = "";
        while (!controller.signal.aborted) {
          const chunk = await reader.read();
          if (chunk.done) break;
          pending += decoder.decode(chunk.value, { stream: true });
          let newline;
          while ((newline = pending.indexOf("\n")) >= 0) {
            const data = JSON.parse(pending.slice(0, newline));
            pending = pending.slice(newline + 1);
            if (data.status === "error") throw new Error(data.message);
            if (data.status === "connected") {
              setReactive(true);
              setAudioStatus("Computer audio · connected locally");
            }
            if (data.pcm) input.feedPCM(data.pcm, data.sampleRate);
          }
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setAudioStatus((error as Error).message);
          setReactive(false);
          if (audio.current === input) audio.current = null;
          void input.close();
        }
      }
    })();
    return () => {
      controller.abort();
      if (audio.current === input) audio.current = null;
      void input.close();
    };
  }, [source, computerAudio]);
  useEffect(
    () => () => {
      native.current?.abort();
      stream.current?.getTracks().forEach((track) => track.stop());
      void audio.current?.close();
      if (idle.current) clearTimeout(idle.current);
    },
    [],
  );
  useEffect(() => {
    if (!savedIdentity.current || !track.title || source?.url.includes("list="))
      return;
    const timer = setTimeout(() => {
      void api(`/library/${savedIdentity.current}/metadata`, {
        title: track.title,
        artist: track.artist,
        duration: track.duration,
        auto: true,
      }).catch(() => {});
    }, 1200);
    return () => clearTimeout(timer);
  }, [track, source]);
  async function disconnect() {
    native.current?.abort();
    native.current = null;
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    await audio.current?.close();
    audio.current = null;
    setReactive(false);
  }
  async function capture() {
    setComputerAudio(false);
    setError("");
    try {
      if (!navigator.mediaDevices?.getDisplayMedia)
        throw new Error(
          "Audio sharing is unavailable here. Open this local app in Chrome or Edge and use Share tab audio.",
        );
      await disconnect();
      const captured = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
      if (!captured.getAudioTracks().length) {
        captured.getTracks().forEach((track) => track.stop());
        throw new Error(
          "No audio was shared. Select the music tab and enable Share tab audio in the browser picker.",
        );
      }
      stream.current = captured;
      audio.current = new ExternalAudio(
        new MediaStream(captured.getAudioTracks()),
      );
      await audio.current.context.resume();
      setReactive(true);
      captured.getVideoTracks()[0]?.addEventListener(
        "ended",
        () => {
          void disconnect();
        },
        { once: true },
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function load(
    input = link,
    saved?: SavedMusicEntry,
    queue?: SavedMusicEntry[],
  ) {
    try {
      const nextSource: MusicSource =
        saved?.kind === "file"
          ? { provider: "Local music", url: saved.url, embed: null }
          : parseMusicSource(input);
      if (queue) localQueue.current = queue;
      if (saved?.kind === "file") savedIdentity.current = saved.id;
      else {
        savedIdentity.current = "";
        try {
          const kept = await saveMusicLink(nextSource.url, saved?.title || "");
          savedIdentity.current = kept.id;
          setLibraryStatus("Saved to your music library.");
        } catch (error) {
          setLibraryStatus(
            `Playing · link could not be saved: ${(error as Error).message}`,
          );
        }
      }
      setLink(nextSource.url);
      await window.clankerDesktop?.closeMusic();
      if (!source || source.embed || nextSource.embed) await disconnect();
      setAudioStatus(
        computerAudio && nextSource.embed ? "Connecting computer audio…" : "",
      );
      resolvedTitle.current = "";
      setTrack({
        url: nextSource.url,
        title: saved?.title || "",
        artist: saved?.artist || "",
        duration: saved?.duration || 0,
      });
      providerTime.current = 0;
      setSource(nextSource);
      setTime(0);
      setRunning(false);
      setSynced(false);
      setNativePlayer(false);
      setError("");
      setEditing(false);
      reveal();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <section
      className={`external-music ${controls || editing ? "external-controls-visible" : ""}`}
      onPointerMove={reveal}
      onPointerDown={reveal}
      onFocusCapture={reveal}
      onKeyDown={reveal}
    >
      <PerformanceVisual
        beatSync={preferences.beatSync}
        spectrumSettings={spectrumSettings}
        spectrum={spectrum}
        key={reactive ? "reactive" : "ambient"}
        player={audio}
        mode={mode}
        reducedMotion={reducedMotion}
        intensity={intensity}
        autoEnergy={autoEnergy}
        seed={designSeed}
        quality={quality}
      />
      <div className="external-top external-controls">
        <button onClick={onClose}>← Generative radio</button>
        <span>
          {source?.provider ?? "Music links"} ·{" "}
          {reactive ? "Audio connected" : "Ambient visuals"}
        </span>
        <button onClick={() => setEditing(true)}>Link & lyrics</button>
      </div>
      {showLyrics && (
        <div
          className={`kinetic-lyrics lyric-look-${look % 6} ${reducedMotion ? "lyric-still" : ""}`}
          key={`${index}-${designSeed}`}
          style={
            {
              "--lyric-hue": look % 360,
              "--lyric-tilt": `${(look % 9) - 4}deg`,
            } as CSSProperties
          }
        >
          <div className="lyric-orbit" aria-hidden="true" />
          <p aria-live="off">
            {words.map((word, i) => (
              <span
                key={i}
                className={
                  i <= Math.floor(progress * words.length) ? "lit" : ""
                }
                style={{ "--word-index": i } as CSSProperties}
              >
                {word}{" "}
              </span>
            ))}
          </p>
          {next && <small>{next.text}</small>}
        </div>
      )}
      {source && (
        <div
          onMouseEnter={() => {
            providerHover.current = true;
            reveal();
          }}
          onMouseLeave={() => {
            providerHover.current = false;
            reveal();
          }}
          className={`provider-player provider-${source.provider.toLowerCase().replace(/ /g, "-")}`}
        >
          {nativePlayer ? (
            <p className="provider-native-note">Playing in desktop player</p>
          ) : source.provider === "YouTube" ? (
            <div ref={youtubeHost} />
          ) : source.provider === "Spotify" ? (
            <div ref={spotifyHost} />
          ) : source.embed ? (
            <iframe
              ref={providerFrame}
              key={source.embed}
              title={`${source.provider} music player`}
              src={source.embed}
              allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          ) : (
            <LocalPlayback
              url={source.url}
              volume={preferences.volume}
              crossfade={preferences.crossfadeS}
              mediaRef={media}
              onAudio={(value) => {
                audio.current = value;
                setReactive(Boolean(value));
                if (value) setAudioStatus("Local audio · connected");
              }}
              onError={setError}
              onAdvance={(direction, repeat) => {
                const queue = localQueue.current.filter(
                  (item) => item.kind === "file",
                );
                const index = queue.findIndex(
                  (item) => item.id === savedIdentity.current,
                );
                if (index < 0 || !queue.length) return;
                let next = index + direction;
                if (next < 0 || next >= queue.length) {
                  if (!repeat) return;
                  next = (next + queue.length) % queue.length;
                }
                void load(queue[next].url, queue[next], queue);
              }}
            />
          )}
          {desktopAvailable && source.provider === "YouTube" && (
            <button
              className="desktop-provider-button"
              onClick={(event) => {
                if (event.detail > 0) event.currentTarget.blur();
                setNativePlayer(true);
                setSynced(false);
                void window.clankerDesktop
                  ?.openMusic(source.url)
                  .then(() => {
                    setError("");
                  })
                  .catch((error) => {
                    setNativePlayer(false);
                    setError(error.message);
                  });
              }}
            >
              {nativePlayer ? "Show desktop player ↗" : "Open desktop player ↗"}
            </button>
          )}
          <a href={source.url} target="_blank" rel="noreferrer">
            Open on {source.provider} ↗
          </a>
        </div>
      )}
      <div className="external-bottom external-controls">
        <div className="external-actions">
          {!!source?.embed && (
            <button
              onClick={() =>
                void (reactive
                  ? (setComputerAudio(false), disconnect())
                  : capture())
              }
            >
              {reactive ? "Disconnect audio" : "Share tab audio"}
            </button>
          )}
          <EffectsMenu
            beatSync={preferences.beatSync}
            onBeatSync={(beatSync) => onPreferences({ beatSync })}
            scenes={
              <SavedScenes preferences={preferences} onApply={onPreferences} />
            }
            showLyrics={showLyrics}
            onShowLyrics={setShowLyrics}
            spectrumSettings={spectrumSettings}
            onSpectrumSettings={onSpectrumSettings}
            spectrum={spectrum}
            onSpectrum={onSpectrum}
            autoEnergy={autoEnergy}
            onAutoEnergy={onAutoEnergy}
            intensity={intensity}
            onIntensity={onIntensity}
            external
            mode={mode}
            onMode={setMode}
            quality={quality}
            onQuality={setQuality}
            onRemix={() => {
              if (mode === "randomizer")
                window.dispatchEvent(new Event("visualizer:next"));
              else if (mode === "random")
                window.dispatchEvent(new Event("visualizer:preset-next"));
              else setDesignSeed((n) => (n + 1) >>> 0);
            }}
          />
          <button
            onClick={() =>
              setDesignSeed(crypto.getRandomValues(new Uint32Array(1))[0])
            }
          >
            Shuffle design
          </button>
          <button
            aria-label="Fullscreen external visuals"
            onClick={() =>
              void (
                document.fullscreenElement
                  ? document.exitFullscreen()
                  : document.documentElement.requestFullscreen()
              ).catch((e) => setError(e.message))
            }
          >
            ⛶
          </button>
        </div>
        <div className="lyric-clock">
          <span>{audioStatus}</span>
          <span className="auto-lyric-status">
            {lyricSource ? (
              <a href={lyricSource} target="_blank" rel="noreferrer">
                {lyricStatus}
              </a>
            ) : (
              lyricStatus
            )}
          </span>
          <span>
            {Math.floor(time / 60)}:
            {String(Math.floor(time % 60)).padStart(2, "0")} ·{" "}
            {synced || (source && !source.embed)
              ? "Player clock"
              : "Manual lyric clock"}
          </span>
          {!synced && !!source?.embed && (
            <>
              <button onClick={() => setRunning(!running)}>
                {running ? "Pause lyrics" : "Start lyrics"}
              </button>
              <button
                onClick={() => {
                  setTime(0);
                  setRunning(false);
                }}
              >
                Reset lyrics
              </button>
            </>
          )}
          <button onClick={() => setOffset(offset - 0.5)}>−0.5s</button>
          <span>{offset.toFixed(1)}s</span>
          <button onClick={() => setOffset(offset + 0.5)}>+0.5s</button>
        </div>
        {error && !editing && (
          <p role="alert" className="source-error">
            {error}
          </p>
        )}
      </div>
      <dialog
        className="player-drawer source-dialog"
        ref={settings}
        aria-labelledby="source-title"
        onCancel={(e) => {
          if (!source) e.preventDefault();
          else setEditing(false);
        }}
        onClose={() => {
          if (source) setEditing(false);
        }}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (source && link === source.url) setEditing(false);
            else load();
          }}
        >
          <div className="drawer-heading">
            <h2 id="source-title">Play a link. Make it a show.</h2>
            <button
              type="button"
              aria-label="Close music links"
              onClick={() => (source ? setEditing(false) : onClose())}
            >
              ×
            </button>
          </div>
          <div className="source-fields">
            <label htmlFor="music-link">Track or playlist URL</label>
            <input
              id="music-link"
              type="text"
              inputMode="url"
              required
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="YouTube, Spotify, Apple Music, SoundCloud…"
            />
            {libraryStatus && <p role="status">{libraryStatus}</p>}
            <SavedMusicLibrary
              onPlay={(entry, queue) => void load(entry.url, entry, queue)}
            />
            <p>
              Use the embedded player for playback and playlists. Connect shared
              tab audio for reactive visuals. Some services offer previews or
              require sign-in.
            </p>
            <label className="check-label">
              <input
                type="checkbox"
                checked={computerAudio}
                onChange={(e) => setComputerAudio(e.target.checked)}
              />{" "}
              Connect Windows computer audio automatically
            </label>
            <p>
              Reads this computer’s output locally for visuals. No microphone or
              audio files. Turn it off to use browser tab sharing instead.
            </p>
            <label className="check-label">
              <input
                type="checkbox"
                checked={showLyrics}
                onChange={(e) => setShowLyrics(e.target.checked)}
              />{" "}
              Show lyrics
            </label>
            <label className="check-label">
              <input
                type="checkbox"
                checked={automatic}
                onChange={(e) => setAutomatic(e.target.checked)}
              />{" "}
              Find lyrics automatically
            </label>
            <p>{lyricStatus}</p>
            <details className="lyric-corrections">
              <summary>Optional lyric corrections</summary>
              <label htmlFor="lyric-input">
                Lyrics · optional correction or timed LRC
              </label>
              <textarea
                id="lyric-input"
                rows={7}
                maxLength={50000}
                value={lyrics}
                onChange={(e) => {
                  setLyrics(e.target.value);
                  setAutomatic(false);
                  setLyricStatus("Custom lyrics");
                }}
                placeholder={
                  "[00:00.00] Your opening line\n[00:04.50] The next line"
                }
              />
              <p>
                {parsed.timed
                  ? `${parsed.cues.length} timed lines detected.`
                  : "Plain lyrics use estimated timing."}{" "}
                Automatic LRCLIB lookup follows track changes on YouTube,
                Spotify and SoundCloud. Timed lyrics follow their player clocks.
                Apple Music links can fetch song lyrics, with clock sync when
                its playback session is exposed by Windows. Plain-only results
                use estimated timing.
              </p>
              <label htmlFor="lyric-duration">Seconds per untimed line</label>
              <input
                id="lyric-duration"
                type="number"
                min="1"
                max="20"
                step=".5"
                value={lineSeconds}
                onChange={(e) =>
                  setLineSeconds(
                    Math.max(1, Math.min(20, Number(e.target.value) || 4)),
                  )
                }
              />
            </details>
            {error && (
              <p role="alert" className="source-error">
                {error}
              </p>
            )}
            <button type="submit">
              {source && link === source.url
                ? "Apply lyrics"
                : "Open music link"}
            </button>
          </div>
        </form>
      </dialog>
    </section>
  );
}
