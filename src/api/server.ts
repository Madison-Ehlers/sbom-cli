import express from "express";
import { pool } from "../db/pool";
import { detect, parseJson, sha256 } from "../ingest";
import { ValidationError } from "../ingest/types";

const app = express();

app.get("/hello", (_req, res) => {
  res.json({ message: "hello world" });
});

app.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", db: "up" });
  } catch {
    res.status(503).json({ status: "degraded", db: "down" });
  }
});

// Validate + enqueue, return job id immediately. The worker does the parsing and persisting.
// Body is the raw SBOM file; X-Filename is informational. The JSON.parse here is the only O(size) work inline
// (tens of ms for multi-MB SBOMs); the 50mb cap bounds it.
app.post("/ingest", express.raw({ type: () => true, limit: "50mb" }), async (req, res) => {
  const body: unknown = req.body;
  if (!Buffer.isBuffer(body) || body.length === 0) {
    res.status(400).json({ error: "empty request body; send the SBOM file as the body" });
    return;
  }
  let detected;
  try {
    detected = detect(parseJson(body));
  } catch (err) {
    if (err instanceof ValidationError) {
      res.status(400).json({ error: err.message });
      return;
    }
    throw err;
  }

  const payload = {
    filename: req.header("x-filename") ?? null,
    format: detected.format,
    spec_version: detected.specVersion,
    sha256: sha256(body),
    bytes: body.length,
  };
  const db = await pool.connect();
  try {
    await db.query("BEGIN");
    const { rows } = await db.query(`INSERT INTO jobs (type, payload) VALUES ('ingest', $1) RETURNING id`, [
      JSON.stringify(payload),
    ]);
    await db.query(`INSERT INTO sbom_uploads (job_id, content) VALUES ($1, $2)`, [rows[0].id, body]);
    await db.query("COMMIT");
    res.status(202).json({ job_id: rows[0].id, status: "queued" });
  } catch (err) {
    await db.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    db.release();
  }
});

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

app.get("/jobs/:id", async (req, res) => {
  if (!UUID.test(req.params.id)) {
    res.status(400).json({ error: "job id must be a UUID" });
    return;
  }
  const { rows } = await pool.query(
    `SELECT id, type, status, payload->>'filename' AS filename, error, result, created_at, updated_at
     FROM jobs WHERE id = $1`,
    [req.params.id]
  );
  if (!rows[0]) {
    res.status(404).json({ error: "job not found" });
    return;
  }
  res.json(rows[0]);
});

app.get("/query", (_req, res) => {
  res.status(501).json({ error: "not implemented" });
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const status = (err as any).status ?? 500; // body-parser errors (e.g. 413) carry a status
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status >= 500 ? "internal error" : err.message });
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => console.log(`api listening on :${port}`));
