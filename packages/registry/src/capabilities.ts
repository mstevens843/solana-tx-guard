// Per-program capability declarations. Each program declares ONLY the value-flows it legitimately
// performs. An allowlisted/compromised program that performs an INNER CPI op outside its declared
// capability (e.g. a swap router doing a SetAuthority) is flagged `cpi-capability-violation` by
// @txshield/simulation's analyzeCpi. An undeclared op is treated as "not allowed".

import type { ProgramCapability } from "@txshield/core";

export const DEFAULT_PROGRAM_CAPABILITIES: ReadonlyMap<string, ProgramCapability> = new Map<
  string,
  ProgramCapability
>([
  // Core programs (leaf programs; rarely the CPI invoker, declared for completeness).
  ["11111111111111111111111111111111", { transferSol: true, assign: true }], // System
  [
    "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    { transferToken: true, approve: true, setAuthority: true, closeToNonOwner: true },
  ], // SPL Token
  [
    "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
    { transferToken: true, approve: true, setAuthority: true, closeToNonOwner: true },
  ], // Token-2022
  ["ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL", { transferToken: true, transferSol: true }], // ATA
  // DEX routers: move tokens/SOL, never change authority/ownership.
  ["JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4", { transferToken: true, transferSol: true }], // Jupiter v6
  ["61DFfeTKM7trxYcPQCM78bJ794ddZprZpAwAnLiwTpYH", { transferToken: true, transferSol: true }], // Jupiter Ultra router
  ["675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8", { transferToken: true, transferSol: true }], // Raydium AMM v4
  ["whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc", { transferToken: true, transferSol: true }], // Orca Whirlpool
]);
