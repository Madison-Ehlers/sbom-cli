import express from "express";
import { pool } from "../db/pool";
import { queryRouter } from "./query";

const app = express();
app.use(express.json({ limit: "50mb" }));

app.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", db: "up" });
  } catch {
    res.status(503).json({ status: "degraded", db: "down" });
  }
});

// Stub: validate + enqueue, return job id immediately. Worker does the parsing.
app.post("/ingest", (_req, res) => {
  res.status(501).json({ error: "not implemented" });
});

app.get("/jobs/:id", (_req, res) => {
  res.status(501).json({ error: "not implemented" });
});

app.use("/query", queryRouter);

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => console.log(`api listening on :${port}`));
