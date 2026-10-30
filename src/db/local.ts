// Foreground Docker-free Postgres. Same credentials/port as docker-compose.yml. Data lives in ./.pgdata.
import { DEFAULT_DATABASE_URL, startEmbeddedDb } from "./embedded";

async function main() {
  const databaseUrl = process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL;
  const { stop } = await startEmbeddedDb(databaseUrl);
  console.log(`postgres ready on :${new URL(databaseUrl).port || 5432}`);
  const shutdown = async () => {
    await stop();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
