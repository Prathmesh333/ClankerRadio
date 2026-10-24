"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_SPECTRUM, type SpectrumSettings } from "./spectrum-settings";
import type { VisualMode } from "./visual-modes";
import type { RenderQuality } from "./render-quality";
import { api } from "./performance-types";
export type PlayerPreferences = {
  mode: VisualMode;
  quality: RenderQuality;
  intensity: number;
  autoEnergy: boolean;
  spectrum: boolean;
  spectrumSettings: SpectrumSettings;
  gentleMotion: boolean | null;
  showLyrics: boolean;
  beatSync: boolean;
  crossfadeS: number;
  volume: number;
  recordFormat: "landscape" | "portrait" | "square";
  visualSeed: number;
};
export const DEFAULT_PREFERENCES: PlayerPreferences = {
  mode: "random",
  quality: "native",
  intensity: 0.8,
  autoEnergy: true,
  spectrum: true,
  spectrumSettings: DEFAULT_SPECTRUM,
  gentleMotion: null,
  showLyrics: true,
  beatSync: true,
  crossfadeS: 3,
  volume: 0.8,
  recordFormat: "landscape",
  visualSeed: 42,
};
export type ScenePreset = {
  id: string;
  name: string;
  preferences: PlayerPreferences;
};
export function usePlayerSettings() {
  const [preferences, setPreferences] =
      useState<PlayerPreferences>(DEFAULT_PREFERENCES),
    [ready, setReady] = useState(false),
    [error, setError] = useState("");
  const dirty = useRef<Partial<PlayerPreferences>>({}),
    saved = useRef("");
  const updatePreferences = useCallback((patch: Partial<PlayerPreferences>) => {
    dirty.current = { ...dirty.current, ...patch };
    setPreferences((value) => ({ ...value, ...patch }));
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/settings/player", {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not restore player settings.");
        const value = (await response.json()) as PlayerPreferences;
        if (controller.signal.aborted) return;
        saved.current = JSON.stringify(value);
        setPreferences({ ...DEFAULT_PREFERENCES, ...value, ...dirty.current });
        setReady(true);
      })
      .catch((error) => {
        if (error.name !== "AbortError") setError(error.message);
      });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (!ready) return;
    const encoded = JSON.stringify(preferences);
    if (encoded === saved.current) return;
    const timer = setTimeout(() => {
      void api<PlayerPreferences>("/settings/player", preferences)
        .then(() => {
          saved.current = encoded;
          setError("");
        })
        .catch((error) => setError(error.message));
    }, 500);
    return () => clearTimeout(timer);
  }, [preferences, ready]);
  return { preferences, updatePreferences, ready, error };
}
