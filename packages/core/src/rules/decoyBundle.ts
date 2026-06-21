// R16 — Decoy/padding. Several no-op instructions (ComputeBudget/Memo) in front of a
// value-moving one is a UI-truncation trick. The engine already unions all findings; this adds
// an explicit "review every instruction" nudge.

import type { Finding, Rule } from "../types.js";
import { INERT_PROGRAMS } from "../constants/programIds.js";
import { isValueOrAuthorityIx } from "./shared.js";

export const decoyBundleRule: Rule = {
  id: "R16_DECOY_INSTRUCTION_BUNDLE",
  category: "obfuscation",
  evaluate(ctx) {
    const inert = ctx.tx.instructions.filter((ix) => INERT_PROGRAMS.has(ix.programId)).length;
    const buried = ctx.tx.instructions.some((ix, i) => i >= 2 && isValueOrAuthorityIx(ix));
    if (inert >= 2 && buried) {
      return [
        {
          id: "R16_DECOY_INSTRUCTION_BUNDLE",
          kind: "review-all-instructions",
          severity: "INFO",
          message:
            "This transaction pads several no-op instructions before a value-moving one. Review every instruction, not just the first.",
        },
      ];
    }
    return [];
  },
};
