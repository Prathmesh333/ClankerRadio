export type SpectrumPosition = "bottom" | "top" | "left" | "right" | "top-bottom" | "left-right" | "all" | "custom";
export type SpectrumSettings = { position: SpectrumPosition; mirror: boolean; size: number; width: number; x: number; y: number };
export const DEFAULT_SPECTRUM: SpectrumSettings = { position: "bottom", mirror: false, size: 22, width: 94, x: 50, y: 85 };
