import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import fs from "node:fs";
const source = fs.readFileSync(new URL("../desktop/youtube-adblock-preload.cjs", import.meta.url), "utf8");
function fixture(host = "music.youtube.com", enabled = true) {
  const context = vm.createContext({ location: { protocol: "https:", hostname: host },
    require: () => ({ ipcRenderer: { sendSync: () => enabled }, contextBridge: { executeInMainWorld: ({func}) => func() } }) });
  vm.runInContext("window=globalThis; Response=class { constructor(data){this.data=data} json(){return Promise.resolve(this.data)} }", context);
  vm.runInContext(source, context);
  return context;
}
test("YouTube ad metadata is removed while music data and JSON revivers survive", async () => {
  const context = fixture();
  const result = vm.runInContext(`JSON.parse('{"playerAds":[1],"adPlacements":[2],"adSlots":[3],"videoDetails":{"videoId":"music"},"streamingData":{"formats":[1]},"playerResponse":{"adSlots":[4],"playabilityStatus":{"status":"OK"}}}')`,context);
  assert.equal(result.playerAds, undefined); assert.equal(result.adPlacements, undefined); assert.equal(result.adSlots, undefined);
  assert.equal(result.videoDetails.videoId, "music"); assert.equal(result.streamingData.formats.length, 1);
  assert.equal(result.playerResponse.adSlots, undefined); assert.equal(result.playerResponse.playabilityStatus.status, "OK");
  assert.equal(vm.runInContext(`JSON.parse('{"a":2}',(key,value)=>key==='a'?value*3:value).a`, context),6);
  assert.throws(() => vm.runInContext("JSON.parse('invalid')",context));
  const response = await vm.runInContext("new Response({playerAds:[1],videoDetails:{videoId:'music'}}).json()", context);
  assert.equal(response.playerAds, undefined); assert.equal(response.videoDetails.videoId,"music");
  assert.equal(vm.runInContext("window.ytInitialPlayerResponse={playerAds:[1],videoDetails:{videoId:'initial'}}; window.ytInitialPlayerResponse.playerAds",context),undefined);
});
test("other websites and disabled blocking remain untouched", () => {
  for (const context of [fixture("example.com"),fixture("music.youtube.com",false)])
    assert.equal(vm.runInContext(`JSON.parse('{"playerAds":[1]}').playerAds.length`, context),1);
});
