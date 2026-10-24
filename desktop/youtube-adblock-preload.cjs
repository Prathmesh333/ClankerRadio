// Original targeted player-data filtering; architecture reference: Pear Desktop's do-not-track plugin.
const { contextBridge, ipcRenderer } = require("electron");
const youtubeHosts = new Set(["youtube.com", "www.youtube.com", "music.youtube.com", "youtube-nocookie.com", "www.youtube-nocookie.com"]);
if (location.protocol === "https:" && youtubeHosts.has(location.hostname) && ipcRenderer.sendSync("clanker:ad-blocking-enabled")) {
  contextBridge.executeInMainWorld({ func: function installYouTubeAdFilter() {
    const marker = Symbol.for("clanker.youtube.ad-filter");
    if (window[marker]) return;
    Object.defineProperty(window, marker, { value: true });
    function prune(value, seen = new WeakSet()) {
      if (!value || typeof value !== "object" || Array.isArray(value) || seen.has(value)) return value;
      seen.add(value);
      for (const key of ["playerAds", "adPlacements", "adSlots"]) {
        if (Object.getOwnPropertyDescriptor(value, key)?.configurable) delete value[key];
      }
      for (const key of ["playerResponse", "ytInitialPlayerResponse"]) {
        if (value[key] && typeof value[key] === "object") prune(value[key], seen);
      }
      return value;
    }
    JSON.parse = new Proxy(JSON.parse, {
      apply(target, receiver, args) { return prune(Reflect.apply(target, receiver, args)); },
    });
    Response.prototype.json = new Proxy(Response.prototype.json, {
      apply(target, receiver, args) { return Reflect.apply(target, receiver, args).then(value => prune(value)); },
    });
    for (const key of ["ytInitialPlayerResponse", "playerResponse"]) {
      const descriptor = Object.getOwnPropertyDescriptor(window, key);
      if (descriptor && !descriptor.configurable) continue;
      let value = prune(descriptor?.get ? descriptor.get.call(window) : window[key]);
      Object.defineProperty(window, key, {
        configurable: true, enumerable: descriptor?.enumerable ?? true,
        get() { return prune(descriptor?.get ? descriptor.get.call(window) : value); },
        set(next) {
          const filtered = prune(next);
          if (descriptor?.set) descriptor.set.call(window, filtered); else value = filtered;
        },
      });
    }
  } });
}
