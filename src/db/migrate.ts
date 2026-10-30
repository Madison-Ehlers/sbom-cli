import { readFileSync } from "fs";
import { join } from "path";
import { pool } from "./pool";

async function main() {
  await pool.query(readFileSync(join(__dirname, "../../db/schema.sql"), "utf8"));
  console.log("schema applied");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
