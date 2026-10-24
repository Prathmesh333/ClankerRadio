import { api } from "./performance-types";
export type SavedMusicEntry = {
  id: string;
  kind: "link" | "file";
  title: string;
  provider: string;
  url: string;
  artist?: string;
  album?: string;
  artwork?: string;
  duration?: number;
  createdAt: string;
};
export function announceLibraryChange() {
  window.dispatchEvent(new Event("music-library:changed"));
}
export async function saveMusicLink(url: string, title = "") {
  const entry = await api<SavedMusicEntry>("/library/links", { url, title });
  announceLibraryChange();
  return entry;
}
export async function importMusicFile(file: File) {
  const response = await fetch(
    `/api/library/files?${new URLSearchParams({ name: file.name })}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/octet-stream" },
      body: file,
    },
  );
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.detail || "Music import failed.");
  }
  let entry = (await response.json()) as SavedMusicEntry;
  try {
    const { parseBlob } = await import("music-metadata");
    const metadata = await parseBlob(file, { duration: true });
    const picture = metadata.common.picture?.[0];
    let artwork = "";
    if (
      picture &&
      picture.data.length < 500000 &&
      ["image/jpeg", "image/png", "image/webp"].includes(picture.format)
    ) {
      let binary = "";
      for (let i = 0; i < picture.data.length; i += 8192)
        binary += String.fromCharCode(...picture.data.subarray(i, i + 8192));
      artwork = `data:${picture.format};base64,${btoa(binary)}`;
    }
    entry = await api<SavedMusicEntry>(`/library/${entry.id}/metadata`, {
      title: metadata.common.title || entry.title,
      artist: metadata.common.artist || "",
      album: metadata.common.album || "",
      duration: Number.isFinite(metadata.format.duration)
        ? metadata.format.duration
        : 0,
      artwork,
    });
  } catch {
    /* Audio remains playable when tags are absent or unsupported. */
  }
  announceLibraryChange();
  return entry;
}
