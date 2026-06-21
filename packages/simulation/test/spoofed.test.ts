import { address, getAddressEncoder } from "@solana/kit";
import { programIds } from "@txshield/core";
import { describe, expect, it } from "vitest";
import { verifyTokenAccounts } from "../src/spoofed.js";
import type { SimRpc } from "../src/types.js";

const enc = getAddressEncoder();
const b64 = (bytes: Uint8Array) => Buffer.from(bytes).toString("base64");

const USER = "So11111111111111111111111111111111111111112";
const ATTACKER = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const MINT = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";

function tokenAccountBytes(ownerB58: string, mintB58: string): Uint8Array {
  const b = new Uint8Array(165);
  b.set(enc.encode(address(mintB58)), 0); // mint @ 0
  b.set(enc.encode(address(ownerB58)), 32); // owner @ 32
  b[108] = 1; // initialized
  return b;
}

function rpcOwnedBy(ownerB58: string): SimRpc {
  return {
    getAccounts: async () => [
      { lamports: 2_039_280, owner: programIds.TOKEN_PROGRAM, dataBase64: b64(tokenAccountBytes(ownerB58, MINT)) },
    ],
    simulateTransaction: async () => ({ ok: true, logs: [], accounts: [] }),
  };
}

describe("verifyTokenAccounts", () => {
  it("flags a token account whose real owner is not the user as CRITICAL (spoofed)", async () => {
    const findings = await verifyTokenAccounts(rpcOwnedBy(ATTACKER), [{ account: "ACC", mint: MINT }], USER);
    expect(findings.some((f) => f.kind === "spoofed-token-account" && f.severity === "CRITICAL")).toBe(true);
  });

  it("warns when the user owns the account but it is not the canonical ATA", async () => {
    const findings = await verifyTokenAccounts(rpcOwnedBy(USER), [{ account: "ACC", mint: MINT }], USER);
    expect(findings.some((f) => f.kind === "non-canonical-token-account")).toBe(true);
  });
});
