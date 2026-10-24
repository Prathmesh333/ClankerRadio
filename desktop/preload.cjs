const { contextBridge, ipcRenderer } = require("electron");
if (process.isMainFrame) contextBridge.exposeInMainWorld("clankerDesktop", {
  openMusic: url => ipcRenderer.invoke("clanker:open-music", url),
  checkUpdates: () => ipcRenderer.invoke("clanker:check-updates"),
  installUpdate: () => ipcRenderer.invoke("clanker:install-update"),
  onUpdateProgress: callback => { const listener=(_event,value)=>callback({received:value.received,total:value.total}); ipcRenderer.on("clanker:update-progress",listener); return()=>ipcRenderer.removeListener("clanker:update-progress",listener); },
  closeMusic: () => ipcRenderer.invoke("clanker:close-music"),
});
