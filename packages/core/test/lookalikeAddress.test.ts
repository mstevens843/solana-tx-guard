import { describe, expect, it } from "vitest";
import { analyze } from "../src/index.js";
import { isLookalike } from "../src/util/lookalike.js";
import { SYSTEM_ID, buildLegacyTx, fromBase58, pk, sysTransfer } from "./helpers.js";

// A saved exchange-deposit address the user has sent to before, and an attacker's poisoned lookalike
// (same first-6 + last-6 chars, one middle char off) injected into the user's history.
const CONTACT = "74Xkp2iLXm315h69sFRiCFjmKnaWkMV8W2LgJwPRSgN5";
const POISON = "74Xkp2iLXm315h69sFRiCFjmKnaWkMV9W2LgJwPRSgN5";

const fp = pk(1);
const txTo = (to: Uint8Array) =>
  buildLegacyTx(fp, [
    {
      programId: SYSTEM_ID,
      accounts: [
        { pubkey: fp, signer: true, writable: true },
        { pubkey: to, signer: false, writable: true },
      ],
      data: sysTransfer(1_000_000n),
    },
  ]);

const fired = (to: Uint8Array, known: Set<string>) =>
  analyze(txTo(to), { knownAddresses: known }).warnings.some((w) => w.kind === "lookalike-address");

describe("R25 lookalike-address (address poisoning)", () => {
  it("flags a recipient that is a lookalike of a known contact", () => {
    expect(fired(fromBase58(POISON), new Set([CONTACT]))).toBe(true);
  });

  it("does not flag the exact known contact", () => {
    expect(fired(fromBase58(CONTACT), new Set([CONTACT]))).toBe(false);
  });

  it("does not flag an unrelated recipient", () => {
    expect(fired(pk(150), new Set([CONTACT]))).toBe(false);
  });

  it("isLookalike: shared first-6 + last-6 but different middle → true; equal/different → false", () => {
    expect(isLookalike(POISON, CONTACT)).toBe(true);
    expect(isLookalike(CONTACT, CONTACT)).toBe(false);
    expect(isLookalike("abcdef000000000000000xyz12", "qrstuv000000000000000xyz12")).toBe(false);
  });
});
