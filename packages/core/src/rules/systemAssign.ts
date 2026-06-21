// R02 — System account ownership reassignment via Assign / AssignWithSeed. Handing the owner
// of a signer/user account to another program lets that program drain it arbitrarily later.

import type { Finding, Rule } from "../types.js";

export const systemAssignRule: Rule = {
  id: "R02_OWNER_REASSIGN_ASSIGN",
  category: "ownership-hijack",
  evaluate(ctx) {
    const out: Finding[] = [];
    for (const ix of ctx.tx.instructions) {
      if (ix.decoded.program !== "system") continue;
      if (ix.decoded.kind !== "Assign" && ix.decoded.kind !== "AssignWithSeed") continue;
      const target = ix.accounts[0];
      if (!target) continue;
      const targetsUser = target.address === ctx.user;
      const targetsWritableSigner = target.writable && target.signer;
      if (targetsUser || targetsWritableSigner) {
        out.push({
          id: "R02_OWNER_REASSIGN_ASSIGN",
          kind: "owner-reassignment",
          severity: "CRITICAL",
          instructionIndex: ix.index,
          address: target.address,
          message:
            "This transaction hands ownership of one of your accounts to another program. The new owner can drain its balance and data at will. This is almost never legitimate — do not sign.",
        });
      }
    }
    return out;
  },
};
