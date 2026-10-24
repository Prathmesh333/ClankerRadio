import { test } from "node:test";
import assert from "node:assert/strict";
import { parseMusicSource, parseLyrics } from "../apps/web/lib/music-source.ts";

test("provider links preserve playlists and select safe embed hosts", () => {
  assert.match(parseMusicSource("https://youtu.be/abcdefghijk?list=PL1234567890").embed, /embed\/abcdefghijk\?list=PL1234567890/);
  assert.match(parseMusicSource("https://www.youtube.com/playlist?list=PL1234567890").embed, /videoseries/);
  assert.match(parseMusicSource("https://music.youtube.com/watch?v=abcdefghijk").embed, /youtube.com\/embed\/abcdefghijk/);
  assert.equal(parseMusicSource("https://open.spotify.com/playlist/1234567890123456789012?si=test").embed, "https://open.spotify.com/embed/playlist/1234567890123456789012");
  assert.match(parseMusicSource("https://music.apple.com/us/album/test/123?i=456").embed, /embed.music.apple.com\/us\/album\/test\/123\?i=456/);
  assert.match(parseMusicSource("https://soundcloud.com/user/sets/mix").embed, /w.soundcloud.com\/player/);
  assert.equal(parseMusicSource("https://example.com/song.mp3?token=abc").embed, null);
  for (const url of ["javascript:alert(1)", "https://youtube.com.evil.test/watch?v=abcdefghijk", "https://youtube.com/watch?v=bad", "https://open.spotify.com/user/me", "not a URL"]) assert.throws(() => parseMusicSource(url));
});
test("LRC supports fractional and repeated timestamps, metadata, and plain timing", () => {
  assert.deepEqual(parseLyrics("[ar:Artist]\n[00:04.50][01:02.03]First line\n[00:01.00]Opening"), { timed:true, cues:[{time:1,text:"Opening"},{time:4.5,text:"First line"},{time:62.03,text:"First line"}] });
  assert.deepEqual(parseLyrics("One\n\nTwo", 3), {timed:false,cues:[{time:0,text:"One"},{time:3,text:"Two"}]});
});


test("YouTube Music playlist embeds carry the local origin and specific playback errors", async () => {
  const { youtubeEmbedURL, youtubePlaybackError } = await import("../apps/web/lib/music-source.ts");
  const source = parseMusicSource("https://music.youtube.com/playlist?list=PLKBOD9JXe71Y&si=ps8pFHBWF0CUi6yU");
  const embed = new URL(youtubeEmbedURL(source.embed, "http://127.0.0.1:54321"));
  assert.equal(embed.searchParams.get("list"), "PLKBOD9JXe71Y");
  assert.equal(embed.searchParams.get("origin"), "http://127.0.0.1:54321");
  assert.equal(embed.searchParams.get("widget_referrer"), "http://127.0.0.1:54321/");
  assert.match(youtubePlaybackError(153), /origin or referrer/);
  assert.match(youtubePlaybackError(150), /owner does not allow/);
  assert.match(youtubePlaybackError(100), /private/);
});
