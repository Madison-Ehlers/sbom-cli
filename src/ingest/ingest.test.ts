import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { detect, parseSbom } from "./index";
import { parseLicenseExpression } from "./licenses";

const load = (f: string) => JSON.parse(readFileSync(join(__dirname, "../../fixtures", f), "utf8"));

test("license expressions explode to leaf ids", () => {
  assert.deepEqual(parseLicenseExpression("MIT AND (ISC OR Apache-2.0 WITH LLVM-exception)").map((l) => [l.key, l.isException]), [
    ["mit", false], ["isc", false], ["apache-2.0", false], ["llvm-exception", true],
  ]);
  assert.deepEqual(parseLicenseExpression("NOASSERTION"), []);
  assert.equal(parseLicenseExpression("LicenseRef-foo")[0].isSpdx, false);
});

test("detect rejects non-SBOM input", () => {
  assert.throws(() => detect({ hello: "world" }), /not a recognized SBOM/);
  assert.throws(() => detect([]), /top level/);
  assert.throws(() => detect({ bomFormat: "CycloneDX", specVersion: "2.0" }), /unsupported/);
  assert.equal(detect(load("spdx-3.0.json")).parser, "spdx3");
});

test("cyclonedx 1.6", () => {
  const s = parseSbom(load("cyclonedx-1.6.json"));
  assert.equal(s.docIdentity, "urn:cdx:3e671687-395b-41f5-a30f-a58921a69b79/1");
  assert.equal(s.tool, "cdxgen 11.0.0");
  assert.equal(s.components.length, 4); // root + 3
  assert.equal(s.components[s.root!].name, "demo-app");
  const a = s.components.find((c) => c.name === "left-pad")!;
  assert.deepEqual(a.hashes, { sha256: "abc123" });
  assert.equal(a.licenseConcludedRaw, "ISC");
  assert.deepEqual(a.licenses.map((l) => `${l.kind}:${l.leaf.key}`), ["declared:mit", "concluded:isc"]);
  const nested = s.components.find((c) => c.name === "nested")!;
  assert.equal(s.components[nested.parent!].name, "left-pad");
  assert.equal(nested.licenses[0].leaf.isSpdx, false);
  assert.equal(s.edges.length, 3);
  assert.equal(s.droppedRelationships, 1); // missing-ref
  assert.deepEqual(s.links.map((l) => l.targetIdentity), ["urn:cdx:11111111-2222-3333-4444-555555555555/1"]);
});

test("spdx 3.0", () => {
  const s = parseSbom(load("spdx-3.0.json"));
  assert.equal(s.specVersion, "3.0.1");
  assert.equal(s.docIdentity, "https://example.com/spdx/demo-3.0");
  assert.equal(s.tool, "syft");
  assert.equal(s.components[s.root!].name, "demo-app");
  const zlib = s.components.find((c) => c.name === "zlib")!;
  assert.equal(zlib.supplier, "Acme Corp");
  assert.deepEqual(zlib.licenses.map((l) => l.leaf.key), ["zlib", "mit"]);
  assert.equal(s.components[zlib.parent!].name, "demo-app");
  assert.deepEqual(s.edges.map((e) => e.relType).sort(), ["build_depends_on", "contains", "depends_on"]);
  const ssl = s.components.find((c) => c.name === "openssl")!;
  assert.equal(ssl.licenseDeclaredRaw, "NOASSERTION");
  assert.equal(ssl.licenseConcludedRaw, "Apache-2.0");
});

test("spdx 2.x relationships are direction-normalized and cycle-safe", () => {
  const s = parseSbom({
    spdxVersion: "SPDX-2.3", documentNamespace: "https://x/y", name: "d",
    creationInfo: { created: "2026-01-01T00:00:00Z", creators: ["Tool: t-1"] },
    externalDocumentRefs: [{ externalDocumentId: "DocumentRef-o", spdxDocument: "https://other/ns" }],
    packages: [
      { SPDXID: "SPDXRef-a", name: "a", licenseDeclared: "MIT", supplier: "Organization: Acme" },
      { SPDXID: "SPDXRef-b", name: "b", licenseDeclared: "NOASSERTION" },
    ],
    relationships: [
      { spdxElementId: "SPDXRef-DOCUMENT", relationshipType: "DESCRIBES", relatedSpdxElement: "SPDXRef-a" },
      { spdxElementId: "SPDXRef-b", relationshipType: "BUILD_DEPENDENCY_OF", relatedSpdxElement: "SPDXRef-a" },
      { spdxElementId: "SPDXRef-a", relationshipType: "CONTAINS", relatedSpdxElement: "SPDXRef-b" },
      { spdxElementId: "SPDXRef-b", relationshipType: "CONTAINS", relatedSpdxElement: "SPDXRef-a" },
    ],
  });
  assert.equal(s.specVersion, "2.3");
  assert.equal(s.components[s.root!].name, "a");
  assert.equal(s.components[0].supplier, "Acme");
  assert.deepEqual(s.edges.map((e) => [e.from, e.to, e.relType]), [[0, 1, "build_depends_on"], [0, 1, "contains"], [1, 0, "contains"]]);
  assert.equal(s.components[1].parent, 0);
  assert.equal(s.components[0].parent, null); // b CONTAINS a would be a cycle
  assert.equal(s.links[0].targetIdentity, "https://other/ns");
});
