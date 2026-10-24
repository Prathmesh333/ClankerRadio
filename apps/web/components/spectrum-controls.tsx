"use client";
import { useId } from "react";
import type { SpectrumSettings, SpectrumPosition } from "../lib/spectrum-settings";
export function SpectrumControls({ enabled, onEnabled, settings, onSettings }: { enabled: boolean; onEnabled(value: boolean): void; settings: SpectrumSettings; onSettings(value: SpectrumSettings): void }) {
  const id = useId();
  const update = (patch: Partial<SpectrumSettings>) => onSettings({ ...settings, ...patch });
  return <div className="spectrum-controls">
    <label className="check-label"><input type="checkbox" checked={enabled} onChange={e => onEnabled(e.target.checked)} /> Audio spectrum bars</label>
    {enabled && <>
      <label htmlFor={`${id}-position`}>Spectrum position</label>
      <select id={`${id}-position`} value={settings.position} onChange={e => update({ position: e.target.value as SpectrumPosition })}>
        <option value="bottom">Bottom</option><option value="top">Top</option><option value="left">Left</option><option value="right">Right</option>
        <option value="top-bottom">Top + bottom</option><option value="left-right">Left + right</option><option value="all">All four sides</option><option value="custom">Custom position</option>
      </select>
      <label className="check-label"><input type="checkbox" checked={settings.mirror} onChange={e => update({ mirror: e.target.checked })} /> Mirror spectrum</label>
      <label htmlFor={`${id}-size`}>Bar height · {settings.size}%</label>
      <input id={`${id}-size`} type="range" min="5" max="45" value={settings.size} onChange={e => update({ size: Number(e.target.value) })} />
      <label htmlFor={`${id}-width`}>Spectrum width · {settings.width}%</label>
      <input id={`${id}-width`} type="range" min="20" max="100" value={settings.width} onChange={e => update({ width: Number(e.target.value) })} />
      {settings.position === "custom" && <>
        <label htmlFor={`${id}-x`}>Horizontal position · {settings.x}%</label><input id={`${id}-x`} type="range" min="0" max="100" value={settings.x} onChange={e => update({ x: Number(e.target.value) })} />
        <label htmlFor={`${id}-y`}>Vertical position · {settings.y}%</label><input id={`${id}-y`} type="range" min="0" max="100" value={settings.y} onChange={e => update({ y: Number(e.target.value) })} />
      </>}
    </>}
  </div>;
}
