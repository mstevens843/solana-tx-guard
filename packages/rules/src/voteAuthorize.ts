// R20 — Vote account Authorize / UpdateValidatorIdentity / Withdraw.  [STUB — fail-closed via R23]
// tell: program == Vote111…; flag Authorize(1)/AuthorizeChecked(10) changing withdraw authority,
//       UpdateValidatorIdentity(4), or Withdraw(3) to an unknown key (validator-operator wallets).
import type { Rule } from "@txshield/core";

export const voteAuthorizeRule: Rule = {
  id: "R20_VOTE_AUTHORIZE_HIJACK",
  category: "ownership-hijack",
  evaluate() {
    return [];
  },
};
