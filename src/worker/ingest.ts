import type { PoolClient } from "pg";
import { parseJson, parseSbom } from "../ingest";
import { persistSbom } from "../ingest/persist";

/** Job type `ingest`: parse the uploaded SBOM and persist it. Runs inside the worker's per-job transaction. */
export async function ingestJob(db: PoolClient, job: { id: string; payload: { sha256: string } }) {
  const { rows } = await db.query(`SELECT content FROM sbom_uploads WHERE job_id = $1`, [job.id]);
  if (!rows[0]) throw new Error("upload not found for job");

  const sbom = parseSbom(parseJson(rows[0].content));
  const result = await persistSbom(db, sbom, { jobId: job.id, sha256: job.payload.sha256 });

  await db.query(`DELETE FROM sbom_uploads WHERE job_id = $1`, [job.id]);
  return result;
}
