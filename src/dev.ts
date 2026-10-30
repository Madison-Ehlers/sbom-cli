// One-command local startup: Postgres (reused if already up, else embedded) -> migrate -> API + worker.
// Ctrl-C stops everything this script started.
import { ChildProcess, spawn } from "child_process";
import { createInterface } from "readline";
import { migrate } from "./db/migrate";
import { DEFAULT_DATABASE_URL, startEmbeddedDb } from "./db/embedded";
import { pool } from "./db/pool";

const databaseUrl = process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL;
const children: ChildProcess[] = [];
let stopDb: (() => Promise<void>) | undefined;
let shuttingDown = false;

async function dbReachable() {
  try {
    await pool.query("SELECT 1");
    return true;
  } catch {
    return false;
  }
}

function run(name: string, script: string) {
  const child = spawn(process.execPath, ["--import", "tsx", script], { stdio: ["ignore", "pipe", "pipe"] });
  for (const stream of [child.stdout, child.stderr]) {
    createInterface({ input: stream }).on("line", (line) => console.log(`[${name}] ${line}`));
  }
  child.on("exit", (code, signal) => {
    if (shuttingDown) return;
    console.error(`[dev] ${name} exited (${signal ?? code}); shutting down`);
    void shutdown(1);
  });
  children.push(child);
}

async function shutdown(code: number) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) child.kill("SIGTERM");
  await pool.end().catch(() => {});
  await stopDb?.().catch((err) => console.error(`[dev] failed to stop postgres: ${err}`));
  process.exit(code);
}

async function main() {
  process.on("SIGINT", () => void shutdown(0));
  process.on("SIGTERM", () => void shutdown(0));

  if (await dbReachable()) {
    console.log("[dev] postgres already running, reusing it");
  } else {
    console.log("[dev] starting postgres (data in .pgdata)");
    stopDb = (await startEmbeddedDb(databaseUrl)).stop;
  }
  await migrate();
  console.log("[dev] schema applied");

  run("api", "src/api/server.ts");
  run("worker", "src/worker/index.ts");
}

main().catch((err) => {
  console.error(err);
  void shutdown(1);
});
