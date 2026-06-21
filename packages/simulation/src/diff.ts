// Decode pre/post account snapshots into a structured diff. Handles SOL lamport deltas,
// account-owner changes, and SPL Token / Token-2022 account state (amount/owner/delegate/
// close-authority) — the fields a drain mutates.

import { bytes, programIds, toBase58 } from "@txshield/core";
import type { AccountDiff, AccountSnapshot, RawSimulation, TokenState } from "./types.js";

const TOKEN_ACCOUNT_LEN = 165;

function readU64LE(b: Uint8Array, off: number): bigint {
  let v = 0n;
  for (let i = 7; i >= 0; i--) v = (v << 8n) | BigInt(b[off + i] ?? 0);
  return v;
}

function isTokenProgram(owner?: string): boolean {
  return owner === programIds.TOKEN_PROGRAM || owner === programIds.TOKEN_2022_PROGRAM;
}

/** Decode a token account snapshot (SPL Token base layout; Token-2022 shares the first 165 bytes). */
export function decodeTokenState(snap?: AccountSnapshot): TokenState | undefined {
  if (!snap || !snap.dataBase64 || !isTokenProgram(snap.owner)) return undefined;
  const b = bytes.fromBase64(snap.dataBase64);
  if (b.length < TOKEN_ACCOUNT_LEN) return undefined;
  const delegateOpt = bytes.readU32LE(b, 72) ?? 0;
  const closeOpt = bytes.readU32LE(b, 129) ?? 0;
  return {
    mint: toBase58(b.subarray(0, 32)),
    owner: toBase58(b.subarray(32, 64)),
    amount: readU64LE(b, 64),
    delegate: delegateOpt === 1 ? toBase58(b.subarray(76, 108)) : null,
    state: b[108] ?? 0,
    closeAuthority: closeOpt === 1 ? toBase58(b.subarray(133, 165)) : null,
  };
}

export function diffSimulation(raw: RawSimulation): AccountDiff[] {
  return raw.accounts.map(({ address, pre, post }) => {
    const preToken = decodeTokenState(pre);
    const postToken = decodeTokenState(post);
    const diff: AccountDiff = { address, isTokenAccount: Boolean(preToken || postToken) };
    if (pre?.lamports != null) diff.preLamports = pre.lamports;
    if (post?.lamports != null) diff.postLamports = post.lamports;
    if (pre?.owner) diff.preOwner = pre.owner;
    if (post?.owner) diff.postOwner = post.owner;
    if (preToken) diff.preToken = preToken;
    if (postToken) diff.postToken = postToken;
    return diff;
  });
}
