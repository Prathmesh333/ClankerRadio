// Blueprint types are generated from the source JSON Schema with npm run contracts.
export type { MusicalBlueprint } from './blueprint';
export type NoteEvent = { instrumentId: string; pitch: number; startBeat: number; durationBeats: number; velocity: number; phraseId: string };
export type Score = { events: NoteEvent[]; durationBeats: number; composerVersion: string };
export type Quality = { status: string; blockers: string[]; checks: Record<string, boolean>; notes: string[] };
export type Composition = { id: string; blueprint: import('./blueprint').MusicalBlueprint; score: Score; quality: Quality };
export type Job = { id: string; compositionId: string; status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED'; error: string | null; artifacts: Record<string, string> };
