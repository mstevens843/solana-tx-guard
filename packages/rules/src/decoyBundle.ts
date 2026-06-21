// R16 — Decoy instructions hiding the real drain (no short-circuit).  [STUB — TODO implement]
// tell: the tx verdict is the union of per-instruction findings (worst single ix), never a single
//       "looks like a swap" headline. Flag ComputeBudget/Memo padding used to push a dangerous ix
//       past a UI preview cutoff. The engine already unions findings; this rule adds the explicit
//       "buried dangerous instruction among decoys" annotation + full decoded-ix rendering.
import type { Rule } from "@txshield/core";

export const decoyBundleRule: Rule = {
  id: "R16_DECOY_INSTRUCTION_BUNDLE",
  category: "obfuscation",
  evaluate() {
    return [];
  },
};
