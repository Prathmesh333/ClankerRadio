import type {
  Patch,
  Performance,
  PerformanceNote,
  VisualSignal,
} from "./performance-types";

export class PerformancePlayer {
  readonly instrumentIds: string[];
  readonly context: AudioContext;
  readonly analyser: AnalyserNode;
  readonly signal: VisualSignal = {
    time: 0,
    low: 0,
    mid: 0,
    high: 0,
    rms: 0,
    playing: false,
    activity: {},
  };
  private master: GainNode;
  private buses = new Map<string, GainNode>();
  private waves = new Map<string, PeriodicWave>();
  private patches: Map<string, Patch>;
  private nodes = new Set<AudioScheduledSourceNode>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private started = 0;
  private cursor = 0;
  private offset = 0;
  private performance: Performance | null = null;
  private ended = false;
  private frequency: Uint8Array<ArrayBuffer>;
  private waveform: Float32Array<ArrayBuffer>;
  private noise: AudioBuffer;
  onEnded: (() => void) | null = null;

  constructor(patches: Patch[]) {
    this.instrumentIds = patches.map((patch) => patch.id);
    this.context = new AudioContext({ sampleRate: 48000 });
    const ctx = this.context;
    this.patches = new Map(patches.map((p) => [p.id, p]));
    this.master = ctx.createGain();
    this.master.gain.value = 0.8;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -8;
    limiter.knee.value = 10;
    limiter.ratio.value = 8;
    limiter.attack.value = 0.008;
    limiter.release.value = 0.25;
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 512;
    this.analyser.smoothingTimeConstant = 0.85;
    this.master.connect(limiter);
    limiter.connect(this.analyser);
    this.analyser.connect(ctx.destination);
    const reverb = ctx.createConvolver();
    const impulse = ctx.createBuffer(2, ctx.sampleRate * 3, ctx.sampleRate);
    let seed = 7291;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let channel = 0; channel < 2; channel++) {
      const data = impulse.getChannelData(channel);
      for (let i = 0; i < data.length; i++)
        data[i] = (random() * 2 - 1) * Math.pow(1 - i / data.length, 3) * 0.45;
    }
    reverb.buffer = impulse;
    const wet = ctx.createGain();
    wet.gain.value = 0.23;
    reverb.connect(wet);
    wet.connect(this.master);
    const delay = ctx.createDelay(2);
    delay.delayTime.value = 0.375;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.19;
    const delayWet = ctx.createGain();
    delayWet.gain.value = 0.08;
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(delayWet);
    delayWet.connect(this.master);
    for (const patch of patches) {
      const bus = ctx.createGain();
      bus.gain.value = 1;
      const pan = ctx.createStereoPanner();
      pan.pan.value = patch.pan;
      bus.connect(pan);
      pan.connect(this.master);
      pan.connect(reverb);
      pan.connect(delay);
      this.buses.set(patch.id, bus);
      const real = new Float32Array(16),
        imag = new Float32Array(16);
      patch.partials.forEach((value, index) => {
        imag[index + 1] = value;
      });
      this.waves.set(patch.id, ctx.createPeriodicWave(real, imag));
    }
    this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const noise = this.noise.getChannelData(0);
    for (let i = 0; i < noise.length; i++) noise[i] = random() * 2 - 1;
    this.frequency = new Uint8Array(this.analyser.frequencyBinCount);
    this.waveform = new Float32Array(this.analyser.fftSize);
  }

  async unlock() {
    await this.context.resume();
  }
  stop() {
    this.halt();
    this.offset = 0;
    this.signal.time = 0;
  }
  seek(seconds: number) {
    if (!this.performance) return;
    const target = Math.max(
      0,
      Math.min(seconds, this.performance.durationS - 0.1),
    );
    if (this.signal.playing) this.play(this.performance, target);
    else {
      this.offset = target;
      this.signal.time = target;
    }
  }
  volume(value: number) {
    this.master.gain.setTargetAtTime(value, this.context.currentTime, 0.04);
  }
  mute(instrument: string, muted: boolean) {
    this.buses
      .get(instrument)
      ?.gain.setTargetAtTime(muted ? 0 : 1, this.context.currentTime, 0.04);
  }
  get position() {
    return this.signal.playing
      ? this.context.currentTime - this.started
      : this.offset;
  }

  play(performance: Performance, offset = 0) {
    this.halt();
    this.performance = performance;
    this.offset = offset;
    this.started = this.context.currentTime - offset;
    this.cursor = 0;
    this.ended = false;
    this.signal.playing = true;
    while (
      this.cursor < performance.events.length &&
      (performance.events[this.cursor].startBeat * 60) / performance.tempoBpm <
        offset
    )
      this.cursor++;
    this.tick();
    this.timer = setInterval(() => this.tick(), 80);
  }

  private tick() {
    const performance = this.performance;
    if (!performance || !this.signal.playing) return;
    const position = this.position;
    while (this.cursor < performance.events.length) {
      const event = performance.events[this.cursor];
      const seconds = (event.startBeat * 60) / performance.tempoBpm;
      if (seconds > position + 0.35) break;
      if (seconds >= position - 0.12)
        this.note(
          event,
          Math.max(this.context.currentTime + 0.006, this.started + seconds),
          (event.durationBeats * 60) / performance.tempoBpm,
        );
      this.cursor++;
    }
    if (position >= performance.durationS && !this.ended) {
      this.ended = true;
      this.pause();
      this.offset = 0;
      this.onEnded?.();
    }
  }

  private source(node: AudioScheduledSourceNode, start: number, stop: number) {
    this.nodes.add(node);
    node.onended = () => {
      this.nodes.delete(node);
      node.disconnect();
    };
    node.start(start);
    node.stop(stop);
  }

  private note(event: PerformanceNote, start: number, duration: number) {
    const patch = this.patches.get(event.instrumentId),
      bus = this.buses.get(event.instrumentId);
    if (!patch || !bus) return;
    const ctx = this.context;
    const frequency = 440 * Math.pow(2, (event.pitch - 69) / 12);
    const envelope = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value =
      patch.family === "strings"
        ? 2700
        : patch.family === "winds"
          ? 3500
          : 6200;
    filter.Q.value = 0.45;
    const electronic = !!this.performance && !["luminous", "dawn", "nocturne", "cosmic"].includes(this.performance.mood);
    const drum = patch.id === "frame_drum", hat = patch.id === "shaker", snare = electronic && patch.id === "marimba";
    const amplitude = electronic ? (drum ? .65 : snare ? .25 : hat ? .12 : patch.role === "bass" ? .19 : .045) * event.velocity / 127 : ((patch.gain * event.velocity) / 127) * .4;
    if (electronic) filter.frequency.value = drum ? 500 : hat ? 8000 : 1800 + event.velocity * 32;
    const attack = Math.min(electronic ? .004 : patch.attack, duration * 0.3),
      decay = Math.min(electronic ? .12 : patch.decay, duration * 0.4);
    envelope.gain.setValueAtTime(0, start);
    envelope.gain.linearRampToValueAtTime(amplitude, start + attack);
    envelope.gain.exponentialRampToValueAtTime(
      Math.max(0.0001, amplitude * (electronic ? .3 : patch.sustain)),
      start + attack + decay,
    );
    envelope.gain.setTargetAtTime(
      0.0001,
      start + duration,
      electronic ? .025 : Math.max(0.015, patch.release / 4),
    );
    envelope.connect(filter);
    filter.connect(bus);
    const stop = start + duration + (electronic ? .2 : patch.release) + 0.1;
    if (patch.id === "shaker" || snare) {
      const source = ctx.createBufferSource();
      source.buffer = this.noise;
      source.loop = true;
      filter.type = "highpass";
      filter.frequency.value = snare ? 1200 : 6500;
      source.connect(envelope);
      this.source(source, start, stop);
    } else {
      const oscillator = ctx.createOscillator();
      if (electronic) oscillator.type = drum ? "sine" : patch.role === "bass" ? "sawtooth" : ["lead", "answer"].includes(patch.role) ? "sawtooth" : "triangle";
      else oscillator.setPeriodicWave(this.waves.get(patch.id)!);
      oscillator.frequency.setValueAtTime(electronic && drum ? 155 : frequency, start);
      if (patch.id === "frame_drum")
        oscillator.frequency.exponentialRampToValueAtTime(
          electronic ? 45 : frequency * 0.45,
          start + 0.12,
        );
      oscillator.connect(envelope);
      this.source(oscillator, start, stop);
      if (!electronic && ["winds", "strings"].includes(patch.family)) {
        const vibrato = ctx.createOscillator(),
          depth = ctx.createGain();
        vibrato.frequency.value = 4.6 + (event.pitch % 3) * 0.15;
        depth.gain.value = patch.family === "strings" ? 5 : 2;
        vibrato.connect(depth);
        depth.connect(oscillator.detune);
        this.source(vibrato, start, stop);
      }
      if (
        ["bells", "celesta", "electric_piano", "vibraphone", "sitar"].includes(
          patch.id,
        )
      ) {
        const overtone = ctx.createOscillator(),
          gain = ctx.createGain();
        overtone.frequency.value =
          frequency *
          (patch.id === "bells"
            ? 2.76
            : patch.id === "electric_piano"
              ? 3.01
              : 2.005);
        gain.gain.setValueAtTime(0.22, start);
        gain.gain.exponentialRampToValueAtTime(0.001, stop);
        overtone.connect(gain);
        gain.connect(envelope);
        this.source(overtone, start, stop);
      }
    }
    // Release effect nodes after all sources finish; nodes never accumulate across performances.
    const cleanup = ctx.createConstantSource();
    cleanup.offset.value = 0;
    cleanup.onended = () => {
      envelope.disconnect();
      filter.disconnect();
      cleanup.disconnect();
      this.nodes.delete(cleanup);
    };
    this.nodes.add(cleanup);
    cleanup.start(start);
    cleanup.stop(stop + 0.05);
  }

  sample(): VisualSignal {
    this.analyser.getByteFrequencyData(this.frequency);
    this.analyser.getFloatTimeDomainData(this.waveform);
    const average = (a: number, b: number) => {
      let sum = 0;
      for (let i = a; i < b; i++) sum += this.frequency[i];
      return sum / (b - a) / 255;
    };
    let power = 0;
    for (const value of this.waveform) power += value * value;
    this.signal.rms = Math.sqrt(power / this.waveform.length);
    this.signal.low = average(0, 5);
    this.signal.mid = average(5, 40);
    this.signal.high = average(40, 160);
    this.signal.time = this.position;
    const activity: Record<string, number> = {};
    if (this.performance && this.signal.playing) {
      const beat = (this.position * this.performance.tempoBpm) / 60;
      for (const event of this.performance.events) {
        if (event.startBeat > beat) break;
        if (event.startBeat + event.durationBeats > beat)
          activity[event.instrumentId] = Math.max(
            activity[event.instrumentId] ?? 0,
            event.velocity / 127,
          );
      }
    }
    this.signal.activity = activity;
    return this.signal;
  }

  pause() {
    this.offset = this.position;
    this.halt();
  }
  private halt() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    for (const node of this.nodes) {
      try {
        node.stop();
      } catch {
        /* Source already stopped. */
      }
    }
    this.nodes.clear();
    this.signal.playing = false;
  }
  async dispose() {
    this.halt();
    await this.context.close();
  }
}
