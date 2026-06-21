import type { Finding } from "@txshield/core";

/** A point-in-time account snapshot (pre = fetched current state, post = simulated state). */
export interface AccountSnapshot {
  lamports: number;
  /** owning program id (base58). */
  owner: string;
  /** base64-encoded account data. */
  dataBase64?: string;
  executable?: boolean;
}

/**
 * An inner (CPI) instruction, already resolved by the host adapter: programIdIndex + account
 * indexes (into the full account list, including ALT-loaded addresses) mapped to concrete
 * addresses, and the instruction data as base64.
 */
export interface NormalizedInnerIx {
  programId: string;
  accounts: string[];
  dataBase64: string;
  /** the TOP-LEVEL program that emitted this CPI (from the RPC's innerInstructions[i].index). */
  invokingProgram?: string;
}

export interface RawSimulation {
  ok: boolean;
  logs: string[];
  unitsConsumed?: number;
  error?: string;
  accounts: { address: string; pre?: AccountSnapshot; post?: AccountSnapshot }[];
  /** flattened, resolved inner instructions from `innerInstructions:true`. */
  innerInstructions?: NormalizedInnerIx[];
}

/** Decoded SPL Token / Token-2022 account state (the fields a drain would change). */
export interface TokenState {
  mint: string;
  owner: string;
  amount: bigint;
  delegate: string | null;
  state: number;
  closeAuthority: string | null;
}

export interface AccountDiff {
  address: string;
  isTokenAccount: boolean;
  preLamports?: number;
  postLamports?: number;
  preOwner?: string;
  postOwner?: string;
  preToken?: TokenState;
  postToken?: TokenState;
}

export interface EnrichedSimulation {
  ok: boolean;
  /** advisory findings — additive only; never clears a static finding. */
  findings: Finding[];
  diff: AccountDiff[];
  user: string;
}

/** Host-provided: fetch pre + post snapshots for `trackedAddresses` and run the simulation. */
export type SimulateFn = (base64Tx: string, trackedAddresses: string[]) => Promise<RawSimulation>;

/**
 * Minimal RPC surface the built-in `createSimulateFn` needs. Adapt your client to it.
 * web3.js v1 example: `getAccounts` → `connection.getMultipleAccountsInfo(pubkeys)`;
 * `simulateTransaction` → `connection.simulateTransaction(tx, { accounts: { addresses },
 * sigVerify: false, replaceRecentBlockhash: true, innerInstructions: true })`.
 */
export interface SimRpc {
  getAccounts(addresses: string[]): Promise<(AccountSnapshot | null)[]>;
  simulateTransaction(
    base64Tx: string,
    addresses: string[],
  ): Promise<{
    ok: boolean;
    logs: string[];
    unitsConsumed?: number;
    err?: string;
    accounts: (AccountSnapshot | null)[];
    /**
     * Resolved inner instructions (from `innerInstructions:true`). The adapter maps each
     * inner instruction's programIdIndex + account indexes against the message's full account
     * list (static keys + the simulation's loaded ALT addresses) into concrete addresses.
     */
    innerInstructions?: NormalizedInnerIx[];
  }>;
}
