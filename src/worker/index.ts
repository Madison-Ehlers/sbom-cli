import { pool } from "../db/pool";

const POLL_MS = 1000;

// Claim one queued job. SKIP LOCKED lets many workers run without contention.
async function claimJob() {
  const { rows } = await pool.query(
    `UPDATE jobs SET status = 'running', updated_at = now()
     WHERE id = (SELECT id FROM jobs WHERE status = 'queued'
                 ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1)
     RETURNING id, type, payload`
  );
  return rows[0] as { id: string; type: string; payload: unknown } | undefined;
}

async function loop() {
  console.log("worker polling for jobs");
  for (;;) {
    const job = await claimJob();
    if (!job) {
      await new Promise((r) => setTimeout(r, POLL_MS));
      continue;
    }
    // TODO: dispatch on job.type (ingest -> parse + persist)
    console.log(`claimed job ${job.id} (${job.type}); no handler yet`);
    await pool.query(
      `UPDATE jobs SET status = 'failed', error = 'no handler', updated_at = now() WHERE id = $1`,
      [job.id]
    );
  }
}

loop().catch((err) => {
  console.error(err);
  process.exit(1);
});
