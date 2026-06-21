// The built-in danger-pattern rule pack. These are the canonical implementations;
// @txshield/rules re-exports them and is the home for community / extended rules.

import type { Rule } from "../types.js";
import { durableNonceRule } from "./durableNonce.js";
import { systemAssignRule } from "./systemAssign.js";
import { setAuthorityRule } from "./setAuthority.js";
import { approveDelegateRule } from "./approveDelegate.js";
import { undecodedSensitiveRule } from "./undecodedSensitive.js";
import { unknownProgramWritableRule } from "./unknownProgramWritable.js";
import { partialSignRule } from "./partialSign.js";
import { closeAccountRule } from "./closeAccount.js";
import { nonceAuthorityRule } from "./nonceAuthority.js";
import { solDrainRule } from "./solDrain.js";
import { stakeAuthorizeRule } from "./stakeAuthorize.js";
import { voteAuthorizeRule } from "./voteAuthorize.js";
import { programUpgradeRule } from "./programUpgrade.js";
import { sensitiveViaAltRule } from "./sensitiveViaAlt.js";
import { token2022GuardRule } from "./token2022Guard.js";
import { decoyBundleRule } from "./decoyBundle.js";
import { spoofedAtaRule } from "./spoofedAta.js";

export const defaultRules: Rule[] = [
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
  spoofedAtaRule,
  undecodedSensitiveRule,
  unknownProgramWritableRule,
  partialSignRule,
];

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
  spoofedAtaRule,
  undecodedSensitiveRule,
  unknownProgramWritableRule,
  partialSignRule,
};
