"use client";
import { useEffect, useRef, type RefObject } from "react";
import { DEFAULT_SPECTRUM, type SpectrumSettings } from "../lib/spectrum-settings";
import type { VisualAudio } from "../lib/visual-audio";

/** Reads the existing FFT without changing its routing, gain, or configuration. */
export function AudioSpectrum({ player, reducedMotion, settings = DEFAULT_SPECTRUM }: { player: RefObject<VisualAudio | null>; reducedMotion: boolean; settings?: SpectrumSettings }) {
  const options = useRef(settings);
  useEffect(() => { options.current = settings; }, [settings]);
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const element = canvas.current, context = element?.getContext("2d");
    if (!element || !context) return;
    const count = 80, levels = new Float32Array(count), peaks = new Float32Array(count);
    let bins = new Uint8Array(0), frame = 0, last = 0, width = 1, height = 1;
    const resize = () => {
      width = element.clientWidth; height = element.clientHeight;
      const ratio = Math.min(window.devicePixelRatio || 1, 3);
      element.width = Math.round(width * ratio); element.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    const observer = new ResizeObserver(resize); observer.observe(element); resize();
    const draw = (now: number) => {
      frame = requestAnimationFrame(draw);
      if (document.hidden || now - last < (reducedMotion ? 50 : 1000 / 40)) return;
      const elapsed = Math.min(100, now - (last || now)); last = now;
      const source = player.current, analyser = source?.analyser;
      const active = !!source && source.context.state === "running";
      if (analyser && active) {
        if (bins.length !== analyser.frequencyBinCount) bins = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(bins);
      }
      context.clearRect(0, 0, width, height);
      let total = 0;
      for (let i = 0; i < count; i++) {
        let target = 0;
        if (analyser && active && source) {
          const nyquist = source.context.sampleRate / 2, upper = Math.min(16000, nyquist);
          const from = Math.max(1, Math.floor(30 * Math.pow(upper / 30, i / count) / nyquist * bins.length));
          const to = Math.min(bins.length, Math.max(from + 1, Math.ceil(30 * Math.pow(upper / 30, (i + 1) / count) / nyquist * bins.length)));
          for (let j = from; j < to; j++) target = Math.max(target, bins[j] / 255);
          target = Math.pow(target, 1.4);
        }
        const speed = target > levels[i] ? 45 : 180;
        levels[i] += (target - levels[i]) * (1 - Math.exp(-elapsed / speed));
        peaks[i] = Math.max(levels[i], peaks[i] - elapsed / 1300);
        total += levels[i];
      }
      const option = options.current, thickness = Math.min(width, height) * option.size / 100;
      const paint = (x: number, y: number, length: number, rotation: number) => {
        context.save(); context.translate(x, y); context.rotate(rotation);
        const slot = length / count, gap = Math.max(1, slot * .26), barWidth = Math.max(1, slot - gap);
        const hue = (now / 180 + 175) % 360;
        const gradient = context.createLinearGradient(0, 0, 0, -thickness);
        gradient.addColorStop(0, `hsla(${hue},95%,58%,.28)`);
        gradient.addColorStop(.55, `hsla(${hue + 40},100%,72%,.85)`);
        gradient.addColorStop(1, "rgba(255,255,255,.95)"); context.fillStyle = gradient;
        for (let i = 0; i < count; i++) {
          const bin = option.mirror ? Math.min(count - 1, Math.floor(Math.abs((i + .5) / count * 2 - 1) * count)) : i;
          const barHeight = levels[bin] * thickness * (reducedMotion ? .55 : .9);
          if (barHeight < .6) continue;
          context.fillRect(i * slot + gap / 2, -barHeight, barWidth, barHeight);
          if (!reducedMotion) context.fillRect(i * slot + gap / 2, -peaks[bin] * thickness * .9 - 3, barWidth, 2);
        }
        context.restore();
      };
      const horizontal = width * option.width / 100, vertical = height * option.width / 100;
      const position = option.position;
      if (["bottom", "top-bottom", "all"].includes(position)) paint((width - horizontal) / 2, height - 3, horizontal, 0);
      if (["top", "top-bottom", "all"].includes(position)) paint((width + horizontal) / 2, 3, horizontal, Math.PI);
      if (["left", "left-right", "all"].includes(position)) paint(3, (height - vertical) / 2, vertical, Math.PI / 2);
      if (["right", "left-right", "all"].includes(position)) paint(width - 3, (height + vertical) / 2, vertical, -Math.PI / 2);
      if (position === "custom") paint((width - horizontal) * option.x / 100, thickness + (height - thickness) * option.y / 100, horizontal, 0);
      element.dataset.position = position; element.dataset.mirror = String(option.mirror);
      element.dataset.level = (total / count).toFixed(3);
      element.dataset.source = active ? "music" : "silent";
    };
    frame = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [player, reducedMotion]);
  return <canvas ref={canvas} className="audio-spectrum" aria-hidden="true" />;
}
