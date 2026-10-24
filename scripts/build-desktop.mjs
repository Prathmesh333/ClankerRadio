import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

if (process.platform !== "win32") throw new Error("Build Windows packages on Windows.");
const root = resolve(import.meta.dirname, "..");
const output = resolve(root, "build/desktop");
mkdirSync(output, { recursive: true });
function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, stdio: "inherit", windowsHide: true });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
run(process.execPath, ["node_modules/next/dist/bin/next", "build", "apps/web"]);
run(resolve(root, ".venv/Scripts/python.exe"), [
  "-m", "PyInstaller", "--noconfirm", "--onedir", "--name", "clanker-api",
  "--distpath", resolve(output, "api"), "--workpath", resolve(output, "pyinstaller"),
  "--specpath", output, "--paths", "apps/api", "--paths", "packages/music-core",
  "--paths", "packages/audio-analysis", "--collect-all", "soundcard",
  "--collect-submodules", "winrt", "--hidden-import", "uvicorn.logging",
  "--hidden-import", "uvicorn.loops.asyncio", "--hidden-import", "uvicorn.protocols.http.h11_impl",
  "--hidden-import", "uvicorn.lifespan.on", "--hidden-import", "sqlalchemy.dialects.sqlite",
  "desktop/api_entry.py",
]);
const standalone = resolve(root, "apps/web/.next/standalone");
cpSync(standalone, resolve(output, "web"), { recursive: true });
const webRoot = existsSync(resolve(output, "web/apps/web/server.js"))
  ? resolve(output, "web/apps/web") : resolve(output, "web");
cpSync(resolve(root, "apps/web/.next/static"), resolve(webRoot, ".next/static"), { recursive: true });
if (existsSync(resolve(root, "apps/web/public")))
  cpSync(resolve(root, "apps/web/public"), resolve(webRoot, "public"), { recursive: true });
run(process.execPath, ["node_modules/electron/install.js"]);
console.log("Desktop runtimes ready. Run npm run desktop, desktop:pack, or desktop:dist.");
