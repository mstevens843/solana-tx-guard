// Curated set of well-known program ids. NOTE: allowlist membership is a HUMAN LABEL only — it
// is never a CPI-safety guarantee (an allowlisted program can still CPI arbitrarily). Pass this
// to analyze() via options.allowedPrograms to downgrade unknown-program noise on known apps.
//
// Upgradeable programs should additionally be pinned by ProgramData hash before being trusted;
// that pinning is tracked in a future release (see docs/threat-model.md).

export const DEFAULT_PROGRAM_ALLOWLIST: ReadonlySet<string> = new Set([
  "11111111111111111111111111111111", // System
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", // SPL Token
  "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb", // Token-2022
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL", // Associated Token
  "ComputeBudget111111111111111111111111111111", // Compute Budget
  "L2TExMFKdjpN9kozasaurPirfHy9P8sbXoAN1qA3S95", // Lighthouse
  "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4", // Jupiter Aggregator v6
  "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8", // Raydium AMM v4
  "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc", // Orca Whirlpool
]);
