import type { PoolClient } from "pg";
import type { NormSbom } from "./types";

export interface IngestResult {
  document_id: string;
  duplicate: boolean; // same content_sha256 already ingested; nothing written
  format?: string;
  spec_version?: string;
  components?: number;
  edges?: number;
  licenses?: number; // distinct license ids referenced
  links?: number;
  dropped_relationships?: number;
}

/**
 * Writes one SBOM. Caller owns the transaction, so a failure leaves nothing behind.
 * Each table is filled with a single set-based INSERT ... SELECT FROM jsonb_to_recordset($1), so a document costs a
 * handful of round trips regardless of size. (A multi-million-component single SBOM would want chunking.)
 */
export async function persistSbom(
  db: PoolClient,
  s: NormSbom,
  ctx: { jobId: string; sha256: string }
): Promise<IngestResult> {
  const { rows } = await db.query(
    `INSERT INTO sbom_documents (format, spec_version, doc_identity, name, created_at, tool, content_sha256, job_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (content_sha256) DO NOTHING
     RETURNING id`,
    [s.format, s.specVersion, s.docIdentity, s.name, s.createdAt, s.tool, ctx.sha256, ctx.jobId]
  );
  if (!rows[0]) {
    // Idempotent re-ingest. A concurrent identical ingest blocks on the unique index above until it commits, so this finds it.
    const existing = await db.query(`SELECT id FROM sbom_documents WHERE content_sha256 = $1`, [ctx.sha256]);
    return { document_id: existing.rows[0].id, duplicate: true };
  }
  const docId: string = rows[0].id;

  // Pre-allocate component ids so parent_id and edges can be written without reading ids back.
  // (parent_id self-FK is checked at statement end, so row order within the INSERT does not matter.)
  const n = s.components.length;
  const ids: string[] = n
    ? (
        await db.query(
          `SELECT nextval(pg_get_serial_sequence('components', 'id')) AS id FROM generate_series(1, $1::int)`,
          [n]
        )
      ).rows.map((r) => r.id)
    : [];

  if (n) {
    await db.query(
      `INSERT INTO components (id, document_id, parent_id, local_ref, name, version, purl, type, supplier, hashes,
                               license_declared_raw, license_concluded_raw)
       OVERRIDING SYSTEM VALUE
       SELECT r.id, $2::uuid, r.parent_id, r.local_ref, r.name, r.version, r.purl, r.type, r.supplier, r.hashes,
              r.license_declared_raw, r.license_concluded_raw
       FROM jsonb_to_recordset($1::jsonb) AS r(id bigint, parent_id bigint, local_ref text, name text, version text,
         purl text, type text, supplier text, hashes jsonb, license_declared_raw text, license_concluded_raw text)`,
      [
        JSON.stringify(
          s.components.map((c, i) => ({
            id: ids[i],
            parent_id: c.parent === null ? null : ids[c.parent],
            local_ref: c.localRef,
            name: c.name,
            version: c.version,
            purl: c.purl,
            type: c.type,
            supplier: c.supplier,
            hashes: c.hashes,
            license_declared_raw: c.licenseDeclaredRaw,
            license_concluded_raw: c.licenseConcludedRaw,
          }))
        ),
        docId,
      ]
    );
  }
  if (s.root !== null) {
    await db.query(`UPDATE sbom_documents SET root_component_id = $2 WHERE id = $1`, [docId, ids[s.root]]);
  }

  // Licenses are global. Upsert in key order so concurrent workers take locks in the same order (no deadlocks).
  const leaves = new Map(s.components.flatMap((c) => c.licenses.map((l) => [l.leaf.key, l.leaf] as const)));
  if (leaves.size) {
    await db.query(
      `INSERT INTO licenses (key_lc, display, is_spdx, is_exception)
       SELECT key_lc, display, is_spdx, is_exception
       FROM jsonb_to_recordset($1::jsonb) AS r(key_lc text, display text, is_spdx boolean, is_exception boolean)
       ORDER BY key_lc
       ON CONFLICT (key_lc) DO NOTHING`,
      [
        JSON.stringify(
          [...leaves.values()].map((l) => ({
            key_lc: l.key,
            display: l.display,
            is_spdx: l.isSpdx,
            is_exception: l.isException,
          }))
        ),
      ]
    );
    await db.query(
      `INSERT INTO component_licenses (component_id, license_id, kind)
       SELECT r.component_id, l.id, r.kind
       FROM jsonb_to_recordset($1::jsonb) AS r(component_id bigint, key_lc text, kind text)
       JOIN licenses l ON l.key_lc = r.key_lc
       ON CONFLICT DO NOTHING`,
      [
        JSON.stringify(
          s.components.flatMap((c, i) => c.licenses.map((l) => ({ component_id: ids[i], key_lc: l.leaf.key, kind: l.kind })))
        ),
      ]
    );
  }

  if (s.edges.length) {
    await db.query(
      `INSERT INTO component_edges (document_id, from_id, to_id, rel_type, raw_rel_type)
       SELECT $2::uuid, r.from_id, r.to_id, r.rel_type, r.raw_rel_type
       FROM jsonb_to_recordset($1::jsonb) AS r(from_id bigint, to_id bigint, rel_type text, raw_rel_type text)
       ON CONFLICT DO NOTHING`,
      [
        JSON.stringify(
          s.edges.map((e) => ({ from_id: ids[e.from], to_id: ids[e.to], rel_type: e.relType, raw_rel_type: e.rawRelType }))
        ),
        docId,
      ]
    );
  }

  if (s.links.length) {
    await db.query(
      `INSERT INTO document_links (from_document_id, from_component_id, target_identity, link_type)
       SELECT $2::uuid, r.from_component_id, r.target_identity, r.link_type
       FROM jsonb_to_recordset($1::jsonb) AS r(from_component_id bigint, target_identity text, link_type text)`,
      [
        JSON.stringify(
          s.links.map((l) => ({
            from_component_id: l.fromComponent === null ? null : ids[l.fromComponent],
            target_identity: l.targetIdentity,
            link_type: l.linkType,
          }))
        ),
        docId,
      ]
    );
  }
  // Resolve links in both directions so ingest order does not matter. Identities are not unique; an arbitrary match wins.
  await db.query(
    `UPDATE document_links l SET to_document_id = d.id
     FROM sbom_documents d
     WHERE l.from_document_id = $1 AND l.to_document_id IS NULL AND d.doc_identity = l.target_identity AND d.id <> $1`,
    [docId]
  );
  if (s.docIdentity) {
    await db.query(
      `UPDATE document_links SET to_document_id = $1
       WHERE to_document_id IS NULL AND target_identity = $2 AND from_document_id <> $1`,
      [docId, s.docIdentity]
    );
  }

  return {
    document_id: docId,
    duplicate: false,
    format: s.format,
    spec_version: s.specVersion,
    components: n,
    edges: s.edges.length,
    licenses: leaves.size,
    links: s.links.length,
    dropped_relationships: s.droppedRelationships,
  };
}
