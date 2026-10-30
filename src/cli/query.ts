import type { Command } from "commander";

const API_URL = process.env.API_URL ?? "http://localhost:3000";

interface Match {
  component_id: string;
  name: string;
  version: string | null;
  purl: string | null;
  document_id: string;
  format: string;
  spec_version: string;
  document_name: string | null;
  parent_id: string | null;
  parent_name: string | null;
  parent_version: string | null;
  license?: string;
  license_kinds?: string[];
}

interface Page {
  results: Match[];
  next_cursor: string | null;
}

interface QueryOpts {
  component?: string;
  version?: string;
  license?: string;
  limit?: string;
  after?: string;
  json?: boolean;
}

export function registerQuery(program: Command) {
  program
    .command("query")
    .description("Query ingested SBOMs by component or license")
    .option("--component <name>", "documents/packages containing this component")
    .option("--version <version>", "restrict --component to an exact version")
    .option("--license <license>", "components with this license (SPDX id or name)")
    .option("--limit <n>", "page size (default 100, max 1000)")
    .option("--after <cursor>", "resume after the cursor printed by a previous page")
    .option("--json", "print raw API response")
    .action(async (opts: QueryOpts) => {
      if (!!opts.component === !!opts.license) fail("specify exactly one of --component or --license");
      if (opts.version && !opts.component) fail("--version requires --component");

      const params = new URLSearchParams();
      if (opts.limit) params.set("limit", opts.limit);
      if (opts.after) params.set("after", opts.after);
      let path: string;
      if (opts.component) {
        path = "/query/components";
        params.set("name", opts.component);
        if (opts.version) params.set("version", opts.version);
      } else {
        path = "/query/licenses";
        params.set("license", opts.license!);
      }

      const res = await fetch(`${API_URL}${path}?${params}`);
      const body = (await res.json().catch(() => ({}))) as Page & { error?: string };
      if (!res.ok) fail(body.error ?? `API returned ${res.status}`);

      if (opts.json) {
        console.log(JSON.stringify(body, null, 2));
        return;
      }
      print(body, !!opts.license);
    });
}

function print(page: Page, byLicense: boolean) {
  if (page.results.length === 0) {
    console.log("no matches");
    return;
  }
  for (const m of page.results) {
    const comp = m.version ? `${m.name}@${m.version}` : m.name;
    const doc = `${m.document_name ?? "(unnamed)"} [${m.format} ${m.spec_version}, ${m.document_id}]`;
    // Parent package if the component is nested; otherwise the document itself is the parent.
    const parent = m.parent_name ? `${m.parent_name}${m.parent_version ? `@${m.parent_version}` : ""} in ${doc}` : doc;
    const lic = byLicense && m.license_kinds ? `  (${m.license}: ${m.license_kinds.join(",")})` : "";
    console.log(`${comp}${lic}\n  parent: ${parent}`);
  }
  console.log(`\n${page.results.length} result(s)`);
  if (page.next_cursor) console.log(`more results: re-run with --after ${page.next_cursor}`);
}

function fail(msg: string): never {
  console.error(`error: ${msg}`);
  process.exit(1);
}
