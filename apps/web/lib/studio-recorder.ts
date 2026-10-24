import type { VisualAudio } from "./visual-audio";
export type RecordingFormat = "landscape" | "portrait" | "square";
export const recordingSizes = {
  landscape: [1920, 1080],
  portrait: [1080, 1920],
  square: [1080, 1080],
} as const;
export class StudioRecorder {
  private canvas = document.createElement("canvas");
  private recorder: MediaRecorder | null = null;
  private frame = 0;
  private chunks: Blob[] = [];
  private bytes = 0;
  private last = 0;
  private audioContext: AudioContext | null = null;
  private audioSink: MediaStreamAudioDestinationNode | null = null;
  private links = new Map<
    VisualAudio,
    {
      destination: MediaStreamAudioDestinationNode;
      input: MediaStreamAudioSourceNode;
    }
  >();
  private stage: HTMLElement | null = null;
  private stream: MediaStream | null = null;
  private startTime = 0;
  private videoTrack: CanvasCaptureMediaStreamTrack | null = null;
  private silence: ConstantSourceNode | null = null;
  get elapsed() {
    return (performance.now() - this.startTime) / 1000;
  }
  async start(
    format: RecordingFormat,
    source: () => VisualAudio | null,
    target: () => HTMLElement | null,
    onFinish: (blob: Blob) => void,
    onError: (message: string) => void,
  ) {
    if (this.recorder) throw new Error("Recording is already running.");
    if (!window.MediaRecorder)
      throw new Error("Video recording is unavailable in this browser.");
    const [width, height] = recordingSizes[format];
    this.canvas.width = width;
    this.canvas.height = height;
    const ctx = this.canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("Could not create the recording canvas.");
    this.audioContext = new AudioContext();
    await this.audioContext.resume();
    this.audioSink = this.audioContext.createMediaStreamDestination();
    const silence = this.audioContext.createConstantSource(),
      mute = this.audioContext.createGain();
    silence.offset.value = 0;
    mute.gain.value = 0;
    silence.connect(this.audioSink);
    silence.connect(mute);
    mute.connect(this.audioContext.destination);
    silence.start();
    this.silence = silence;
    const video = this.canvas.captureStream(0);
    this.videoTrack =
      video.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack;
    this.stream = new MediaStream([
      ...video.getVideoTracks(),
      ...this.audioSink.stream.getAudioTracks(),
    ]);
    const mime = [
      "video/webm;codecs=vp8,opus",
      "video/webm;codecs=vp9,opus",
      "video/webm",
    ].find((type) => MediaRecorder.isTypeSupported(type));
    if (!mime) {
      await this.cleanup();
      throw new Error("No supported video recorder codec was found.");
    }
    this.recorder = new MediaRecorder(this.stream, {
      mimeType: mime,
      videoBitsPerSecond: 6000000,
      audioBitsPerSecond: 192000,
    });
    this.recorder.ondataavailable = (event) => {
      if (event.data.size) {
        this.chunks.push(event.data);
        this.bytes += event.data.size;
        if (this.bytes > 500 * 1024 * 1024) {
          onError(
            "Recording saved at the 500 MB memory limit. Start a new clip to continue.",
          );
          this.stop();
        }
      }
    };
    this.recorder.onerror = () => {
      onError("The video encoder stopped. Try Performance render quality.");
      this.stop();
    };
    this.recorder.onstop = () => {
      const blob = new Blob(this.chunks, { type: "video/webm" });
      this.chunks = [];
      void this.cleanup();
      onFinish(blob);
    };
    document.documentElement.dataset.recordingCapture = "true";
    this.startTime = performance.now();
    this.last = 0;
    this.bytes = 0;
    const draw = (now: number) => {
      this.frame = requestAnimationFrame(draw);
      if (now - this.last < 1000 / 30) return;
      this.last = now;
      const stage = target();
      if (stage !== this.stage) {
        if (this.stage) delete this.stage.dataset.recordFormat;
        this.stage = stage;
        if (stage) stage.dataset.recordFormat = format;
      }
      for (const [previous, link] of this.links) {
        if (previous.context.state === "closed") {
          link.input.disconnect();
          link.destination.stream.getTracks().forEach((track) => track.stop());
          this.links.delete(previous);
        }
      }
      const audio = source();
      if (
        audio &&
        audio.context.state !== "closed" &&
        !this.links.has(audio) &&
        this.audioSink &&
        this.audioContext
      ) {
        const destination = audio.context.createMediaStreamDestination();
        audio.analyser.connect(destination);
        const input = this.audioContext.createMediaStreamSource(
          destination.stream,
        );
        input.connect(this.audioSink);
        this.links.set(audio, { destination, input });
      }
      if (!stage) return;
      const bounds = stage.getBoundingClientRect();
      if (bounds.width < 1 || bounds.height < 1) return;
      ctx.fillStyle = "#050505";
      ctx.fillRect(0, 0, width, height);
      const scale = Math.min(width / bounds.width, height / bounds.height),
        x = (width - bounds.width * scale) / 2,
        y = (height - bounds.height * scale) / 2;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(scale, scale);
      for (const canvas of stage.querySelectorAll<HTMLCanvasElement>(
        ".performance-canvas canvas,.milkdrop-canvas canvas,.audio-spectrum",
      )) {
        const box = canvas.getBoundingClientRect();
        try {
          ctx.globalAlpha = Number(getComputedStyle(canvas).opacity) || 1;
          ctx.drawImage(
            canvas,
            box.left - bounds.left,
            box.top - bounds.top,
            box.width,
            box.height,
          );
        } catch {
          /* A newly mounted renderer can miss its first recording frame. */
        }
      }
      ctx.globalAlpha = 1;
      for (const block of stage.querySelectorAll<HTMLElement>(
        ".kinetic-lyrics p,.kinetic-lyrics small",
      )) {
        if (!block.textContent?.trim()) continue;
        const style = getComputedStyle(block),
          box = block.getBoundingClientRect();
        ctx.fillStyle = style.backgroundColor;
        ctx.beginPath();
        ctx.roundRect(
          box.left - bounds.left,
          box.top - bounds.top,
          box.width,
          box.height,
          10,
        );
        ctx.fill();
        const words = block.querySelectorAll<HTMLElement>("span"),
          parts = words.length ? Array.from(words) : [block];
        for (const word of parts) {
          const rect = word.getBoundingClientRect(),
            font = getComputedStyle(word);
          ctx.font = `${font.fontStyle} ${font.fontWeight} ${font.fontSize} ${font.fontFamily}`;
          ctx.textAlign = "left";
          ctx.textBaseline = "top";
          ctx.lineJoin = "round";
          ctx.lineWidth = 3;
          ctx.strokeStyle = "#090a0d";
          ctx.fillStyle = font.color;
          const text = word.textContent?.trim() || "";
          ctx.strokeText(
            text,
            rect.left - bounds.left,
            rect.top - bounds.top + parseFloat(font.fontSize) * 0.08,
            rect.width,
          );
          ctx.fillText(
            text,
            rect.left - bounds.left,
            rect.top - bounds.top + parseFloat(font.fontSize) * 0.08,
            rect.width,
          );
        }
      }
      ctx.restore();
      this.videoTrack?.requestFrame();
    };
    this.frame = requestAnimationFrame(draw);
    this.recorder.start(1000);
  }
  async dispose() {
    if (this.recorder && this.recorder.state !== "inactive") this.stop();
    else await this.cleanup();
  }
  stop() {
    if (this.recorder && this.recorder.state !== "inactive")
      this.recorder.stop();
  }
  private async cleanup() {
    delete document.documentElement.dataset.recordingCapture;
    cancelAnimationFrame(this.frame);
    if (this.stage) delete this.stage.dataset.recordFormat;
    this.stage = null;
    for (const [source, link] of this.links) {
      try {
        source.analyser.disconnect(link.destination);
      } catch {}
      link.input.disconnect();
      link.destination.stream.getTracks().forEach((track) => track.stop());
    }
    this.links.clear();
    this.silence?.stop();
    this.silence?.disconnect();
    this.silence = null;
    this.videoTrack = null;
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    if (this.audioContext && this.audioContext.state !== "closed")
      await this.audioContext.close();
    this.audioContext = null;
    this.audioSink = null;
    this.recorder = null;
  }
}
