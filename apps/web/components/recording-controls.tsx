"use client";
import { useEffect, useRef, useState, type RefObject } from "react";
import { StudioRecorder, type RecordingFormat } from "../lib/studio-recorder";
import type { VisualAudio } from "../lib/visual-audio";
export function RecordingControls({
  player,
  format,
  onFormat,
  external = false,
}: {
  player: RefObject<VisualAudio | null>;
  format: RecordingFormat;
  onFormat(value: RecordingFormat): void;
  external?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    recorder = useRef<StudioRecorder | null>(null),
    [active, setActive] = useState(false),
    [seconds, setSeconds] = useState(0),
    [error, setError] = useState(""),
    [download, setDownload] = useState(""),
    url = useRef(""),
    alive = useRef(true),
    current = useRef({ player, format, external });
  useEffect(() => {
    current.current = { player, format, external };
  }, [player, format, external]);
  async function start() {
    if (recorder.current) return;
    setError("");
    try {
      const value = new StudioRecorder();
      recorder.current = value;
      await value.start(
        current.current.format,
        () => current.current.player.current,
        () =>
          document.querySelector<HTMLElement>(
            current.current.external ? ".external-music" : ".live-stage",
          ),
        (blob) => {
          recorder.current = null;
          if (!alive.current) return;
          if(!blob.size){setActive(false);setError("No video frames were captured. Try again after the visualizer starts.");dialog.current?.showModal();return;}
          if (url.current) URL.revokeObjectURL(url.current);
          url.current = URL.createObjectURL(blob);
          setDownload(url.current);
          setActive(false);
          dialog.current?.showModal();
        },
        (message) => {
          if (alive.current) setError(message);
        },
      );
      setActive(true);
      dialog.current?.close();
    } catch (error) {
      await recorder.current?.dispose();
      recorder.current = null;
      setError((error as Error).message);
    }
  }
  function stop() {
    recorder.current?.stop();
  }
  async function clean() {
    dialog.current?.close();
    const shell = document.querySelector<HTMLElement>(".player-shell"),
      stage = document.querySelector<HTMLElement>(
        current.current.external ? ".external-music" : ".live-stage",
      );
    if (shell) shell.dataset.cleanView = "true";
    if (stage) stage.dataset.recordFormat = format;
    await document.documentElement.requestFullscreen().catch(() => {});
  }
  useEffect(() => {
    alive.current = true;
    const open = () => dialog.current?.showModal();
    const keys = (event: KeyboardEvent) => {
      if (
        (event.target as HTMLElement)?.closest(
          "input,textarea,select,[contenteditable=true]",
        )
      )
        return;
      if (event.key === "Escape") {
        const shell = document.querySelector<HTMLElement>(".player-shell");
        if (shell) delete shell.dataset.cleanView;
        if (!recorder.current)
          document
            .querySelectorAll<HTMLElement>("[data-record-format]")
            .forEach((stage) => delete stage.dataset.recordFormat);
      }
      if (event.ctrlKey && event.shiftKey && event.code === "KeyR") {
        event.preventDefault();
        if (recorder.current) recorder.current.stop();
        else dialog.current?.showModal();
      }
      if (event.code === "KeyN")
        window.dispatchEvent(new Event("visualizer:next"));
    };
    const fullscreen = () => {
      if (!document.fullscreenElement) {
        const shell = document.querySelector<HTMLElement>(".player-shell");
        if (shell) delete shell.dataset.cleanView;
        if (!recorder.current)
          document
            .querySelectorAll<HTMLElement>("[data-record-format]")
            .forEach((stage) => delete stage.dataset.recordFormat);
      }
    };
    document.addEventListener("fullscreenchange", fullscreen);
    window.addEventListener("recording:open", open);
    window.addEventListener("keydown", keys);
    const timer = setInterval(() => {
      if (recorder.current) setSeconds(Math.floor(recorder.current.elapsed));
    }, 500);
    return () => {
      alive.current = false;
      document.removeEventListener("fullscreenchange", fullscreen);
      window.removeEventListener("recording:open", open);
      window.removeEventListener("keydown", keys);
      clearInterval(timer);
      recorder.current?.stop();
      if (url.current) URL.revokeObjectURL(url.current);
    };
  }, []);
  return (
    <>
      <dialog
        className="player-drawer recording-dialog"
        ref={dialog}
        aria-labelledby="recording-title"
      >
        <div className="drawer-heading">
          <h2 id="recording-title">Recording studio</h2>
          <button
            type="button"
            aria-label="Close recording tools"
            onClick={() => dialog.current?.close()}
          >
            ×
          </button>
        </div>
        <div className="source-fields">
          <label htmlFor="recording-format">Output layout</label>
          <select
            id="recording-format"
            value={format}
            disabled={active}
            onChange={(event) =>
              onFormat(event.target.value as RecordingFormat)
            }
          >
            <option value="landscape">Landscape · 1920 × 1080</option>
            <option value="portrait">Vertical · 1080 × 1920</option>
            <option value="square">Square · 1080 × 1080</option>
          </select>
          <p>
            Records visuals, spectrum, lyrics, and connected audio to WebM.
            Setup controls and provider windows stay out of the video. Ctrl +
            Shift + R opens tools or stops a clip.
          </p>
          <button
            type="button"
            onClick={() => (active ? stop() : void start())}
          >
            {active ? "Stop recording" : "Start video recording"}
          </button>
          <button type="button" onClick={() => void clean()}>
            Clean view for OBS
          </button>
          <p>
            Escape restores the controls. N advances Randomizer effects.
            Imported audio and generated music are captured directly; provider
            music needs its audio connected first.
          </p>
          {download && (
            <a
              href={download}
              download={`Clanker-Radio-${new Date().toISOString().replace(/[:.]/g, "-")}.webm`}
            >
              Download recording
            </a>
          )}
          {error && <p role="alert">{error}</p>}
        </div>
      </dialog>
      {active && (
        <button
          type="button"
          className="recording-indicator"
          onClick={stop}
          aria-label="Stop video recording"
        >
          ● REC {Math.floor(seconds / 60)}:
          {String(seconds % 60).padStart(2, "0")} · Stop
        </button>
      )}
    </>
  );
}
