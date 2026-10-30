-- Hand-written rows so the query commands can be exercised without the ingest path.
-- Apply after db/schema.sql, ideally to a scratch database (not your ingested data).

INSERT INTO sbom_documents (id, format, spec_version, name, content_sha256) VALUES
  ('00000000-0000-0000-0000-00000000000a', 'cyclonedx', '1.6', 'shop-frontend', 'demo-sha-a'),
  ('00000000-0000-0000-0000-00000000000b', 'spdx',      '3.0', 'billing-service', 'demo-sha-b');

INSERT INTO components (id, document_id, parent_id, name, version, type) OVERRIDING SYSTEM VALUE VALUES
  (1, '00000000-0000-0000-0000-00000000000a', NULL, 'express',   '5.3.0',  'library'),
  (2, '00000000-0000-0000-0000-00000000000a', 1,    'body-parser','2.0.1', 'library'),
  (3, '00000000-0000-0000-0000-00000000000a', 1,    'Lodash',    '4.17.21','library'),
  (4, '00000000-0000-0000-0000-00000000000b', NULL, 'lodash',    '4.17.20','library'),
  (5, '00000000-0000-0000-0000-00000000000b', NULL, 'left-pad',  NULL,     'library');

INSERT INTO licenses (id, key_lc, display) OVERRIDING SYSTEM VALUE VALUES
  (1, 'mit', 'MIT'),
  (2, 'isc', 'ISC'),
  (3, 'apache-2.0', 'Apache-2.0');

-- body-parser is 'MIT AND ISC' (exploded); left-pad has only a concluded license.
INSERT INTO component_licenses (component_id, license_id, kind) VALUES
  (1, 1, 'declared'),
  (2, 1, 'declared'), (2, 2, 'declared'),
  (3, 1, 'declared'), (3, 1, 'concluded'),
  (4, 1, 'declared'),
  (5, 3, 'concluded');
