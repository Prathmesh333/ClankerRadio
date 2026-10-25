export type SessionClockSample = {
  position: number;
  duration?: number;
  playing: boolean;
  playbackRate?: number;
  sampledAtMs?: number;
};
/** Anchor each server observation, then interpolate with a monotonic clock. */
export class LyricPlaybackClock {
  private anchor: {
    position: number;
    at: number;
    rate: number;
    duration: number;
  } | null = null;
  update(
    sample: SessionClockSample,
    at = performance.now(),
    wallTime = Date.now(),
  ) {
    const rate = sample.playing ? Math.max(0, sample.playbackRate ?? 1) : 0;
    const age = sample.sampledAtMs
      ? Math.max(0, Math.min(2, (wallTime - sample.sampledAtMs) / 1000))
      : 0;
    this.anchor = {
      position: sample.position + age * rate,
      at,
      rate,
      duration: sample.duration ?? 0,
    };
  }
  read(at = performance.now()) {
    if (!this.anchor) return null;
    const value =
      this.anchor.position +
      (Math.max(0, at - this.anchor.at) / 1000) * this.anchor.rate;
    return Math.max(
      0,
      this.anchor.duration > 0 ? Math.min(value, this.anchor.duration) : value,
    );
  }
  clear() {
    this.anchor = null;
  }
}
export function lyricTimingKey(track: {
  title: string;
  artist: string;
  duration: number;
}) {
  if (!track.title.trim()) return "";
  return `${track.artist.trim().toLowerCase()}|${track.title.trim().toLowerCase()}|${Math.round(track.duration)}`.slice(
    0,
    600,
  );
}
export function savedLyricOffset(
  offsets: Record<string, number>,
  key: string,
  value: number,
) {
  if (!key) return offsets;
  return {
    ...Object.fromEntries(
      Object.entries(offsets)
        .filter(([id]) => id !== key)
        .slice(-127),
    ),
    [key]: Math.max(-120, Math.min(120, Math.round(value * 4) / 4)),
  };
}
