import test from "node:test";
import assert from "node:assert/strict";
import {BeatTracker} from "../apps/web/lib/beat-tracker.ts";
test("known-tempo beat events follow musical time once per beat",()=>{const tracker=new BeatTracker();assert.equal(tracker.sample(0,.5,120,0).downbeat,true);assert.equal(tracker.sample(100,.5,120,.2),null);assert.equal(tracker.sample(500,.5,120,.5).count,2);assert.equal(tracker.sample(2000,.5,120,2).downbeat,true);});
test("onset tracking estimates tempo and stays quiet on silence",()=>{const tracker=new BeatTracker(),beats=[];for(let now=0;now<8000;now+=25){const beat=tracker.sample(now,now%500<25?.8:.015);if(beat)beats.push(beat);}assert.ok(beats.length>=14&&beats.length<=17);assert.ok(Math.abs(beats.at(-1).bpm-120)<3);const silence=new BeatTracker();for(let now=0;now<5000;now+=25)assert.equal(silence.sample(now,0),null);});
