"use client";
import { useEffect, type RefObject } from "react";
import { BeatTracker } from "../lib/beat-tracker";
import type { VisualAudio } from "../lib/visual-audio";
export function BeatDirector({
  player,
  enabled,
  reducedMotion,
}: {
  player: RefObject<VisualAudio | null>;
  enabled: boolean;
  reducedMotion: boolean;
}) {
  useEffect(() => {
    if (!enabled || reducedMotion) return;
    let source: VisualAudio | null = null,
      tracker = new BeatTracker(),
      bins = new Uint8Array(0);
    const timer = setInterval(() => {
      const input = player.current;
      if (!input || input.context.state !== "running" || document.hidden)
        return;
      if (input !== source) {
        source = input;
        tracker = new BeatTracker();
        bins = new Uint8Array(input.analyser.frequencyBinCount);
      }
      input.analyser.getByteFrequencyData(bins);
      let bass = 0;
      for (let i = 1; i < Math.min(7, bins.length); i++)
        bass += bins[i] / (6 * 255);
      const musical = input as VisualAudio & {
        tempoBpm?: number;
        position?: number;
        signal?: { playing: boolean };
      };
      if (musical.signal && !musical.signal.playing) return;
      const beat = tracker.sample(
        performance.now(),
        bass,
        musical.tempoBpm || 0,
        musical.position || 0,
      );
      if (beat)
        window.dispatchEvent(new CustomEvent("music:beat", { detail: beat }));
    }, 25);
    return () => clearInterval(timer);
  }, [player, enabled, reducedMotion]);
  return null;
}
