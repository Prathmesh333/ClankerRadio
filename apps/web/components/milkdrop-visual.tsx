"use client";
import { useEffect, useRef, useState, type RefObject } from "react";
import { gpuFrameGate } from "../lib/gpu-frame-gate";
import type { VisualAudio } from "../lib/visual-audio";
import { renderSize, DEFAULT_RENDER_QUALITY, type RenderQuality } from "../lib/render-quality";
import type { Visualizer } from "butterchurn";

// Butterchurn / MilkDrop: FFT-driven preset equations and feedback-frame warping.
export function MilkdropVisual({ player, reducedMotion, intensity, quality = DEFAULT_RENDER_QUALITY }: { player: RefObject<VisualAudio | null>; reducedMotion: boolean; intensity: number; quality?: RenderQuality }) {
  const [source, setSource] = useState<VisualAudio | null>(null);
  useEffect(() => {
    const sync = () => setSource(player.current);
    sync(); const timer = setInterval(sync, 250);
    return () => clearInterval(timer);
  }, [player]);
  const host = useRef<HTMLDivElement>(null);
  const qualityRef = useRef(quality), resizeRef = useRef<() => void>(() => {});
  useEffect(() => { qualityRef.current = quality; resizeRef.current(); }, [quality]);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let idleContext: AudioContext | null = null;
    let starting = false, cancelled = false, frame = 0, current: VisualAudio | null = null;
    let visualizer: Visualizer | null = null, canvas: HTMLCanvasElement | null = null;
    let observer: ResizeObserver | null = null, nextChange = 0, previous = "";
    let names: string[] = [], presets: Record<string, unknown> = {};
    let gate: ReturnType<typeof gpuFrameGate> | null = null;
    const change = () => {
      const choices = names.filter(name => name !== previous);
      previous = choices[Math.floor(Math.random() * choices.length)] ?? names[0];
      visualizer?.loadPreset(presets[previous], nextChange ? 3.5 : 0);
      element.dataset.preset = previous;
      nextChange = performance.now() + (18000 + Math.random() * 22000) / Math.max(.5, intensity);
    };
    const nextPreset = () => { if (visualizer && names.length) change(); };
    window.addEventListener("visualizer:preset-next", nextPreset);
    const start = async () => {
      if (visualizer || starting || cancelled) return;
      starting = true;
      current = source;
      try {
        const [engine, pack, extra, extra2] = await Promise.all([import("butterchurn"), import("butterchurn-presets"), import("butterchurn-presets/lib/butterchurnPresetsExtra.min.js"), import("butterchurn-presets/lib/butterchurnPresetsExtra2.min.js")]);
        if (cancelled) return;
        canvas = document.createElement("canvas");
        const initial = renderSize(element.clientWidth, element.clientHeight, qualityRef.current, devicePixelRatio);
        // Butterchurn does NOT size the DOM canvas. A default 300×150 buffer crops its viewport.
        canvas.width = initial.width; canvas.height = initial.height;
        visualizer = engine.default.createVisualizer(current?.context ?? (idleContext = new AudioContext()), canvas, { width: initial.width, height: initial.height, pixelRatio: 1, textureRatio: 1, outputFXAA: true });
        gate = gpuFrameGate(canvas.getContext("webgl2")!);
        presets = { ...pack.default.getPresets(), ...extra.default.getPresets(), ...extra2.default.getPresets() }; names = Object.keys(presets);
        element.dataset.presetCount = String(names.length);
        if (current) visualizer.connectAudio(current.analyser);
        element.dataset.source = current ? "music" : "silent-preview";
        element.appendChild(canvas);
        change();
        const resize = () => {
          if (!canvas || !visualizer) return;
          const gl = canvas.getContext("webgl2");
          const size = renderSize(element.clientWidth, element.clientHeight, qualityRef.current, devicePixelRatio, gl?.getParameter(gl.MAX_TEXTURE_SIZE) ?? 8192);
          element.dataset.resolution = `${size.width}×${size.height}`;
          element.dataset.quality = qualityRef.current;
          if (canvas.width === size.width && canvas.height === size.height) return;
          canvas.width = size.width; canvas.height = size.height;
          visualizer.setRendererSize(size.width, size.height, { pixelRatio: 1, textureRatio: 1 });
        };
        resizeRef.current = resize;
        observer = new ResizeObserver(resize); observer.observe(element); resize();
        window.addEventListener("resize", resize);
        let rendered = 0;
        const silent = new Uint8Array(1024).fill(128);
        const render = () => {
          if (cancelled) return;
          frame = requestAnimationFrame(render);
          if (document.hidden || (reducedMotion && rendered >= 2) || !gate?.ready()) return;
          try {
            if (!reducedMotion && performance.now() > nextChange) change();
            visualizer?.render(current ? undefined : { audioLevels: { timeByteArray: silent, timeByteArrayL: silent, timeByteArrayR: silent } }); rendered++; gate?.submitted();
          } catch (error) { element.dataset.error = String(error); canvas?.remove(); cancelAnimationFrame(frame); }
        };
        render();
      } catch (error) { element.dataset.fallback = String(error); canvas?.remove(); }
    };
    const poll = setInterval(() => { void start(); }, 500);
    void start();
    return () => {
      cancelled = true; window.removeEventListener("visualizer:preset-next", nextPreset); clearInterval(poll); cancelAnimationFrame(frame); observer?.disconnect();
      if (current && visualizer) {
        try { visualizer.disconnectAudio(current.analyser); }
        catch { /* The source may already have disconnected its audio graph. */ }
      }
      if (idleContext) void idleContext.close();
      gate?.dispose();
      canvas?.getContext("webgl2")?.getExtension("WEBGL_lose_context")?.loseContext();
      canvas?.remove();
      window.removeEventListener("resize", resizeRef.current); resizeRef.current = () => {};
    };
  }, [source, reducedMotion, intensity]);
  return <div className="milkdrop-canvas" ref={host} aria-label="Randomized MilkDrop visualization" />;
}
