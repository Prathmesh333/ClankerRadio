export type Patch = {
  id: string;
  name: string;
  family: string;
  role: string;
  program: number;
  partials: number[];
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  gain: number;
  pan: number;
  low: number;
  high: number;
  color: string;
};
export type PerformanceNote = {
  instrumentId: string;
  pitch: number;
  startBeat: number;
  durationBeats: number;
  velocity: number;
  phraseId: string;
};
export type Performance = {
  favorite?: boolean;
  id: string;
  title: string;
  seed: number;
  tempoBpm: number;
  mood: string;
  durationBeats: number;
  durationS: number;
  instrumentIds: string[];
  sections: { id: string; startBeat: number; endBeat: number }[];
  events: PerformanceNote[];
  plan: {
    intention: string;
    tonic: number;
    mode: string;
    parts: {
      instrumentId: string;
      role: string;
      gain: number;
      entry: number;
      exit: number;
    }[];
  };
  provenance: { source: string; reviewScope: string; arenaId?: string };
};
export type Arena = {
  id: string;
  status: string;
  stage: string;
  round: number;
  callsCompleted: number;
  callsPlanned: number;
  error: string | null;
  performanceId: string | null;
  verdict: {
    winner: string;
    scoreA: number;
    scoreB: number;
    approved: boolean;
    reasoning: string;
  } | null;
  history: {
    round: number;
    critiques?: Record<
      string,
      {
        musicalCoherence: number;
        orchestration: number;
        development: number;
        findings: string[];
        revisions: string[];
      }
    >;
  }[];
};
export type Station = {
  running: boolean;
  useCodex: boolean;
  queued: number;
  generated: number;
  error: string | null;
  arenaId: string | null;
  queue: { id: string; title: string; source: string }[];
};
export type VisualSignal = {
  time: number;
  low: number;
  mid: number;
  high: number;
  rms: number;
  playing: boolean;
  activity: Record<string, number>;
};

export async function api<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(
    `/api${path}`,
    body === undefined
      ? { cache: "no-store" }
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
  );
  if (!response.ok) {
    const payload = await response
      .json()
      .catch(() => ({ detail: "The service did not respond." }));
    throw new Error(
      typeof payload.detail === "string"
        ? payload.detail
        : "Check the musical brief and retry.",
    );
  }
  return response.json();
}
