import { describe, expect, it } from "vitest";
import { elevate } from "../src/elevate.js";
import type { AccountDiff } from "../src/types.js";

const USER = "USER";

describe("elevate (R17, additive only)", () => {
  it("flags an account-owner change as CRITICAL", () => {
    const diff: AccountDiff[] = [
      { address: USER, isTokenAccount: false, preLamports: 100, postLamports: 100, preOwner: "SYS", postOwner: "EVIL" },
    ];
    const f = elevate(diff, USER);
    expect(f.some((x) => x.kind === "sim-owner-reassignment" && x.severity === "CRITICAL")).toBe(true);
  });

  it("flags a token outflow as WARNING", () => {
    const diff: AccountDiff[] = [
      {
        address: "ATA",
        isTokenAccount: true,
        preToken: { mint: "M", owner: USER, amount: 1000n, delegate: null, state: 1, closeAuthority: null },
        postToken: { mint: "M", owner: USER, amount: 900n, delegate: null, state: 1, closeAuthority: null },
      },
    ];
    const f = elevate(diff, USER);
    expect(f.some((x) => x.kind === "sim-token-outflow")).toBe(true);
  });

  it("adds nothing for a benign, unchanged diff (never invents safety either way)", () => {
    const diff: AccountDiff[] = [
      { address: USER, isTokenAccount: false, preLamports: 100, postLamports: 100, preOwner: "SYS", postOwner: "SYS" },
    ];
    expect(elevate(diff, USER)).toEqual([]);
  });
});
