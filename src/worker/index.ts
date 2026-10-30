import type { PoolClient } from "pg";
import { pool } from "../db/pool";
import { ingestJob } from "./ingest";

const POLL_MS = 1000;

type Job = { id: string; type: string; payload: any };
const handlers: Record<string, (db: PoolClient, job: Job) => Promise<unknown>> = {
  ingest: ingestJob,
};

// Claim one queued job. SKIP LOCKED lets many workers run without contention.
async function claimJob(): Promise<Job | undefined> {
  const { rows } = await pool.query(
    `UPDATE jobs SET status = 'running', updated_at = now()
     WHERE id = (SELECT id FROM jobs WHERE status = 'queued'
                 ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1)
     RETURNING id, type, payload`
  );
  return rows[0];
}

// The handler's writes and the job's 'succeeded' status commit together; any error rolls the handler back.
// TODO: a worker that dies mid-job leaves it 'running'; production needs a heartbeat/lease to requeue those.
async function run(job: Job) {
  const db = await pool.connect();
  try {
    const handler = handlers[job.type];
    if (!handler) throw new Error(`no handler for job type '${job.type}'`);
    await db.query("BEGIN");
    const result = await handler(db, job);
    await db.query(`UPDATE jobs SET status = 'succeeded', result = $2, updated_at = now() WHERE id = $1`, [
      job.id,
      JSON.stringify(result ?? null),
    ]);
    await db.query("COMMIT");
    console.log(`job ${job.id} (${job.type}) succeeded`);
  } catch (err) {
    await db.query("ROLLBACK").catch(() => {});
    const message = err instanceof Error ? err.message : String(err);
    console.error(`job ${job.id} (${job.type}) failed: ${message}`);
    await pool.query(`UPDATE jobs SET status = 'failed', error = $2, updated_at = now() WHERE id = $1`, [
      job.id,
      message,
    ]);
  } finally {
    db.release();
  }
}

async function loop() {
  console.log("worker polling for jobs");
  for (;;) {
    const job = await claimJob();
    if (job) await run(job);
    else await new Promise((r) => setTimeout(r, POLL_MS));
  }
}

loop().catch((err) => {
  console.error(err);
  process.exit(1);
});
