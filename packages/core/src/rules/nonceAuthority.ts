// R08b — Nonce account AuthorizeNonceAccount / WithdrawNonceAccount by the user. Reassigning a
// durable-nonce authority (or draining it) weaponizes the never-expiring transaction chain (R01).

import type { Finding, Rule } from "../types.js";

export const nonceAuthorityRule: Rule = {
  id: "R08B_NONCE_AUTHORITY_HIJACK",
  category: "replay/time-bomb",
  evaluate(ctx) {
    const out: Finding[] = [];
    for (const ix of ctx.tx.instructions) {
      if (ix.decoded.program !== "system") continue;
      const k = ix.decoded.kind;
      if (k !== "AuthorizeNonceAccount" && k !== "WithdrawNonceAccount") continue;
      const userIsAuthority = ix.accounts.some((a) => a.address === ctx.user && a.signer);
      if (!userIsAuthority) continue;
      out.push({
        id: "R08B_NONCE_AUTHORITY_HIJACK",
        kind: "nonce-authority-change",
        severity: "WARNING",
        instructionIndex: ix.index,
        message:
          k === "AuthorizeNonceAccount"
            ? "This changes the authority of your durable-nonce account — combined with a never-expiring transaction this enables a held drain."
            : "This withdraws lamports from your durable-nonce account.",
      });
    }
    return out;
  },
};
