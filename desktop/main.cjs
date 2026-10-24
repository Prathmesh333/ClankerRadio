const { app, BrowserWindow, dialog, Menu, shell, utilityProcess, nativeTheme, session, ipcMain } = require("electron");
const { spawn } = require("node:child_process");
const { createServer } = require("node:net");
const { randomBytes } = require("node:crypto");
const { existsSync, mkdirSync, createWriteStream } = require("node:fs");
const path = require("node:path");

const { createAdBlocker } = require("./adblock.cjs");
const { providerURL, providerNavigation } = require("./provider-url.cjs");
app.setName("Clanker Radio");
nativeTheme.themeSource = "dark";
let window, providerWindow, providerSource, adblock, api, web, quitting = false, origin;
if (process.env.CLANKER_DESKTOP_DATA) {
  const customData = path.resolve(process.env.CLANKER_DESKTOP_DATA);
  mkdirSync(customData, { recursive: true }); app.setPath("userData", customData);
}
const single = app.requestSingleInstanceLock();
if (!single) app.quit();
app.on("second-instance", () => { if (window) { if (window.isMinimized()) window.restore(); window.focus(); } });
function freePort() {
  return new Promise((resolve, reject) => {
    const server = createServer(); server.on("error", reject);
    server.listen(0, "127.0.0.1", () => { const port = server.address().port; server.close(() => resolve(port)); });
  });
}
async function waitFor(url, headers = {}) {
  const deadline = Date.now() + 90000;
  while (Date.now() < deadline && !quitting) {
    try { const result = await fetch(url, { headers, signal: AbortSignal.timeout(1500) }); if (result.ok) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error("Local services did not start. See the desktop logs in the application data folder.");
}
function stop() {
  if (quitting) return;
  quitting = true;
  adblock?.dispose();
  if (web) web.kill();
  if (api?.pid) {
    if (process.platform === "win32") spawn("taskkill", ["/PID", String(api.pid), "/T", "/F"], { windowsHide: true });
    else api.kill();
  }
}
function external(url) {
  try { if (["https:", "http:"].includes(new URL(url).protocol)) void shell.openExternal(url); } catch {}
}
async function boot() {
  const resources = app.isPackaged ? process.resourcesPath : path.resolve(__dirname, "../build/desktop");
  const apiPath = app.isPackaged ? path.join(resources, "api/clanker-api.exe") : path.join(resources, "api/clanker-api/clanker-api.exe");
  const nested = path.join(resources, "web/apps/web/server.js");
  const serverPath = existsSync(nested) ? nested : path.join(resources, "web/server.js");
  if (!existsSync(apiPath) || !existsSync(serverPath)) throw new Error("Desktop runtimes are missing. Run npm run desktop:prepare first.");
  const data = app.getPath("userData");
  adblock = createAdBlocker(session.defaultSession, resources, data);
  ipcMain.on("clanker:ad-blocking-enabled", event => { event.returnValue = adblock.enabled; });
  session.defaultSession.registerPreloadScript({ type: "frame", filePath: path.join(__dirname, "youtube-adblock-preload.cjs") });
  void adblock.refresh().catch(() => {});
  const logs = path.join(data, "logs"); mkdirSync(logs, { recursive: true });
  const log = createWriteStream(path.join(logs, "services.log"), { flags: "a" });
  const apiPort = await freePort();
  let webPort = await freePort();
  while (webPort === apiPort) webPort = await freePort();
  const token = randomBytes(32).toString("hex");
  const env = { ...process.env, STUDIO_TOKEN: token, CLANKER_API_PORT: String(apiPort),
    CLANKER_PARENT_PID: String(process.pid), DATABASE_URL: `sqlite:///${path.join(data, "clanker.db").replaceAll("\\", "/")}`,
    ASSET_ROOT: path.join(data, "assets"), QUEUE_BACKEND: "local", STORAGE_BACKEND: "local" };
  api = spawn(apiPath, [], { cwd: data, env, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
  api.stdout.pipe(log, { end: false }); api.stderr.pipe(log, { end: false });
  api.on("error", error => fail(error));
  api.on("exit", code => { if (!quitting) fail(new Error(`Music service stopped (${code}). See ${logs}`)); });
  await waitFor(`http://127.0.0.1:${apiPort}/api/health`, { "x-studio-token": token });
  web = utilityProcess.fork(serverPath, [], { cwd: path.dirname(serverPath), stdio: "pipe",
    env: { ...env, NODE_ENV: "production", HOSTNAME: "127.0.0.1", PORT: String(webPort), API_URL: `http://127.0.0.1:${apiPort}` } });
  web.stdout.pipe(log, { end: false }); web.stderr.pipe(log, { end: false });
  web.on("exit", code => { if (!quitting) fail(new Error(`Player service stopped (${code}). See ${logs}`)); });
  origin = `http://127.0.0.1:${webPort}`;
  await waitFor(`${origin}/api/health`);
  if (quitting) return;
  window = new BrowserWindow({ title: "Clanker Radio", width: 1440, height: 960,
    minWidth: 720, minHeight: 540, backgroundColor: "#080808", show: false,
    webPreferences: { preload: path.join(__dirname, "preload.cjs"), nodeIntegration: false, contextIsolation: true, sandbox: true, backgroundThrottling: false } });
  window.webContents.setWindowOpenHandler(({ url }) => { external(url); return { action: "deny" }; });
  window.webContents.on("will-navigate", (event, url) => { if (new URL(url).origin !== origin) { event.preventDefault(); external(url); } });
  window.webContents.session.setPermissionRequestHandler((contents, permission, callback) => {
    callback(contents === window.webContents && new URL(contents.getURL()).origin === origin && permission === "fullscreen");
  });
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: "Clanker Radio", submenu: [
      { label: "Block ads", type: "checkbox", checked: adblock.enabled, click: item => adblock.setEnabled(item.checked) },
      { type: "separator" },
      { label: "Open library folder", click: () => shell.openPath(data) },
      { type: "separator" }, { role: "quit" },
    ] },
    { label: "View", submenu: [{ role: "reload" }, { role: "togglefullscreen" }, { role: "toggleDevTools" }] },
    { role: "editMenu" },
  ]));
  ipcMain.handle("clanker:open-music", async (event, link) => {
    if (event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame || new URL(event.senderFrame.url).origin !== origin)
      throw new Error("Only the local player can open a music window.");
    const url = providerURL(link);
    if (providerWindow && !providerWindow.isDestroyed() && providerSource === url) {
      providerWindow.show(); providerWindow.focus(); return;
    }
    if (!providerWindow || providerWindow.isDestroyed()) {
      providerWindow = new BrowserWindow({ title: "Music player · Clanker Radio", width: 1100, height: 800,
        backgroundColor: "#080808", parent: window,
        webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true, backgroundThrottling: false } });
      providerWindow.webContents.on("will-navigate", (event, next) => { if (!providerNavigation(next)) event.preventDefault(); });
      providerWindow.webContents.setWindowOpenHandler(({ url: next }) => providerNavigation(next)
        ? { action: "allow", overrideBrowserWindowOptions: { webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true } } }
        : { action: "deny" });
    }
    await providerWindow.loadURL(url); providerSource = url; providerWindow.show(); providerWindow.focus();
  });
  ipcMain.handle("clanker:close-music", (event) => {
    if (event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame || new URL(event.senderFrame.url).origin !== origin)
      throw new Error("Only the local player can close a music window.");
    if (providerWindow && !providerWindow.isDestroyed()) providerWindow.close();
  });
  window.on("closed", () => app.quit());
  window.once("ready-to-show", () => window.show());
  await window.loadURL(origin);
}
function fail(error) {
  if (quitting) return;
  dialog.showErrorBox("Clanker Radio could not start", error.message);
  app.quit();
}
app.on("before-quit", stop);
app.on("window-all-closed", () => app.quit());
if (single) app.whenReady().then(boot).catch(fail);
