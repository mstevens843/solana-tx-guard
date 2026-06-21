// R20 — Vote account authority change / withdraw (validator-operator wallets). Lower-frequency
// for normal users, so WARNING.

import type { Finding, Rule } from "../types.js";
import { VOTE_PROGRAM } from "../constants/programIds.js";

const FLAGGED = new Set([
  "Authorize",
  "AuthorizeChecked",
  "AuthorizeWithSeed",
  "AuthorizeCheckedWithSeed",
  "Withdraw",
  "UpdateValidatorIdentity",
]);

export const voteAuthorizeRule: Rule = {
  id: "R20_VOTE_AUTHORIZE_HIJACK",
  category: "ownership-hijack",
  evaluate(ctx) {
    const out: Finding[] = [];
    for (const ix of ctx.tx.instructions) {
      if (ix.programId !== VOTE_PROGRAM) continue;
      if (!ix.decoded.kind || !FLAGGED.has(ix.decoded.kind)) continue;
      const userSigner = ix.accounts.some((a) => a.address === ctx.user && a.signer);
      if (!userSigner) continue;
      out.push({
        id: "R20_VOTE_AUTHORIZE_HIJACK",
        kind: "vote-authority-change",
        severity: "WARNING",
        instructionIndex: ix.index,
        message: "This changes an authority on, or withdraws from, your vote account.",
      });
    }
    return out;
  },
};
