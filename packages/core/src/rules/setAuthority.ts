// R03/R04/R05 — SPL Token / Token-2022 SetAuthority. Reassigning the owner or close authority
// of the user's token account (or mint/freeze authority) to another party is a takeover.
// Fires when the current authority (account index 1) is the protected user.

import type { Finding, Rule } from "../types.js";
import { TOKEN_PROGRAMS } from "../constants/programIds.js";

export const setAuthorityRule: Rule = {
  id: "R03_TOKEN_SETAUTHORITY",
  category: "ownership-hijack",
  evaluate(ctx) {
    const out: Finding[] = [];
    for (const ix of ctx.tx.instructions) {
      if (!TOKEN_PROGRAMS.has(ix.programId)) continue;
      if (ix.decoded.kind !== "SetAuthority") continue;

      const authority = ix.accounts[1];
      if (!authority || authority.address !== ctx.user) continue;
      const target = ix.accounts[0]?.address;
      const at = ix.decoded.fields?.authorityType as number | undefined;

      if (at === 2) {
        // AccountOwner — full takeover of the user's token account.
        out.push({
          id: "R03_TOKEN_SETAUTHORITY_OWNER",
          kind: "token-account-takeover",
          severity: "CRITICAL",
          instructionIndex: ix.index,
          ...(target ? { address: target } : {}),
          message:
            "This hands ownership of your token account to someone else — they can move or close it and take your tokens. Do not sign.",
        });
      } else if (at === 3) {
        out.push({
          id: "R04_TOKEN_SETAUTHORITY_CLOSE",
          kind: "close-authority-grab",
          severity: "WARNING",
          instructionIndex: ix.index,
          ...(target ? { address: target } : {}),
          message:
            "This grants another account the right to close your token account later and sweep its rent.",
        });
      } else if (at === 0 || at === 1) {
        out.push({
          id: "R05_TOKEN_SETAUTHORITY_MINTFREEZE",
          kind: "mint-or-freeze-authority-transfer",
          severity: "WARNING",
          instructionIndex: ix.index,
          ...(target ? { address: target } : {}),
          message:
            "This transfers mint or freeze authority to another account — they could mint unlimited supply or freeze holders.",
        });
      } else {
        // Unknown authority type → fail closed.
        out.push({
          id: "R03_TOKEN_SETAUTHORITY_UNKNOWN",
          kind: "set-authority-unknown",
          severity: "WARNING",
          instructionIndex: ix.index,
          message:
            "This changes an authority on your token account in a way TxShield could not classify. Treated as unsafe.",
        });
      }
    }
    return out;
  },
};
