// R18 — Deferred-broadcast / co-signed value movement. When a transaction needs more than one
// signature, the user is a signer but NOT the fee payer (account index 0), and it moves the
// user's value, another party controls when it is broadcast — a held-drain window. (Pre-sign
// we don't key off the count of present signatures, since the user hasn't signed yet.)

import type { Finding, Rule } from "../types.js";
import { isValueOrAuthorityIx, userIsSigner } from "./shared.js";

export const partialSignRule: Rule = {
  id: "R18_DEFERRED_BROADCAST",
  category: "deferred-broadcast",
  evaluate(ctx) {
    if (ctx.tx.numRequiredSignatures <= 1) return [];
    if (!userIsSigner(ctx)) return [];
    if (ctx.tx.feePayer === ctx.user) return [];
    const movesValue = ctx.tx.instructions.some(isValueOrAuthorityIx);
    if (!movesValue) return [];
    return [
      {
        id: "R18_DEFERRED_BROADCAST",
        kind: "deferred-broadcast",
        severity: "WARNING",
        message:
          "This transaction is co-signed and you are not the fee payer, so another party decides when it is broadcast. Combined with value movement, it can be held and submitted later after your balance changes.",
      },
    ];
  },
};
