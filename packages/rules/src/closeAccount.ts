// R07 — CloseAccount sweeping lamports to a non-owner.  [STUB — TODO implement]
// tell: Token/Token-2022 ix byte[0]==9 (CloseAccount); accounts [tokenAcct, destination, owner].
//       Flag when destination != owner/user. WSOL close to a non-owner = unwrap-to-attacker.
//       Escalate to DANGER when paired with a preceding Transfer to the same destination.
import type { Rule } from "@txshield/core";

export const closeAccountRule: Rule = {
  id: "R07_TOKEN_CLOSE_SWEEP",
  category: "sweep",
  evaluate() {
    return [];
  },
};
