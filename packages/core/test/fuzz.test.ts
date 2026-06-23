import { describe, it } from "vitest";
import { analyze } from "../src/index.js";
import { SYSTEM_ID, buildLegacyTx, pk, sysTransfer } from "./helpers.js";

const SIGNATURE_LEN = 64;
const HEADER_OFFSET = 1 + SIGNATURE_LEN;
const STATIC_ACCOUNT_COUNT_OFFSET = HEADER_OFFSET + 3;

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

function zeroes(n: number): number[] {
  return Array.from({ length: n }, () => 0);
}

function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length);
  out.set(a);
  out.set(b, a.length);
  return out;
}

function withByte(input: Uint8Array, index: number, value: number): Uint8Array {
  const out = new Uint8Array(input);
  out[index] = value & 0xff;
  return out;
}

class Lcg {
  constructor(private state: number) {}

  nextU32(): number {
    this.state = (Math.imul(this.state, 1664525) + 1013904223) >>> 0;
    return this.state;
  }

  nextInt(max: number): number {
    return this.nextU32() % max;
  }

  bytes(length: number): Uint8Array {
    const out = new Uint8Array(length);
    for (let i = 0; i < length; i++) out[i] = this.nextU32() & 0xff;
    return out;
  }
}

function fuzzIterations(): number {
  const raw = process.env.TXSHIELD_FUZZ_ITERATIONS;
  const parsed = raw === undefined ? 1000 : Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1000;
}

function validTransferTx(): Uint8Array {
  const feePayer = pk(1);
  return buildLegacyTx(feePayer, [
    {
      programId: SYSTEM_ID,
      accounts: [
        { pubkey: feePayer, signer: true, writable: true },
        { pubkey: pk(50), signer: false, writable: true },
      ],
      data: sysTransfer(5000n),
    },
  ]);
}

function zeroSignatureNoopTx(): Uint8Array {
  return new Uint8Array([
    0, // signature vector length
    0, // legacy header: required signatures
    0, // readonly signed
    0, // readonly unsigned
    0, // static account count
    ...Array.from({ length: 32 }, () => 7), // recent blockhash
    0, // instruction count
  ]);
}

function unsupportedVersionTx(version: number): Uint8Array {
  return new Uint8Array([1, ...zeroes(SIGNATURE_LEN), 0x80 | (version & 0x7f)]);
}

function oversizedStaticAccountCountTx(): Uint8Array {
  return new Uint8Array([1, ...zeroes(SIGNATURE_LEN), 1, 0, 0, ...shortVec(257)]);
}

function v0AltOverflowTx(): Uint8Array {
  return new Uint8Array([
    1,
    ...zeroes(SIGNATURE_LEN),
    0x80,
    1,
    0,
    0,
    ...shortVec(1),
    ...pk(1),
    ...Array.from({ length: 32 }, () => 7),
    ...shortVec(0),
    ...shortVec(1),
    ...pk(2),
    ...shortVec(256),
    ...Array.from({ length: 256 }, (_, i) => i),
    ...shortVec(0),
  ]);
}

function assertFailClosed(input: Uint8Array, label: string): void {
  const report = analyze(input);
  if (
    report.resultType === "Benign" ||
    report.action === "NONE" ||
    report.meta.failClosed !== true
  ) {
    throw new Error(
      `${label} produced ${report.action}/${report.resultType} failClosed=${report.meta.failClosed}`,
    );
  }
}

function malformedMutation(base: Uint8Array, rng: Lcg, iteration: number): Uint8Array {
  switch (iteration % 9) {
    case 0:
      return base.subarray(0, rng.nextInt(base.length));
    case 1:
      return concat(base, rng.bytes(1 + rng.nextInt(32)));
    case 2:
      return withByte(base, 0, rng.nextInt(2) === 0 ? 0 : 2);
    case 3:
      return withByte(base, HEADER_OFFSET, 2);
    case 4:
      return withByte(base, HEADER_OFFSET + 1, 2);
    case 5:
      return withByte(base, STATIC_ACCOUNT_COUNT_OFFSET, 0);
    case 6:
      return oversizedStaticAccountCountTx();
    case 7:
      return unsupportedVersionTx(1 + rng.nextInt(127));
    default:
      return v0AltOverflowTx();
  }
}

describe("parser fuzz fail-closed behavior", () => {
  it("rejects malformed envelopes that previously could appear benign", () => {
    const valid = validTransferTx();
    const zeroSignatureNoop = zeroSignatureNoopTx();

    assertFailClosed(zeroSignatureNoop, "zero-signature no-op transaction");
    assertFailClosed(
      concat(zeroSignatureNoop, new Uint8Array([1])),
      "zero-signature no-op with trailing byte",
    );
    assertFailClosed(concat(valid, new Uint8Array([1])), "valid transaction with trailing byte");
    assertFailClosed(withByte(valid, 0, 2), "signature vector/header mismatch");
    assertFailClosed(unsupportedVersionTx(1), "unsupported v1 transaction");
    assertFailClosed(v0AltOverflowTx(), "v0 transaction with too many resolved accounts");
  });

  it("fuzzes malformed parser inputs without producing benign verdicts", () => {
    const iterations = fuzzIterations();
    const rng = new Lcg(0x74787368);
    const base = validTransferTx();

    for (let i = 0; i < iterations; i++) {
      assertFailClosed(malformedMutation(base, rng, i), `malformed fuzz case ${i}`);
    }
  });
});
