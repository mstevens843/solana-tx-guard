// R07 — CloseAccount sweeping lamports to a non-owner. Closing a token account sends its rent
// (and any swept balance) to the destination; a destination that isn't the owner is a sweep.

import type { Finding, Rule } from "../types.js";
import { TOKEN_PROGRAMS } from "../constants/programIds.js";

export const closeAccountRule: Rule = {
  id: "R07_TOKEN_CLOSE_SWEEP",
  category: "sweep",
  evaluate(ctx) {
    const out: Finding[] = [];
    for (const ix of ctx.tx.instructions) {
      if (!TOKEN_PROGRAMS.has(ix.programId)) continue;
      if (ix.decoded.kind !== "CloseAccount") continue;
      const owner = ix.accounts[2]; // [account, destination, owner]
      const dest = ix.accounts[1];
      if (!owner || owner.address !== ctx.user) continue;
      if (!dest || dest.address === ctx.user) continue;
      out.push({
        id: "R07_TOKEN_CLOSE_SWEEP",
        kind: "close-account-sweep",
        severity: "WARNING",
        instructionIndex: ix.index,
        address: dest.address,
        message:
          "This closes one of your token accounts and sends its rent (and any leftover balance) to another address.",
      });
    }
    return out;
  },
};
