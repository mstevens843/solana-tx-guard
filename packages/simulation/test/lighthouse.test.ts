import { address } from "@solana/kit";
import {
  IntegerOperator,
  getAssertTokenAccountInstruction,
  tokenAccountAssertion,
} from "lighthouse-sdk";
import { describe, expect, it } from "vitest";
import {
  LIGHTHOUSE_PROGRAM_ADDRESS,
  buildAtomicGuard,
  buildGuardInstructions,
  deriveAssertions,
  guardFeasibility,
} from "../src/lighthouse.js";
import type { AccountDiff } from "../src/types.js";

const USER = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"; // any valid base58 pubkey
const ATA = "So11111111111111111111111111111111111111112";
const MINT = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";
const SYSTEM = "11111111111111111111111111111111";

const diff: AccountDiff[] = [
  {
    address: USER,
    isTokenAccount: false,
    preLamports: 1_000_000_000,
    postLamports: 990_000_000,
    preOwner: SYSTEM,
    postOwner: SYSTEM,
  },
  {
    address: ATA,
    isTokenAccount: true,
    preToken: { mint: MINT, owner: USER, amount: 1000n, delegate: null, state: 1, closeAuthority: null },
    postToken: { mint: MINT, owner: USER, amount: 900n, delegate: null, state: 1, closeAuthority: null },
  },
];

describe("deriveAssertions", () => {
  it("pins lamports + owner for the wallet and amount/owner/delegate/close for the token account", () => {
    const a = deriveAssertions(diff, USER);
    const kinds = a.map((x) => x.type).sort();
    expect(kinds).toEqual(
      [
        "account-lamports-gte",
        "account-owner-eq",
        "token-amount-gte",
        "token-close-authority-eq",
        "token-delegate-eq",
        "token-owner-eq",
      ].sort(),
    );
    expect(a.find((x) => x.type === "account-lamports-gte")?.value).toBe(990_000_000n);
    expect(a.find((x) => x.type === "token-amount-gte")?.value).toBe(900n);
  });
});

describe("buildGuardInstructions", () => {
  it("emits Lighthouse instructions with non-empty data", () => {
    const { instructions, descriptors } = buildGuardInstructions(deriveAssertions(diff, USER));
    expect(instructions).toHaveLength(6);
    for (const ix of instructions) {
      expect(ix.programAddress).toBe(LIGHTHOUSE_PROGRAM_ADDRESS);
      expect((ix.data as Uint8Array).length).toBeGreaterThan(0);
    }
    expect(descriptors[0]?.programAddress).toBe(LIGHTHOUSE_PROGRAM_ADDRESS);
  });

  it("encodes byte-identically to calling lighthouse-sdk directly (no drift)", () => {
    const ours = buildGuardInstructions([{ account: ATA, type: "token-amount-gte", value: 900n }])
      .instructions[0];
    const sdk = getAssertTokenAccountInstruction({
      targetAccount: address(ATA),
      assertion: tokenAccountAssertion("Amount", {
        value: 900n,
        operator: IntegerOperator.GreaterThanOrEqual,
      }),
    });
    expect([...(ours?.data as Uint8Array)]).toEqual([...(sdk.data as Uint8Array)]);
    expect(ours?.programAddress).toBe(sdk.programAddress);
  });
});

describe("guardFeasibility", () => {
  it("fits on a small tx and refuses (hard-block signal) when it would overflow the packet", () => {
    const { descriptors } = buildGuardInstructions(deriveAssertions(diff, USER));
    expect(guardFeasibility(100, descriptors).fits).toBe(true);
    expect(guardFeasibility(1220, descriptors).fits).toBe(false);
  });
});

describe("buildAtomicGuard", () => {
  it("returns assertions + instructions + feasibility together", () => {
    const guard = buildAtomicGuard(diff, { user: USER, originalTxLen: 200 });
    expect(guard.assertions).toHaveLength(6);
    expect(guard.instructions).toHaveLength(6);
    expect(guard.fits).toBe(true);
  });
});
