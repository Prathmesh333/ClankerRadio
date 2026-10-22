import type { VisualSignal } from "./performance-types";

export interface VisualAudio {
  context: AudioContext;
  analyser: AnalyserNode;
  sample(): VisualSignal;
}

export class ExternalAudio implements VisualAudio {
  readonly context = new AudioContext();
  readonly analyser = this.context.createAnalyser();
  private input: AudioNode;
  private sink = this.context.createGain();
  private data: Uint8Array<ArrayBuffer> = new Uint8Array(256);
  private scheduled = 0;
  constructor(source?: MediaStream | HTMLMediaElement) {
    this.analyser.fftSize = 512;
    this.input = source instanceof HTMLMediaElement ? this.context.createMediaElementSource(source) : source ? this.context.createMediaStreamSource(source) : this.context.createGain();
    this.input.connect(this.analyser);
    this.sink.gain.value = source instanceof HTMLMediaElement ? 1 : 0;
    this.analyser.connect(this.sink); this.sink.connect(this.context.destination);
  }
  feedPCM(encoded: string, sampleRate: number) {
    if (this.context.state === "closed") return;
    const binary = atob(encoded), bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const samples = new Float32Array(bytes.buffer);
    const buffer = this.context.createBuffer(1, samples.length, sampleRate);
    buffer.copyToChannel(samples, 0);
    const node = this.context.createBufferSource(); node.buffer = buffer; node.connect(this.input);
    this.scheduled = Math.max(this.context.currentTime + .02, Math.min(this.scheduled, this.context.currentTime + .15));
    node.start(this.scheduled); this.scheduled += buffer.duration; node.onended = () => node.disconnect();
  }
  sample(): VisualSignal {
    this.analyser.getByteFrequencyData(this.data);
    const band = (a: number, b: number) => this.data.slice(a, b).reduce((sum, x) => sum + x, 0) / ((b - a) * 255);
    return { time: this.context.currentTime, low: band(0, 12), mid: band(12, 90), high: band(90, 256), rms: band(0, 256), playing: this.context.state === "running", activity: {} };
  }
  async close() { if (this.context.state === "closed") return; this.input.disconnect(); this.analyser.disconnect(); this.sink.disconnect(); await this.context.close(); }
}
