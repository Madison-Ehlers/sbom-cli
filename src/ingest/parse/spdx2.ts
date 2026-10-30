import { arr, date, hashAlg, obj, SbomBuilder, str } from "../builder";
import { parseLicenseExpression } from "../licenses";
import type { NormSbom, RelType } from "../types";

// SPDX 2.x relationship -> normalized type. `inv` = stored as `to <type> from` (X BUILD_DEPENDENCY_OF Y => Y build_depends_on X).
const REL: Record<string, { type: RelType; inv?: boolean }> = {
  DEPENDS_ON: { type: "depends_on" },
  DEPENDENCY_OF: { type: "depends_on", inv: true },
  BUILD_DEPENDENCY_OF: { type: "build_depends_on", inv: true },
  RUNTIME_DEPENDENCY_OF: { type: "runtime_depends_on", inv: true },
  CONTAINS: { type: "contains" },
  CONTAINED_BY: { type: "contains", inv: true },
};

const DOC_ID = "SPDXRef-DOCUMENT";

/** SPDX 2.x JSON. `files` are not stored. */
export function parseSpdx2(doc: any): NormSbom {
  const b = new SbomBuilder();

  for (const p of arr(doc.packages)) {
    const o = obj(p);
    const declared = str(o.licenseDeclared);
    const concluded = str(o.licenseConcluded);
    const purl = arr(o.externalRefs).find((r) => String(obj(r).referenceType).toLowerCase() === "purl");
    b.add(
      {
        localRef: str(o.SPDXID),
        name: str(o.name) ?? "(unnamed)",
        version: str(o.versionInfo),
        purl: str(obj(purl).referenceLocator),
        type: str(o.primaryPackagePurpose)?.toLowerCase() ?? null,
        supplier: actor(o.supplier),
        hashes: checksums(o.checksums),
        licenseDeclaredRaw: declared,
        licenseConcludedRaw: concluded,
      },
      [
        ...(declared ? parseLicenseExpression(declared).map((leaf) => ({ kind: "declared" as const, leaf })) : []),
        ...(concluded ? parseLicenseExpression(concluded).map((leaf) => ({ kind: "concluded" as const, leaf })) : []),
      ]
    );
  }

  let root: number | null = null;
  const setRoot = (ref: unknown) => {
    const i = typeof ref === "string" ? b.indexOf(ref) : undefined;
    if (root === null && i !== undefined) root = i;
  };
  for (const ref of arr(doc.documentDescribes)) setRoot(ref);

  for (const r of arr(doc.relationships)) {
    const from = str(obj(r).spdxElementId);
    const to = str(obj(r).relatedSpdxElement);
    const raw = str(obj(r).relationshipType);
    if (!from || !to || !raw) continue;
    if (raw === "DESCRIBES" && from === DOC_ID) setRoot(to);
    else if (raw === "DESCRIBED_BY" && to === DOC_ID) setRoot(from);
    else if (from === DOC_ID || to === DOC_ID) continue; // other document-level relationships
    else {
      const m = REL[raw] ?? { type: "other" as const };
      const [f, t] = m.inv ? [to, from] : [from, to];
      const before = b.edges.length;
      b.edge(f, t, m.type, raw);
      if (m.type === "contains" && b.edges.length > before) b.setParent(b.edges[before].to, b.edges[before].from);
    }
  }

  // externalDocumentRefs[].spdxDocument is the target's documentNamespace
  for (const ref of arr(doc.externalDocumentRefs)) {
    const target = str(obj(ref).spdxDocument);
    if (target) b.links.push({ fromComponent: null, targetIdentity: target, linkType: "external_doc_ref" });
  }

  const info = obj(doc.creationInfo);
  const tools = arr(info.creators)
    .filter((c) => typeof c === "string" && c.startsWith("Tool:"))
    .map((c: string) => c.slice(5).trim());
  return b.finish({
    format: "spdx",
    specVersion: String(doc.spdxVersion).replace(/^SPDX-/, ""),
    docIdentity: str(doc.documentNamespace),
    name: str(doc.name),
    createdAt: date(info.created),
    tool: tools.join(", ") || null,
    root,
  });
}

/** 'Organization: Acme' -> 'Acme'; NOASSERTION -> null */
function actor(v: unknown): string | null {
  const s = str(v);
  return !s || s === "NOASSERTION" ? null : s.replace(/^(Organization|Person):\s*/, "");
}

function checksums(list: unknown): Record<string, string> | null {
  const out: Record<string, string> = {};
  for (const c of arr(list)) {
    const alg = str(obj(c).algorithm);
    const val = str(obj(c).checksumValue);
    if (alg && val) out[hashAlg(alg)] = val;
  }
  return Object.keys(out).length ? out : null;
}
