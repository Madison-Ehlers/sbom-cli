// Format-neutral model produced by the parsers and consumed by persist.ts.
// Components reference each other by array index; DB ids are assigned at persist time.

export type SbomFormat = "cyclonedx" | "spdx";
export type ParserKind = "cyclonedx" | "spdx2" | "spdx3";
export type LicenseKind = "declared" | "concluded" | "evidence";
export type RelType = "depends_on" | "build_depends_on" | "runtime_depends_on" | "contains" | "other";

export interface LicenseLeaf {
  key: string; // lower-cased, unique key in `licenses`
  display: string;
  isSpdx: boolean;
  isException: boolean;
}

export interface NormComponent {
  localRef: string | null;
  parent: number | null;
  name: string;
  version: string | null;
  purl: string | null;
  type: string | null;
  supplier: string | null;
  hashes: Record<string, string> | null; // e.g. { sha256: "..." }
  licenseDeclaredRaw: string | null;
  licenseConcludedRaw: string | null;
  licenses: { kind: LicenseKind; leaf: LicenseLeaf }[];
}

export interface NormEdge {
  from: number;
  to: number;
  relType: RelType;
  rawRelType: string | null;
}

export interface NormLink {
  fromComponent: number | null;
  targetIdentity: string;
  linkType: "external_doc_ref" | "bom_link";
}

export interface NormSbom {
  format: SbomFormat;
  specVersion: string;
  docIdentity: string | null;
  name: string | null;
  createdAt: Date | null;
  tool: string | null;
  root: number | null;
  components: NormComponent[];
  edges: NormEdge[];
  links: NormLink[];
  droppedRelationships: number; // relationships whose endpoints are not stored components (files, NOASSERTION, ...)
}

/** Bad input; reported to the user as-is (400 from the API, failed job from the worker). */
export class ValidationError extends Error {}
