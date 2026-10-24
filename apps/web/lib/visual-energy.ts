/** Smooth, bounded energy drift. Kept outside React so it never remounts a renderer. */
export class VisualEnergy {
  value = .8;
  private from = .8;
  private target = .8;
  private start = 0;
  private duration = 0;
  private automatic = false;
  private random: () => number;
  constructor(random: () => number = Math.random) { this.random = random; }
  sample(now: number, manual: number, auto: boolean, gentle: boolean): number {
    if (!auto || gentle) {
      this.automatic = false;
      this.value = Math.max(.1, Math.min(1.5, manual));
      return this.value;
    }
    if (!this.automatic || now >= this.start + this.duration) {
      this.from = this.value;
      this.target = .25 + this.random() * 1.2;
      // Avoid long runs of nearly identical intensity.
      if (Math.abs(this.target - this.from) < .2)
        this.target = this.from > .85 ? .3 : 1.35;
      this.start = now;
      this.duration = 4000 + this.random() * 7000;
      this.automatic = true;
    }
    const t = Math.max(0, Math.min(1, (now - this.start) / this.duration));
    const blend = t * t * (3 - 2 * t);
    this.value = this.from + (this.target - this.from) * blend;
    return this.value;
  }
}
