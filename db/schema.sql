-- Job queue: API enqueues, worker claims with FOR UPDATE SKIP LOCKED.
CREATE TABLE IF NOT EXISTS jobs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type        TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','succeeded','failed')),
  payload     JSONB NOT NULL DEFAULT '{}',
  error       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS jobs_queued_idx ON jobs (created_at) WHERE status = 'queued';

-- ---------------------------------------------------------------------------
-- SBOM storage. Format-neutral: SPDX 2.x/3.0 and CycloneDX 1.x map onto these.
-- Raw payloads are kept out of these tables so queries never touch blobs.
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE sbom_format AS ENUM ('spdx','cyclonedx');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS sbom_documents (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  format            sbom_format NOT NULL,
  spec_version      TEXT NOT NULL,
  -- SPDX documentNamespace | CycloneDX serialNumber[+version]. Nullable: many CDX docs lack serialNumber.
  doc_identity      TEXT,
  name              TEXT,
  created_at        TIMESTAMPTZ,
  tool              TEXT,
  content_sha256    TEXT NOT NULL UNIQUE,   -- idempotent re-ingest
  -- DESCRIBES target / metadata.component. No FK (circular with components); nullable for flat SBOMs.
  root_component_id BIGINT,
  job_id            UUID REFERENCES jobs(id),
  ingested_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sbom_documents_identity_idx ON sbom_documents (doc_identity) WHERE doc_identity IS NOT NULL;

CREATE TABLE IF NOT EXISTS components (
  id                       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  document_id              UUID NOT NULL REFERENCES sbom_documents(id) ON DELETE CASCADE,
  -- Primary containment parent (CDX nesting, SPDX CONTAINS source). NULL = child of the document itself.
  parent_id                BIGINT REFERENCES components(id) ON DELETE CASCADE,
  -- SPDXID | bom-ref. Nullable: bom-ref is often absent in CDX.
  local_ref                TEXT,
  name                     TEXT NOT NULL,
  version                  TEXT,
  purl                     TEXT,
  type                     TEXT,               -- library | application | framework | ...
  supplier                 TEXT,
  hashes                   JSONB,
  license_declared_raw     TEXT,               -- raw expression, incl. NONE / NOASSERTION
  license_concluded_raw    TEXT,
  UNIQUE (document_id, local_ref)
);
CREATE INDEX IF NOT EXISTS components_name_version_idx ON components (lower(name), version);  -- query with WHERE lower(name) = lower($1)
CREATE INDEX IF NOT EXISTS components_purl_idx ON components (purl) WHERE purl IS NOT NULL;
CREATE INDEX IF NOT EXISTS components_document_idx ON components (document_id);
CREATE INDEX IF NOT EXISTS components_parent_idx ON components (parent_id) WHERE parent_id IS NOT NULL;

-- Dependency graph (many parents allowed). Direction normalized: X BUILD_DEPENDENCY_OF Y is stored as Y depends_on X.
CREATE TABLE IF NOT EXISTS component_edges (
  document_id  UUID   NOT NULL REFERENCES sbom_documents(id) ON DELETE CASCADE,
  from_id      BIGINT NOT NULL REFERENCES components(id) ON DELETE CASCADE,
  to_id        BIGINT NOT NULL REFERENCES components(id) ON DELETE CASCADE,
  rel_type     TEXT   NOT NULL,                -- depends_on | build_depends_on | runtime_depends_on | contains | other
  raw_rel_type TEXT,
  PRIMARY KEY (from_id, to_id, rel_type)
);
CREATE INDEX IF NOT EXISTS component_edges_to_idx ON component_edges (to_id);
CREATE INDEX IF NOT EXISTS component_edges_document_idx ON component_edges (document_id);

-- Cross-document linkage (SPDX externalDocumentRefs, CDX bom-link). Target may be ingested later.
CREATE TABLE IF NOT EXISTS document_links (
  id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  from_document_id    UUID NOT NULL REFERENCES sbom_documents(id) ON DELETE CASCADE,
  from_component_id   BIGINT REFERENCES components(id) ON DELETE CASCADE,
  target_identity     TEXT NOT NULL,           -- matched against sbom_documents.doc_identity
  to_document_id      UUID REFERENCES sbom_documents(id) ON DELETE SET NULL,  -- NULL until resolved
  link_type           TEXT NOT NULL CHECK (link_type IN ('external_doc_ref','bom_link'))
);
CREATE INDEX IF NOT EXISTS document_links_from_idx ON document_links (from_document_id);
CREATE INDEX IF NOT EXISTS document_links_to_idx ON document_links (to_document_id) WHERE to_document_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS document_links_unresolved_idx ON document_links (target_identity) WHERE to_document_id IS NULL;

-- Licenses: expressions are exploded to leaf ids so `--license MIT` matches 'MIT AND ISC'.
-- NONE / NOASSERTION create no rows (see components.license_*_raw).
CREATE TABLE IF NOT EXISTS licenses (
  id           INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  key_lc       TEXT NOT NULL UNIQUE,           -- lower(SPDX id | LicenseRef | free-text name)
  display      TEXT NOT NULL,
  is_spdx      BOOLEAN NOT NULL DEFAULT true,  -- false: LicenseRef-* or CDX free-text name
  is_exception BOOLEAN NOT NULL DEFAULT false  -- e.g. LLVM-exception from 'Apache-2.0 WITH LLVM-exception'
);

CREATE TABLE IF NOT EXISTS component_licenses (
  component_id BIGINT NOT NULL REFERENCES components(id) ON DELETE CASCADE,
  license_id   INT    NOT NULL REFERENCES licenses(id),
  kind         TEXT   NOT NULL CHECK (kind IN ('declared','concluded','evidence')),
  PRIMARY KEY (component_id, license_id, kind)
);
CREATE INDEX IF NOT EXISTS component_licenses_license_idx ON component_licenses (license_id, component_id);
