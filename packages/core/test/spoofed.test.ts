import { describe, expect, it } from "vitest";
import { analyze } from "../src/index.js";
import { SYSTEM_ID, buildLegacyTx, fromBase58, pk, sysTransfer } from "./helpers.js";

const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
// Same first-6 ("EPjFWd") + last-6 ("yTDt1v") as USDC, different middle.
const FAKE_USDC = "EPjFWdd5AufqSSqeM3qN1xzybapC8G4wEGGkZwyTDt1v";

const fp = pk(1);
const transferTo = (mintLike: Uint8Array) =>
  buildLegacyTx(fp, [
    {
      programId: SYSTEM_ID,
      accounts: [
        { pubkey: fp, signer: true, writable: true },
        { pubkey: mintLike, signer: false, writable: true },
      ],
      data: sysTransfer(1n),
    },
  ]);

describe("R13 lookalike-mint", () => {
  it("flags an address confusingly similar to USDC", () => {
    const r = analyze(transferTo(fromBase58(FAKE_USDC)));
    expect(r.warnings.some((w) => w.kind === "lookalike-mint")).toBe(true);
  });

  it("does not flag the real USDC mint", () => {
    const r = analyze(transferTo(fromBase58(USDC)));
    expect(r.warnings.some((w) => w.kind === "lookalike-mint")).toBe(false);
  });
});
