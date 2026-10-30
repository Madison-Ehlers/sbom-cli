// Docker-free local Postgres (prebuilt binaries via embedded-postgres). Data lives in ./.pgdata.
// Credentials and port come from the connection string so they match what the API and worker use.
import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "fs";

export const DEFAULT_DATABASE_URL = "postgres://sbom:sbom@localhost:5432/sbom";

export async function startEmbeddedDb(databaseUrl: string): Promise<{ stop: () => Promise<void> }> {
  const url = new URL(databaseUrl);
  const db = url.pathname.slice(1);
  const pg = new EmbeddedPostgres({
    databaseDir: ".pgdata",
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    port: Number(url.port || 5432),
    persistent: true,
  });
  if (!existsSync(".pgdata/PG_VERSION")) {
    await pg.initialise();
  }
  await pg.start();
  try {
    await pg.createDatabase(db);
  } catch {
    // already exists
  }
  return { stop: () => pg.stop() };
}
