// @txshield/simulation — optional RPC enrichment + the open Lighthouse atomic-guard. ADVISORY:
// findings here may only ADD to the static verdict, never clear it. The atomic-guard is the
// non-spoofable enforcement layer (assertions revert a divergent execution on-chain).

import { decodeTransaction, type Finding, type ProgramCapability } from "@txshield/core";
import { analyzeCpi } from "./cpi.js";
import { diffSimulation } from "./diff.js";
import { elevate } from "./elevate.js";
import type { EnrichedSimulation, SimulateFn } from "./types.js";

export type {
  AccountDiff,
  AccountSnapshot,
  EnrichedSimulation,
  NormalizedInnerIx,
  RawSimulation,
  SimRpc,
  SimulateFn,
  TokenState,
} from "./types.js";
export { createSimulateFn } from "./simulate.js";
export { analyzeCpi } from "./cpi.js";
export { verifyTokenAccounts, type TokenAccountRef } from "./spoofed.js";
export { decodeTokenState, diffSimulation } from "./diff.js";
export { elevate } from "./elevate.js";
export {
  MAX_TX_SIZE,
  LIGHTHOUSE_PROGRAM_ADDRESS,
  deriveAssertions,
  buildGuardInstructions,
  guardFeasibility,
  buildAtomicGuard,
  toLegacyDescriptors,
  type AtomicGuard,
  type GuardAssertion,
  type GuardInstruction,
  type LegacyInstructionDescriptor,
} from "./lighthouse.js";
export { inspectToken2022Mints } from "./mints.js";
export {
  decodeAddressLookupTable,
  resolveLookups,
  verifyAltUnchanged,
  type AltLookup,
  type ResolvedAlt,
} from "./alt.js";

export interface SimulateAndDiffOptions {
  /** protected user; defaults to the transaction fee payer. */
  user?: string;
  /** per-program capabilities for the inner-CPI capability check (see @txshield/registry). */
  capabilities?: ReadonlyMap<string, ProgramCapability>;
}

/**
 * Simulate a transaction and produce an advisory enrichment: additive findings (R17) + the
 * structured diff (which feeds buildAtomicGuard). Never returns a verdict — feed
 * `result.findings` into core's `analyze(bytes, { simulation: result })` and `result.diff`
 * into `buildAtomicGuard`.
 */
export async function simulateAndDiff(
  base64Tx: string,
  simulate: SimulateFn,
  options: SimulateAndDiffOptions = {},
): Promise<EnrichedSimulation> {
  const tx = decodeTransaction(base64Tx);
  const user = options.user ?? tx.feePayer;
  const tracked = [...new Set(tx.accounts.filter((a) => a.writable).map((a) => a.address))];

  const raw = await simulate(base64Tx, tracked);
  const findings: Finding[] = [];
  if (!raw.ok) {
    findings.push({
      id: "SIM_FAILED",
      severity: "WARNING",
      kind: "simulation-failed",
      message: "This transaction failed to simulate; treat with caution.",
    });
  }
  const diff = diffSimulation(raw);
  findings.push(...elevate(diff, user));
  findings.push(...analyzeCpi(raw.innerInstructions ?? [], user, options.capabilities));
  return { ok: raw.ok, findings, diff, user };
}
