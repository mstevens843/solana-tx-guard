import { describe, expect, it } from "vitest";
import { decodeAddressLookupTable, resolveLookups, verifyAltUnchanged } from "../src/alt.js";
import type { SimRpc } from "../src/types.js";

const b64 = (bytes: Uint8Array) => Buffer.from(bytes).toString("base64");

// 56-byte meta header (authority option tag at offset 21) + N 32-byte addresses.
function lutBytes(addressFills: number[], withAuthority: boolean): Uint8Array {
  const b = new Uint8Array(56 + addressFills.length * 32);
  if (withAuthority) {
    b[21] = 1;
    for (let i = 22; i < 54; i++) b[i] = 9;
  }
  addressFills.forEach((fill, i) => {
    for (let j = 0; j < 32; j++) b[56 + i * 32 + j] = fill;
  });
  return b;
}

function rpcWithTable(data: Uint8Array): SimRpc {
  return {
    getAccounts: async (addrs) =>
      addrs.map(() => ({ lamports: 0, owner: "x", dataBase64: b64(data) })),
    simulateTransaction: async () => ({ ok: true, logs: [], accounts: [] }),
  };
}

describe("decodeAddressLookupTable", () => {
  it("reads the authority and address list", () => {
    const { authority, addresses } = decodeAddressLookupTable(b64(lutBytes([1, 2], true)));
    expect(authority).not.toBeNull();
    expect(addresses).toHaveLength(2);
  });
});

describe("resolveLookups", () => {
  it("resolves writable/readonly indexes and flags a mutable table", async () => {
    const rpc = rpcWithTable(lutBytes([1, 2], true));
    const resolved = await resolveLookups(rpc, [
      { tableAddress: "T", writableIndexes: [0], readonlyIndexes: [1] },
    ]);
    expect(resolved.writable).toHaveLength(1);
    expect(resolved.readonly).toHaveLength(1);
    expect(resolved.mutable).toBe(true);
  });
});

describe("verifyAltUnchanged", () => {
  it("detects a changed resolved set", () => {
    const before = { writable: ["A"], readonly: [], mutable: false };
    expect(
      verifyAltUnchanged(before, { writable: ["A"], readonly: [], mutable: false }).changed,
    ).toBe(false);
    expect(
      verifyAltUnchanged(before, { writable: ["B"], readonly: [], mutable: false }).changed,
    ).toBe(true);
  });
});
