export type MusicSource = { provider: string; url: string; embed: string | null };

export function parseMusicSource(input: string): MusicSource {
  let url: URL;
  try { url = new URL(input.trim()); } catch { throw new Error("Paste a complete music URL, starting with https://."); }
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("Use an HTTP or HTTPS music link.");
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (["youtube.com", "music.youtube.com", "youtu.be", "youtube-nocookie.com"].includes(host)) {
    const list = url.searchParams.get("list");
    const video = host === "youtu.be" ? url.pathname.slice(1) : url.searchParams.get("v") ?? url.pathname.match(/^\/(?:shorts|embed)\/([\w-]+)/)?.[1];
    if (list && !/^[\w-]{10,100}$/.test(list)) throw new Error("Invalid YouTube playlist ID.");
    if (video && !/^[\w-]{11}$/.test(video)) throw new Error("Invalid YouTube video ID.");
    if (!list && !video) throw new Error("Use a YouTube video or playlist link.");
    const embed = new URL(`https://www.youtube.com/embed/${video ?? "videoseries"}`);
    if (list) { embed.searchParams.set("list", list); embed.searchParams.set("listType", "playlist"); }
    embed.searchParams.set("enablejsapi", "1");
    return { provider: "YouTube", url: url.href, embed: embed.href };
  }
  if (host === "open.spotify.com") {
    const match = url.pathname.match(/^\/(?:intl-[a-z]+\/)?(track|album|playlist|episode)\/([a-zA-Z0-9]{22})\/?$/);
    if (!match) throw new Error("Use a Spotify track, album or playlist link (expand shortened links first).");
    return { provider: "Spotify", url: url.href, embed: `https://open.spotify.com/embed/${match[1]}/${match[2]}` };
  }
  if (host === "music.apple.com") {
    if (!/^\/[a-z]{2}\/(album|song|playlist|station)\//.test(url.pathname)) throw new Error("Use an Apple Music song, album or playlist link.");
    const embed = new URL(url.href); embed.hostname = "embed.music.apple.com";
    return { provider: "Apple Music", url: url.href, embed: embed.href };
  }
  if (host === "soundcloud.com") return { provider: "SoundCloud", url: url.href, embed: `https://w.soundcloud.com/player/?url=${encodeURIComponent(url.href)}&auto_play=false` };
  if (/\.(mp3|wav|ogg|m4a|aac|flac|opus)$/i.test(url.pathname)) return { provider: "Audio link", url: url.href, embed: null };
  throw new Error("Supported: YouTube, Spotify, Apple Music, SoundCloud, or a direct audio URL. Short links must be expanded first.");
}

export type LyricCue = { time: number; text: string };
export function parseLyrics(text: string, lineSeconds = 4): { cues: LyricCue[]; timed: boolean } {
  const cues: LyricCue[] = [];
  let plain = 0;
  const timed = /^\s*\[\d+:\d+(?:\.\d+)?\]/m.test(text);
  for (const line of text.split(/\r?\n/)) {
    const stamps = [...line.matchAll(/\[(\d+):(\d+(?:\.\d+)?)\]/g)];
    const words = line.replace(/\[[^\]]*\]/g, "").trim();
    if (!words) continue;
    if (stamps.length) for (const stamp of stamps) cues.push({ time: Number(stamp[1]) * 60 + Number(stamp[2]), text: words });
    else if (!timed) cues.push({ time: plain++ * lineSeconds, text: words });
  }
  return { cues: cues.sort((a, b) => a.time - b.time), timed };
}

/** Bind API messages and the HTTP referrer to the actual local player origin. */
export function youtubeEmbedURL(embed: string, origin: string): string {
  const url = new URL(embed);
  url.searchParams.set("origin", new URL(origin).origin);
  url.searchParams.set("widget_referrer", new URL(origin).origin + "/");
  return url.href;
}
export function youtubePlaybackError(code: number): string {
  const errors: Record<number, string> = {
    2: "YouTube rejected the video or playlist parameters.",
    5: "YouTube could not play this format in the embedded player.",
    100: "This YouTube item is unavailable, removed, or private.",
    101: "The owner does not allow this item to play in an embedded player.",
    150: "The owner does not allow this item to play in an embedded player.",
    153: "YouTube rejected the embedded player's origin or referrer.",
  };
  return `${errors[code] ?? "YouTube could not load this playlist item."} (YouTube ${code || "unknown"}) Open the desktop player or watch on YouTube.`;
}
