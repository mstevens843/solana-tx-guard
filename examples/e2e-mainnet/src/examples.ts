// A compact transaction builder + a handful of known drains, used by the diagnose harness's
// static-analyzer self-test (offline). Mirrors examples/playground/src/buildExamples.ts.

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
  while (bytes.length < 32) bytes.unshift(0);
  return new Uint8Array(bytes.slice(-32));
}

function pk(seed: number): Uint8Array {
  const b = new Uint8Array(32);
  b.fill(seed & 0xff);
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
    } else meta.set(k, { pubkey, signer, writable });
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

const b64 = (bytes: Uint8Array) => Buffer.from(bytes).toString("base64");
const fp = pk(1);
const FAKE_USDC = "EPjFWdd5AufqSSqeM3qN1xzybapC8G4wEGGkZwyTDt1v"; // looks like USDC
const U64_MAX = 18446744073709551615n;

export interface DiagExample {
  label: string;
  base64: string;
  expectAction: "NONE" | "WARN" | "BLOCK";
}

export const EXAMPLES: DiagExample[] = [
  {
    label: "Benign transfer",
    expectAction: "NONE",
    base64: b64(
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
    ),
  },
  {
    label: "Durable nonce (never expires)",
    expectAction: "BLOCK",
    base64: b64(
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
    ),
  },
  {
    label: "Token account takeover",
    expectAction: "BLOCK",
    base64: b64(
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
    ),
  },
  {
    label: "Unlimited token approval",
    expectAction: "BLOCK",
    base64: b64(
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
    ),
  },
  {
    label: "Lookalike mint",
    expectAction: "WARN",
    base64: b64(
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
    ),
  },
];
