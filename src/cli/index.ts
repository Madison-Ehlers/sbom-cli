#!/usr/bin/env node
import { readFile } from "fs/promises";
import { basename } from "path";
import { Command } from "commander";
import { registerQuery } from "./query";

const API_URL = process.env.API_URL ?? "http://localhost:3000";
const POLL_MS = 500;

interface Job {
  id: string;
  status: "queued" | "running" | "succeeded" | "failed";
  filename: string | null;
  error: string | null;
  result: Record<string, any> | null;
}

async function api(path: string, init?: RequestInit): Promise<any> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, init);
  } catch {
    throw new Error(`cannot reach API at ${API_URL} (is it running?)`);
  }
  const body: any = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `API returned ${res.status}`);
  return body;
}

const getJob = (id: string): Promise<Job> => api(`/jobs/${encodeURIComponent(id)}`);

async function waitForJob(id: string): Promise<Job> {
  for (;;) {
    const job = await getJob(id);
    if (job.status === "succeeded" || job.status === "failed") return job;
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}

function printJob(job: Job) {
  console.log(`job ${job.id}: ${job.status}`);
  if (job.error) console.log(`error: ${job.error}`);
  if (job.result) {
    const r = job.result;
    console.log(`document: ${r.document_id}${r.duplicate ? " (already ingested; no changes)" : ""}`);
    if (!r.duplicate) {
      console.log(`${r.format} ${r.spec_version}: ${r.components} components, ${r.edges} edges, ${r.licenses} licenses, ${r.links} links`);
      if (r.dropped_relationships) console.log(`skipped ${r.dropped_relationships} relationships to unstored elements (files, NOASSERTION, unknown refs)`);
    }
  }
  if (job.status === "failed") process.exitCode = 1;
}

const program = new Command().name("sbom-cli").description("Ingest and query SBOMs");

program
  .command("ingest <sbom-file>")
  .description("Ingest a CycloneDX/SPDX JSON SBOM (prints job id)")
  .option("--wait", "wait for the ingest job to finish")
  .action(async (file: string, opts: { wait?: boolean }) => {
    const body = await readFile(file).catch((e) => {
      throw new Error(`cannot read ${file}: ${e.code ?? e.message}`);
    });
    const { job_id } = await api("/ingest", {
      method: "POST",
      headers: { "content-type": "application/json", "x-filename": basename(file) },
      body,
    });
    if (!opts.wait) {
      console.log(`job ${job_id}: queued (check with: sbom-cli job ${job_id})`);
      return;
    }
    printJob(await waitForJob(job_id));
  });

registerQuery(program);

program
  .command("job <id>")
  .description("Show ingest job status")
  .option("--wait", "wait for the job to finish")
  .action(async (id: string, opts: { wait?: boolean }) => {
    printJob(opts.wait ? await waitForJob(id) : await getJob(id));
  });

program.parseAsync().catch((err) => {
  console.error(`error: ${err.message}`);
  process.exit(1);
});
