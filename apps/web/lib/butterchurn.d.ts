declare module "butterchurn" {
  export interface Visualizer { connectAudio(node: AudioNode): void; disconnectAudio(node: AudioNode): void; loadPreset(preset: unknown, seconds: number): void; render(options?: { audioLevels: { timeByteArray: Uint8Array; timeByteArrayL: Uint8Array; timeByteArrayR: Uint8Array } }): void; setRendererSize(width: number, height: number, options?: { pixelRatio: number; textureRatio: number }): void; }
  const engine: { createVisualizer(context: AudioContext, canvas: HTMLCanvasElement, options: { width: number; height: number; pixelRatio: number; textureRatio?: number; outputFXAA?: boolean }): Visualizer };
  export default engine;
}
declare module "butterchurn-presets" { const presets: { getPresets(): Record<string, unknown> }; export default presets; }

declare module "butterchurn-presets/lib/butterchurnPresetsExtra.min.js" { const presets: { getPresets(): Record<string, unknown> }; export default presets; }
declare module "butterchurn-presets/lib/butterchurnPresetsExtra2.min.js" { const presets: { getPresets(): Record<string, unknown> }; export default presets; }
