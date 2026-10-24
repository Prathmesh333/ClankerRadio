"use client";
import { useEffect, useRef, useState, type RefObject } from "react";
import { MediaDeck } from "../lib/media-deck";
export function LocalPlayback({
  url,
  volume,
  crossfade,
  mediaRef,
  onAudio,
  onError,
  onAdvance,
}: {
  url: string;
  volume: number;
  crossfade: number;
  mediaRef: RefObject<HTMLAudioElement | null>;
  onAudio(deck: MediaDeck | null): void;
  onError(message: string): void;
  onAdvance(direction: number, repeat: boolean): void;
}) {
  const first = useRef<HTMLAudioElement>(null),
    second = useRef<HTMLAudioElement>(null),
    engine = useRef<MediaDeck | null>(null),
    [active, setActive] = useState(0),
    [ready, setReady] = useState(false),
    [repeat, setRepeat] = useState(false),
    callbacks = useRef({ onAudio, onError, onAdvance, repeat }),
    advanced = useRef(false),
    fade = useRef(crossfade);
  useEffect(() => {
    fade.current = crossfade;
  }, [crossfade]);
  useEffect(() => {
    callbacks.current = { onAudio, onError, onAdvance, repeat };
  }, [onAudio, onError, onAdvance, repeat]);
  useEffect(() => {
    let value: MediaDeck | null = null;
    const timer = setTimeout(() => {
      if (!first.current || !second.current) return;
      value = new MediaDeck([first.current, second.current]);
      engine.current = value;
      callbacks.current.onAudio(value);
      setReady(true);
    }, 0);
    return () => {
      clearTimeout(timer);
      if (value) {
        engine.current = null;
        mediaRef.current = null;
        callbacks.current.onAudio(null);
        void value.close();
      }
    };
  }, [mediaRef]);
  useEffect(() => {
    engine.current?.volume(volume);
  }, [volume, ready]);
  useEffect(() => {
    if (!ready) return;
    let disposed = false;
    advanced.current = false;
    void engine.current
      ?.load(url, fade.current)
      .then((deck) => {
        if (!disposed && engine.current) {
          setActive(deck);
          mediaRef.current = engine.current.active;
        }
      })
      .catch((error) => {
        if (!disposed && engine.current) {
          setActive(engine.current.index);
          mediaRef.current = engine.current.active;
          callbacks.current.onError(
            `Audio could not start: ${error.message}. Press Play to retry.`,
          );
        }
      });
    return () => {
      disposed = true;
    };
  }, [url, mediaRef, ready]);
  useEffect(() => {
    const timer = setInterval(() => {
      const element = engine.current?.active;
      if (
        !element ||
        element.paused ||
        !Number.isFinite(element.duration) ||
        advanced.current
      )
        return;
      if (element.duration - element.currentTime <= Math.max(0.05, crossfade)) {
        advanced.current = true;
        callbacks.current.onAdvance(1, callbacks.current.repeat);
      }
    }, 200);
    return () => clearInterval(timer);
  }, [crossfade]);
  return (
    <div className="local-playback">
      <audio
        crossOrigin="anonymous"
        ref={first}
        controls
        onPause={(event) => {
          if (event.currentTarget === engine.current?.active)
            engine.current.pause();
        }}
        style={{ display: active === 0 ? "block" : "none" }}
        onPlay={() => void engine.current?.context.resume()}
        onError={() =>
          callbacks.current.onError(
            "This audio format could not be decoded. Try another file.",
          )
        }
      />
      <audio
        crossOrigin="anonymous"
        ref={second}
        controls
        onPause={(event) => {
          if (event.currentTarget === engine.current?.active)
            engine.current.pause();
        }}
        style={{ display: active === 1 ? "block" : "none" }}
        onPlay={() => void engine.current?.context.resume()}
        onError={() =>
          callbacks.current.onError(
            "This audio format could not be decoded. Try another file.",
          )
        }
      />
      <div className="local-queue-controls">
        <button
          type="button"
          aria-label="Previous local track"
          onClick={() => onAdvance(-1, repeat)}
        >
          ⏮
        </button>
        <button
          type="button"
          aria-label="Next local track"
          onClick={() => onAdvance(1, repeat)}
        >
          ⏭
        </button>
        <label>
          <input
            type="checkbox"
            checked={repeat}
            onChange={(e) => setRepeat(e.target.checked)}
          />{" "}
          Repeat queue
        </label>
      </div>
    </div>
  );
}
