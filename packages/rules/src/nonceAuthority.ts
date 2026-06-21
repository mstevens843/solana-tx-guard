// R08b — Nonce account AuthorizeNonceAccount / WithdrawNonceAccount.  [STUB — TODO implement]
// tell: System ix u32==7 (AuthorizeNonceAccount) reassigning a user nonce authority to a
//       non-user key, or ==5 (WithdrawNonceAccount) pulling lamports to a non-user dest.
//       Completes/weaponizes the durable-nonce chain (correlate with R01).
import type { Rule } from "@txshield/core";

export const nonceAuthorityRule: Rule = {
  id: "R08B_NONCE_AUTHORITY_HIJACK",
  category: "replay/time-bomb",
  evaluate() {
    return [];
  },
};
