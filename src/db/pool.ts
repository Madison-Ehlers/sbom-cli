import { Pool } from "pg";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? "postgres://sbom:sbom@localhost:5432/sbom",
});
