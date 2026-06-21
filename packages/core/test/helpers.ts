// Test helpers: a minimal Solana transaction *compiler* (the inverse of parseMessage) so we
// can build real legacy transactions byte-for-byte and round-trip them through analyze().

import { TOKEN_PROGRAM } from "../src/constants/programIds.js";

const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const B58_MAP: Record<string, number> = {};
for (let i = 0; i < B58.length; i++) B58_MAP[B58.charAt(i)] = i;

/** Decode a base58 string into a left-zero-padded 32-byte pubkey. */
export function fromBase58(s: string): Uint8Array {
  let num = 0n;
  for (const ch of s) num = num * 58n + BigInt(B58_MAP[ch] ?? 0);
  const bytes: number[] = [];
  while (num > 0n) {
    bytes.unshift(Number(num % 256n));
    num /= 256n;
  }
  let zeros = 0;
  for (const ch of s) {
    if (ch === "1") zeros++;
    else break;
  }
  const full = [...new Array(zeros).fill(0), ...bytes];
  while (full.length < 32) full.unshift(0);
  return new Uint8Array(full.slice(-32));
}

/** Deterministic 32-byte pubkey from a seed. */
export function pk(seed: number): Uint8Array {
  const b = new Uint8Array(32);
  b.fill(seed & 0xff);
  b[31] = seed & 0xff;
  b[0] = (seed >> 8) & 0xff;
  return b;
}

export const SYSTEM_ID = new Uint8Array(32); // 32 zero bytes === "11111111111111111111111111111111"
export const TOKEN_ID = fromBase58(TOKEN_PROGRAM);
export const TOKEN2022_ID = fromBase58("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");
export const STAKE_ID = fromBase58("Stake11111111111111111111111111111111111111");
export const VOTE_ID = fromBase58("Vote111111111111111111111111111111111111111");
export const LOADER_ID = fromBase58("BPFLoaderUpgradeab1e11111111111111111111111");
export const COMPUTE_BUDGET_ID = fromBase58("ComputeBudget111111111111111111111111111111");

function u64le(v: bigint): number[] {
  const out: number[] = [];
  let x = v;
  for (let i = 0; i < 8; i++) {
    out.push(Number(x & 0xffn));
    x >>= 8n;
  }
  return out;
}

export function sysAdvanceNonce(): Uint8Array {
  return new Uint8Array([4, 0, 0, 0]); // System discriminator 4 (LE u32)
}
export function sysTransfer(lamports: bigint): Uint8Array {
  return new Uint8Array([2, 0, 0, 0, ...u64le(lamports)]);
}
export function sysAssign(newOwner: Uint8Array): Uint8Array {
  return new Uint8Array([1, 0, 0, 0, ...newOwner]); // discriminator 1 (Assign) + 32-byte owner
}
export function tokenApprove(amount: bigint): Uint8Array {
  return new Uint8Array([4, ...u64le(amount)]); // Token discriminator 4 (Approve)
}
export function tokenSetAuthorityOwner(): Uint8Array {
  // SetAuthority(6) + authorityType AccountOwner(2) + COption(none) for brevity
  return new Uint8Array([6, 2, 0]);
}
export function tokenCloseAccount(): Uint8Array {
  return new Uint8Array([9]); // CloseAccount
}
export function tokenTransfer(amount: bigint): Uint8Array {
  return new Uint8Array([3, ...u64le(amount)]); // Transfer
}
export function sysAuthorizeNonce(newAuthority: Uint8Array): Uint8Array {
  return new Uint8Array([7, 0, 0, 0, ...newAuthority]); // AuthorizeNonceAccount + pubkey
}
export function stakeAuthorizeData(stakeAuthorize: number): Uint8Array {
  // Authorize(1): disc(4) + newAuthorized(32) + StakeAuthorize u32 → sa at offset 36
  const d = new Uint8Array(40);
  d[0] = 1;
  for (let i = 4; i < 36; i++) d[i] = 3;
  d[36] = stakeAuthorize & 0xff;
  return d;
}
export function stakeWithdraw(lamports: bigint): Uint8Array {
  return new Uint8Array([4, 0, 0, 0, ...u64le(lamports)]);
}
export function loaderSetAuthority(): Uint8Array {
  return new Uint8Array([4, 0, 0, 0]); // SetAuthority
}
export function loaderUpgrade(): Uint8Array {
  return new Uint8Array([3, 0, 0, 0]); // Upgrade
}
export function computeBudgetNoop(): Uint8Array {
  return new Uint8Array([2, 64, 66, 15, 0]); // SetComputeUnitLimit(2) + value (inert padding)
}
export function sysUnknown(): Uint8Array {
  return new Uint8Array([99, 0, 0, 0]); // unrecognized System discriminator → fail-closed (R23)
}

