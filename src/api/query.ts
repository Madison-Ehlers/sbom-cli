import { Router, type ErrorRequestHandler } from "express";
import { pool } from "../db/pool";

// Synchronous, read-only lookups served straight from indexed tables (see DESIGN.md).
// Results are keyset-paginated on components.id: stable and O(limit) at any depth,
// unlike OFFSET. Clients pass back `next_cursor` as `after`.
export const queryRouter = Router();

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 1000;

class BadRequest extends Error {}

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
}

function paging(q: Record<string, unknown>) {
  const limit = q.limit === undefined ? DEFAULT_LIMIT : Number(q.limit);
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    throw new BadRequest(`limit must be an integer in 1..${MAX_LIMIT}`);
  }
  const after = q.after === undefined ? 0 : Number(q.after);
  if (!Number.isInteger(after) || after < 0) throw new BadRequest("after must be a non-negative integer");
  return { limit, after };
}

// Shape shared by both queries: the matched component, its document, and its
// containment parent (package). parent_* are null when the document is the parent.
const SELECT_MATCH = `
  c.id AS component_id, c.name, c.version, c.purl, c.type,
  c.license_declared_raw, c.license_concluded_raw,
  d.id AS document_id, d.format, d.spec_version, d.name AS document_name, d.doc_identity,
  p.id AS parent_id, p.name AS parent_name, p.version AS parent_version`;

function page(rows: { component_id: string }[], limit: number) {
  const more = rows.length > limit;
  const results = more ? rows.slice(0, limit) : rows;
  return { results, next_cursor: more ? results[results.length - 1].component_id : null };
}

// GET /query/components?name=<name>[&version=<v>][&limit=][&after=]
// Documents/packages containing the component. Name match is case-insensitive
// (components_name_version_idx on lower(name), version); version is exact.
queryRouter.get("/components", async (req, res, next) => {
  try {
    const name = str(req.query.name);
    if (!name) throw new BadRequest("name is required");
    const version = str(req.query.version);
    const { limit, after } = paging(req.query);

    const { rows } = await pool.query(
      `SELECT ${SELECT_MATCH}
       FROM components c
       JOIN sbom_documents d ON d.id = c.document_id
       LEFT JOIN components p ON p.id = c.parent_id
       WHERE lower(c.name) = lower($1)
         AND ($2::text IS NULL OR c.version = $2)
         AND c.id > $3
       ORDER BY c.id
       LIMIT $4`,
      [name, version ?? null, after, limit + 1]
    );
    res.json({ query: { name, version: version ?? null }, ...page(rows, limit) });
  } catch (err) {
    next(err);
  }
});

// GET /query/licenses?license=<id>[&limit=][&after=]
// Components carrying the license (any kind: declared/concluded/evidence) plus their
// parent document/package. Expressions are exploded at ingest, so `MIT` also matches
// `MIT AND ISC`. The component_licenses page is cut first so LIMIT is applied on the
// narrow (license_id, component_id) index before joining the wide tables.
queryRouter.get("/licenses", async (req, res, next) => {
  try {
    const license = str(req.query.license);
    if (!license) throw new BadRequest("license is required");
    const { limit, after } = paging(req.query);

    const { rows } = await pool.query(
      `SELECT ${SELECT_MATCH}, cl.kinds AS license_kinds, l.display AS license
       FROM licenses l
       CROSS JOIN LATERAL (
         SELECT component_id, array_agg(DISTINCT kind ORDER BY kind) AS kinds
         FROM component_licenses
         WHERE license_id = l.id AND component_id > $2
         GROUP BY component_id
         ORDER BY component_id
         LIMIT $3
       ) cl
       JOIN components c ON c.id = cl.component_id
       JOIN sbom_documents d ON d.id = c.document_id
       LEFT JOIN components p ON p.id = c.parent_id
       WHERE l.key_lc = lower($1)
       ORDER BY c.id`,
      [license, after, limit + 1]
    );
    res.json({ query: { license }, ...page(rows, limit) });
  } catch (err) {
    next(err);
  }
});

const badRequest: ErrorRequestHandler = (err, _req, res, next) => {
  if (err instanceof BadRequest) {
    res.status(400).json({ error: err.message });
    return;
  }
  next(err);
};
queryRouter.use(badRequest);
