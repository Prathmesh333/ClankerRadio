export type Beat = {
  bpm: number;
  strength: number;
  downbeat: boolean;
  count: number;
};
export class BeatTracker {
  private floor = 0.05;
  private last = -10000;
  private count = 0;
  private index = -1;
  private intervals: number[] = [];
  sample(now: number, bass: number, knownBpm = 0, position = 0): Beat | null {
    this.floor = this.floor * 0.96 + bass * 0.04;
    if (knownBpm > 30 && knownBpm < 250) {
      const index = Math.floor((position * knownBpm) / 60);
      if (bass < 0.015 || index === this.index) return null;
      this.index = index;
      this.last = now;
      this.count = index + 1;
      return {
        bpm: knownBpm,
        strength: bass,
        downbeat: index % 4 === 0,
        count: this.count,
      };
    }
    if (bass < 0.07 || bass < this.floor * 1.35 || now - this.last < 260)
      return null;
    const interval = now - this.last;
    if (interval > 280 && interval < 1500) {
      this.intervals.push(interval > 800 ? interval / 2 : interval);
      if (this.intervals.length > 8) this.intervals.shift();
    }
    this.last = now;
    this.count++;
    const sorted = [...this.intervals].sort((a, b) => a - b),
      period = sorted[Math.floor(sorted.length / 2)] || 500;
    return {
      bpm: Math.round(60000 / period),
      strength: bass,
      downbeat: (this.count - 1) % 4 === 0,
      count: this.count,
    };
  }
}
