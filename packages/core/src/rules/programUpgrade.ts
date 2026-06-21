// R21 — Upgradeable-loader authority change or live Upgrade. Moving upgrade authority to
// another account lets them replace a program's code; renouncing it (no new authority) is safe.

import type { Finding, Rule } from "../types.js";
import { BPF_LOADER_UPGRADEABLE } from "../constants/programIds.js";

export const programUpgradeRule: Rule = {
  id: "R21_PROGRAM_UPGRADE_AUTHORITY",
  category: "program-control",
  evaluate(ctx) {
    const out: Finding[] = [];
    for (const ix of ctx.tx.instructions) {
      if (ix.programId !== BPF_LOADER_UPGRADEABLE) continue;
      const k = ix.decoded.kind;
      const userSigner = ix.accounts.some((a) => a.address === ctx.user && a.signer);
      if (!userSigner) continue;

      if (k === "SetAuthority" || k === "SetAuthorityChecked") {
        // [programData/buffer, currentAuthority(signer), newAuthority?] — a 3rd account = transfer.
        if (ix.accounts.length >= 3) {
          out.push({
            id: "R21_PROGRAM_UPGRADE_AUTHORITY",
            kind: "program-authority-transfer",
            severity: "CRITICAL",
            instructionIndex: ix.index,
            message:
              "This transfers upgrade authority of a program to another account — they can replace the program's code at any time.",
          });
        } else {
          out.push({
            id: "R21_PROGRAM_AUTHORITY_RENOUNCE",
            kind: "program-authority-renounce",
            severity: "INFO",
            instructionIndex: ix.index,
            message: "This renounces upgrade authority of a program (makes it immutable).",
          });
        }
      } else if (k === "Upgrade") {
        out.push({
          id: "R21_PROGRAM_UPGRADE",
          kind: "program-upgrade",
          severity: "WARNING",
          instructionIndex: ix.index,
          message: "This deploys new code to a program in the same transaction.",
        });
      }
    }
    return out;
  },
};
