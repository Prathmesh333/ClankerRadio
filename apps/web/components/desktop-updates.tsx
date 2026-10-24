"use client";
import { useEffect, useState } from "react";
import type { UpdateInfo } from "../lib/desktop";
export function DesktopUpdates() {
  const [info, setInfo] = useState<UpdateInfo | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [progress, setProgress] = useState(0);
  useEffect(
    () =>
      window.clankerDesktop?.onUpdateProgress((value) =>
        setProgress(Math.round((value.received / value.total) * 100)),
      ),
    [],
  );
  async function check() {
    setBusy(true);
    setError("");
    try {
      if (!window.clankerDesktop)
        throw new Error("Update checks are available in the desktop app.");
      setInfo(await window.clankerDesktop.checkUpdates());
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function install() {
    setBusy(true);
    setError("");
    try {
      await window.clankerDesktop?.installUpdate();
    } catch (error) {
      setError((error as Error).message);
      setBusy(false);
    }
  }
  return (
    <section className="desktop-updates">
      <h3>App updates</h3>
      <button type="button" disabled={busy} onClick={() => void check()}>
        Check for updates
      </button>
      {info && (
        <p role="status">
          Version {info.current} · {info.message}
        </p>
      )}
      {info?.status === "available" &&
        (info.verified ? (
          <button type="button" disabled={busy} onClick={() => void install()}>
            Install version {info.version}
          </button>
        ) : (
          <a href={info.releaseUrl} target="_blank" rel="noreferrer">
            Open release page ↗
          </a>
        ))}
      {busy && progress > 0 && (
        <progress aria-label="Installer download" value={progress} max={100} />
      )}{" "}
      {error && <p role="status">{error}</p>}
    </section>
  );
}
