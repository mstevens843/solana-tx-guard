// @txshield/rules — the canonical rule pack. The implemented danger-pattern rules live in
// @txshield/core (so `analyze()` works out of the box); they are re-exported here. The only
// remaining stub is spoofedAta (R13 full ATA re-derivation needs ed25519/sha256).

import { defaultRules } from "@txshield/core";

export {
  durableNonceRule,
  systemAssignRule,
  setAuthorityRule,
  approveDelegateRule,
  closeAccountRule,
  nonceAuthorityRule,
  solDrainRule,
  stakeAuthorizeRule,
  voteAuthorizeRule,
  programUpgradeRule,
  sensitiveViaAltRule,
  token2022GuardRule,
  decoyBundleRule,
  undecodedSensitiveRule,
  unknownProgramWritableRule,
  partialSignRule,
} from "@txshield/core";

export { spoofedAtaRule } from "@txshield/core";

/** The rules currently wired into core's `analyze()` default set. */
export const activeRules = defaultRules;
