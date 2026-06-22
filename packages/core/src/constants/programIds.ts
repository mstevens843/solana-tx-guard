// Canonical Solana program ids. Match by full 32-byte (base58) equality only — never by
// name/symbol/metadata. A drainer can deploy a vanity-similar id or an IDL claiming a
// trusted name; only the exact id is trustworthy.

export const SYSTEM_PROGRAM = "11111111111111111111111111111111";
export const SYSVAR_RECENT_BLOCKHASHES = "SysvarRecentB1ockHashes11111111111111111111";
export const TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
export const TOKEN_2022_PROGRAM = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
export const ASSOCIATED_TOKEN_PROGRAM = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";
export const STAKE_PROGRAM = "Stake11111111111111111111111111111111111111";
export const VOTE_PROGRAM = "Vote111111111111111111111111111111111111111";
export const BPF_LOADER_UPGRADEABLE = "BPFLoaderUpgradeab1e11111111111111111111111";
export const ADDRESS_LOOKUP_TABLE_PROGRAM = "AddressLookupTab1e1111111111111111111111111";
export const COMPUTE_BUDGET_PROGRAM = "ComputeBudget111111111111111111111111111111";
export const MEMO_PROGRAM = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";

// Lighthouse — the open on-chain assertion protocol used by the atomic-guard.
export const LIGHTHOUSE_PROGRAM = "L2TExMFKdjpN9kozasaurPirfHy9P8sbXoAN1qA3S95";

// Commonly-spoofed mints (exact base58, verified against real mainnet swaps) — the anchor for
// lookalike-mint detection. A drainer mints a fake token whose address shares the first-6 + last-6
// chars of one of these (what a truncated wallet UI shows); R13 flags the mismatch.
export const WSOL_MINT = "So11111111111111111111111111111111111111112";
export const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
export const USDT_MINT = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";
export const JUP_MINT = "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN";
export const BONK_MINT = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263";
export const WIF_MINT = "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm";
export const JTO_MINT = "jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL";
export const PYTH_MINT = "HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3";
export const RAY_MINT = "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R";
export const JITOSOL_MINT = "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn";
export const MSOL_MINT = "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So";

/** Canonical mints, matched by full 32-byte equality — the anchor for lookalike-mint detection. */
export const CANONICAL_MINTS: ReadonlySet<string> = new Set([
  WSOL_MINT,
  USDC_MINT,
  USDT_MINT,
  JUP_MINT,
  BONK_MINT,
  WIF_MINT,
  JTO_MINT,
  PYTH_MINT,
  RAY_MINT,
  JITOSOL_MINT,
  MSOL_MINT,
]);

/** SPL Token + Token-2022. */
export const TOKEN_PROGRAMS: ReadonlySet<string> = new Set([TOKEN_PROGRAM, TOKEN_2022_PROGRAM]);

/**
 * Programs capable of moving value or changing authority. An *unrecognized* instruction to
 * one of these that touches a user-writable account must fail closed (rule R23), because a
 * decoder miss on these programs is a silent drain.
 */
export const CORE_VALUE_CAPABLE_PROGRAMS: ReadonlySet<string> = new Set([
  SYSTEM_PROGRAM,
  TOKEN_PROGRAM,
  TOKEN_2022_PROGRAM,
  STAKE_PROGRAM,
  VOTE_PROGRAM,
  BPF_LOADER_UPGRADEABLE,
]);

/** Inert programs that never move user value — safe to ignore for exfil-surface rules. */
export const INERT_PROGRAMS: ReadonlySet<string> = new Set([COMPUTE_BUDGET_PROGRAM, MEMO_PROGRAM]);
