// R08 — Full / near-full native SOL transfer to an unknown recipient.  [STUB — TODO implement]
// tell: System ix u32==2 (Transfer)/==11 (TransferWithSeed). Static: recipient not allowlisted.
//       Needs simulation pre-balance to confirm "near-full"; also flag multiple transfers summing
//       to ~full balance (split-drain). Amount alone is NOT trusted (bit-flip drainers) — pair
//       with R17 TOCTOU + a Lighthouse balance assertion.
import type { Rule } from "@txshield/core";

export const solDrainRule: Rule = {
  id: "R08_FULL_SOL_TRANSFER",
  category: "sweep",
  evaluate() {
    return [];
  },
};
