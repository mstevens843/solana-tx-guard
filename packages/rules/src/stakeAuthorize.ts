// R19 — Stake account Authorize hijack.  [STUB — currently fail-closed via R23 undecoded-sensitive]
// tell: program == Stake11111…; ix byte[0] ∈ {1 Authorize, 8 AuthorizeWithSeed, 10/11 Checked}.
//       StakeAuthorize==1 (Withdrawer) to a non-user key = CRITICAL; ==0 (Staker) = DANGER.
//       Also SetLockup (byte 6). Until implemented, stake ixs are flagged by R23 fail-closed.
import type { Rule } from "@txshield/core";

export const stakeAuthorizeRule: Rule = {
  id: "R19_STAKE_AUTHORIZE_HIJACK",
  category: "ownership-hijack",
  evaluate() {
    return [];
  },
};
