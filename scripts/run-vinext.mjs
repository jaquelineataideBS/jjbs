import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const vinextManifestPath = resolve(projectRoot, "node_modules", "vinext", "package.json");
const vinextManifest = JSON.parse(readFileSync(vinextManifestPath, "utf8"));
const vinextCli = resolve(dirname(vinextManifestPath), vinextManifest.bin.vinext);
const [command, ...args] = process.argv.slice(2);

if (!command) throw new Error("Informe o comando do Vinext, como dev, build ou start.");

const child = spawn(process.execPath, [vinextCli, command, ...args], {
  cwd: projectRoot,
  env: {
    ...process.env,
    WRANGLER_LOG_PATH: process.env.WRANGLER_LOG_PATH ?? ".wrangler/wrangler.log",
  },
  stdio: "inherit",
});

child.on("error", (error) => {
  console.error("Não foi possível iniciar o Vinext:", error.message);
  process.exitCode = 1;
});

child.on("exit", (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0);
});
