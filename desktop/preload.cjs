const { contextBridge, ipcRenderer } = require("electron");
if (process.isMainFrame) contextBridge.exposeInMainWorld("clankerDesktop", {
  openMusic: url => ipcRenderer.invoke("clanker:open-music", url),
  closeMusic: () => ipcRenderer.invoke("clanker:close-music"),
});
