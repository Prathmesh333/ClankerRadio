const { readFileSync, writeFileSync, mkdirSync, statSync, existsSync, renameSync } = require("node:fs");
const path = require("node:path");
const previousWarnings = process.env.ELECTRON_DISABLE_SECURITY_WARNINGS;
const { ElectronBlocker } = require("@ghostery/adblocker-electron");
if (previousWarnings === undefined) delete process.env.ELECTRON_DISABLE_SECURITY_WARNINGS;
else process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = previousWarnings;

function createAdBlocker(session, resources, data) {
  const cache = path.join(data, "adblock"); mkdirSync(cache, { recursive: true });
  const engineFile = path.join(cache, "engine.bin"), settingsFile = path.join(cache, "settings.json");
  let enabled = true;
  try { enabled = JSON.parse(readFileSync(settingsFile, "utf8")).enabled !== false; } catch {}
  let blocker;
  try { blocker = ElectronBlocker.deserialize(new Uint8Array(readFileSync(engineFile))); }
  catch { blocker = ElectronBlocker.deserialize(new Uint8Array(readFileSync(path.join(resources, "adblock/engine.bin")))); }
  if (enabled) blocker.enableBlockingInSession(session);
  return {
    get enabled() { return enabled; },
    setEnabled(next) {
      if (next === enabled) return;
      if (next) blocker.enableBlockingInSession(session); else blocker.disableBlockingInSession(session);
      enabled = next;
      writeFileSync(settingsFile, JSON.stringify({ enabled }));
    },
    async refresh() {
      if (existsSync(engineFile) && Date.now() - statSync(engineFile).mtimeMs < 7 * 86400000) return;
      const updated = await ElectronBlocker.fromPrebuiltAdsOnly((url, options = {}) =>
        fetch(url, { ...options, signal: AbortSignal.timeout(10000) }));
      writeFileSync(engineFile + ".tmp", updated.serialize()); renameSync(engineFile + ".tmp", engineFile);
      // Activate updated filters on the next launch, preserving the active session's handlers.
    },
    dispose() { if (enabled) blocker.disableBlockingInSession(session); },
  };
}
module.exports = { createAdBlocker };
