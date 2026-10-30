import type { LicenseKind, LicenseLeaf, NormComponent, NormEdge, NormLink, NormSbom, RelType } from "./types";

export type ComponentInit = Partial<Omit<NormComponent, "name" | "licenses">> & { name: string };

/** Accumulates components/edges for a parser and enforces the schema's invariants. */
export class SbomBuilder {
  components: NormComponent[] = [];
  edges: NormEdge[] = [];
  links: NormLink[] = [];
  dropped = 0;
  private byRef = new Map<string, number>();

  add(init: ComponentInit, licenses: { kind: LicenseKind; leaf: LicenseLeaf }[] = []): number {
    // UNIQUE (document_id, local_ref): duplicate refs occur in the wild; first one wins, later ones become anonymous.
    let localRef = init.localRef ?? null;
    if (localRef !== null) {
      if (this.byRef.has(localRef)) localRef = null;
      else this.byRef.set(localRef, this.components.length);
    }
    const seen = new Set<string>();
    this.components.push({
      parent: null,
      version: null,
      purl: null,
      type: null,
      supplier: null,
      hashes: null,
      licenseDeclaredRaw: null,
      licenseConcludedRaw: null,
      ...init,
      localRef,
      licenses: licenses.filter(({ kind, leaf }) => {
        const k = `${kind}:${leaf.key}`;
        return !seen.has(k) && !!seen.add(k);
      }),
    });
    return this.components.length - 1;
  }

  indexOf(ref: string): number | undefined {
    return this.byRef.get(ref);
  }

  /** Edge between two refs; endpoints that are not stored components are counted and dropped. */
  edge(fromRef: string, toRef: string, relType: RelType, rawRelType: string | null = null) {
    const from = this.byRef.get(fromRef);
    const to = this.byRef.get(toRef);
    if (from === undefined || to === undefined || from === to) {
      this.dropped++;
      return;
    }
    this.edges.push({ from, to, relType, rawRelType });
  }

  /** Sets the primary containment parent unless one exists or it would create a cycle (keeps recursive CTEs finite). */
  setParent(child: number, parent: number) {
    if (this.components[child].parent !== null) return;
    for (let p: number | null = parent; p !== null; p = this.components[p].parent) {
      if (p === child) return;
    }
    this.components[child].parent = parent;
  }

  finish(meta: Omit<NormSbom, "components" | "edges" | "links" | "droppedRelationships">): NormSbom {
    return {
      ...meta,
      components: this.components,
      edges: this.edges,
      links: this.links,
      droppedRelationships: this.dropped,
    };
  }
}

export const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
export const arr = (v: unknown): any[] => (Array.isArray(v) ? v : []);
export const obj = (v: unknown): any => (v && typeof v === "object" && !Array.isArray(v) ? v : {});
export const date = (v: unknown): Date | null => {
  const d = typeof v === "string" ? new Date(v) : null;
  return d && !isNaN(d.getTime()) ? d : null;
};
/** 'SHA-256' / 'SHA256' / 'sha256' -> 'sha256' */
export const hashAlg = (a: string) => a.toLowerCase().replace(/[^a-z0-9]/g, "");
