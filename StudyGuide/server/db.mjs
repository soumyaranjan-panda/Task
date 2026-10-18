/**
 * Postgres access for saved solutions.
 *
 * One table keyed by (topic, unit, language) so the same problem can hold a
 * Java attempt and a Python attempt side by side. The schema is created on
 * demand, so a fresh Docker volume needs no migration step.
 */
import pg from "pg";

const { Pool } = pg;

/** Postgres caps identifiers at 63 bytes; keep keys comfortably under it. */
const MAX_KEY_LENGTH = 200;
const MAX_BODY_BYTES = 2 * 1024 * 1024;

let pool = null;

function connectionString() {
  return process.env.DATABASE_URL ?? "";
}

/** Whether a database is configured at all (drives the API's 503 response). */
export function isConfigured() {
  return connectionString().length > 0;
}

function getPool() {
  if (!pool) {
    const url = connectionString();
    if (!url) throw new Error("DATABASE_URL is not set");
    pool = new Pool({
      connectionString: url,
      max: Number(process.env.PGPOOL_MAX ?? 5),
      // Fail fast rather than hanging a request when Postgres is unreachable.
      connectionTimeoutMillis: Number(process.env.PG_CONNECT_TIMEOUT_MS ?? 5000),
    });
    // An idle client can drop (e.g. Postgres restarted). The pool recovers, but
    // without a listener that becomes an unhandled 'error' event.
    pool.on("error", (error) => {
      console.error("[db] idle client error:", error.message);
    });
  }
  return pool;
}

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS solutions (
    topic      TEXT        NOT NULL,
    unit_id    TEXT        NOT NULL,
    language   TEXT        NOT NULL DEFAULT 'java',
    title      TEXT        NOT NULL DEFAULT '',
    body       TEXT        NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (topic, unit_id, language)
  );
  CREATE INDEX IF NOT EXISTS solutions_topic_updated_idx
    ON solutions (topic, updated_at DESC);
`;

let schemaPromise = null;

/** Create the table if needed. Safe to call on every request. */
export function ensureSchema() {
  schemaPromise ??= getPool()
    .query(SCHEMA)
    .catch((error) => {
      // Let the next request retry instead of caching the failure forever.
      schemaPromise = null;
      throw error;
    });
  return schemaPromise;
}

export async function ping() {
  const result = await getPool().query("SELECT 1 AS ok");
  return result.rows[0]?.ok === 1;
}
/**
 * Block until Postgres answers, so the API can start alongside the database in
 * `docker compose up` without racing it.
 */
export async function waitForDatabase({ attempts = 30, delayMs = 1000 } = {}) {
  if (!isConfigured()) return false;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await ensureSchema();
      await ping();
      return true;
    } catch (error) {
      if (attempt === attempts) throw error;
      console.log(`[db] not ready (${attempt}/${attempts}): ${error.message}`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  return false;
}

const rowToSolution = (row) => ({
  topic: row.topic,
  unitId: row.unit_id,
  language: row.language,
  title: row.title,
  body: row.body,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

/** Every saved solution for one topic. */
export async function listSolutions(topic) {
  await ensureSchema();
  const result = await getPool().query(
    `SELECT topic, unit_id, language, title, body, created_at, updated_at
       FROM solutions
      WHERE topic = $1
      ORDER BY unit_id, language`,
    [topic],
  );
  return result.rows.map(rowToSolution);
}

export async function getSolution({ topic, unitId, language }) {
  await ensureSchema();
  const result = await getPool().query(
    `SELECT topic, unit_id, language, title, body, created_at, updated_at
       FROM solutions
      WHERE topic = $1 AND unit_id = $2 AND language = $3`,
    [topic, unitId, language],
  );
  return result.rows[0] ? rowToSolution(result.rows[0]) : null;
}

/**
 * Insert or update one solution. `body` is written verbatim and always bound as
 * a parameter — it is never interpolated into SQL.
 */
export async function upsertSolution({ topic, unitId, language, title, body }) {
  await ensureSchema();
  const result = await getPool().query(
    `INSERT INTO solutions (topic, unit_id, language, title, body)
          VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (topic, unit_id, language)
     DO UPDATE SET title = EXCLUDED.title,
                   body = EXCLUDED.body,
                   updated_at = now()
      RETURNING topic, unit_id, language, title, body, created_at, updated_at`,
    [topic, unitId, language, title ?? "", body ?? ""],
  );
  return rowToSolution(result.rows[0]);
}

export async function deleteSolution({ topic, unitId, language }) {
  await ensureSchema();
  await getPool().query(
    "DELETE FROM solutions WHERE topic = $1 AND unit_id = $2 AND language = $3",
    [topic, unitId, language],
  );
}
/** Validate a client payload; throws an Error whose message is safe to return. */
export function parseSolutionPayload(input) {
  const trimmed = (value) => (typeof value === "string" ? value.trim() : "");
  const topic = trimmed(input?.topic);
  const unitId = trimmed(input?.unitId);
  const language = trimmed(input?.language) || "java";

  if (!topic) throw new Error("`topic` is required.");
  if (!unitId) throw new Error("`unitId` is required.");
  for (const [name, value] of [
    ["topic", topic],
    ["unitId", unitId],
    ["language", language],
  ]) {
    if (value.length > MAX_KEY_LENGTH) {
      throw new Error(`\`${name}\` must be ${MAX_KEY_LENGTH} characters or fewer.`);
    }
  }

  const title = typeof input?.title === "string" ? input.title.slice(0, 300) : "";
  const body = typeof input?.body === "string" ? input.body : "";
  if (Buffer.byteLength(body, "utf8") > MAX_BODY_BYTES) {
    throw new Error("That solution is too large to save (limit 2 MB).");
  }

  return { topic, unitId, language, title, body };
}

export async function close() {
  if (!pool) return;
  const closing = pool;
  pool = null;
  schemaPromise = null;
  await closing.end();
}