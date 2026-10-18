/**
 * Solutions API — a small standalone HTTP server.
 *
 * It is deliberately independent of the Vite/TanStack setup: those only run
 * framework server code during `build`, so a route file would work in
 * production but 404 in `npm run dev`. This runs identically in dev (Vite
 * proxies /api here) and in Docker.
 *
 *   GET    /api/health
 *   GET    /api/solutions?topic=<slug>[&unit=<id>&language=<lang>]
 *   PUT    /api/solutions            { topic, unitId, language, title, body }
 *   DELETE /api/solutions?topic=&unitId=&language=
 */
import { createServer } from "node:http";
import {
  close,
  deleteSolution,
  getSolution,
  isConfigured,
  listSolutions,
  parseSolutionPayload,
  ping,
  upsertSolution,
  waitForDatabase,
} from "./db.mjs";

const PORT = Number(process.env.API_PORT ?? 8090);
const HOST = process.env.API_HOST ?? "0.0.0.0";
const MAX_REQUEST_BYTES = 3 * 1024 * 1024;

function sendJson(response, status, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
    "cache-control": "no-store",
  });
  response.end(body);
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_REQUEST_BYTES) {
        reject(new Error("Request body too large."));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw.trim()) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("Request body must be valid JSON."));
      }
    });
    request.on("error", reject);
  });
}

async function handle(request, response) {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
  const path = url.pathname;

  if (request.method === "OPTIONS") {
    response.writeHead(204, { "access-control-allow-methods": "GET,PUT,DELETE" });
    return response.end();
  }

  if (path === "/api/health") {
    if (!isConfigured()) {
      return sendJson(response, 503, { ok: false, database: "not configured" });
    }
    try {
      await ping();
      return sendJson(response, 200, { ok: true, database: "up" });
    } catch (error) {
      return sendJson(response, 503, { ok: false, database: "unreachable", error: error.message });
    }
  }

  // Everything below needs a database.
  if (!isConfigured()) {
    return sendJson(response, 503, {
      error: "Database not configured. Start the stack with `docker compose up` or set DATABASE_URL.",
    });
  }

  try {
    if (path === "/api/solutions" && request.method === "GET") {
      const topic = url.searchParams.get("topic");
      const unitId = url.searchParams.get("unit");
      const language = url.searchParams.get("language");

      if (!topic) return sendJson(response, 400, { error: "`topic` query parameter is required." });

      if (unitId) {
        const solution = await getSolution({
          topic,
          unitId,
          language: language ?? "java",
        });
        return sendJson(response, 200, { solution });
      }

      const solutions = await listSolutions(topic);
      return sendJson(response, 200, { solutions });
    }

    if (path === "/api/solutions" && request.method === "PUT") {
      const payload = parseSolutionPayload(await readJsonBody(request));
      const solution = await upsertSolution(payload);
      return sendJson(response, 200, { solution });
    }

    if (path === "/api/solutions" && request.method === "DELETE") {
      const topic = url.searchParams.get("topic");
      const unitId = url.searchParams.get("unitId");
      const language = url.searchParams.get("language") ?? "java";
      if (!topic || !unitId) {
        return sendJson(response, 400, { error: "`topic` and `unitId` are required." });
      }
      await deleteSolution({ topic, unitId, language });
      return sendJson(response, 200, { deleted: true });
    }

    return sendJson(response, 404, { error: `No route for ${request.method} ${path}` });
  } catch (error) {
    // Postgres unreachable / table missing / bad payload.
    const status = /required|must be|too large|must be valid JSON/i.test(error.message) ? 400 : 502;
    console.error("[api]", error.message);
    return sendJson(response, status, { error: error.message });
  }
}

const server = createServer((request, response) => {
  handle(request, response).catch((error) => {
    console.error("[api] unhandled:", error);
    if (!response.headersSent) sendJson(response, 500, { error: "Internal error" });
    else response.end();
  });
});

server.listen(PORT, HOST, async () => {
  console.log(`[api] listening on http://${HOST}:${PORT}`);
  if (!isConfigured()) {
    console.warn("[api] DATABASE_URL is not set — /api/solutions will answer 503.");
    return;
  }
  try {
    await waitForDatabase();
    console.log("[api] database ready, schema ensured");
  } catch (error) {
    console.error(`[api] database never became ready: ${error.message}`);
  }
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    console.log(`[api] ${signal}, shutting down`);
    server.close(() => {
      close()
        .catch(() => {})
        .finally(() => process.exit(0));
    });
    // Do not let a lingering keep-alive socket block the exit.
    setTimeout(() => process.exit(0), 3000).unref();
  });
}