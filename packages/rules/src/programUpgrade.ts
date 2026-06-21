// R21 — Program upgrade-authority change or live Upgrade.  [STUB — fail-closed via R23]
// tell: program == BPFLoaderUpgradeab1e…; ix byte[0]==4/7 (SetAuthority[Checked]) moving upgrade
//       authority to a non-user/non-renounced key, or ==3 (Upgrade) swapping code in the same tx.
//       Renounce (None) = INFO.
import type { Rule } from "@txshield/core";

export const programUpgradeRule: Rule = {
  id: "R21_PROGRAM_UPGRADE_AUTHORITY",
  category: "program-control",
  evaluate() {
    return [];
  },
};
