import { test } from "node:test";
import assert from "node:assert/strict";
import { renderSize } from "../apps/web/lib/render-quality.ts";

test("buffer follows display dimensions and DPR without a 300×150 default", () => {
  assert.deepEqual(renderSize(1178,818,"native",1),{width:1178,height:818});
  assert.deepEqual(renderSize(1178,818,"native",2),{width:2356,height:1636});
});
test("UHD preserves landscape, portrait and square framing inside GPU limits", () => {
  for (const [w,h] of [[1920,1080],[1178,818],[366,820],[600,600]]) {
    const size=renderSize(w,h,"uhd");
    assert.ok(size.width<=3840 && size.height<=2160);
    assert.ok(Math.abs(size.width/size.height-w/h)<.001);
    assert.ok(size.width===3840 || size.height===2160);
  }
  assert.deepEqual(renderSize(1920,1080,"uhd",1,1024),{width:1024,height:576});
});
