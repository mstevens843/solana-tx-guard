// R16 — Decoy/padding. Genuine no-op padding (Memo spam) in front of a value-moving instruction
// is a UI-truncation trick. ComputeBudget instructions are EXCLUDED — every legitimate swap ships
// 1–2 of them, so counting them would false-fire on normal traffic. Only real no-op padding counts.

import { COMPUTE_BUDGET_PROGRAM, INERT_PROGRAMS } from "../constants/programIds.js";
import type { Finding, Rule } from "../types.js";
import { isValueOrAuthorityIx } from "./shared.js";

export const decoyBundleRule: Rule = {
  id: "R16_DECOY_INSTRUCTION_BUNDLE",
  category: "obfuscation",
  evaluate(ctx) {
    const padding = ctx.tx.instructions.filter(
      (ix) => INERT_PROGRAMS.has(ix.programId) && ix.programId !== COMPUTE_BUDGET_PROGRAM,
    ).length;
    const buried = ctx.tx.instructions.some((ix, i) => i >= 2 && isValueOrAuthorityIx(ix));
    if (padding >= 2 && buried) {
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
