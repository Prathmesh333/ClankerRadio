const providers = new Set(["youtube.com", "www.youtube.com", "music.youtube.com", "youtu.be", "open.spotify.com", "music.apple.com", "soundcloud.com", "www.soundcloud.com"]);
function providerURL(value) {
  if (typeof value !== "string" || value.length > 4096) throw new Error("Invalid music link.");
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || url.port || !providers.has(url.hostname))
    throw new Error("Only supported HTTPS music providers can open in the desktop player.");
  return url.href;
}
function providerNavigation(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.port && (providers.has(url.hostname) || ["accounts.google.com", "accounts.spotify.com", "idmsa.apple.com", "appleid.apple.com"].includes(url.hostname));
  } catch { return false; }
}
module.exports = { providerURL, providerNavigation };
