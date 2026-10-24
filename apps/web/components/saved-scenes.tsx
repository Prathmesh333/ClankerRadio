"use client";
import { useEffect, useState } from "react";
import { api } from "../lib/performance-types";
import type { PlayerPreferences, ScenePreset } from "../lib/player-settings";
export function SavedScenes({
  preferences,
  onApply,
}: {
  preferences: PlayerPreferences;
  onApply(value: PlayerPreferences): void;
}) {
  const [scenes, setScenes] = useState<ScenePreset[]>([]),
    [name, setName] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    const refresh = () =>
      void api<ScenePreset[]>("/settings/presets")
        .then((items) => {
          if (active) setScenes(items);
        })
        .catch((error) => {
          if (active) setError(error.message);
        });
    refresh();
    window.addEventListener("player-scenes:changed", refresh);
    return () => {
      window.removeEventListener("player-scenes:changed", refresh);
      active = false;
    };
  }, []);
  async function save() {
    setBusy(true);
    try {
      await api("/settings/presets", { name, preferences });
      window.dispatchEvent(new Event("player-scenes:changed"));
      setName("");
      setError("");
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="saved-scenes">
      <summary>Saved visual scenes</summary>
      <div className="saved-scene-fields">
        <label>
          Scene name
          <input
            aria-label="Scene name"
            maxLength={60}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My late-night setup"
          />
        </label>
        <button
          type="button"
          disabled={busy || !name.trim()}
          onClick={() => void save()}
        >
          Save current scene
        </button>
        {!scenes.length && (
          <p>No scenes yet. Player settings are saved automatically.</p>
        )}
        {scenes.map((scene) => (
          <div key={scene.id} className="saved-scene-row">
            <button type="button" onClick={() => onApply(scene.preferences)}>
              {scene.name}
            </button>
            <button
              type="button"
              aria-label={`Delete scene ${scene.name}`}
              onClick={() =>
                void api(`/library/${scene.id}/remove`, {})
                  .then(() =>
                    window.dispatchEvent(new Event("player-scenes:changed")),
                  )
                  .catch((error) => setError(error.message))
              }
            >
              ×
            </button>
          </div>
        ))}
        {error && <p role="status">{error}</p>}
      </div>
    </details>
  );
}
