import type { VisualAudio } from "./visual-audio";
import type { VisualSignal } from "./performance-types";
export class MediaDeck implements VisualAudio {
  readonly context = new AudioContext();
  readonly analyser = this.context.createAnalyser();
  private gains: GainNode[];
  private inputs: MediaElementAudioSourceNode[];
  private master = this.context.createGain();
  private bins = new Uint8Array(256);
  private deck = 0;
  private generation = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  constructor(private elements: HTMLAudioElement[]) {
    this.analyser.fftSize = 512;
    this.analyser.smoothingTimeConstant = 0.75;
    this.gains = elements.map(() => this.context.createGain());
    this.inputs = elements.map((element, i) => {
      const input = this.context.createMediaElementSource(element);
      input.connect(this.gains[i]);
      this.gains[i].connect(this.master);
      this.gains[i].gain.value = 0;
      return input;
    });
    const limiter = this.context.createDynamicsCompressor();
    limiter.threshold.value = -3;
    limiter.ratio.value = 12;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.15;
    this.master.connect(limiter);
    limiter.connect(this.analyser);
    this.analyser.connect(this.context.destination);
  }
  get index() {
    return this.deck;
  }
  get active() {
    return this.elements[this.deck];
  }
  volume(value: number) {
    this.master.gain.setTargetAtTime(value, this.context.currentTime, 0.04);
  }
  async load(url: string, crossfade: number) {
    const generation = ++this.generation;
    if (this.timer) clearTimeout(this.timer);
    const old = this.deck,
      next = 1 - old,
      previous = this.elements[old],
      element = this.elements[next];
    element.pause();
    element.src = url;
    element.load();
    await this.context.resume();
    try {
      await element.play();
    } catch (error) {
      this.deck = next;
      this.gains[next].gain.value = 1;
      this.gains[old].gain.value = 0;
      previous.pause();
      throw error;
    }
    if (generation !== this.generation) {
      element.pause();
      return this.deck;
    }
    this.deck = next;
    const now = this.context.currentTime,
      seconds = previous.paused ? 0 : crossfade;
    for (const gain of this.gains) {
      gain.gain.cancelAndHoldAtTime(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
    }
    const incoming = new Float32Array(64),
      outgoing = new Float32Array(64),
      oldLevel = this.gains[old].gain.value;
    for (let i = 0; i < 64; i++) {
      incoming[i] = Math.sin(((i / 63) * Math.PI) / 2);
      outgoing[i] = oldLevel * Math.cos(((i / 63) * Math.PI) / 2);
    }
    if (seconds > 0.05) {
      this.gains[next].gain.setValueCurveAtTime(incoming, now + 0.005, seconds);
      this.gains[old].gain.setValueCurveAtTime(outgoing, now + 0.005, seconds);
      this.timer = setTimeout(
        () => {
          if (generation === this.generation) previous.pause();
        },
        seconds * 1000 + 80,
      );
    } else {
      this.gains[next].gain.setValueAtTime(1, now);
      this.gains[old].gain.setValueAtTime(0, now);
      previous.pause();
    }
    return next;
  }
  pause() {
    for (const element of this.elements) element.pause();
  }
  sample(): VisualSignal {
    this.analyser.getByteFrequencyData(this.bins);
    const band = (a: number, b: number) =>
      this.bins.slice(a, b).reduce((sum, x) => sum + x, 0) / ((b - a) * 255);
    return {
      time: this.active.currentTime,
      low: band(0, 12),
      mid: band(12, 90),
      high: band(90, 256),
      rms: band(0, 256),
      playing: !this.active.paused,
      activity: {},
    };
  }
  async close() {
    ++this.generation;
    if (this.timer) clearTimeout(this.timer);
    this.pause();
    this.inputs.forEach((input) => input.disconnect());
    this.gains.forEach((gain) => gain.disconnect());
    if (this.context.state !== "closed") await this.context.close();
  }
}
