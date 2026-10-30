#!/usr/bin/env node
import { Command } from "commander";
import { registerQuery } from "./query";

const API_URL = process.env.API_URL ?? "http://localhost:3000";

const program = new Command().name("sbom-cli").description("Ingest and query SBOMs");

program
  .command("hello")
  .description("Round-trip check: CLI -> API")
  .action(async () => {
    const res = await fetch(`${API_URL}/hello`);
    const body = (await res.json()) as { message: string };
    console.log(body.message);
  });

program
  .command("ingest <sbom-file>")
  .description("Ingest a CycloneDX/SPDX JSON SBOM (returns job id)")
  .action(() => notImplemented("ingest"));

registerQuery(program);

program
  .command("job <id>")
  .description("Show ingest job status")
  .action(() => notImplemented("job"));

function notImplemented(cmd: string): never {
  console.error(`${cmd}: not implemented yet`);
  process.exit(1);
}

program.parseAsync().catch((err) => {
  console.error(`error: ${err.message}`);
  process.exit(1);
});
