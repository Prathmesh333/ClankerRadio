import { createRequire } from "node:module";
import { mkdirSync, writeFileSync, existsSync, readFileSync, copyFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createHash } from "node:crypto";
const require = createRequire(new URL("../desktop/package.json", import.meta.url));
const { FiltersEngine } = require("@ghostery/adblocker");
const root = resolve(import.meta.dirname, "../build/desktop/adblock");
const sources = resolve(root, "sources");
mkdirSync(sources, { recursive: true });
if (!existsSync(resolve(root, "engine.bin")) || process.argv.includes("--refresh")) {
  const manifest = [];
  const capture = async (url, options = {}) => {
    const response = await fetch(url, { ...options, signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`Filter download failed: ${response.status}`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    const key = new URL(url).pathname.split("/assets/")[1];
    if (key && !key.includes("..")) {
      const target = resolve(sources, key); mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, bytes);
      manifest.push({ url, file: key, sha256: createHash("sha256").update(bytes).digest("hex") });
    }
    return new Response(bytes, { status: response.status, headers: response.headers });
  };
  const engine = await FiltersEngine.fromPrebuiltAdsOnly(capture);
  const gpl = await fetch("https://raw.githubusercontent.com/gorhill/uBlock/master/LICENSE.txt", { signal: AbortSignal.timeout(15000) });
  if (!gpl.ok) throw new Error("Could not obtain the filter-list GPL notice.");
  writeFileSync(resolve(sources, "GPL-3.0.txt"), await gpl.text());
  copyFileSync(resolve(dirname(require.resolve("@ghostery/adblocker/package.json")), "LICENSE"), resolve(sources, "MPL-2.0.txt"));
  writeFileSync(resolve(sources, "manifest.json"), JSON.stringify({ generatedAt: new Date().toISOString(), files: manifest }, null, 2));
  writeFileSync(resolve(root, "engine.bin"), engine.serialize());
}
const engine = FiltersEngine.deserialize(new Uint8Array(readFileSync(resolve(root, "engine.bin"))));
console.log("Ad blocker snapshot ready:", engine.getFilters().networkFilters.length, "network filters");
