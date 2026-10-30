import { arr, date, hashAlg, obj, SbomBuilder, str } from "../builder";
import { parseLicenseExpression } from "../licenses";
import type { LicenseLeaf, NormSbom, RelType } from "../types";

/**
 * SPDX 3.0 JSON-LD: a flat `@graph` of elements linked by spdxId. Packages become components;
 * dependsOn/contains/describes and hasDeclaredLicense/hasConcludedLicense relationships are folded in.
 * Files, snippets and other element types are not stored.
 */
export function parseSpdx3(doc: any): NormSbom {
  const graph: any[] = arr(doc["@graph"]).filter((e) => e && typeof e === "object");
  const byId = new Map<string, any>();
  for (const e of graph) {
    const id = str(e.spdxId) ?? str(e["@id"]);
    if (id) byId.set(id, e);
  }
  const ofType = (t: string) => graph.filter((e) => e.type === t);
  const nameOf = (id: unknown) => str(byId.get(String(id))?.name);

  const b = new SbomBuilder();
  for (const p of ofType("software_Package")) {
    const hashes: Record<string, string> = {};
    for (const h of arr(p.verifiedUsing)) {
      if (str(h.algorithm) && str(h.hashValue)) hashes[hashAlg(h.algorithm)] = h.hashValue;
    }
    b.add({
      localRef: str(p.spdxId),
      name: str(p.name) ?? "(unnamed)",
      version: str(p.software_packageVersion),
      purl: str(p.software_packageUrl),
      type: str(p.software_primaryPurpose),
      supplier: nameOf(p.suppliedBy),
      hashes: Object.keys(hashes).length ? hashes : null,
    });
  }

  const docEl = ofType("SpdxDocument")[0] ?? ofType("software_Sbom")[0] ?? {};
  let root: number | null = null;
  const setRoot = (id: unknown) => {
    const i = typeof id === "string" ? b.indexOf(id) : undefined;
    if (root === null && i !== undefined) root = i;
  };
  for (const id of arr(docEl.rootElement)) setRoot(id);

  const links = new Map<string, { declared?: string[]; concluded?: string[] }>();
  for (const r of graph.filter((e) => typeof e.type === "string" && /Relationship$/.test(e.type))) {
    const from = str(r.from);
    const type = str(r.relationshipType);
    if (!from || !type) continue;
    const targets: string[] = arr(r.to).filter((t) => typeof t === "string");

    if (type === "hasDeclaredLicense" || type === "hasConcludedLicense") {
      const l = links.get(from) ?? {};
      const k = type === "hasDeclaredLicense" ? "declared" : "concluded";
      l[k] = [...(l[k] ?? []), ...targets];
      links.set(from, l);
    } else if (type === "describes") {
      for (const t of targets) setRoot(t);
    } else {
      // LifecycleScopedRelationship carries a scope: build | runtime | test | development | design
      const rel: RelType =
        type === "contains" ? "contains"
        : type === "dependsOn" ? (r.scope === "build" ? "build_depends_on" : r.scope === "runtime" ? "runtime_depends_on" : "depends_on")
        : "other";
      for (const t of targets) {
        const before = b.edges.length;
        b.edge(from, t, rel, type);
        if (rel === "contains" && b.edges.length > before) b.setParent(b.edges[before].to, b.edges[before].from);
      }
    }
  }

  for (const [ref, { declared, concluded }] of links) {
    const c = b.components[b.indexOf(ref) ?? -1];
    if (!c) continue;
    const apply = (ids: string[] | undefined, kind: "declared" | "concluded") => {
      const resolved = (ids ?? []).map((id) => licenseOf(byId.get(id), id));
      const raw = resolved.map((r) => r.raw).filter(Boolean).join(", ") || null;
      if (kind === "declared") c.licenseDeclaredRaw = raw;
      else c.licenseConcludedRaw = raw;
      for (const r of resolved) for (const leaf of r.leaves) c.licenses.push({ kind, leaf });
    };
    apply(declared, "declared");
    apply(concluded, "concluded");
  }

  const info = byId.get(String(docEl.creationInfo)) ?? obj(docEl.creationInfo);
  const creationInfo = graph.find((e) => e.type === "CreationInfo");
  const tool = arr((info.createdUsing ?? creationInfo?.createdUsing) as unknown[]).map(nameOf).filter(Boolean).join(", ");
  const version = str(info.specVersion ?? creationInfo?.specVersion) ?? specVersionFromContext(doc["@context"]);
  return b.finish({
    format: "spdx",
    specVersion: version ?? "3.0",
    docIdentity: str(docEl.spdxId),
    name: str(docEl.name),
    createdAt: date(info.created ?? creationInfo?.created),
    tool: tool || null,
    root,
  });
}

export function specVersionFromContext(ctx: unknown): string | null {
  const s = (Array.isArray(ctx) ? ctx : [ctx]).find((c) => typeof c === "string" && /spdx\.org\/rdf\/3\./.test(c));
  return s ? /rdf\/(3\.\d+(?:\.\d+)?)\//.exec(s)![1] : null;
}

/** A license element (expression, listed/custom license) or a bare IRI such as .../licenses/MIT or .../terms/ExpandedLicensing/NoAssertion. */
function licenseOf(el: any, id: string): { raw: string | null; leaves: LicenseLeaf[] } {
  const expr = str(el?.simplelicensing_licenseExpression);
  const text = expr ?? str(el?.name) ?? id.split("/").pop() ?? id;
  return /^(NoAssertion|None)(License)?$/i.test(text) || el?.type?.endsWith("NoAssertionLicense") || el?.type?.endsWith("NoneLicense")
    ? { raw: /none/i.test(text) ? "NONE" : "NOASSERTION", leaves: [] }
    : { raw: text, leaves: parseLicenseExpression(text) };
}
