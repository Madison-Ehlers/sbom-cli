import { arr, date, hashAlg, obj, SbomBuilder, str } from "../builder";
import { freeTextLicense, parseLicenseExpression } from "../licenses";
import type { LicenseKind, LicenseLeaf, NormSbom } from "../types";

type Lic = { kind: LicenseKind; leaf: LicenseLeaf };

/** CycloneDX 1.2-1.6 JSON. */
export function parseCycloneDx(doc: any): NormSbom {
  const b = new SbomBuilder();

  const visit = (c: any, parent: number | null): number => {
    const o = obj(c);
    const { declared, concluded, items } = licenses(o.licenses);
    const evidence = arr(obj(o.evidence).licenses);
    const purl = str(o.purl);
    const idx = b.add(
      {
        localRef: str(o["bom-ref"]),
        parent,
        name: str(o.name) ?? purl ?? "(unnamed)",
        version: str(o.version),
        purl,
        type: str(o.type),
        supplier: str(obj(o.supplier).name) ?? str(o.publisher),
        hashes: hashes(o.hashes),
        licenseDeclaredRaw: declared,
        licenseConcludedRaw: concluded,
      },
      [...items, ...licenses(evidence).items.map(({ leaf }) => ({ kind: "evidence" as const, leaf }))]
    );
    // bom-link to another document: urn:cdx:<serial>/<version>[#bom-ref]
    for (const ref of arr(o.externalReferences)) {
      const url = str(obj(ref).url);
      if (obj(ref).type === "bom" && url?.startsWith("urn:cdx:")) {
        b.links.push({ fromComponent: idx, targetIdentity: url.split("#")[0], linkType: "bom_link" });
      }
    }
    for (const child of arr(o.components)) visit(child, idx);
    return idx;
  };

  const meta = obj(doc.metadata);
  const root = meta.component ? visit(meta.component, null) : null;
  for (const c of arr(doc.components)) visit(c, null);

  for (const d of arr(doc.dependencies)) {
    const from = str(obj(d).ref);
    if (!from) continue;
    for (const to of arr(obj(d).dependsOn)) if (typeof to === "string") b.edge(from, to, "depends_on", "dependsOn");
  }

  const serial = str(doc.serialNumber)?.replace(/^urn:uuid:/i, "");
  return b.finish({
    format: "cyclonedx",
    specVersion: String(doc.specVersion),
    // bom-link form, so other documents' bom-links resolve against it
    docIdentity: serial ? `urn:cdx:${serial}/${Number.isInteger(doc.version) ? doc.version : 1}` : null,
    name: str(obj(meta.component).name),
    createdAt: date(meta.timestamp),
    tool: tools(meta.tools),
    root,
  });
}

/**
 * License entries -> raw text + leaves. `acknowledgement: concluded` (1.6) marks concluded; everything else is declared.
 * Multiple entries are joined with ', ' because the spec does not define AND/OR between them.
 */
function licenses(list: unknown) {
  const raw: Record<"declared" | "concluded", string[]> = { declared: [], concluded: [] };
  const items: Lic[] = [];
  for (const e of arr(list)) {
    const l = obj(obj(e).license);
    const kind: "declared" | "concluded" = l.acknowledgement === "concluded" ? "concluded" : "declared";
    const expr = str(obj(e).expression);
    const id = str(l.id);
    const name = str(l.name);
    const text = expr ?? id ?? name;
    if (!text) continue;
    raw[kind].push(text);
    const leaves = expr ? parseLicenseExpression(expr) : id ? parseLicenseExpression(id) : freeTextLicense(name!);
    for (const leaf of leaves) items.push({ kind, leaf });
  }
  return {
    declared: raw.declared.join(", ") || null,
    concluded: raw.concluded.join(", ") || null,
    items,
  };
}

function hashes(list: unknown): Record<string, string> | null {
  const out: Record<string, string> = {};
  for (const h of arr(list)) {
    const alg = str(obj(h).alg);
    const content = str(obj(h).content);
    if (alg && content) out[hashAlg(alg)] = content;
  }
  return Object.keys(out).length ? out : null;
}

/** ≤1.4: [{vendor,name,version}]; 1.5+: {components:[{name,version}], services:[...]} */
function tools(t: unknown): string | null {
  const list = Array.isArray(t) ? t : arr(obj(t).components);
  const names = list
    .map((x) => [str(obj(x).name), str(obj(x).version)].filter(Boolean).join(" "))
    .filter(Boolean);
  return names.join(", ") || null;
}
