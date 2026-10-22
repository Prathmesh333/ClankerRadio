"use client";
import { useEffect, useId, useRef } from "react";
import { visualModes, type VisualMode } from "../lib/visual-modes";
import { renderQualities, type RenderQuality } from "../lib/render-quality";

export function EffectsMenu({ mode, onMode, quality, onQuality, onRemix, external = false }: {
  mode: VisualMode; onMode(mode: VisualMode): void; quality: RenderQuality;
  onQuality(quality: RenderQuality): void; onRemix(): void; external?: boolean;
}) {
  const root = useRef<HTMLDetailsElement>(null), id = useId();
  useEffect(() => {
    const outside = (event: PointerEvent) => { if (root.current && !root.current.contains(event.target as Node)) root.current.open = false; };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && root.current?.open) { root.current.open = false; root.current.querySelector("summary")?.focus(); event.stopPropagation(); }
    };
    document.addEventListener("pointerdown", outside); document.addEventListener("keydown", escape, true);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape, true); };
  }, []);
  return <details ref={root} className="effects-menu">
    <summary aria-label={external ? "External effects menu" : "Effects menu"}><span aria-hidden="true">✺</span> Effects <span className="effect-value">{mode === "randomizer" ? "Randomizer" : mode === "random" ? "MilkDrop" : "Three.js"}</span><span aria-hidden="true">⌃</span></summary>
    <div className="effects-popup" role="group" aria-label="Visual effects settings">
      <div className="effects-heading"><span>PICTURE</span><small>Full frame · no crop</small></div>
      <label htmlFor={`${id}-effect`}>Effect</label>
      <select id={`${id}-effect`} aria-label={external ? "External visualizer theme" : "Visualizer theme"} value={mode} onChange={e => onMode(e.target.value as VisualMode)}>
        {Object.entries(visualModes).map(([key, label]) => <option value={key} key={key}>{label}</option>)}
      </select>
      <p className="effect-description">{mode === "randomizer" ? "Automatically explores every visual engine. A new effect every 28 seconds." : mode === "random" ? "367 MilkDrop presets, blended in real time." : "Live geometry, light and particles driven by your music."}</p>
      <div className="effects-divider" />
      <label htmlFor={`${id}-quality`}>Render quality</label>
      <select id={`${id}-quality`} aria-label="Render quality" value={quality} onChange={e => onQuality(e.target.value as RenderQuality)}>
        {Object.entries(renderQualities).map(([key, label]) => <option value={key} key={key}>{label}</option>)}
      </select>
      <p className="effect-description">{quality === "uhd" ? "Renders within 3840 × 2160, keeping the screen’s proportions. Uses more GPU power." : "Matches your screen without stretching a small image."}</p>
      <button type="button" className="effect-remix" aria-label={mode === "randomizer" ? "Next random effect" : "Remix visuals"} onClick={onRemix}>↻ {mode === "randomizer" ? "Next random effect" : "Remix visuals"}</button>
    </div>
  </details>;
}
