import { spawnSync } from "node:child_process";

function runNpm(args) {
  const result = spawnSync("npm", args, {
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (process.env.VERCEL === "1" && process.env.VERCEL_ENV === "production") {
  runNpm(["run", "db:migrate"]);
}

runNpm(["run", "build:next"]);
