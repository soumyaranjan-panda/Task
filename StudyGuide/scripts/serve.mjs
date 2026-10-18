/**
 * Container entrypoint: run the solutions API and the built site together.
 *
 * `docker compose up` should feel like one app, not two terminals, so this
 * supervises both processes, prefixes their output, and shuts both down cleanly
 * when the container is stopped.
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");

const targets = [
  { name: "api", color: "[36m", command: process.execPath, args: ["server/api.mjs"] },
  {
    name: "web",
    color: "[35m",
    command: process.execPath,
    args: [".output/server/index.mjs"],
  },
];

const missing = targets.filter((target) => !existsSync(path.join(ROOT, target.args.at(-1))));
if (missing.length) {
  console.error(
    `[serve] missing build output for: ${missing.map((t) => t.name).join(", ")} — run \`npm run build\` first.`,
  );
  process.exit(1);
}

const RESET = "[0m";
const children = [];
let shuttingDown = false;

for (const target of targets) {
  const child = spawn(target.command, target.args, {
    cwd: ROOT,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  children.push(child);

  const prefix = `${target.color}[${target.name}]${RESET}`;
  const pipe = (stream) => {
    let buffer = "";
    stream.on("data", (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) console.log(`${prefix} ${line}`);
    });
  };
  pipe(child.stdout);
  pipe(child.stderr);

  child.on("exit", (code, signal) => {
    if (shuttingDown) return;
    console.error(`${prefix} exited (${signal ?? code}); stopping the other process.`);
    shutdown(code ?? 1);
  });
}

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (child.exitCode === null) child.kill("SIGTERM");
  }
  // Give them a moment to close sockets, then leave.
  setTimeout(() => process.exit(code), 2000).unref();
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    console.log(`[serve] ${signal} received, stopping`);
    shutdown(0);
  });
}

console.log("[serve] solutions API + web server starting");