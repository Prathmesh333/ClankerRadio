import test from "node:test";
import assert from "node:assert/strict";
import { VisualEnergy } from "../apps/web/lib/visual-energy.ts";

test("automatic energy evolves smoothly across the full range without abrupt jumps", () => {
  let flip = false;
  const energy = new VisualEnergy(() => { flip = !flip; return flip ? .99 : 0; });
  let previous = energy.sample(0, .8, true, false), min = previous, max = previous;
  for (let now = 10; now < 60000; now += 10) {
    const value = energy.sample(now, .8, true, false);
    assert.ok(value >= .1 && value <= 1.5);
    assert.ok(Math.abs(value - previous) < .01, "energy must not jump between randomized targets");
    previous = value; min = Math.min(min, value); max = Math.max(max, value);
  }
  assert.ok(max - min > .8);
});
test("manual and gentle motion suppress automatic variation and clamp invalid levels", () => {
  const energy = new VisualEnergy(() => 1);
  assert.equal(energy.sample(0, .4, false, false), .4);
  assert.equal(energy.sample(100000, .4, false, false), .4);
  assert.equal(energy.sample(200000, .6, true, true), .6);
  assert.equal(energy.sample(300000, .6, true, true), .6);
  assert.equal(energy.sample(400000, 9, false, false), 1.5);
  assert.equal(energy.sample(500000, -1, false, false), .1);
});
