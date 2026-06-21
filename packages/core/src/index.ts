// @txshield/core — public API. Hand it raw transaction bytes (Uint8Array or base64) and get a
// RiskReport. No network is required for the static verdict; simulation is additive enrichment.

import type { AnalyzeOptions, RiskReport } from "./types.js";
import { decodeTransaction } from "./decode/normalize.js";
import { buildContext } from "./engine/context.js";
import { evaluateRules } from "./engine/evaluate.js";
import { buildReport } from "./report/riskReport.js";
import { defaultRules } from "./rules/index.js";
import { exposesUserWritableToOpaqueProgram } from "./rules/shared.js";

export function analyze(input: Uint8Array | string, options: AnalyzeOptions = {}): RiskReport {
  let tx: ReturnType<typeof decodeTransaction>;
  try {
    tx = decodeTransaction(input);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return buildReport(
      null,
      [
        {
          id: "R15_PARSE_ERROR",
          severity: "WARNING",
          kind: "parse-error",
          message:
            "TxShield could not decode this transaction. Do not sign unless you fully trust the source.",
        },
      ],
      {
        failClosed: true,
        fullySigned: false,
        hasAddressLookups: false,
        atomicGuardRecommended: false,
        error: message,
      },
    );
  }

  const ctx = buildContext(tx, options);
  const findings = evaluateRules(ctx, defaultRules);
  if (options.simulation?.findings) findings.push(...options.simulation.findings);

  const atomicGuardRecommended =
    exposesUserWritableToOpaqueProgram(ctx) ||
    findings.some(
      (f) => f.kind === "opaque-cpi-surface" || f.kind === "unknown-program-writable",
    );

  return buildReport(tx.version, findings, {
    failClosed: false,
    fullySigned: tx.isFullySigned,
    hasAddressLookups: tx.hasAddressLookups,
    atomicGuardRecommended,
  });
}

export { decodeTransaction } from "./decode/normalize.js";
export { decodeInstruction } from "./decode/instructions.js";
export { createRuleSet } from "./engine/registry.js";
export { evaluateRules } from "./engine/evaluate.js";
export { buildContext } from "./engine/context.js";
export { buildReport } from "./report/riskReport.js";
export {
  defaultRules,
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
} from "./rules/index.js";
export * as rules from "./rules/index.js";
export { transactionMessageBytes, sameMessage } from "./digest.js";
export * as programIds from "./constants/programIds.js";
export * as bytes from "./util/bytes.js";
export { toBase58 } from "./util/base58.js";
export type * from "./types.js";
