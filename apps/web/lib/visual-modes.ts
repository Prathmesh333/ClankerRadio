export const visualModes = {
  random: "Butterchurn · MilkDrop",
  randomizer: "Randomizer · all effects",
  geometry: "Three.js · Shape shuffle",
  galaxy: "Three.js · Particle galaxy",
  hyperspace: "Three.js · Neon tunnel",
  crystals: "Three.js · Crystal orbit",
  nebula: "Alchemy",
  aurora: "Silk waves",
  prism: "Kaleidoscope",
  solar: "Infinity tunnel",
};
export type VisualMode = keyof typeof visualModes;
export const DEFAULT_VISUAL_MODE: VisualMode = "random";
export const shapeModes = ["geometry", "galaxy", "hyperspace", "crystals"] as const;
export type ShapeMode = (typeof shapeModes)[number];