export interface IxAccount {
  pubkey: Uint8Array;
  signer: boolean;
  writable: boolean;
}
export interface BuildIx {
  programId: Uint8Array;
  accounts: IxAccount[];
  data: Uint8Array;
}

function shortVec(n: number): number[] {
  const out: number[] = [];
  let v = n;
  for (;;) {
    const b = v & 0x7f;
    v >>= 7;
    if (v) out.push(b | 0x80);
    else {
      out.push(b);
      break;
    }
  }
  return out;
}

const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");

/** Compile a legacy (unsigned, zero-filled signatures) transaction to wire bytes. */
export function buildLegacyTx(feePayer: Uint8Array, instructions: BuildIx[]): Uint8Array {
  const meta = new Map<string, IxAccount>();
  const add = (pubkey: Uint8Array, signer: boolean, writable: boolean) => {
    const k = hex(pubkey);
    const e = meta.get(k);
    if (e) {
      e.signer = e.signer || signer;
      e.writable = e.writable || writable;
    } else {
      meta.set(k, { pubkey, signer, writable });
    }
  };
  add(feePayer, true, true);
  for (const ix of instructions) {
    for (const a of ix.accounts) add(a.pubkey, a.signer, a.writable);
    add(ix.programId, false, false);
  }

  const fpKey = hex(feePayer);
  const all = [...meta.values()];
  const ws = all
    .filter((a) => a.signer && a.writable)
    .sort((a, b) => (hex(a.pubkey) === fpKey ? -1 : hex(b.pubkey) === fpKey ? 1 : 0));
  const rs = all.filter((a) => a.signer && !a.writable);
  const wn = all.filter((a) => !a.signer && a.writable);
  const rn = all.filter((a) => !a.signer && !a.writable);
  const ordered = [...ws, ...rs, ...wn, ...rn];
  const indexOf = (pubkey: Uint8Array) => ordered.findIndex((a) => hex(a.pubkey) === hex(pubkey));

  const numRequiredSignatures = ws.length + rs.length;
  const numReadonlySigned = rs.length;
  const numReadonlyUnsigned = rn.length;

  const out: number[] = [];
  out.push(...shortVec(numRequiredSignatures));
  for (let i = 0; i < numRequiredSignatures; i++) for (let j = 0; j < 64; j++) out.push(0);
  out.push(numRequiredSignatures, numReadonlySigned, numReadonlyUnsigned);
  out.push(...shortVec(ordered.length));
  for (const a of ordered) out.push(...a.pubkey);
  for (let j = 0; j < 32; j++) out.push(7); // recent blockhash
  out.push(...shortVec(instructions.length));
  for (const ix of instructions) {
    out.push(indexOf(ix.programId));
    out.push(...shortVec(ix.accounts.length));
    for (const a of ix.accounts) out.push(indexOf(a.pubkey));
    out.push(...shortVec(ix.data.length));
    out.push(...ix.data);
  }
  return new Uint8Array(out);
}

/**
 * A v0 transaction whose System Transfer recipient is resolved from an address lookup table
 * (account index 2 = the first ALT-writable entry). Used to exercise R14b sensitive-via-ALT.
 */
export function buildV0TransferWithAltRecipient(feePayer: Uint8Array): Uint8Array {
  const out: number[] = [];
  out.push(...shortVec(1)); // 1 signature
  for (let j = 0; j < 64; j++) out.push(0);
  out.push(0x80); // version 0
  out.push(1, 0, 1); // header: numReqSig=1, numReadonlySigned=0, numReadonlyUnsigned=1
  out.push(...shortVec(2)); // static accounts: feePayer, System
  out.push(...feePayer);
  for (let j = 0; j < 32; j++) out.push(0); // System program
  for (let j = 0; j < 32; j++) out.push(7); // recent blockhash
  out.push(...shortVec(1)); // 1 instruction
  out.push(1); // programIdIndex = System (static index 1)
  out.push(...shortVec(2));
  out.push(0, 2); // from = feePayer(0), to = ALT-writable[0] at index 2
  const data = sysTransfer(1000n);
  out.push(...shortVec(data.length));
  out.push(...data);
  out.push(...shortVec(1)); // 1 address-table lookup
  for (let j = 0; j < 32; j++) out.push(8); // table key
  out.push(...shortVec(1)); // 1 writable index
  out.push(0);
  out.push(...shortVec(0)); // 0 readonly indexes
  return new Uint8Array(out);
}
