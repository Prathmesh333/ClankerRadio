"use client";
import { useId } from "react";
export function VisualEnergyControl({ automatic, onAutomatic, value, onValue }: {
  automatic: boolean; onAutomatic(value: boolean): void;
  value: number; onValue(value: number): void;
}) {
  const id = useId();
  return <div className="visual-energy-control">
    <label className="check-label" htmlFor={`${id}-auto`}>
      <input id={`${id}-auto`} type="checkbox" checked={automatic} onChange={e => onAutomatic(e.target.checked)} />
      Auto visual energy
    </label>
    {automatic ? <p>Energy rises and falls smoothly in every theme. MilkDrop keeps shuffling its presets.</p>
      : <label htmlFor={`${id}-manual`}>Visual energy
        <input id={`${id}-manual`} type="range" min=".1" max="1.5" step=".05" value={value} onChange={e => onValue(Number(e.target.value))} />
      </label>}
  </div>;
}
