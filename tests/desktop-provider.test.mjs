import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { providerURL, providerNavigation } = require("../desktop/provider-url.cjs");
const { FiltersEngine, Request } = require("@ghostery/adblocker");

test("desktop music bridge accepts supported HTTPS providers and rejects arbitrary navigation", () => {
  assert.equal(providerURL("https://music.youtube.com/playlist?list=PLKBOD9JXe71Y"), "https://music.youtube.com/playlist?list=PLKBOD9JXe71Y");
  for (const url of ["javascript:alert(1)", "file:///C:/secret", "https://youtube.com.evil.org/", "https://user:password@youtube.com/", "https://youtube.com:8080/", "https://example.org/", "http://youtube.com/"])
    assert.throws(() => providerURL(url));
  assert.equal(providerNavigation("https://accounts.google.com/signin"), true);
  assert.equal(providerNavigation("https://accounts.google.com.evil.org/"), false);
});
test("ad filter engine blocks ad requests while preserving provider and local player requests", () => {
  const engine = FiltersEngine.parse("||doubleclick.net^\n@@||music.youtube.com^\n");
  const request = url => Request.fromRawDetails({ url, sourceUrl: "https://music.youtube.com/", type: "script" });
  assert.equal(engine.match(request("https://ad.doubleclick.net/ad.js")).match, true);
  assert.equal(engine.match(request("https://music.youtube.com/player.js")).match, false);
  assert.equal(engine.match(request("http://127.0.0.1:3000/api/health")).match, false);
});
