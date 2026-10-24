const { createHash } = require("node:crypto");
const {
  createWriteStream,
  existsSync,
  mkdirSync,
  renameSync,
  unlinkSync,
} = require("node:fs");
const { Readable, Transform } = require("node:stream");
const { pipeline } = require("node:stream/promises");
const path = require("node:path");
const REPOSITORY = "Prathmesh333/ClankerRadio";
function parseVersion(value) {
  const match = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(value || "");
  return match ? match.slice(1).map(Number) : null;
}
function newer(candidate, current) {
  const a = parseVersion(candidate),
    b = parseVersion(current);
  if (!a || !b) return false;
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] > b[i];
  }
  return false;
}
function releaseAsset(release, current) {
  const version = parseVersion(release.tag_name);
  if (!version || release.draft || release.prerelease) return null;
  const tag = release.tag_name,
    normalized = version.join("."),
    prefix = `https://github.com/${REPOSITORY}/releases/download/${encodeURIComponent(tag)}/`;
  const asset = (release.assets || []).find(
    (item) =>
      item.name === `Clanker-Radio-Setup-${normalized}.exe` &&
      typeof item.browser_download_url === "string" &&
      item.browser_download_url.startsWith(prefix) &&
      Number.isSafeInteger(item.size) &&
      item.size > 0 &&
      item.size < 600 * 1024 * 1024,
  );
  if (!asset || !newer(normalized, current)) return null;
  return {
    version: normalized,
    url: asset.browser_download_url,
    size: asset.size,
    digest: /^sha256:[a-f0-9]{64}$/i.test(asset.digest || "")
      ? asset.digest.slice(7).toLowerCase()
      : null,
    releaseUrl: `https://github.com/${REPOSITORY}/releases/tag/${encodeURIComponent(tag)}`,
  };
}
function createUpdater(app, data, onProgress) {
  let available = null,
    busy = false;
  return {
    async check() {
      available = null;
      const current = app.getVersion();
      const response = await fetch(
        `https://api.github.com/repos/${REPOSITORY}/releases/latest`,
        {
          headers: {
            Accept: "application/vnd.github+json",
            "User-Agent": "Clanker-Radio",
          },
          signal: AbortSignal.timeout(12000),
        },
      );
      if (response.status === 404)
        return {
          status: "no-release",
          current,
          message: "No public desktop release is published yet.",
        };
      if (!response.ok)
        throw new Error(
          `Update service returned ${response.status}. Try again later.`,
        );
      available = releaseAsset(await response.json(), current);
      return available
        ? {
            status: "available",
            current,
            version: available.version,
            verified: Boolean(available.digest),
            releaseUrl: available.releaseUrl,
            message: available.digest
              ? "A verified installer is available."
              : "Open the release page to download this update.",
          }
        : {
            status: "current",
            current,
            message: "You are using the latest published version.",
          };
    },
    async download() {
      if (busy) throw new Error("An update is already downloading.");
      if (!available?.digest)
        throw new Error(
          "Check for a release with a SHA-256 digest before installing.",
        );
      busy = true;
      const update = available,
        directory = path.join(data, "updates");
      mkdirSync(directory, { recursive: true });
      const temporary = path.join(directory, `${update.version}.exe.part`),
        destination = path.join(
          directory,
          `Clanker-Radio-Setup-${update.version}.exe`,
        );
      try {
        const response = await fetch(update.url, {
          signal: AbortSignal.timeout(15 * 60 * 1000),
        });
        if (!response.ok || !response.body)
          throw new Error("Installer download failed.");
        let bytes = 0,
          last = 0;
        const digest = createHash("sha256");
        const progress = new Transform({
          transform(chunk, encoding, callback) {
            bytes += chunk.length;
            if (bytes > update.size || bytes > 600 * 1024 * 1024)
              return callback(
                new Error("Installer size does not match the release."),
              );
            digest.update(chunk);
            if (Date.now() - last > 200) {
              last = Date.now();
              onProgress({ received: bytes, total: update.size });
            }
            callback(null, chunk);
          },
        });
        await pipeline(
          Readable.fromWeb(response.body),
          progress,
          createWriteStream(temporary),
        );
        if (bytes !== update.size || digest.digest("hex") !== update.digest)
          throw new Error("Installer checksum verification failed.");
        renameSync(temporary, destination);
        return destination;
      } finally {
        busy = false;
        if (existsSync(temporary)) unlinkSync(temporary);
      }
    },
  };
}
module.exports = { parseVersion, newer, releaseAsset, createUpdater };
