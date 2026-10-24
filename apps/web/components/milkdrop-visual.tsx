"use client";
import { useEffect, useRef, useState, type RefObject } from "react";
import { gpuFrameGate } from "../lib/gpu-frame-gate";
import type { VisualEnergy } from "../lib/visual-energy";
import type { VisualAudio } from "../lib/visual-audio";
import { renderSize, DEFAULT_RENDER_QUALITY, type RenderQuality } from "../lib/render-quality";
import type { Visualizer } from "butterchurn";

// Butterchurn / MilkDrop: FFT-driven preset equations and feedback-frame warping.
export function MilkdropVisual({ player, reducedMotion, intensity, autoEnergy = true, beatSync = true, energy, quality = DEFAULT_RENDER_QUALITY }: { player: RefObject<VisualAudio | null>; reducedMotion: boolean; intensity: number; autoEnergy?: boolean; beatSync?: boolean; energy?: VisualEnergy; quality?: RenderQuality }) {
  const [source, setSource] = useState<VisualAudio | null>(null);
  useEffect(() => {
    const sync = () => setSource(player.current);
    sync(); const timer = setInterval(sync, 250);
    return () => clearInterval(timer);
  }, [player]);
  const settings = useRef({ intensity, autoEnergy, beatSync, energy });
  useEffect(() => { settings.current = { intensity, autoEnergy, beatSync, energy }; }, [intensity, autoEnergy, beatSync, energy]);
  const host = useRef<HTMLDivElement>(null);
  const qualityRef = useRef(quality), resizeRef = useRef<() => void>(() => {});
  useEffect(() => { qualityRef.current = quality; resizeRef.current(); }, [quality]);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let idleContext: AudioContext | null = null, visualGain: GainNode | null = null;
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
      nextChange = performance.now() + (18000 + Math.random() * 22000) / Math.max(.5, settings.current.energy?.value ?? settings.current.intensity);
    };
    const nextPreset = () => { if (visualizer && names.length) change(); };
    const onBeat=(event:Event)=>{if(settings.current.beatSync&&!reducedMotion&&(event as CustomEvent).detail.downbeat&&performance.now()>nextChange)change();};
    window.addEventListener("music:beat",onBeat);
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
        canvas.getContext("webgl2", {preserveDrawingBuffer:true});
        visualizer = engine.default.createVisualizer(current?.context ?? (idleContext = new AudioContext()), canvas, { width: initial.width, height: initial.height, pixelRatio: 1, textureRatio: 1, outputFXAA: true });
        gate = gpuFrameGate(canvas.getContext("webgl2")!);
        presets = { ...pack.default.getPresets(), ...extra.default.getPresets(), ...extra2.default.getPresets() }; names = Object.keys(presets);
        element.dataset.presetCount = String(names.length);
        if (current) {
          visualGain = current.context.createGain();
          current.analyser.connect(visualGain);
          visualizer.connectAudio(visualGain);
        }
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
            const value = settings.current;
            const strength = value.energy?.sample(performance.now(), value.intensity, value.autoEnergy, reducedMotion) ?? value.intensity;
            element.dataset.energy = strength.toFixed(3);
            if (current && visualGain) visualGain.gain.setTargetAtTime(strength / .8, current.context.currentTime, .25);
            if (!reducedMotion && performance.now() > nextChange && (!settings.current.beatSync || performance.now()-nextChange>6000)) change();
            visualizer?.render(current ? undefined : { audioLevels: { timeByteArray: silent, timeByteArrayL: silent, timeByteArrayR: silent } }); rendered++; gate?.submitted();
          } catch (error) { element.dataset.error = String(error); canvas?.remove(); cancelAnimationFrame(frame); }
        };
        render();
      } catch (error) { element.dataset.fallback = String(error); canvas?.remove(); }
    };
    const poll = setInterval(() => { void start(); }, 500);
    void start();
    return () => {
      cancelled = true; window.removeEventListener("visualizer:preset-next", nextPreset); clearInterval(poll); cancelAnimationFrame(frame); observer?.disconnect(); window.removeEventListener("music:beat",onBeat);
      if (current && visualizer) {
        try { if (visualGain) { visualizer.disconnectAudio(visualGain); current.analyser.disconnect(visualGain); visualGain.disconnect(); } }
        catch { /* The source may already have disconnected its audio graph. */ }
      }
      if (idleContext) void idleContext.close();
      gate?.dispose();
      canvas?.getContext("webgl2")?.getExtension("WEBGL_lose_context")?.loseContext();
      canvas?.remove();
      window.removeEventListener("resize", resizeRef.current); resizeRef.current = () => {};
    };
  }, [source, reducedMotion]);
  return <div className="milkdrop-canvas" ref={host} aria-label="Randomized MilkDrop visualization" />;
}
