// Self-contained transaction builder (ported from packages/core/test/helpers.ts, which isn't
// exported) so the demo can construct example transactions in the browser and feed them to
// analyze(). Each example carries the base64 a user can copy/paste.

import { programIds } from "@txshield/core";

const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const B58_MAP: Record<string, number> = {};
for (let i = 0; i < B58.length; i++) B58_MAP[B58.charAt(i)] = i;

function fromBase58(s: string): Uint8Array {
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

function pk(seed: number): Uint8Array {
  const b = new Uint8Array(32);
  b.fill(seed & 0xff);
  b[31] = seed & 0xff;
  b[0] = (seed >> 8) & 0xff;
  return b;
}

const SYSTEM_ID = new Uint8Array(32);
const TOKEN_ID = fromBase58(programIds.TOKEN_PROGRAM);

function u64le(v: bigint): number[] {
  const out: number[] = [];
  let x = v;
  for (let i = 0; i < 8; i++) {
    out.push(Number(x & 0xffn));
    x >>= 8n;
  }
  return out;
}

const sysTransfer = (l: bigint) => new Uint8Array([2, 0, 0, 0, ...u64le(l)]);
const sysAdvanceNonce = () => new Uint8Array([4, 0, 0, 0]);
const sysAssign = (owner: Uint8Array) => new Uint8Array([1, 0, 0, 0, ...owner]);
const tokenApprove = (a: bigint) => new Uint8Array([4, ...u64le(a)]);
const tokenSetAuthorityOwner = () => new Uint8Array([6, 2, 0]);

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

interface IxAccount {
  pubkey: Uint8Array;
  signer: boolean;
  writable: boolean;
}
interface BuildIx {
  programId: Uint8Array;
  accounts: IxAccount[];
  data: Uint8Array;
}

function buildLegacyTx(feePayer: Uint8Array, instructions: BuildIx[]): Uint8Array {
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

  const out: number[] = [];
  const numReqSig = ws.length + rs.length;
  out.push(...shortVec(numReqSig));
  for (let i = 0; i < numReqSig; i++) for (let j = 0; j < 64; j++) out.push(0);
  out.push(numReqSig, rs.length, rn.length);
  out.push(...shortVec(ordered.length));
  for (const a of ordered) out.push(...a.pubkey);
  for (let j = 0; j < 32; j++) out.push(7);
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

function buildV0TransferWithAltRecipient(feePayer: Uint8Array): Uint8Array {
  const out: number[] = [];
  out.push(...shortVec(1));
  for (let j = 0; j < 64; j++) out.push(0);
  out.push(0x80);
  out.push(1, 0, 1);
  out.push(...shortVec(2));
  out.push(...feePayer);
  for (let j = 0; j < 32; j++) out.push(0);
  for (let j = 0; j < 32; j++) out.push(7);
  out.push(...shortVec(1));
  out.push(1);
  out.push(...shortVec(2));
  out.push(0, 2);
  const data = sysTransfer(1000n);
  out.push(...shortVec(data.length));
  out.push(...data);
  out.push(...shortVec(1));
  for (let j = 0; j < 32; j++) out.push(8);
  out.push(...shortVec(1));
  out.push(0);
  out.push(...shortVec(0));
  return new Uint8Array(out);
}

function toBase64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

const fp = pk(1);
const FAKE_USDC = "EPjFWdd5AufqSSqeM3qN1xzybapC8G4wEGGkZwyTDt1v"; // looks like USDC (same first/last 6)
const U64_MAX = 18446744073709551615n;

export interface Example {
  label: string;
  description: string;
  base64: string;
  expectAction: "NONE" | "WARN" | "BLOCK";
  expectKind?: string;
}

function ex(
  label: string,
  description: string,
  bytes: Uint8Array,
  expectAction: Example["expectAction"],
  expectKind?: string,
): Example {
  return { label, description, base64: toBase64(bytes), expectAction, ...(expectKind ? { expectKind } : {}) };
}

export const EXAMPLES: Example[] = [
  ex(
    "Benign transfer",
    "A plain SOL transfer to a single address.",
    buildLegacyTx(fp, [
      {
        programId: SYSTEM_ID,
        accounts: [
          { pubkey: fp, signer: true, writable: true },
          { pubkey: pk(50), signer: false, writable: true },
        ],
        data: sysTransfer(5000n),
      },
    ]),
    "NONE",
  ),
  ex(
    "Durable nonce (never expires)",
    "Sign now, drain later — a transaction with no expiry.",
    buildLegacyTx(fp, [
      {
        programId: SYSTEM_ID,
        accounts: [
          { pubkey: pk(2), signer: false, writable: true },
          { pubkey: pk(3), signer: false, writable: false },
          { pubkey: fp, signer: true, writable: true },
        ],
        data: sysAdvanceNonce(),
      },
      {
        programId: SYSTEM_ID,
        accounts: [
          { pubkey: fp, signer: true, writable: true },
          { pubkey: pk(4), signer: false, writable: true },
        ],
        data: sysTransfer(1_000_000n),
      },
    ]),
    "BLOCK",
    "durable-nonce",
  ),
  ex(
    "Token account takeover",
    "SetAuthority hands ownership of your token account to someone else.",
    buildLegacyTx(fp, [
      {
        programId: TOKEN_ID,
        accounts: [
          { pubkey: pk(20), signer: false, writable: true },
          { pubkey: fp, signer: true, writable: false },
        ],
        data: tokenSetAuthorityOwner(),
      },
    ]),
    "BLOCK",
    "token-account-takeover",
  ),
  ex(
    "Ownership reassignment",
    "System Assign hands ownership of your account to another program.",
    buildLegacyTx(fp, [
      {
        programId: SYSTEM_ID,
        accounts: [{ pubkey: fp, signer: true, writable: true }],
        data: sysAssign(pk(99)),
      },
    ]),
    "BLOCK",
    "owner-reassignment",
  ),
  ex(
    "Unlimited token approval",
    "Grants a third party unlimited permission to move your tokens.",
    buildLegacyTx(fp, [
      {
        programId: TOKEN_ID,
        accounts: [
          { pubkey: pk(20), signer: false, writable: true },
          { pubkey: pk(21), signer: false, writable: false },
          { pubkey: fp, signer: true, writable: false },
        ],
        data: tokenApprove(U64_MAX),
      },
    ]),
    "BLOCK",
    "delegate-approval",
  ),
  ex(
    "Lookalike mint",
    "An address that looks like USDC in a wallet UI but isn't.",
    buildLegacyTx(fp, [
      {
        programId: SYSTEM_ID,
        accounts: [
          { pubkey: fp, signer: true, writable: true },
          { pubkey: fromBase58(FAKE_USDC), signer: false, writable: true },
        ],
        data: sysTransfer(1n),
      },
    ]),
    "WARN",
    "lookalike-mint",
  ),
  ex(
    "ALT-hidden recipient",
    "The transfer recipient is hidden behind a mutable lookup table.",
    buildV0TransferWithAltRecipient(fp),
    "WARN",
    "sensitive-account-via-alt",
  ),
];
