export const renderQualities = { native: "Display sharp", uhd: "UHD · 2160p", performance: "Performance" };
export type RenderQuality = keyof typeof renderQualities;
export const DEFAULT_RENDER_QUALITY: RenderQuality = "native";

// Preserve the viewport ratio at every quality. Resolution never changes framing.
export function renderSize(width: number, height: number, quality: RenderQuality, dpr = 1, maxTexture = 8192) {
  width = Math.max(1, width); height = Math.max(1, height);
  const scale = quality === "uhd" ? Math.min(3840 / width, 2160 / height)
    : quality === "performance" ? Math.min(1, 1280 / width, 720 / height)
    : Math.min(Math.max(1, dpr), 2, 3840 / width, 2160 / height);
  const safe = Math.min(scale, maxTexture / width, maxTexture / height);
  return { width: Math.max(1, Math.round(width * safe)), height: Math.max(1, Math.round(height * safe)) };
}
