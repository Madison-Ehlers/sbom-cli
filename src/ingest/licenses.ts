import type { LicenseLeaf } from "./types";

const NO_VALUE = /^(NONE|NOASSERTION)$/i;

function leaf(display: string, isException = false): LicenseLeaf {
  return {
    key: display.toLowerCase(),
    display,
    isSpdx: !/^(LicenseRef|DocumentRef)-/i.test(display),
    isException,
  };
}

/** CycloneDX `license.name`: free text, not an SPDX id. */
export function freeTextLicense(name: string): LicenseLeaf[] {
  const n = name.trim();
  return !n || NO_VALUE.test(n) ? [] : [{ key: n.toLowerCase(), display: n, isSpdx: false, isException: false }];
}

/**
 * Explodes an SPDX license expression to its leaf ids so `--license MIT` matches 'MIT AND ISC'.
 * 'Apache-2.0 WITH LLVM-exception' yields Apache-2.0 plus LLVM-exception (flagged). NONE/NOASSERTION yield nothing.
 * Tokenizer only; the expression is not validated.
 */
export function parseLicenseExpression(expr: string): LicenseLeaf[] {
  const leaves = new Map<string, LicenseLeaf>();
  let afterWith = false;
  for (const tok of expr.replace(/[()]/g, " ").split(/\s+/).filter(Boolean)) {
    const up = tok.toUpperCase();
    if (up === "AND" || up === "OR") afterWith = false;
    else if (up === "WITH") afterWith = true;
    else {
      if (!NO_VALUE.test(tok)) leaves.set(tok.toLowerCase(), leaf(tok, afterWith));
      afterWith = false;
    }
  }
  return [...leaves.values()];
}
