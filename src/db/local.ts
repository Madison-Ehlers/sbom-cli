// Docker-free local Postgres (prebuilt binaries via embedded-postgres).
// Same credentials/port as docker-compose.yml. Data lives in ./.pgdata.
import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "fs";

async function main() {
  const pg = new EmbeddedPostgres({
    databaseDir: ".pgdata",
    user: "sbom",
    password: "sbom",
    port: 5432,
    persistent: true,
  });
  if (!existsSync(".pgdata/PG_VERSION")) {
    await pg.initialise();
  }
  await pg.start();
  try {
    await pg.createDatabase("sbom");
  } catch {
    // already exists
  }
  console.log("postgres ready on :5432 (db=sbom user=sbom)");
  const stop = async () => {
    await pg.stop();
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
