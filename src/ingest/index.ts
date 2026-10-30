import { createHash } from "crypto";
import { parseCycloneDx } from "./parse/cyclonedx";
import { parseSpdx2 } from "./parse/spdx2";
import { parseSpdx3, specVersionFromContext } from "./parse/spdx3";
import { NormSbom, ParserKind, SbomFormat, ValidationError } from "./types";

export interface Detected {
  parser: ParserKind;
  format: SbomFormat;
  specVersion: string;
}

export const sha256 = (buf: Buffer) => createHash("sha256").update(buf).digest("hex");

export function parseJson(buf: Buffer): unknown {
  try {
    return JSON.parse(buf.toString("utf8").replace(/^﻿/, ""));
  } catch (e) {
    throw new ValidationError(`not valid JSON (${(e as Error).message}); only JSON SBOMs are supported`);
  }
}

/** Cheap structural check: is this a CycloneDX 1.x, SPDX 2.x or SPDX 3.x JSON document? */
export function detect(doc: any): Detected {
  if (!doc || typeof doc !== "object" || Array.isArray(doc)) {
    throw new ValidationError("expected a JSON object at the top level");
  }
  if (doc.bomFormat === "CycloneDX") {
    if (typeof doc.specVersion !== "string" || !/^1\.\d+$/.test(doc.specVersion)) {
      throw new ValidationError(`unsupported CycloneDX specVersion: ${JSON.stringify(doc.specVersion)}`);
    }
    if (doc.components !== undefined && !Array.isArray(doc.components)) {
      throw new ValidationError("CycloneDX 'components' must be an array");
    }
    return { parser: "cyclonedx", format: "cyclonedx", specVersion: doc.specVersion };
  }
  if (typeof doc.spdxVersion === "string" && /^SPDX-2\.\d+$/.test(doc.spdxVersion)) {
    if (doc.packages !== undefined && !Array.isArray(doc.packages)) {
      throw new ValidationError("SPDX 'packages' must be an array");
    }
    return { parser: "spdx2", format: "spdx", specVersion: doc.spdxVersion.slice(5) };
  }
  const v3 = specVersionFromContext(doc["@context"]);
  if (v3 && Array.isArray(doc["@graph"])) return { parser: "spdx3", format: "spdx", specVersion: v3 };

  throw new ValidationError(
    "not a recognized SBOM: expected CycloneDX (bomFormat/specVersion), SPDX 2.x (spdxVersion) or SPDX 3.x (@context/@graph)"
  );
}

export function parseSbom(doc: unknown): NormSbom {
  const { parser } = detect(doc);
  return { cyclonedx: parseCycloneDx, spdx2: parseSpdx2, spdx3: parseSpdx3 }[parser](doc);
}
