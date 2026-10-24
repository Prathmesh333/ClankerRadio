"use client";
import { useEffect, useRef, useState, type InputHTMLAttributes } from "react";
import { api } from "../lib/performance-types";
import { importMusicFile, type SavedMusicEntry } from "../lib/saved-music";
export function SavedMusicLibrary({
  onPlay,
}: {
  onPlay(entry: SavedMusicEntry, queue: SavedMusicEntry[]): void;
}) {
  const [items, setItems] = useState<SavedMusicEntry[]>([]),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const files = useRef<HTMLInputElement>(null),
    folder = useRef<HTMLInputElement>(null);
  useEffect(() => {
    let active = true;
    const refresh = () =>
      void api<SavedMusicEntry[]>("/library")
        .then((value) => {
          if (active) {
            setItems(value);
            setError("");
          }
        })
        .catch((error) => {
          if (active) setError(error.message);
        });
    refresh();
    window.addEventListener("music-library:changed", refresh);
    return () => {
      active = false;
      window.removeEventListener("music-library:changed", refresh);
    };
  }, []);
  async function upload(list: FileList | null) {
    if (!list) return;
    const selected = Array.from(list).filter((file) =>
      /\.(mp3|wav|ogg|m4a|aac|flac|opus)$/i.test(file.name),
    );
    setBusy(true);
    let failed = 0;
    for (let i = 0; i < selected.length; i++) {
      setStatus(`Importing ${i + 1} of ${selected.length}…`);
      try {
        await importMusicFile(selected[i]);
      } catch (error) {
        failed++;
        setError((error as Error).message);
      }
    }
    setStatus(
      `${selected.length - failed} file${selected.length - failed === 1 ? "" : "s"} imported${failed ? ` · ${failed} failed` : ""}`,
    );
    setBusy(false);
  }
  const visible = items.filter((item) =>
    `${item.title} ${item.artist || ""} ${item.provider}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <section
      className="saved-music-library"
      aria-label="Saved music library"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        if (!busy) void upload(event.dataTransfer.files);
      }}
    >
      <div className="saved-music-heading">
        <h3>Saved music</h3>
        <span>{items.length} saved</span>
      </div>
      <p>
        Links save automatically. Import audio files or drop them here to keep a
        local copy.
      </p>
      <div className="saved-music-import">
        <button
          type="button"
          disabled={busy}
          onClick={() => files.current?.click()}
        >
          Import files
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => folder.current?.click()}
        >
          Import folder
        </button>
      </div>
      <input
        hidden
        ref={files}
        type="file"
        accept=".mp3,.wav,.ogg,.m4a,.aac,.flac,.opus"
        multiple
        onChange={(event) => {
          void upload(event.target.files);
          event.target.value = "";
        }}
      />
      <input
        hidden
        ref={folder}
        type="file"
        {...({ webkitdirectory: "" } as InputHTMLAttributes<HTMLInputElement>)}
        multiple
        onChange={(event) => {
          void upload(event.target.files);
          event.target.value = "";
        }}
      />
      {status && <p role="status">{status}</p>}
      {error && <p role="alert">{error}</p>}
      {!!items.length && (
        <input
          aria-label="Search saved music"
          placeholder="Search saved music"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      )}
      <div className="saved-music-list">
        {visible.map((item) => (
          <article key={item.id} className="saved-music-item">
            {item.artwork && (
              <div
                className="saved-music-art"
                role="img"
                aria-label={`${item.title} artwork`}
                style={{ backgroundImage: `url("${item.artwork}")` }}
              />
            )}
            <div>
              <input
                aria-label={`Name for ${item.title}`}
                defaultValue={item.title}
                maxLength={200}
                onBlur={(event) => {
                  const title = event.target.value.trim();
                  if (!title || title === item.title) return;
                  void api<SavedMusicEntry>(`/library/${item.id}/metadata`, {
                    title,
                    artist: item.artist || "",
                    album: item.album || "",
                    duration: item.duration || 0,
                    artwork: item.artwork || "",
                  })
                    .then((value) =>
                      setItems((items) =>
                        items.map((old) => (old.id === value.id ? value : old)),
                      ),
                    )
                    .catch((error) => setError(error.message));
                }}
              />
              <small>
                {item.artist ? `${item.artist} · ` : ""}
                {item.provider}
              </small>
            </div>
            <button
              type="button"
              aria-label={`Play saved ${item.title}`}
              onClick={() => onPlay(item, visible)}
            >
              Play
            </button>
            <button
              type="button"
              aria-label={`Remove saved ${item.title}`}
              onClick={() =>
                void api(`/library/${item.id}/remove`, {})
                  .then(() =>
                    setItems((items) =>
                      items.filter((old) => old.id !== item.id),
                    ),
                  )
                  .catch((error) => setError(error.message))
              }
            >
              ×
            </button>
          </article>
        ))}
      </div>
      {!items.length && !error && (
        <p>Your saved tracks and playlists will appear here.</p>
      )}
    </section>
  );
}
