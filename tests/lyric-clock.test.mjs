import test from "node:test";
import assert from "node:assert/strict";
import {
  LyricPlaybackClock,
  lyricTimingKey,
  savedLyricOffset,
} from "../apps/web/lib/lyric-clock.ts";
test("clock honors playback speed and sample age without accumulating drift", () => {
  const clock = new LyricPlaybackClock();
  clock.update(
    { position: 10, playing: true, playbackRate: 0.5, sampledAtMs: 1000 },
    0,
    1100,
  );
  assert.equal(clock.read(2000), 11.05);
  clock.update({ position: 11, playing: true, playbackRate: 0.5 }, 2000, 3000);
  assert.equal(clock.read(4000), 12);
});
test("pause freezes, backwards seeks replace the anchor and track end clamps", () => {
  const clock = new LyricPlaybackClock();
  clock.update({ position: 40, playing: false }, 0, 0);
  assert.equal(clock.read(10000), 40);
  clock.update({ position: 5, playing: true, duration: 8 }, 10000, 0);
  assert.equal(clock.read(11000), 6);
  assert.equal(clock.read(20000), 8);
  clock.clear();
  assert.equal(clock.read(), null);
});
test("timing adjustments delay early lyrics and stay separate by recording", () => {
  const key = lyricTimingKey({
    title: "Song",
    artist: "Artist",
    duration: 200,
  });
  const other = lyricTimingKey({
    title: "Song",
    artist: "Artist",
    duration: 250,
  });
  const offsets = savedLyricOffset({}, key, -3);
  assert.equal(12 + offsets[key], 9);
  assert.equal(offsets[other], undefined);
  assert.equal(savedLyricOffset(offsets, key, -999)[key], -120);
  const many = Object.fromEntries(
    Array.from({ length: 128 }, (_, i) => [String(i), i / 10]),
  );
  assert.equal(Object.keys(savedLyricOffset(many, key, -1)).length, 128);
});
