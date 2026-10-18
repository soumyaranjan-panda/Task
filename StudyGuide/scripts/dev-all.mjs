/**
 * Local development runner: the solutions API plus Vite, in one command.
 *
 * Vite proxies /api to the API port (see vite.config.ts), so the app stays
 * same-origin. Expects a Postgres to already be reachable — `docker compose up -d db`
 * is the easy way to get one.
 */
import { spawn } from "node:child_process";

const RESET = "[0m";
const targets = [
  { name: "api", color: "[36m", command: process.execPath, args: ["server/api.mjs"] },
  { name: "web", color: "[35m", command: "npm", args: ["run", "dev"] },
];

const children = [];
let shuttingDown = false;

for (const target of targets) {
  const child = spawn(target.command, target.args, { stdio: ["ignore", "pipe", "pipe"] });
  children.push(child);
  const prefix = `${target.color}[${target.name}]${RESET}`;

  for (const stream of [child.stdout, child.stderr]) {
    let buffer = "";
    stream?.on("data", (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) console.log(`${prefix} ${line}`);
    });
  }

  child.on("exit", (code, signal) => {
    if (shuttingDown) return;
    console.error(`${prefix} exited (${signal ?? code}); stopping.`);
    shutdown(code ?? 1);
  });
}

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) if (child.exitCode === null) child.kill("SIGTERM");
  setTimeout(() => process.exit(code), 2000).unref();
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => shutdown(0));
}