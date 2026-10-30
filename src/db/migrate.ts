import { readFileSync } from "fs";
import { join } from "path";
import { pool } from "./pool";

// schema.sql is idempotent (IF NOT EXISTS throughout), so this is safe to run on every start.
export async function migrate() {
  await pool.query(readFileSync(join(__dirname, "../../db/schema.sql"), "utf8"));
}

if (require.main === module) {
  migrate()
    .then(() => {
      console.log("schema applied");
      return pool.end();
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
