"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PerformanceVisual } from "../components/performance-visual";
import { EffectsMenu } from "../components/effects-menu";
import { DEFAULT_RENDER_QUALITY, type RenderQuality } from "../lib/render-quality";
import { ExternalMusic } from "../components/external-music";
import { DEFAULT_VISUAL_MODE, visualModes, type VisualMode } from "../lib/visual-modes";
import { PerformancePlayer } from "../lib/performance-player";
import {
  api,
  type Arena,
  type Patch,
  type Performance,
  type Station,
} from "../lib/performance-types";

const stamp = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

export default function Studio() {
  const player = useRef<PerformancePlayer | null>(null);
  const [patches, setPatches] = useState<Patch[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [score, setScore] = useState<Performance | null>(null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [tempo, setTempo] = useState(128);
  const [duration, setDuration] = useState(180);
  const [mood, setMood] = useState("edm");
  const [seed, setSeed] = useState(42);
  const [mode, setMode] = useState<VisualMode>(DEFAULT_VISUAL_MODE);
  const [quality, setQuality] = useState<RenderQuality>(DEFAULT_RENDER_QUALITY);
  const [visualVariation, setVisualVariation] = useState(0);
  const [intensity, setIntensity] = useState(0.8);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [recording, setRecording] = useState(false);
  const [external, setExternal] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const hideControls = useRef<ReturnType<typeof setTimeout> | null>(null);
  function revealControls() {
    setControlsVisible(true);
    if (hideControls.current) clearTimeout(hideControls.current);
    hideControls.current = setTimeout(() => setControlsVisible(false), 1800);
  }
  useEffect(() => {
    hideControls.current = setTimeout(() => setControlsVisible(false), 2500);
    return () => { if (hideControls.current) clearTimeout(hideControls.current); };
  }, []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [connection, setConnection] = useState<{
    connected: boolean;
    message: string;
  } | null>(null);
  const [arena, setArena] = useState<Arena | null>(null);
  const [station, setStation] = useState<Station | null>(null);
  const [useCodex, setUseCodex] = useState(true);
  const [library, setLibrary] = useState<Performance[]>([]);
  const [panel, setPanel] = useState<"playlist" | "settings" | "agents" | null>(
    null,
  );
  const drawer = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (panel) drawer.current?.showModal();
    else drawer.current?.close();
  }, [panel]);
  const selectedSet = new Set(selected);
  const [rms, setRms] = useState(0);
  const continuous = useRef(false),
    nextBusy = useRef(false);
  const next = useRef<() => Promise<void>>(async () => {});
  const retry = useRef<ReturnType<typeof setTimeout> | null>(null);
  const brief = () => ({
    seed,
    tempoBpm: tempo,
    durationTargetS: duration,
    mood,
    instrumentIds: selected,
  });

  useEffect(() => {
    let mounted = true;
    Promise.all([
      api<Patch[]>("/instruments"),
      api<Performance[]>("/performances"),
      api<Station>("/radio/status"),
      api<Arena[]>("/agents/tournaments"),
    ])
      .then(([catalog, items, radio, tournaments]) => {
        if (mounted) {
          setPatches(catalog);
          setSelected(catalog.map((p) => p.id));
          setLibrary(items);
          setStation(radio);
          setArena(tournaments[0] ?? null);
        }
      })
      .catch((error) => {
        if (mounted) setError(error.message);
      });
    api<{ connected: boolean; message: string }>("/agents/connection")
      .then((value) => {
        if (mounted) setConnection(value);
      })
      .catch((error) => {
        if (mounted) setError(error.message);
      });
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReducedMotion(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => {
      mounted = false;
      media.removeEventListener("change", apply);
      void player.current?.dispose();
      player.current = null;
      continuous.current = false;
      if (retry.current) clearTimeout(retry.current);
    };
  }, []);
  const refreshLibrary = useCallback(async () => {
    setLibrary(await api<Performance[]>("/performances"));
  }, []);
  useEffect(() => {
    if (!arena || arena.status !== "RUNNING") return;
    let active = true;
    const interval = setInterval(() => {
      api<Arena>(`/agents/tournaments/${arena.id}`)
        .then((value) => {
          if (active) {
            setArena(value);
            if (value.status === "COMPLETED") void refreshLibrary();
          }
        })
        .catch((error) => {
          if (active) setError(error.message);
        });
    }, 2000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [arena, refreshLibrary]);
  useEffect(() => {
    if (!station?.running) return;
    let active = true;
    const interval = setInterval(() => {
      api<Station>("/radio/status")
        .then((value) => {
          if (active) {
            setStation(value);
            if (value.arenaId)
              void api<Arena>(`/agents/tournaments/${value.arenaId}`)
                .then((value) => {
                  if (active) setArena(value);
                })
                .catch(() => {});
          }
        })
        .catch((error) => {
          if (active) setError(error.message);
        });
    }, 2500);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [station?.running]);
  useEffect(() => {
    const interval = setInterval(() => {
      if (player.current) {
        player.current.sample();
        setRms(player.current.signal.rms);
        setPosition(player.current.position);
      }
    }, 150);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPanel(null);
        setRecording(false);
        if (document.fullscreenElement)
          void document.exitFullscreen().catch(() => {});
      }
    };
    const fullscreen = () => {
      if (!document.fullscreenElement) setRecording(false);
    };
    window.addEventListener("keydown", escape);
    document.addEventListener("fullscreenchange", fullscreen);
    return () => {
      window.removeEventListener("keydown", escape);
      document.removeEventListener("fullscreenchange", fullscreen);
    };
  }, []);

  async function engine() {
    if (!player.current) {
      player.current = new PerformancePlayer(patches);
      player.current.volume(volume);
    }
    await player.current.unlock();
    return player.current;
  }
  async function playScore(performance: Performance) {
    const audio = await engine();
    setScore(performance);
    setPosition(0);
    setPlaying(true);
    audio.onEnded = () => {
      setPlaying(false);
      if (continuous.current) void next.current();
    };
    audio.play(performance);
  }
  async function generate(fresh=false) {
    setBusy(true);
    setError("");
    continuous.current = false;
    try {
      await engine();
      await playScore(await api<Performance>("/performances", fresh?{...brief(),seed:crypto.getRandomValues(new Uint32Array(1))[0]%2147483647}:brief()));
      await refreshLibrary();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function togglePlayback() {
    if (!score) {
      const matching = library.find(item => item.mood === mood);
      if (matching) await load(matching.id);
      else await generate(true);
      return;
    }
    try {
      const audio = await engine();
      if (playing) {
        audio.pause();
        setPlaying(false);
      } else {
        audio.play(score, audio.position);
        setPlaying(true);
      }
    } catch (error) {
      setError((error as Error).message);
    }
  }
  useEffect(() => {
    next.current = async () => {
      if (nextBusy.current || !continuous.current) return;
      nextBusy.current = true;
      try {
        await playScore(await api<Performance>("/radio/next", {}));
        setError("");
        await refreshLibrary();
      } catch (error) {
        setError((error as Error).message);
        if (continuous.current)
          retry.current = setTimeout(() => void next.current(), 1500);
      } finally {
        nextBusy.current = false;
      }
    };
  });
  async function startRadio() {
    setBusy(true);
    setError("");
    try {
      await engine();
      setStation(
        await api<Station>("/radio/start", { brief: brief(), useCodex }),
      );
      continuous.current = true;
      if (!playing)
        await playScore(
          await api<Performance>("/performances", {
            ...brief(),
            seed: crypto.getRandomValues(new Uint32Array(1))[0] % 2147483647,
          }),
        );
    } catch (error) {
      continuous.current = false;
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function stopRadio() {
    continuous.current = false;
    if (retry.current) clearTimeout(retry.current);
    try {
      setStation(await api<Station>("/radio/stop", {}));
    } catch (error) {
      setError((error as Error).message);
    }
  }
  async function startTournament() {
    setBusy(true);
    setError("");
    try {
      setArena(await api<Arena>("/agents/tournaments", brief()));
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function recordView() {
    setRecording(true);
    try {
      await document.documentElement.requestFullscreen();
    } catch {
      /* Recording layout remains usable without fullscreen permission. */
    }
  }
  async function load(identity: string) {
    try {
      continuous.current = false;
      await engine();
      await playScore(await api<Performance>(`/performances/${identity}`));
    } catch (error) {
      setError((error as Error).message);
    }
  }
  const pending = arena?.status === "RUNNING";

  const cleanTitle = (title: string) => title.replace(/\s*·\s*\d+$/, "");
  const favorite = !!library.find((item) => item.id === score?.id)?.favorite;
  async function keep(identity: string, favorite: boolean, hidden = false) {
    try {
      await api(`/performances/${identity}/preference`, { favorite, hidden });
      await refreshLibrary();
    } catch (error) {
      setError((error as Error).message);
    }
  }
  async function skip(direction: number) {
    try {
      if (direction < 0 && position > 3) {
        player.current?.seek(0);
        setPosition(0);
        return;
      }
      const index = library.findIndex((item) => item.id === score?.id);
      if (library.length) {
        await load(
          library[(index + direction + library.length) % library.length].id,
        );
      } else {
        await engine();
        await playScore(
          await api<Performance>("/performances", {
            ...brief(),
            seed: crypto.getRandomValues(new Uint32Array(1))[0] % 2147483647,
          }),
        );
      }
    } catch (error) {
      setError((error as Error).message);
    }
  }

  if (external) return <main className="player-shell external-shell"><ExternalMusic reducedMotion={reducedMotion} onClose={() => setExternal(false)} /></main>;

  return (
    <main className={`player-shell ${recording ? "recording" : ""} ${controlsVisible || panel ? "controls-visible" : ""}`}
      onPointerMove={revealControls} onPointerLeave={() => setControlsVisible(false)}
      onFocusCapture={revealControls} onKeyDown={revealControls} onTouchStart={revealControls}>
      <header className="player-chrome">
        <span className="player-brand">
          <i />
          clanker<span>radio</span>
        </span>
        <nav aria-label="Player panels">
          <button aria-label="Open music link" onClick={() => {
            player.current?.pause(); setPlaying(false); continuous.current = false;
            if (retry.current) clearTimeout(retry.current);
            if (station?.running) void stopRadio();
            setExternal(true);
          }}>↗ Link</button>
          <button
            aria-pressed={panel === "playlist"}
            onClick={() => setPanel(panel === "playlist" ? null : "playlist")}
          >
            Playlist
          </button>
          <button
            aria-label="Sound settings"
            onClick={() => setPanel("settings")}
          >
            ⚙
          </button>
          <button
            aria-label="Codex composers"
            onClick={() => setPanel("agents")}
          >
            ✧
          </button>
          <button
            aria-label="Fullscreen visualizer"
            onClick={() => void recordView()}
          >
            ⛶
          </button>
        </nav>
      </header>
      <section className="live-stage">
        <PerformanceVisual
          player={player}
          mode={mode}
          intensity={intensity}
          reducedMotion={reducedMotion}
          seed={((score?.seed ?? 42) ^ Math.imul(visualVariation, 2654435761)) >>> 0}
          quality={quality}
        />
        {recording && (
          <button
            className="exit-recording"
            onClick={() => {
              setRecording(false);
              if (document.fullscreenElement) void document.exitFullscreen();
            }}
          >
            Exit · Esc
          </button>
        )}
        <span className="visual-theme">{visualModes[mode]}</span>
      </section>
      <section className="player-deck" aria-label="Music player controls">
        <div className="now-playing">
          <div>
            <span className="track-label">
              {playing ? "NOW PLAYING" : "CLANKER RADIO"}
            </span>
            <h1>
              {score ? cleanTitle(score.title) : "No track selected"}
            </h1>
          </div>
          <button
            className={`favorite-button ${favorite ? "saved" : ""}`}
            disabled={!score}
            aria-label={favorite ? "Unfavorite track" : "Keep this track"}
            aria-pressed={favorite}
            onClick={() => score && void keep(score.id, !favorite)}
          >
            {" "}
            {favorite ? "★" : "☆"}{" "}
          </button>
        </div>
        <div className="seek-row">
          <span>{stamp(position)}</span>
          <input
            aria-label="Seek track"
            type="range"
            min="0"
            max={score?.durationS ?? 1}
            step=".1"
            value={position}
            disabled={!score}
            onChange={(event) => {
              const seconds = Number(event.target.value);
              player.current?.seek(seconds);
              setPosition(seconds);
            }}
          />
          <span>{stamp(score?.durationS ?? 0)}</span>
        </div>
        <div className="player-buttons">
          <div className="transport-buttons">
            <button
              aria-label="Previous track"
              disabled={!patches.length || busy}
              onClick={() => void skip(-1)}
            >
              Ⅰ◀
            </button>
            <button
              className="play-toggle"
              aria-label={playing ? "Pause performance" : "Play performance"}
              disabled={!patches.length || busy}
              onClick={() => void togglePlayback()}
            >
              {playing ? "Ⅱ" : "▶"}
            </button>
            <button
              aria-label="Stop playback"
              disabled={!score}
              onClick={() => {
                continuous.current = false;
                player.current?.stop();
                setPlaying(false);
                setPosition(0);
              }}
            >
              ■
            </button>
            <button
              aria-label="Next track"
              disabled={!patches.length || busy}
              onClick={() => void skip(1)}
            >
              ▶Ⅰ
            </button>
            <button
              className={station?.running ? "enabled" : ""}
              aria-label={
                station?.running ? "Stop endless radio" : "Start endless radio"
              }
              aria-pressed={!!station?.running}
              disabled={busy || !patches.length}
              onClick={() =>
                void (station?.running ? stopRadio() : startRadio())
              }
            >
              ∞
            </button>
          </div>
          <div className="right-controls">
            <label className="volume-control">
              <span>♪</span>
              <input
                aria-label="Volume"
                type="range"
                min="0"
                max="1"
                step=".01"
                value={volume}
                onChange={(event) => {
                  setVolume(Number(event.target.value));
                  player.current?.volume(Number(event.target.value));
                }}
              />
            </label>
            <EffectsMenu mode={mode} onMode={setMode} quality={quality} onQuality={setQuality} onRemix={() => {
              if (mode === "randomizer") window.dispatchEvent(new Event("visualizer:next"));
              else if (mode === "random") window.dispatchEvent(new Event("visualizer:preset-next"));
              else setVisualVariation(n => n + 1);
            }} />
          </div>
        </div>
        <div className="deck-status">
          <span>
            {score
              ? `${score.instrumentIds.length} voices · ${score.tempoBpm} BPM`
              : "Generative music player"}
            {station?.running ? " · endless radio" : ""}
          </span>
          <meter
            aria-label="Output level"
            min="0"
            max="1"
            value={Math.min(1, rms * 5)}
          />
          <button
            className="new-mix"
            disabled={!patches.length || busy}
            onClick={() => void generate(true)}
          >
            {busy ? "Composing…" : "New mix"}
          </button>
        </div>
      </section>
      <dialog
        ref={drawer}
        className="player-drawer"
        aria-labelledby="drawer-title"
        onCancel={() => setPanel(null)}
        onClose={() => setPanel(null)}
      >
        <div className="drawer-heading">
          <h2 id="drawer-title">
            {panel === "playlist"
              ? "Kept tracks"
              : panel === "settings"
                ? "Sound & picture"
                : "Behind the music"}
          </h2>
          <button aria-label="Close panel" onClick={() => setPanel(null)}>
            ×
          </button>
        </div>
        {panel === "playlist" && (
          <section className="playlist">
            <p className="playlist-note">
              {library.length} tracks · favorites and approved winners · no
              duplicate plans
            </p>
            {library.length === 0 ? (
              <p className="empty-playlist">
                Nothing kept yet. Press ☆ on a track you love.
              </p>
            ) : (
              library.map((item, index) => (
                <div
                  className={`playlist-track ${item.id === score?.id ? "current" : ""}`}
                  key={item.id}
                >
                  <span className="track-number">
                    {item.id === score?.id && playing
                      ? "♫"
                      : String(index + 1).padStart(2, "0")}
                  </span>
                  <button
                    className="track-name"
                    onClick={() => void load(item.id)}
                  >
                    <strong>{cleanTitle(item.title)}</strong>
                    <small>
                      {item.favorite ? "Favorite" : "Codex selected"}
                    </small>
                  </button>
                  <span className="track-time">{stamp(item.durationS)}</span>
                  <button
                    aria-label={`Remove ${cleanTitle(item.title)} from kept tracks`}
                    onClick={() => void keep(item.id, false, true)}
                  >
                    ×
                  </button>
                  <a
                    href={`/api/performances/${item.id}/json`}
                    download
                    aria-label={`Download ${cleanTitle(item.title)} JSON`}
                  >
                    ↓
                  </a>
                </div>
              ))
            )}
          </section>
        )}
        {panel === "settings" && (
          <>
            <div className="picture-settings">
              <label>
                Visual energy
                <input
                  type="range"
                  min=".1"
                  max="1.5"
                  step=".05"
                  value={intensity}
                  onChange={(event) => setIntensity(Number(event.target.value))}
                />
              </label>
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={reducedMotion}
                  onChange={(event) => setReducedMotion(event.target.checked)}
                />
                Gentle motion
              </label>
            </div>{" "}
            <aside className="direction" id="performance-controls">
              <p className="kicker">01 / THE ENSEMBLE</p>
              <h1>
                Make a world
                <br /> worth listening to.
              </h1>
              <p className="direction-copy">
                Twenty-four voices. One evolving performance.
              </p>
              <label htmlFor="mood">Musical direction</label>
              <select
                id="mood"
                value={mood}
                onChange={(e) => {
                  setMood(e.target.value);
                  setTempo(({ edm:128, house:124, techno:138, trance:140, drum_and_bass:174, hip_hop:92, synthwave:110, rock:132 } as Record<string, number>)[e.target.value] ?? 72);
                }}
              >
                {["edm", "house", "techno", "trance", "drum_and_bass", "hip_hop", "synthwave", "rock", "luminous", "dawn", "nocturne", "cosmic"].map((mood) => (
                  <option key={mood}>{mood}</option>
                ))}
              </select>
              <div className="control-pair">
                <div>
                  <label htmlFor="tempo">Tempo · BPM</label>
                  <input
                    id="tempo"
                    type="number"
                    min="40"
                    max="190"
                    value={tempo}
                    onChange={(e) => {
                      const value = e.target.valueAsNumber;
                      if (Number.isFinite(value) && value >= 40 && value <= 190)
                        setTempo(value);
                    }}
                  />
                </div>
                <div>
                  <label htmlFor="duration">Track length</label>
                  <select
                    id="duration"
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                  >
                    {[60, 180, 300, 600].map((seconds) => (
                      <option key={seconds} value={seconds}>
                        {seconds / 60} min
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <label htmlFor="seed">Performance seed</label>
              <input
                id="seed"
                type="number"
                min="0"
                max="2147483647"
                value={seed}
                onChange={(e) => {
                  const value = e.target.valueAsNumber;
                  if (
                    Number.isInteger(value) &&
                    value >= 0 &&
                    value <= 2147483647
                  )
                    setSeed(value);
                }}
              />
              <button
                className="perform-button"
                disabled={busy || !selected.length || !patches.length}
                onClick={() => void generate()}
              >
                {busy ? "Preparing…" : "Compose & perform"} <span>↗</span>
              </button>
              <div className="sound-selection">
                <div className="subheading">
                  <span>{selected.length} INSTRUMENTS</span>
                  <button
                    onClick={() =>
                      setSelected(
                        selected.length === patches.length
                          ? []
                          : patches.map((p) => p.id),
                      )
                    }
                  >
                    {selected.length === patches.length
                      ? "Clear"
                      : "Select all"}
                  </button>
                </div>
                <div className="instrument-picks">
                  {patches.map((patch) => (
                    <label key={patch.id}>
                      <input
                        type="checkbox"
                        checked={selectedSet.has(patch.id)}
                        onChange={(e) =>
                          setSelected((items) =>
                            e.target.checked
                              ? [...items, patch.id]
                              : items.filter((id) => id !== patch.id),
                          )
                        }
                      />
                      <span style={{ color: patch.color }}>●</span>
                      {patch.name}
                    </label>
                  ))}
                </div>
              </div>
              <p className="fine-print">
                24 original synthesis patches with individual envelopes and
                timbres. Acoustic sample realism is not claimed.
              </p>
            </aside>
          </>
        )}
        {panel === "agents" && (
          <>
            {" "}
            <aside className="agents-column">
              <section className="radio-panel">
                <p className="kicker">02 / NEVER-ENDING RADIO</p>
                <h2>
                  Always another
                  <br />
                  world waiting.
                </h2>
                <p>
                  A local score buffer keeps music playing while Codex develops
                  the next performance.
                </p>
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={useCodex}
                    disabled={station?.running}
                    onChange={(e) => setUseCodex(e.target.checked)}
                  />
                  Use Codex competitions
                </label>
                <button
                  className="radio-button"
                  disabled={busy || !selected.length || !patches.length}
                  onClick={() =>
                    void (station?.running ? stopRadio() : startRadio())
                  }
                >
                  {station?.running ? "Stop producer" : "Start endless radio"}{" "}
                  <span>{station?.running ? "■" : "↗"}</span>
                </button>
                <div className="radio-stats">
                  <div>
                    <strong>{station?.queued ?? 0}</strong>
                    <span>BUFFERED</span>
                  </div>
                  <div>
                    <strong>{station?.generated ?? 0}</strong>
                    <span>GENERATED</span>
                  </div>
                  <div>
                    <strong>{station?.running ? "LIVE" : "OFF"}</strong>
                    <span>PRODUCER</span>
                  </div>
                </div>
                {station?.error && (
                  <p className="inline-error">{station.error}</p>
                )}
                <p className="fine-print">
                  Local compositions are labeled separately from agent winners.
                  Generation continues while the API runs.
                </p>
              </section>
              <section className="agent-panel">
                <p className="kicker">03 / THE COMPOSER ARENA</p>
                <div
                  className={`connection ${connection?.connected ? "connected" : ""}`}
                >
                  <i />
                  {connection?.connected
                    ? "Codex connected"
                    : connection
                      ? "Codex unavailable"
                      : "Checking Codex…"}
                </div>
                <p className="fine-print">{connection?.message}</p>
                <div className="agent-cast">
                  {[
                    ["A", "The Architect", "MOTIF & STRUCTURE"],
                    ["B", "The Improviser", "CONTRAST & DIALOGUE"],
                    ["J", "The Adjudicator", "INDEPENDENT FINAL JUDGE"],
                  ].map(([id, name, role]) => (
                    <div key={id}>
                      <span>{id}</span>
                      <strong>
                        {name}
                        <small>{role}</small>
                      </strong>
                    </div>
                  ))}
                </div>
                <div className="rounds">
                  {[1, 2, 3].map((round) => (
                    <span
                      key={round}
                      className={arena && arena.round >= round ? "reached" : ""}
                    >
                      R{round}
                      <small>Critique → revise</small>
                    </span>
                  ))}
                </div>
                <p className="arena-explanation">
                  Two composers cross-criticize and revise through three rounds.
                  A separate judge selects the winner.
                </p>
                <button
                  disabled={
                    busy ||
                    pending ||
                    station?.running ||
                    !connection?.connected ||
                    !selected.length
                  }
                  onClick={() => void startTournament()}
                >
                  {pending ? "Competition running…" : "Start Codex tournament"}
                </button>
                {pending && (
                  <button
                    className="text-button"
                    onClick={() =>
                      void api<Arena>(
                        `/agents/tournaments/${arena.id}/stop`,
                        {},
                      )
                        .then(setArena)
                        .catch((error) => setError(error.message))
                    }
                  >
                    Stop tournament
                  </button>
                )}
                {arena && (
                  <div className="arena-status">
                    <span>
                      {arena.status} · {arena.callsCompleted}/
                      {arena.callsPlanned} CALLS
                    </span>
                    <p>{arena.stage}</p>
                    <progress max="15" value={arena.callsCompleted} />
                    {arena.error && (
                      <p className="inline-error">{arena.error}</p>
                    )}
                    {arena.verdict && (
                      <div className="verdict">
                        <strong>
                          Winner {arena.verdict.winner} · A{" "}
                          {arena.verdict.scoreA} / B {arena.verdict.scoreB}
                        </strong>
                        <p>{arena.verdict.reasoning}</p>
                        {arena.performanceId && (
                          <button
                            onClick={() => void load(arena.performanceId!)}
                          >
                            Perform winner
                          </button>
                        )}
                      </div>
                    )}
                    {arena.history
                      .filter((round) => round.critiques)
                      .map((round) => (
                        <details key={round.round}>
                          <summary>
                            Round {round.round} · peer criticism
                          </summary>
                          {Object.entries(round.critiques ?? {}).map(
                            ([name, critique]) => (
                              <div key={name}>
                                <h3>Candidate {name}</h3>
                                <p>
                                  Coherence {critique.musicalCoherence} ·
                                  Orchestration {critique.orchestration}
                                </p>
                                <ul>
                                  {critique.findings.map((finding) => (
                                    <li key={finding}>{finding}</li>
                                  ))}
                                </ul>
                              </div>
                            ),
                          )}
                        </details>
                      ))}
                  </div>
                )}
                <p className="fine-print">
                  15 real Codex calls per tournament use your local sign-in.
                  Critics inspect symbolic plans; they do not listen to the
                  audio.
                </p>
              </section>
            </aside>
          </>
        )}
      </dialog>
      {error && (
        <div className="global-error" role="alert">
          {error}
          <button aria-label="Dismiss error" onClick={() => setError("")}>
            ×
          </button>
        </div>
      )}
    </main>
  );
}
